import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth, db, UserProfile } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

// ─── Avatar options ────────────────────────────────────────────────────────────
const AVATAR_OPTIONS = ['👤', '🧑', '👩', '🧔', '👨‍💼', '👩‍💼', '🧑‍🎓', '👩‍🎓'];

const STATS = [
  { value: 42, label: 'TRIPS', unit: '' },
  { value: 128, label: 'DISTANCE', unit: 'KM', isFeatured: true },
  { value: 12, label: 'SAVED', unit: 'KG CO₂' },
];

const MENU_ITEMS = [
  { icon: '🎫', label: 'My Smart Passes', isNew: false, target: '/(tabs)/passes' },
  { icon: '🔖', label: 'Saved Bus Stops & Routes', isNew: false, target: '/(tabs)/search' },
  { icon: '📋', label: 'Trip History & Receipts', isNew: false, target: '/(tabs)/passes' },
  { icon: '🎁', label: 'Refer Friends & Earn Passes', isNew: true, target: null },
  { icon: '🌐', label: 'Language / மொழி (English/தமிழ்)', isNew: false, target: null },
  { icon: '💬', label: 'Help & Passenger Support', isNew: false, target: null },
];

// ─── Edit Profile Modal ────────────────────────────────────────────────────────
interface EditModalProps {
  visible: boolean;
  profile: Partial<UserProfile> | null;
  avatarIndex: number;
  onSave: (updated: { name: string; phone: string; avatarIndex: number }) => Promise<void>;
  onClose: () => void;
}

