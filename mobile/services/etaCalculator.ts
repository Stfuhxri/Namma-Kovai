/**
 * ETA Calculator — Namma Kovai
 *
 * v1: Straight-line distance / average bus speed
 * v2 (future): Google/MapLibre road distance matrix
 */

const AVG_BUS_SPEED_KMH = 20; // Average city bus speed in Coimbatore

interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculate haversine distance in kilometers.
 */
function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
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

/**
 * Calculate straight-line ETA in minutes.
 * Uses a 1.3x road factor to approximate actual road distance.
 */
export function straightLineETA(
  busPosition: LatLng,
  targetStop: LatLng,
  avgSpeedKmh = AVG_BUS_SPEED_KMH,
  roadFactor = 1.3
): number {
  const straightLineKm = distanceKm(busPosition, targetStop);
  const estimatedRoadKm = straightLineKm * roadFactor;
  const timeHours = estimatedRoadKm / avgSpeedKmh;
  return Math.ceil(timeHours * 60); // Round up to nearest minute
}

/**
 * Format ETA for display.
 * Returns "Now", "1 min", "5 min", etc.
 */
export function formatETA(minutes: number): string {
  if (minutes <= 1) return 'Now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}min`;
}

/**
 * Calculate ETA for each stop on a route given current bus position.
 */
export function calculateStopETAs(
  busPosition: LatLng,
  stops: Array<{ stopId: string; lat: number; lng: number; order: number }>,
  currentBusOrder: number // The order index of the stop the bus is approaching
): Map<string, number> {
  const etaMap = new Map<string, number>();

  for (const stop of stops) {
    if (stop.order >= currentBusOrder) {
      etaMap.set(stop.stopId, straightLineETA(busPosition, stop));
    }
  }

  return etaMap;
}
