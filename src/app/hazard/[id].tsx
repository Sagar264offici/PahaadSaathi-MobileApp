import { useState, useEffect } from "react";
import { Image } from 'expo-image';
import {
  Alert,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  Hazard,
  STATUS_LABELS,
  getHazard,
  subscribe,
} from "@/data/hazardStore";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

const SEVERITY_CONFIG = {
  High: {
    label: "HIGH SEVERITY",
    text: "#F87171",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.3)",
  },
  Medium: {
    label: "MEDIUM SEVERITY",
    text: "#FBBF24",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  Low: {
    label: "LOW SEVERITY",
    text: "#34D399",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.3)",
  },
};
const DEFAULT_SHARE_CONTACT = '+918755903705';

export default function HazardDetails() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [hazard, setHazard] = useState<Hazard | undefined>(undefined);

  useEffect(() => {
    const load = () => {
      const item = id ? getHazard(id) : undefined;
      setHazard(item);
    };
    load();
    const unsub = subscribe(load);
    return () => unsub();
  }, [id]);

  function resolveReport() {
    if (!hazard) return;
    Alert.alert(
      "Confirm Road Clearance",
      "Are you at this location and can confirm the route is completely clear and open to traffic?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Clearance",
          onPress: () => {
            Alert.alert("Clearance Submitted", "Your verification has been recorded for review.");
          },
        },
      ]
    );
  }

  function getShareMessage() {
    if (!hazard) return;
    const statusLabel = STATUS_LABELS[hazard.status] || hazard.status;
    const statusText = hazard.sample ? "DEMO DATA" : statusLabel;
    const message =
      `PAHAADSAATHI HIGHWAY ADVISORY\n\n` +
      `HAZARD: ${hazard.type}\n` +
      `LOCATION: ${hazard.location}\n` +
      `SEVERITY: ${hazard.severity}\n` +
      `STATUS: ${statusText}\n` +
      `REPORTED: ${hazard.time || "Recently"}\n\n` +
      `Drive with caution. PahaadSaathi Mountain Road Safety.`;

    return message;
  }

  function shareViaSMS() {
    const message = getShareMessage();
    if (!message) return;
    const smsUrl = `sms:${DEFAULT_SHARE_CONTACT}?body=${encodeURIComponent(message)}`;
    Linking.openURL(smsUrl).catch(() => {
      Alert.alert("SMS Unavailable", "Unable to open messaging app on this device.");
    });
  }

  function shareViaWhatsApp() {
    const message = getShareMessage();
    if (!message) return;
    const recipient = DEFAULT_SHARE_CONTACT.replace('+', '');
    Linking.openURL(`https://wa.me/${recipient}?text=${encodeURIComponent(message)}`).catch(() => {
      Alert.alert('WhatsApp Unavailable', 'Unable to open WhatsApp on this device.');
    });
  }

  if (!hazard) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Hazard Not Found</Text>
          <ThemeToggle />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Report Unavailable</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>This report may have been archived or removed.</Text>
          <Pressable style={[styles.returnBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
            <Text style={styles.returnBtnText}>Return to Corridor Feed</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const sev = SEVERITY_CONFIG[hazard.severity] || SEVERITY_CONFIG.Low;
  const statusLabel = STATUS_LABELS[hazard.status] || hazard.status;

  return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Incident #{hazard.id.slice(-6)}</Text>
        <ThemeToggle />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Details Panel */}
        <View style={[styles.panel, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Text style={[styles.typeBadgeText, { color: theme.textSecondary }]}>{hazard.type}</Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
              <View style={[styles.severityDot, { backgroundColor: sev.text }]} />
              <Text style={[styles.severityText, { color: sev.text }]}>{sev.label}</Text>
            </View>
          </View>

          <Text style={[styles.locationTitle, { color: theme.textPrimary }]}>{hazard.location}</Text>
          <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{hazard.description}</Text>
          {hazard.photo_url && (
            <Image
              source={{ uri: hazard.photo_url }}
              contentFit="cover"
              transition={180}
              accessibilityLabel="Photo attached to this hazard report"
              style={[styles.hazardPhoto, { backgroundColor: theme.backgroundSecondary }]}
            />
          )}

          {/* Key Metric Details */}
          <View style={[styles.infoGrid, { borderTopColor: theme.border }]}>
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>STATUS</Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                {hazard.sample ? "Demo Report" : statusLabel}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>REPORTED</Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{hazard.time || "Recently"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>REPORTER</Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{hazard.reportedBy || "Community"}</Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionSection}>
          <Pressable style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={resolveReport}>
            <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>✓ Confirm Road Clearance</Text>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable style={[styles.smsBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={shareViaSMS}>
              <Text style={[styles.smsBtnText, { color: theme.textPrimary }]}>SMS to my number</Text>
            </Pressable>

            <Pressable style={[styles.smsBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={shareViaWhatsApp}>
              <Text style={[styles.smsBtnText, { color: theme.textPrimary }]}>WhatsApp</Text>
            </Pressable>

            <Pressable
              style={[styles.cardShareBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push(`/hazard/share/${hazard.id}`)}
            >
              <Text style={[styles.cardShareText, { color: theme.textPrimary }]}>📸 Share Safety Card</Text>
            </Pressable>
          </View>

          <View style={[styles.protocolNotice, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.protocolTitle, { color: theme.textPrimary }]}>Verification Protocol</Text>
            <Text style={[styles.protocolText, { color: theme.textSecondary }]}>
              Reports require multi-driver corroboration or field highway patrol verification before corridor closures are marked fully resolved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0D12",
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#171B26",
    backgroundColor: "#0B0D12",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#161A24",
    borderWidth: 1,
    borderColor: "#242A38",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    color: "#E2E8F0",
    fontSize: 18,
    fontWeight: "700",
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Panel */
  panel: {
    backgroundColor: "#11141D",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E2332",
    padding: 18,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  typeBadge: {
    backgroundColor: "#181D29",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#232A3B",
  },
  typeBadgeText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  severityText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  locationTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  descriptionText: {
    color: "#8392A7",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  hazardPhoto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#171B26",
    paddingTop: 16,
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  infoValue: {
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "600",
  },

  /* Actions */
  actionSection: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#0B0D12",
    fontSize: 13,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  smsBtn: {
    flex: 1,
    backgroundColor: "#161A24",
    borderWidth: 1,
    borderColor: "#242A38",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  smsBtnText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  cardShareBtn: {
    flex: 1,
    backgroundColor: "#161A24",
    borderWidth: 1,
    borderColor: "#242A38",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cardShareText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  protocolNotice: {
    backgroundColor: "#11141D",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E2332",
    padding: 16,
    marginTop: 4,
  },
  protocolTitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  protocolText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
  },

  /* Empty state */
  emptyContainer: {
    flex: 1,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  returnBtn: {
    backgroundColor: "#161A24",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#242A38",
  },
  returnBtnText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
});
