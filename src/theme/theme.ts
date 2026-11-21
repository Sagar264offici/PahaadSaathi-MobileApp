import { useState, useEffect, useCallback } from 'react';
import { Appearance } from 'react-native';

export type ThemeName = 'light' | 'dark';

export type Theme = {
  name: ThemeName;
  background: string;
  backgroundSecondary: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  borderLight: string;
  statusHigh: string;
  statusMedium: string;
  statusLow: string;
  statusSample: string;
  statusReported: string;
  statusUnderReview: string;
  statusCorroborated: string;
  statusConfirmedClosure: string;
  statusResolved: string;
  statusRejected: string;
  cardBackground: string;
  cardBorder: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  placeholderText: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  buttonOutline: string;
  buttonOutlineText: string;
  navBackground: string;
  navActive: string;
  navInactive: string;
  overlay: string;
  backdrop: string;
};

export const lightTheme: Theme = {
  name: 'light',
  background: '#FFFDF5',
  backgroundSecondary: '#F4F6F8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#5B4A3E',
  textTertiary: '#8A735B',
  primary: '#EA580C',
  primaryLight: '#FFF7ED',
  primaryDark: '#9C4221',
  success: '#15803D',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  border: '#FED7AA',
  borderLight: '#FDBA74',
  statusHigh: '#EA580C',
  statusMedium: '#D97706',
  statusLow: '#15803D',
  statusSample: '#8A735B',
  statusReported: '#EA580C',
  statusUnderReview: '#D97706',
  statusCorroborated: '#15803D',
  statusConfirmedClosure: '#DC2626',
  statusResolved: '#059669',
  statusRejected: '#6B7280',
  cardBackground: '#FFFFFF',
  cardBorder: '#FED7AA',
  inputBackground: '#FFFFFF',
  inputBorder: '#D4D4D4',
  inputText: '#3B2F2F',
  placeholderText: '#8A735B',
  buttonPrimary: '#EA580C',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#15803D',
  buttonSecondaryText: '#FFFFFF',
  buttonOutline: '#FDBA74',
  buttonOutlineText: '#3B2F2F',
  navBackground: '#FFFFFF',
  navActive: '#EA580C',
  navInactive: '#8A735B',
  overlay: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.4)',
};

export const darkTheme: Theme = {
  name: 'dark',
  background: '#0A0A0F',
  backgroundSecondary: '#14151E',
  surface: '#161823',
  textPrimary: '#F5F5FA',
  textSecondary: '#A0A8B0',
  textTertiary: '#6B7280',
  primary: '#EA580C',
  primaryLight: '#1E3A5F',
  primaryDark: '#0A58CA',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  border: '#2A2B35',
  borderLight: '#333540',
  statusHigh: '#EF4444',
  statusMedium: '#F59E0B',
  statusLow: '#22C55E',
  statusSample: '#8A735B',
  statusReported: '#EF4444',
  statusUnderReview: '#F59E0B',
  statusCorroborated: '#22C55E',
  statusConfirmedClosure: '#EF4444',
  statusResolved: '#22C55E',
  statusRejected: '#6B7280',
  cardBackground: '#161823',
  cardBorder: '#2A2B35',
  inputBackground: '#161823',
  inputBorder: '#3A3B45',
  inputText: '#F5F5FA',
  placeholderText: '#6B7280',
  buttonPrimary: '#EA580C',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#15803D',
  buttonSecondaryText: '#FFFFFF',
  buttonOutline: '#2A2B35',
  buttonOutlineText: '#FFFFFF',
  navBackground: '#161823',
  navActive: '#EA580C',
  navInactive: '#6B7280',
  overlay: 'rgba(0, 0, 0, 0.7)',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

export const themeColors: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};

export type ThemeContextType = {
  theme: Theme;
  themeName: ThemeName;
  toggleTheme: () => void;
  setTheme: (themeName: ThemeName) => void;
  isDark: boolean;
};

export function useTheme(): ThemeContextType {
  const [themeName, setThemeName] = useState<ThemeName>('light');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === 'light' || colorScheme === 'dark') {
        setThemeName(colorScheme);
      }
    });
    return () => subscription.remove();
  }, []);

  const theme = themeColors[themeName];

  const setTheme = useCallback((themeName: ThemeName) => {
    setThemeName(themeName);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return {
    theme,
    themeName,
    isDark: themeName === 'dark',
    setTheme,
    toggleTheme,
  };
}

export { useTheme as useThemeHook };
