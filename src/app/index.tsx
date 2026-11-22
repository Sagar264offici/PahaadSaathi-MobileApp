import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
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
  Bell,
  ThumbsUp,
  Share2,
  Filter,
  Zap,
  Navigation,
  CheckCircle2,
  Clock,
  X,
  Plus,
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
  corroborateHazard,
  initRealtimeHazardSubscription,
  simulateNearbyHazardUpload,
  refreshHazards,
} from '@/data/hazardStore';
import { calculateHaversineDistanceMeters } from '@/lib/incidents/deduplication';
import { communityStore } from '@/data/communityStore';
import { MOUNTAIN_SAFETY_GUIDES } from '@/data/safetyGuides';
import { UTTARAKHAND_EMERGENCY_DIRECTORY } from '@/lib/sms/directory';
import { useConnectivity } from '@/hooks/useConnectivity';
import { NetworkIndicator, ConnectivityStatus } from '@/components/ui/NetworkIndicator';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Badge } from '@/components/ui/Badge';
import { StatusLabel } from '@/components/ui/StatusLabel';
import { BottomNavigation } from '@/components/BottomNavigation';

type FeedFilter = 'all' | 'nearby' | 'critical' | 'verified';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isOnline } = useConnectivity();

  const [hazards, setHazards] = useState<Hazard[]>(getHazards());
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [corroboratedIds, setCorroboratedIds] = useState<Record<string, boolean>>({});

  // Active user location (defaults to Joshimath, Chamoli Sector coordinates)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 30.5564,
    longitude: 79.5638,
  });

  // Range-based Heads-Up In-App Notification Banner
  const [activeNotification, setActiveNotification] = useState<{
    hazard: Hazard;
    distanceKm: number;
  } | null>(null);

  const notifSlideAnim = useRef(new Animated.Value(-120)).current;

  const triggerProximityNotification = useCallback((hazard: Hazard, distanceKm: number) => {
    setActiveNotification({ hazard, distanceKm });
    try {
      Vibration.vibrate([0, 250, 100, 250]);
    } catch {}

    Animated.spring(notifSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [notifSlideAnim]);

  const dismissNotification = useCallback(() => {
    Animated.timing(notifSlideAnim, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setActiveNotification(null));
  }, [notifSlideAnim]);

  const activeCommunity = communityStore.getCommunities()[0]; // Default Joshimath, Chamoli
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshHazards();
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Request GPS position for precise distance calculation
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {
        // Keeps default Joshimath sector coordinates
      }
    })();
  }, []);

  // Listen to hazard updates & Realtime Supabase broadcast
  useEffect(() => {
    const unsubHazards = subscribe((items) => setHazards(items));

    // Initial fetch from remote Supabase table so all community reports immediately display
    refreshHazards().catch(() => {});

    // Polling fallback every 15s ensures reports from friends appear reliably
    const pollInterval = setInterval(() => {
      refreshHazards().catch(() => {});
    }, 15000);

    // Connect to Supabase Realtime channel for incoming uploads from other users
    const unsubRealtime = initRealtimeHazardSubscription((incomingHazard, dist) => {
      const distance = dist ?? 2.4;
      // If within 25 km range, trigger notification immediately!
      if (distance <= 25) {
        triggerProximityNotification(incomingHazard, distance);
      }
    }, userLocation);

    (async () => {
      try {
        const queued = await getOfflineQueue();
        setQueueCount(queued.length);
      } catch {
        setQueueCount(0);
      }
    })();

    return () => {
      clearInterval(pollInterval);
      unsubHazards();
      unsubRealtime();
    };
  }, [userLocation, triggerProximityNotification]);

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

  const handleCorroborate = useCallback(async (hazardId: string) => {
    if (corroboratedIds[hazardId]) return;
    setCorroboratedIds((prev) => ({ ...prev, [hazardId]: true }));
    try {
      Vibration.vibrate(50);
    } catch {}
    await corroborateHazard(hazardId);
  }, [corroboratedIds]);

  const handleShareHazard = useCallback(async (hazard: Hazard) => {
    try {
      await Share.share({
        title: `PahaadSaathi Hazard Alert: ${hazard.type}`,
        message: `🚨 [PahaadSaathi Alert] ${hazard.type.toUpperCase()} reported at ${hazard.location}.\nStatus: ${hazard.status}\nDetails: ${hazard.description}\nLive link: https://pahaadsaathi-app.vercel.app`,
      });
    } catch {}
  }, []);

  // Simulates: "One guy uploaded and the other ranged guy gets the information through notification"
  const handleSimulateRemoteUpload = useCallback(() => {
    const { hazard, distanceKm } = simulateNearbyHazardUpload(userLocation);
    triggerProximityNotification(hazard, distanceKm);
  }, [userLocation, triggerProximityNotification]);

  // Calculate distance from current user location for each hazard
  const hazardsWithDistance = useMemo(() => {
    return hazards.map((item) => {
      let distanceKm = 2.5; // fallback representative
      if (item.latitude && item.longitude && userLocation) {
        const meters = calculateHaversineDistanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          item.latitude,
          item.longitude
        );
        distanceKm = Math.round((meters / 1000) * 10) / 10;
      }
      return {
        ...item,
        distanceKm,
      };
    });
  }, [hazards, userLocation]);

  // Filtered feed items
  const filteredFeed = useMemo(() => {
    switch (activeFilter) {
      case 'nearby':
        return hazardsWithDistance.filter((h) => h.distanceKm <= 15);
      case 'critical':
        return hazardsWithDistance.filter((h) => h.severity === 'High');
      case 'verified':
        return hazardsWithDistance.filter(
          (h) => h.status === 'corroborated' || h.status === 'confirmed_closure'
        );
      case 'all':
      default:
        return hazardsWithDistance;
    }
  }, [hazardsWithDistance, activeFilter]);

  const nearbyCount = useMemo(() => {
    return hazardsWithDistance.filter((h) => h.distanceKm <= 15).length;
  }, [hazardsWithDistance]);

  const connectivityState: ConnectivityStatus =
    isOnline === false
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

      {/* Floating Range Proximity Notification Toast */}
      {activeNotification && (
        <Animated.View
          style={[
            styles.notificationToast,
            {
              transform: [{ translateY: notifSlideAnim }],
              backgroundColor: isDark ? '#1F1212' : '#FEF2F2',
              borderColor: Palette.rescueRed,
            },
          ]}
        >
          <View style={styles.notifIconCircle}>
            <Bell size={20} color={Palette.snow} />
          </View>
          <View style={styles.notifTextGroup}>
            <View style={styles.notifHeaderRow}>
              <Text style={styles.notifPill}>
                🚨 PROXIMITY ALERT • {activeNotification.distanceKm} km AWAY
              </Text>
              <Pressable
                onPress={dismissNotification}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
              >
                <X size={16} color={Palette.slateMuted} />
              </Pressable>
            </View>
            <Text style={[styles.notifTitle, { color: isDark ? Palette.snow : Palette.pineForest }]}>
              {activeNotification.hazard.type}: {activeNotification.hazard.location}
            </Text>
            <Text style={styles.notifDesc} numberOfLines={2}>
              {activeNotification.hazard.description}
            </Text>
            <View style={styles.notifActionRow}>
              <Pressable
                style={styles.notifActionBtn}
                onPress={() => {
                  dismissNotification();
                  router.push('/map');
                }}
              >
                <Navigation size={13} color={Palette.snow} />
                <Text style={styles.notifActionBtnText}>View on Live Map</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {/* App Header */}
      <View
        accessibilityRole="header"
        {...(Platform.OS === 'web' ? ({ role: 'banner' } as any) : {})}
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
            accessibilityRole="button"
            accessibilityLabel="Toggle Language"
            {...(Platform.OS === 'web' ? ({ role: 'button' } as any) : {})}
          >
            <Text style={styles.langText}>
              {selectedLanguage === 'en' ? 'हिन्दी' : 'EN'}
            </Text>
          </Pressable>
          <ThemeToggle />
        </View>
      </View>

      {/* Main Landmark Container */}
      <View
        {...(Platform.OS === 'web' ? ({ role: 'main' } as any) : {})}
        style={styles.mainContainer}
      >
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? Palette.pineForestContainer : Palette.pineForest}
              colors={[Palette.pineForest]}
            />
          }
          {...(Platform.OS === 'web' ? ({ tabIndex: 0, 'aria-label': 'Live Incident Feed' } as any) : {})}
        >
          {/* Urgent SOS Trigger Banner */}
          <Pressable
            style={styles.sosEmergencyBanner}
            onPress={() => router.push('/emergency')}
            accessibilityRole="button"
            accessibilityLabel="Open Emergency Assistance SOS"
            {...(Platform.OS === 'web' ? ({ role: 'button' } as any) : {})}
          >
            <View style={styles.sosBannerLeft}>
              <View style={styles.sosPulseIcon}>
                <ShieldAlert size={26} color={Palette.snow} />
              </View>
              <View style={styles.sosBannerTextGroup}>
                <Text style={styles.sosBannerTitle}>EMERGENCY ASSISTANCE (SOS)</Text>
                <Text style={styles.sosBannerSub}>
                  1-Touch Dispatch • GPS Telemetry • Offline SMS Fallback
                </Text>
              </View>
            </View>
            <ChevronRight size={22} color={Palette.snow} />
          </Pressable>

          {/* Quick Actions Grid */}
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
              accessibilityRole="button"
              accessibilityLabel="Report Hazard: Landslides, washouts, road blocks"
              {...(Platform.OS === 'web' ? ({ role: 'button' } as any) : {})}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: Palette.saffronLight }]}>
                <AlertTriangle size={20} color={Palette.saffron} />
              </View>
              <Text
                style={[
                  styles.tileTitle,
                  { color: isDark ? Palette.snow : Palette.pineForest },
                ]}
              >
                Report Hazard
              </Text>
              <Text style={styles.tileSub}>Alert nearby drivers</Text>
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
              accessibilityRole="button"
              accessibilityLabel="Community Aid: Help exchange, local feed & volunteers"
              {...(Platform.OS === 'web' ? ({ role: 'button' } as any) : {})}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: Palette.pineForestContainer }]}>
                <Users size={20} color={Palette.pineForest} />
              </View>
              <Text
                style={[
                  styles.tileTitle,
                  { color: isDark ? Palette.snow : Palette.pineForest },
                ]}
              >
                Community Aid
              </Text>
              <Text style={styles.tileSub}>Volunteer network</Text>
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
              accessibilityRole="button"
              accessibilityLabel="Hazard Map: Shelters, routes & blocked passes"
              {...(Platform.OS === 'web' ? ({ role: 'button' } as any) : {})}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: Palette.infoBlueLight }]}>
                <MapPin size={20} color={Palette.infoBlue} />
              </View>
              <Text
                style={[
                  styles.tileTitle,
                  { color: isDark ? Palette.snow : Palette.pineForest },
                ]}
              >
                Hazard Map
              </Text>
              <Text style={styles.tileSub}>Blocked mountain passes</Text>
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
              accessibilityRole="button"
              accessibilityLabel="Control Room: DDMA & SDRF incident verification"
              {...(Platform.OS === 'web' ? ({ role: 'button' } as any) : {})}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: Palette.verifiedGreenLight }]}>
                <Building2 size={20} color={Palette.verifiedGreen} />
              </View>
              <Text
                style={[
                  styles.tileTitle,
                  { color: isDark ? Palette.snow : Palette.pineForest },
                ]}
              >
                Control Room
              </Text>
              <Text style={styles.tileSub}>DDMA / SDRF portal</Text>
            </Pressable>
          </View>

          {/* Interactive Proximity Simulation Demo Banner */}
          <View
            style={[
              styles.demoCard,
              {
                backgroundColor: isDark ? '#18241D' : '#F0FDF4',
                borderColor: isDark ? '#2E4C38' : '#BBF7D0',
              },
            ]}
          >
            <View style={styles.demoCardLeft}>
              <View style={styles.demoBadgeCircle}>
                <Zap size={16} color={Palette.verifiedGreen} />
              </View>
              <View style={styles.demoCardText}>
                <Text style={[styles.demoCardTitle, { color: isDark ? Palette.snow : Palette.pineForest }]}>
                  Live Proximity Relay Network
                </Text>
                <Text style={styles.demoCardSub}>
                  When one user uploads, all users in the 25km range get notified in real time.
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.demoTestBtn}
              onPress={handleSimulateRemoteUpload}
              accessibilityRole="button"
              accessibilityLabel="Simulate remote user upload and range notification"
            >
              <Text style={styles.demoTestBtnText}>⚡ Simulate Upload</Text>
            </Pressable>
          </View>

          {/* Feed Title & Range Filters */}
          <View style={styles.feedHeaderRow}>
            <View>
              <Text
                style={[
                  styles.feedSectionTitle,
                  { color: isDark ? Palette.snow : Palette.pineForest },
                ]}
              >
                Live Mountain Hazard Feed
              </Text>
              <Text style={styles.feedSectionSub}>
                {nearbyCount} reports within 15 km of your sector
              </Text>
            </View>

            <Pressable
              style={styles.postHazardBtn}
              onPress={() => router.push('/report')}
            >
              <Plus size={14} color={Palette.snow} />
              <Text style={styles.postHazardBtnText}>Post Hazard</Text>
            </Pressable>
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterPillsScroll}
            {...(Platform.OS === 'web' ? ({ tabIndex: 0, 'aria-label': 'Feed Filters' } as any) : {})}
          >
            <Pressable
              style={[
                styles.filterPill,
                activeFilter === 'all' && styles.filterPillActive,
                {
                  backgroundColor:
                    activeFilter === 'all'
                      ? Palette.pineForest
                      : isDark
                      ? Palette.surfaceDarkElevated
                      : Palette.snow,
                  borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                },
              ]}
              onPress={() => setActiveFilter('all')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      activeFilter === 'all'
                        ? Palette.snow
                        : isDark
                        ? Palette.snow
                        : Palette.pineForest,
                  },
                ]}
              >
                All Hazards ({hazardsWithDistance.length})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterPill,
                activeFilter === 'nearby' && styles.filterPillActive,
                {
                  backgroundColor:
                    activeFilter === 'nearby'
                      ? Palette.pineForest
                      : isDark
                      ? Palette.surfaceDarkElevated
                      : Palette.snow,
                  borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                },
              ]}
              onPress={() => setActiveFilter('nearby')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      activeFilter === 'nearby'
                        ? Palette.snow
                        : isDark
                        ? Palette.snow
                        : Palette.pineForest,
                  },
                ]}
              >
                📍 Nearby &lt; 15 km ({nearbyCount})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterPill,
                activeFilter === 'critical' && styles.filterPillActive,
                {
                  backgroundColor:
                    activeFilter === 'critical'
                      ? Palette.rescueRed
                      : isDark
                      ? Palette.surfaceDarkElevated
                      : Palette.snow,
                  borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                },
              ]}
              onPress={() => setActiveFilter('critical')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      activeFilter === 'critical'
                        ? Palette.snow
                        : isDark
                        ? Palette.snow
                        : Palette.pineForest,
                  },
                ]}
              >
                ⚠️ Critical Roadblocks
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterPill,
                activeFilter === 'verified' && styles.filterPillActive,
                {
                  backgroundColor:
                    activeFilter === 'verified'
                      ? Palette.verifiedGreen
                      : isDark
                      ? Palette.surfaceDarkElevated
                      : Palette.snow,
                  borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                },
              ]}
              onPress={() => setActiveFilter('verified')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      activeFilter === 'verified'
                        ? Palette.snow
                        : isDark
                        ? Palette.snow
                        : Palette.pineForest,
                  },
                ]}
              >
                ✓ Community Corroborated
              </Text>
            </Pressable>
          </ScrollView>

          {/* Feed List Items */}
          {filteredFeed.map((item) => {
            const hasCorroborated = corroboratedIds[item.id];
            const isVeryNearby = item.distanceKm <= 5;

            return (
              <View
                key={item.id}
                style={[
                  styles.feedCard,
                  {
                    backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                    borderColor: isVeryNearby
                      ? Palette.saffron
                      : isDark
                      ? Palette.surfaceDarkBorder
                      : Palette.stone,
                  },
                ]}
              >
                {/* Card Author & Proximity Distance Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardAuthorRow}>
                    <View
                      style={[
                        styles.authorAvatar,
                        {
                          backgroundColor:
                            item.reportedByRole === 'moderator'
                              ? Palette.pineForestContainer
                              : Palette.stoneLight,
                        },
                      ]}
                    >
                      <Text style={styles.authorAvatarText}>
                        {item.reportedByRole === 'moderator' ? '🛡️' : '🏔️'}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.cardAuthorName,
                          { color: isDark ? Palette.snow : Palette.pineForest },
                        ]}
                      >
                        {item.reportedBy || 'Mountain Resident'}
                      </Text>
                      <View style={styles.cardTimeRow}>
                        <Clock size={11} color={Palette.slateMuted} />
                        <Text style={styles.cardTimeText}>{item.time || 'Recently'}</Text>
                        <Text style={styles.cardTimeDot}>•</Text>
                        <Text style={styles.cardSectorText}>
                          {item.area || 'Uttarakhand Highway'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Proximity Distance Tag */}
                  <View
                    style={[
                      styles.distanceBadge,
                      {
                        backgroundColor: isVeryNearby
                          ? '#FEF3C7'
                          : isDark
                          ? '#16221A'
                          : '#DCFCE7',
                      },
                    ]}
                  >
                    <MapPin
                      size={11}
                      color={isVeryNearby ? Palette.saffron : Palette.verifiedGreen}
                    />
                    <Text
                      style={[
                        styles.distanceBadgeText,
                        {
                          color: isVeryNearby ? Palette.saffronMuted : Palette.verifiedGreen,
                        },
                      ]}
                    >
                      {item.distanceKm} km away
                    </Text>
                  </View>
                </View>

                {/* Badges Row */}
                <View style={styles.cardBadgesRow}>
                  <Badge label={item.type} variant="brand" />
                  <StatusLabel status={item.status} />
                  <Badge
                    label={`${item.severity} Risk`}
                    variant={item.severity === 'High' ? 'danger' : 'warning'}
                  />
                </View>

                {/* Location Title & Description */}
                <Text
                  style={[
                    styles.cardLocationTitle,
                    { color: isDark ? Palette.snow : Palette.pineForest },
                  ]}
                >
                  {item.location}
                </Text>

                <Text
                  style={[
                    styles.cardDescription,
                    { color: isDark ? Palette.stone : Palette.slate },
                  ]}
                >
                  {item.description}
                </Text>

                {/* Interactive Action Footer */}
                <View
                  style={[
                    styles.cardFooter,
                    {
                      borderTopColor: isDark ? Palette.surfaceDarkBorder : Palette.stoneLight,
                    },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.feedActionBtn,
                      hasCorroborated && styles.feedActionBtnActive,
                    ]}
                    onPress={() => handleCorroborate(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Corroborate and confirm hazard"
                  >
                    <ThumbsUp
                      size={15}
                      color={hasCorroborated ? Palette.verifiedGreen : Palette.slateMuted}
                    />
                    <Text
                      style={[
                        styles.feedActionBtnText,
                        hasCorroborated && { color: Palette.verifiedGreen, fontWeight: '700' },
                      ]}
                    >
                      {hasCorroborated
                        ? `Confirmed (${(item.corroborationCount || 1) + 1})`
                        : `Confirm Status (${item.corroborationCount || 1})`}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.feedActionBtn}
                    onPress={() => router.push('/map')}
                    accessibilityRole="button"
                    accessibilityLabel="View hazard on map"
                  >
                    <Navigation size={15} color={Palette.infoBlue} />
                    <Text style={[styles.feedActionBtnText, { color: Palette.infoBlue }]}>
                      View Map
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.feedActionBtn}
                    onPress={() => handleShareHazard(item)}
                    accessibilityRole="button"
                    accessibilityLabel="Share hazard details"
                  >
                    <Share2 size={15} color={Palette.slateMuted} />
                    <Text style={styles.feedActionBtnText}>Share</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.guidesScroll}
            {...(Platform.OS === 'web' ? ({ tabIndex: 0, 'aria-label': 'Offline Mountain Safety Guides' } as any) : {})}
          >
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

          {/* Direct Emergency Hotlines */}
          <View style={styles.hotlineSection}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              Direct Emergency Hotlines (Immediate Dial)
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
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${c.authorityName} at ${c.phoneNumber}`}
                  {...(Platform.OS === 'web' ? ({ role: 'button' } as any) : {})}
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
      </View>

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
  mainContainer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxl,
  },

  /* Notification Toast */
  notificationToast: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    zIndex: 9999,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.rescueRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  notifTextGroup: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifPill: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Palette.rescueRed,
    letterSpacing: 0.8,
  },
  notifTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    marginBottom: 2,
  },
  notifDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
    lineHeight: 16,
  },
  notifActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  notifActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.rescueRed,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.xs,
  },
  notifActionBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Palette.snow,
  },

  /* SOS Banner */
  sosEmergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.rescueRed,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
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
    backgroundColor: '#7D0008',
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
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    color: '#FFFFFF',
    marginTop: 2,
  },

  /* Action Grid */
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  actionTile: {
    width: '48.5%',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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

  /* Proximity Simulation Demo Card */
  demoCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  demoBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  demoCardText: {
    flex: 1,
  },
  demoCardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
  },
  demoCardSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Palette.slateMuted,
    marginTop: 2,
  },
  demoTestBtn: {
    backgroundColor: Palette.pineForest,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radii.sm,
  },
  demoTestBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Palette.snow,
  },

  /* Feed Header & Filters */
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  feedSectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
  },
  feedSectionSub: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestMuted,
    marginTop: 1,
  },
  postHazardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.rescueRed,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  postHazardBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.snow,
  },
  filterPillsScroll: {
    marginVertical: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  filterPillActive: {
    borderColor: 'transparent',
  },
  filterPillText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
  },

  /* Feed Cards */
  feedCard: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  authorAvatarText: {
    fontSize: 16,
  },
  cardAuthorName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardTimeText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Palette.slateMuted,
  },
  cardTimeDot: {
    fontSize: 10,
    color: Palette.slateMuted,
  },
  cardSectorText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Palette.pineForestMuted,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  distanceBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
  },
  cardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  cardLocationTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    lineHeight: 20,
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  feedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  feedActionBtnActive: {
    backgroundColor: '#DCFCE7',
    borderRadius: Radii.xs,
  },
  feedActionBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
  },

  /* Section Headers */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
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
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestMuted,
    marginTop: 4,
  },

  /* Hotlines */
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
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
  },
});
