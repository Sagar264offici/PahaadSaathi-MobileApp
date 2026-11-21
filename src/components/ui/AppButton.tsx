import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  const getContainerStyle = (pressed: boolean): StyleProp<ViewStyle> => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radii.md,
      minHeight: size === 'lg' ? Spacing.primaryActionHeight : size === 'sm' ? 36 : 46,
      paddingHorizontal: size === 'lg' ? 20 : size === 'sm' ? 12 : 16,
      opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
    };

    switch (variant) {
      case 'primary':
        return [base, { backgroundColor: Palette.pineForest }];
      case 'secondary':
        return [base, { backgroundColor: Palette.pineForestMuted }];
      case 'danger':
        return [base, { backgroundColor: Palette.rescueRed }];
      case 'outline':
        return [
          base,
          {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: Palette.pineForest,
          },
        ];
      case 'ghost':
        return [base, { backgroundColor: 'transparent' }];
      default:
        return base;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return Palette.snow;
      case 'outline':
      case 'ghost':
        return Palette.pineForest;
      default:
        return Palette.snow;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.labelText,
              {
                color: getTextColor(),
                fontSize: size === 'lg' ? Typography.fontSize.bodyLg : size === 'sm' ? Typography.fontSize.bodySm : Typography.fontSize.bodyMd,
                fontWeight: size === 'lg' ? '700' : '600',
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontFamily: Typography.fontFamily.semibold,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});
