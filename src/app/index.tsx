/**
 * PahaadSaathi Home Screen
 *
 * Role-based entry point:
 * - Moderator / Administrator: incident dashboard + report submission
 * - Resident: targeted alerts for their area
 * - Guest: login or resident registration
 */

import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  Hazard,
  STATUS_LABELS,
  SEVERITY_COLORS,
  getHazards,
  subscribe,
  getOfflineQueue,
  syncOfflineQueue,
} from "@/data/hazardStore";
import {
  getUser,
  getResident,
  isModerator,
  subscribeUser,
  subscribeResident,
} from "@/data/userStore";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

const STATUS_COLORS: Record<string, string> = {
  reported: "#EA580C",
  under_review: "#D97706",
  corroborated: "#34C759",
  confirmed_closure: "#FF6868",
  resolved: "#059669",
  rejected: "#9AA5B1",
  sample: "#BECAD5",
};

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const user = getUser();
  const resident = getResident();
  const moderator = isModerator();
  const [hazards, setHazards] = useState<Hazard[]>(getHazards());
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUser = subscribeUser(() => {});
    const unsubResident = subscribeResident(() => {});
    const unsubHazards = subscribe((items) => setHazards(items));
    return () => {
      unsubUser();
      unsubResident();
      unsubHazards();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const queued = await getOfflineQueue();
        setQueueCount(queued.length);
      } catch {
        setQueueCount(0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSyncQueue = useCallback(async () => {
    try {
      await syncOfflineQueue();
      const queued = await getOfflineQueue();
      setQueueCount(queued.length);
      Alert.alert("Sync Complete", "Offline reports have been uploaded.");
    } catch {
      Alert.alert("Sync Failed", "Could not sync offline reports. Check your connection.");
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (moderator) {
    const activeHazards = hazards.filter((h) => h.status !== "sample" && h.status !== "resolved" && h.status !== "rejected");
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>PahaadSaathi</Text>
          <Text style={[styles.brandTagline, { color: theme.textSecondary }]}>Moderator Dashboard</Text>
          <ThemeToggle />
        </View>

        <View style={[styles.connectionStatus, { backgroundColor: theme.surface }]}>
          <View style={[styles.connectionDot, { backgroundColor: '#15803D' }]} />
          <Text style={[styles.connectionText, { color: theme.textSecondary }]}>Authorized as {user?.name}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.statCard}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active Incidents</Text>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{activeHazards.length}</Text>
          </View>

          {queueCount > 0 && (
            <View style={[styles.statCard, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
              <Text style={[styles.statLabel, { color: '#9C4221' }]}>Offline Reports Pending Sync</Text>
              <Text style={[styles.statValue, { color: '#C2410C' }]}>{queueCount}</Text>
              <Pressable style={styles.syncBtn} onPress={handleSyncQueue}>
                <Text style={[styles.syncBtnText, { color: '#C2410C' }]}>Sync Now</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <View style={[styles.sectionHead, { alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Incidents</Text>
              <Pressable style={styles.linkRow} onPress={() => router.push("/moderator")}>
                <Text style={[styles.linkText, { color: theme.primary }]}>Manage All →</Text>
              </Pressable>
            </View>
            {activeHazards.length > 0 ? (
              activeHazards.slice(0, 5).map((item) => (
                <View key={item.id} style={[styles.incidentRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={styles.incidentBody}>
                    <View style={styles.incidentTop}>
                      <Text style={[styles.incidentType, { color: theme.textPrimary }]}>{item.type}</Text>
                      <View style={[styles.severityChip, { borderColor: SEVERITY_COLORS[item.severity] }]}>
                        <Text style={[styles.severityChipText, { color: SEVERITY_COLORS[item.severity] }]}>{item.severity}</Text>
                      </View>
                    </View>
                    <Text style={[styles.incidentLocation, { color: theme.textSecondary }]}>{item.location}</Text>
                    <View style={styles.incidentMeta}>
                      <Text style={[styles.incidentStatus, { color: STATUS_COLORS[item.status] || theme.textTertiary }]}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Text>
                      <Text style={[styles.incidentTime, { color: theme.textTertiary }]}>{item.time}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.incidentArrow} onPress={() => router.push(`/hazard/${item.id}`)}>
                    <Text style={styles.incidentArrowText}>→</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptyBlock}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No active incidents.</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsGrid}>
            <Pressable style={[styles.actionCard, styles.primaryAction, { backgroundColor: theme.primary }]} onPress={() => router.push("/report")}>
              <Text style={[styles.actionTitle, { color: '#FFFFFF' }]}>＋ Report Incident</Text>
              <Text style={[styles.actionSub, { color: '#FFFFFF' }]}>Online or SMS fallback</Text>
            </Pressable>
            <Pressable style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]} onPress={() => router.push("/moderator")}>
              <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Review Incidents</Text>
              <Text style={[styles.actionSub, { color: theme.textSecondary }]}>Update status & issue alerts</Text>
            </Pressable>
            <Pressable style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]} onPress={() => router.push("/emergency")}>
              <Text style={[styles.actionTitle, { color: '#B42318' }]}>Emergency Contacts</Text>
              <Text style={[styles.actionSub, { color: theme.textSecondary }]}>112 · 108 · 1078</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (resident) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>PahaadSaathi</Text>
          <Text style={[styles.brandTagline, { color: theme.textSecondary }]}>Community Alerts</Text>
          <ThemeToggle />
        </View>

        <View style={[styles.connectionStatus, { backgroundColor: theme.surface }]}>
          <View style={[styles.connectionDot, { backgroundColor: '#15803D' }]} />
          <Text style={[styles.connectionText, { color: theme.textSecondary }]}>Registered: {resident.name}</Text>
        </View>

        <View style={[styles.areaBanner, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.areaLabel, { color: theme.primaryDark }]}>Area: {resident.area}</Text>
          <Pressable style={styles.changeAreaBtn} onPress={() => router.push("/resident/register")}>
            <Text style={[styles.changeAreaText, { color: theme.primary }]}>Change Area</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]} onPress={() => router.push("/resident/alerts")}>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>View Area Alerts</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>Targeted warnings for your corridor</Text>
          </Pressable>

          <Pressable style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]} onPress={() => router.push("/emergency")}>
            <Text style={[styles.actionTitle, { color: '#B42318' }]}>Emergency Contacts</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>112 · 108 · 1078</Text>
          </Pressable>

          <View style={styles.notice}>
            <Text style={[styles.noticeText, { color: theme.error }]}>PahaadSaathi is an advisory tool, not an emergency service. For immediate danger, call 112.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Guest / not logged in
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>PahaadSaathi</Text>
        <Text style={[styles.brandTagline, { color: theme.textSecondary }]}>Mountain Safety</Text>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.welcomeBlock, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.welcomeTitle, { color: theme.primaryDark }]}>Safety beyond signal</Text>
          <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>Emergency reporting for mountain regions — online or by SMS fallback.</Text>
        </View>

        <View style={styles.actionsGrid}>
          <Pressable style={[styles.actionCard, styles.primaryAction, { backgroundColor: theme.primary }]} onPress={() => router.push("/moderator/login")}>
            <Text style={[styles.actionTitle, { color: '#FFFFFF' }]}>Moderator Sign In</Text>
            <Text style={[styles.actionSub, { color: '#FFFFFF' }]}>Report and manage incidents</Text>
          </Pressable>
          <Pressable style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]} onPress={() => router.push("/resident/register")}>
            <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Resident Registration</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>Receive targeted alerts</Text>
          </Pressable>
          <Pressable style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]} onPress={() => router.push("/emergency")}>
            <Text style={[styles.actionTitle, { color: '#B42318' }]}>Emergency Contacts</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>112 · 108 · 1078</Text>
          </Pressable>
        </View>

        <View style={styles.notice}>
          <Text style={[styles.noticeText, { color: theme.error }]}>PahaadSaathi is an advisory tool, not an emergency service. For immediate danger, call 112.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    backgroundColor: '#FFFDF5',
  },
  brandTitle: {
    color: '#3B2F2F',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandTagline: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#8A735B',
    fontSize: 14,
    fontWeight: '600',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  welcomeBlock: {
    marginBottom: 20,
    marginTop: 6,
    padding: 16,
    borderRadius: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 13,
    lineHeight: 19,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statLabel: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#3B2F2F',
    fontSize: 22,
    fontWeight: '800',
  },
  syncBtn: {
    marginTop: 8,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#3B2F2F',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '700',
  },
  incidentRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentBody: {
    flex: 1,
  },
  incidentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  incidentType: {
    color: '#3B2F2F',
    fontSize: 13,
    fontWeight: '800',
  },
  severityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  incidentLocation: {
    color: '#5B4A3E',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  incidentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentStatus: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  incidentTime: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  incidentArrow: {
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderRadius: 6,
  },
  incidentArrowText: {
    color: '#EA580C',
    fontWeight: '800',
  },
  emptyBlock: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8A735B',
    fontSize: 13,
  },
  actionsGrid: {
    gap: 10,
  },
  actionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  primaryAction: {
    borderWidth: 0,
  },
  actionTitle: {
    color: '#3B2F2F',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  actionSub: {
    color: '#8A735B',
    fontSize: 12,
    fontWeight: '500',
  },
  areaBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  areaLabel: {
    color: '#9C4221',
    fontSize: 13,
    fontWeight: '800',
  },
  changeAreaBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeAreaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  notice: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  noticeText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
