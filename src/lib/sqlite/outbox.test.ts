import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateExponentialBackoff,
  isEventEligibleForSync,
  computeFailedEventState,
  createOutboxEvent,
  MAX_RETRY_LIMIT,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
} from './outboxLogic';
import { OutboxEvent } from './types';

describe('Outbox Engine Logic Tests', () => {
  it('should calculate exponential backoff within bounds', () => {
    const delay0 = calculateExponentialBackoff(0, BASE_BACKOFF_MS, MAX_BACKOFF_MS, 0);
    const delay1 = calculateExponentialBackoff(1, BASE_BACKOFF_MS, MAX_BACKOFF_MS, 0);
    const delay2 = calculateExponentialBackoff(2, BASE_BACKOFF_MS, MAX_BACKOFF_MS, 0);

    assert.strictEqual(delay0, 2000);
    assert.strictEqual(delay1, 4000);
    assert.strictEqual(delay2, 8000);

    const delayMax = calculateExponentialBackoff(10, BASE_BACKOFF_MS, MAX_BACKOFF_MS, 0);
    assert.strictEqual(delayMax, MAX_BACKOFF_MS);
  });

  it('should correctly evaluate event eligibility for synchronization', () => {
    const now = 1700000000000;
    const eligibleEvent: OutboxEvent = {
      id: 'e1',
      eventType: 'INCIDENT_CREATED',
      aggregateId: 'inc1',
      payload: {},
      createdAt: new Date(now - 10000).toISOString(),
      updatedAt: new Date(now - 10000).toISOString(),
      status: 'pending',
      retryCount: 0,
      idempotencyKey: 'key1',
    };

    assert.strictEqual(isEventEligibleForSync(eligibleEvent, now), true);

    const syncedEvent: OutboxEvent = { ...eligibleEvent, status: 'synced' };
    assert.strictEqual(isEventEligibleForSync(syncedEvent, now), false);

    const futureRetryEvent: OutboxEvent = {
      ...eligibleEvent,
      nextRetryAt: new Date(now + 5000).toISOString(),
    };
    assert.strictEqual(isEventEligibleForSync(futureRetryEvent, now), false);

    const pastRetryEvent: OutboxEvent = {
      ...eligibleEvent,
      nextRetryAt: new Date(now - 1000).toISOString(),
    };
    assert.strictEqual(isEventEligibleForSync(pastRetryEvent, now), true);
  });

  it('should transition to failed status when MAX_RETRY_LIMIT is exceeded', () => {
    const now = 1700000000000;
    const event: OutboxEvent = {
      id: 'e2',
      eventType: 'INCIDENT_CREATED',
      aggregateId: 'inc2',
      payload: {},
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      status: 'pending',
      retryCount: MAX_RETRY_LIMIT - 1,
      idempotencyKey: 'key2',
    };

    const nextState = computeFailedEventState(event, 'Connection timed out', now);
    assert.strictEqual(nextState.status, 'failed');
    assert.strictEqual(nextState.retryCount, MAX_RETRY_LIMIT);
    assert.strictEqual(nextState.nextRetryAt, undefined);
    assert.strictEqual(nextState.lastError, 'Connection timed out');
  });

  it('should generate distinct outbox events with stable idempotency keys', () => {
    const ev1 = createOutboxEvent('INCIDENT_CREATED', 'INC-101', { val: 1 }, 'custom_idem_1');
    const ev2 = createOutboxEvent('INCIDENT_CREATED', 'INC-102', { val: 2 }, 'custom_idem_2');

    assert.notStrictEqual(ev1.id, ev2.id);
    assert.strictEqual(ev1.idempotencyKey, 'custom_idem_1');
    assert.strictEqual(ev1.status, 'pending');
    assert.strictEqual(ev1.retryCount, 0);
  });
});
