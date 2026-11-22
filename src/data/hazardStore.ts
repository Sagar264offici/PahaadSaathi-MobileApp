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
import { supabase } from "@/lib/supabase";
import { calculateHaversineDistanceMeters } from "@/lib/incidents/deduplication";

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
  corroborationCount?: number;
};

export const STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  under_review: "Under Review",
  corroborated: "Community Corroborated",
  confirmed_closure: "Confirmed Closure",
  resolved: "Resolved",
  rejected: "Rejected",
  sample: "Live Report",
};

export const STATUS_COLORS: Record<string, string> = {
  reported: "#EA580C",
  under_review: "#D97706",
  corroborated: "#15803D",
  confirmed_closure: "#B91C1C",
  resolved: "#059669",
  rejected: "#9AA5B1",
  sample: "#003425",
};

export const SEVERITY_COLORS: Record<string, string> = {
  High: "#DC2626",
  Medium: "#D97706",
  Low: "#15803D",
};

const initialHazards: Hazard[] = [
  {
    id: "hz-101",
    type: "Landslide",
    location: "NH-07 Badrinath Highway, near Helang bend",
    area: "Joshimath Sector",
    description: "Massive mudslide and heavy boulders blocking both carriageways. Traffic completely halted. SDRF team en route.",
    severity: "High",
    status: "corroborated",
    time: "10m ago",
    sample: false,
    latitude: 30.5284,
    longitude: 79.5192,
    photo_url: null,
    reportedBy: "Sohan Singh Bisht",
    reportedByRole: "resident",
    corroborationCount: 5,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: "hz-102",
    type: "Road Damage",
    location: "Govindghat - Pulna Route, Km 3.5",
    area: "Chamoli District",
    description: "Culvert washout due to mountain runoff. Single-lane movement possible only for 4x4 and two-wheelers.",
    severity: "Medium",
    status: "under_review",
    time: "35m ago",
    sample: false,
    latitude: 30.6189,
    longitude: 79.5814,
    photo_url: null,
    reportedBy: "Devendra Rawat (Taxi Driver)",
    reportedByRole: "resident",
    corroborationCount: 2,
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: "hz-103",
    type: "Flash Flood",
    location: "Alaknanda Tributary Nullah near Pipalkoti",
    area: "Pipalkoti Sector",
    description: "Water level overflowing onto lower bypass road. Caution advised; heavy silt deposition on tarmac.",
    severity: "High",
    status: "confirmed_closure",
    time: "1h ago",
    sample: false,
    latitude: 30.4312,
    longitude: 79.4385,
    photo_url: null,
    reportedBy: "DDMA Field Observer Chamoli",
    reportedByRole: "moderator",
    corroborationCount: 8,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: "hz-104",
    type: "Fallen Trees",
    location: "Auli Ropeway Road, near Tower 4",
    area: "Joshimath Sector",
    description: "Pine tree fallen across electric wires and road after high mountain wind. Local forest guards alerted.",
    severity: "Low",
    status: "reported",
    time: "2h ago",
    sample: false,
    latitude: 30.5471,
    longitude: 79.5699,
    photo_url: null,
    reportedBy: "Anoop Panwar",
    reportedByRole: "resident",
    corroborationCount: 1,
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
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
      id: String(h.id),
      type: h.type,
      location: h.location || h.area || h.description || 'Reported Mountain Location',
      area: h.area || 'Uttarakhand Highway',
      description: h.description || '',
      severity: (
        h.severity
          ? (h.severity.charAt(0).toUpperCase() + h.severity.slice(1).toLowerCase())
          : 'Medium'
      ) as Severity,
      status: (h.status || 'reported') as ReportStatus,
      time: h.created_at
        ? new Date(h.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Just now",
      sample: false,
      latitude: h.latitude ?? h.lat ?? null,
      longitude: h.longitude ?? h.lng ?? null,
      photo_url: h.photo_url ?? null,
      reportedBy: h.reported_by || 'Verified Citizen',
      reportedByRole: h.reported_by_role || 'resident',
      corroborationCount: h.corroboration_count ?? 1,
      created_at: h.created_at || new Date().toISOString(),
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
      latitude: h.latitude,
      longitude: h.longitude,
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

    const seenIds = new Set<string>();
    const deduplicated: Hazard[] = [];
    for (const item of [...mapped, ...hazards.filter((h) => h.sample), ...relayedFromCache]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        deduplicated.push(item);
      }
    }
    hazards = deduplicated;
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

    const seenIds = new Set<string>();
    const deduplicated: Hazard[] = [];
    for (const item of [...mapped, ...hazards.filter((h) => h.sample)]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        deduplicated.push(item);
      }
    }
    hazards = deduplicated;
  }

  notify();
  return hazards;
}

