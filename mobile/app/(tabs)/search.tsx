import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { MapContainer, MapRouteLayer, StationMarkers, COIMBATORE_STOPS, DEMO_ROUTE_LINE_GEOJSON } from '@/components/map';
import { AIAssistantSheet } from '@/components/AIAssistantSheet';
import { RouteCard } from '@/components/RouteCard';
import { SIMULATION_ROUTES } from '@/services/busRoutesData';
import { getAIRoute, AIResponse } from '@/services/aiRouting';
import { ActivityIndicator } from 'react-native';

type Tab = 'all' | 'buses' | 'routes' | 'stops';

const POPULAR_DESTINATIONS = [
  { icon: '🚆', label: 'Railway Station', query: 'Coimbatore Junction' },
  { icon: '✈️', label: 'Airport', query: 'International Airport' },
  { icon: '🎓', label: 'PSG Tech', query: 'PSG Tech Peelamedu' },
  { icon: '🛍️', label: 'Brookefields', query: 'Brookefields Mall' },
  { icon: '🏢', label: 'Saravanampatti', query: 'Saravanampatti' },
  { icon: '🏥', label: 'KMCH Hospital', query: 'KMCH Hospital' },
  { icon: '💻', label: 'TIDEL Park', query: 'TIDEL Park' },
  { icon: '🌴', label: 'Marudhamalai', query: 'Marudhamalai' },
];

const INITIAL_RECENTS = [
  { id: 'rec-1', icon: '🚏', title: 'Gandhipuram Central', subtitle: 'BUS TERMINAL', query: 'Gandhipuram' },
  { id: 'rec-2', icon: '🚌', title: 'Route 11A', subtitle: 'SINGANALLUR EXPRESS', routeId: 'route-11a' },
  { id: 'rec-3', icon: '📍', title: 'PSG Tech Peelamedu', subtitle: 'BUS STOP', query: 'PSG Tech' },
];

