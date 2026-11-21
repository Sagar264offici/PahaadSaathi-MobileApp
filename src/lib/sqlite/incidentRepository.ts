import { SafeStorage } from '../storageHelper';
import { IncidentRecord } from './types';
import { outboxRepository } from './outboxRepository';

const INCIDENTS_STORAGE_KEY = 'pahaadsaathi:sqlite:incidents';

export class IncidentRepository {
  private inMemoryIncidents: Map<string, IncidentRecord> = new Map();
  private isLoaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const raw = await SafeStorage.getItem(INCIDENTS_STORAGE_KEY);
      if (raw) {
        const list: IncidentRecord[] = JSON.parse(raw);
        for (const item of list) {
          this.inMemoryIncidents.set(item.id, item);
        }
      }
    } catch {
      // In-memory incidents remain active
    }
    this.isLoaded = true;
  }

  private async persist(): Promise<void> {
    try {
      const list = Array.from(this.inMemoryIncidents.values());
      await SafeStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Handled gracefully
    }
  }

  /**
   * Save an incident locally first, and enqueue an event in the durable outbox.
   */
  async saveIncidentLocally(
    incident: Omit<IncidentRecord, 'createdAt' | 'updatedAt' | 'syncStatus'> & {
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<IncidentRecord> {
    await this.ensureLoaded();

    const now = new Date().toISOString();
    const record: IncidentRecord = {
      ...incident,
      createdAt: incident.createdAt || now,
      updatedAt: now,
      syncStatus: 'pending',
    };

    this.inMemoryIncidents.set(record.id, record);
    await this.persist();

    // Enqueue in outbox for reliable background synchronization
    await outboxRepository.enqueue(
      'INCIDENT_CREATED',
      record.id,
      { ...record },
      `create_incident_${record.id}`
    );

    return record;
  }

  async getAll(): Promise<IncidentRecord[]> {
    await this.ensureLoaded();
    return Array.from(this.inMemoryIncidents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getById(id: string): Promise<IncidentRecord | undefined> {
    await this.ensureLoaded();
    return this.inMemoryIncidents.get(id);
  }

  async updateVerification(
    id: string,
    verificationStatus: IncidentRecord['verificationStatus'],
    newStatus?: IncidentRecord['status']
  ): Promise<void> {
    await this.ensureLoaded();
    const record = this.inMemoryIncidents.get(id);
    if (record) {
      record.verificationStatus = verificationStatus;
      if (newStatus) {
        record.status = newStatus;
      }
      record.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }

  async markSynced(id: string): Promise<void> {
    await this.ensureLoaded();
    const record = this.inMemoryIncidents.get(id);
    if (record) {
      record.syncStatus = 'synced';
      record.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }

  async clear(): Promise<void> {
    this.inMemoryIncidents.clear();
    await SafeStorage.removeItem(INCIDENTS_STORAGE_KEY);
  }
}

export const incidentRepository = new IncidentRepository();
