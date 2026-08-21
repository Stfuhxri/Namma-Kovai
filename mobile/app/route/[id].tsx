import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLiveBuses } from '@/hooks/useLiveBuses';
import { useFavorites } from '@/hooks/useFavorites';
import { startReporting } from '@/services/locationReporter';
import { straightLineETA, formatETA } from '@/services/etaCalculator';
import { SIMULATION_ROUTES, SimulationRoute } from '@/services/busRoutesData';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { MapContainer, MapRouteLayer, StationMarkers, LiveBusMarkers, COIMBATORE_STOPS, DEMO_LIVE_BUSES, LiveBus, createLineGeoJSON } from '@/components/map';

// Fare calculation: standard TN bus fare
const BASE_FARE = 5;
const PER_KM_RATE = 1.5;
const MIN_FARE = 10;

// Calculate distance in km using haversine formula
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateRouteDistance(waypoints: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversineKm(waypoints[i - 1][1], waypoints[i - 1][0], waypoints[i][1], waypoints[i][0]);
  }
  return total;
}

// Simulated crowd levels
const CROWD_LEVELS = ['Low', 'Medium', 'High'] as const;
type CrowdLevel = typeof CROWD_LEVELS[number];

function getCrowdLevel(routeId: string): CrowdLevel {
  // Deterministic based on route ID for consistent demo
  const hash = routeId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return CROWD_LEVELS[hash % 3];
}

function getCrowdColor(level: CrowdLevel): string {
  switch (level) {
    case 'Low': return '#059669';
    case 'Medium': return '#d97706';
    case 'High': return '#dc2626';
  }
}

