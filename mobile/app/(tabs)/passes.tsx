import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface PassCard {
  id: string;
  label: string;
  name: string;
  price: string;
  icon: string;
  subtitle: string;
  isBestValue?: boolean;
}

const PASSES: PassCard[] = [
  { id: 'daily', label: 'Daily Pass', name: 'Daily Unlimited', price: '₹20', icon: '📅', subtitle: 'Valid 24 Hours • All Routes' },
  { id: 'weekly', label: 'Weekly Pass', name: 'Smart Traveler', price: '₹120', icon: '🗓️', subtitle: '7 Days • Save 15%', isBestValue: true },
  { id: 'monthly', label: 'Monthly Pass', name: 'City Commuter', price: '₹450', icon: '📆', subtitle: '30 Days • Unlimited' },
  { id: 'student', label: 'Student Pass', name: 'Scholar Special', price: '₹200', icon: '🎓', subtitle: 'Valid Student ID Req.' },
];

const RECENT_TRIPS = [
  { from: 'Ukkadam', to: 'Lakshmi Mills', date: 'Today • 08:30 AM', amount: '₹22.00', note: 'Pass Applied' },
  { from: 'Airport', to: 'Gandhipuram', date: 'Yesterday • 06:15 PM', amount: '₹35.00', note: 'Paid via Wallet' },
  { from: 'Peelamedu', to: 'Hope College', date: 'Oct 22 • 09:10 AM', amount: '₹15.00', note: 'Pass Applied' },
];