function EditProfileModal({ visible, profile, avatarIndex, onSave, onClose }: EditModalProps) {
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarIndex);
  const [saving, setSaving] = useState(false);

  // Sync when profile changes (e.g. on first open)
  useEffect(() => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setSelectedAvatar(avatarIndex);
  }, [profile, avatarIndex, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), phone: phone.trim(), avatarIndex: selectedAvatar });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          {/* Handle bar */}
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Edit Profile</Text>
          <Text style={styles.modalSubtitle}>Update your passenger details</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
            {/* Avatar picker */}
            <Text style={styles.editLabel}>Avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((emoji, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.avatarOption, i === selectedAvatar && styles.avatarOptionSelected]}
                  onPress={() => setSelectedAvatar(i)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.avatarOptionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text style={styles.editLabel}>
              Full name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.editInput}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#c0c0c0"
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Phone */}
            <Text style={styles.editLabel}>
              Mobile number <Text style={styles.optional}>(optional)</Text>
            </Text>
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={[styles.editInput, { flex: 1, marginBottom: 0 }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="98765 43210"
                placeholderTextColor="#c0c0c0"
                keyboardType="phone-pad"
                returnKeyType="done"
                maxLength={10}
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              id="edit-profile-save-btn"
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Profile Screen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [displayValues] = useState(STATS.map(s => s.value));

  // ─── Fetch profile from Firestore ─────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingProfile(true);
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        // Restore saved avatarIndex if stored, else keep 0
        const storedAvatar = (snap.data() as any).avatarIndex ?? 0;
        setAvatarIndex(storedAvatar);
      } else {
        // No Firestore doc yet — build from Firebase Auth user
        setProfile({
          uid: user.uid,
          name: user.displayName || '',
          phone: user.phoneNumber || '',
          favoriteRoutes: [],
          language: 'en',
        });
      }
    } catch (e: any) {
      console.warn('fetchProfile error:', e?.message);
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ─── Save updated profile ──────────────────────────────────────────────────
  const handleSaveProfile = async ({
    name,
    phone,
    avatarIndex: newAvatarIdx,
  }: {
    name: string;
    phone: string;
    avatarIndex: number;
  }) => {
    if (!user?.uid) return;
    const updated: UserProfile & { avatarIndex: number } = {
      uid: user.uid,
      name,
      phone,
      favoriteRoutes: profile?.favoriteRoutes || [],
      language: profile?.language || 'en',
      avatarIndex: newAvatarIdx,
    };
    try {
      await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
      setProfile(updated);
      setAvatarIndex(newAvatarIdx);
      setEditModalVisible(false);
      Alert.alert('✓ Saved', 'Your profile has been updated.');
    } catch (e: any) {
      if (e?.code?.includes('unavailable') || e?.message?.includes('offline')) {
        // Optimistically update UI even if offline
        setProfile(updated);
        setAvatarIndex(newAvatarIdx);
        setEditModalVisible(false);
        Alert.alert('Saved locally', 'Changes will sync when you are back online.');
      } else {
        Alert.alert('Error', e?.message || 'Could not save profile.');
      }
    }
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out of Namma Kovai?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            const auth = getFirebaseAuth();
            if (auth) await signOut(auth);
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('Error', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  };

  // ─── Derived display values ────────────────────────────────────────────────
  const displayName = profile?.name || user?.displayName || 'Passenger';
  const displayPhone = profile?.phone || user?.phoneNumber || '';
  const displayEmail = user?.email || '';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Passenger Profile</Text>
          <Text style={styles.headerSubtitle}>Coimbatore Transit ID</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.8}
          onPress={() => setEditModalVisible(true)}
          id="edit-profile-btn"
        >
          <Text style={styles.editBtnText}>✏️  Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              {loadingProfile ? (
                <ActivityIndicator color={Colors.secondary} size="small" />
              ) : (
                <Text style={styles.avatarEmoji}>{AVATAR_OPTIONS[avatarIndex]}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => setEditModalVisible(true)}
              id="edit-avatar-badge"
            >
              <Text style={{ fontSize: 10, color: '#ffffff' }}>✏️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileTextGroup}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {loadingProfile ? '...' : displayName}
              </Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ VERIFIED</Text>
              </View>
            </View>

            {!!displayPhone && (
              <Text style={styles.phone}>
                +91 {displayPhone.replace(/^\+91/, '').replace(/\D/g, '')}
              </Text>
            )}
            {!!displayEmail && (
              <Text style={styles.email}>{displayEmail}</Text>
            )}
            {!displayPhone && !displayEmail && !loadingProfile && (
              <TouchableOpacity onPress={() => setEditModalVisible(true)}>
                <Text style={styles.addDetailHint}>+ Add phone number</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Bento Grid */}
        <View style={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <View key={i} style={[styles.statBox, stat.isFeatured && styles.statBoxFeatured]}>
              <Text style={[styles.statValue, stat.isFeatured && styles.statValueFeatured]}>
                {displayValues[i]}
              </Text>
              <Text style={[styles.statLabel, stat.isFeatured && styles.statLabelFeatured]}>
                {stat.label} {stat.unit}
              </Text>
            </View>
          ))}
        </View>

        {/* Eco Impact Banner */}
        <View style={styles.ecoCard}>
          <View style={styles.ecoIconBg}>
            <Text style={{ fontSize: 24 }}>🌱</Text>
          </View>
          <View style={styles.ecoTextGroup}>
            <Text style={styles.ecoTitle}>ENVIRONMENTAL IMPACT</Text>
            <Text style={styles.ecoDesc}>
              By riding public buses, you saved <Text style={{ fontWeight: '800' }}>2 trees</Text> &amp; 12kg of carbon emissions this month!
            </Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuCardGroup}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuRow, i < MENU_ITEMS.length - 1 && styles.menuRowBorder]}
              onPress={() => { if (item.target) router.push(item.target as any); }}
              activeOpacity={0.75}
            >
              <View style={styles.menuIconBg}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.isNew ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              ) : (
                <Text style={styles.menuArrow}>→</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85} id="logout-btn">
          <Text style={styles.logoutText}>SIGN OUT OF ACCOUNT</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Namma Kovai Transit • Version 1.0.0 (Build 42)</Text>
      </ScrollView>

      {/* Edit Modal */}
      <EditProfileModal
        visible={editModalVisible}
        profile={profile}
        avatarIndex={avatarIndex}
        onSave={handleSaveProfile}
        onClose={() => setEditModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
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
  headerTitleGroup: { flex: 1 },
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  editBtnText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },

  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
    paddingBottom: 100,
    gap: Spacing.lg,
  },

  // Profile Card
  profileCard: {
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
  avatarWrapper: { position: 'relative' },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  avatarEmoji: { fontSize: 32 },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  profileTextGroup: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
    flexShrink: 1,
  },
  verifiedBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedText: { color: '#ffffff', fontSize: 8, fontWeight: '800', fontFamily: 'GeneralSans-Semibold' },
  phone: { fontFamily: 'GeneralSans-Semibold', fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  email: { fontFamily: 'GeneralSans-Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  addDetailHint: { fontFamily: 'GeneralSans-Regular', fontSize: 12, color: Colors.secondary, marginTop: 2 },

  // Stats
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...Shadows.sm,
  },
  statBoxFeatured: { borderColor: Colors.secondary, borderWidth: 2 },
  statValue: { fontFamily: 'GeneralSans-Bold', fontSize: 22, fontWeight: '800', color: Colors.onSurface },
  statValueFeatured: { color: Colors.secondary },
  statLabel: { fontFamily: 'GeneralSans-Semibold', fontSize: 10, fontWeight: '800', color: Colors.onSurfaceVariant },
  statLabelFeatured: { color: Colors.secondary },

  // Eco Banner
  ecoCard: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  ecoIconBg: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  ecoTextGroup: { flex: 1, gap: 2 },
  ecoTitle: { color: '#ffffff', fontSize: 10, fontWeight: '800', fontFamily: 'GeneralSans-Semibold', letterSpacing: 0.5 },
  ecoDesc: { color: '#ffffff', fontSize: 12, fontFamily: 'GeneralSans-Regular', lineHeight: 16 },

  // Menu
  menuCardGroup: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.md },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  menuIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontFamily: 'GeneralSans-Regular', fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  newBadge: { backgroundColor: Colors.secondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  newBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '800', fontFamily: 'GeneralSans-Semibold' },
  menuArrow: { fontSize: 16, color: Colors.onSurfaceVariant },

  // Logout
  logoutBtn: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.full,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.error,
    ...Shadows.sm,
  },
  logoutText: { fontFamily: 'GeneralSans-Semibold', fontSize: 12, fontWeight: '800', color: Colors.error, letterSpacing: 0.5 },
  versionText: { fontFamily: 'GeneralSans-Regular', fontSize: 11, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: -Spacing.xs },

  // ── Edit Modal ──────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontFamily: 'GeneralSans-Bold', fontSize: 22, fontWeight: '800', color: Colors.onSurface },
  modalSubtitle: { fontFamily: 'GeneralSans-Regular', fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 2, marginBottom: 8 },

  // Avatar grid in modal
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  avatarOption: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarOptionSelected: { borderColor: Colors.onSurface, backgroundColor: Colors.surfaceContainerHigh },
  avatarOptionEmoji: { fontSize: 22 },

  // Edit form fields
  editLabel: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    fontWeight: '600',
    color: '#444444',
    marginBottom: 6,
    marginTop: 4,
  },
  required: { color: Colors.secondary },
  optional: { fontWeight: '400', color: '#aaaaaa' },
  editInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
    marginBottom: 16,
  },
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  phonePrefix: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePrefixText: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },

  saveBtn: {
    height: 52,
    backgroundColor: Colors.onSurface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'GeneralSans-Semibold' },
  btnDisabled: { opacity: 0.5 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { fontSize: 14, color: Colors.onSurfaceVariant, textDecorationLine: 'underline' },
});