function getCrowdEmoji(level: CrowdLevel): string {
  switch (level) {
    case 'Low': return '🟢';
    case 'Medium': return '🟡';
    case 'High': return '🔴';
  }
}

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { buses } = useLiveBuses();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();

  // Find route from local simulation data
  const route = useMemo(() => {
    if (!id) return null;
    return SIMULATION_ROUTES.find((r) => r.id === id) || null;
  }, [id]);

  const routeDistance = useMemo(() => {
    if (!route) return 0;
    return calculateRouteDistance(route.waypoints);
  }, [route]);

  const estimatedFare = useMemo(() => {
    const fare = BASE_FARE + routeDistance * PER_KM_RATE;
    return Math.max(MIN_FARE, Math.round(fare));
  }, [routeDistance]);

  const crowdLevel = useMemo(() => {
    return route ? getCrowdLevel(route.id) : 'Low';
  }, [route]);

  const routeGeoJSON = useMemo(() => {
    if (!route) return null;
    return createLineGeoJSON(route.waypoints, {
      routeId: route.id,
      routeName: route.name,
      color: route.color,
    });
  }, [route]);

  const handleStartJourney = async () => {
    if (!route) return;
    const busOnRoute = Array.from(buses.values()).find(
      (b) => b.routeId === route.id && !b.isStale
    );
    if (busOnRoute) {
      try {
        await startReporting(busOnRoute.busId);
        router.push(`/bus/${busOnRoute.busId}` as any);
      } catch {
        router.push(`/bus/${busOnRoute.busId}` as any);
      }
    } else {
      Alert.alert(
        'No Live Bus',
        'No live bus found on this route right now. Your location will be reported when a bus is detected.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleFavorite = async () => {
    if (!route) return;
    if (isFavorite(route.id)) {
      await removeFavorite(route.id);
    } else {
      await addFavorite(route.id);
    }
  };

  if (!route) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 48 }}>🚌</Text>
          <Text style={styles.errorText}>Route not found</Text>
          <Text style={styles.errorSub}>This route ID doesn't exist in our network.</Text>
          <TouchableOpacity style={styles.backLinkBtn} onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Find live bus on this route
  const liveBus = Array.from(buses.values()).find(
    (b) => b.routeId === route.id
  );

  // Demo bus for map display
  const demoBusForRoute: LiveBus = {
    id: `demo-${route.id}`,
    routeNumber: route.routeNumber,
    destination: route.stops[route.stops.length - 1].name,
    coordinates: route.waypoints[Math.floor(route.waypoints.length / 2)],
    heading: 90,
    speedKmH: 25,
    color: route.color,
  };

  // Map stops for StationMarkers
  const routeStopsForMap = route.stops.map((s) => ({
    id: s.id,
    name: s.name,
    nameTa: s.nameTa,
    coordinates: s.coordinates,
    type: 'bus_stop' as const,
  }));

  const estimatedTime = Math.ceil((routeDistance / 20) * 60); // 20 km/h average

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.routeBadge, { backgroundColor: route.color }]}>
            <Text style={styles.routeNumber}>{route.routeNumber}</Text>
          </View>
          <Text style={styles.routeName} numberOfLines={1}>{route.name}</Text>
        </View>
        <TouchableOpacity style={styles.favoriteBtn} onPress={toggleFavorite} activeOpacity={0.7}>
          <Text style={{ fontSize: 22 }}>
            {isFavorite(route.id) ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Interactive Preview Map */}
        <View style={styles.mapCard}>
          <MapContainer
            style={styles.mapCanvas}
            initialCenter={route.waypoints[Math.floor(route.waypoints.length / 2)]}
            initialZoom={12.5}
            showControls={false}
            showUserLocation={false}
          >
            {routeGeoJSON && (
              <MapRouteLayer routeGeoJSON={routeGeoJSON} color={route.color} lineWidth={5} />
            )}
            <StationMarkers stops={routeStopsForMap} />
            <LiveBusMarkers buses={[demoBusForRoute]} />
          </MapContainer>
          <View style={styles.mapCardBadge}>
            <Text style={styles.mapCardBadgeText}>🗺️ Route {route.routeNumber} Map</Text>
          </View>
        </View>

        {/* Route Summary Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>📏</Text>
            <Text style={styles.infoValue}>{routeDistance.toFixed(1)} km</Text>
            <Text style={styles.infoLabel}>DISTANCE</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>⏱️</Text>
            <Text style={styles.infoValue}>{estimatedTime} min</Text>
            <Text style={styles.infoLabel}>EST. TIME</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💰</Text>
            <Text style={styles.infoValue}>₹{estimatedFare}</Text>
            <Text style={styles.infoLabel}>FARE</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>{getCrowdEmoji(crowdLevel)}</Text>
            <Text style={[styles.infoValue, { color: getCrowdColor(crowdLevel) }]}>{crowdLevel}</Text>
            <Text style={styles.infoLabel}>CROWD</Text>
          </View>
        </View>

        {/* Route Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕐</Text>
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Operating Hours</Text>
              <Text style={styles.detailValue}>5:30 AM – 10:30 PM</Text>
            </View>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🔄</Text>
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Frequency</Text>
              <Text style={styles.detailValue}>Every 15–20 minutes</Text>
            </View>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🚏</Text>
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Total Stops</Text>
              <Text style={styles.detailValue}>{route.stops.length} stops</Text>
            </View>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>💵</Text>
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Fare Breakdown</Text>
              <Text style={styles.detailValue}>₹{BASE_FARE} base + ₹{PER_KM_RATE}/km × {routeDistance.toFixed(1)} km = ₹{estimatedFare}</Text>
            </View>
          </View>
        </View>

        {/* Crowd Level Bar */}
        <View style={styles.crowdCard}>
          <View style={styles.crowdHeader}>
            <Text style={styles.crowdTitle}>👥 CROWD LEVEL</Text>
            <View style={[styles.crowdBadge, { backgroundColor: getCrowdColor(crowdLevel) }]}>
              <Text style={styles.crowdBadgeText}>{crowdLevel.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.crowdBarBg}>
            <View
              style={[
                styles.crowdBarFill,
                {
                  backgroundColor: getCrowdColor(crowdLevel),
                  width: crowdLevel === 'Low' ? '30%' : crowdLevel === 'Medium' ? '60%' : '90%',
                },
              ]}
            />
          </View>
          <Text style={styles.crowdHint}>
            {crowdLevel === 'Low'
              ? 'Plenty of seats available. Good time to travel!'
              : crowdLevel === 'Medium'
              ? 'Some standing passengers expected. Moderate crowd.'
              : 'Bus is very crowded. Consider the next one if possible.'}
          </Text>
        </View>

        {/* Live Bus Status */}
        {liveBus && (
          <View style={styles.liveBusCard}>
            <View style={styles.liveDotRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                {liveBus.isStale
                  ? `Last seen ${liveBus.staleMinutes} min ago`
                  : 'LIVE — Bus is on route'}
              </Text>
            </View>
            <Text style={styles.contributorsText}>
              {liveBus.contributingUsers} passengers reporting
            </Text>
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => router.push(`/bus/${liveBus.busId}` as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.trackBtnText}>Track Live →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stop Timeline */}
        <Text style={styles.sectionTitle}>{t('route.stops')}</Text>
        <View style={styles.timeline}>
          {route.stops.map((stop, index) => {
            const isFirst = index === 0;
            const isLast = index === route.stops.length - 1;
            const distFromStart =
              index === 0
                ? 0
                : haversineKm(
                    route.stops[0].coordinates[1],
                    route.stops[0].coordinates[0],
                    stop.coordinates[1],
                    stop.coordinates[0]
                  );
            const eta = liveBus
              ? formatETA(
                  straightLineETA(
                    { lat: liveBus.lastKnownLat, lng: liveBus.lastKnownLng },
                    { lat: stop.coordinates[1], lng: stop.coordinates[0] }
                  )
                )
              : null;

            return (
              <View key={stop.id} style={styles.stopRow}>
                {/* Timeline dot and line */}
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      isFirst && [styles.timelineDotFirst, { backgroundColor: route.color, borderColor: route.color }],
                      isLast && [styles.timelineDotLast, { backgroundColor: route.color, borderColor: route.color }],
                    ]}
                  />
                  {!isLast && <View style={[styles.timelineLine, isFirst && { backgroundColor: route.color + '40' }]} />}
                </View>

                {/* Stop info */}
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  {stop.nameTa && <Text style={styles.stopNameTa}>{stop.nameTa}</Text>}
                  <Text style={styles.stopMeta}>
                    {distFromStart > 0 ? `${distFromStart.toFixed(1)} km from start` : 'Starting point'}
                  </Text>
                </View>

                {/* ETA */}
                <View style={styles.stopRightCol}>
                  {eta && (
                    <View style={styles.etaBadge}>
                      <Text style={styles.etaText}>{eta}</Text>
                    </View>
                  )}
                  {isFirst && (
                    <View style={[styles.terminalBadge, { backgroundColor: route.color }]}>
                      <Text style={styles.terminalText}>START</Text>
                    </View>
                  )}
                  {isLast && (
                    <View style={[styles.terminalBadge, { backgroundColor: route.color }]}>
                      <Text style={styles.terminalText}>END</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Start Journey CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: route.color }]}
          onPress={handleStartJourney}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{t('route.onThisBus').toUpperCase()}</Text>
          <Text style={styles.ctaArrow}>🚌</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  errorText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: Spacing.sm,
  },
  errorSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  backLinkBtn: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  backLink: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  routeBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  routeNumber: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  routeName: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
    flex: 1,
  },
  favoriteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: 100,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },

  // Map preview card
  mapCard: {
    height: 180,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.sm,
  },
  mapCanvas: { flex: 1 },
  mapCardBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  mapCardBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'GeneralSans-Semibold',
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    gap: 2,
    ...Shadows.sm,
  },
  infoIcon: { fontSize: 18 },
  infoValue: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 16,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  infoLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },

  // Details Card
  detailsCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  detailIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  detailTextGroup: { flex: 1 },
  detailLabel: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  detailValue: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 4,
  },

  // Crowd Card
  crowdCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  crowdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crowdTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  crowdBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  crowdBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Semibold',
    letterSpacing: 0.5,
  },
  crowdBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  crowdBarFill: {
    height: 8,
    borderRadius: 4,
  },
  crowdHint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },

  // Live bus card
  liveBusCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: Spacing.base,
    ...Shadows.sm,
  },
  liveDotRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error },
  liveText: { ...Typography.labelLg, color: Colors.onSurface },
  contributorsText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  trackBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  trackBtnText: { ...Typography.labelLg, color: Colors.onPrimary },

  sectionTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: Spacing.sm,
  },

  // Timeline
  timeline: { gap: 0 },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  timelineLeft: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  timelineDotFirst: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  timelineDotLast: { borderColor: Colors.secondary, backgroundColor: Colors.secondary },
  timelineLine: { width: 2, flex: 1, minHeight: 32, backgroundColor: Colors.outlineVariant, marginTop: 2 },
  stopInfo: { flex: 1 },
  stopName: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  stopNameTa: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 1,
  },
  stopMeta: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  stopRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  etaBadge: {
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: 2,
  },
  etaText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  terminalBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  terminalText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Semibold',
    letterSpacing: 0.5,
  },

  // CTA
  cta: {
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: 32,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  ctaButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  ctaText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  ctaArrow: { fontSize: 22 },
});