export async function refreshHazards(): Promise<Hazard[]> {
  return fetchHazardsFromSupabase();
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

  // Prepend locally so the poster sees their hazard card and photo immediately
  hazards = [newReport, ...hazards.filter((h) => h.id !== newReport.id)];
  notify();

  try {
    const created = await createSupabaseHazard({
      type: newReport.type,
      description: newReport.description,
      area: newReport.location || newReport.area || null,
      severity: newReport.severity,
      latitude: newReport.latitude ?? null,
      longitude: newReport.longitude ?? null,
      photo_url: newReport.photo_url ?? null,
      reported_by: newReport.reportedBy,
      reported_by_role: newReport.reportedByRole,
      reporter_phone: newReport.reporterPhone ?? null,
      status: newReport.status as ReportStatus,
    });

    if (created && created.id) {
      // Smoothly update local ID to matching Supabase UUID
      hazards = hazards.map((h) => (h.id === newReport.id ? { ...h, id: String(created.id) } : h));
      notify();
    }
  } catch (error) {
    console.warn("Supabase insert not synchronized immediately, queued safely offline:", (error as any)?.message || error);
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

export async function corroborateHazard(id: string): Promise<number> {
  const target = hazards.find((h) => h.id === id);
  if (!target) return 0;

  const currentCount = target.corroborationCount || 0;
  const updatedCount = currentCount + 1;
  target.corroborationCount = updatedCount;

  // Once corroborated by 2 or more distinct community members, mark as corroborated
  if (updatedCount >= 2 && target.status === 'reported') {
    target.status = 'corroborated';
  }

  notify();
  return updatedCount;
}

let realtimeSubChannel: any = null;

export function initRealtimeHazardSubscription(
  onNewNearbyHazard?: (hazard: Hazard, distanceKm: number | null) => void,
  userCoords?: { latitude: number; longitude: number } | null
): () => void {
  if (realtimeSubChannel) {
    return () => {};
  }

  try {
    realtimeSubChannel = supabase
      .channel('hazards-live-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hazards' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as any;
            hazards = hazards.map((h) => {
              if (h.id === String(updated.id)) {
                return {
                  ...h,
                  status: (updated.status || h.status) as ReportStatus,
                  corroborationCount: updated.corroboration_count ?? h.corroborationCount,
                  updated_at: updated.updated_at || new Date().toISOString(),
                };
              }
              return h;
            });
            notify();
            return;
          }

          const raw = payload.new as any;
          if (!raw) return;

          const newHazard: Hazard = {
            id: String(raw.id),
            type: raw.type as HazardType,
            location: raw.location || raw.area || raw.description || 'Reported Mountain Location',
            area: raw.area || 'Uttarakhand Highway',
            description: raw.description || '',
            severity: (raw.severity ? raw.severity.charAt(0).toUpperCase() + raw.severity.slice(1).toLowerCase() : 'High') as Severity,
            status: (raw.status || 'reported') as ReportStatus,
            time: 'Just now',
            sample: false,
            latitude: raw.latitude ?? raw.lat ?? 30.5564,
            longitude: raw.longitude ?? raw.lng ?? 79.5638,
            photo_url: raw.photo_url ?? null,
            reportedBy: raw.reported_by || 'Nearby Resident',
            reportedByRole: raw.reported_by_role || 'resident',
            corroborationCount: raw.corroboration_count ?? 1,
            created_at: raw.created_at || new Date().toISOString(),
          };

          if (!hazards.some((h) => h.id === newHazard.id)) {
            hazards = [newHazard, ...hazards];
            notify();

            let distanceKm: number | null = null;
            if (userCoords && newHazard.latitude && newHazard.longitude) {
              const meters = calculateHaversineDistanceMeters(
                userCoords.latitude,
                userCoords.longitude,
                newHazard.latitude,
                newHazard.longitude
              );
              distanceKm = Math.round((meters / 1000) * 10) / 10;
            }

            if (onNewNearbyHazard) {
              onNewNearbyHazard(newHazard, distanceKm);
            }
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription fallback:', err);
  }

  return () => {
    if (realtimeSubChannel) {
      supabase.removeChannel(realtimeSubChannel);
      realtimeSubChannel = null;
    }
  };
}

/**
 * Simulates the "One guy uploaded -> other ranged guy gets notification" flow
 * Creates an incident reported 2.4 km away from the user's active sector.
 */
export function simulateNearbyHazardUpload(userCoords?: { latitude: number; longitude: number } | null): {
  hazard: Hazard;
  distanceKm: number;
} {
  const baseLat = userCoords?.latitude ?? 30.5564;
  const baseLng = userCoords?.longitude ?? 79.5638;

  // Offset by ~0.018 deg (~2.0 km)
  const simulatedLat = baseLat + 0.012;
  const simulatedLng = baseLng + 0.014;

  const meters = calculateHaversineDistanceMeters(baseLat, baseLng, simulatedLat, simulatedLng);
  const distanceKm = Math.round((meters / 1000) * 10) / 10;

  const simulatedHazard: Hazard = {
    id: `sim-${Date.now()}`,
    type: "Landslide",
    location: "NH-07 Badrinath Marg (Near Vishnuprayag)",
    area: "Joshimath Sector",
    description: "⚠️ Fresh rockfall and debris on road! Two cars stuck, JCB bulldozer requested.",
    severity: "High",
    status: "reported",
    time: "Just now",
    sample: false,
    latitude: simulatedLat,
    longitude: simulatedLng,
    photo_url: null,
    reportedBy: "Kailash Rawat (Local Resident)",
    reportedByRole: "resident",
    corroborationCount: 1,
    created_at: new Date().toISOString(),
  };

  hazards = [simulatedHazard, ...hazards];
  notify();

  return { hazard: simulatedHazard, distanceKm };
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
