/**
 * Firebase Cloud Functions — Namma Kovai
 *
 * Functions:
 * 1. aggregateBusPositions — Runs every 10 seconds via Pub/Sub schedule.
 *    Reads raw reports from RTDB, aggregates them, writes back to /buses/{busId}
 *
 * 2. cleanupOldReports — Runs every hour.
 *    Deletes RTDB reports older than 5 minutes.
 *
 * Deploy: firebase deploy --only functions
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { aggregateBusPosition, LocationReport } from './aggregator';

admin.initializeApp({
  databaseURL: 'https://namma-kovai-a6512-default-rtdb.asia-southeast1.firebasedatabase.app'
});

const rtdb = admin.database();
const firestore = admin.firestore();

// ─── Aggregate Bus Positions ──────────────────────────────────────────────────

export const aggregateBusPositions = functions.scheduler.onSchedule(
  {
    schedule: 'every 10 seconds',
    region: 'asia-south1',
    timeoutSeconds: 30,
  },
  async () => {
    const reportsSnapshot = await rtdb.ref('liveLocationReports').once('value');
    const reportsData = reportsSnapshot.val() as Record<
      string,
      Record<string, LocationReport>
    > | null;

    if (!reportsData) return;

    const now = Date.now();
    const busUpdates: Record<string, any> = {};
    const firestoreUpdates: Array<() => Promise<any>> = [];

    for (const [busId, reports] of Object.entries(reportsData)) {
      const reportsList = Object.values(reports) as LocationReport[];

      // Fetch route polyline for this bus (from Firestore)
      // ⚠️ For v1, we skip polyline validation — add it in v2
      const aggregated = aggregateBusPosition(reportsList, now);

      if (aggregated) {
        // Write to RTDB /buses/{busId} for real-time client subscriptions
        busUpdates[`buses/${busId}`] = {
          lastKnownLat: aggregated.lat,
          lastKnownLng: aggregated.lng,
          lastUpdated: aggregated.lastUpdated,
          contributingUsers: aggregated.contributingUsers,
          status: 'active',
        };

        // Also mirror to Firestore for durable queries
        firestoreUpdates.push(() =>
          firestore.collection('buses').doc(busId).set(
            {
              lastKnownLat: aggregated.lat,
              lastKnownLng: aggregated.lng,
              lastUpdated: aggregated.lastUpdated,
              contributingUsers: aggregated.contributingUsers,
              status: 'active',
            },
            { merge: true }
          )
        );
      } else {
        // No valid reports — mark bus as unknown
        busUpdates[`buses/${busId}/status`] = 'unknown';
      }
    }

    // Batch write to RTDB
    if (Object.keys(busUpdates).length > 0) {
      await rtdb.ref().update(busUpdates);
    }

    // Firestore writes (up to 10 concurrent)
    const chunks = chunkArray(firestoreUpdates, 10);
    for (const chunk of chunks) {
      await Promise.all(chunk.map((fn) => fn()));
    }

    console.log(
      `[aggregateBusPositions] Processed ${Object.keys(reportsData).length} buses, wrote ${Object.keys(busUpdates).length} updates.`
    );
  }
);

// ─── Cleanup Old Reports ──────────────────────────────────────────────────────

export const cleanupOldReports = functions.scheduler.onSchedule(
  {
    schedule: 'every 60 minutes',
    region: 'asia-south1',
    timeoutSeconds: 60,
  },
  async () => {
    const cutoff = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    const reportsRef = rtdb.ref('liveLocationReports');
    const snapshot = await reportsRef.once('value');
    const all = snapshot.val() as Record<string, Record<string, { timestamp: number }>> | null;

    if (!all) return;

    const deletions: Array<Promise<void>> = [];
    for (const [busId, reports] of Object.entries(all)) {
      for (const [reportId, report] of Object.entries(reports)) {
        if (report.timestamp < cutoff) {
          deletions.push(
            reportsRef.child(`${busId}/${reportId}`).remove()
          );
        }
      }
    }

    await Promise.all(deletions);
    console.log(`[cleanupOldReports] Deleted ${deletions.length} stale reports.`);
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
