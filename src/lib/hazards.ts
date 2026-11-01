import { supabase } from './supabase';

export type HazardType =
  | 'Landslide'
  | 'Road Damage'
  | 'Waterlogging'
  | 'Accident'
  | 'Fallen Trees'
  | 'Other';

export type Severity = 'low' | 'medium' | 'high';

export type Hazard = {
  id: string;
  type: HazardType;
  description: string;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  created_at: string;
  status: string;
  severity: Severity;
  blocked_vehicles: string[];
};

export async function createHazard(report: {
  type: HazardType;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  severity: Severity;
  photo_url?: string | null;
}) {
  const { data, error } = await supabase
    .from('hazards')
    .insert({
      type: report.type,
      description: report.description.trim(),
      latitude: report.latitude ?? null,
      longitude: report.longitude ?? null,
      severity: report.severity,
      photo_url: report.photo_url ?? null,
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
