import * as Location from 'expo-location';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';

import { valhallaClient, type VehicleProfile, type RouteResult, type RoutePoint, type RouteStatus } from '@/lib/routing/valhalla';
import {
  analyzeRouteHazards,
  HazardOnRoute,
  DEFAULT_OPTIONS,
} from '@/lib/routing/hazardAnalyzer';
import {
  Hazard,
  getHazards,
  subscribe,
} from '@/data/hazardStore';
import { searchPlaces } from '@/lib/location/location-search';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

export default function MapScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestId = useRef(0);

  const [vehicle, setVehicle] = useState<VehicleProfile>('car');
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [searchSuggestions, setSearchSuggestions] = useState<{
    id: string;
    name: string;
    lat: number;
    lon: number;
    category?: string;
    categoryLabel?: string;
  }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [hazardsOnRoute, setHazardsOnRoute] = useState<HazardOnRoute[]>([]);
  const [hazardWarning, setHazardWarning] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | undefined>(undefined);
  const [locationPermission, setLocationPermission] = useState<
    'granted' | 'denied' | 'undetermined' | null
  >(null);

  const [hazards, setHazards] = useState<Hazard[]>(getHazards());

  useEffect(() => {
    const unsub = subscribe((items) => setHazards(items));
    return () => unsub();
  }, []);

  useEffect(() => () => {
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchRequestId.current += 1;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        setLocationPermission(status as 'granted' | 'denied' | 'undetermined');
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (cancelled) return;
          setOrigin({ lat: loc.coords.latitude, lon: loc.coords.longitude });
          setMapRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        }
      } catch {
        if (!cancelled) setLocationPermission('denied');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setCurrentLocation = useCallback(async () => {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const point = { lat: loc.coords.latitude, lon: loc.coords.longitude };
    setOrigin(point);
    setMapRegion({ latitude: point.lat, longitude: point.lon, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  }, []);

  const calculateRoute = useCallback(async () => {
    if (!origin) {
      Alert.alert('Current location needed', 'Allow location access or tap the location button before calculating a route.');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Missing destination', 'Enter a place name or coordinates to calculate a route.');
      return;
    }

    let destCoords: RoutePoint | null = null;

    const coordMatch = destination.match(/^([-+]?\d+(\.\d+)?),\s*([-+]?\d+(\.\d+)?)$/);
    if (coordMatch) {
      destCoords = {
        lat: parseFloat(coordMatch[1]),
        lon: parseFloat(coordMatch[3]),
      };
    } else {
      const matched = hazards.find(
        (h) =>
          h.latitude !== null &&
          h.longitude !== null &&
          h.location.toLowerCase().includes(destination.toLowerCase().trim()),
      );
      if (matched && matched.latitude !== null && matched.longitude !== null) {
        destCoords = { lat: matched.latitude, lon: matched.longitude };
      } else {
        Alert.alert('Place not found', 'Choose a destination from the suggestions, or enter coordinates as latitude, longitude.');
        return;
      }
    }

    setRouteStatus('loading');
    setRouteError(null);
    setHazardsOnRoute([]);
    setHazardWarning(null);

    try {
      const result = await valhallaClient.calculateRoute(origin, destCoords!, vehicle);

      if (result.error) {
        setRouteStatus('error');
        setRouteError(result.error.message);
        return;
      }

      if (!result.route) {
        setRouteStatus('error');
        setRouteError('No route found.');
        return;
      }

      setRoute(result.route);

      const analysis = analyzeRouteHazards(result.route, hazards, {
        ...DEFAULT_OPTIONS,
        nearThresholdMeters: 500,
        onRouteThresholdMeters: 100,
        closureBufferMeters: 200,
      });

      setHazardsOnRoute(analysis.activeHazards);
      setHazardWarning(analysis.warningMessage);

      if (mapRef.current && result.route.geometry.length > 0) {
        const lats = result.route.geometry.map((p) => p.lat);
        const lons = result.route.geometry.map((p) => p.lon);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        const latDelta = (maxLat - minLat) * 1.35 + 0.01;
        const lonDelta = (maxLon - minLon) * 1.35 + 0.01;

        setMapRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLon + maxLon) / 2,
          latitudeDelta: Math.max(latDelta, 0.01),
          longitudeDelta: Math.max(lonDelta, 0.01),
        });
      }

      setRouteStatus('success');
    } catch (err) {
      setRouteStatus('error');
      setRouteError(err instanceof Error ? err.message : 'Route calculation failed.');
    }
  }, [origin, destination, vehicle, hazards]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setRouteStatus('idle');
    setRouteError(null);
    setHazardsOnRoute([]);
    setHazardWarning(null);
    if (origin) {
      setMapRegion({
        latitude: origin.lat,
        longitude: origin.lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [origin]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status as 'granted' | 'denied' | 'undetermined');
      if (status === 'granted') await setCurrentLocation();
      else Alert.alert('Location access off', 'Enable location access to use your current position as the route origin.');
    } catch {
      Alert.alert('Location unavailable', 'Your current location could not be read.');
    }
  }, [setCurrentLocation]);

  const handleDestinationChange = useCallback((text: string) => {
    setDestination(text);
    const requestId = ++searchRequestId.current;
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    setShowSuggestions(false);

    if (!text.trim() || /^[-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?$/.test(text.trim())) {
      setSearchSuggestions([]);
      return;
    }

    searchDebounceTimer.current = setTimeout(() => {
      const query = text.trim();
      searchPlaces(query, 8, origin?.lat, origin?.lon).then((results) => {
        if (requestId !== searchRequestId.current) return;
        const suggestions = results.results.map((r) => ({
          id: r.id,
          name: r.name,
          lat: r.latitude,
          lon: r.longitude,
          category: r.category,
          categoryLabel: r.categoryLabel,
        }));
        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }).catch(() => {
        if (requestId !== searchRequestId.current) return;
        setSearchSuggestions([]);
        setShowSuggestions(false);
      });
    }, 350);
  }, [origin]);

  const selectSuggestion = useCallback((item: { id: string; name: string; lat: number; lon: number }) => {
    searchRequestId.current += 1;
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    Keyboard.dismiss();
    setDestination(`${item.lat.toFixed(6)}, ${item.lon.toFixed(6)}`);
    setMapRegion({ latitude: item.lat, longitude: item.lon, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    setSearchSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const routePolyline = route?.geometry.map((p) => ({ latitude: p.lat, longitude: p.lon }));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.appShell}>

      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Route Map</Text>
        <View style={styles.headerActions}>
          <ThemeToggle />
          {route && <Pressable style={styles.resetBtn} onPress={clearRoute}><Text style={styles.resetBtnText}>Reset</Text></Pressable>}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Vehicle Mode</Text>
          <View style={[styles.vehicleSelector, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(
              [
                ['car', 'Standard 4W'],
                ['motorcycle', 'Two-Wheeler'],
                ['truck', 'Commercial / 4x4'],
              ] as [VehicleProfile, string][]
            ).map(([vKey, vLabel]) => {
              const isSelected = vehicle === vKey;
              return (
                <Pressable
                  key={vKey}
                  onPress={() => setVehicle(vKey)}
                  style={[styles.vehicleOption, isSelected && styles.vehicleOptionActive, isSelected && { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                >
                  <Text style={[styles.vehicleText, { color: isSelected ? theme.primary : theme.textSecondary }, isSelected && styles.vehicleTextActive]}>
                    {vLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, showSuggestions && styles.suggestionsSection]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Route</Text>
          <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.inputRow}>
              <View style={styles.inputBox}>
                <Text style={[styles.inputLabelText, { color: theme.textSecondary }]}>Origin</Text>
                <Text style={[styles.inputValue, { color: theme.textPrimary }]}>
                  {origin ? `${origin.lat.toFixed(4)}, ${origin.lon.toFixed(4)}` : 'Current location'}
                </Text>
              </View>
              <Pressable style={[styles.refreshBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]} onPress={requestLocationPermission}>
                <Text style={[styles.refreshBtnText, { color: theme.primary }]}>📍</Text>
              </Pressable>
            </View>
            {locationPermission === 'denied' && (
              <Text style={styles.locationHint}>Location access is off. Tap the pin to choose your current position.</Text>
            )}
            <View style={styles.destinationSearch}>
              <View style={styles.inputBox}>
                <Text style={[styles.inputLabelText, { color: theme.textSecondary }]}>Destination</Text>
                <TextInput
                  value={destination}
                  onChangeText={handleDestinationChange}
                  placeholder="Search a place or enter lat, lon"
                  placeholderTextColor={theme.placeholderText}
                  style={[styles.destinationInput, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="search"
                />
              </View>
              {showSuggestions && searchSuggestions.length > 0 && (
                <View style={[styles.suggestionsDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <ScrollView
                    style={styles.suggestionList}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={searchSuggestions.length > 4}
                  >
                    {searchSuggestions.map((item) => (
                      <Pressable
                        key={item.id}
                        style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                        onPress={() => selectSuggestion(item)}
                      >
                        <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>{item.name}</Text>
                        <Text style={[styles.suggestionSubtext, { color: theme.textSecondary }]}>
                          {item.categoryLabel ? `${item.categoryLabel} · ` : ''}{item.lat.toFixed(4)}, {item.lon.toFixed(4)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
          <Pressable style={[styles.calcBtn, routeStatus === 'loading' && styles.calcBtnDisabled]} onPress={calculateRoute} disabled={routeStatus === 'loading'}>
            <Text style={styles.calcBtnText}>
              {routeStatus === 'loading' ? 'Calculating…' : 'Calculate Route'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Route Map</Text>
          <View style={[styles.mapContainer, { borderColor: theme.border }]}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{ latitude: 30.2, longitude: 78.9, latitudeDelta: 2.5, longitudeDelta: 2.5 }}
              region={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              {routePolyline && routePolyline.length > 1 && (
                <Polyline coordinates={routePolyline} strokeColor="#EA580C" strokeWidth={5} />
              )}
              {origin && <Marker coordinate={{ latitude: origin.lat, longitude: origin.lon }} title="Start" pinColor="#15803D" />}
              {route && route.geometry.length > 0 && (
                <Marker coordinate={{ latitude: route.geometry[route.geometry.length - 1].lat, longitude: route.geometry[route.geometry.length - 1].lon }} title="Destination" pinColor="#EA580C" />
              )}
              {hazardsOnRoute.map((item) => item.hazard.latitude !== null && item.hazard.longitude !== null ? (
                <Marker
                  key={item.hazard.id}
                  coordinate={{ latitude: item.hazard.latitude, longitude: item.hazard.longitude }}
                  title={item.hazard.type}
                  description={`${Math.round(item.distanceMeters)} m from route · ${item.hazard.description}`}
                  pinColor={item.isConfirmedClosure ? '#B91C1C' : sevColor(item.hazard.severity)}
                />
              ) : null)}
            </MapView>
          </View>
        </View>

        {route && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Route Summary</Text>
            <View style={[styles.routeInfoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Distance</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{(route.distanceMeters / 1000).toFixed(2)} km</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Duration</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>~{Math.round(route.durationSeconds / 60)} min</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Vehicle</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{vehicle.charAt(0).toUpperCase() + vehicle.slice(1)}</Text>
              </View>
            </View>
          </View>
        )}

        {hazardWarning && (
          <View style={styles.section}>
            <View style={[styles.hazardBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={[styles.hazardBannerText, { color: '#B91C1C' }]}>{hazardWarning}</Text>
            </View>
          </View>
        )}

        {routeError && (
          <View style={styles.section}>
            <View style={[styles.errorBanner, { backgroundColor: '#FFF7ED', borderColor: '#FECACA' }]}>
              <Text style={[styles.errorBannerText, { color: '#B91C1C' }]}>{routeError}</Text>
            </View>
          </View>
        )}

        {routeStatus === 'idle' && hazardsOnRoute.length === 0 && routeError === null && (
          <View style={styles.section}>
              <View style={[styles.hintCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Text style={[styles.hintText, { color: theme.textSecondary }]}>
                Enter origin coordinates (or use current location) and a destination
                to calculate a route. Hazards near your route will be shown automatically.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function sevColor(sev: string): string {
  const map: Record<string, string> = {
    High: '#EA580C',
    Medium: '#D97706',
    Low: '#15803D',
  };
  return map[sev] ?? '#8A735B';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  appShell: {
    width: '100%',
    maxWidth: 900,
    flex: 1,
    alignSelf: 'center',
  },
  sloganRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FDBA74',
  },
  sloganText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    backgroundColor: '#FFFDF5',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#3B2F2F',
    fontSize: 20,
    fontWeight: '800',
  },
  resetBtn: {
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  section: {
    marginBottom: 20,
  },
  suggestionsSection: {
    position: 'relative',
    zIndex: 10,
  },
  sectionLabel: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  vehicleSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  vehicleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  vehicleOptionActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
    borderWidth: 1,
  },
  vehicleText: {
    color: '#5B4A3E',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleTextActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
  inputGroup: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 8,
    padding: 12,
    position: 'relative',
    zIndex: 20,
    elevation: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputBox: {
    flex: 1,
  },
  destinationSearch: {
    position: 'relative',
    zIndex: 30,
  },
  inputLabelText: {
    color: '#5B4A3E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputValue: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '600',
  },
  locationHint: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 16,
    color: '#EA580C',
  },
  destinationInput: {
    color: '#3B2F2F',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 8,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 10,
    maxHeight: 240,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  suggestionList: {
    maxHeight: 240,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  suggestionText: {
    color: '#3B2F2F',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionSubtext: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  calcBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  calcBtnDisabled: {
    opacity: 0.6,
  },
  calcBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  mapContainer: {
    width: '100%',
    height: 300,
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  routeInfoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '700',
  },
  infoValue: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '800',
  },
  hazardBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 14,
  },
  hazardBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  errorBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 14,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  hintCard: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 16,
  },
  hintText: {
    color: '#5B4A3E',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#3B2F2F',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: '#FFF7ED',
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  navLabel: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  navLabelActive: {
    color: '#EA580C',
    fontWeight: '800',
  },
});
