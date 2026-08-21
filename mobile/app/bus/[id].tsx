import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useLiveBuses } from '@/hooks/useLiveBuses';
import { useLiveBusTracking } from '@/hooks/useLiveBusTracking';
import { useTransitInfo } from '@/hooks/useTransitInfo';
import { stopReporting } from '@/services/locationReporter';
import { useLocalBroadcaster } from '@/hooks/useLocalBroadcaster';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { MapContainer, LiveBusMarkers, LiveBus, MapRouteLayer, StationMarkers, COIMBATORE_STOPS } from '@/components/map';
import { LiveTrackingSheet } from '@/components/LiveTrackingSheet';
import { MAP_STYLES } from '@/components/map/MapConfig';

// OSRM destination — can be parameterized later
const DEFAULT_DEST = { lng: 76.9658, lat: 11.0183 }; // Gandhipuram

interface RouteData {
  coordinates: [number, number][];
  duration: number;
  distance: number;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ─── 3D Camera Controller ─────────────────────────────────────────────────────
/**
 * Smoothly animates the map camera to follow the bus in 3D mode.
 * When 3D mode is active:
 *   - Camera pitches to 55° for immersive perspective
 *   - Bearing aligns to bus heading with 15° lookahead offset
 *   - Zoom locks at 17 for street-level detail
 * When 2D mode:
 *   - Pitch returns to 0°
 *   - Zoom backs out to 15
 */
function updateCamera(
  cameraRef: React.MutableRefObject<any>,
  lat: number,
  lng: number,
  heading: number,
  is3D: boolean
) {
  if (!cameraRef.current) return;
  cameraRef.current.setCamera({
    centerCoordinate: [lng, lat],
    zoomLevel: is3D ? 18 : 15,
    pitch: is3D ? 75 : 0,
    bearing: is3D ? heading : 0,
    animationDuration: 1000,
    animationMode: 'flyTo',
  });
}

export default function LiveTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cameraRef = useRef<any>(null);

  // ── Local-only broadcaster for the "local-10c" bus ────────────────
  const isLocalBus = id === 'local-10c';
  // Initial coords: Gandhipuram (used before broadcaster starts)
  const LOCAL_BUS_INIT = { lat: 11.0183, lng: 76.9634 };
  const {
    isBroadcasting,
    localBusPosition,
    startBroadcasting,
    stopBroadcasting,
  } = useLocalBroadcaster(LOCAL_BUS_INIT.lat, LOCAL_BUS_INIT.lng);

  // ── Data Sources ─────────────────────────────────────────────────
  // Fallback to useLiveBuses for sim buses not in Firebase
  const { buses } = useLiveBuses();
  const fallbackBus = (!isLocalBus && id) ? buses.get(id as string) : null;

  // Primary: direct Firebase listener for the specific bus (skipped for local bus)
  const { position, rawBus, connected } = useLiveBusTracking(!isLocalBus ? (id ?? null) : null);

  // ── Active coordinates: use local broadcaster if local bus, else Firebase/sim ─
  const activeLat = isLocalBus
    ? localBusPosition.lat
    : (position?.lat ?? fallbackBus?.lastKnownLat ?? 11.0168);
  const activeLng = isLocalBus
    ? localBusPosition.lng
    : (position?.lng ?? fallbackBus?.lastKnownLng ?? 76.9558);
  const activeHeading = isLocalBus
    ? localBusPosition.heading
    : (position?.heading ?? fallbackBus?.heading ?? 0);
  const activeSpeed = isLocalBus
    ? localBusPosition.speedKmH
    : (position?.speedKmH ?? fallbackBus?.speedKmH ?? 0);
  const activeOccupancy = !isLocalBus ? (position?.occupancy ?? fallbackBus?.occupancy) : undefined;
  const activeNextStop = isLocalBus
    ? 'Gandhipuram'
    : (position?.nextStop ?? fallbackBus?.nextStopName ?? 'En Route');
  const baseEtaSec = (!isLocalBus && fallbackBus?.etaNextStopSec) ? fallbackBus.etaNextStopSec : 600;

