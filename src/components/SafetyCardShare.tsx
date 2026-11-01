import { useState, useEffect } from "react";
import { Image } from 'expo-image';
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";

import {
  Hazard,
  STATUS_LABELS,
  getHazard,
  subscribe,
} from "@/data/hazardStore";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';

const SEVERITY_CONFIG = {
  High: { label: "HIGH", color: "#EA580C" },
  Medium: { label: "MEDIUM", color: "#D97706" },
  Low: { label: "LOW", color: "#15803D" },
};

export default function SafetyCardShare() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [hazard, setHazard] = useState<Hazard | undefined>(undefined);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const load = () => {
      const item = id ? getHazard(id) : undefined;
      setHazard(item);
    };
    load();
    const unsub = subscribe(load);
    return () => unsub();
  }, [id]);

  const statusLabel = STATUS_LABELS[hazard?.status || ''] || (hazard?.status || '');
  const sev = SEVERITY_CONFIG[hazard?.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.Low;
  const isSample = hazard?.sample || false;

  async function shareSafetyCard() {
    if (!hazard) return;
    setSharing(true);
    try {
      const message = buildShareMessage(hazard);
      await Sharing.shareAsync(message, {
        dialogTitle: 'Share Hazard Alert',
        mimeType: 'text/plain',
      });
    } catch {
      // Fallback: try Linking
      try {
        const message = buildShareMessage(hazard);
        const encoded = encodeURIComponent(message);
        await Linking.openURL(`sms:?body=${encoded}`);
      } catch {
        Alert.alert('Sharing Unavailable', 'Unable to share this report.');
      }
    } finally {
      setSharing(false);
    }
  }

  if (!hazard) return null;

  const statusText = isSample ? 'DEMO DATA — Illustrative only' : statusLabel;
  const statusColor = isSample ? '#8A735B' : '#EA580C';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Slogan */}
      <View style={[styles.sloganRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.sloganText, { color: theme.textPrimary }]}>Don&apos;t let Sink, Just Think!</Text>
      </View>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Share Hazard Report</Text>
        <ThemeToggle />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Safety Preview Card */}
        <View style={styles.cardContainer}>
          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardBrand, { color: theme.primary }]}>PAHAADSAATHI</Text>
              <Text style={[styles.cardBrandSub, { color: theme.textSecondary }]}>Mountain Road Safety</Text>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

            {hazard.photo_url && (
              <Image
                source={{ uri: hazard.photo_url }}
                contentFit="cover"
                transition={180}
                accessibilityLabel="Hazard report photo"
                style={styles.hazardPhoto}
              />
            )}

            <View style={styles.cardMetaRow}>
              <View style={styles.cardMetaItem}>
                <Text style={[styles.cardMetaLabel, { color: theme.textTertiary }]}>HAZARD TYPE</Text>
                <Text style={[styles.cardMetaValue, { color: theme.textPrimary }]}>{hazard.type}</Text>
              </View>
              <View style={styles.cardMetaItem}>
                <Text style={[styles.cardMetaLabel, { color: theme.textTertiary }]}>SEVERITY</Text>
                <Text style={[styles.cardMetaValue, { color: sev.color }]}>{sev.label}</Text>
              </View>
            </View>

            <View style={styles.cardLocation}>
              <Text style={[styles.cardLocationLabel, { color: theme.textTertiary }]}>LOCATION</Text>
              <Text style={[styles.cardLocationValue, { color: theme.textPrimary }]}>{hazard.location}</Text>
            </View>

            <View style={styles.cardDescription}>
              <Text style={[styles.cardDescriptionLabel, { color: theme.textTertiary }]}>DESCRIPTION</Text>
              <Text style={[styles.cardDescriptionText, { color: theme.textSecondary }]}>{hazard.description}</Text>
            </View>

            <View style={styles.cardStatusRow}>
              <View style={[styles.cardStatusChip, { borderColor: statusColor }]}>
                <Text style={[styles.cardStatusText, { color: statusColor }]}>
                  {statusText}
                </Text>
              </View>
              <View style={styles.cardReportedRow}>
                <Text style={[styles.cardReportedLabel, { color: theme.textTertiary }]}>REPORTED</Text>
                <Text style={[styles.cardReportedValue, { color: theme.textPrimary }]}>{hazard.time || '—'}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={[styles.cardFooterText, { color: theme.textSecondary }]}>
                Information may be outdated. Verify road conditions before travelling.
              </Text>
              <Text style={[styles.cardFooterSmall, { color: theme.textTertiary }]}>
                PahaadSaathi — Mountain Road Safety
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.shareButtonContainer}>
          <Pressable
            style={[styles.shareButton, { backgroundColor: theme.primary }, sharing && styles.shareButtonDisabled]}
            onPress={shareSafetyCard}
            disabled={sharing}
          >
            <Text style={styles.shareButtonText}>
              {sharing ? 'Sharing…' : 'Share Safety Card'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildShareMessage(hazard: Hazard): string {
  const statusText = hazard.sample ? 'DEMO DATA — Illustrative only' : STATUS_LABELS[hazard.status] || hazard.status;
  return (
    `PAHAADSAATHI SAFETY ALERT\n\n` +
    `HAZARD: ${hazard.type}\n` +
    `LOCATION: ${hazard.location}\n` +
    `SEVERITY: ${hazard.severity}\n` +
    `STATUS: ${statusText}\n` +
    `REPORTED: ${hazard.time || '—'}\n\n` +
    `Information may be outdated. Verify road conditions before travelling.\n` +
    `PahaadSaathi — Mountain Road Safety`
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  sloganRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FDBA74',
  },
  sloganText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#3B2F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardBrand: {
    color: '#3B2F2F',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardBrandSub: {
    color: '#B5A642',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#5B4A3E',
    marginVertical: 12,
    opacity: 0.5,
  },
  hazardPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 16,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardMetaItem: {
    flex: 1,
  },
  cardMetaLabel: {
    color: '#D4C5B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardMetaValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cardLocation: {
    marginBottom: 16,
  },
  cardLocationLabel: {
    color: '#D4C5B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardLocationValue: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardDescription: {
    marginBottom: 16,
  },
  cardDescriptionLabel: {
    color: '#D4C5B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardDescriptionText: {
    color: '#3B2F2F',
    fontSize: 14,
    lineHeight: 20,
  },
  cardStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardStatusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFF7ED',
  },
  cardStatusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardReportedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardReportedLabel: {
    color: '#D4C5B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardReportedValue: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  cardFooter: {
    marginTop: 16,
    alignItems: 'center',
  },
  cardFooterText: {
    color: '#D4C5B8',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
  cardFooterSmall: {
    color: '#B5A642',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  shareButtonContainer: {
    marginTop: 16,
  },
  shareButton: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
