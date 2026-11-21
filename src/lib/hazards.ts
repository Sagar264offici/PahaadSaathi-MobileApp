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
  status?: ReportStatus;
}) {
  const { data, error } = await supabase
    .from('hazards')
    .insert({
      type: report.type,
      description: report.description.trim(),
      area: report.area ?? null,
      latitude: report.latitude ?? null,
      longitude: report.longitude ?? null,
      severity: report.severity,
      photo_url: report.photo_url ?? null,
      reported_by: report.reported_by ?? null,
      reported_by_role: report.reported_by_role ?? null,
      status: report.status ?? 'reported',
    })
    .select()
    .single();

  if (error) throw error;

  return data as Hazard;
}

export async function getHazards(): Promise<Hazard[]> {
  const { data, error } = await supabase
    .from('hazards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []) as Hazard[];
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
