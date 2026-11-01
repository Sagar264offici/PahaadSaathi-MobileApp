/**
 * PahaadSaathi Relay Screen
 * Offline Bluetooth multi-hop mesh network interface
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { relayEngine, type RelayEvent } from '@/lib/relay/engine';
import {
  RelayMessage,
  RelayStats,
  RelayMessageWithMeta,
} from '@/lib/relay/protocol';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { getBluetoothRelayState, startBluetoothRelay, stopBluetoothRelay, subscribeBluetoothRelay, type BluetoothRelayState } from '@/lib/relay/bluetoothTransport';

export default function RelayScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [deviceInfo, setDeviceInfo] = useState<{
    deviceId: string;
    deviceName: string;
    deviceRole: 'moderator' | 'user';
  } | null>(null);
  const [relayStats, setRelayStats] = useState<RelayStats | null>(null);
  const [queue, setQueue] = useState<RelayMessageWithMeta[]>([]);
  const [receipts] = useState<RelayMessage[]>([]);
  const [alertText, setAlertText] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bluetoothRelay, setBluetoothRelay] = useState<BluetoothRelayState>(getBluetoothRelayState());

  useEffect(() => subscribeBluetoothRelay(setBluetoothRelay), []);

  useEffect(() => {
    const unsubscribe = relayEngine.onEvent((event: RelayEvent) => {
      switch (event.type) {
        case 'message_received':
          setQueue((prev) => [event.message, ...prev]);
          break;
        case 'message_delivered':
          setQueue((prev) => prev.filter((m) => m.id !== event.messageId));
          break;
        case 'message_forwarded':
          setRelayStats(relayEngine.getStats());
          break;
        case 'stats_updated':
          setRelayStats(event.stats);
          break;
      }
    });
    return () => unsubscribe();
  }, []);

  const initRelay = useCallback(async () => {
    await relayEngine.init();
    setDeviceInfo({
      deviceId: relayEngine.deviceId,
      deviceName: relayEngine.deviceName,
      deviceRole: relayEngine.deviceRole,
    });
    setQueue(relayEngine.getQueue());
    setRelayStats(relayEngine.getStats());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void initRelay(), 0);
    return () => clearTimeout(timer);
  }, [initRelay]);

  const toggleRelay = async () => {
    if (bluetoothRelay.enabled) {
      stopBluetoothRelay();
      await relayEngine.setRelayActive(false);
      return;
    }
    try {
      await startBluetoothRelay();
      await relayEngine.setRelayActive(true);
    } catch (err) {
      Alert.alert('Bluetooth relay unavailable', err instanceof Error ? err.message : 'Could not start Bluetooth relay.');
    }
  };

  const sendAlert = async () => {
    if (!alertText.trim()) {
      Alert.alert('Missing Information', 'Please enter an alert message.');
      return;
    }

    setIsLoading(true);
    try {
      await relayEngine.createAndSendAlert(
        {
          title: 'Emergency Alert',
          body: alertText,
          verificationStatus: 'reported',
        },
        recipientId || undefined,
      );
      setAlertText('');
      setRecipientId('');
      setIsBroadcast(false);
      setQueue(relayEngine.getQueue());
      setRelayStats(relayEngine.getStats());
    } catch (err) {
      Alert.alert('Send Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBroadcast = () => {
    setIsBroadcast(!isBroadcast);
    if (isBroadcast) {
      setRecipientId('');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Offline Relay</Text>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Device Identity</Text>
          <View style={[styles.profileCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={[styles.avatarContainer, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>{deviceInfo?.deviceId?.charAt(0) || 'P'}</Text>
            </View>
            <Text style={[styles.profileName, { color: theme.textPrimary }]}>{deviceInfo?.deviceName || 'PahaadSaathi Device'}</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{deviceInfo?.deviceId || '—'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.toggleRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={[styles.toggleRowContent, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>Bluetooth peer relay</Text>
              <Text style={[styles.toggleSubtitle, { color: theme.textSecondary }]}>
                {bluetoothRelay.enabled ? `${bluetoothRelay.peers.filter((peer) => peer.connected).length} nearby phones connected` : 'Automatically find nearby app users'}
              </Text>
            </View>
            <Pressable style={[styles.toggleButton, bluetoothRelay.enabled && styles.toggleButtonActive]} onPress={toggleRelay}>
              <Text style={[styles.toggleButtonText, { color: bluetoothRelay.enabled ? '#FFFFFF' : '#EA580C' }]}>{bluetoothRelay.enabled ? 'ON' : 'OFF'}</Text>
            </Pressable>
          </View>
          {bluetoothRelay.enabled && (
            <View style={styles.relayStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{relayStats?.messagesSent || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{relayStats?.messagesReceived || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Received</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{relayStats?.messagesForwarded || 0}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Forwarded</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Send Offline Alert</Text>
          <View style={[styles.inputCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Message</Text>
            <TextInput
              value={alertText}
              onChangeText={setAlertText}
              placeholder="Type your safety alert message..."
              placeholderTextColor={theme.placeholderText}
              style={[styles.alertInput, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              multiline
              numberOfLines={3}
            />
            <View style={styles.recipientRow}>
              <Text style={[styles.recipientLabel, { color: theme.textSecondary }]}>To:</Text>
              <TextInput
                value={recipientId}
                onChangeText={setRecipientId}
                placeholder="Device ID (leave blank for broadcast)"
                placeholderTextColor={theme.placeholderText}
                style={[styles.recipientInput, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
              <Pressable style={[styles.toggleBroadcastBtn, isBroadcast && styles.toggleBroadcastBtnActive]} onPress={toggleBroadcast}>
                <Text style={[styles.toggleBroadcastText, { color: isBroadcast ? '#EA580C' : '#8A735B' }]}>{isBroadcast ? 'Direct' : 'Broadcast'}</Text>
              </Pressable>
            </View>
            <Pressable style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]} onPress={sendAlert} disabled={isLoading}>
              <Text style={[styles.sendBtnText, { color: '#FFFFFF' }]}>{isLoading ? 'Sending…' : 'Send Alert'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.sectionHeader, { alignItems: 'center' }]}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Message Queue ({queue.length})</Text>
            <Pressable style={styles.clearQueueBtn} onPress={() => {}}>
              <Text style={[styles.clearQueueText, { color: theme.textSecondary }]}>Clear</Text>
            </Pressable>
          </View>
          {queue.length === 0 ? (
            <View style={[styles.emptyQueue, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.emptyQueueText, { color: theme.textSecondary }]}>No pending messages</Text>
            </View>
          ) : (
            queue.map((item) => (
              <View style={[styles.queueItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]} key={item.id}>
                <View style={styles.queueItemContent}>
                  <View style={styles.queueItemLeft}>
                    <Text style={[styles.queueItemTitle, { color: theme.textPrimary }]}>{item.alert?.title || 'Alert'}</Text>
                    <Text style={[styles.queueItemBody, { color: theme.textSecondary }]}>{item.alert?.body || ''}</Text>
                    <Text style={[styles.queueItemMeta, { color: theme.textSecondary }]}>{item.status} • {item.hopCount || 0} hops</Text>
                  </View>
                  <View style={styles.queueItemStatus}>
                    <Text style={[styles.queueItemStatusText, { color: item.status === 'delivered' ? '#15803D' : item.status === 'failed' ? '#EA580C' : '#D97706' }]}>{item.status}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {receipts.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { alignItems: 'center' }]}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Delivery Receipts ({receipts.length})</Text>
            </View>
            {receipts.map((receipt) => (
              <View style={[styles.receiptItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]} key={receipt.id}>
                <View style={styles.receiptItemContent}>
                  <Text style={[styles.receiptItemTitle, { color: theme.textPrimary }]}>Delivery Confirmed</Text>
                  <Text style={[styles.receiptItemBody, { color: theme.textSecondary }]}>Message {receipt.deliveryReceipt?.originalMessageId || receipt.id} delivered to {receipt.deliveryReceipt?.deliveredTo || 'unknown'}</Text>
                  <Text style={[styles.receiptItemMeta, { color: theme.textSecondary }]}>Via {receipt.deliveryReceipt?.deliveredBy || 'unknown'} • {receipt.deliveryReceipt?.hopCount || 0} hops</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  },
  scroll: { flex: 1 },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#EA580C',
    fontSize: 32,
    fontWeight: '800',
  },
  profileName: {
    color: '#3B2F2F',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#8A735B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  toggleRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '800',
  },
  toggleSubtitle: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#15803D',
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  relayStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#5B4A3E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 16,
  },
  input: {
    color: '#3B2F2F',
    fontSize: 14,
    paddingVertical: 14,
  },
  alertInput: {
    minHeight: 76,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 8,
    padding: 12,
  },
  recipientLabel: { alignSelf: 'center', fontSize: 13, fontWeight: '700' },
  emptyQueue: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
  },
  emptyQueueText: { fontSize: 13 },
  recipientRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  recipientInput: {
    flex: 1,
    color: '#3B2F2F',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 8,
  },
  sendBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  toggleBroadcastBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBroadcastBtnActive: {
    backgroundColor: '#FFF7ED',
  },
  toggleBroadcastText: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '800',
  },
  clearQueueBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearQueueText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '700',
  },
  queueItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  queueItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueItemLeft: {
    flex: 1,
  },
  queueItemTitle: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  queueItemBody: {
    color: '#8A735B',
    fontSize: 12,
    lineHeight: 18,
  },
  queueItemMeta: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '600',
  },
  queueItemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  queueItemStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  receiptItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  receiptItemContent: {
    flexDirection: 'column',
    gap: 6,
  },
  receiptItemTitle: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '800',
  },
  receiptItemBody: {
    color: '#8A735B',
    fontSize: 12,
    lineHeight: 18,
  },
  receiptItemMeta: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '600',
  },
});
