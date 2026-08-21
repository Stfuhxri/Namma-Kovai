/**
 * GPS Crowdsource Aggregator — Core Module
 *
 * This module is intentionally designed to be:
 * - Dependency-free (no Firebase imports at pure-logic level)
 * - Unit-testable in isolation
 * - Used by both Cloud Functions (server) and the mobile client
 *
 * The aggregation algorithm:
 * 1. Filter reports from last 60 seconds
 * 2. Reject outliers (off-route, impossible speed, low accuracy)
 * 3. Weight by recency (exponential decay)
 * 4. Compute weighted median lat/lng
 */

export interface LocationReport {
  busId: string;
  userId: string;
  lat: number;
  lng: number;
  speed: number;       // m/s
  heading: number;     // degrees
  accuracy: number;    // meters
  timestamp: number;   // unix ms
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface AggregatedPosition {
  lat: number;
  lng: number;
  contributingUsers: number;
  lastUpdated: number;
}

export interface RoutePolyline {
  points: LatLng[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const WINDOW_MS = 60_000;             // Consider reports from last 60 seconds
const MAX_OFF_ROUTE_METERS = 300;     // Reject if >300m from any polyline segment
const MAX_SPEED_KMH = 80;            // Reject if implied speed >80 km/h (city bus limit)
const MAX_ACCURACY_METERS = 50;      // Reject if GPS accuracy >50m
const RECENCY_HALF_LIFE_SECONDS = 15; // Exponential decay half-life

// ─── Haversine Distance ───────────────────────────────────────────────────────
/**
 * Calculate distance between two lat/lng points in meters.
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000; // Earth radius in meters
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;

  const sinHalfDφ = Math.sin(Δφ / 2);
  const sinHalfDλ = Math.sin(Δλ / 2);

  const α =
    sinHalfDφ * sinHalfDφ +
    Math.cos(φ1) * Math.cos(φ2) * sinHalfDλ * sinHalfDλ;

  return R * 2 * Math.atan2(Math.sqrt(α), Math.sqrt(1 - α));
}

// ─── Distance from Point to Line Segment ─────────────────────────────────────
function distanceToSegmentMeters(point: LatLng, a: LatLng, b: LatLng): number {
  const dx = b.lat - a.lat;
  const dy = b.lng - a.lng;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return haversineMeters(point, a);

  let t = ((point.lat - a.lat) * dx + (point.lng - a.lng) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const nearest: LatLng = { lat: a.lat + t * dx, lng: a.lng + t * dy };
  return haversineMeters(point, nearest);
}

// ─── Outlier Rejection ────────────────────────────────────────────────────────

/**
 * Returns true if the point is within `thresholdMeters` of any segment of the polyline.
 */
export function isOnRoute(
  point: LatLng,
  polyline: RoutePolyline,
  thresholdMeters = MAX_OFF_ROUTE_METERS
): boolean {
  if (polyline.points.length < 2) return true; // Can't validate — allow

  for (let i = 0; i < polyline.points.length - 1; i++) {
    const dist = distanceToSegmentMeters(point, polyline.points[i], polyline.points[i + 1]);
    if (dist <= thresholdMeters) return true;
  }
  return false;
}

/**
 * Returns true if the speed implied by two successive reports is plausible for a city bus.
 */
export function isSpeedPlausible(
  prev: LocationReport,
  next: LocationReport,
  maxKmh = MAX_SPEED_KMH
): boolean {
  const distMeters = haversineMeters(prev, next);
  const timeSec = (next.timestamp - prev.timestamp) / 1000;
  if (timeSec <= 0) return false;

  const speedKmh = (distMeters / timeSec) * 3.6;
  return speedKmh <= maxKmh;
}

/**
 * Returns a weight [0..1] based on how recent the report is.
 * Uses exponential decay with configurable half-life.
 */
export function weightByRecency(
  timestamp: number,
  now: number,
  halfLifeSeconds = RECENCY_HALF_LIFE_SECONDS
): number {
  const ageSec = (now - timestamp) / 1000;
  return Math.pow(0.5, ageSec / halfLifeSeconds);
}

// ─── Weighted Median ──────────────────────────────────────────────────────────

/**
 * Compute weighted median of 1D values.
 * More robust than weighted mean against bad-faith outlier reporters.
 */
function weightedMedian(values: number[], weights: number[]): number {
  const pairs = values.map((v, i) => ({ v, w: weights[i] }));
  pairs.sort((a, b) => a.v - b.v);

  const totalWeight = pairs.reduce((s, p) => s + p.w, 0);
  let cumWeight = 0;
  for (const pair of pairs) {
    cumWeight += pair.w;
    if (cumWeight >= totalWeight / 2) return pair.v;
  }
  return pairs[pairs.length - 1].v;
}

// ─── Main Aggregation Function ────────────────────────────────────────────────

/**
 * Aggregate crowdsourced GPS reports into a single best-estimate bus position.
 *
 * @param reports   - All raw reports for this bus
 * @param now       - Current unix timestamp (ms). Pass in for testability.
 * @param polyline  - Route polyline for off-route rejection (optional for v1 without real routes)
 * @returns Aggregated position, or null if no valid reports
 */
export function aggregateBusPosition(
  reports: LocationReport[],
  now: number = Date.now(),
  polyline?: RoutePolyline
): AggregatedPosition | null {
  // Step 1: Filter to last 60 seconds
  const recent = reports.filter((r) => now - r.timestamp <= WINDOW_MS);
  if (recent.length === 0) return null;

  // Step 2: Reject low-accuracy reports
  const accurateReports = recent.filter((r) => r.accuracy <= MAX_ACCURACY_METERS);
  if (accurateReports.length === 0) return null;

  // Step 3: Reject off-route reports (if polyline provided)
  const onRouteReports = polyline
    ? accurateReports.filter((r) => isOnRoute(r, polyline))
    : accurateReports;

  if (onRouteReports.length === 0) return null;

  // Step 4: Reject impossible-speed reports
  // Sort by timestamp and check consecutive pairs per user
  const byUser = new Map<string, LocationReport[]>();
  for (const r of onRouteReports) {
    const existing = byUser.get(r.userId) ?? [];
    existing.push(r);
    byUser.set(r.userId, existing);
  }

  const validReports: LocationReport[] = [];
  byUser.forEach((userReports) => {
    const sorted = userReports.sort((a, b) => a.timestamp - b.timestamp);
    validReports.push(sorted[0]); // First report always accepted
    for (let i = 1; i < sorted.length; i++) {
      if (isSpeedPlausible(sorted[i - 1], sorted[i])) {
        validReports.push(sorted[i]);
      }
    }
  });

  if (validReports.length === 0) return null;

  // Step 5: Compute recency-weighted median lat/lng
  const weights = validReports.map((r) => weightByRecency(r.timestamp, now));
  const lats = validReports.map((r) => r.lat);
  const lngs = validReports.map((r) => r.lng);

  const uniqueUsers = new Set(validReports.map((r) => r.userId));

  return {
    lat: weightedMedian(lats, weights),
    lng: weightedMedian(lngs, weights),
    contributingUsers: uniqueUsers.size,
    lastUpdated: now,
  };
}
