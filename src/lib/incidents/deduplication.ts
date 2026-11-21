import { IncidentRecord } from '../sqlite/types';

export const DUPLICATE_DISTANCE_METERS_THRESHOLD = 500; // 500 meters
export const DUPLICATE_TIME_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Calculates Haversine distance between two sets of GPS coordinates in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchedIncidentId?: string;
  distanceMeters?: number;
  timeDiffMinutes?: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Checks whether a new report is a probable duplicate of an existing active incident.
 */
export function detectDuplicateIncident(
  newReport: {
    type: string;
    latitude?: number | null;
    longitude?: number | null;
    createdAt?: string;
  },
  existingIncidents: IncidentRecord[]
): DuplicateDetectionResult {
  if (!newReport.latitude || !newReport.longitude) {
    return { isDuplicate: false, confidence: 'low' };
  }

  const newTime = newReport.createdAt
    ? new Date(newReport.createdAt).getTime()
    : Date.now();

  for (const existing of existingIncidents) {
    // Only compare against active incidents
    if (existing.status === 'resolved' || existing.status === 'rejected') {
      continue;
    }

    if (
      existing.type.toLowerCase() === newReport.type.toLowerCase() &&
      existing.latitude &&
      existing.longitude
    ) {
      const distance = calculateHaversineDistanceMeters(
        newReport.latitude,
        newReport.longitude,
        existing.latitude,
        existing.longitude
      );

      const existingTime = new Date(existing.createdAt).getTime();
      const timeDiff = Math.abs(newTime - existingTime);

      if (
        distance <= DUPLICATE_DISTANCE_METERS_THRESHOLD &&
        timeDiff <= DUPLICATE_TIME_WINDOW_MS
      ) {
        return {
          isDuplicate: true,
          matchedIncidentId: existing.id,
          distanceMeters: Math.round(distance),
          timeDiffMinutes: Math.round(timeDiff / (60 * 1000)),
          confidence: distance <= 150 ? 'high' : 'medium',
        };
      }
    }
  }

  return { isDuplicate: false, confidence: 'low' };
}
