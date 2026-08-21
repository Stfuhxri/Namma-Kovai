import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';

/**
 * Root index — decides where to send the user:
 * - No language set → Language selection screen
 * - Auth loading → null (keep splash screen)
 * - Language set, not logged in → Login screen
 * - Logged in → Main tabs
 */
export default function Index() {
  const [destination, setDestination] = useState<string | null>(null);
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const [hasLanguage, setHasLanguage] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const bootstrapLanguage = async () => {
      const language = await AsyncStorage.getItem('@namma_kovai_language');
      setHasLanguage(!!language);
      setLanguageLoaded(true);
    };

    bootstrapLanguage();
  }, []);

  useEffect(() => {
    if (!languageLoaded || authLoading) return;

    if (!hasLanguage) {
      setDestination('/(auth)/language');
      return;
    }

    if (user) {
      setDestination('/(tabs)');
    } else {
      setDestination('/(auth)/login');
    }
  }, [languageLoaded, hasLanguage, authLoading, user]);

  if (!destination) return null;
  return <Redirect href={destination as any} />;
}
