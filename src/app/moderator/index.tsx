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

import { supabase } from "@/lib/supabase";
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

type ReportStatus =
  | "reported"
  | "under_review"
  | "corroborated"
  | "confirmed_closure"
  | "resolved"
  | "rejected";

type VehicleType = "Car" | "Motorcycle" | "Truck";

type Hazard = {
  id: string;
  type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  status: string;
  severity: string;
  blocked_vehicles: string[];
};

const STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  under_review: "Under Review",
  corroborated: "Corroborated",
  confirmed_closure: "Confirmed Closure",
  resolved: "Resolved",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  reported: "#EA580C",
  under_review: "#D97706",
  corroborated: "#15803D",
  confirmed_closure: "#B91C1C",
  resolved: "#059669",
  rejected: "#6B7280",
};

const VEHICLE_TYPES: VehicleType[] = ["Car", "Motorcycle", "Truck"];

export default function ModeratorDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const [reports, setReports] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<ReportStatus>("reported");
  const [editingVehicles, setEditingVehicles] = useState<VehicleType[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.replace("/moderator/login");
          return;
        }

        const { data: membership, error: mError } = await supabase
          .from("moderators")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (mError || !membership) {
          await supabase.auth.signOut();
          router.replace("/moderator/login");
          return;
        }

        setIsAuthorized(true);
      } catch {
        router.replace("/moderator/login");
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [router]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("hazards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReports((data ?? []) as Hazard[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked || !isAuthorized) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("hazards")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setReports((data ?? []) as Hazard[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, isAuthorized]);

  const updateReport = useCallback(async (id: string) => {
    if (!isAuthorized) return;
    if (editingStatus === "confirmed_closure" && editingVehicles.length === 0) {
      Alert.alert("Validation error", "Select at least one blocked vehicle for a confirmed closure.");
      return;
    }

    const updatePayload: Record<string, unknown> = { status: editingStatus };
    if (editingStatus === "confirmed_closure") {
      updatePayload.blocked_vehicles = editingVehicles;
    } else {
      updatePayload.blocked_vehicles = [];
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("hazards")
        .update(updatePayload)
        .eq("id", id);
      if (error) throw error;
      await loadReports();
      setEditingId(null);
    } catch (err) {
      Alert.alert("Update failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [editingStatus, editingVehicles, isAuthorized, loadReports]);

  function signOut() {
    supabase.auth.signOut().then(() => router.replace("/moderator/login"));
  }

  if (!authChecked) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.sloganRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sloganText, { color: theme.textPrimary }]}>Don&apos;t let Sink, Just Think!</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Authorizing…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthorized) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.sloganRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sloganText, { color: theme.textPrimary }]}>Don&apos;t let Sink, Just Think!</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Unauthorized</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>You are not authorized as a moderator.</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={() => router.push("/moderator/login")}>
            <Text style={styles.retryBtnText}>Go to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.sloganRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sloganText, { color: theme.textPrimary }]}>Don&apos;t let Sink, Just Think!</Text>
        </View>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
            <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Moderator Dashboard</Text>
          <ThemeToggle />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading reports…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.sloganRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sloganText, { color: theme.textPrimary }]}>Don&apos;t let Sink, Just Think!</Text>
        </View>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
            <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Moderator Dashboard</Text>
          <ThemeToggle />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Error</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={loadReports}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.sloganRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.sloganText, { color: theme.textPrimary }]}>Don&apos;t let Sink, Just Think!</Text>
      </View>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable style={[styles.signOutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={signOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Moderator Dashboard</Text>
        <ThemeToggle />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No reports</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hazard reports have been submitted yet.</Text>
          </View>
        ) : (
          reports.map((item) => (
            <View key={item.id} style={[styles.reportRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={styles.reportBody}>
                <View style={styles.reportTop}>
                  <Text style={[styles.reportType, { color: theme.textPrimary }]}>{item.type}</Text>
                  <View style={[styles.severityChip, { borderColor: severityColor(item.severity) }]}>
                    <Text style={[styles.severityChipText, { color: severityColor(item.severity) }]}>{item.severity}</Text>
                  </View>
                </View>
                <Text style={[styles.reportLocation, { color: theme.textSecondary }]}>{item.description}</Text>
                <View style={styles.reportMeta}>
                  <Text style={[styles.reportTime, { color: theme.textTertiary }]}>{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</Text>
                  <View style={[styles.statusChip, { backgroundColor: theme.backgroundSecondary }]}>
                    <Text style={[styles.statusChipText, { color: STATUS_COLORS[item.status] || "#8A735B" }]}>{STATUS_LABELS[item.status] || item.status}</Text>
                  </View>
                </View>
                {item.latitude != null && item.longitude != null && (
                  <View style={styles.coordsRow}>
                    <Text style={[styles.coordsText, { color: theme.textSecondary }]}>Lat: {item.latitude.toFixed(4)}, Lng: {item.longitude.toFixed(4)}</Text>
                  </View>
                )}
                {item.blocked_vehicles && item.blocked_vehicles.length > 0 && (
                  <View style={styles.vehiclesRow}>
                    <Text style={[styles.vehiclesLabel, { color: theme.textSecondary }]}>Blocked vehicles:</Text>
                    {item.blocked_vehicles.map((v) => (
                      <View key={v} style={[styles.vehicleChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                        <Text style={[styles.vehicleChipText, { color: theme.textPrimary }]}>{v}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {editingId === item.id ? (
                  <View style={styles.editRow}>
                    <View style={[styles.statusSelector, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>Status</Text>
                      {["reported", "under_review", "corroborated", "confirmed_closure", "resolved", "rejected"].map((s) => (
                        <Pressable
                          key={s}
                          style={[styles.statusOption, { backgroundColor: theme.surface, borderColor: theme.border }, editingStatus === s && { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                          onPress={() => setEditingStatus(s as ReportStatus)}
                        >
                          <Text style={[styles.statusOptionText, { color: theme.textPrimary }, editingStatus === s && { color: theme.primary }]}>{STATUS_LABELS[s]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {editingStatus === "confirmed_closure" && (
                      <View style={styles.vehicleEditRow}>
                        <Text style={[styles.editLabel, { color: theme.textSecondary }]}>Blocked vehicles</Text>
                        {VEHICLE_TYPES.map((v) => (
                          <Pressable
                            key={v}
                            style={[styles.vehicleOption, { backgroundColor: theme.surface, borderColor: theme.border }, editingVehicles.includes(v) && { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                            onPress={() => {
                              setEditingVehicles(editingVehicles.includes(v) ? editingVehicles.filter((x) => x !== v) : [...editingVehicles, v]);
                            }}
                          >
                            <Text style={[styles.vehicleOptionText, { color: theme.textPrimary }, editingVehicles.includes(v) && { color: theme.primary }]}>{v}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    <View style={styles.editActions}>
                      <Pressable style={[styles.updateBtn, { backgroundColor: theme.primary }]} onPress={() => updateReport(item.id)} disabled={loading}>
                        <Text style={styles.updateBtnText}>{loading ? "Updating…" : "Update"}</Text>
                      </Pressable>
                      <Pressable style={[styles.cancelBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setEditingId(null)}>
                        <Text style={[styles.cancelBtnText, { color: theme.textPrimary }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable style={[styles.editBtn, { backgroundColor: theme.primaryLight }]} onPress={() => {
                    setEditingId(item.id);
                    setEditingStatus((item.status as ReportStatus) || "reported");
                    setEditingVehicles((item.blocked_vehicles ?? []) as VehicleType[]);
                  }}>
                    <Text style={[styles.editBtnText, { color: theme.primary }]}>Moderate</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function severityColor(sev: string) {
  switch (sev) {
    case "High": return "#EA580C";
    case "Medium": return "#D97706";
    case "Low": return "#15803D";
    default: return "#8A735B";
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF5",
  },
  sloganRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FDBA74",
  },
  sloganText: {
    color: "#EA580C",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
    backgroundColor: "#FFFDF5",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D4D4D4",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#EA580C",
    borderWidth: 1,
    borderColor: "#9C4221",
  },
  signOutBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  backBtnText: {
    color: "#3B2F2F",
    fontSize: 20,
    fontWeight: "800",
  },
  headerTitle: {
    color: "#3B2F2F",
    fontSize: 16,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    color: "#8A735B",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#3B2F2F",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: "#8A735B",
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  retryBtnText: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "800",
  },
  reportRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportBody: {
    flex: 1,
  },
  reportTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reportType: {
    color: "#3B2F2F",
    fontSize: 13,
    fontWeight: "800",
  },
  severityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityChipText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  reportLocation: {
    color: "#5B4A3E",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  reportMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reportTime: {
    color: "#8A735B",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
    fontFamily: "monospace",
  },
  coordsRow: {
    marginBottom: 8,
  },
  coordsText: {
    color: "#8A735B",
    fontSize: 11,
    fontWeight: "600",
  },
  vehiclesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  vehiclesLabel: {
    color: "#8A735B",
    fontSize: 11,
    fontWeight: "700",
    marginRight: 6,
  },
  vehicleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  vehicleChipText: {
    color: "#7C2D12",
    fontSize: 10,
    fontWeight: "700",
  },
  editRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
    gap: 10,
  },
  editLabel: {
    color: "#5B4A3E",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statusSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  statusOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  statusOptionActive: {
    backgroundColor: "#EA580C",
    borderColor: "#9C4221",
  },
  statusOptionText: {
    color: "#5B4A3E",
    fontSize: 11,
    fontWeight: "700",
  },
  statusOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  vehicleEditRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  vehicleOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  vehicleOptionActive: {
    backgroundColor: "#EA580C",
    borderColor: "#9C4221",
  },
  vehicleOptionText: {
    color: "#5B4A3E",
    fontSize: 11,
    fontWeight: "700",
  },
  vehicleOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  updateBtn: {
    flex: 1,
    backgroundColor: "#EA580C",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  updateBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  cancelBtnText: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "800",
  },
  editBtn: {
    backgroundColor: "#FFF7ED",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  editBtnText: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "800",
  },
});
