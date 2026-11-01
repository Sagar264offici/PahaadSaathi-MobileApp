import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'pahaadsaathi:hazards_cache';
const QUEUE_KEY = 'pahaadsaathi:offline_queue';

export type CachedHazard = {
  id: string;
  type: string;
  location: string;
  description: string;
  severity: string;
  status: string;
  time: string;
  sample: boolean;
  latitude: number | null;
  longitude: number | null;
  photo_url?: string | null;
  reportedBy?: string;
  fetched_at: number;
};

export type QueuedReport = {
  id: string;
  type: string;
  location: string;
  description: string;
  severity: string;
  status: string;
  time: string;
  created_at: number;
  retry_count: number;
  latitude: number | null;
  longitude: number | null;
  photo_url?: string | null;
};

export function initDatabase(): void {
  // AsyncStorage initializes automatically; nothing to do here
}

export async function cacheHazards(hazards: CachedHazard[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(hazards));
}

export async function getCachedHazards(): Promise<CachedHazard[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CachedHazard[];
  } catch {
    return [];
  }
}

export async function queueOfflineReport(report: Omit<QueuedReport, 'created_at' | 'retry_count'>): Promise<void> {
  const existing = await getQueuedReports();
  const alreadyExists = existing.some((q) => q.id === report.id);
  if (alreadyExists) return;

  const item: QueuedReport = {
    ...report,
    created_at: Date.now(),
    retry_count: 0,
  };
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, item]));
}

export async function getQueuedReports(): Promise<QueuedReport[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedReport[];
  } catch {
    return [];
  }
}

export async function removeQueuedReport(id: string): Promise<void> {
  const existing = await getQueuedReports();
  const filtered = existing.filter((q) => q.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function incrementRetryCount(id: string): Promise<void> {
  const existing = await getQueuedReports();
  const updated = existing.map((q) =>
    q.id === id ? { ...q, retry_count: q.retry_count + 1 } : q
  );
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function clearCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
  await AsyncStorage.removeItem(QUEUE_KEY);
}
