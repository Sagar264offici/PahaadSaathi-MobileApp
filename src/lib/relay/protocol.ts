/**
 * PahaadSaathi Relay Network Protocol
 * Message types for offline Bluetooth mesh relay network
 */

export type MessageType =
  | 'SAFETY_ALERT'
  | 'DELIVERY_RECEIPT'
  | 'PING'
  | 'PONG'
  | 'PEER_ANNOUNCE';

export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

export type VerificationStatus =
  | 'reported'
  | 'under_review'
  | 'corroborated'
  | 'confirmed_closure'
  | 'resolved'
  | 'rejected';

export type DeliveryStatus =
  | 'created'
  | 'queued'
  | 'relaying'
  | 'delivered'
  | 'expired'
  | 'failed';

export type RelayMessage = {
  // Core message identification
  id: string;
  messageId: string;
  messageType: MessageType;
  priority: MessagePriority;

  // Routing
  originDeviceId: string;
  originRole: 'moderator' | 'user';
  destinationDeviceId: string | null; // null = broadcast
  deliveryScope: 'targeted' | 'broadcast';

  // Timestamps
  createdAt: string | number;
  expiresAt: string;
  lastForwardedAt?: string;

  // Hop tracking
  maxHops: number;
  hopCount: number;
  hopPath: string[]; // List of device IDs this message passed through

  // Payload
  alert?: AlertPayload;
  deliveryReceipt?: DeliveryReceipt;

  // Security
  signature?: string;
  verified: boolean;
};

export type AlertPayload = {
  title: string;
  body: string;
  hazardId?: string;
  hazardType?: string;
  locationLabel?: string;
  severity?: 'Low' | 'Medium' | 'High';
  latitude?: number | null;
  longitude?: number | null;
  verificationStatus: VerificationStatus;
  sourceUpdatedAt?: string;
};

export type DeliveryReceipt = {
  originalMessageId: string;
  deliveredTo: string;
  deliveredAt: string;
  deliveredBy: string;
  hopCount: number;
  deliveryPath: string[];
};

export type RelayMessageWithMeta = RelayMessage & {
  status?: DeliveryStatus;
  relayMetadata: {
    receivedAt: number;
    retryCount: number;
    lastRetryAt?: number;
    sourceDeviceId: string; // Device we received it from
    isLocallyCreated: boolean;
  };
};

export type PeerDevice = {
  deviceId: string;
  deviceName: string;
  role: 'moderator' | 'user';
  lastSeen: number;
  signalStrength?: number;
  isConnected: boolean;
  canRelay: boolean;
};

export type MessageQueueItem = RelayMessageWithMeta & {
  queueId: string;
  status: DeliveryStatus;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
};

export type ReportStatus = VerificationStatus;
export type QueuedReport = MessageQueueItem;

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  created: 'Created', queued: 'Queued', relaying: 'Relaying',
  delivered: 'Delivered', expired: 'Expired', failed: 'Failed',
};

export type RelayStats = {
  messagesSent: number;
  messagesReceived: number;
  messagesForwarded: number;
  messagesDelivered: number;
  messagesFailed: number;
  activeRelays: number;
  queuedMessages: number;
  totalHopCount: number;
};

export const DEFAULT_MAX_HOPS = 12;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 5000;
export const DEFAULT_MESSAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_PAYLOAD_SIZE = 65536; // 64KB

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateDeviceId(): string {
  return `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function isMessageExpired(message: RelayMessage): boolean {
  return Date.now() > new Date(message.expiresAt).getTime();
}

export function isMessageExpiredByTime(expiresAt: string): boolean {
  return Date.now() > new Date(expiresAt).getTime();
}

export function createSafetyAlert(
  originDeviceId: string,
  originRole: 'moderator' | 'user',
  alert: Omit<AlertPayload, 'verificationStatus'> & { verificationStatus?: VerificationStatus },
  destinationDeviceId?: string,
): RelayMessage {
  const now = Date.now();
  const expiresAt = new Date(now + DEFAULT_MESSAGE_TTL_MS).toISOString();
  const id = generateMessageId();

  return {
    id,
    messageId: id,
    messageType: 'SAFETY_ALERT',
    priority: alert.verificationStatus === 'confirmed_closure' ? 'critical' : 'high',
    originDeviceId,
    originRole,
    destinationDeviceId: destinationDeviceId || null,
    deliveryScope: destinationDeviceId ? 'targeted' : 'broadcast',
    createdAt: new Date(now).toISOString(),
    expiresAt,
    maxHops: DEFAULT_MAX_HOPS,
    hopCount: 0,
    hopPath: [originDeviceId],
    alert: {
      ...alert,
      verificationStatus: alert.verificationStatus || 'reported',
    },
    verified: false,
  };
}

export function createDeliveryReceipt(
  originalMessageId: string,
  deliveredTo: string,
  deliveredBy: string,
  hopCount: number,
  deliveryPath: string[],
): DeliveryReceipt {
  return {
    originalMessageId,
    deliveredTo,
    deliveredAt: new Date(Date.now()).toISOString(),
    deliveredBy,
    hopCount,
    deliveryPath,
  };
}

export function isMessageStale(message: RelayMessage, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  return Date.now() - new Date(message.createdAt).getTime() > maxAgeMs;
}

export function canForward(message: RelayMessage): boolean {
  return message.hopCount < message.maxHops && !isMessageExpired(message);
}

export function isDuplicateMessage(messageId: string, processedIds: Set<string>): boolean {
  return processedIds.has(messageId);
}
