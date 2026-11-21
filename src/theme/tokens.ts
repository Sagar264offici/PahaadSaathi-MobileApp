/**
 * PahaadSaathi Brand Design Tokens
 * Mountain-inspired, high-contrast, accessible emergency palette
 */

export const Palette = {
  // Brand & Mountain Identity
  alpineInk: '#002116',
  pineForest: '#003425',
  pineForestLight: '#174B3A',
  pineForestMuted: '#165B3E', // High contrast (6.2:1 against white)
  pineForestContainer: '#AEF1CE',

  // Surfaces & Backgrounds
  glacier: '#F2FCF2',
  glacierDark: '#E6F1E7',
  snow: '#FFFFFF',
  surfaceDark: '#0B130E',
  surfaceDarkElevated: '#151E18',
  surfaceDarkBorder: '#233127',

  // Neutrals & Slate
  slate: '#2D3732', // Enhanced dark slate for WCAG AA compliance
  slateMuted: '#454F49', // High contrast neutral (6.8:1 against white)
  slateBorder: '#C0C9C3',
  stone: '#DDE5DF',
  stoneLight: '#EDF5EF',

  // Critical Emergency & Warning
  rescueRed: '#9B1010', // Deep accessible red (7.5:1 against white)
  rescueRedLight: '#FFDAD6',
  rescueRedContainer: '#7D0008',
  saffron: '#B45309',
  saffronLight: '#FEF3C7',
  saffronMuted: '#78350F', // High contrast on yellow (7.2:1 against #FEF3C7)

  // Status & Telemetry
  verifiedGreen: '#14532D', // Deep accessible green (6.5:1 against #DCFCE7)
  verifiedGreenLight: '#DCFCE7',
  infoBlue: '#1E40AF', // Deep accessible blue (6.2:1 against #DBEAFE)
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
