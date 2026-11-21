/**
 * PahaadSaathi Offline Queue Screen
 * View and manage hazard reports queued while offline.
 */

import { useState, useEffect } from "react";
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
  getOfflineQueue,
  removeOfflineReport,
  retryOfflineReport,
  syncOfflineQueue,
  type QueuedReport,
} from "@/data/hazardStore";
import { isAuthenticated } from "@/data/userStore";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

export default function QueueScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refreshQueue = async () => {
    setLoading(true);
    try {
      const items = await getOfflineQueue();
      setQueue(items);
    } catch {
      // Error surfaced by UI state below
    } finally {
      setLoading(false);
    }
  };

  // Auth guard - redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const items = await getOfflineQueue();
        if (mounted) setQueue(items);
      } catch {
        // Error surfaced by UI state below
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!isAuthenticated()) {
    return null;
  }

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncOfflineQueue();
      await refreshQueue();
      Alert.alert("Sync Complete", "All queued reports have been uploaded.");
    } catch {
      Alert.alert("Sync Failed", "Some reports could not be uploaded. Check your connection and try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = (id: string) => {
    Alert.alert(
      "Remove Report",
      "Remove this report from the offline queue? It will not be uploaded.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: async () => {
          try {
            await removeOfflineReport(id);
            await refreshQueue();
          } catch {
            Alert.alert("Error", "Failed to remove report.");
          }
        } },
      ]
    );
  };

  const handleRetry = (id: string) => {
    Alert.alert(
      "Retry Upload",
      "Retry uploading this report now?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Retry", onPress: async () => {
          try {
            await retryOfflineReport(id);
            await refreshQueue();
          } catch {
            Alert.alert("Error", "Failed to retry report.");
          }
        } },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
            <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Offline Queue</Text>
          <ThemeToggle />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading queue…</Text>
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
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Offline Queue</Text>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Offline Reports</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Reports saved while offline will sync automatically when you&apos;re back online.
          </Text>
          <Pressable
            style={[styles.syncBtn, syncing && styles.syncBtnDisabled, { backgroundColor: theme.primary }]}
            onPress={handleSync}
            disabled={syncing || queue.length === 0}
          >
            <Text style={[styles.syncBtnText, { color: '#FFFFFF' }]}>
              {syncing ? 'Syncing…' : `Sync ${queue.length} Report${queue.length !== 1 ? 's' : ''}`}
            </Text>
          </Pressable>
        </View>

        {queue.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No queued reports</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>All reports have been synced or none were saved offline.</Text>
          </View>
        ) : (
          queue.map((item) => (
            <View key={item.id} style={[styles.queueItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={styles.queueBody}>
                <View style={styles.queueTop}>
                  <Text style={[styles.queueType, { color: theme.textPrimary }]}>{item.type}</Text>
                  <View style={[styles.severityChip, { borderColor: severityColor(item.severity) }]}>
                    <Text style={[styles.severityChipText, { color: severityColor(item.severity) }]}>{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}</Text>
                  </View>
                </View>
                <Text style={[styles.queueLocation, { color: theme.textSecondary }]}>{item.location}</Text>
                <Text style={[styles.queueDescription, { color: theme.textSecondary }]}>{item.description}</Text>
                <View style={styles.queueMeta}>
                  <Text style={[styles.queueTime, { color: theme.textTertiary }]}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                  <Text style={[styles.queueRetries, { color: theme.textTertiary }]}>
                    Attempt {item.retry_count + 1}
                  </Text>
                </View>
              </View>
              <View style={styles.queueActions}>
                <Pressable style={[styles.actionBtn, { backgroundColor: theme.primaryLight }]} onPress={() => handleRetry(item.id)}>
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>Retry</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => handleRemove(item.id)}>
                  <Text style={[styles.actionBtnText, { color: theme.error }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function severityColor(sev: string): string {
  switch (sev.toLowerCase()) {
    case 'high': return '#EA580C';
    case 'medium': return '#D97706';
    case 'low': return '#15803D';
    default: return '#8A735B';
  }
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoText: {
    color: '#5B4A3E',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  syncBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
  queueItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  queueBody: {
    flex: 1,
  },
  queueTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  queueType: {
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
  queueLocation: {
    color: '#5B4A3E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  queueDescription: {
    color: '#8A735B',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  queueMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueTime: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  queueRetries: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  queueActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
