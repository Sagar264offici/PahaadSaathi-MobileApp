import {
  createHazard as createSupabaseHazard,
  getHazards as getSupabaseHazards,
} from "@/lib/hazards";
import {
  initDatabase,
  cacheHazards,
  getCachedHazards,
  queueOfflineReport,
  getQueuedReports,
  removeQueuedReport,
  incrementRetryCount,
  CachedHazard,
  QueuedReport,
} from "@/lib/db";

export type HazardType =
  | "Landslide"
  | "Road Damage"
  | "Waterlogging"
  | "Accident"
  | "Fallen Trees"
  | "Other";
export type Severity = "Low" | "Medium" | "High";
export type ReportStatus =
  | "reported"
  | "under_review"
  | "corroborated"
  | "confirmed_closure"
  | "resolved"
  | "rejected";

export type Hazard = {
  id: string;
  type: HazardType;
  location: string;
  description: string;
  severity: Severity;
  status: ReportStatus | "sample";
  time: string;
  sample: boolean;
  reportedBy?: string;
  fromCache?: boolean;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
};

export const STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  under_review: "Under Review",
  corroborated: "Corroborated",
  confirmed_closure: "Confirmed Closure",
  resolved: "Resolved",
  rejected: "Rejected",
  sample: "Demo Data",
};

export const STATUS_COLORS: Record<string, string> = {
  reported: "#FFCA75",
  under_review: "#50D6A0",
  corroborated: "#34C759",
  confirmed_closure: "#FF6868",
  resolved: "#48D6A0",
  rejected: "#9AA5B1",
  sample: "#BECAD5",
};

export const SEVERITY_COLORS: Record<string, string> = {
  High: "#FF6868",
  Medium: "#FFB84D",
  Low: "#48D6A0",
};

const initialHazards: Hazard[] = [
  {
    id: "sample-1",
    type: "Landslide",
    location: "Sample location — Mountain road",
    description: "Demonstration report showing how a landslide alert will appear.",
    severity: "High",
    status: "sample",
    time: "Demo",
    sample: true,
    latitude: null,
    longitude: null,
    photo_url: null,
  },
  {
    id: "sample-2",
    type: "Road Damage",
    location: "Sample location — Hill route",
    description: "Demonstration report for damaged road conditions.",
    severity: "Medium",
    status: "sample",
    time: "Demo",
    sample: true,
    latitude: null,
    longitude: null,
    photo_url: null,
  },
];

let hazards: Hazard[] = [...initialHazards];
const listeners: ((items: Hazard[]) => void)[] = [];
let dbInitialized = false;
let syncInProgress = false;

function ensureDbInit(): void {
  if (!dbInitialized) {
    initDatabase();
    dbInitialized = true;
  }
}

export function getHazards(): Hazard[] {
  return hazards;
}

export function getHazard(id: string): Hazard | undefined {
  return hazards.find((h) => h.id === id);
}

