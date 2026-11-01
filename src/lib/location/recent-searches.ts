/**
 * Recent searches and saved places storage for PahaadSaathi.
 *
 * Uses AsyncStorage to persist search history and saved places locally.
 * Does not upload search history to any server.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'pahaadsaathi:recent_searches';
const SAVED_PLACES_KEY = 'pahaadsaathi:saved_places';
const MAX_RECENT_SEARCHES = 50;
const MAX_SAVED_PLACES = 100;

export type RecentSearch = {
  id: string;
  name: string;
  fullAddress?: string;
  category?: string;
  categoryLabel?: string;
  latitude: number;
  longitude: number;
  source: string;
  searchedAt: number;
};

export type SavedPlace = {
  id: string;
  name: string;
  fullAddress?: string;
  category?: string;
  categoryLabel?: string;
  latitude: number;
  longitude: number;
  source: string;
  savedAt: number;
  notes?: string;
};

export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSearch[];
  } catch {
    return [];
  }
}

export async function addRecentSearch(search: Omit<RecentSearch, 'searchedAt'>): Promise<void> {
  const existing = await getRecentSearches();

  // Remove if already exists (will be re-added at top)
  const filtered = existing.filter((s) => s.id !== search.id);

  const entry: RecentSearch = {
    ...search,
    searchedAt: Date.now(),
  };

  const updated = [entry, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export async function removeRecentSearch(id: string): Promise<void> {
  const existing = await getRecentSearches();
  const filtered = existing.filter((s) => s.id !== id);
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
}

export async function getSavedPlaces(): Promise<SavedPlace[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_PLACES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPlace[];
  } catch {
    return [];
  }
}

export async function savePlace(place: Omit<SavedPlace, 'savedAt'>): Promise<void> {
  const existing = await getSavedPlaces();

  // Remove if already exists
  const filtered = existing.filter((p) => p.id !== place.id);

  const entry: SavedPlace = {
    ...place,
    savedAt: Date.now(),
  };

  const updated = [entry, ...filtered].slice(0, MAX_SAVED_PLACES);
  await AsyncStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(updated));
}

export async function removeSavedPlace(id: string): Promise<void> {
  const existing = await getSavedPlaces();
  const filtered = existing.filter((p) => p.id !== id);
  await AsyncStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(filtered));
}

export async function toggleSavedPlace(place: Omit<SavedPlace, 'savedAt'>): Promise<boolean> {
  const existing = await getSavedPlaces();
  const exists = existing.some((p) => p.id === place.id);

  if (exists) {
    await removeSavedPlace(place.id);
    return false;
  }

  await savePlace(place);
  return true;
}

export async function isPlaceSaved(id: string): Promise<boolean> {
  const existing = await getSavedPlaces();
  return existing.some((p) => p.id === id);
}
