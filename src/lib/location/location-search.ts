/**
 * Location search service for PahaadSaathi.
 *
 * Uses Photon (OpenStreetMap-based geocoding) for place/landmark search.
 * No API key required for limited use. Respects Photon's rate limits.
 *
 * Reference: https://photon.komoot.io/
 */

export type PlaceCategory =
  | 'city'
  | 'town'
  | 'village'
  | 'road'
  | 'neighbourhood'
  | 'tourist_attraction'
  | 'temple'
  | 'hospital'
  | 'hotel'
  | 'restaurant'
  | 'petrol_pump'
  | 'bus_stand'
  | 'railway_station'
  | 'landmark'
  | 'other';

export type PlaceResult = {
  id: string;
  name: string;
  fullAddress?: string;
  category?: PlaceCategory;
  categoryLabel?: string;
  latitude: number;
  longitude: number;
  source: string;
  osmId?: string;
  osmType?: string;
};

export type LocationSearchResult = {
  results: PlaceResult[];
  query: string;
  total: number;
};

/**
 * Photon API base URL (OpenStreetMap-based geocoding, no API key required).
 * Respect rate limits: max 1 request per second recommended for free tier.
 */
const PHOTON_API_BASE = 'https://photon.komoot.io/api/';

/**
 * Map Photon OSM category to PahaadSaathi category label.
 */
function mapCategory(osmCategory?: string, osmType?: string): {
  category: PlaceCategory;
  label: string;
} {
  const cat = (osmCategory || '').toLowerCase();
  const type = (osmType || '').toLowerCase();

  if (cat.includes('village')) {
    return { category: 'village', label: 'Village' };
  }
  if (cat.includes('town')) {
    return { category: 'town', label: 'Town' };
  }
  if (cat.includes('city')) {
    return { category: 'city', label: 'City' };
  }
  if (cat.includes('road') || cat.includes('street') || cat.includes('highway')) {
    return { category: 'road', label: 'Road' };
  }
  if (cat.includes('neighbourhood') || cat.includes('suburb') || cat.includes('district')) {
    return { category: 'neighbourhood', label: 'Neighbourhood' };
  }
  if (cat.includes('tourism') || cat.includes('attraction') || cat.includes('monument')) {
    return { category: 'tourist_attraction', label: 'Tourist Attraction' };
  }
  if (cat.includes('temple') || cat.includes('place_of_worship') || cat.includes('church') || cat.includes('mosque')) {
    return { category: 'temple', label: 'Temple' };
  }
  if (cat.includes('hospital') || cat.includes('clinic') || cat.includes('health')) {
    return { category: 'hospital', label: 'Hospital' };
  }
  if (cat.includes('hotel') || cat.includes('guesthouse') || cat.includes('hostel')) {
    return { category: 'hotel', label: 'Hotel' };
  }
  if (cat.includes('restaurant') || cat.includes('cafe') || cat.includes('food')) {
    return { category: 'restaurant', label: 'Restaurant' };
  }
  if (cat.includes('petrol') || cat.includes('fuel') || cat.includes('gas_station')) {
    return { category: 'petrol_pump', label: 'Petrol Pump' };
  }
  if (cat.includes('bus') || cat.includes('bus_stop') || cat.includes('bus_station')) {
    return { category: 'bus_stand', label: 'Bus Stand' };
  }
  if (cat.includes('railway') || cat.includes('train') || cat.includes('station')) {
    return { category: 'railway_station', label: 'Railway Station' };
  }
  if (cat.includes('landmark') || cat.includes('historic')) {
    return { category: 'landmark', label: 'Landmark' };
  }

  return { category: 'other', label: 'Location' };
}

/**
 * Search for places/landmarks using Photon geocoding API.
 */
export async function searchPlaces(
  query: string,
  limit: number = 10,
  lat?: number,
  lon?: number,
): Promise<LocationSearchResult> {
  if (!query || query.trim().length < 2) {
    return { results: [], query, total: 0 };
  }

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(Math.min(limit, 20)),
  });

  if (lat !== undefined && lon !== undefined) {
    params.set('lat', String(lat));
    params.set('lon', String(lon));
  }

  const url = `${PHOTON_API_BASE}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PahaadSaathi/1.0 (mountain safety app)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Search service rate limit exceeded. Try again later.');
      }
      throw new Error(`Search service returned status ${response.status}`);
    }

    const data = await response.json();

    const features: Array<{
      properties: {
        name?: string;
        country?: string;
        city?: string;
        state?: string;
        osmkey?: string;
        osmvalue?: string;
        osm_id?: string;
        osm_type?: string;
      };
      geometry?: {
        coordinates?: [number, number];
      };
    }> = data.features || [];

    const results: PlaceResult[] = features.map((feature) => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [0, 0];
      const lon = coords[0];
      const lat = coords[1];
      const { category, label } = mapCategory(
        (props as any).osm_value || '',
        (props as any).osm_type || ''
      );

      return {
        id: props.osm_id || `${props.name || 'unknown'}-${lat}-${lon}`,
        name: props.name || 'Unknown Location',
        fullAddress: [
          props.city || props.osmvalue,
          props.state,
          props.country,
        ]
          .filter(Boolean)
          .join(', '),
        category,
        categoryLabel: label,
        latitude: lat,
        longitude: lon,
        source: 'photon',
        osmId: props.osm_id,
        osmType: props.osm_type,
      };
    });

    return {
      results,
      query,
      total: results.length,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Search request timed out. Please try again.');
    }
    throw err instanceof Error ? err : new Error('Search failed');
  }
}

/**
 * Reverse geocode coordinates to get place name.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<PlaceResult | null> {
  const url = `${PHOTON_API_BASE}/reverse?lat=${lat}&lon=${lon}&limit=1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PahaadSaathi/1.0 (mountain safety app)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Reverse geocode failed: ${response.status}`);
    }

    const data = await response.json();

    const features: Array<{
      properties: {
        name?: string;
        country?: string;
        city?: string;
        state?: string;
        osmkey?: string;
        osmvalue?: string;
        osm_id?: string;
        osm_type?: string;
      };
      geometry?: {
        coordinates?: [number, number];
      };
    }> = data.features || [];

    if (features.length === 0) {
      return null;
    }

    const feature = features[0];
    const props = feature.properties || {};
    const coords = feature.geometry?.coordinates || [lon, lat];
    const { category, label } = mapCategory(props.osmvalue, props.osm_type);

    return {
      id: props.osm_id || `${lat}-${lon}`,
      name: props.name || 'Unknown Location',
      fullAddress: [
        props.city || props.osmvalue,
        props.state,
        props.country,
      ]
        .filter(Boolean)
        .join(', '),
      category,
      categoryLabel: label,
      latitude: lat,
      longitude: lon,
      source: 'photon',
      osmId: props.osm_id,
      osmType: props.osm_type,
    };
  } catch {
    return null;
  }
}
