import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({ label, variant = 'neutral', icon, style, textStyle }: BadgeProps) {
  const getBadgeColors = (): { bg: string; text: string; border: string } => {
    switch (variant) {
      case 'success':
        return {
          bg: Palette.verifiedGreenLight,
          text: Palette.verifiedGreen,
          border: '#86EFAC',
        };
      case 'warning':
        return {
          bg: Palette.saffronLight,
          text: Palette.saffronMuted,
          border: '#FDE68A',
        };
      case 'danger':
        return {
          bg: Palette.rescueRedLight,
          text: Palette.rescueRed,
          border: '#FECACA',
        };
      case 'info':
        return {
          bg: Palette.infoBlueLight,
          text: Palette.infoBlue,
          border: '#BFDBFE',
        };
      case 'brand':
        return {
          bg: Palette.pineForestContainer,
          text: Palette.pineForest,
          border: '#6EE7B7',
        };
      case 'neutral':
      default:
        return {
          bg: Palette.stoneLight,
          text: Palette.slate,
          border: Palette.stone,
        };
    }
  };

  const colors = getBadgeColors();

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text
        style={[
          styles.badgeText,
          {
            color: colors.text,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  iconWrapper: {
    marginRight: 4,
  },
  badgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    lineHeight: Typography.lineHeight.caption,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
});
