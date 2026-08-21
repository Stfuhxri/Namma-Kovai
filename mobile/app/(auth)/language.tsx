import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { saveLanguage, LanguageCode } from '@/i18n';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const LANGUAGES = [
  { code: 'ta' as LanguageCode, nativeName: 'தமிழ்', name: 'Tamil' },
  { code: 'en' as LanguageCode, nativeName: 'Eng', name: 'English' },
  { code: 'hi' as LanguageCode, nativeName: 'हिन्दी', name: 'Hindi' },
  { code: 'kn' as LanguageCode, nativeName: 'ಕನ್ನಡ', name: 'Kannada' },
  { code: 'te' as LanguageCode, nativeName: 'తెలుగు', name: 'Telugu' },
  { code: 'ml' as LanguageCode, nativeName: 'മല', name: 'Malayalam' },
  { code: 'fr' as LanguageCode, nativeName: 'Fr', name: 'French' },
  { code: 'de' as LanguageCode, nativeName: 'De', name: 'German' },
  { code: 'es' as LanguageCode, nativeName: 'Esp', name: 'Spanish' },
] as const;

export default function LanguageScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<LanguageCode>('ta');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (code: LanguageCode) => {
    setSelected(code);
    await saveLanguage(code);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = () => {
    router.push('/(auth)/login');
  };

  // Unique border-radius per card for the organic aesthetic
  const cardRadii = [
    { tl: 32, tr: 16, br: 32, bl: 24 },
    { tl: 16, tr: 32, br: 24, bl: 32 },
    { tl: 32, tr: 24, br: 16, bl: 32 },
    { tl: 24, tr: 32, br: 32, bl: 16 },
    { tl: 16, tr: 24, br: 32, bl: 32 },
    { tl: 32, tr: 16, br: 24, bl: 32 },
    { tl: 24, tr: 32, br: 16, bl: 24 },
    { tl: 32, tr: 24, br: 32, bl: 16 },
    { tl: 16, tr: 32, br: 24, bl: 32 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('language.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('language.search')}
            placeholderTextColor={Colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Language Grid */}
        <View style={styles.grid}>
          {filteredLanguages.map((lang, index) => {
            const isActive = selected === lang.code;
            const radii = cardRadii[index % cardRadii.length];
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langCard,
                  {
                    borderTopLeftRadius: radii.tl,
                    borderTopRightRadius: radii.tr,
                    borderBottomRightRadius: radii.br,
                    borderBottomLeftRadius: radii.bl,
                    backgroundColor: isActive ? Colors.primary : Colors.surfaceContainerLowest,
                    borderColor: isActive ? Colors.secondary : Colors.onSurface,
                    borderWidth: isActive ? 3 : 1,
                  },
                ]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.langNative,
                    { color: isActive ? Colors.onPrimary : Colors.onSurface },
                  ]}
                >
                  {lang.nativeName}
                </Text>
                <Text
                  style={[
                    styles.langName,
                    { color: isActive ? Colors.secondary : Colors.onSurfaceVariant },
                  ]}
                >
                  {lang.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Editorial Section */}
        <View style={styles.editorial}>
          <Text style={styles.editorialTitle}>{t('language.localization')}</Text>
          <Text style={styles.editorialDesc}>{t('language.localizationDesc')}</Text>
        </View>

        {/* Spacer for CTA */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{t('common.continue').toUpperCase()}</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  header: {
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTitle: {
    ...Typography.headlineLg,
    color: Colors.onSurface,
    fontSize: 28,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: Colors.onSurface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    height: 56,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: Spacing.base,
    color: Colors.onSurface,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    padding: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
    marginBottom: Spacing.md,
  },
  langCard: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  langNative: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  langName: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  editorial: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderLeftWidth: 8,
    borderLeftColor: Colors.secondary,
    marginTop: Spacing.md,
  },
  editorialTitle: {
    ...Typography.headlineMd,
    color: Colors.onPrimary,
    marginBottom: Spacing.xs,
  },
  editorialDesc: {
    ...Typography.bodyMd,
    color: '#cccccc',
    lineHeight: 24,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  ctaButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaText: {
    ...Typography.headlineMd,
    color: Colors.onPrimary,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  ctaArrow: {
    fontSize: 22,
    color: Colors.onPrimary,
  },
});
