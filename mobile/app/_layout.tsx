import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '@/i18n';

import ErrorBoundary from './ErrorBoundary';
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    GeneralSans: require('@/assets/fonts/GeneralSans-Regular.ttf'),
    'GeneralSans-Regular': require('@/assets/fonts/GeneralSans-Regular.ttf'),
    'GeneralSans-Medium': require('@/assets/fonts/GeneralSans-Medium.ttf'),
    'GeneralSans-Semibold': require('@/assets/fonts/GeneralSans-Semibold.ttf'),
    'GeneralSans-Bold': require('@/assets/fonts/GeneralSans-Bold.ttf'),

    // Fallbacks for component compatibility
    BricolageGrotesque: require('@/assets/fonts/GeneralSans-Bold.ttf'),
    'BricolageGrotesque-ExtraBold': require('@/assets/fonts/GeneralSans-Bold.ttf'),
    HankenGrotesk: require('@/assets/fonts/GeneralSans-Regular.ttf'),
    'HankenGrotesk-Bold': require('@/assets/fonts/GeneralSans-Bold.ttf'),
  });

  const [i18nError, setI18nError] = useState<Error | null>(null);

  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch((e) => setI18nError(e));
  }, []);

  useEffect(() => {
    if (fontError) throw fontError;
    if (i18nError) throw i18nError;
  }, [fontError, i18nError]);

  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nReady]);

  if (!fontsLoaded || !i18nReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <I18nextProvider i18n={i18n}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="route/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="bus/sos" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="bus/[id]" options={{ presentation: 'fullScreenModal' }} />
          </Stack>
        </I18nextProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