export async function fetchHazardsFromSupabase(): Promise<Hazard[]> {
  ensureDbInit();

  let supabaseHazards: any[] = [];
  let online = false;

  try {
    supabaseHazards = await getSupabaseHazards();
    online = true;
  } catch (err) {
    console.error("Supabase fetch failed:", err);
    online = false;
  }

  let mapped: Hazard[];

  if (online && supabaseHazards.length > 0) {
    mapped = supabaseHazards.map((h) => ({
      id: h.id,
      type: h.type,
      location: h.description,
      description: h.description,
      severity: (
        h.severity.charAt(0).toUpperCase() + h.severity.slice(1)
      ) as Severity,
      status: h.status as ReportStatus,
      time: h.created_at
        ? new Date(h.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      sample: false,
      latitude: h.latitude ?? null,
      longitude: h.longitude ?? null,
      photo_url: h.photo_url ?? null,
    }));
    const cached: CachedHazard[] = mapped.map((h) => ({
      id: h.id,
      type: h.type,
      location: h.location,
      description: h.description,
      severity: h.severity,
      status: h.status,
      time: h.time,
      sample: false,
      latitude: null,
      longitude: null,
      photo_url: h.photo_url ?? null,
      fetched_at: Date.now(),
    }));
    const relayedCache = (await getCachedHazards()).filter((item) => item.reportedBy === 'Nearby Bluetooth' && !cached.some((hazard) => hazard.id === item.id));
    await cacheHazards([...cached, ...relayedCache]);
    const relayedFromCache: Hazard[] = relayedCache.map((item) => ({
      id: item.id,
      type: item.type as HazardType,
      location: item.location,
      description: item.description,
      severity: item.severity as Severity,
      status: item.status as ReportStatus,
      time: item.time,
      sample: false,
      fromCache: true,
      latitude: item.latitude,
      longitude: item.longitude,
      photo_url: item.photo_url ?? null,
      reportedBy: item.reportedBy,
    }));
    const relayedMemory = [...hazards.filter((h) => h.reportedBy === 'Nearby Bluetooth'), ...relayedFromCache]
      .filter((hazard, index, all) => all.findIndex((candidate) => candidate.id === hazard.id) === index)
      .filter((hazard) => !mapped.some((remote) => remote.type === hazard.type && hazard.description.startsWith(remote.description)));
    hazards = [...mapped, ...hazards.filter((h) => h.sample), ...relayedMemory];
  } else {
    const cached = await getCachedHazards();
    mapped = cached.map((h) => ({
      id: h.id,
      type: h.type as HazardType,
      location: h.location,
      description: h.description,
      severity: h.severity as Severity,
      status: h.status as ReportStatus,
      time: h.time,
      sample: false,
      fromCache: true,
      latitude: h.latitude,
      longitude: h.longitude,
      photo_url: h.photo_url ?? null,
      reportedBy: h.reportedBy,
    }));
    hazards = [...mapped, ...hazards.filter((h) => h.sample)];
  }

  notify();
  return hazards;
}

export async function addHazard(item: Hazard): Promise<void> {
  ensureDbInit();

  try {
    await createSupabaseHazard({
      type: item.type,
      description: item.description,
      severity: item.severity.toLowerCase() as "low" | "medium" | "high",
      photo_url: item.photo_url ?? null,
    });
  } catch (error) {
    console.error("Supabase insert failed, queueing offline:", error);
    await queueOfflineReport({
      id: item.id,
      type: item.type,
      location: item.location,
      description: item.description,
      severity: item.severity.toLowerCase() as "low" | "medium" | "high",
      status: item.status,
      time: item.time,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      photo_url: item.photo_url ?? null,
    });
  }

  hazards = [item, ...hazards];
  notify();
}

export async function addRelayedHazard(item: Hazard): Promise<void> {
  ensureDbInit();
  if (hazards.some((hazard) => hazard.id === item.id)) return;
  const relayed = { ...item, reportedBy: 'Nearby Bluetooth' };
  hazards = [relayed, ...hazards];
  notify();
  const cached = await getCachedHazards();
  await cacheHazards([
    {
      ...relayed,
      sample: false,
      fetched_at: Date.now(),
    },
    ...cached.filter((hazard) => hazard.id !== relayed.id),
  ]);
}

export function updateHazardStatus(id: string, status: ReportStatus): void {
  hazards = hazards.map((h) =>
    h.id === id ? { ...h, status } : h
  );
  notify();
}

export function subscribe(fn: (items: Hazard[]) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notify(): void {
  const snapshot = hazards;
  for (const fn of listeners) fn(snapshot);
}

export const hazardTypes: HazardType[] = [
  "Landslide",
  "Road Damage",
  "Waterlogging",
  "Accident",
  "Fallen Trees",
  "Other",
];

export const severities: Severity[] = ["Low", "Medium", "High"];

// Offline queue functions

export async function getOfflineQueue(): Promise<QueuedReport[]> {
  ensureDbInit();
  return getQueuedReports();
}

export async function syncOfflineQueue(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    const queued = await getQueuedReports();
    for (const report of queued) {
      try {
        await createSupabaseHazard({
          type: report.type as HazardType,
          description: report.description,
          severity: report.severity.toLowerCase() as "low" | "medium" | "high",
          photo_url: report.photo_url ?? null,
        });
        await removeQueuedReport(report.id);
      } catch (err) {
        await incrementRetryCount(report.id);
        console.error(`Sync failed for ${report.id}:`, err);
      }
    }
  } finally {
    syncInProgress = false;
  }
}
