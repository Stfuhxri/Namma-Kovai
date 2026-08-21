import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const EMERGENCY_NUMBERS = [
  { id: 'police', icon: '🚔', label: 'Police', number: '100', color: '#1e40af' },
  { id: 'ambulance', icon: '🚑', label: 'Ambulance', number: '108', color: '#059669' },
  { id: 'women', icon: '👩', label: 'Women\nHelpline', number: '1091', color: '#7c3aed' },
  { id: 'fire', icon: '🚒', label: 'Fire\nService', number: '101', color: '#dc2626' },
];

const NEARBY_SERVICES = [
  { name: 'Coimbatore City Police', type: 'Police Station', distance: '1.2 km', phone: '0422-2300100' },
  { name: 'KMCH Hospital', type: 'Hospital', distance: '2.5 km', phone: '0422-4323800' },
  { name: 'Coimbatore Medical College', type: 'Hospital', distance: '3.1 km', phone: '0422-2301393' },
  { name: 'RS Puram Police Station', type: 'Police Station', distance: '1.8 km', phone: '0422-2544100' },
];

export default function SOSScreen() {
  const [locationText, setLocationText] = useState('Fetching location...');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Get current location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationText('Location permission denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocationText(`${loc.coords.latitude.toFixed(5)}°N, ${loc.coords.longitude.toFixed(5)}°E`);
      } catch {
        setLocationText('Could not get location');
      }
    })();
  }, []);

  const handleCall = (number: string, label: string) => {
    Alert.alert(
      `Call ${label}?`,
      `Dial ${number} for ${label} services`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', onPress: () => Linking.openURL(`tel:${number}`) },
      ]
    );
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'Call 112 — India National Emergency Number?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CALL 112', style: 'destructive', onPress: () => Linking.openURL('tel:112') },
      ]
    );
  };

  const handleShareLocation = async () => {
    if (!coords) {
      Alert.alert('Location Unavailable', 'Unable to fetch your current location. Please try again.');
      return;
    }
    const message = `🚨 EMERGENCY — I need help!\n\nMy current location:\nhttps://maps.google.com/?q=${coords.lat},${coords.lng}\n\nCoordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}\n\nSent via Namma Kovai SOS`;
    try {
      await Share.share({ message });
    } catch {
      Alert.alert('Error', 'Could not share location.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Emergency SOS</Text>
            <Text style={styles.headerSubtitle}>Namma Kovai Safety</Text>
          </View>
          <View style={styles.liveLocationBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>ACTIVE</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Emergency Button */}
          <View style={styles.mainSOSSection}>
            <View style={styles.sosPulseRing}>
              <TouchableOpacity
                style={styles.mainSOSButton}
                onPress={handleEmergencyCall}
                activeOpacity={0.8}
              >
                <Text style={styles.mainSOSIcon}>🆘</Text>
                <Text style={styles.mainSOSLabel}>CALL 112</Text>
                <Text style={styles.mainSOSSub}>National Emergency</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tapHint}>Tap to call emergency services</Text>
          </View>

          {/* Quick Emergency Numbers Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUICK EMERGENCY NUMBERS</Text>
            <View style={styles.emergencyGrid}>
              {EMERGENCY_NUMBERS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.emergencyCard}
                  onPress={() => handleCall(item.number, item.label.replace('\n', ' '))}
                  activeOpacity={0.85}
                >
                  <View style={[styles.emergencyIconBg, { backgroundColor: item.color }]}>
                    <Text style={styles.emergencyIcon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.emergencyLabel}>{item.label}</Text>
                  <Text style={styles.emergencyNumber}>{item.number}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Share Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YOUR LOCATION</Text>
            <View style={styles.locationCard}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={styles.locationTextGroup}>
                  <Text style={styles.locationLabel}>Current GPS Position</Text>
                  <Text style={styles.locationCoords}>{locationText}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShareLocation}
                activeOpacity={0.85}
              >
                <Text style={styles.shareBtnText}>📤 SHARE LOCATION</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nearby Emergency Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEARBY EMERGENCY SERVICES</Text>
            <View style={styles.servicesCardGroup}>
              {NEARBY_SERVICES.map((service, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.serviceRow,
                    i < NEARBY_SERVICES.length - 1 && styles.serviceRowBorder,
                  ]}
                  onPress={() => handleCall(service.phone, service.name)}
                  activeOpacity={0.75}
                >
                  <View style={styles.serviceIconBg}>
                    <Text style={{ fontSize: 16 }}>
                      {service.type === 'Police Station' ? '🚔' : '🏥'}
                    </Text>
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceType}>{service.type} • {service.distance}</Text>
                  </View>
                  <View style={styles.callBadge}>
                    <Text style={styles.callBadgeText}>📞 Call</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Safety Tips */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 SAFETY TIPS</Text>
            <Text style={styles.tipText}>
              • Stay calm and note your surroundings{'\n'}
              • Share your live location with a trusted contact{'\n'}
              • Move to a well-lit, crowded area if possible{'\n'}
              • Keep your phone charged while traveling
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    height: 60,
    backgroundColor: '#2a0505',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,60,60,0.2)',
    gap: Spacing.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 18,
    fontWeight: '800',
    color: '#ff4444',
  },
  headerSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    color: '#ff9999',
  },
  liveLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Semibold',
    letterSpacing: 0.5,
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

  // Main SOS Button
  mainSOSSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  sosPulseRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSOSButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ff6666',
    ...Shadows.lg,
  },
  mainSOSIcon: {
    fontSize: 36,
  },
  mainSOSLabel: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  mainSOSSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 10,
    color: '#ffcccc',
  },
  tapHint: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    color: '#ff9999',
    textAlign: 'center',
  },

  // Sections
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: '#ff8888',
    letterSpacing: 1,
  },

  // Emergency Grid
  emergencyGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emergencyCard: {
    flex: 1,
    backgroundColor: '#2a0f0f',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.15)',
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 6,
  },
  emergencyIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyIcon: {
    fontSize: 22,
  },
  emergencyLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  emergencyNumber: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 16,
    fontWeight: '800',
    color: '#ff6666',
  },

  // Location Card
  locationCard: {
    backgroundColor: '#2a0f0f',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.15)',
    gap: Spacing.md,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationIcon: {
    fontSize: 24,
  },
  locationTextGroup: {
    flex: 1,
  },
  locationLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  locationCoords: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    color: '#ff9999',
    marginTop: 2,
  },
  shareBtn: {
    backgroundColor: '#dc2626',
    borderRadius: BorderRadius.full,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  shareBtnText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Nearby Services
  servicesCardGroup: {
    backgroundColor: '#2a0f0f',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.15)',
    overflow: 'hidden',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  serviceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,60,60,0.1)',
  },
  serviceIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  serviceType: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    color: '#ff9999',
    marginTop: 2,
  },
  callBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.2)',
  },
  callBadgeText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 11,
    fontWeight: '700',
    color: '#ff6666',
  },

  // Safety Tips
  tipCard: {
    backgroundColor: '#2a0f0f',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.15)',
    gap: Spacing.sm,
  },
  tipTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: '#ff8888',
    letterSpacing: 0.5,
  },
  tipText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    color: '#ffcccc',
    lineHeight: 20,
  },
});
