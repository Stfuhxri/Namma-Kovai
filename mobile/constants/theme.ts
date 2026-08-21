/**
 * Namma Kovai — Chromatic Mono Design System Tokens
 *
 * Primary: Black (#000000)
 * Secondary / Accent: Red (#af2800 / #db3400)
 * Typography: Bricolage Grotesque (headlines) + Hanken Grotesk (body)
 * Base unit: 8px
 */

export const Colors = {
  // Core Chromatic Mono palette
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#1b1b1b',
  onPrimaryContainer: '#e2e2e2',
  primaryFixed: '#e2e2e2',

  secondary: '#af2800',
  secondaryContainer: '#db3400',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#fffbff',


  // Surfaces
  background: '#f9f9f9',
  surface: '#f9f9f9',
  surfaceBright: '#f9f9f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f3f3',
  surfaceContainer: '#eeeeee',
  surfaceContainerHigh: '#e8e8e8',
  surfaceContainerHighest: '#e2e2e2',
  surfaceDim: '#dadada',
  surfaceVariant: '#e2e2e2',

  // On-surface
  onBackground: '#1a1c1c',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#4c4546',

  // Outline
  outline: '#7e7576',
  outlineVariant: '#cfc4c5',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Special
  inverseSurface: '#2f3131',
  inverseOnSurface: '#f1f1f1',
  inversePrimary: '#c6c6c6',
} as const;

export const Spacing = {
  xs: 4,
  sm: 12,
  base: 8,
  md: 24,
  lg: 48,
  xl: 80,
  gutter: 24,
  marginMobile: 16,
  marginDesktop: 64,
  containerPadding: 16,
} as const;

export const BorderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Typography = {
  // Font families
  fontGeneralSans: 'GeneralSans-Regular',
  fontBricolage: 'GeneralSans-Bold',
  fontHanken: 'GeneralSans-Regular',

  // Display / Headlines (General Sans Bold)
  displayLg: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -0.96, // -0.02em
    fontWeight: '800' as const,
  },
  headlineLg: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.64, // ~-0.02em
    fontWeight: '800' as const,
  },
  headlineMd: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
  },
  headlineSm: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },

  // Body (General Sans Regular)
  bodyLg: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400' as const,
  },
  bodyMd: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodySm: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },

  // Labels (General Sans Medium & Semibold)
  labelLg: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28, // 0.02em
    fontWeight: '600' as const,
  },
  labelSm: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0.6, // 0.05em
    fontWeight: '700' as const,
  },
} as const;


export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;
