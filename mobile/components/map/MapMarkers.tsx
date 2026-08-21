import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Colors, Shadows, BorderRadius } from '@/constants/theme';
import { TransitStop, LiveBus } from './MapConfig';

// ─── Occupancy Helpers ────────────────────────────────────────────────────────

/**
 * Returns a badge background colour based on occupancy level.
 * EMPTY → green, FEW_SEATS → amber, STANDING_ONLY → orange, FULL → red.
 */
function occupancyColor(occupancy?: string): string {
  switch (occupancy) {
    case 'EMPTY':        return '#16a34a'; // green
    case 'FEW_SEATS':   return '#d97706'; // amber
    case 'STANDING_ONLY': return '#ea580c'; // orange
    case 'FULL':         return '#dc2626'; // red
    default:             return Colors.secondary;
  }
}

function occupancyLabel(occupancy?: string): string {
  switch (occupancy) {
    case 'EMPTY':         return '🟢 Empty';
    case 'FEW_SEATS':    return '🟡 Few seats';
    case 'STANDING_ONLY': return '🟠 Standing only';
    case 'FULL':          return '🔴 Full';
    default:              return '';
  }
}

/**
 * Applies a tiny pixel-level offset to buses sharing the same coordinate
 * so they fan out visually instead of stacking directly on top of each other.
 * offset_deg ≈ 0.00015° ≈ ~17 metres per slot.
 */
function spreadCoordinates(buses: LiveBus[]): Map<string, [number, number]> {
  const OFFSET = 0.00015;
  const coordCount = new Map<string, number>();
  const result = new Map<string, [number, number]>();

  buses.forEach((bus) => {
    const key = `${bus.coordinates[0].toFixed(4)},${bus.coordinates[1].toFixed(4)}`;
    const slot = coordCount.get(key) ?? 0;
    coordCount.set(key, slot + 1);

    // Spread in a small circle: slot 0 = no offset, slot 1 = right, 2 = up, etc.
    const angle = (slot * Math.PI * 2) / 6; // up to 6 buses before overlap repeats
    const lngOffset = slot === 0 ? 0 : OFFSET * Math.cos(angle);
    const latOffset = slot === 0 ? 0 : OFFSET * Math.sin(angle);

    result.set(bus.id, [
      bus.coordinates[0] + lngOffset,
      bus.coordinates[1] + latOffset,
    ]);
  });

  return result;
}

// ─── Station Markers ─────────────────────────────────────────────────────────

interface StationMarkersProps {
  stops: TransitStop[];
  onSelectStop?: (stop: TransitStop) => void;
}

export const StationMarkers: React.FC<StationMarkersProps> = ({ stops, onSelectStop }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      {stops.map((stop) => {
        const isSelected = selectedId === stop.id;
        const iconSymbol =
          stop.type === 'railway_station'
            ? '🚂'
            : stop.type === 'airport'
            ? '✈️'
            : '🚏';

        return (
          <MapLibreGL.PointAnnotation
            key={stop.id}
            id={stop.id}
            coordinate={stop.coordinates}
            onSelected={() => {
              setSelectedId(stop.id);
              if (onSelectStop) onSelectStop(stop);
            }}
            onDeselected={() => setSelectedId(null)}
          >
            <View style={styles.markerWrapper}>
              {isSelected && (
                <View style={styles.calloutCard}>
                  <Text style={styles.calloutTitle}>{stop.name}</Text>
                  {stop.nameTa && <Text style={styles.calloutSub}>{stop.nameTa}</Text>}
                </View>
              )}
              <View style={[styles.stationBadge, isSelected && styles.stationBadgeSelected]}>
                <Text style={styles.stationBadgeIcon}>{iconSymbol}</Text>
              </View>
            </View>
          </MapLibreGL.PointAnnotation>
        );
      })}
    </>
  );
};

// ─── Live Bus Markers ────────────────────────────────────────────────────────

interface LiveBusMarkersProps {
  buses: LiveBus[];
  onSelectBus?: (bus: LiveBus) => void;
}

export const LiveBusMarkers: React.FC<LiveBusMarkersProps> = ({ buses, onSelectBus }) => {
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // Compute spread coordinates once for the current buses array
  const spreadMap = spreadCoordinates(buses);

  return (
    <>
      {buses.map((bus) => {
        const isSelected = selectedBusId === bus.id;
        const isStopped = bus.status === 'STOPPED';
        const badgeColor = occupancyColor(bus.occupancy) ?? bus.color ?? Colors.secondary;
        const spreadCoord = spreadMap.get(bus.id) ?? bus.coordinates;

        return (
          <MapLibreGL.PointAnnotation
            key={bus.id}
            id={bus.id}
            coordinate={spreadCoord}
            onSelected={() => {
              setSelectedBusId(bus.id);
              if (onSelectBus) onSelectBus(bus);
            }}
            onDeselected={() => setSelectedBusId(null)}
          >
            <View style={styles.markerWrapper}>
              {isSelected && (
                <View style={styles.busCallout}>
                  <Text style={styles.busCalloutRoute}>
                    Bus {bus.routeNumber} → {bus.destination}
                  </Text>
                  {bus.occupancy ? (
                    <Text style={styles.busCalloutOccupancy}>
                      {occupancyLabel(bus.occupancy)}
                    </Text>
                  ) : null}
                  {isStopped ? (
                    <Text style={styles.busCalloutStopped}>
                      🛑 STOPPED at {bus.currentStopName || 'Bus Stop'}
                    </Text>
                  ) : (
                    <Text style={styles.busCalloutSpeed}>
                      ⚡ {bus.speedKmH} km/h • Heading {Math.round(bus.heading)}°
                    </Text>
                  )}
                  {bus.nextStopName && (
                    <Text style={styles.busCalloutEta}>
                      ⏱️ Next: {bus.nextStopName} ({Math.ceil((bus.etaNextStopSec || 60) / 60)} min)
                    </Text>
                  )}
                </View>
              )}
              <View style={[styles.busBadge, { backgroundColor: isStopped ? '#dc2626' : badgeColor }]}>
                <Text style={styles.busBadgeText}>🚌 {bus.routeNumber}</Text>
              </View>
            </View>
          </MapLibreGL.PointAnnotation>
        );
      })}
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: '#ffffff',
    ...Shadows.sm,
  },
  stationBadgeSelected: {
    backgroundColor: Colors.secondary,
    transform: [{ scale: 1.15 }],
  },
  stationBadgeIcon: {
    fontSize: 14,
  },
  calloutCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.md,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
    fontFamily: 'GeneralSans-Bold',
  },
  calloutSub: {
    fontSize: 11,
    color: Colors.secondary,
    fontFamily: 'GeneralSans-Regular',
  },
  busBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: '#ffffff',
    ...Shadows.md,
  },
  busBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Bold',
  },
  busCallout: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginBottom: 6,
    minWidth: 160,
    ...Shadows.lg,
  },
  busCalloutRoute: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Bold',
  },
  busCalloutOccupancy: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  busCalloutSpeed: {
    color: '#ff8a65',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  busCalloutStopped: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  busCalloutEta: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
