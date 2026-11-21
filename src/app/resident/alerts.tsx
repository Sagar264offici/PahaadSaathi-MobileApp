/**
 * PahaadSaathi Resident Alerts
 *
 * Community members view targeted emergency alerts for their registered area.
 * Reports are shown with severity, status, and location context.
 */

import { useState, useEffect, useCallback } from "react";
import {
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
  getHazardsByArea,
} from "@/data/hazardStore";
import { getResident, isAuthenticated } from "@/data/userStore";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

export default function ResidentAlertsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const resident = getResident();
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);

  const area = resident?.area || "";
  const isRegistered = resident?.registeredForAlerts || false;

  const refreshAlerts = useCallback(() => {
    setLoading(true);
    try {
      if (area) {
        const areaHazards = getHazardsByArea(area);
        setHazards(areaHazards.filter((h) => h.status !== "sample"));
      } else {
        setHazards(getHazards().filter((h) => h.status !== "sample"));
      }
    } catch {
      // Error surfaced by empty state
    } finally {
      setLoading(false);
    }
  }, [area]);

  // Auth guard - redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      refreshAlerts();
    }, 0);

    const unsub = subscribe(() => {
      if (mounted) {
        refreshAlerts();
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
      unsub();
    };
  }, [area, refreshAlerts]);

  if (!isAuthenticated()) {
    return null;
  }

  if (!isRegistered) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
            <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Alerts</Text>
          <ThemeToggle />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Not Registered</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Register your phone and area to receive targeted emergency alerts.</Text>
          <Pressable style={[styles.registerBtn, { backgroundColor: theme.primary }]} onPress={() => router.push("/resident/register")}>
            <Text style={styles.registerBtnText}>Register Now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
            <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Alerts</Text>
          <ThemeToggle />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading alerts…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Area Alerts</Text>
        <ThemeToggle />
      </View>

      <View style={[styles.areaBanner, { backgroundColor: theme.primaryLight }]}>
        <Text style={[styles.areaLabel, { color: theme.primaryDark }]}>Area: {area}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {hazards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Active Alerts</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No incidents reported for your area right now.</Text>
          </View>
        ) : (
          hazards.map((item) => (
            <View key={item.id} style={[styles.alertRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={styles.alertBody}>
                <View style={styles.alertTop}>
                  <Text style={[styles.alertType, { color: theme.textPrimary }]}>{item.type}</Text>
                  <View style={[styles.severityChip, { borderColor: SEVERITY_COLORS[item.severity] }]}>
                    <Text style={[styles.severityChipText, { color: SEVERITY_COLORS[item.severity] }]}>{item.severity}</Text>
                  </View>
                </View>
                <Text style={[styles.alertLocation, { color: theme.textSecondary }]}>{item.location}</Text>
                <Text style={[styles.alertDescription, { color: theme.textSecondary }]}>{item.description}</Text>
                <View style={styles.alertMeta}>
                  <Text style={[styles.alertStatus, { color: STATUS_COLORS[item.status] || theme.textTertiary }]}>
                    {STATUS_LABELS[item.status] || item.status}
                  </Text>
                  <Text style={[styles.alertTime, { color: theme.textTertiary }]}>{item.time}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const STATUS_COLORS: Record<string, string> = {
  reported: "#EA580C",
  under_review: "#D97706",
  corroborated: "#34C759",
  confirmed_closure: "#FF6868",
  resolved: "#059669",
  rejected: "#9AA5B1",
  sample: "#BECAD5",
};

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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#3B2F2F',
    fontSize: 20,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '800',
  },
  areaBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  areaLabel: {
    color: '#9C4221',
    fontSize: 13,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
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
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#8A735B',
    fontSize: 13,
  },
  registerBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  alertRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertBody: {
    flex: 1,
  },
  alertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertType: {
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
  alertLocation: {
    color: '#5B4A3E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertDescription: {
    color: '#8A735B',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertStatus: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  alertTime: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