export default function SearchScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [recents, setRecents] = useState(INITIAL_RECENTS);
  const [isAiSheetVisible, setIsAiSheetVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [dynamicAiRoute, setDynamicAiRoute] = useState<AIResponse | null>(null);
  const inputRef = useRef<TextInput>(null);

  const filterTabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '✨' },
    { key: 'buses', label: 'Buses', icon: '🚌' },
    { key: 'routes', label: 'Routes', icon: '🗺️' },
    { key: 'stops', label: 'Stops', icon: '🚏' },
  ];

  // Search Results filtering
  const matchingRoutes = SIMULATION_ROUTES.filter(
    (r) =>
      r.routeNumber.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase())
  );

  const matchingStops = COIMBATORE_STOPS.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.nameTa && s.nameTa.includes(query))
  );

  const handleClearRecents = () => {
    setRecents([]);
  };

  const handleRemoveRecent = (id: string) => {
    setRecents((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSelectPopular = (popularQuery: string) => {
    setQuery(popularQuery);
    handleDynamicAiSearch(popularQuery);
  };

  const handleDynamicAiSearch = async (searchQuery: string = query) => {
    if (searchQuery.trim().length < 3) return;
    setAiLoading(true);
    setDynamicAiRoute(null);
    const result = await getAIRoute(searchQuery);
    setDynamicAiRoute(result);
    setAiLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Find Transit</Text>
          <Text style={styles.headerSubtitle}>Coimbatore Bus & Stop Network</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => setQuery('')}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16 }}>⚡</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search bus number, stop, or destination..."
            placeholderTextColor={Colors.outline}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (dynamicAiRoute) setDynamicAiRoute(null); // Clear previous result on typing
            }}
            onSubmitEditing={() => handleDynamicAiSearch()}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity style={styles.clearBtn} onPress={() => { setQuery(''); setDynamicAiRoute(null); }} activeOpacity={0.7}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.askAiBtn} onPress={() => setIsAiSheetVisible(true)} activeOpacity={0.7}>
              <Text style={styles.askAiIcon}>✨</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.tabScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {filterTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Search Results view when user types */}
        {query.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>
              SEARCH RESULTS ({matchingRoutes.length + matchingStops.length + (dynamicAiRoute ? 1 : 0)})
            </Text>

            {/* Dynamic AI Route Result for searched location */}
            {(activeTab === 'all' || activeTab === 'routes') && aiLoading && (
              <View style={styles.aiInlineLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.aiInlineLoadingText}>Generating fastest route...</Text>
              </View>
            )}

            {(activeTab === 'all' || activeTab === 'routes') && dynamicAiRoute && (
              <View style={styles.aiResultBlock}>
                {/* AI Conversational Message */}
                <View style={styles.aiInlineBubble}>
                  <Text style={styles.aiInlineBubbleEmoji}>✨</Text>
                  <Text style={styles.aiInlineBubbleText}>{dynamicAiRoute.aiMessage}</Text>
                </View>

                {/* Weather & Traffic Chips */}
                <View style={styles.aiInlineChipsRow}>
                  <View style={styles.aiInlineChip}>
                    <Text style={styles.aiInlineChipIcon}>
                      {dynamicAiRoute.routeData.weather.includes('Rain') || dynamicAiRoute.routeData.weather.includes('Thunder') ? '🌧️' : dynamicAiRoute.routeData.weather.includes('Cloudy') ? '☁️' : '☀️'}
                    </Text>
                    <Text style={styles.aiInlineChipLabel}>{dynamicAiRoute.routeData.weather}</Text>
                  </View>
                  <View style={styles.aiInlineChip}>
                    <Text style={styles.aiInlineChipIcon}>
                      {dynamicAiRoute.routeData.traffic.includes('Heavy') ? '🔴' : dynamicAiRoute.routeData.traffic.includes('Moderate') ? '🟡' : '🟢'}
                    </Text>
                    <Text style={styles.aiInlineChipLabel}>{dynamicAiRoute.routeData.traffic}</Text>
                  </View>
                </View>

                <RouteCard 
                  route={dynamicAiRoute.routeData}
                  isRecommended={true}
                  onPressDetails={() => setIsAiSheetVisible(true)}
                />
              </View>
            )}

            {/* Matching Routes */}
            {(activeTab === 'all' || activeTab === 'buses' || activeTab === 'routes') && matchingRoutes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={styles.resultCard}
                onPress={() => router.push(`/route/${route.id}` as any)}
                activeOpacity={0.85}
              >
                <View style={[styles.routeBadgeSquare, { backgroundColor: route.color }]}>
                  <Text style={styles.routeBadgeText}>{route.routeNumber}</Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{route.name}</Text>
                  <Text style={styles.resultSub}>{route.stops.length} STOPS • LIVE CORRIDOR</Text>
                </View>
                <Text style={styles.resultArrow}>→</Text>
              </TouchableOpacity>
            ))}

            {/* Matching Stops */}
            {(activeTab === 'all' || activeTab === 'stops') && matchingStops.map((stop) => (
              <TouchableOpacity
                key={stop.id}
                style={styles.resultCard}
                onPress={() => router.push('/(tabs)/map')}
                activeOpacity={0.85}
              >
                <View style={styles.stopBadgeSquare}>
                  <Text style={{ fontSize: 18 }}>🚏</Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{stop.name}</Text>
                  {stop.nameTa && <Text style={styles.resultSubTa}>{stop.nameTa}</Text>}
                  <Text style={styles.resultSub}>{stop.type.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.resultArrow}>📍</Text>
              </TouchableOpacity>
            ))}

            {matchingRoutes.length === 0 && matchingStops.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 36 }}>🔍</Text>
                <Text style={styles.emptyTitle}>No matching buses or stops</Text>
                <Text style={styles.emptySub}>Try searching for "11A", "Gandhipuram", or "PSG Tech"</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Recent Searches */}
            {recents.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>
                  <TouchableOpacity onPress={handleClearRecents} activeOpacity={0.7}>
                    <Text style={styles.clearAll}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentCardGroup}>
                  {recents.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.recentRow,
                        index < recents.length - 1 && styles.recentRowBorder,
                      ]}
                      onPress={() => {
                        if (item.routeId) router.push(`/route/${item.routeId}` as any);
                        else setQuery(item.query || item.title);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.recentIconWrapper}>
                        <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                      </View>
                      <View style={styles.recentTextContainer}>
                        <Text style={styles.recentTitle}>{item.title}</Text>
                        <Text style={styles.recentSubtitle}>{item.subtitle}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.recentRemoveBtn}
                        onPress={() => handleRemoveRecent(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.recentRemoveIcon}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Destinations Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>POPULAR HUBS</Text>
              <View style={styles.pillGrid}>
                {POPULAR_DESTINATIONS.map((dest, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.hubChip}
                    onPress={() => handleSelectPopular(dest.query)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hubIcon}>{dest.icon}</Text>
                    <Text style={styles.hubLabel}>{dest.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Interactive Mini Live Map Card */}
            <View style={styles.mapCard}>
              <MapContainer
                style={styles.mapCanvas}
                initialCenter={[76.9634, 11.0183]}
                initialZoom={13}
                showControls={false}
                showUserLocation={false}
              >
                <MapRouteLayer routeGeoJSON={DEMO_ROUTE_LINE_GEOJSON} color={Colors.secondary} lineWidth={5} />
                <StationMarkers stops={COIMBATORE_STOPS.slice(0, 3)} />
              </MapContainer>
              <View style={styles.mapOverlayContainer}>
                <View style={styles.mapBadge}>
                  <Text style={styles.mapBadgeText}>🗺️ COIMBATORE LIVE NETWORK</Text>
                </View>
                <TouchableOpacity
                  style={styles.mapCTA}
                  onPress={() => router.push('/(tabs)/map')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.mapCTAText}>Open Full Map →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <AIAssistantSheet 
        isVisible={isAiSheetVisible} 
        onClose={() => setIsAiSheetVisible(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    height: 60,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
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
  backIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  headerSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    color: Colors.onSurface,
    padding: 0,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIcon: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
  },
  askAiBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f97316',
  },
  askAiIcon: {
    fontSize: 16,
  },
  aiInlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  aiInlineLoadingText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  aiResultBlock: {
    gap: Spacing.sm,
  },
  aiInlineBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#fff7ed',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  aiInlineBubbleEmoji: {
    fontSize: 18,
    marginTop: 2,
  },
  aiInlineBubbleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.onSurface,
    fontFamily: 'GeneralSans-Medium',
  },
  aiInlineChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  aiInlineChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  aiInlineChipIcon: {
    fontSize: 14,
  },
  aiInlineChipLabel: {
    fontSize: 11,
    fontFamily: 'GeneralSans-Semibold',
    fontWeight: '600',
    color: Colors.onSurface,
  },

  // Segmented Tabs
  tabScrollWrapper: {
    paddingVertical: Spacing.xs,
  },
  tabsRow: {
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.xs,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  tabIcon: {
    fontSize: 13,
  },
  tabLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  tabLabelActive: {
    color: '#ffffff',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
    gap: Spacing.lg,
  },

  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  clearAll: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },

  // Recent Searches Card Group
  recentCardGroup: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  recentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  recentIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTextContainer: {
    flex: 1,
  },
  recentTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  recentSubtitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 1,
  },
  recentRemoveBtn: {
    padding: 6,
  },
  recentRemoveIcon: {
    fontSize: 12,
    color: Colors.outline,
  },

  // Popular Hub Chips
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 8,
    ...Shadows.sm,
  },
  hubIcon: {
    fontSize: 15,
  },
  hubLabel: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },

  // Map Card Preview
  mapCard: {
    height: 180,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    position: 'relative',
    ...Shadows.md,
  },
  mapCanvas: {
    flex: 1,
  },
  mapOverlayContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapBadge: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  mapBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Bold',
    letterSpacing: 0.5,
  },
  mapCTA: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  mapCTAText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Bold',
  },

  // Results View
  resultsContainer: {
    gap: Spacing.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  routeBadgeSquare: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Bold',
  },
  stopBadgeSquare: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  resultSubTa: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 1,
  },
  resultSub: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  resultArrow: {
    fontSize: 18,
    color: Colors.onSurfaceVariant,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  emptySub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

