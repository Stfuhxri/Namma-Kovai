import { LiveBus } from '@/components/map/MapConfig';
import { TransitStop } from '@/components/map/MapConfig';

export class NearbyBusDetector {
  /**
   * Calculates the great-circle distance between two points on the Earth.
   * Uses the Haversine formula.
   * @returns Distance in kilometers
   */
  static getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Retrieves live active buses within a certain radius of the user's location.
   */
  static getNearbyBuses(
    userLat: number,
    userLng: number,
    liveBuses: LiveBus[],
    maxRadiusKm: number = 10
  ): (LiveBus & { distanceKm: number })[] {
    const nearby = liveBuses
      .map((bus) => {
        // bus.coordinates is [lng, lat]
        const distanceKm = this.getDistanceKm(userLat, userLng, bus.coordinates[1], bus.coordinates[0]);
        return { ...bus, distanceKm };
      })
      .filter((bus) => bus.distanceKm <= maxRadiusKm);

    nearby.sort((a, b) => a.distanceKm - b.distanceKm);
    return nearby;
  }

  /**
   * Finds nearby stops and identifies if any buses are approaching them.
   */
  static getBusesNearStops(
    userLat: number,
    userLng: number,
    stops: TransitStop[],
    liveBuses: LiveBus[],
    maxStopRadiusKm: number = 5
  ) {
    const nearbyStops = stops
      .map((stop) => {
        const distKm = this.getDistanceKm(userLat, userLng, stop.coordinates[1], stop.coordinates[0]);
        return { ...stop, distanceKm: distKm };
      })
      .filter((stop) => stop.distanceKm <= maxStopRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return nearbyStops.map((stop) => {
      // Find buses that are currently close to this stop
      const approachingBuses = liveBuses
        .map((bus) => {
          const bDist = this.getDistanceKm(stop.coordinates[1], stop.coordinates[0], bus.coordinates[1], bus.coordinates[0]);
          return { ...bus, distanceToStopKm: bDist };
        })
        .filter((bus) => bus.distanceToStopKm <= 2) // within 2km of the stop
        .sort((a, b) => a.distanceToStopKm - b.distanceToStopKm);

      return {
        ...stop,
        approachingBuses,
      };
    });
  }
}
