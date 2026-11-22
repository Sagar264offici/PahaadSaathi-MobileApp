import { supabase } from './supabase';

export type HazardType =
  | 'Landslide'
  | 'Road Damage'
  | 'Waterlogging'
  | 'Accident'
  | 'Fallen Trees'
  | 'Forest Fire'
  | 'Flash Flood'
  | 'Other';

export type Severity = 'Low' | 'Medium' | 'High';

export type ReportStatus =
  | 'reported'
  | 'under_review'
  | 'corroborated'
  | 'confirmed_closure'
  | 'resolved'
  | 'rejected';

export type Hazard = {
  id: string;
  type: HazardType;
  description: string;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string | null;
  status: ReportStatus;
  severity: Severity;
  blocked_vehicles: string[];
  reported_by: string | null;
  reported_by_role: string | null;
};

export async function createHazard(report: {
  type: HazardType;
  description: string;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  severity: Severity;
  photo_url?: string | null;
  reported_by?: string | null;
  reported_by_role?: string | null;
  reporter_phone?: string | null;
  status?: ReportStatus;
}) {
  // First attempt: standard schema with latitude / longitude / reported_by / reporter_phone
  const standardPayload: Record<string, any> = {
    type: report.type,
    description: report.description.trim(),
    area: report.area ?? null,
    latitude: report.latitude ?? null,
    longitude: report.longitude ?? null,
    severity: report.severity,
    photo_url: report.photo_url ?? null,
    reported_by: report.reported_by ?? null,
    reported_by_role: report.reported_by_role ?? null,
    reporter_phone: report.reporter_phone ?? null,
    status: report.status ?? 'reported',
  };

  let { data, error } = await supabase
    .from('hazards')
    .insert(standardPayload)
    .select()
    .single();

  // Schema resilience: If 'latitude' or columns do not exist in Supabase schema cache (e.g. PGRST204)
  if (error && (error.code === 'PGRST204' || error.message?.includes('latitude') || error.message?.includes('column'))) {
    // Retry with legacy schema: lat / lng and lowercase severity
    const fallbackPayload: Record<string, any> = {
      type: report.type,
      description: report.description.trim(),
      area: report.area ?? null,
      lat: report.latitude ?? 0,
      lng: report.longitude ?? 0,
      severity: (report.severity || 'Medium').toLowerCase(),
      photo_url: report.photo_url ?? null,
      status: report.status ?? 'reported',
    };

    const fallbackRes = await supabase
      .from('hazards')
      .insert(fallbackPayload)
      .select()
      .single();

    if (!fallbackRes.error && fallbackRes.data) {
      data = fallbackRes.data;
      error = null;
    } else if (fallbackRes.error) {
      error = fallbackRes.error;
    }
  }

  if (error) throw error;

  const row = data as any;
  return {
    ...row,
    latitude: row.latitude ?? row.lat ?? null,
    longitude: row.longitude ?? row.lng ?? null,
    severity: row.severity
      ? (row.severity.charAt(0).toUpperCase() + row.severity.slice(1).toLowerCase())
      : 'Medium',
  } as Hazard;
}

export async function getHazards(): Promise<Hazard[]> {
  const { data, error } = await supabase
    .from('hazards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    latitude: row.latitude ?? row.lat ?? null,
    longitude: row.longitude ?? row.lng ?? null,
    severity: row.severity
      ? (row.severity.charAt(0).toUpperCase() + row.severity.slice(1).toLowerCase())
      : 'Medium',
  })) as Hazard[];
}

export async function updateHazardStatus(id: string, status: ReportStatus) {
  const { data, error } = await supabase
    .from('hazards')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as Hazard;
}
