/**
 * PahaadSaathi Relay Engine
 * Store-and-forward engine for offline Bluetooth mesh messaging
 *
 * Handles:
 * - Message queue management
 * - Store-and-forward logic
 * - Message deduplication
 * - Expiry tracking
 * - Delivery receipts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RelayMessage,
  RelayMessageWithMeta,
  QueuedReport,
  RelayStats,
  ReportStatus,
  createSafetyAlert,
  isMessageExpired,
  isDuplicateMessage,
  canForward,
  generateMessageId,
  generateDeviceId,
  STATUS_LABELS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
} from './protocol';

const RELAY_QUEUE_KEY = 'pahaadsaathi:relay_queue';
const PROCESSED_IDS_KEY = 'pahaadsaathi:processed_ids';
const DELIVERY_RECEIPTS_KEY = 'pahaadsaathi:delivery_receipts';
const DEVICE_ID_KEY = 'pahaadsaathi:device_id';
const DEVICE_NAME_KEY = 'pahaadsaathi:device_name';
const DEVICE_ROLE_KEY = 'pahaadsaathi:device_role';

export type RelayEvent =
  | { type: 'message_received'; message: RelayMessageWithMeta }
  | { type: 'message_delivered'; messageId: string }
  | { type: 'message_forwarded'; messageId: string; toDeviceId: string }
  | { type: 'message_failed'; messageId: string; reason: string }
  | { type: 'message_expired'; messageId: string }
  | { type: 'relay_started' }
  | { type: 'relay_stopped' }
  | { type: 'peer_connected'; deviceId: string }
  | { type: 'peer_disconnected'; deviceId: string }
  | { type: 'stats_updated'; stats: RelayStats };

export type RelayEventListener = (event: RelayEvent) => void;

export interface RelayEngine {
  // Device identity
  deviceId: string;
  deviceName: string;
  deviceRole: 'moderator' | 'user';
  isRelayActive: boolean;

  // State
  isInitialized: boolean;
  processedMessageIds: Set<string>;
  messageQueue: QueuedReport[];
  deliveryReceipts: RelayMessage[];

  // Methods
  init: () => Promise<void>;
  setDeviceInfo: (deviceName: string, deviceRole: 'moderator' | 'user') => Promise<void>;
  setRelayActive: (active: boolean) => Promise<void>;

  // Message handling
  createAndSendAlert: (alert: {
    title: string;
    body: string;
    hazardId?: string;
    hazardType?: string;
    locationLabel?: string;
    severity?: 'Low' | 'Medium' | 'High';
    latitude?: number | null;
    longitude?: number | null;
    verificationStatus?: ReportStatus;
  }, destinationDeviceId?: string) => Promise<string>;

  receiveMessage: (message: RelayMessage, fromDeviceId: string) => Promise<void>;
  forwardMessage: (messageId: string, toDeviceId: string) => Promise<boolean>;
  markDelivered: (messageId: string, deliveredBy: string) => Promise<void>;

  // Query
  getQueue: () => QueuedReport[];
  getStats: () => RelayStats;
  getMessageById: (messageId: string) => RelayMessageWithMeta | undefined;

  // Events
  onEvent: (listener: RelayEventListener) => () => void;
}

export class RelayEngineImpl implements RelayEngine {
  deviceId: string;
  deviceName: string;
  deviceRole: 'moderator' | 'user';
  isRelayActive: boolean;
  isInitialized: boolean;
  processedMessageIds: Set<string>;
  messageQueue: QueuedReport[];
  deliveryReceipts: RelayMessage[];

  private listeners: Set<RelayEventListener> = new Set();
  private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor() {
    this.deviceId = generateDeviceId();
    this.deviceName = 'PahaadSaathi Device';
    this.deviceRole = 'user';
    this.isRelayActive = false;
    this.isInitialized = false;
    this.processedMessageIds = new Set();
    this.messageQueue = [];
    this.deliveryReceipts = [];
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const [deviceId, deviceName, deviceRole, processedIds, queue, receipts] =
        await Promise.all([
          AsyncStorage.getItem(DEVICE_ID_KEY),
          AsyncStorage.getItem(DEVICE_NAME_KEY),
          AsyncStorage.getItem(DEVICE_ROLE_KEY),
          AsyncStorage.getItem(PROCESSED_IDS_KEY),
          AsyncStorage.getItem(RELAY_QUEUE_KEY),
          AsyncStorage.getItem(DELIVERY_RECEIPTS_KEY),
        ]);

      if (deviceId) this.deviceId = deviceId;
      if (deviceName) this.deviceName = deviceName;
      if (deviceRole) this.deviceRole = deviceRole as 'moderator' | 'user';

      if (processedIds) {
        const parsed = JSON.parse(processedIds);
        this.processedMessageIds = new Set(parsed);
      }

      if (queue) {
        this.messageQueue = JSON.parse(queue);
      }

      if (receipts) {
        this.deliveryReceipts = JSON.parse(receipts);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize relay engine:', error);
      this.isInitialized = true;
    }
  }

  async setDeviceInfo(deviceName: string, deviceRole: 'moderator' | 'user'): Promise<void> {
    this.deviceName = deviceName;
    this.deviceRole = deviceRole;
    await AsyncStorage.setItem(DEVICE_NAME_KEY, deviceName);
    await AsyncStorage.setItem(DEVICE_ROLE_KEY, deviceRole);
  }

  async setRelayActive(active: boolean): Promise<void> {
    this.isRelayActive = active;

    if (active) {
      this.emit({ type: 'relay_started' });
    } else {
      this.emit({ type: 'relay_stopped' });
    }
  }

  async createAndSendAlert(
    alert: {
      title: string;
      body: string;
      hazardId?: string;
      hazardType?: string;
      locationLabel?: string;
      severity?: 'Low' | 'Medium' | 'High';
      latitude?: number | null;
      longitude?: number | null;
      verificationStatus?: ReportStatus;
    },
    destinationDeviceId?: string,
  ): Promise<string> {
    const message = createSafetyAlert(
      this.deviceId,
      this.deviceRole,
      {
        title: alert.title,
        body: alert.body,
        hazardId: alert.hazardId,
        hazardType: alert.hazardType,
        locationLabel: alert.locationLabel,
        severity: alert.severity,
        latitude: alert.latitude,
        longitude: alert.longitude,
        verificationStatus: alert.verificationStatus || 'reported',
      },
      destinationDeviceId,
    );

    const queueItem: QueuedReport = {
      ...message,
      relayMetadata: {
        receivedAt: Date.now(),
        retryCount: 0,
        sourceDeviceId: this.deviceId,
        isLocallyCreated: true,
      },
      queueId: generateMessageId(),
      status: 'queued',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: DEFAULT_MAX_RETRIES,
    };

    this.messageQueue.push(queueItem);
    await this.saveQueue();

    this.emit({ type: 'message_received', message: message as RelayMessageWithMeta });

    // If relay is active, try to forward immediately
    if (this.isRelayActive) {
      await this.processQueue();
    }

    return message.id;
  }

  async receiveMessage(message: RelayMessage, fromDeviceId: string): Promise<void> {
    // Check if already processed
    if (isDuplicateMessage(message.id, this.processedMessageIds)) {
      return;
    }

    // Check if expired
    if (isMessageExpired(message)) {
      this.emit({ type: 'message_expired', messageId: message.id });
      return;
    }

    // Mark as processed
    this.processedMessageIds.add(message.id);
    await AsyncStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify([...this.processedMessageIds]));

    const messageWithMeta: RelayMessageWithMeta = {
      ...message,
      relayMetadata: {
        receivedAt: Date.now(),
        retryCount: 0,
        sourceDeviceId: fromDeviceId,
        isLocallyCreated: false,
      },
    };

    this.messageQueue.push(messageWithMeta as QueuedReport);
    await this.saveQueue();

    this.emit({ type: 'message_received', message: messageWithMeta });

    // Check if this message is for us
    if (message.destinationDeviceId === this.deviceId || message.deliveryScope === 'broadcast') {
      await this.markDelivered(message.id, this.deviceId);
    }

    // If relay is active, forward
    if (this.isRelayActive) {
      await this.processQueue();
    }
  }

  async forwardMessage(messageId: string, toDeviceId: string): Promise<boolean> {
    const messageIndex = this.messageQueue.findIndex((m) => m.id === messageId);

    if (messageIndex === -1) {
      return false;
    }

    const message = this.messageQueue[messageIndex];

    if (!canForward(message as RelayMessage)) {
      this.messageQueue.splice(messageIndex, 1);
      await this.saveQueue();
      return false;
    }

    // Create forwarded message
    const forwardedMessage: RelayMessage = {
      ...message,
      hopCount: message.hopCount + 1,
      hopPath: [...message.hopPath, this.deviceId],
      lastForwardedAt: new Date(Date.now()).toISOString(),
    };

    // Simulate transmission - in real implementation, this would use Bluetooth
    // For now, we simulate successful transmission
    const success = await this.simulateTransmission(forwardedMessage, toDeviceId);

    if (success) {
      message.retryCount = (message.retryCount || 0) + 1;
      await this.saveQueue();

      this.emit({
        type: 'message_forwarded',
        messageId,
        toDeviceId,
      });

      // Remove from queue if fully forwarded
      if (message.hopCount + 1 >= message.maxHops || message.destinationDeviceId === toDeviceId) {
        this.messageQueue.splice(messageIndex, 1);
        await this.saveQueue();
      }

      return true;
    }

    // Retry logic
    if (message.retryCount < (message.maxRetries || DEFAULT_MAX_RETRIES)) {
      this.scheduleRetry(messageId, toDeviceId);
    } else {
      this.messageQueue.splice(messageIndex, 1);
      await this.saveQueue();
      this.emit({
        type: 'message_failed',
        messageId,
        reason: 'max_retries_exceeded',
      });
    }

    return false;
  }

  async markDelivered(messageId: string, deliveredBy: string): Promise<void> {
    const message = this.messageQueue.find((m) => m.id === messageId);

    if (message) {
      const receipt: RelayMessage = {
        ...message,
        messageType: 'DELIVERY_RECEIPT',
        deliveryReceipt: {
          originalMessageId: messageId,
          deliveredTo: this.deviceId,
          deliveredAt: new Date(Date.now()).toISOString(),
          deliveredBy,
          hopCount: message.hopCount,
          deliveryPath: [...message.hopPath, this.deviceId],
        },
      };

      this.deliveryReceipts.push(receipt);
      await AsyncStorage.setItem(DELIVERY_RECEIPTS_KEY, JSON.stringify(this.deliveryReceipts));

      this.emit({
        type: 'message_delivered',
        messageId,
      });
    }
  }

  private async simulateTransmission(message: RelayMessage, toDeviceId: string): Promise<boolean> {
    // Simulate network delay and potential failure
    return new Promise((resolve) => {
      setTimeout(() => {
        // 90% success rate for simulation
        resolve(Math.random() > 0.1);
      }, 500 + Math.random() * 1000);
    });
  }

  private async processQueue(): Promise<void> {
    if (!this.isRelayActive) return;

    const pending = this.messageQueue.filter(
      (m) => m.status === 'queued' || m.status === 'relaying',
    );

    for (const message of pending) {
      if (!canForward(message as RelayMessage)) continue;

      // In a real implementation, we'd find nearby peers here
      // For MVP, we just mark as queued for later forwarding
      message.status = 'relaying';
      await this.saveQueue();
    }
  }

  private async scheduleRetry(messageId: string, toDeviceId: string): Promise<void> {
    if (this.retryTimers.has(messageId)) {
      clearTimeout(this.retryTimers.get(messageId)!);
    }

    const timer = setTimeout(async () => {
      await this.forwardMessage(messageId, toDeviceId);
    }, DEFAULT_RETRY_DELAY_MS);

    this.retryTimers.set(messageId, timer);
  }

  private async saveQueue(): Promise<void> {
    await AsyncStorage.setItem(RELAY_QUEUE_KEY, JSON.stringify(this.messageQueue));
  }

  emit(event: RelayEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  onEvent(listener: RelayEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getQueue(): QueuedReport[] {
    return [...this.messageQueue];
  }

  getStats(): RelayStats {
    const activeRelays = this.messageQueue.filter(
      (m) => m.status === 'relaying',
    ).length;

    return {
      messagesSent: this.messageQueue.filter((m) => m.status === 'delivered').length,
      messagesReceived: this.messageQueue.length,
      messagesForwarded: this.messageQueue.filter(
        (m) => m.retryCount > 0,
      ).length,
      messagesDelivered: this.deliveryReceipts.length,
      messagesFailed: this.messageQueue.filter(
        (m) => m.status === 'failed',
      ).length,
      activeRelays,
      queuedMessages: this.messageQueue.filter(
        (m) => m.status === 'queued',
      ).length,
      totalHopCount: this.messageQueue.reduce(
        (sum, m) => sum + (m.hopCount || 0),
        0,
      ),
    };
  }

  getMessageById(messageId: string): RelayMessageWithMeta | undefined {
    return this.messageQueue.find((m) => m.id === messageId) as RelayMessageWithMeta;
  }
}

export const relayEngine = new RelayEngineImpl();
