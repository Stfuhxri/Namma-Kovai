import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { AIRouteResult } from '@/services/aiRouting';

interface RouteCardProps {
  route: AIRouteResult;
  onPressDetails?: () => void;
  isRecommended?: boolean;
}

export function RouteCard({ route, onPressDetails, isRecommended = false }: RouteCardProps) {
  // Extract primary bus number if not explicitly defined in steps, otherwise use the one from JSON
  const mainBus = route.primary_bus || 'Bus';

  return (
    <View style={styles.cardContainer}>
      {isRecommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>RECOMMENDED</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        {/* Total Time */}
        <Text style={styles.timeText}>{route.total_time_min} min</Text>

        {/* Icon Flow */}
        <View style={styles.iconFlow}>
          <Text style={styles.iconItem}>🚶</Text>
          <Text style={styles.arrowIcon}>›</Text>
          
          <View style={styles.busStep}>
            <Text style={styles.iconItem}>🚌</Text>
            <Text style={styles.busNumber}>{mainBus}</Text>
          </View>
          
          <Text style={styles.arrowIcon}>›</Text>
          <Text style={styles.iconItem}>🚶</Text>
        </View>

        {/* Transfers / Subtitle */}
        <Text style={styles.subtitleText}>{route.summary_title}</Text>

        {/* Weather Alert if present */}
        {route.has_weather_warning && route.weather_alert && (
          <View style={styles.weatherAlert}>
            <Text style={styles.weatherAlertText}>{route.weather_alert}</Text>
          </View>
        )}

        {/* See More Details Button */}
        <TouchableOpacity style={styles.detailsBtn} onPress={onPressDetails} activeOpacity={0.7}>
          <Text style={styles.detailsBtnText}>See more details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  recommendedBadge: {
    backgroundColor: '#fff7ed', // Light orange
    borderBottomWidth: 2,
    borderBottomColor: '#f97316', // Orange-500
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  recommendedText: {
    color: '#f97316',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Bold',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: Spacing.md,
    gap: 12,
  },
  timeText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Bold',
    color: Colors.onSurface,
  },
  iconFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconItem: {
    fontSize: 18,
    color: Colors.onSurfaceVariant,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#cbd5e1', // Slate-300
    fontWeight: '300',
  },
  busStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  busNumber: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'GeneralSans-Bold',
    color: Colors.onSurface,
  },
  subtitleText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontFamily: 'GeneralSans-Medium',
  },
  weatherAlert: {
    backgroundColor: '#fee2e2',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  weatherAlertText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  detailsBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#f97316', // Orange-500
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  detailsBtnText: {
    color: '#f97316',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'GeneralSans-Semibold',
  }
});
