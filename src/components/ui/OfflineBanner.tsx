import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';

interface OfflineBannerProps {
  pendingCount: number;
  lastSyncedAt?: string;
  onSyncPress?: () => void;
  syncing?: boolean;
}

export function OfflineBanner({
  pendingCount,
  lastSyncedAt,
  onSyncPress,
  syncing = false,
}: OfflineBannerProps) {
  if (pendingCount === 0 && !lastSyncedAt) {
    return null;
  }

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.infoRow}>
        <View style={styles.statusDot} />
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>
            {pendingCount > 0
              ? `${pendingCount} report${pendingCount > 1 ? 's' : ''} stored safely offline`
              : 'All emergency reports synchronized'}
          </Text>
          {lastSyncedAt && (
            <Text style={styles.subtitleText}>Last synced: {lastSyncedAt}</Text>
          )}
        </View>
        {pendingCount > 0 && onSyncPress && (
          <Pressable
            onPress={onSyncPress}
            disabled={syncing}
            style={({ pressed }) => [
              styles.syncButton,
              { opacity: syncing ? 0.6 : pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.syncButtonText}>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: Palette.pineForestContainer,
    borderBottomWidth: 1,
    borderBottomColor: '#6EE7B7',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.pineForest,
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodySm,
    color: Palette.pineForest,
  },
  subtitleText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestMuted,
  },
  syncButton: {
    backgroundColor: Palette.pineForest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    marginLeft: Spacing.sm,
  },
  syncButtonText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.snow,
    textTransform: 'uppercase',
  },
});
