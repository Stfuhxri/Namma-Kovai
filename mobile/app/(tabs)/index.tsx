import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useLiveBuses } from '@/hooks/useLiveBuses';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

import { MapContainer, StationMarkers, LiveBusMarkers, MAP_STYLES, COIMBATORE_STOPS, DEMO_LIVE_BUSES, LiveBus } from '@/components/map';
import { NearbyBusDetector } from '@/services/NearbyBusDetector';

// Coimbatore center coordinates
const CBE_CENTER: [number, number] = [76.9558, 11.0168]; // [lng, lat] for MapLibre

// Default placeholder buses in case location fails
const DEFAULT_NEARBY_BUSES = [
  {
    id: 'demo-11a',
    routeNumber: '11A',
    destination: 'Ukkadam',
    bDist: 0.5,
    status: 'MOVING',
  },
  {
    id: 'demo-33a',
    routeNumber: '33A',
    destination: 'Singanallur',
    bDist: 1.2,
    status: 'STOPPED',
  },
];

MapLibreGL.setAccessToken(null);

export default function HomeScreen() {
  const { t } = useTranslation();
  const { buses, loading } = useLiveBuses();
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [nearbyBuses, setNearbyBuses] = useState<any[]>(DEFAULT_NEARBY_BUSES);
  const cameraRef = useRef<any>(null);

  const handleLocateMe = useCallback(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: CBE_CENTER,
      zoomLevel: 14,
      animationDuration: 500,
    });
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 50 },
        (loc) => {
          setUserLocation(loc);
        }
      );
    })();
  }, []);

  // Convert Map<string, LiveBusLocation> from hook to LiveBus array for MapMarkers
  const liveBusList: LiveBus[] = Array.from(buses.values())
    .filter((bus) => !bus.isStale)
    .map((bus) => ({
      id: bus.busId,
      routeNumber: bus.routeId.replace('route-', '').toUpperCase(),
      destination: bus.nextStopName ? `To ${bus.nextStopName}` : 'Coimbatore Terminal',
      coordinates: [bus.lastKnownLng, bus.lastKnownLat],
      heading: bus.heading || 0,
      speedKmH: bus.speedKmH || 0,
      status: bus.status || 'MOVING',
      currentStopName: bus.currentStopName,
      nextStopName: bus.nextStopName,
      etaNextStopSec: bus.etaNextStopSec,
    }));

  // ── Local bus: always at user's exact position ────────────────────
  const localBusEntry = userLocation
    ? {
        id: 'local-10c',
        routeNumber: '10C',
        destination: 'Gandhipuram',
        bDist: 0,
        status: 'At Stop',
      }
    : null;

  useEffect(() => {
    if (userLocation) {
      const { latitude, longitude } = userLocation.coords;
      const nearbyActiveBuses = NearbyBusDetector.getNearbyBuses(
        latitude,
        longitude,
        liveBusList,
        15 // 15km radius
      );

      const computedNearbyBuses = nearbyActiveBuses.slice(0, 5).map(bus => ({
        id: bus.id,
        routeNumber: bus.routeNumber,
        destination: bus.destination.replace('To ', ''),
        bDist: bus.distanceKm,
        status: bus.status || 'MOVING'
      }));

      const baseBuses = computedNearbyBuses.length > 0 ? computedNearbyBuses : DEFAULT_NEARBY_BUSES;
      // Prepend local bus so it always appears first at 0 m
      const localEntry = {
        id: 'local-10c',
        routeNumber: '10C',
        destination: 'Gandhipuram',
        bDist: 0,
        status: 'At Stop',
      };
      setNearbyBuses([localEntry, ...baseBuses]);
    }
  }, [userLocation, buses]);


  return (
    <View style={styles.container}>
      {/* Map Background */}
      <MapContainer
        cameraRef={cameraRef}
        style={StyleSheet.absoluteFill}
        initialCenter={CBE_CENTER}
        initialZoom={14}
        showControls={false}
        showUserLocation={true}
      >

        <StationMarkers stops={COIMBATORE_STOPS} />
        <LiveBusMarkers
          buses={liveBusList.length > 0 ? liveBusList : DEMO_LIVE_BUSES}
          onSelectBus={(bus) => setSelectedBusId(bus.id)}
        />
      </MapContainer>


      {/* Top Search Bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.8}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
        </TouchableOpacity>

        {/* Google-style account avatar button */}
        <TouchableOpacity
          style={styles.accountBtn}
          onPress={() => router.push('/(tabs)/profile' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.accountInitial}>A</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* FABs */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.sosFab}
          onPress={() => router.push('/bus/sos' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.locateFab}
          onPress={handleLocateMe}
          activeOpacity={0.85}
        >
          <Text style={styles.locateIcon}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet — Buses Near You */}
      <View style={styles.bottomSheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{t('home.busesNearYou')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.viewAll}>{t('home.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {/* Bus Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardList}
        >
          {nearbyBuses.map((bus) => (
            <TouchableOpacity
              key={bus.id}
              style={styles.stopCard}
              onPress={() => router.push(`/bus/${bus.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.stopAccentBar} />
              <View style={styles.stopCardInner}>
                <View style={styles.stopCardTop}>
                  <View>
                    <Text style={styles.stopName}>Route {bus.routeNumber}</Text>
                    <Text style={styles.stopId}>
                      {t('home.destination') || 'To'}: {bus.destination.replace('To ', '')}
                    </Text>
                  </View>
                  <View style={[styles.distanceBadge, bus.bDist === 0 && styles.distanceBadgeNow]}>
                    <Text style={[styles.distanceText, bus.bDist === 0 && styles.distanceTextNow]}>
                      {bus.bDist === 0 ? 'At Your Location' : bus.bDist < 1 ? `${(bus.bDist * 1000).toFixed(0)} m` : `${bus.bDist.toFixed(1)} km`}
                    </Text>
                  </View>
                </View>
                <View style={styles.stopBusRow}>
                  <View style={styles.busNumberBadge}>
                    <Text style={styles.busNumber}>{bus.routeNumber}</Text>
                  </View>
                  <Text style={styles.busDestination}>{bus.status}</Text>
                  <View style={styles.arrivalRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.arrivalTime}>
                      {Math.max(1, Math.floor(bus.bDist * 4))} {t('home.min')}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
    zIndex: 50,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.surfaceBright}E8`,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: Spacing.base,
    ...Shadows.md,
  },
  searchIcon: { fontSize: 18 },
  searchPlaceholder: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.surfaceBright}E8`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.sm,
  },
  notifIcon: { fontSize: 20 },

  // Google-style account avatar
  accountBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    ...Shadows.md,
  },
  accountInitial: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
  },

  // Quick Access
  quickAccessRow: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingLeft: Spacing.marginMobile,
  },
  quickScroll: { flexGrow: 0 },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.sm,
  },
  quickIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    ...Typography.labelSm,
    color: Colors.onSurface,
    fontSize: 10,
  },
  quickTitle: {
    ...Typography.headlineSm,
    fontSize: 16,
    color: Colors.onSurface,
  },
  quickArrow: { fontSize: 14, color: Colors.onSurface },

  // FABs
  fabContainer: {
    position: 'absolute',
    bottom: 230,
    right: Spacing.marginMobile,
    gap: Spacing.sm,
    zIndex: 40,
  },
  sosFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  sosText: {
    ...Typography.labelSm,
    color: Colors.onError,
    fontSize: 11,
  },
  locateFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.sm,
  },
  locateIcon: { fontSize: 22 },

  // Bus Markers
  busMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceContainerLowest,
  },
  busMarkerText: { fontSize: 18 },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingBottom: Platform.OS === 'ios' ? 84 : 68,
    ...Shadows.lg,
    zIndex: 40,
  },

  handle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceVariant,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.containerPadding,
    paddingVertical: Spacing.base,
  },
  sheetTitle: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
  },
  viewAll: {
    ...Typography.labelLg,
    color: Colors.onSurface,
  },
  cardList: {
    paddingHorizontal: Spacing.containerPadding,
    gap: Spacing.md,
    paddingBottom: Spacing.base,
  },

  // Stop Cards
  stopCard: {
    width: 256,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Shadows.sm,
  },
  stopAccentBar: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  stopCardInner: {
    flex: 1,
    padding: Spacing.md,
  },
  stopCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  stopName: {
    ...Typography.headlineSm,
    color: Colors.onSurface,
  },
  stopId: {
    ...Typography.bodySm,
    color: Colors.onSurface,
  },
  distanceBadge: {
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  distanceText: {
    ...Typography.labelSm,
    color: Colors.onSurface,
    fontSize: 11,
  },
  stopBusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceVariant,
    paddingTop: Spacing.sm,
  },
  busNumberBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  busNumber: {
    ...Typography.labelLg,
    color: Colors.onPrimary,
  },
  busDestination: {
    ...Typography.bodySm,
    color: Colors.onSurface,
    flex: 1,
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  arrivalTime: {
    ...Typography.labelLg,
    color: Colors.onSurface,
  },
  distanceBadgeNow: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  distanceTextNow: {
    color: '#15803d',
    fontWeight: '700',
  },
});
