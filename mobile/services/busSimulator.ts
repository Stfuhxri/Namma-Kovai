/**
 * Local Real-Time Bus Simulator Engine — Namma Kovai
 *
 * Runs a local simulation tick loop (every 1.5s) to smoothly animate 7 virtual buses
 * along Coimbatore transit route waypoints with stop dwell times, dynamic headings,
 * variable speeds, and real-time ETAs.
 *
 * Decoupled architecture allowing easy replacement with Socket.IO / WebSocket servers.
 */

import { SIMULATION_ROUTES, SimulationRoute, SimulationStop } from './busRoutesData';

export type BusStatus = 'MOVING' | 'STOPPED';

export interface SimulatedBus {
  busId: string;
  routeId: string;
  routeNumber: string;
  destination: string;
  latitude: number;
  longitude: number;
  speedKmH: number;
  baseSpeedKmH: number;
  heading: number;
  status: BusStatus;
  currentStopName: string;
  nextStopName: string;
  etaNextStopSec: number;
  color: string;
  lastUpdated: number;
  contributingUsers: number;
  isStale: boolean;
  staleMinutes: number;

  // Simulator internal tracking state
  _routeIndex: number; // Current waypoint index in route.waypoints
  _targetWaypointIndex: number;
  _dwellTimeRemainingSec: number;
  _directionForward: boolean;
}

type SimulatorListener = (buses: Map<string, SimulatedBus>) => void;

class BusSimulatorEngine {
  private buses: Map<string, SimulatedBus> = new Map();
  private listeners: Set<SimulatorListener> = new Set();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private readonly TICK_INTERVAL_MS = 1500; // 1.5 second tick updates

  constructor() {
    this.initializeBuses();
  }

  /**
   * Setup 7 virtual buses across predefined Coimbatore simulation routes
   */
  private initializeBuses() {
    const busDefinitions = [
      { id: 'sim-bus-11a-1', routeId: 'route-11a', baseSpeed: 32, startWaypointIdx: 0, direction: true, users: 14 },
      { id: 'sim-bus-11a-2', routeId: 'route-11a', baseSpeed: 28, startWaypointIdx: 6, direction: false, users: 8 },
      { id: 'sim-bus-70-1', routeId: 'route-70', baseSpeed: 38, startWaypointIdx: 1, direction: true, users: 19 },
      { id: 'sim-bus-45b-1', routeId: 'route-45b', baseSpeed: 25, startWaypointIdx: 2, direction: true, users: 11 },
      { id: 'sim-bus-1c-1', routeId: 'route-1c', baseSpeed: 30, startWaypointIdx: 3, direction: true, users: 22 },
      { id: 'sim-bus-22b-1', routeId: 'route-22b', baseSpeed: 24, startWaypointIdx: 1, direction: true, users: 6 },
      { id: 'sim-bus-90a-1', routeId: 'route-90a', baseSpeed: 35, startWaypointIdx: 4, direction: true, users: 15 },
    ];

    busDefinitions.forEach((def) => {
      const route = SIMULATION_ROUTES.find((r) => r.id === def.routeId) || SIMULATION_ROUTES[0];
      const startCoord = route.waypoints[def.startWaypointIdx] || route.waypoints[0];
      const nextIdx = def.direction ? Math.min(def.startWaypointIdx + 1, route.waypoints.length - 1) : Math.max(def.startWaypointIdx - 1, 0);
      const nextCoord = route.waypoints[nextIdx] || startCoord;

      const heading = this.calculateHeading(startCoord, nextCoord);
      const initialStops = this.getStopNames(route, def.startWaypointIdx);

      const bus: SimulatedBus = {
        busId: def.id,
        routeId: route.id,
        routeNumber: route.routeNumber,
        destination: route.stops[route.stops.length - 1].name,
        latitude: startCoord[1],
        longitude: startCoord[0],
        speedKmH: def.baseSpeed,
        baseSpeedKmH: def.baseSpeed,
        heading,
        status: 'MOVING',
        currentStopName: initialStops.currentStop,
        nextStopName: initialStops.nextStop,
        etaNextStopSec: 120,
        color: route.color,
        lastUpdated: Date.now(),
        contributingUsers: def.users,
        isStale: false,
        staleMinutes: 0,
        _routeIndex: def.startWaypointIdx,
        _targetWaypointIndex: nextIdx,
        _dwellTimeRemainingSec: 0,
        _directionForward: def.direction,
      };

      this.buses.set(bus.busId, bus);
    });
  }

