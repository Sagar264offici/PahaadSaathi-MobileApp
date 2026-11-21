import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';

export type IncidentStatus =
  | 'reported'
  | 'under_review'
  | 'corroborated'
  | 'verified'
  | 'confirmed_closure'
  | 'resolved'
  | 'rejected'
  | 'sample';

interface StatusLabelProps {
  status: IncidentStatus | string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  showDot?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dotColor: string; bg: string; text: string }
> = {
  reported: {
    label: 'Reported',
    dotColor: Palette.saffron,
    bg: Palette.saffronLight,
    text: Palette.saffronMuted,
  },
  under_review: {
    label: 'Under Review',
    dotColor: Palette.infoBlue,
    bg: Palette.infoBlueLight,
    text: Palette.infoBlue,
  },
  corroborated: {
    label: 'Community Corroborated',
    dotColor: Palette.verifiedGreen,
    bg: Palette.verifiedGreenLight,
    text: Palette.verifiedGreen,
  },
  verified: {
    label: 'Authority Verified',
    dotColor: Palette.pineForest,
    bg: Palette.pineForestContainer,
    text: Palette.pineForest,
  },
  confirmed_closure: {
    label: 'Confirmed Closure',
    dotColor: Palette.rescueRed,
    bg: Palette.rescueRedLight,
    text: Palette.rescueRed,
  },
  resolved: {
    label: 'Resolved',
    dotColor: Palette.verifiedGreen,
    bg: Palette.verifiedGreenLight,
    text: Palette.verifiedGreen,
  },
  rejected: {
    label: 'Rejected',
    dotColor: Palette.slateMuted,
    bg: Palette.stoneLight,
    text: Palette.slateMuted,
  },
  sample: {
    label: 'Demo Data',
    dotColor: Palette.slateMuted,
    bg: Palette.stoneLight,
    text: Palette.slateMuted,
  },
};

export function StatusLabel({ status, style, textStyle, showDot = true }: StatusLabelProps) {
  const config = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, ' '),
    dotColor: Palette.slateMuted,
    bg: Palette.stoneLight,
    text: Palette.slate,
  };

  return (
    <View style={[styles.container, { backgroundColor: config.bg }, style]}>
      {showDot && <View style={[styles.dot, { backgroundColor: config.dotColor }]} />}
      <Text style={[styles.text, { color: config.text }, textStyle]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  text: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    letterSpacing: Typography.letterSpacing.normal,
    textTransform: 'uppercase',
  },
});
