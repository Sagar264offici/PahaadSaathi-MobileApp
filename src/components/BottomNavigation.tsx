import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, Users, Map, ShieldAlert, User } from 'lucide-react-native';
import { Palette, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/hooks/useTheme';

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const isDark = theme.name === 'dark';

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Community', path: '/community', icon: Users },
    { label: 'SOS', path: '/emergency', icon: ShieldAlert, isSos: true },
    { label: 'Map', path: '/map', icon: Map },
    { label: 'Profile', path: '/account', icon: User },
  ];

  return (
    <View
      accessibilityRole="navigation"
      {...({ role: 'navigation', 'aria-label': 'Main Navigation' } as any)}
      style={[
        styles.navWrapper,
        {
          backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
          borderTopColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
        },
      ]}
    >
      <View
        accessibilityRole="tablist"
        {...({ role: 'tablist', 'aria-label': 'Navigation Tabs' } as any)}
        style={styles.container}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          if (item.isSos) {
            return (
              <Pressable
                key={item.label}
                style={styles.sosItem}
                onPress={() => router.push(item.path as any)}
                accessibilityRole="button"
                accessibilityLabel="Emergency SOS"
                {...({ role: 'button' } as any)}
              >
                <View style={styles.sosCircle}>
                  <Icon size={24} color={Palette.snow} />
                </View>
                <Text style={styles.sosText}>SOS</Text>
              </Pressable>
            );
          }

          const iconColor = isActive
            ? isDark
              ? Palette.pineForestContainer
              : Palette.pineForest
            : isDark
            ? '#CBD5E1'
            : Palette.slateMuted;

          return (
            <Pressable
              key={item.label}
              style={styles.navItem}
              onPress={() => router.push(item.path as any)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              {...({ role: 'tab', 'aria-selected': isActive } as any)}
            >
              <Icon size={20} color={iconColor} />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: iconColor,
                    fontWeight: isActive ? '700' : '600',
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrapper: {
    borderTopWidth: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    paddingHorizontal: Spacing.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    marginTop: 3,
  },
  sosItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  sosCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.rescueRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.rescueRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  sosText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Palette.rescueRed,
    marginTop: 2,
    letterSpacing: Typography.letterSpacing.wider,
  },
});
