import { OutboxEvent, OutboxStatus } from './types';

export const MAX_RETRY_LIMIT = 5;
export const BASE_BACKOFF_MS = 2000;
export const MAX_BACKOFF_MS = 60000;

/**
 * Calculates exponential backoff with randomized jitter to prevent thundering herd.
 * Formula: min(maxMs, baseMs * 2^(retryCount)) + jitter
 */
export function calculateExponentialBackoff(
  retryCount: number,
  baseMs: number = BASE_BACKOFF_MS,
  maxMs: number = MAX_BACKOFF_MS,
  jitterRatio: number = 0.25
): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, retryCount)));
  const jitterRange = exponential * jitterRatio;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.floor(Math.max(baseMs, exponential + jitter));
}

/**
 * Checks whether an outbox event is eligible for synchronization right now.
 */
export function isEventEligibleForSync(event: OutboxEvent, nowMs: number = Date.now()): boolean {
  if (event.status === 'synced' || event.status === 'processing') {
    return false;
  }
  if (event.status === 'failed' || event.status === 'needs_review') {
    return false;
  }
  if (event.status === 'pending') {
    if (!event.nextRetryAt) {
      return true;
    }
    const nextRetryMs = new Date(event.nextRetryAt).getTime();
    return nowMs >= nextRetryMs;
  }
  return false;
}

/**
 * Computes next outbox state when an attempt fails.
 */
export function computeFailedEventState(
  event: OutboxEvent,
  errorMessage: string,
  nowMs: number = Date.now()
): {
  status: OutboxStatus;
  retryCount: number;
  nextRetryAt?: string;
  lastError: string;
} {
  const newRetryCount = event.retryCount + 1;
  if (newRetryCount >= MAX_RETRY_LIMIT) {
    return {
      status: 'failed',
      retryCount: newRetryCount,
      nextRetryAt: undefined,
      lastError: errorMessage,
    };
  }

  const delayMs = calculateExponentialBackoff(newRetryCount);
  const nextRetryDate = new Date(nowMs + delayMs).toISOString();

  return {
    status: 'pending',
    retryCount: newRetryCount,
    nextRetryAt: nextRetryDate,
    lastError: errorMessage,
  };
}

/**
 * Generates an outbox event with a unique ID and idempotency key.
 */
export function createOutboxEvent(
  eventType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  customIdempotencyKey?: string
): OutboxEvent {
  const now = new Date().toISOString();
  const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const idempotencyKey =
    customIdempotencyKey || `${eventType}_${aggregateId}_${Date.now()}`;

  return {
    id,
    eventType,
    aggregateId,
    payload,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    retryCount: 0,
    idempotencyKey,
  };
}