  // ── Local bus static info for the sheet ──────────────────────────
  const localBusForSheet = isLocalBus ? {
    busId: 'local-10c',
    routeId: 'route-10c',
    lastKnownLat: activeLat,
    lastKnownLng: activeLng,
    lastUpdated: Date.now(),
    isStale: false,
    staleMinutes: 0,
    speedKmH: activeSpeed,
    heading: activeHeading,
    occupancy: undefined,
    nextStopName: 'Gandhipuram',
    etaNextStopSec: 600,
    routeNumber: '10C',
  } : null;

  // Compose BusWithStatus for the sheet
  const busForSheet = isLocalBus ? localBusForSheet : (fallbackBus ?? (rawBus ? {
    busId: rawBus.bus_id,
    routeId: rawBus.route_id,
    lastKnownLat: activeLat,
    lastKnownLng: activeLng,
    lastUpdated: rawBus.last_updated,
    isStale: false,
    staleMinutes: 0,
    speedKmH: activeSpeed,
    heading: activeHeading,
    occupancy: activeOccupancy,
    nextStopName: activeNextStop,
    etaNextStopSec: baseEtaSec,
  } : null));

  // ── Transit Info (Weather + Traffic + ETA) ────────────────────────
  const { weather, traffic, eta, loading: infoLoading, fetchInfo } = useTransitInfo();

  // ── Map / Camera State ────────────────────────────────────────────
  const [is3D, setIs3D] = useState(true);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // ── Fetch transit info whenever bus position changes significantly ─
  const lastFetchCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    const prev = lastFetchCoordRef.current;
    const distanceDeg = prev
      ? Math.abs(activeLat - prev.lat) + Math.abs(activeLng - prev.lng)
      : 999;