export default function PassesScreen() {
  const { t } = useTranslation();
  const [selectedPassId, setSelectedPassId] = useState<string>('weekly');
  const [fromStop, setFromStop] = useState('');
  const [toStop, setToStop] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [fareResult, setFareResult] = useState<{ fare: string; dist: string; time: string } | null>(null);

  const handleCalculate = () => {
    if (!fromStop || !toStop) return;
    setCalculating(true);
    setFareResult(null);
    setTimeout(() => {
      setCalculating(false);
      setFareResult({
        fare: '₹25.00',
        dist: '4.8 km',
        time: '16 mins',
      });
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Fares & Passes</Text>
          <Text style={styles.headerSubtitle}>Coimbatore Smart Transit Pass System</Text>
        </View>
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => router.push('/bus/sos' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Pass Card */}
        <View style={styles.activePassCard}>
          <View style={styles.passCardHeader}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE PASS</Text>
            </View>
            <Text style={styles.passExpiry}>7 Days Remaining</Text>
          </View>

          <Text style={styles.activePassTitle}>Smart Traveler Pass</Text>
          <Text style={styles.activePassDesc}>
            Unlimited rides across all Blue, Green & Red transit lines in Coimbatore.
          </Text>

          <View style={styles.passCardFooter}>
            <View style={styles.qrContainer}>
              <Text style={styles.qrIcon}>▦</Text>
              <Text style={styles.qrSub}>TAP TO SHOW QR</Text>
            </View>
            <TouchableOpacity style={styles.renewBtn} activeOpacity={0.85}>
              <Text style={styles.renewText}>Renew Pass →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Buy a Pass Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>BUY A PASS</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All Plans</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.passScroll}>
            {PASSES.map((pass) => {
              const isSelected = selectedPassId === pass.id;
              return (
                <TouchableOpacity
                  key={pass.id}
                  style={[
                    styles.passCard,
                    isSelected && styles.passCardSelected,
                    pass.isBestValue && !isSelected && styles.passCardBestValue,
                  ]}
                  onPress={() => setSelectedPassId(pass.id)}
                  activeOpacity={0.85}
                >
                  {pass.isBestValue && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>BEST VALUE</Text>
                    </View>
                  )}
                  <Text style={styles.passCardIcon}>{pass.icon}</Text>
                  <Text style={styles.passCardName}>{pass.name}</Text>
                  <Text style={styles.passCardPrice}>{pass.price}</Text>
                  <Text style={styles.passCardSub}>{pass.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Fare Calculator Card */}
        <View style={styles.calculatorCard}>
          <Text style={styles.sectionTitle}>🧮 FARE CALCULATOR</Text>
          <View style={styles.calcInputRow}>
            <Text style={styles.inputIcon}>📍</Text>
            <TextInput
              style={styles.calcInput}
              placeholder="Origin stop (e.g. Gandhipuram)"
              placeholderTextColor={Colors.outline}
              value={fromStop}
              onChangeText={setFromStop}
            />
          </View>
          <View style={styles.calcInputRow}>
            <Text style={styles.inputIcon}>🏁</Text>
            <TextInput
              style={styles.calcInput}
              placeholder="Destination stop (e.g. Singanallur)"
              placeholderTextColor={Colors.outline}
              value={toStop}
              onChangeText={setToStop}
            />
          </View>
          <TouchableOpacity
            style={styles.calcBtn}
            onPress={handleCalculate}
            disabled={calculating}
            activeOpacity={0.85}
          >
            {calculating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.calcBtnText}>ESTIMATE FARE</Text>
            )}
          </TouchableOpacity>

          {fareResult && (
            <View style={styles.fareResultBox}>
              <View style={styles.fareResultRow}>
                <Text style={styles.farePrice}>{fareResult.fare}</Text>
                <Text style={styles.fareMeta}>{fareResult.dist} • {fareResult.time}</Text>
              </View>
              <Text style={styles.fareNote}>Estimated single ride fare using standard bus tariff</Text>
            </View>
          )}
        </View>

        {/* Recent Trips Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT TRIPS</Text>
          <View style={styles.tripCardGroup}>
            {RECENT_TRIPS.map((trip, i) => (
              <View
                key={i}
                style={[
                  styles.tripRow,
                  i < RECENT_TRIPS.length - 1 && styles.tripRowBorder,
                ]}
              >
                <View style={styles.tripIconBg}>
                  <Text style={{ fontSize: 16 }}>🚌</Text>
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripRoute}>{trip.from} → {trip.to}</Text>
                  <Text style={styles.tripDate}>{trip.date}</Text>
                </View>
                <View style={styles.tripRight}>
                  <Text style={styles.tripAmount}>{trip.amount}</Text>
                  <Text style={styles.tripNote}>{trip.note}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    height: 60,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTitleGroup: {
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
  sosBtn: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  sosText: {
    color: Colors.onError,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 11,
    fontWeight: '800',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
    paddingBottom: 100,
    gap: Spacing.lg,
  },

  // Active Pass Ticket Card
  activePassCard: {
    backgroundColor: '#000000',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.md,
  },
  passCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  activeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Semibold',
    letterSpacing: 0.5,
  },
  passExpiry: {
    color: '#e2e2e2',
    fontSize: 11,
    fontFamily: 'GeneralSans-Regular',
    fontWeight: '600',
  },
  activePassTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  activePassDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 18,
  },
  passCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: Spacing.md,
  },
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrIcon: {
    color: '#ffffff',
    fontSize: 28,
  },
  qrSub: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'GeneralSans-Semibold',
    letterSpacing: 0.5,
  },
  renewBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  renewText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Semibold',
  },

  // Buy a Pass Section
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
  viewAll: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  passScroll: {
    gap: Spacing.md,
  },
  passCard: {
    width: 156,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    gap: Spacing.xs,
    position: 'relative',
    ...Shadows.sm,
  },
  passCardSelected: {
    borderColor: Colors.secondary,
    borderWidth: 2,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  passCardBestValue: {
    borderColor: Colors.secondary,
  },
  bestBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  bestBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Semibold',
  },
  passCardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  passCardName: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  passCardPrice: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  passCardSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  // Fare Calculator Card
  calculatorCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  calcInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 48,
    gap: Spacing.sm,
  },
  inputIcon: {
    fontSize: 16,
  },
  calcInput: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    color: Colors.onSurface,
    padding: 0,
  },
  calcBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  calcBtnText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  fareResultBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 4,
  },
  fareResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  farePrice: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  fareMeta: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  fareNote: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  // Trip History
  tripCardGroup: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  tripRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  tripIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripInfo: {
    flex: 1,
  },
  tripRoute: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  tripDate: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  tripRight: {
    alignItems: 'flex-end',
  },
  tripAmount: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  tripNote: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 1,
  },
});

