/**
 * Theme hook for PahaadSaathi
 * Provides theme context and toggle functionality
 */

import { useAppTheme } from '@/context/ThemeContext';
import { themeColors, Theme } from '@/theme/theme';
import type { ThemeName } from '@/theme/theme';

type ThemeContextType = {
  theme: Theme;
  themeName: ThemeName;
  toggleTheme: () => void;
  setTheme: (themeName: ThemeName) => void;
  isDark: boolean;
};

export function useTheme(): ThemeContextType {
  const { theme: themeName, toggleTheme, setTheme, isDark } = useAppTheme();
  const theme = themeColors[themeName];

  return {
    theme,
    themeName,
    isDark,
    setTheme,
    toggleTheme,
  };
}

export { themeColors, ThemeName, Theme };
export { ThemeContextType as ThemeContext };
