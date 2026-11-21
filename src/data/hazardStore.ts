import {
  createHazard as createSupabaseHazard,
  getHazards as getSupabaseHazards,
  updateHazardStatus as updateSupabaseHazardStatus,
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
import { isModerator } from "@/data/userStore";
import { incidentRepository } from "@/lib/sqlite/incidentRepository";

export type HazardType =
  | "Landslide"
  | "Road Damage"
  | "Waterlogging"
  | "Accident"
  | "Fallen Trees"
  | "Forest Fire"
  | "Flash Flood"
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
  area?: string | null;
  description: string;
  severity: Severity;
  status: ReportStatus | "sample";
  time: string;
  sample: boolean;
  reportedBy?: string;
  reportedByRole?: string;
  reporterPhone?: string | null;
  fromCache?: boolean;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  created_at: string;
  updated_at?: string;
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
  reported: "#EA580C",
  under_review: "#D97706",
  corroborated: "#34C759",
  confirmed_closure: "#FF6868",
  resolved: "#059669",
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
    area: "NH-07 Badrinath Highway",
    description: "Demonstration report showing how a landslide alert will appear.",
    severity: "High",
    status: "sample",
    time: "Demo",
    sample: true,
    latitude: null,
    longitude: null,
    photo_url: null,
    reportedBy: "System",
    reportedByRole: "administrator",
    created_at: new Date().toISOString(),
  },
  {
    id: "sample-2",
    type: "Road Damage",
    location: "Sample location — Hill route",
    area: "NH-107 Kedarnath Marg",
    description: "Demonstration report for damaged road conditions.",
    severity: "Medium",
    status: "sample",
    time: "Demo",
    sample: true,
    latitude: null,
    longitude: null,
    photo_url: null,
    reportedBy: "System",
    reportedByRole: "administrator",
    created_at: new Date().toISOString(),
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

export function getHazardsByArea(area: string): Hazard[] {
  return hazards.filter((h) => h.area === area || h.location.includes(area));
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
      area: h.area,
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
      reportedBy: h.reported_by,
      reportedByRole: h.reported_by_role,
      created_at: h.created_at,
      updated_at: h.updated_at,
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
    const relayedCache = (await getCachedHazards()).filter((item) => !cached.some((hazard) => hazard.id === item.id));
    await cacheHazards([...cached, ...relayedCache]);
    const relayedFromCache: Hazard[] = relayedCache.map((item) => ({
      id: item.id,
      type: item.type as HazardType,
      location: item.location,
      area: item.area,
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
      created_at: item.created_at || new Date().toISOString(),
    }));
    hazards = [...mapped, ...hazards.filter((h) => h.sample), ...relayedFromCache];
  } else {
    const cached = await getCachedHazards();
    mapped = cached.map((h) => ({
      id: h.id,
      type: h.type as HazardType,
      location: h.location,
      area: h.area,
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
      created_at: h.created_at || new Date().toISOString(),
    }));
    hazards = [...mapped, ...hazards.filter((h) => h.sample)];
  }

  notify();
  return hazards;
}

export async function addHazard(item: Omit<Hazard, 'id' | 'time' | 'sample' | 'created_at' | 'updated_at'>): Promise<void> {
  ensureDbInit();

  // Allow residents to submit too — moderator check removed for open reporting
  // (Authorities verify real vs fake in control room)

  const id = String(Date.now());
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newReport: Hazard = {
    ...item,
    id,
    time: timeString,
    sample: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  try {
    await createSupabaseHazard({
      type: newReport.type,
      description: newReport.description,
      area: newReport.area ?? null,
      severity: newReport.severity,
      latitude: newReport.latitude ?? null,
      longitude: newReport.longitude ?? null,
      photo_url: newReport.photo_url ?? null,
      reported_by: newReport.reportedBy,
      reported_by_role: newReport.reportedByRole,
      status: newReport.status as ReportStatus,
    });
  } catch (error) {
    console.error("Supabase insert failed, queueing offline:", error);
    await queueOfflineReport({
      id: newReport.id,
      type: newReport.type,
      location: newReport.location,
      area: newReport.area ?? null,
      description: newReport.description,
      severity: newReport.severity,
      status: newReport.status as ReportStatus,
      time: newReport.time,
      latitude: newReport.latitude ?? null,
      longitude: newReport.longitude ?? null,
      photo_url: newReport.photo_url ?? null,
      reported_by: newReport.reportedBy,
      reported_by_role: newReport.reportedByRole,
    });
  }

  // Ensure durable offline persistence in SQLite repository
  await incidentRepository.saveIncidentLocally({
    id: newReport.id,
    type: newReport.type,
    severity: newReport.severity,
    latitude: newReport.latitude,
    longitude: newReport.longitude,
    description: newReport.description,
    status: newReport.status as any,
    verificationStatus: 'unverified',
  }).catch(() => {});

  hazards = [newReport, ...hazards];
  notify();
}

export async function addRelayedHazard(item: Hazard): Promise<void> {
  ensureDbInit();
  if (hazards.some((hazard) => hazard.id === item.id)) return;
  const relayed = { ...item, reportedBy: 'Nearby Bluetooth' };
  hazards = [relayed, ...hazards];
  notify();
}

export async function updateHazardStatus(id: string, status: ReportStatus): Promise<void> {
  if (!isModerator()) {
    throw new Error("Only authorized moderators can update incident status.");
  }

  hazards = hazards.map((h) =>
    h.id === id ? { ...h, status, updated_at: new Date().toISOString() } : h
  );
  notify();

  try {
    await updateSupabaseHazardStatus(id, status);
  } catch (error) {
    console.error("Supabase status update failed:", error);
  }
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
  "Forest Fire",
  "Flash Flood",
  "Other",
];

export const severities: Severity[] = ["Low", "Medium", "High"];

// Offline queue functions

export type { QueuedReport };

export async function getOfflineQueue(): Promise<QueuedReport[]> {
  ensureDbInit();
  return getQueuedReports();
}

export async function removeOfflineReport(id: string): Promise<void> {
  ensureDbInit();
  return removeQueuedReport(id);
}

export async function retryOfflineReport(id: string): Promise<void> {
  ensureDbInit();
  return incrementRetryCount(id);
}

export async function syncOfflineQueue(): Promise<void> {
  if (syncInProgress) return;
  if (!isModerator()) return;
  syncInProgress = true;

  try {
    const queued = await getQueuedReports();
    for (const report of queued) {
      try {
        await createSupabaseHazard({
          type: report.type as HazardType,
          description: report.description,
          area: report.area ?? null,
          severity: report.severity as Severity,
          latitude: report.latitude ?? null,
          longitude: report.longitude ?? null,
          photo_url: report.photo_url ?? null,
          reported_by: report.reported_by,
          reported_by_role: report.reported_by_role,
          status: report.status as ReportStatus,
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
