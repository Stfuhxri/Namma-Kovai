import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ref, push, set } from 'firebase/database';
import { rtdb, auth } from './firebase';

const REPORTING_TASK = 'namma-kovai-location-reporting';
const REPORT_INTERVAL_MS = 5000; // report every 5 seconds
const MAX_REPORT_DURATION_MS = 2 * 60 * 60 * 1000; // auto-stop after 2 hours

let reportingBusId: string | null = null;
let reportingStartTime: number | null = null;
let lastReportTime = 0;

// ─── Background Task Definition ──────────────────────────────────────────────
TaskManager.defineTask(REPORTING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations?.[0];
  if (!location || !reportingBusId) return;

  await sendReport(location);
});

// ─── Report Sending ───────────────────────────────────────────────────────────
async function sendReport(location: Location.LocationObject) {
  const now = Date.now();
  const user = auth.currentUser;

  if (!user || !reportingBusId) return;

  // Client-side rate limit: max 1 write per 5 seconds
  if (now - lastReportTime < REPORT_INTERVAL_MS) return;

  // Auto-stop after 2 hours
  if (reportingStartTime && now - reportingStartTime > MAX_REPORT_DURATION_MS) {
    await stopReporting();
    return;
  }

  lastReportTime = now;

  const reportRef = push(ref(rtdb, `liveLocationReports/${reportingBusId}`));
  await set(reportRef, {
    busId: reportingBusId,
    userId: user.uid,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    speed: location.coords.speed ?? 0,
    heading: location.coords.heading ?? 0,
    accuracy: location.coords.accuracy ?? 999,
    timestamp: now,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start reporting location for a specific bus.
 * User taps "I'm on this bus" → this is called.
 */
export async function startReporting(busId: string): Promise<boolean> {
  // Request permissions
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') return false;

  reportingBusId = busId;
  reportingStartTime = Date.now();
  lastReportTime = 0;

  try {
    await Location.startLocationUpdatesAsync(REPORTING_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: REPORT_INTERVAL_MS,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Sharing Location",
        notificationBody: "Sharing your ride location to help others.",
        notificationColor: "#3b82f6",
      }
    });

    console.log(`[LocationReporter] Started reporting for bus: ${busId}`);
    return true;
  } catch (err) {
    console.error('Failed to start reporting:', err);
    reportingBusId = null;
    reportingStartTime = null;
    return false;
  }
}

/**
 * Stop reporting location. Called when user taps "Stop Reporting".
 */
export async function stopReporting(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(REPORTING_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(REPORTING_TASK);
    }
  } catch (err) {
    console.error('Failed to stop location updates:', err);
  }
  reportingBusId = null;
  reportingStartTime = null;
  lastReportTime = 0;
  console.log('[LocationReporter] Stopped reporting.');
}

/**
 * Get current reporting state.
 */
export function getReportingState(): {
  isReporting: boolean;
  busId: string | null;
  durationMs: number;
} {
  const now = Date.now();
  return {
    isReporting: reportingBusId !== null,
    busId: reportingBusId,
    durationMs: reportingStartTime ? now - reportingStartTime : 0,
  };
}
