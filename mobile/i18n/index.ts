import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import ta from './ta.json';

const LANGUAGE_KEY = '@namma_kovai_language';

export const supportedLanguages = [
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'en', name: 'English', nativeName: 'Eng' },
] as const;

export type LanguageCode = typeof supportedLanguages[number]['code'];

export const initI18n = async () => {
  let savedLanguage: string | null = null;
  try {
    savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    // ignore read errors
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        ta: { translation: ta },
      },
      lng: savedLanguage ?? 'ta', // Default to Tamil for Coimbatore users
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      compatibilityJSON: 'v3',
    });

  return i18n;
};

export const saveLanguage = async (code: LanguageCode) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, code);
    await i18n.changeLanguage(code);
  } catch {
    // ignore write errors
  }
};

export const getSavedLanguage = async (): Promise<LanguageCode | null> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    return (saved as LanguageCode) ?? null;
  } catch {
    return null;
  }
};

export default i18n;
