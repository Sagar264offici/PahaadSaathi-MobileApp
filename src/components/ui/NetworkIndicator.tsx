import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';

export type ConnectivityStatus =
  | 'ONLINE'
  | 'LIMITED_CONNECTIVITY'
  | 'OFFLINE_WITH_CELLULAR'
  | 'OFFLINE_WITHOUT_CELLULAR'
  | 'SYNCING'
  | 'UNKNOWN';

interface NetworkIndicatorProps {
  status: ConnectivityStatus;
  compact?: boolean;
}

export function NetworkIndicator({ status, compact = false }: NetworkIndicatorProps) {
  const getConfig = () => {
    switch (status) {
      case 'ONLINE':
        return {
          label: 'Online',
          detail: 'Connected to Emergency Cloud',
          color: Palette.verifiedGreen,
          bg: Palette.verifiedGreenLight,
        };
      case 'LIMITED_CONNECTIVITY':
        return {
          label: 'Limited Connection',
          detail: 'High latency / unstable network',
          color: Palette.saffron,
          bg: Palette.saffronLight,
        };
      case 'OFFLINE_WITH_CELLULAR':
        return {
          label: 'Cellular Only',
          detail: 'No Internet • SMS Emergency Fallback Ready',
          color: Palette.pineForestMuted,
          bg: Palette.pineForestContainer,
        };
      case 'OFFLINE_WITHOUT_CELLULAR':
        return {
          label: 'Offline (No Signal)',
          detail: 'Local SQLite & Bluetooth Store-and-Forward Active',
          color: Palette.rescueRed,
          bg: Palette.rescueRedLight,
        };
      case 'SYNCING':
        return {
          label: 'Syncing',
          detail: 'Uploading pending offline queue...',
          color: Palette.infoBlue,
          bg: Palette.infoBlueLight,
        };
      case 'UNKNOWN':
      default:
        return {
          label: 'Checking Network',
          detail: 'Verifying backend reachability...',
          color: Palette.slateMuted,
          bg: Palette.stoneLight,
        };
    }
  };

  const config = getConfig();

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: config.bg }]}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.compactText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.fullContainer, { backgroundColor: config.bg, borderColor: config.color }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <View style={styles.textColumn}>
        <Text style={[styles.labelTitle, { color: config.color }]}>{config.label}</Text>
        <Text style={styles.labelDetail}>{config.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginHorizontal: Spacing.screenPadding,
    marginVertical: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  compactText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    textTransform: 'uppercase',
  },
  textColumn: {
    flex: 1,
  },
  labelTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodySm,
  },
  labelDetail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slate,
    marginTop: 1,
  },
});
