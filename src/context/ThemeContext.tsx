import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppThemeMode = 'dark' | 'light';

export interface AppThemeColors {
  isDark: boolean;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCard: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  inputBorder: string;
  headerBg: string;
  headerBorder: string;
  navBg: string;
  navBorder: string;
  accentGreen: string;
  accentGreenBg: string;
  accentAmber: string;
  accentAmberBg: string;
  accentRed: string;
  accentRedBg: string;
  accentBlue: string;
  accentBlueBg: string;
}

export const DARK_THEME: AppThemeColors = {
  isDark: true,
  bgPrimary: '#0B0D12',
  bgSecondary: '#11141D',
  bgTertiary: '#161A24',
  bgCard: '#11141D',
  borderSubtle: '#1E2332',
  borderStrong: '#2A3245',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  inputBg: '#11141D',
  inputBorder: '#1E2332',
  headerBg: '#0B0D12',
  headerBorder: '#171B26',
  navBg: '#0B0D12',
  navBorder: '#171B26',
  accentGreen: '#10B981',
  accentGreenBg: 'rgba(16, 185, 129, 0.12)',
  accentAmber: '#F59E0B',
  accentAmberBg: 'rgba(245, 158, 11, 0.12)',
  accentRed: '#EF4444',
  accentRedBg: 'rgba(239, 68, 68, 0.12)',
  accentBlue: '#3B82F6',
  accentBlueBg: 'rgba(59, 130, 246, 0.12)',
};

export const LIGHT_THEME: AppThemeColors = {
  isDark: false,
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgTertiary: '#F1F5F9',
  bgCard: '#FFFFFF',
  borderSubtle: '#E2E8F0',
  borderStrong: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  headerBg: '#FFFFFF',
  headerBorder: '#E2E8F0',
  navBg: '#FFFFFF',
  navBorder: '#E2E8F0',
  accentGreen: '#059669',
  accentGreenBg: '#ECFDF5',
  accentAmber: '#D97706',
  accentAmberBg: '#FFFBEB',
  accentRed: '#DC2626',
  accentRedBg: '#FEF2F2',
  accentBlue: '#2563EB',
  accentBlueBg: '#EFF6FF',
};

interface ThemeContextValue {
  theme: AppThemeMode;
  colors: AppThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: AppThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: DARK_THEME,
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = 'pahaadsaathi:theme-mode';
let globalTheme: AppThemeMode = Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
const themeListeners: ((mode: AppThemeMode) => void)[] = [];

export function getGlobalTheme(): AppThemeMode {
  return globalTheme;
}

export function setGlobalTheme(mode: AppThemeMode): void {
  globalTheme = mode;
  Appearance.setColorScheme(mode);
  void AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  for (const fn of themeListeners) fn(mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setLocalTheme] = useState<AppThemeMode>(globalTheme);
  const hasUserSelectedTheme = useRef(false);

  const applyTheme = useCallback((mode: AppThemeMode) => {
    hasUserSelectedTheme.current = true;
    setGlobalTheme(mode);
  }, []);

  useEffect(() => {
    const listener = (newMode: AppThemeMode) => setLocalTheme(newMode);
    themeListeners.push(listener);
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedTheme) => {
      if (active && !hasUserSelectedTheme.current && (savedTheme === 'dark' || savedTheme === 'light')) {
        setGlobalTheme(savedTheme);
      }
    }).catch(() => {});
    return () => {
      active = false;
      const idx = themeListeners.indexOf(listener);
      if (idx >= 0) themeListeners.splice(idx, 1);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [applyTheme, theme]);

  const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme: applyTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
