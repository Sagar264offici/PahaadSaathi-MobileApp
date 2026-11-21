import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Palette, Spacing, Typography } from '@/theme/tokens';
import { AppButton } from './AppButton';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  style,
  titleStyle,
  descriptionStyle,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      <Text style={[styles.description, descriptionStyle]}>{description}</Text>
      {actionLabel && onAction && (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sectionGap,
  },
  iconContainer: {
    marginBottom: Spacing.md,
    opacity: 0.85,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    lineHeight: Typography.lineHeight.subheading,
    color: Palette.slate,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
    lineHeight: Typography.lineHeight.bodySm,
    color: Palette.slateMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionButton: {
    marginTop: Spacing.lg,
  },
});
