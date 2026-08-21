import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapContainer, StationMarkers, LiveBusMarkers, MapRouteLayer, COIMBATORE_STOPS, DEMO_ROUTE_LINE_GEOJSON, TransitStop, LiveBus } from '@/components/map';
import { Colors, Spacing, Shadows, BorderRadius } from '@/constants/theme';
import { useLiveBuses } from '@/hooks/useLiveBuses';

export default function MapScreen() {
  const { buses: liveBusesMap } = useLiveBuses();
  const [selectedStop, setSelectedStop] = useState<TransitStop | null>(null);
  const [selectedBus, setSelectedBus] = useState<LiveBus | null>(null);
  const [showRouteLine, setShowRouteLine] = useState(true);

  // Convert live buses map to LiveBus[]
  const busList: LiveBus[] = Array.from(liveBusesMap.values()).map((bus) => ({
    id: bus.busId,
    routeNumber: bus.routeId.replace('route-', '').replace('RTE_', '').toUpperCase(),
    destination: bus.nextStopName ? `To ${bus.nextStopName}` : 'Coimbatore Terminal',
    coordinates: [bus.lastKnownLng, bus.lastKnownLat],
    heading: bus.heading || 0,
    speedKmH: bus.speedKmH || 0,
    status: bus.status || 'MOVING',
    currentStopName: bus.currentStopName,
    nextStopName: bus.nextStopName,
    etaNextStopSec: bus.etaNextStopSec,
    occupancy: bus.occupancy,
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Coimbatore Live Map</Text>
          <Text style={styles.headerSubtitle}>Real-Time Bus Tracking ({busList.length} Active)</Text>
        </View>
        <TouchableOpacity
          style={[styles.routeToggle, showRouteLine && styles.routeToggleActive]}
          onPress={() => setShowRouteLine(!showRouteLine)}
        >
          <Text style={[styles.routeToggleText, showRouteLine && styles.routeToggleTextActive]}>
            {showRouteLine ? '📍 Route 11A On' : '📍 Route Line Off'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrapper}>
        <MapContainer
          showControls={true}
          showUserLocation={true}
        >
          {showRouteLine && (
            <MapRouteLayer
              id="route-11a"
              routeGeoJSON={DEMO_ROUTE_LINE_GEOJSON}
              color={Colors.secondary}
              lineWidth={6}
            />
          )}

          <StationMarkers
            stops={COIMBATORE_STOPS}
            onSelectStop={(stop) => {
              setSelectedStop(stop);
              setSelectedBus(null);
            }}
          />

          <LiveBusMarkers
            buses={busList}
            onSelectBus={(bus) => {
              setSelectedBus(bus);
              setSelectedStop(null);
            }}
          />
        </MapContainer>
      </View>


      {(selectedStop || selectedBus) && (
        <View style={styles.bottomCard}>
          {selectedStop && (
            <View>
              <Text style={styles.cardBadge}>🚏 TRANSIT STOP</Text>
              <Text style={styles.cardTitle}>{selectedStop.name}</Text>
              {selectedStop.nameTa && <Text style={styles.cardSub}>{selectedStop.nameTa}</Text>}
              <Text style={styles.cardDetail}>Coordinates: {selectedStop.coordinates.join(', ')}</Text>
            </View>
          )}

          {selectedBus && (
            <View>
              <Text style={styles.cardBadge}>🚌 LIVE BUS IN MOTION</Text>
              <Text style={styles.cardTitle}>Route {selectedBus.routeNumber} → {selectedBus.destination}</Text>
              <Text style={styles.cardSub}>Current Speed: {selectedBus.speedKmH} km/h • Heading {selectedBus.heading}°</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
    fontFamily: 'GeneralSans-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontFamily: 'GeneralSans-Regular',
  },
  routeToggle: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  routeToggleActive: {
    backgroundColor: '#000000',
  },
  routeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
    fontFamily: 'GeneralSans-Semibold',
  },
  routeToggleTextActive: {
    color: '#ffffff',
  },
  mapWrapper: {
    flex: 1,
  },
  bottomCard: {
    position: 'absolute',
    // 80 = approx tab bar height, keeps card above tabs
    bottom: 80 + Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.lg,
  },
  cardBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: 'GeneralSans-Semibold',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.onSurface,
    fontFamily: 'GeneralSans-Bold',
  },
  cardSub: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontFamily: 'GeneralSans-Regular',
    marginTop: 2,
  },
  cardDetail: {
    fontSize: 11,
    color: Colors.outline,
    fontFamily: 'GeneralSans-Regular',
    marginTop: 6,
  },

});
