/**
 * Hazard-route analysis for PahaadSaathi.
 *
 * Checks hazard reports near a calculated route geometry and identifies:
 * - Nearby hazards (within a configurable proximity threshold)
 * - Confirmed road closures that may require avoidance
 * - Active reports (reported, under_review, corroborated) vs. resolved/rejected
 *
 * Important limitations:
 * - Hazard coordinates are point estimates, not road segments.
 * - A proximity match means the hazard is near the route, not necessarily on it.
 * - Only "confirmed_closure" status indicates an official road closure.
 * - Resolved/rejected reports must NOT be treated as active closures.
 */

import { Hazard } from '@/data/hazardStore';
import { RoutePoint, RouteResult } from './valhalla';

export type HazardProximity = 'none' | 'near' | 'on_route';

export type HazardOnRoute = {
  hazard: Hazard;
  distanceMeters: number;
  proximity: HazardProximity;
  isConfirmedClosure: boolean;
  isActive: boolean;
};

export type RouteHazardAnalysis = {
  routeId: string;
  totalHazardsNearby: number;
  activeHazards: HazardOnRoute[];
  confirmedClosures: HazardOnRoute[];
  hasActiveHazards: boolean;
  hasConfirmedClosure: boolean;
  warningMessage: string | null;
};

type ProximityOptions = {
  /** Distance in meters within which a hazard is considered "near" the route */
  nearThresholdMeters: number;
  /** Distance in meters within which a hazard is considered "on" the route */
  onRouteThresholdMeters: number;
  /** Buffer radius in meters around a confirmed closure for avoidance */
  closureBufferMeters: number;
};

const DEFAULT_OPTIONS: ProximityOptions = {
  nearThresholdMeters: 500,
  onRouteThresholdMeters: 100,
  closureBufferMeters: 200,
};

/**
 * Haversine distance between two points in meters.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate the minimum distance from a point to a polyline (route geometry).
 */
function distanceToPolyline(
  pointLat: number,
  pointLon: number,
  geometry: RoutePoint[],
): number {
  if (geometry.length === 0) return Infinity;
  if (geometry.length === 1) {
    return haversineDistance(pointLat, pointLon, geometry[0].lat, geometry[0].lon);
  }

  let minDistance = Infinity;
  for (let i = 0; i < geometry.length - 1; i++) {
    const p1 = geometry[i];
    const p2 = geometry[i + 1];
    const dist = pointToSegmentDistance(pointLat, pointLon, p1.lat, p1.lon, p2.lat, p2.lon);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
}

/**
 * Distance from point to line segment (in meters).
 * Uses approximate equirectangular projection for short distances.
 */
function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const metersPerDegreeLat = 110574;
  const meanLatRadians = ((y1 + y2 + px) / 3) * (Math.PI / 180);
  const metersPerDegreeLon = 111320 * Math.cos(meanLatRadians);
  const dx = (x2 - x1) * metersPerDegreeLon;
  const dy = (y2 - y1) * metersPerDegreeLat;
  if (dx === 0 && dy === 0) {
    return haversineDistance(px, py, x1, y1);
  }

  const pointX = (py - y1) * metersPerDegreeLon;
  const pointY = (px - x1) * metersPerDegreeLat;
  const t = (pointX * dx + pointY * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const closestLat = y1 + (clampedT * dy) / metersPerDegreeLat;
  const closestLon = x1 + (clampedT * dx) / metersPerDegreeLon;

  return haversineDistance(px, py, closestLat, closestLon);
}

/**
 * Determine if a hazard status is an active (actionable) status.
 * Resolved and rejected reports are NOT active.
 */
function isActiveStatus(status: string): boolean {
  return status === 'reported' || status === 'under_review' || status === 'corroborated';
}

/**
 * Analyze hazards near a calculated route.
 *
 * @param route - The calculated route with geometry
 * @param hazards - All hazard reports (from Supabase or cache)
 * @param options - Proximity configuration
 * @returns RouteHazardAnalysis with nearby hazards and closure warnings
 */
export function analyzeRouteHazards(
  route: RouteResult,
  hazards: Hazard[],
  options: Partial<ProximityOptions> = {},
): RouteHazardAnalysis {
  const opts: ProximityOptions = { ...DEFAULT_OPTIONS, ...options };
  const activeHazards: HazardOnRoute[] = [];
  const confirmedClosures: HazardOnRoute[] = [];

  for (const hazard of hazards) {
    // Skip reports without coordinates
    if (hazard.latitude === null || hazard.longitude === null) continue;

    // Skip resolved/rejected - they are NOT active hazards
    if (hazard.status === 'resolved' || hazard.status === 'rejected') continue;

    const distance = distanceToPolyline(hazard.latitude, hazard.longitude, route.geometry);
    const isConfirmedClosure = hazard.status === 'confirmed_closure';
    const isActive = isActiveStatus(hazard.status);

    let proximity: HazardProximity = 'none';
    if (distance <= opts.onRouteThresholdMeters) {
      proximity = 'on_route';
    } else if (distance <= opts.nearThresholdMeters) {
      proximity = 'near';
    }

    if (proximity === 'none') continue;

    const hazardOnRoute: HazardOnRoute = {
      hazard,
      distanceMeters: distance,
      proximity,
      isConfirmedClosure,
      isActive,
    };

    activeHazards.push(hazardOnRoute);

    if (isConfirmedClosure) {
      confirmedClosures.push(hazardOnRoute);
    }
  }

  // Sort by distance (closest first)
  activeHazards.sort((a, b) => a.distanceMeters - b.distanceMeters);
  confirmedClosures.sort((a, b) => a.distanceMeters - b.distanceMeters);

  let warningMessage: string | null = null;

  if (confirmedClosures.length > 0) {
    const closest = confirmedClosures[0];
    warningMessage = `⚠️ CONFIRMED ROAD CLOSURE: ${closest.hazard.type} at ${closest.hazard.location}. Route may be blocked.`;
  } else if (activeHazards.length > 0) {
    const closest = activeHazards[0];
    warningMessage = `⚠️ ${activeHazards.length} hazard(s) near route. Closest: ${closest.hazard.type} at ${closest.hazard.location} (${Math.round(closest.distanceMeters)} m).`;
  }

  return {
    routeId: route.id,
    totalHazardsNearby: activeHazards.length,
    activeHazards,
    confirmedClosures,
    hasActiveHazards: activeHazards.length > 0,
    hasConfirmedClosure: confirmedClosures.length > 0,
    warningMessage,
  };
}

export { haversineDistance, distanceToPolyline, isActiveStatus };
export type { ProximityOptions };
export { DEFAULT_OPTIONS };
