import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { WeatherData, TrafficData, EtaInfo } from '@/hooks/useTransitInfo';
import { BusWithStatus } from '@/hooks/useLiveBuses';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_COLLAPSED = SCREEN_H * 0.28;
const SHEET_EXPANDED = SCREEN_H * 0.62;
const SNAP_THRESHOLD = 60;

// ─── Occupancy Config ────────────────────────────────────────────────────────
const OCCUPANCY_CONFIG = {
  EMPTY: { label: 'Empty — Seats Available', color: '#22c55e', bg: '#dcfce7', icon: '🟢' },
  FEW_SEATS: { label: 'Few Seats Left', color: '#16a34a', bg: '#dcfce7', icon: '🟡' },
  STANDING_ONLY: { label: 'Standing Only', color: '#d97706', bg: '#fef3c7', icon: '🟡' },
  FULL: { label: 'Crowded — Bus Full', color: '#dc2626', bg: '#fee2e2', icon: '🔴' },
};

// ─── Weather Icon URL ─────────────────────────────────────────────────────────
function owmIconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    return () => pulse.stopAnimation();
  }, []);
  return (
    <View style={styles.liveDotWrap}>
      <Animated.View style={[styles.liveDotRing, { transform: [{ scale: pulse }] }]} />
      <View style={styles.liveDotCore} />
    </View>
  );
}

