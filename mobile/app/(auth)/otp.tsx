import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, usersCol } from '@/services/firebase';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 30; // seconds

export default function OTPScreen() {
  const { t } = useTranslation();
  const { phone, verificationId } = useLocalSearchParams<{
    phone: string;
    verificationId: string;
  }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (digit && index === OTP_LENGTH - 1) {
      const code = newOtp.join('');
      if (code.length === OTP_LENGTH) {
        handleVerify(code);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      Alert.alert(t('common.error'), t('errors.invalidOtp'));
      return;
    }
    if (!verificationId) {
      Alert.alert(t('common.error'), t('errors.authFailed'));
      return;
    }

    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otpCode);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Create user document if new
      const language = (await AsyncStorage.getItem('@namma_kovai_language')) ?? 'ta';
      const userRef = doc(usersCol, user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          phone: user.phoneNumber ?? phone,
          favoriteRoutes: [],
          currentlyRidingBusId: null,
          language: language as 'en' | 'ta',
        });
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('OTP verify error:', error);
      Alert.alert(t('common.error'), t('errors.invalidOtp'));
      // Clear OTP inputs on error
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setTimeLeft(RESEND_TIMEOUT);
    setCanResend(false);
    setOtp(Array(OTP_LENGTH).fill(''));
    router.back();
  };

  const formatTime = (s: number) =>
    `00:${s < 10 ? `0${s}` : s}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{t('otp.title')}</Text>
          <Text style={styles.subtitle}>
            {t('otp.subtitle')}{' '}
            <Text style={styles.phone}>{phone}</Text>
          </Text>
        </View>

        {/* OTP Input Fields */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
              ]}
              value={digit}
              onChangeText={(val) => handleOtpChange(val, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
          onPress={() => handleVerify()}
          disabled={loading || otp.join('').length !== OTP_LENGTH}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.verifyText}>
                {t('otp.verifyButton').toUpperCase()}
              </Text>
              <Text style={styles.verifyArrow}>→</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Resend Section */}
        <View style={styles.resendSection}>
          {!canResend ? (
            <Text style={styles.timerText}>
              {t('otp.resendIn')}{' '}
              <Text style={styles.timerCount}>{formatTime(timeLeft)}</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendBtn}>{t('otp.resendNow')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
    gap: Spacing.md * 1.5,
    justifyContent: 'center',
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.onPrimary,
  },
  titleSection: {
    gap: Spacing.xs,
  },
  title: {
    ...Typography.headlineLg,
    color: Colors.primary,
    fontSize: 36,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    maxWidth: 280,
  },
  phone: {
    color: Colors.primary,
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.base,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 0.75,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.sm,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    maxWidth: 60,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  verifyButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.primary}10`,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
    justifyContent: 'center',
  },
  verifyText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontSize: 13,
    letterSpacing: 1.5,
  },
  verifyArrow: {
    fontSize: 20,
    color: Colors.onPrimary,
  },
  resendSection: {
    alignItems: 'center',
  },
  timerText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  timerCount: {
    color: Colors.secondary,
    fontWeight: '700',
  },
  resendBtn: {
    ...Typography.labelSm,
    color: Colors.primary,
    textDecorationLine: 'underline',
    letterSpacing: 1,
  },
});
