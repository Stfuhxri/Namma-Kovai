import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '@/services/firebase';
import { TransitNetworkBus } from './useLiveBuses';

/** Linear interpolation between two GPS coordinates */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Shortest-path angle interpolation for bearing/heading */
function lerpAngle(from: number, to: number, t: number): number {
  let diff = ((to - from + 540) % 360) - 180;
  return (from + diff * t + 360) % 360;
}

export interface InterpolatedBusPosition {
  lat: number;
  lng: number;
  heading: number;
  speedKmH: number;
  occupancy: TransitNetworkBus['occupancy'];
  nextStop: string;
  lastUpdated: number;
  isStale: boolean;
}

export function useLiveBusTracking(busId: string | null) {
  const [position, setPosition] = useState<InterpolatedBusPosition | null>(null);
  const [rawBus, setRawBus] = useState<TransitNetworkBus | null>(null);
  const [connected, setConnected] = useState(false);

  // Previous and target positions for interpolation
  const prevPosRef = useRef<{ lat: number; lng: number; heading: number } | null>(null);
  const targetPosRef = useRef<TransitNetworkBus | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interpProgressRef = useRef(0);

  const startInterpolation = useCallback((from: TransitNetworkBus, to: TransitNetworkBus) => {
    if (animFrameRef.current) clearInterval(animFrameRef.current);
    interpProgressRef.current = 0;

    const ANIM_DURATION_MS = 2000; // 2s smooth glide per update
    const TICK_MS = 50; // 20fps interpolation
    const steps = ANIM_DURATION_MS / TICK_MS;

    animFrameRef.current = setInterval(() => {
      interpProgressRef.current = Math.min(1, interpProgressRef.current + 1 / steps);
      const t = interpProgressRef.current;

      setPosition({
        lat: lerp(from.latitude, to.latitude, t),
        lng: lerp(from.longitude, to.longitude, t),
        heading: lerpAngle(from.heading, to.heading, t),
        speedKmH: to.speed_kmh,
        occupancy: to.occupancy,
        nextStop: to.next_stop,
        lastUpdated: to.last_updated,
        isStale: Date.now() - to.last_updated > 3 * 60 * 1000,
      });

      if (t >= 1 && animFrameRef.current) {
        clearInterval(animFrameRef.current);
        animFrameRef.current = null;
      }
    }, TICK_MS);
  }, []);

  useEffect(() => {
    if (!busId || !rtdb) return;

    const busRef = ref(rtdb, `transit_network/live_buses/${busId}`);

    const unsubscribe = onValue(
      busRef,
      (snapshot) => {
        const data = snapshot.val() as TransitNetworkBus | null;
        if (!data) {
          setConnected(false);
          return;
        }

        setConnected(true);
        setRawBus(data);

        const prev = targetPosRef.current;
        if (prev && (prev.latitude !== data.latitude || prev.longitude !== data.longitude)) {
          // Interpolate from previous position to new one
          startInterpolation(prev, data);
        } else {
          // First update — snap immediately
          setPosition({
            lat: data.latitude,
            lng: data.longitude,
            heading: data.heading,
            speedKmH: data.speed_kmh,
            occupancy: data.occupancy,
            nextStop: data.next_stop,
            lastUpdated: data.last_updated,
            isStale: Date.now() - data.last_updated > 3 * 60 * 1000,
          });
          prevPosRef.current = { lat: data.latitude, lng: data.longitude, heading: data.heading };
        }

        targetPosRef.current = data;
      },
      (err) => {
        console.warn('[useLiveBusTracking] Firebase error:', err);
        setConnected(false);
      }
    );

    return () => {
      off(busRef);
      if (animFrameRef.current) clearInterval(animFrameRef.current);
    };
  }, [busId, startInterpolation]);

  return { position, rawBus, connected };
}
