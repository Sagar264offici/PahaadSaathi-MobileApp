import { outboxRepository } from '../sqlite/outboxRepository';
import { incidentRepository } from '../sqlite/incidentRepository';
import { supabase } from '../supabase';

export interface SyncEngineResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export class SyncEngine {
  private isSyncing = false;
  private listeners: ((syncing: boolean) => void)[] = [];

  subscribe(listener: (syncing: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(syncing: boolean): void {
    for (const listener of this.listeners) {
      listener(syncing);
    }
  }

  isBusy(): boolean {
    return this.isSyncing;
  }

  /**
   * Process eligible outbox events in chronological order with re-entrancy protection.
   */
  async processOutbox(): Promise<SyncEngineResult> {
    if (this.isSyncing) {
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.isSyncing = true;
    this.notify(true);

    const result: SyncEngineResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    try {
      const eligibleEvents = await outboxRepository.getEligibleEvents();

      for (const event of eligibleEvents) {
        result.processed++;
        await outboxRepository.markProcessing(event.id);

        try {
          if (event.eventType === 'INCIDENT_CREATED') {
            const payload = event.payload as any;
            const { error } = await supabase.from('hazards').insert({
              type: payload.type,
              description: payload.description,
              area: payload.manualLocation || payload.area || null,
              latitude: payload.latitude || null,
              longitude: payload.longitude || null,
              severity: payload.severity || 'Medium',
              status: payload.status || 'reported',
              reported_by_role: payload.reportedByRole || 'citizen',
            });

            if (error) {
              throw new Error(error.message || 'Supabase incident insert failed');
            }

            await outboxRepository.markSynced(event.id);
            await incidentRepository.markSynced(event.aggregateId);
            result.succeeded++;
          } else {
            // General event acknowledgement
            await outboxRepository.markSynced(event.id);
            result.succeeded++;
          }
        } catch (err: any) {
          const errMsg = err?.message || 'Network sync error';
          result.failed++;
          result.errors.push(errMsg);
          await outboxRepository.markFailed(event.id, errMsg);
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify(false);
    }

    return result;
  }
}

export const syncEngine = new SyncEngine();