interface OccupancyBadgeProps { occupancy?: string }
function OccupancyBadge({ occupancy }: OccupancyBadgeProps) {
  const cfg = OCCUPANCY_CONFIG[occupancy as keyof typeof OCCUPANCY_CONFIG] ?? OCCUPANCY_CONFIG.EMPTY;
  return (
    <View style={[styles.occupancyBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
      <Text style={styles.occupancyIcon}>{cfg.icon}</Text>
      <Text style={[styles.occupancyLabel, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

interface WeatherWidgetProps { weather: WeatherData }
function WeatherWidget({ weather }: WeatherWidgetProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>🌤</Text>
        <Text style={styles.cardTitle}>Weather Along Route</Text>
        {weather.isRaining && (
          <View style={styles.warningBadge}>
            <Text style={styles.warningText}>⚠ Rain Warning</Text>
          </View>
        )}
      </View>
      <View style={styles.weatherRow}>
        <Image
          source={{ uri: owmIconUrl(weather.icon) }}
          style={styles.weatherIcon}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.tempText}>{weather.tempC}°C</Text>
          <Text style={styles.weatherDesc}>{weather.description}</Text>
          <Text style={styles.weatherMeta}>💨 Wind: {weather.windKmH} km/h</Text>
        </View>
      </View>
    </View>
  );
}

interface TrafficCardProps { traffic: TrafficData }
function TrafficCard({ traffic }: TrafficCardProps) {
  const barWidth = `${Math.round(traffic.ratio * 100)}%`;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>🚦</Text>
        <Text style={styles.cardTitle}>Traffic Conditions</Text>
        <View style={[styles.trafficBadge, { backgroundColor: traffic.color + '22', borderColor: traffic.color }]}>
          <Text style={[styles.trafficBadgeText, { color: traffic.color }]}>{traffic.label}</Text>
        </View>
      </View>
      <View style={styles.trafficBarBg}>
        <View style={[styles.trafficBarFg, { width: barWidth as any, backgroundColor: traffic.color }]} />
      </View>
      <Text style={styles.trafficMeta}>
        {traffic.currentSpeed} km/h current · {traffic.freeFlowSpeed} km/h free flow
        {traffic.delayFactor > 1 ? `  ·  ${traffic.delayFactor.toFixed(1)}× delay` : ''}
      </Text>
    </View>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────
interface LiveTrackingSheetProps {
  bus: BusWithStatus | null;
  weather: WeatherData | null;
  traffic: TrafficData | null;
  eta: EtaInfo | null;
  infoLoading: boolean;
  is3D: boolean;
  onToggle3D: () => void;
  onGetRoute: () => void;
  onStop: () => void;
  // Local bus broadcaster props (optional, only used for local-10c)
  isLocalBus?: boolean;
  isBroadcasting?: boolean;
  onStartBroadcasting?: () => void;
  onStopBroadcasting?: () => void;
}

export function LiveTrackingSheet({
  bus,
  weather,
  traffic,
  eta,
  infoLoading,
  is3D,
  onToggle3D,
  onGetRoute,
  onStop,
  isLocalBus = false,
  isBroadcasting = false,
  onStartBroadcasting,
  onStopBroadcasting,
}: LiveTrackingSheetProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef(0);
  const isExpanded = useRef(false);

  const snapTo = (target: 'collapsed' | 'expanded') => {
    const toVal = target === 'expanded'
      ? -(SHEET_EXPANDED - SHEET_COLLAPSED)
      : 0;
    isExpanded.current = target === 'expanded';
    Animated.spring(translateY, {
      toValue: toVal,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
    currentOffset.current = toVal;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        translateY.setOffset(currentOffset.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const maxUp = -(SHEET_EXPANDED - SHEET_COLLAPSED);
        const newVal = Math.min(0, Math.max(maxUp, g.dy));
        translateY.setValue(newVal);
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy < -SNAP_THRESHOLD) {
          snapTo('expanded');
        } else if (g.dy > SNAP_THRESHOLD) {
          snapTo('collapsed');
        } else {
          snapTo(isExpanded.current ? 'expanded' : 'collapsed');
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY }], height: SHEET_EXPANDED }]}
    >
      {/* Drag handle */}
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>

      {/* ETA & Live status row */}
      <View style={styles.topRow}>
        <View style={styles.etaBlock}>
          <Text style={styles.etaLabel}>ETA to Next Stop</Text>
          <Text style={styles.etaValue}>
            {infoLoading ? '—' : (eta?.displayText ?? (bus?.etaNextStopSec ? `${Math.ceil(bus.etaNextStopSec / 60)} min` : '—'))}
          </Text>
          {eta && eta.delayFactor > 1.05 && (
            <Text style={styles.etaDelay}>
              +{Math.round((eta.delayFactor - 1) * 100)}% delay
            </Text>
          )}
        </View>

        <View style={styles.liveStatusBlock}>
          {bus && !bus.isStale ? (
            <>
              <LiveDot />
              <Text style={styles.liveLabel}>LIVE</Text>
            </>
          ) : (
            <Text style={styles.staleLabel}>
              Last seen {bus?.staleMinutes ?? '?'}m ago
            </Text>
          )}
        </View>
      </View>

      {/* Next stop + speed */}
      <View style={styles.stopRow}>
        <View style={styles.stopInfo}>
          <Text style={styles.stopMeta}>Next Stop</Text>
          <Text style={styles.stopName} numberOfLines={1}>
            {bus?.nextStopName ?? 'En Route'}
          </Text>
        </View>
        <View style={styles.speedPill}>
          <Text style={styles.speedText}>{Math.round(bus?.speedKmH ?? 0)}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>
      </View>

      {/* Occupancy */}
      <OccupancyBadge occupancy={bus?.occupancy} />

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, is3D && styles.actionBtnActive]}
          onPress={onToggle3D}
        >
          <Text style={[styles.actionBtnLabel, is3D && styles.actionBtnLabelActive]}>
            {is3D ? '🗺 2D View' : '🧭 3D Follow'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onGetRoute}>
          <Text style={styles.actionBtnLabel}>📍 Get Route</Text>
        </TouchableOpacity>
      </View>

      {/* ── Broadcaster Section (only for local-10c bus) ── */}
      {isLocalBus && (
        isBroadcasting ? (
          <View style={styles.broadcasterBanner}>
            <View style={styles.broadcasterBannerTop}>
              <View style={styles.broadcasterDotWrap}>
                <View style={styles.broadcasterDotRing} />
                <View style={styles.broadcasterDotCore} />
              </View>
              <Text style={styles.broadcasterBannerText}>
                Live Location Active — Sharing live bus position with nearby commuters
              </Text>
            </View>
            <TouchableOpacity
              style={styles.leaveBusBtn}
              onPress={onStopBroadcasting}
              activeOpacity={0.85}
            >
              <Text style={styles.leaveBusBtnText}>LEAVE BUS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.boardBusBtn}
            onPress={onStartBroadcasting}
            activeOpacity={0.85}
          >
            <Text style={styles.boardBusBtnText}>🚌  I AM ON THIS BUS</Text>
          </TouchableOpacity>
        )
      )}

      {/* Weather card */}
      {weather ? <WeatherWidget weather={weather} /> : (
        <View style={[styles.card, styles.cardPlaceholder]}>
          <Text style={styles.placeholderText}>
            {infoLoading ? '🌤  Fetching weather…' : '🌤  Weather unavailable'}
          </Text>
        </View>
      )}

      {/* Traffic card */}
      {traffic ? <TrafficCard traffic={traffic} /> : (
        <View style={[styles.card, styles.cardPlaceholder]}>
          <Text style={styles.placeholderText}>
            {infoLoading ? '🚦  Fetching traffic…' : '🚦  Traffic unavailable'}
          </Text>
        </View>
      )}

      {/* Stop reporting button */}
      <TouchableOpacity style={styles.stopBtn} onPress={onStop} activeOpacity={0.85}>
        <Text style={styles.stopBtnText}>STOP TRACKING</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: -(SHEET_EXPANDED - SHEET_COLLAPSED),
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
    gap: 12,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 2,
  },

  // ETA
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  etaBlock: { gap: 2 },
  etaLabel: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '500', letterSpacing: 0.5 },
  etaValue: { fontSize: 34, fontWeight: '800', color: Colors.primary, letterSpacing: -1 },
  etaDelay: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },

  liveStatusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveLabel: { fontSize: 11, fontWeight: '800', color: Colors.error, letterSpacing: 1.5 },
  staleLabel: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '500' },

  // Live dot pulse
  liveDotWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  liveDotRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.error + '40',
  },
  liveDotCore: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.error },

  // Stop row
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  stopInfo: { flex: 1 },
  stopMeta: { fontSize: 10, color: Colors.onSurfaceVariant, fontWeight: '600', letterSpacing: 0.5 },
  stopName: { fontSize: 15, fontWeight: '700', color: Colors.onSurface, marginTop: 2 },
  speedPill: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  speedText: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  speedUnit: { fontSize: 9, color: '#ffffff99', fontWeight: '600' },

  // Occupancy
  occupancyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  occupancyIcon: { fontSize: 16 },
  occupancyLabel: { fontSize: 13, fontWeight: '700' },

  // Action row
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnActive: { backgroundColor: Colors.primary },
  actionBtnLabel: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
  actionBtnLabelActive: { color: '#ffffff' },

  // Cards
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: 12,
    gap: 8,
  },
  cardPlaceholder: { alignItems: 'center', paddingVertical: 16 },
  placeholderText: { color: Colors.onSurfaceVariant, fontSize: 13 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: Colors.onSurface, flex: 1, letterSpacing: 0.3 },
  warningBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warningText: { fontSize: 10, fontWeight: '700', color: '#92400e' },

  // Weather
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherIcon: { width: 52, height: 52 },
  tempText: { fontSize: 24, fontWeight: '800', color: Colors.onSurface },
  weatherDesc: { fontSize: 12, color: Colors.onSurfaceVariant, textTransform: 'capitalize' },
  weatherMeta: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },

  // Traffic
  trafficBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trafficBadgeText: { fontSize: 10, fontWeight: '700' },
  trafficBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trafficBarFg: { height: '100%', borderRadius: 3 },
  trafficMeta: { fontSize: 11, color: Colors.onSurfaceVariant },

  // Stop button
  stopBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  stopBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },

  // ── Local Bus Broadcaster UI ──────────────────────────────────────────────
  boardBusBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: BorderRadius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  boardBusBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  broadcasterBanner: {
    backgroundColor: '#022c22',
    borderRadius: BorderRadius.md,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#065f46',
  },
  broadcasterBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  broadcasterDotWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcasterDotRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ade8050',
    borderWidth: 1.5,
    borderColor: '#4ade80',
  },
  broadcasterDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  broadcasterBannerText: {
    color: '#d1fae5',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  leaveBusBtn: {
    backgroundColor: '#dc2626',
    borderRadius: BorderRadius.full,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveBusBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});

