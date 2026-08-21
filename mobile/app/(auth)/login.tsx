import React, { useState, useEffect, useRef } from 'react';
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
  Image,
} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { getFirebaseAuth, db } from '@/services/firebase';

const WEB_CLIENT_ID = '246217496919-et3hj1ev5hpif3l28pp7qpkt0a4gdd05.apps.googleusercontent.com';

type Mode = 'sign_in' | 'sign_up';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    try {
      GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    } catch (e) {
      console.warn('Google Sign-In native module not available (expected if running in Expo Go)', e);
    }
    
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, []);

  /**
   * Returns true if the user already has a complete profile (returning user).
   * Returns false if they are new and need to go through setup.
   */
  const checkUserHasProfile = async (uid: string): Promise<boolean> => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() && !!snap.data()?.name;
    } catch {
      // Offline — assume existing user to avoid blocking
      return true;
    }
  };

  const redirectAfterAuth = (isNewUser: boolean, uid: string, email: string | null, displayName: string | null) => {
    if (isNewUser) {
      router.replace({
        pathname: '/(auth)/setup-profile',
        params: {
          uid,
          email: email || '',
          displayName: displayName || '',
        },
      } as any);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (mode === 'sign_up' && !name.trim()) {
      Alert.alert('Missing fields', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Auth not initialized.');

      if (mode === 'sign_in') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        // Returning users always go straight to home
        router.replace('/(tabs)');
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // New sign-up → send to profile setup
        redirectAfterAuth(true, cred.user.uid, email.trim(), name.trim() || null);
      }
    } catch (e: any) {
      console.warn('Email Auth Error:', e);
      const code = e?.code || 'UNKNOWN';
      const msg =
        code === 'auth/user-not-found' ? 'No account found with this email. Please sign up.' :
        code === 'auth/wrong-password' || code === 'auth/invalid-credential' ? 'Incorrect email or password.' :
        code === 'auth/email-already-in-use' ? 'An account already exists with this email. Please sign in.' :
        code === 'auth/weak-password' ? 'Password must be at least 6 characters.' :
        code === 'auth/invalid-email' ? 'Please enter a valid email address.' :
        code === 'auth/network-request-failed' ? 'Network error. Please check your internet connection.' :
        `[${code}] ${e?.message || 'Authentication failed.'}`;
      Alert.alert('Sign-In Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();

      // Support both v15 (flat) and v16+ (nested .data) response shapes
      const idToken =
        (userInfo as any)?.data?.idToken ??
        (userInfo as any)?.idToken ??
        null;

      if (!idToken) throw new Error('No Google ID token received. Check your webClientId and SHA-1 fingerprint.');

      const credential = GoogleAuthProvider.credential(idToken);
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase Auth is not ready.');

      const cred = await signInWithCredential(auth, credential);
      // Check if this Google user is new or returning
      const hasProfile = await checkUserHasProfile(cred.user.uid);
      redirectAfterAuth(
        !hasProfile,
        cred.user.uid,
        cred.user.email,
        cred.user.displayName,
      );
    } catch (e: any) {
      console.warn('Google Sign-In Error:', e);
      const code: string = e?.code ?? '';
      const msg =
        code === 'SIGN_IN_CANCELLED' ? 'Sign-in was cancelled.' :
        code === 'IN_PROGRESS' ? 'Sign-in is already in progress.' :
        code === 'PLAY_SERVICES_NOT_AVAILABLE' ? 'Google Play Services not available or outdated.' :
        code === 'DEVELOPER_ERROR' ? 'Google Sign-In is misconfigured. Ensure the SHA-1 fingerprint is registered in Firebase Console.' :
        e?.message || 'Google sign-in could not be completed.';
      Alert.alert('Google Sign-In Error', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(m => m === 'sign_in' ? 'sign_up' : 'sign_in');
    setEmail('');
    setPassword('');
    setName('');
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
          <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* App Logo */}
            <View style={styles.logoArea}>
              <Image
                source={require('@/assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Headline */}
            <View style={styles.headlineArea}>
              <Text style={styles.headline}>
                {mode === 'sign_in' ? 'Welcome back' : 'Create account'}
              </Text>
              <Text style={styles.subheadline}>
                {mode === 'sign_in'
                  ? 'Sign in to continue tracking your commute.'
                  : 'Join to track buses across Coimbatore.'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {mode === 'sign_up' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="#c0c0c0"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#c0c0c0"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder={mode === 'sign_up' ? 'Min. 6 characters' : '••••••••'}
                    placeholderTextColor="#c0c0c0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleEmailAuth}
                  />
                  <TouchableOpacity
                    style={styles.showHideBtn}
                    onPress={() => setShowPassword(v => !v)}
                  >
                    <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Primary CTA */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleEmailAuth}
                disabled={loading || googleLoading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#ffffff" size="small" />
                  : <Text style={styles.primaryBtnText}>
                      {mode === 'sign_in' ? 'Sign in' : 'Create account'}
                    </Text>
                }
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google button */}
              <TouchableOpacity
                style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
                onPress={handleGoogleLogin}
                disabled={loading || googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#444" size="small" />
                ) : (
                  <>
                    <View style={styles.gIconWrap}>
                      <Text style={styles.gIcon}>G</Text>
                    </View>
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Mode toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleBase}>
                {mode === 'sign_in' ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text style={styles.toggleLink}>
                  {mode === 'sign_in' ? 'Sign up' : 'Sign in'}
                </Text>
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
    paddingTop: 72,
    paddingBottom: 48,
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 220,
    height: 90,
  },

  // Headline
  headlineArea: {
    marginBottom: 36,
  },
  headline: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0a0a0a',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 15,
    color: '#888888',
    lineHeight: 22,
    fontWeight: '400',
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
    letterSpacing: 0.1,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  showHideBtn: {
    paddingHorizontal: 4,
    height: 50,
    justifyContent: 'center',
  },
  showHideText: {
    fontSize: 13,
    color: '#af2800',
    fontWeight: '600',
  },

  // Buttons
  primaryBtn: {
    height: 52,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eeeeee',
  },
  dividerLabel: {
    fontSize: 13,
    color: '#b0b0b0',
    fontWeight: '500',
  },

  // Google
  googleBtn: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  gIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0a',
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  toggleBase: {
    fontSize: 14,
    color: '#888888',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#af2800',
  },
});