  /**
   * Calculate heading bearing (0 - 360 degrees) between two GPS points
   */
  private calculateHeading(from: [number, number], to: [number, number]): number {
    const [lng1, lat1] = from;
    const [lng2, lat2] = to;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Calculate distance in kilometers between two GPS points
   */
  private distanceKm(from: [number, number], to: [number, number]): number {
    const R = 6371; // Earth radius km
    const dLat = ((to[1] - from[1]) * Math.PI) / 180;
    const dLng = ((to[0] - from[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from[1] * Math.PI) / 180) *
        Math.cos((to[1] * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Get current & next stop names for a bus based on waypoint position
   */
  private getStopNames(route: SimulationRoute, waypointIdx: number): { currentStop: string; nextStop: string } {
    const progressRatio = waypointIdx / Math.max(route.waypoints.length - 1, 1);
    const stopIdx = Math.floor(progressRatio * (route.stops.length - 1));

    const currentStop = route.stops[stopIdx]?.name || route.stops[0].name;
    const nextStop = route.stops[Math.min(stopIdx + 1, route.stops.length - 1)]?.name || route.stops[route.stops.length - 1].name;

    return { currentStop, nextStop };
  }

  /**
   * Main simulation tick execution loop
   */
  private tick() {
    const deltaSec = this.TICK_INTERVAL_MS / 1000;
    const now = Date.now();

    this.buses.forEach((bus) => {
      const route = SIMULATION_ROUTES.find((r) => r.id === bus.routeId);

      // Handle Bus Stop Dwell Time
      if (bus.status === 'STOPPED') {
        bus._dwellTimeRemainingSec -= deltaSec;
        bus.speedKmH = 0;
        bus.lastUpdated = now;

        if (bus._dwellTimeRemainingSec <= 0) {
          bus.status = 'MOVING';
          bus.speedKmH = bus.baseSpeedKmH;
        } else {
          return;
        }
      }

      // Current position & target waypoint
      const currentPos: [number, number] = [bus.longitude, bus.latitude];
      const targetWaypoint = route ? route.waypoints[bus._targetWaypointIndex] : undefined;

      if (!targetWaypoint) {
        // If no route waypoints exist (e.g. injected Firebase bus), move linearly using heading
        if (bus.speedKmH > 0 && bus.status === 'MOVING') {
          const stepKm = (bus.speedKmH / 3600) * deltaSec;
          const R = 6371; // Earth's radius in km
          const brng = (bus.heading * Math.PI) / 180;
          const lat1 = (bus.latitude * Math.PI) / 180;
          const lon1 = (bus.longitude * Math.PI) / 180;

          const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(stepKm / R) +
            Math.cos(lat1) * Math.sin(stepKm / R) * Math.cos(brng)
          );
          const lon2 = lon1 + Math.atan2(
            Math.sin(brng) * Math.sin(stepKm / R) * Math.cos(lat1),
            Math.cos(stepKm / R) - Math.sin(lat1) * Math.sin(lat2)
          );

          bus.latitude = (lat2 * 180) / Math.PI;
          bus.longitude = (lon2 * 180) / Math.PI;
        }
        bus.lastUpdated = now;
        return;
      }

      const distToTarget = this.distanceKm(currentPos, targetWaypoint);
      // Distance covered in this tick step (km)
      const stepKm = (bus.speedKmH / 3600) * deltaSec;

      if (distToTarget <= stepKm || distToTarget < 0.005) {
        // Reached target waypoint -> snap to waypoint
        bus.longitude = targetWaypoint[0];
        bus.latitude = targetWaypoint[1];
        bus._routeIndex = bus._targetWaypointIndex;

        // Check if current waypoint coincides with a bus stop for dwell time
        const matchingStop = route.stops.find(
          (stop) => this.distanceKm(targetWaypoint, stop.coordinates) < 0.2
        );

        if (matchingStop && bus.currentStopName !== matchingStop.name) {
          bus.status = 'STOPPED';
          bus._dwellTimeRemainingSec = 5; // Pause 5 seconds at bus stop
          bus.currentStopName = matchingStop.name;
        }

        // Advance to next waypoint
        if (bus._directionForward) {
          if (bus._targetWaypointIndex >= route.waypoints.length - 1) {
            bus._directionForward = false;
            bus._targetWaypointIndex = route.waypoints.length - 2;
          } else {
            bus._targetWaypointIndex++;
          }
        } else {
          if (bus._targetWaypointIndex <= 0) {
            bus._directionForward = true;
            bus._targetWaypointIndex = 1;
          } else {
            bus._targetWaypointIndex--;
          }
        }

        // Recalculate heading for new target
        const newTarget = route.waypoints[bus._targetWaypointIndex];
        if (newTarget) {
          bus.heading = this.calculateHeading([bus.longitude, bus.latitude], newTarget);
        }
      } else {
        // Interpolate position along segment towards target
        const ratio = stepKm / distToTarget;
        bus.longitude += (targetWaypoint[0] - bus.longitude) * ratio;
        bus.latitude += (targetWaypoint[1] - bus.latitude) * ratio;
        bus.heading = this.calculateHeading([bus.longitude, bus.latitude], targetWaypoint);
      }

      // Update ETA to next stop
      const stopsInfo = this.getStopNames(route, bus._routeIndex);
      bus.nextStopName = stopsInfo.nextStop;

      const nextStopObj = route.stops.find((s) => s.name === bus.nextStopName);
      if (nextStopObj) {
        const remainingKm = this.distanceKm([bus.longitude, bus.latitude], nextStopObj.coordinates);
        bus.etaNextStopSec = Math.max(Math.round((remainingKm / (bus.baseSpeedKmH || 20)) * 3600), 10);
      }

      bus.lastUpdated = now;
    });

    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(new Map(this.buses)));
  }

  /**
   * Inject or update an external bus (e.g. from Firebase) into the simulator
   * so it can be animated smoothly even if its source data is static or updating slowly.
   */
  public injectExternalBus(id: string, data: Partial<SimulatedBus>) {
    const existing = this.buses.get(id);
    if (existing) {
      // Update properties but don't overwrite internal state unless provided
      Object.assign(existing, data);
      existing.lastUpdated = Date.now();
    } else {
      this.buses.set(id, {
        busId: id,
        routeId: data.routeId || '',
        routeNumber: data.routeNumber || 'BUS',
        destination: data.destination || 'Unknown',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        speedKmH: data.speedKmH || 20,
        baseSpeedKmH: data.baseSpeedKmH || 20,
        heading: data.heading || 0,
        status: data.status || 'MOVING',
        currentStopName: data.currentStopName || '',
        nextStopName: data.nextStopName || '',
        etaNextStopSec: data.etaNextStopSec || 0,
        color: data.color || '#3b82f6',
        lastUpdated: Date.now(),
        contributingUsers: data.contributingUsers || 1,
        isStale: false,
        staleMinutes: 0,
        _routeIndex: 0,
        _targetWaypointIndex: 1,
        _dwellTimeRemainingSec: 0,
        _directionForward: true,
        ...data
      });
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerId = setInterval(() => this.tick(), this.TICK_INTERVAL_MS);
    this.notifyListeners();
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId) clearInterval(this.timerId);
  }

  public subscribe(listener: SimulatorListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state upon subscription
    listener(new Map(this.buses));

    if (!this.isRunning) {
      this.start();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  public getBuses(): Map<string, SimulatedBus> {
    return new Map(this.buses);
  }

  public getBus(id: string): SimulatedBus | undefined {
    return this.buses.get(id);
  }
}

export const busSimulator = new BusSimulatorEngine();