    if (distanceDeg > 0.005) { // ~500m threshold
      lastFetchCoordRef.current = { lat: activeLat, lng: activeLng };
      fetchInfo(activeLat, activeLng, baseEtaSec);
    }
  }, [activeLat, activeLng]);

  // ── Camera follow: smooth lock onto bus position + heading ─────────
  useEffect(() => {
    updateCamera(cameraRef, activeLat, activeLng, activeHeading, is3D);
  }, [activeLat, activeLng, activeHeading, is3D]);

  // ── OSRM Route Fetch ──────────────────────────────────────────────
  const fetchRoutes = useCallback(async () => {
    setIsLoadingRoute(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${activeLng},${activeLat};${DEFAULT_DEST.lng},${DEFAULT_DEST.lat}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) {
        setRoutes(data.routes.map((r: any) => ({
          coordinates: r.geometry.coordinates,
          duration: r.duration,
          distance: r.distance,
        })));
      }
    } catch (e) {
      console.warn('[LiveTracking] OSRM fetch failed:', e);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [activeLat, activeLng]);

  const toggle3D = useCallback(() => setIs3D(prev => !prev), []);

  const handleStop = useCallback(async () => {
    if (isLocalBus) {
      stopBroadcasting();
    } else {
      await stopReporting();
    }
    router.back();
  }, [isLocalBus, stopBroadcasting]);

  // Ensure tracking stops if user hits hardware back button
  useEffect(() => {
    return () => {
      if (isLocalBus) {
        stopBroadcasting();
      } else {
        stopReporting();
      }
    };
  }, [isLocalBus]);

  // ── Bus marker for map ────────────────────────────────────────────
  const busMarkers: LiveBus[] = [{
    id: id as string,
    routeNumber: isLocalBus ? '10C' : (fallbackBus?.routeId?.replace('route-', '').toUpperCase() ?? '—'),
    destination: activeNextStop,
    coordinates: [activeLng, activeLat],
    heading: activeHeading,
    speedKmH: activeSpeed,
    occupancy: activeOccupancy as any,
    status: isLocalBus ? (isBroadcasting ? 'MOVING' : 'STOPPED') : (fallbackBus?.status as any),
  }];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Full-screen Map ── */}
      <MapContainer
        cameraRef={cameraRef}
        style={StyleSheet.absoluteFill}
        initialCenter={[activeLng, activeLat]}
        initialZoom={15}
        showControls={false}
        showUserLocation={true}
        mapStyle="VOYAGER"
      >
        <StationMarkers stops={COIMBATORE_STOPS} />
        <LiveBusMarkers buses={busMarkers} />

        {/* OSRM route polylines */}
        {routes.map((route, i) => {
          const isSelected = i === selectedRouteIndex;
          const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: route.coordinates },
            }],
          };
          return (
            <MapRouteLayer
              key={`route-${i}`}
              id={`route-${i}`}
              routeGeoJSON={geojson as any}
              color={isSelected ? '#6366f1' : '#94a3b8'}
              lineWidth={isSelected ? 7 : 4}
            />
          );
        })}
      </MapContainer>

      {/* ── Top Header ── */}
      <SafeAreaView edges={['top']} style={styles.header} pointerEvents="box-none">
        <View style={[styles.headerInner, is3D && styles.headerInner3D]}>
          <TouchableOpacity style={[styles.backBtn, is3D && styles.backBtn3D]} onPress={handleStop}>
            <Text style={[styles.backIcon, is3D && styles.textWhite]}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, is3D && styles.textWhite]}>
              {isLocalBus ? '10C' : (fallbackBus?.routeId?.replace('route-', '').toUpperCase() ?? id)}
            </Text>
            <Text style={[styles.headerSub, is3D && styles.textWhiteOpacity]} numberOfLines={1}>{activeNextStop}</Text>
          </View>

          <View style={[styles.liveChip, !connected && !isLocalBus && styles.staleChip, is3D && styles.liveChip3D]}>
            <View style={[styles.chipDot, !connected && !isLocalBus && styles.chipDotStale, is3D && styles.chipDot3D]} />
            <Text style={[styles.chipText, is3D && styles.textWhite]}>
              {isLocalBus ? (isBroadcasting ? 'ACTIVE' : 'LIVE') : (connected ? 'LIVE' : 'OFFLINE')}
            </Text>
          </View>
        </View>

        {/* Speed overlay when in 3D mode */}
        {is3D && (
          <View style={styles.speedOverlay}>
            <Text style={styles.speedOverlayVal}>{Math.round(activeSpeed)}</Text>
            <Text style={styles.speedOverlayUnit}>km/h</Text>
          </View>
        )}
      </SafeAreaView>

      {/* ── Draggable Bottom Info Sheet ── */}
      <LiveTrackingSheet
        bus={busForSheet}
        weather={weather}
        traffic={traffic}
        eta={eta}
        infoLoading={infoLoading}
        is3D={is3D}
        onToggle3D={toggle3D}
        onGetRoute={fetchRoutes}
        onStop={handleStop}
        isLocalBus={isLocalBus}
        isBroadcasting={isBroadcasting}
        onStartBroadcasting={startBroadcasting}
        onStopBroadcasting={stopBroadcasting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8eaf0' },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.base,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  headerInner3D: {
    backgroundColor: '#064e3b', // Dark green like reference image
    borderRadius: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn3D: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backIcon: { fontSize: 18, color: Colors.onSurface, fontWeight: '700' },
  textWhite: { color: '#ffffff' },
  textWhiteOpacity: { color: 'rgba(255,255,255,0.8)' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '500', marginTop: 1 },

  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fee2e2',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveChip3D: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  staleChip: { backgroundColor: Colors.surfaceContainerHigh },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.error },
  chipDot3D: { backgroundColor: '#ffffff' },
  chipDotStale: { backgroundColor: Colors.onSurfaceVariant },
  chipText: { fontSize: 10, fontWeight: '800', color: Colors.error, letterSpacing: 1 },

  // 3D speed overlay
  speedOverlay: {
    alignSelf: 'flex-end',
    marginRight: Spacing.md,
    marginTop: Spacing.base,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  speedOverlayVal: { fontSize: 26, fontWeight: '900', color: '#ffffff', letterSpacing: -1 },
  speedOverlayUnit: { fontSize: 9, color: '#ffffff99', fontWeight: '600' },
});
