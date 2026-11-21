import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ShieldAlert,
  AlertTriangle,
  Users,
  MapPin,
  Building2,
  PhoneCall,
  BookOpen,
  ChevronRight,
  Radio,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';
import {
  Hazard,
  getHazards,
  subscribe,
  getOfflineQueue,
  syncOfflineQueue,
} from '@/data/hazardStore';
import { communityStore } from '@/data/communityStore';
import { MOUNTAIN_SAFETY_GUIDES } from '@/data/safetyGuides';
import { UTTARAKHAND_EMERGENCY_DIRECTORY } from '@/lib/sms/directory';
import { useConnectivity } from '@/hooks/useConnectivity';
import { NetworkIndicator, ConnectivityStatus } from '@/components/ui/NetworkIndicator';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Badge } from '@/components/ui/Badge';
import { StatusLabel } from '@/components/ui/StatusLabel';
import { BottomNavigation } from '@/components/BottomNavigation';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isOnline } = useConnectivity();

  const [hazards, setHazards] = useState<Hazard[]>(getHazards());
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');

  const activeCommunity = communityStore.getCommunities()[0]; // Default to Joshimath, Chamoli

  useEffect(() => {
    const unsubHazards = subscribe((items) => setHazards(items));
    (async () => {
      try {
        const queued = await getOfflineQueue();
        setQueueCount(queued.length);
      } catch {
        setQueueCount(0);
      }
    })();
    return () => unsubHazards();
  }, []);

  const handleSyncQueue = useCallback(async () => {
    setSyncing(true);
    try {
      await syncOfflineQueue();
      const queued = await getOfflineQueue();
      setQueueCount(queued.length);
      Alert.alert('Sync Successful', 'Offline reports synchronized with emergency server.');
    } catch {
      Alert.alert('Sync Failed', 'Could not connect to emergency server. Stored safely locally.');
    } finally {
      setSyncing(false);
    }
  }, []);

  const connectivityState: ConnectivityStatus = isOnline === false
    ? 'OFFLINE_WITH_CELLULAR'
    : isOnline === true
    ? 'ONLINE'
    : 'UNKNOWN';

  const isDark = theme.name === 'dark';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: isDark ? Palette.surfaceDark : Palette.glacier,
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
            borderBottomColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandLogoCircle}>
            <Radio size={18} color={Palette.snow} />
          </View>
          <View>
            <Text
              style={[
                styles.brandTitle,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              PAHAADSAATHI
            </Text>
            <View style={styles.communitySubhead}>
              <MapPin size={12} color={Palette.pineForestMuted} />
              <Text style={styles.communityText}>
                {activeCommunity.name}, {activeCommunity.district} Sector
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerControls}>
          <Pressable
            style={styles.langToggle}
            onPress={() => setSelectedLanguage(selectedLanguage === 'en' ? 'hi' : 'en')}
          >
            <Text style={styles.langText}>
              {selectedLanguage === 'en' ? 'हिन्दी' : 'EN'}
            </Text>
          </Pressable>
          <ThemeToggle />
        </View>
      </View>

      {/* Connectivity & Offline Banner */}
      <NetworkIndicator status={connectivityState} />
      <OfflineBanner
        pendingCount={queueCount}
        syncing={syncing}
        onSyncPress={handleSyncQueue}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Urgent Primary SOS Trigger Banner */}
        <Pressable
          style={styles.sosEmergencyBanner}
          onPress={() => router.push('/emergency')}
          accessibilityRole="button"
          accessibilityLabel="Open Emergency Assistance SOS"
        >
          <View style={styles.sosBannerLeft}>
            <View style={styles.sosPulseIcon}>
              <ShieldAlert size={28} color={Palette.snow} />
            </View>
            <View style={styles.sosBannerTextGroup}>
              <Text style={styles.sosBannerTitle}>EMERGENCY ASSISTANCE (SOS)</Text>
              <Text style={styles.sosBannerSub}>
                1-Touch Disaster Dispatch • GPS Telemetry • Offline SMS Fallback
              </Text>
            </View>
          </View>
          <ChevronRight size={22} color={Palette.snow} />
        </Pressable>

        {/* Core Actions Grid */}
        <View style={styles.actionGrid}>
          <Pressable
            style={[
              styles.actionTile,
              {
                backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
              },
            ]}
            onPress={() => router.push('/report')}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: Palette.saffronLight }]}>
              <AlertTriangle size={22} color={Palette.saffron} />
            </View>
            <Text
              style={[
                styles.tileTitle,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              Report Hazard
            </Text>
            <Text style={styles.tileSub}>Landslides, washouts, road blocks</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionTile,
              {
                backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
              },
            ]}
            onPress={() => router.push('/community' as any)}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: Palette.pineForestContainer }]}>
              <Users size={22} color={Palette.pineForest} />
            </View>
            <Text
              style={[
                styles.tileTitle,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              Community Aid
            </Text>
            <Text style={styles.tileSub}>Help exchange, local feed & volunteers</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionTile,
              {
                backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
              },
            ]}
            onPress={() => router.push('/map')}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: Palette.infoBlueLight }]}>
              <MapPin size={22} color={Palette.infoBlue} />
            </View>
            <Text
              style={[
                styles.tileTitle,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              Hazard Map
            </Text>
            <Text style={styles.tileSub}>Shelters, routes & blocked passes</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionTile,
              {
                backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
              },
            ]}
            onPress={() => router.push('/control-room' as any)}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: Palette.verifiedGreenLight }]}>
              <Building2 size={22} color={Palette.verifiedGreen} />
            </View>
            <Text
              style={[
                styles.tileTitle,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              Control Room
            </Text>
            <Text style={styles.tileSub}>DDMA & SDRF incident verification</Text>
          </Pressable>
        </View>

        {/* Active Local Mountain Hazards */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? Palette.snow : Palette.pineForest },
            ]}
          >
            Active Mountain Hazards & Alerts
          </Text>
          <Pressable onPress={() => router.push('/map')}>
            <Text style={styles.viewAllText}>View Map →</Text>
          </Pressable>
        </View>

        {hazards.slice(0, 3).map((item) => (
          <View
            key={item.id}
            style={[
              styles.incidentCard,
              {
                backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
              },
            ]}
          >
            <View style={styles.incidentTop}>
              <Badge label={item.type} variant="brand" />
              <StatusLabel status={item.status} />
            </View>
            <Text
              style={[
                styles.incidentLocation,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              {item.location}
            </Text>
            <Text
              style={[
                styles.incidentDesc,
                { color: isDark ? Palette.stone : Palette.slate },
              ]}
            >
              {item.description}
            </Text>
          </View>
        ))}

        {/* Offline Bilingual Safety Guides */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <BookOpen size={18} color={Palette.pineForestMuted} />
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              {selectedLanguage === 'en'
                ? 'Offline Mountain Safety Guides'
                : 'पर्वतीय आपदा सुरक्षा निर्देशिका'}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.guidesScroll}>
          {MOUNTAIN_SAFETY_GUIDES.map((guide) => (
            <View
              key={guide.id}
              style={[
                styles.guideCard,
                {
                  backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                  borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                },
              ]}
            >
              <Badge
                label={guide.category.replace('_', ' ').toUpperCase()}
                variant={guide.severity === 'critical' ? 'danger' : 'warning'}
              />
              <Text
                style={[
                  styles.guideTitle,
                  { color: isDark ? Palette.snow : Palette.pineForest },
                ]}
              >
                {selectedLanguage === 'en' ? guide.titleEn : guide.titleHi}
              </Text>
              <Text style={styles.guideDoItem}>
                • {selectedLanguage === 'en' ? guide.dosEn[0] : guide.dosHi[0]}
              </Text>
              <Text style={styles.guideTipText}>
                Tip: {selectedLanguage === 'en' ? guide.offlineTipEn : guide.offlineTipHi}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Quick Emergency Hotlines */}
        <View style={styles.hotlineSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? Palette.snow : Palette.pineForest },
            ]}
          >
            Direct Emergency Lines (Dial Immediately)
          </Text>

          <View style={styles.hotlineGrid}>
            {UTTARAKHAND_EMERGENCY_DIRECTORY.slice(0, 4).map((c) => (
              <Pressable
                key={c.contactId}
                style={[
                  styles.hotlineCard,
                  {
                    backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                    borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                  },
                ]}
                onPress={() => Linking.openURL(`tel:${c.phoneNumber}`)}
              >
                <PhoneCall size={16} color={Palette.rescueRed} />
                <View style={styles.hotlineCardText}>
                  <Text style={styles.hotlineCardNum}>{c.phoneNumber}</Text>
                  <Text style={styles.hotlineCardName} numberOfLines={1}>
                    {c.authorityName}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Persistent 5-Tab Navigation Bar */}
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.pineForest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  brandTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    letterSpacing: 1.2,
  },
  communitySubhead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  communityText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestMuted,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  langToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    backgroundColor: Palette.stoneLight,
  },
  langText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForest,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  sosEmergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.rescueRed,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    shadowColor: Palette.rescueRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  sosBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sosPulseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#93000A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sosBannerTextGroup: {
    flex: 1,
  },
  sosBannerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyLg,
    color: Palette.snow,
  },
  sosBannerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.rescueRedLight,
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionTile: {
    width: '48.5%',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  tileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  tileTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    marginTop: 2,
  },
  tileSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
  },
  viewAllText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestMuted,
  },
  incidentCard: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  incidentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  incidentLocation: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    marginBottom: 4,
  },
  incidentDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
  },
  guidesScroll: {
    flexDirection: 'row',
    marginVertical: Spacing.xs,
  },
  guideCard: {
    width: 260,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  guideTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    marginVertical: Spacing.xs,
  },
  guideDoItem: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slate,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  guideTipText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: 10,
    color: Palette.pineForestMuted,
    marginTop: 4,
  },
  hotlineSection: {
    marginTop: Spacing.md,
  },
  hotlineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  hotlineCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  hotlineCardText: {
    flex: 1,
  },
  hotlineCardNum: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    color: Palette.rescueRed,
  },
  hotlineCardName: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Palette.slateMuted,
  },
});
