/**
 * Valhalla routing service for PahaadSaathi.
 *
 * Provides real route calculation between two coordinates using the Valhalla
 * routing engine. Supports car, motorcycle, and truck vehicle profiles.
 *
 * The Valhalla endpoint is configured via EXPO_PUBLIC_VALHALLA_URL environment
 * variable. If not set, all routing calls will fail with a clear error.
 */

export type VehicleProfile = 'car' | 'motorcycle' | 'truck';

export type RouteStatus = 'idle' | 'loading' | 'success' | 'error';

export type RoutePoint = {
  lat: number;
  lon: number;
};

export type RouteLeg = {
  id: string;
  from: RoutePoint;
  to: RoutePoint;
  distanceMeters: number;
  durationSeconds: number;
  maneuvers: {
    type: string;
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
    beginShapeIndex: number;
    endShapeIndex: number;
  }[];
};

export type RouteResult = {
  id: string;
  vehicleProfile: VehicleProfile;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RoutePoint[];
  legs: RouteLeg[];
  summary: string;
  calculatedAt: number;
};

export type RouteError = {
  code: 'NO_ROUTE' | 'INVALID_COORDINATES' | 'SERVER_ERROR' | 'TIMEOUT' | 'UNAVAILABLE' | 'UNKNOWN';
  message: string;
};

/**
 * Map PahaadSaathi vehicle types to Valhalla costing models.
 */
const VEHICLE_COSTING: Record<VehicleProfile, string> = {
  car: 'auto',
  motorcycle: 'motorcycle',
  truck: 'truck',
};

/**
 * Decode a Google-encoded polyline string into [lat, lon] pairs.
 * Valhalla returns polyline6 geometry (precision 1e6).
 */
function decodePolyline(encoded: string, precision = 1e6): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const len = encoded.length;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlon = (result & 1) ? ~(result >> 1) : (result >> 1);
    lon += dlon;

    points.push({ lat: lat / precision, lon: lon / precision });
  }

  return points;
}

/**
 * Valhalla routing service client.
 */
export class ValhallaClient {
  private baseUrl: string;
  private requestTimeoutMs: number;

  constructor(baseUrl?: string, requestTimeoutMs = 30000) {
    this.baseUrl = baseUrl || process.env.EXPO_PUBLIC_VALHALLA_URL || '';
    this.requestTimeoutMs = requestTimeoutMs;
  }

  /**
   * Check if the Valhalla service is configured.
   */
  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.baseUrl.startsWith('http'));
  }

  /**
   * Calculate a route between origin and destination for the given vehicle profile.
   */
  async calculateRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    vehicleProfile: VehicleProfile = 'car',
  ): Promise<{ route?: RouteResult; error?: RouteError }> {
    if (!this.isConfigured()) {
      return {
        error: {
          code: 'UNAVAILABLE',
          message: 'Valhalla routing service is not configured. Set EXPO_PUBLIC_VALHALLA_URL.',
        },
      };
    }

    // Validate coordinates
    if (
      !this.isValidCoordinate(origin.lat, origin.lon) ||
      !this.isValidCoordinate(destination.lat, destination.lon)
    ) {
      return {
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Invalid origin or destination coordinates.',
        },
      };
    }

    const costing = VEHICLE_COSTING[vehicleProfile];

    const payload = {
      locations: [
        { lat: origin.lat, lon: origin.lon },
        { lat: destination.lat, lon: destination.lon },
      ],
      costing,
      costing_options: {
        [costing]: {
          // Default vehicle-agnostic options; truck-specific dims would
          // require user input, which we intentionally do not fabricate.
        },
      },
      directions_options: {
        units: 'kilometers',
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: {
              code: 'UNAVAILABLE',
              message: 'Routing service rate limit exceeded. Try again later.',
            },
          };
        }
        return {
          error: {
            code: 'SERVER_ERROR',
            message: `Routing service returned status ${response.status}.`,
          },
        };
      }

      const data = await response.json();

      if (data.error || !data.trip || !data.trip.legs || data.trip.legs.length === 0) {
        return {
          error: {
            code: 'NO_ROUTE',
            message: data.error || 'No route found between the selected locations.',
          },
        };
      }

      const route = this.mapResponseToRoute(data.trip, vehicleProfile);
      return { route };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === 'AbortError') {
        return {
          error: {
            code: 'TIMEOUT',
            message: 'Routing request timed out. Please try again.',
          },
        };
      }

      return {
        error: {
          code: 'SERVER_ERROR',
          message: err instanceof Error ? err.message : 'Unknown routing error.',
        },
      };
    }
  }

  private isValidCoordinate(lat: number, lon: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      isFinite(lat) &&
      isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }

  private mapResponseToRoute(
    trip: any,
    vehicleProfile: VehicleProfile,
  ): RouteResult {
    const summary = trip.summary || {};
    const legs = (trip.legs || []).map((leg: any, idx: number) => {
      const shape = typeof leg.shape === 'string' ? decodePolyline(leg.shape) : [];
      return {
      id: `leg-${idx}`,
      from: {
        lat: shape[0]?.lat ?? 0,
        lon: shape[0]?.lon ?? 0,
      },
      to: {
        lat: shape[shape.length - 1]?.lat ?? 0,
        lon: shape[shape.length - 1]?.lon ?? 0,
      },
      distanceMeters: (leg.length || 0) * 1000,
      durationSeconds: leg.time || 0,
      maneuvers: (leg.maneuvers || []).map((m: any, i: number) => ({
        type: m.type || 'unknown',
        instruction: m.instruction || 'Proceed',
        distanceMeters: (m.length || 0) * 1000,
        durationSeconds: m.time || 0,
        beginShapeIndex: m.begin_shape_index ?? 0,
        endShapeIndex: m.end_shape_index ?? 0,
      })),
    }; });

    // Decode geometry from the first leg's shape (Valhalla encodes per-leg)
    const geometry: RoutePoint[] = [];
    for (const leg of trip.legs || []) {
      if (typeof leg.shape === 'string') {
        const decoded = decodePolyline(leg.shape);
        geometry.push(...decoded);
      }
    }

    return {
      id: `route-${Date.now()}`,
      vehicleProfile,
      distanceMeters: (summary.length || 0) * 1000,
      durationSeconds: summary.time || 0,
      geometry,
      legs,
      summary: `${(summary.length || 0).toFixed(1)} km · ~${Math.round((summary.time || 0) / 60)} min`,
      calculatedAt: Date.now(),
    };
  }
}

/**
 * Singleton instance for use throughout the app.
 */
export const valhallaClient = new ValhallaClient();
