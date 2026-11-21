import { SafeStorage } from '../storageHelper';
import { OutboxEvent } from './types';
import {
  computeFailedEventState,
  createOutboxEvent,
  isEventEligibleForSync,
} from './outboxLogic';

const OUTBOX_STORAGE_KEY = 'pahaadsaathi:sqlite:outbox_events';

export class OutboxRepository {
  private inMemoryQueue: Map<string, OutboxEvent> = new Map();
  private isLoaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const raw = await SafeStorage.getItem(OUTBOX_STORAGE_KEY);
      if (raw) {
        const events: OutboxEvent[] = JSON.parse(raw);
        for (const ev of events) {
          // Restart recovery: recover events left in 'processing' state when app killed
          if (ev.status === 'processing') {
            ev.status = 'pending';
          }
          this.inMemoryQueue.set(ev.id, ev);
        }
      }
    } catch {
      // In-memory queue remains active
    }
    this.isLoaded = true;
  }

  private async persist(): Promise<void> {
    try {
      const list = Array.from(this.inMemoryQueue.values());
      await SafeStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Storage write error handled gracefully
    }
  }

  async enqueue(
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<OutboxEvent> {
    await this.ensureLoaded();

    // Check idempotency: avoid inserting identical event if already queued
    if (idempotencyKey) {
      for (const ev of this.inMemoryQueue.values()) {
        if (ev.idempotencyKey === idempotencyKey && ev.status !== 'failed') {
          return ev;
        }
      }
    }

    const event = createOutboxEvent(eventType, aggregateId, payload, idempotencyKey);
    this.inMemoryQueue.set(event.id, event);
    await this.persist();
    return event;
  }

  async getEligibleEvents(nowMs: number = Date.now()): Promise<OutboxEvent[]> {
    await this.ensureLoaded();
    const eligible: OutboxEvent[] = [];
    for (const ev of this.inMemoryQueue.values()) {
      if (isEventEligibleForSync(ev, nowMs)) {
        eligible.push({ ...ev });
      }
    }
    return eligible.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getAll(): Promise<OutboxEvent[]> {
    await this.ensureLoaded();
    return Array.from(this.inMemoryQueue.values());
  }

  async getPendingCount(): Promise<number> {
    await this.ensureLoaded();
    let count = 0;
    for (const ev of this.inMemoryQueue.values()) {
      if (ev.status === 'pending' || ev.status === 'processing') {
        count++;
      }
    }
    return count;
  }

  async markProcessing(eventId: string): Promise<void> {
    await this.ensureLoaded();
    const ev = this.inMemoryQueue.get(eventId);
    if (ev && ev.status === 'pending') {
      ev.status = 'processing';
      ev.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }

  async markSynced(eventId: string): Promise<void> {
    await this.ensureLoaded();
    const ev = this.inMemoryQueue.get(eventId);
    if (ev) {
      ev.status = 'synced';
      ev.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }

  async markFailed(eventId: string, errorMessage: string, nowMs: number = Date.now()): Promise<void> {
    await this.ensureLoaded();
    const ev = this.inMemoryQueue.get(eventId);
    if (ev) {
      const nextState = computeFailedEventState(ev, errorMessage, nowMs);
      ev.status = nextState.status;
      ev.retryCount = nextState.retryCount;
      ev.nextRetryAt = nextState.nextRetryAt;
      ev.lastError = nextState.lastError;
      ev.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }

  async clear(): Promise<void> {
    this.inMemoryQueue.clear();
    await SafeStorage.removeItem(OUTBOX_STORAGE_KEY);
  }
}

export const outboxRepository = new OutboxRepository();
