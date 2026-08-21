import { useEffect, useRef, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '@/services/firebase';
import { busSimulator, SimulatedBus } from '@/services/busSimulator';

const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export interface TransitNetworkBus {
  bus_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  occupancy: 'EMPTY' | 'FEW_SEATS' | 'STANDING_ONLY' | 'FULL';
  next_stop: string;
  last_updated: number;
}

export type BusWithStatus = {
  busId: string;
  routeId: string;
  lastKnownLat: number;
  lastKnownLng: number;
  lastUpdated: number;
  isStale: boolean;
  staleMinutes: number;
  speedKmH?: number;
  heading?: number;
  status?: string;
  occupancy?: string;
  currentStopName?: string;
  nextStopName?: string;
  etaNextStopSec?: number;
  contributingUsers?: number;
};

/**
 * useLiveBuses — subscribes to both Firebase Realtime Database (/transit_network/live_buses) 
 * and local Bus Simulator. Returns a map of busId → bus position with real-time continuous movement.
 */
export function useLiveBuses() {
  const [buses, setBuses] = useState<Map<string, BusWithStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rawBusesRef = useRef<Map<string, TransitNetworkBus>>(new Map());
  const simBusesRef = useRef<Map<string, SimulatedBus>>(new Map());

  const combineBuses = () => {
    const now = Date.now();
    const updated = new Map<string, BusWithStatus>();

    // Firebase buses are now injected into the busSimulator directly in the onValue callback,
    // so we don't need to manually process them here. They will appear as simulated buses.

    // Add local Simulated buses (which now includes Firebase buses)
    simBusesRef.current.forEach((simBus, id) => {
      updated.set(id, {
        busId: simBus.busId,
        routeId: simBus.routeId,
        lastKnownLat: simBus.latitude,
        lastKnownLng: simBus.longitude,
        lastUpdated: simBus.lastUpdated,
        contributingUsers: simBus.contributingUsers,
        isStale: false,
        staleMinutes: 0,
        speedKmH: simBus.speedKmH,
        heading: simBus.heading,
        status: simBus.status,
        currentStopName: simBus.currentStopName,
        nextStopName: simBus.nextStopName,
        etaNextStopSec: simBus.etaNextStopSec,
      });
    });

    setBuses(new Map(updated));
  };

  useEffect(() => {
    // Subscribe to local simulation engine
    const unsubscribeSim = busSimulator.subscribe((simBuses) => {
      simBusesRef.current = simBuses;
      combineBuses();
      setLoading(false);
    });

    // Subscribe to Firebase RTDB for live transit network buses
    const busesRef = ref(rtdb, 'transit_network/live_buses');
    const unsubscribeFirebase = onValue(
      busesRef,
      (snapshot) => {
        const data = snapshot.val() as Record<string, TransitNetworkBus> | null;
        if (data) {
          Object.values(data).forEach(bus => {
            busSimulator.injectExternalBus(bus.bus_id, {
              routeId: bus.route_id,
              latitude: bus.latitude,
              longitude: bus.longitude,
              speedKmH: bus.speed_kmh > 0 ? bus.speed_kmh : 15, // Provide fallback speed to ensure it moves
              heading: bus.heading,
              routeNumber: bus.route_id.replace('RTE_', ''),
              color: '#ef4444', // Red color for Firebase injected buses
            });
          });
        }
        combineBuses();
        setLoading(false);
      },
      (err) => {
        console.warn('Firebase RTDB subscription warning:', err);
        combineBuses();
        setLoading(false);
      }
    );

    return () => {
      unsubscribeSim();
      off(busesRef);
    };
  }, []);

  return { buses, loading, error };
}

