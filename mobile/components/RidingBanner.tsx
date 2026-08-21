import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { stopReporting, getReportingState } from '@/services/locationReporter';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface RidingBannerProps {
  busNumber: string;
  riderCount: number;
  onStop?: () => void;
}

/**
 * RidingBanner — shown at the top of the home screen when user is
 * actively reporting location for a bus.
 *
 * Shows: "📍 Reporting for Bus 12C · 3 riders · Stop"
 */
export default function RidingBanner({ busNumber, riderCount, onStop }: RidingBannerProps) {
  const { t } = useTranslation();

  const handleStop = async () => {
    await stopReporting();
    onStop?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.liveDotContainer}>
          <View style={styles.liveDot} />
        </View>
        <View>
          <Text style={styles.reporting}>
            {t('riding.reporting', { busNumber })}
          </Text>
          <Text style={styles.riders}>
            {t('riding.riders', { count: riderCount })}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.stopBtn}
        onPress={handleStop}
        activeOpacity={0.8}
      >
        <Text style={styles.stopText}>{t('riding.stopReporting')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.marginMobile,
    ...Shadows.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    flex: 1,
  },
  liveDotContainer: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: `${Colors.secondary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  reporting: {
    ...Typography.bodyMd,
    color: Colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 14,
  },
  riders: {
    ...Typography.labelSm,
    color: Colors.onPrimaryContainer,
    opacity: 0.7,
    fontSize: 11,
  },
  stopBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  stopText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
