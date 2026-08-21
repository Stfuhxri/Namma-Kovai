import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, db, UserProfile } from '@/services/firebase';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const AVATAR_OPTIONS = ['👤', '🧑', '👩', '🧔', '👨‍💼', '👩‍💼', '🧑‍🎓', '👩‍🎓'];

export default function SetupProfileScreen() {
  const { uid, email, displayName, phone: phoneParam } = useLocalSearchParams<{
    uid: string;
    email?: string;
    displayName?: string;
    phone?: string;
  }>();

  const [name, setName] = useState(displayName || '');
  const [phone, setPhone] = useState(phoneParam || '');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name to continue.');
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const currentUid = uid || auth?.currentUser?.uid;
      if (!currentUid) throw new Error('User not authenticated.');

      const profile: UserProfile = {
        uid: currentUid,
        name: name.trim(),
        phone: phone.trim(),
        favoriteRoutes: [],
        language: 'en',
      };

      await setDoc(doc(db, 'users', currentUid), profile, { merge: true });
      router.replace('/(tabs)');
    } catch (e: any) {
      console.warn('Profile setup error:', e);
      // Even if Firestore fails, let the user through — they can update profile later
      if (e?.code?.includes('unavailable') || e?.message?.includes('offline')) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', e?.message || 'Could not save profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* Progress indicator */}
            <View style={styles.progressRow}>
              <View style={styles.progressDot} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
            </View>

            {/* Avatar picker */}
            <View style={styles.avatarSection}>
              <View style={styles.bigAvatar}>
                <Text style={styles.bigAvatarEmoji}>{AVATAR_OPTIONS[selectedAvatar]}</Text>
              </View>
              <Text style={styles.changeAvatarHint}>Pick your avatar</Text>
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
            </View>

            {/* Headline */}
            <View style={styles.headlineArea}>
              <Text style={styles.headline}>Set up your profile</Text>
              <Text style={styles.subheadline}>
                Tell us a little about yourself so we can personalise your Namma Kovai experience.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Arun Kumar"
                  placeholderTextColor="#c0c0c0"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  autoFocus
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Mobile number <Text style={styles.optional}>(optional)</Text>
                </Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="98765 43210"
                    placeholderTextColor="#c0c0c0"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                    maxLength={10}
                  />
                </View>
              </View>

              {/* Email (read-only display if available) */}
              {!!email && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.input, styles.readonlyInput]}>
                    <Text style={styles.readonlyText}>{email}</Text>
                    <View style={styles.verifiedPill}>
                      <Text style={styles.verifiedPillText}>✓ verified</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Save CTA */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
                id="save-profile-btn"
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save & Continue →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkip}
                disabled={loading}
                activeOpacity={0.7}
                id="skip-profile-btn"
              >
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 48,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 28,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e8e8e8',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#0a0a0a',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bigAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#0a0a0a',
    marginBottom: 8,
  },
  bigAvatarEmoji: {
    fontSize: 44,
  },
  changeAvatarHint: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: '#0a0a0a',
    backgroundColor: '#f0f0f0',
  },
  avatarOptionEmoji: {
    fontSize: 20,
  },

  // Headline
  headlineArea: {
    marginBottom: 28,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0a0a0a',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subheadline: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 20,
  },

  // Form
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444444',
  },
  required: {
    color: '#af2800',
  },
  optional: {
    fontWeight: '400',
    color: '#aaaaaa',
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0a0a0a',
    backgroundColor: '#fafafa',
  },

  // Phone row
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  phoneInput: {
    flex: 1,
  },

  // Read-only email field
  readonlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
  },
  readonlyText: {
    fontSize: 14,
    color: '#888888',
    flex: 1,
  },
  verifiedPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifiedPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Buttons
  primaryBtn: {
    height: 52,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    color: '#aaaaaa',
    textDecorationLine: 'underline',
  },
});
