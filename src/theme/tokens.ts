/**
 * PahaadSaathi Brand Design Tokens
 * Mountain-inspired, high-contrast, accessible emergency palette
 */

export const Palette = {
  // Brand & Mountain Identity
  alpineInk: '#002116',
  pineForest: '#003425',
  pineForestLight: '#174B3A',
  pineForestMuted: '#296A4E',
  pineForestContainer: '#AEF1CE',

  // Surfaces & Backgrounds
  glacier: '#F2FCF2',
  glacierDark: '#E6F1E7',
  snow: '#FFFFFF',
  surfaceDark: '#0B130E',
  surfaceDarkElevated: '#151E18',
  surfaceDarkBorder: '#233127',

  // Neutrals & Slate
  slate: '#404944',
  slateMuted: '#707974',
  slateBorder: '#C0C9C3',
  stone: '#DDE5DF',
  stoneLight: '#EDF5EF',

  // Critical Emergency & Warning
  rescueRed: '#BA1A1A',
  rescueRedLight: '#FFDAD6',
  rescueRedContainer: '#93000A',
  saffron: '#D97706',
  saffronLight: '#FEF3C7',
  saffronMuted: '#B45309',

  // Status & Telemetry
  verifiedGreen: '#15803D',
  verifiedGreenLight: '#DCFCE7',
  infoBlue: '#1D4ED8',
  infoBlueLight: '#DBEAFE',
};

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    mono: 'Courier',
  },
  fontSize: {
    caption: 11,
    labelSm: 12,
    bodySm: 13,
    bodyMd: 14,
    bodyLg: 16,
    subheading: 18,
    headingSm: 20,
    headingMd: 24,
    headingLg: 28,
    display: 34,
  },
  lineHeight: {
    caption: 14,
    labelSm: 16,
    bodySm: 18,
    bodyMd: 20,
    bodyLg: 24,
    subheading: 24,
    headingSm: 28,
    headingMd: 32,
    headingLg: 36,
    display: 42,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 16,
  screenPadding: 16,
  sectionGap: 24,
  touchTarget: 48,
  primaryActionHeight: 56,
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyGlow: {
    shadowColor: Palette.rescueRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};
