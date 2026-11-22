import * as Location from 'expo-location';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
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
import {
  MapPin,
  Navigation,
  ArrowUpDown,
  X,
  Search,
  Compass,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react-native';

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
import { searchMountainLocations } from '@/data/locations';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';

const POPULAR_CORRIDORS = [
  { label: 'Rishikesh ➔ Devprayag', origin: 'Rishikesh Base (Tapovan)', dest: 'Devprayag Sangam', from: { lat: 30.1332, lon: 78.3248 }, to: { lat: 30.1459, lon: 78.5996 } },
  { label: 'Devprayag ➔ Srinagar', origin: 'Devprayag Sangam', dest: 'Srinagar Garhwal Bypass', from: { lat: 30.1459, lon: 78.5996 }, to: { lat: 30.2227, lon: 78.7844 } },
  { label: 'Rishikesh ➔ Joshimath', origin: 'Rishikesh Base (Tapovan)', dest: 'Joshimath Transit Hub', from: { lat: 30.1332, lon: 78.3248 }, to: { lat: 30.5564, lon: 79.5638 } },
  { label: 'Joshimath ➔ Badrinath', origin: 'Joshimath Transit Hub', dest: 'Badrinath Dham Approach', from: { lat: 30.5564, lon: 79.5638 }, to: { lat: 30.7433, lon: 79.4938 } },
  { label: 'Rudraprayag ➔ Kedarnath', origin: 'Rudraprayag Tunnel Junction', dest: 'Sonprayag Base Camp', from: { lat: 30.2844, lon: 78.9811 }, to: { lat: 30.6300, lon: 78.9983 } },
];

export default function MapScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestId = useRef(0);

  const [vehicle, setVehicle] = useState<VehicleProfile>('car');
  
  // Origin
  const [originText, setOriginText] = useState<string>('My Current Location (GPS)');
  const [originCoords, setOriginCoords] = useState<RoutePoint | null>(null);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(true);

  // Destination
  const [destinationText, setDestinationText] = useState<string>('');
  const [destCoords, setDestCoords] = useState<RoutePoint | null>(null);

  // Search & Suggestions
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);
  const [suggestions, setSuggestions] = useState<{
    id: string;
    name: string;
    fullAddress?: string;
    lat: number;
    lon: number;
    categoryLabel?: string;
  }[]>([]);

  // Routing State
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [hazardsOnRoute, setHazardsOnRoute] = useState<HazardOnRoute[]>([]);
  const [hazardWarning, setHazardWarning] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | undefined>({
    latitude: 30.2,
    longitude: 78.9,
    latitudeDelta: 2.5,
    longitudeDelta: 2.5,
  });
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

  // Initialize GPS Location
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setLocationPermission(status as 'granted' | 'denied' | 'undetermined');
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (cancelled) return;
          const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
          setOriginCoords(coords);
          setIsGpsActive(true);
          setOriginText('My Current Location (GPS)');
          setMapRegion({
            latitude: coords.lat,
            longitude: coords.lon,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        } else {
          // Default to Rishikesh if GPS not granted
          setOriginText('Rishikesh Base (Tapovan)');
          setOriginCoords({ lat: 30.1332, lon: 78.3248 });
          setIsGpsActive(false);
        }
      } catch {
        if (!cancelled) {
          setLocationPermission('denied');
          setOriginText('Rishikesh Base (Tapovan)');
          setOriginCoords({ lat: 30.1332, lon: 78.3248 });
          setIsGpsActive(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Lock back to GPS current location
  const handleUseCurrentLocation = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      setOriginCoords(point);
      setOriginText('My Current Location (GPS)');
      setIsGpsActive(true);
      setActiveField(null);
      setSuggestions([]);
      setMapRegion({
        latitude: point.lat,
        longitude: point.lon,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    } catch {
      Alert.alert('Location unavailable', 'Please enable GPS location permissions.');
    }
  }, []);

  // Perform autocomplete search (Instant offline Himalayan directory + online Photon)
  const triggerAutocomplete = useCallback((query: string, field: 'origin' | 'destination') => {
    const clean = query.trim();
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);

    if (clean.length < 2) {
      setSuggestions([]);
      setActiveField(null);
      return;
    }

    // 1. Instant 0ms synchronous local match for lightning-fast responsiveness (e.g. typing "dev")
    const instantLocal = searchMountainLocations(clean, 6);
    if (instantLocal.length > 0) {
      setSuggestions(instantLocal.map((l) => ({
        id: `local-${l.name}`,
        name: l.name,
        fullAddress: l.full,
        lat: l.latitude,
        lon: l.longitude,
        categoryLabel: `${l.region} • ${l.corridor}`,
      })));
      setActiveField(field);
    }

    // 2. Debounced query for full directory + online geocoding
    const reqId = ++searchRequestId.current;
    searchDebounceTimer.current = setTimeout(async () => {
      try {
        const res = await searchPlaces(clean, 8, originCoords?.lat ?? 30.3, originCoords?.lon ?? 78.5);
        if (reqId !== searchRequestId.current) return;
        const mapped = res.results.map((r) => ({
          id: r.id,
          name: r.name,
          fullAddress: r.fullAddress,
          lat: r.latitude,
          lon: r.longitude,
          categoryLabel: r.categoryLabel,
        }));
        setSuggestions(mapped);
        setActiveField(mapped.length > 0 ? field : null);
      } catch {
        // Fallback to instant local results
      }
    }, 150);
  }, [originCoords]);

  const handleOriginChange = useCallback((text: string) => {
    setOriginText(text);
    setIsGpsActive(false);
    setOriginCoords(null);
    triggerAutocomplete(text, 'origin');
  }, [triggerAutocomplete]);

  const handleDestinationChange = useCallback((text: string) => {
    setDestinationText(text);
    setDestCoords(null);
    triggerAutocomplete(text, 'destination');
  }, [triggerAutocomplete]);

  const handleSelectSuggestion = useCallback((item: {
    name: string;
    lat: number;
    lon: number;
  }) => {
    searchRequestId.current += 1;
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    Keyboard.dismiss();

    if (activeField === 'origin') {
      setOriginText(item.name);
      setOriginCoords({ lat: item.lat, lon: item.lon });
      setIsGpsActive(false);
    } else {
      setDestinationText(item.name);
      setDestCoords({ lat: item.lat, lon: item.lon });
    }

    setMapRegion({
      latitude: item.lat,
      longitude: item.lon,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    });
    setSuggestions([]);
    setActiveField(null);
  }, [activeField]);

  // Swap Origin & Destination
  const handleSwapDirections = useCallback(() => {
    const tempText = originText;
    const tempCoords = originCoords;

    setOriginText(destinationText);
    setOriginCoords(destCoords);
    setIsGpsActive(false);

    setDestinationText(tempText);
    setDestCoords(tempCoords);
    setActiveField(null);
    setSuggestions([]);
  }, [originText, originCoords, destinationText, destCoords]);

  // Quick 1-Tap Corridor Selection
  const handleSelectCorridor = useCallback((corridor: typeof POPULAR_CORRIDORS[0]) => {
    Keyboard.dismiss();
    setOriginText(corridor.origin);
    setOriginCoords(corridor.from);
    setIsGpsActive(false);

    setDestinationText(corridor.dest);
    setDestCoords(corridor.to);
    setActiveField(null);
    setSuggestions([]);

    executeRouting(corridor.from, corridor.to);
  }, []);

  // Execute Routing between two points
  const executeRouting = async (fromPoint: RoutePoint, toPoint: RoutePoint) => {
    setRouteStatus('loading');
    setRouteError(null);
    setHazardsOnRoute([]);
    setHazardWarning(null);

    try {
      const result = await valhallaClient.calculateRoute(fromPoint, toPoint, vehicle);

      if (result.error) {
        setRouteStatus('error');
        setRouteError(result.error.message);
        return;
      }

      if (!result.route) {
        setRouteStatus('error');
        setRouteError('No mountain route found between these points.');
        return;
      }

      setRoute(result.route);

      // Analyze road hazards intersecting this corridor
      const analysis = analyzeRouteHazards(result.route, hazards, {
        ...DEFAULT_OPTIONS,
        nearThresholdMeters: 800,
        onRouteThresholdMeters: 200,
        closureBufferMeters: 400,
      });

      setHazardsOnRoute(analysis.activeHazards);
      setHazardWarning(analysis.warningMessage);

      // Fit map viewport over the route polyline
      if (mapRef.current && result.route.geometry.length > 0) {
        const lats = result.route.geometry.map((p) => p.lat);
        const lons = result.route.geometry.map((p) => p.lon);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        const latDelta = (maxLat - minLat) * 1.35 + 0.02;
        const lonDelta = (maxLon - minLon) * 1.35 + 0.02;

        setMapRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLon + maxLon) / 2,
          latitudeDelta: Math.max(latDelta, 0.02),
          longitudeDelta: Math.max(lonDelta, 0.02),
        });
      }

      setRouteStatus('success');
    } catch (err) {
      setRouteStatus('error');
      setRouteError(err instanceof Error ? err.message : 'Route calculation failed.');
    }
  };

  // User clicked "Calculate Route"
  const calculateRoute = useCallback(async () => {
    Keyboard.dismiss();
    setActiveField(null);
    setSuggestions([]);

    // 1. Resolve Origin Coordinates
    let resolvedOrigin = originCoords;
    if (!resolvedOrigin) {
      if (isGpsActive || originText.includes('Current Location')) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          resolvedOrigin = { lat: loc.coords.latitude, lon: loc.coords.longitude };
          setOriginCoords(resolvedOrigin);
        } catch {
          // fallback to local directory match
        }
      }
      if (!resolvedOrigin) {
        const match = searchMountainLocations(originText, 1)[0];
        if (match) {
          resolvedOrigin = { lat: match.latitude, lon: match.longitude };
          setOriginCoords(resolvedOrigin);
        }
      }
    }

    if (!resolvedOrigin) {
      Alert.alert(
        'Origin Required',
        'Please enter a departure location (e.g. Rishikesh, Dehradun) or tap 📍 My GPS.'
      );
      return;
    }

    // 2. Resolve Destination Coordinates
    let resolvedDest = destCoords;
    if (!resolvedDest) {
      // Check coordinate pattern (lat, lon)
      const coordMatch = destinationText.match(/^([-+]?\d+(\.\d+)?),\s*([-+]?\d+(\.\d+)?)$/);
      if (coordMatch) {
        resolvedDest = {
          lat: parseFloat(coordMatch[1]),
          lon: parseFloat(coordMatch[3]),
        };
      } else {
        // Match from Himalayan locations directory (e.g. "Devprayag", "Joshimath")
        const match = searchMountainLocations(destinationText, 1)[0];
        if (match) {
          resolvedDest = { lat: match.latitude, lon: match.longitude };
          setDestCoords(resolvedDest);
        } else {
          // Match from hazards
          const hazardMatch = hazards.find(
            (h) =>
              h.latitude !== null &&
              h.longitude !== null &&
              h.location.toLowerCase().includes(destinationText.toLowerCase().trim())
          );
          if (hazardMatch && hazardMatch.latitude !== null && hazardMatch.longitude !== null) {
            resolvedDest = { lat: hazardMatch.latitude, lon: hazardMatch.longitude };
          }
        }
      }
    }

    if (!resolvedDest) {
      Alert.alert(
        'Destination Required',
        'Please choose a valid destination (e.g. Devprayag, Joshimath, Badrinath) from the suggestions dropdown.'
      );
      return;
    }

    await executeRouting(resolvedOrigin, resolvedDest);
  }, [originCoords, originText, isGpsActive, destCoords, destinationText, hazards, vehicle]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setRouteStatus('idle');
    setRouteError(null);
    setHazardsOnRoute([]);
    setHazardWarning(null);
    if (originCoords) {
      setMapRegion({
        latitude: originCoords.lat,
        longitude: originCoords.lon,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    }
  }, [originCoords]);

  const routePolyline = route?.geometry.map((p) => ({ latitude: p.lat, longitude: p.lon }));
  const isDark = theme.name === 'dark';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: isDark ? Palette.surfaceDark : Palette.glacier,
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.appShell}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
              borderBottomColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
            },
          ]}
        >
          <Pressable
            style={[
              styles.backBtn,
              {
                backgroundColor: isDark ? Palette.surfaceDark : Palette.stoneLight,
                borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
              },
            ]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backBtnText, { color: isDark ? Palette.snow : Palette.pineForest }]}>
              ←
            </Text>
          </Pressable>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.headerSubtitle, { color: isDark ? Palette.pineForestContainer : Palette.pineForestMuted }]}>
              HIMALAYAN CORRIDORS
            </Text>
            <Text style={[styles.headerTitle, { color: isDark ? Palette.snow : Palette.pineForest }]}>
              Safe Route Navigator
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ThemeToggle />
            {route && (
              <Pressable style={styles.resetBtn} onPress={clearRoute}>
                <RotateCcw size={14} color="#C2410C" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Vehicle Mode Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: isDark ? Palette.stone : Palette.slate }]}>
              VEHICLE TRAVEL MODE
            </Text>
            <View
              style={[
                styles.vehicleSelector,
                {
                  backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                  borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                },
              ]}
            >
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
                    style={[
                      styles.vehicleOption,
                      isSelected && {
                        backgroundColor: isDark ? Palette.pineForestContainer : Palette.pineForest,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.vehicleText,
                        {
                          color: isSelected
                            ? (isDark ? '#064E3B' : Palette.snow)
                            : (isDark ? Palette.stone : Palette.slate),
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {vLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Route Inputs Card */}
          <View
            style={[
              styles.routeCard,
              {
                backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
              },
            ]}
          >
            {/* 1. Origin Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabelRow}>
                <View style={styles.inputLabelLeft}>
                  <View style={[styles.pointDot, { backgroundColor: '#15803D' }]} />
                  <Text style={[styles.inputLabel, { color: isDark ? Palette.stone : Palette.slate }]}>
                    ORIGIN (STARTING POINT)
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.gpsPill,
                    isGpsActive && styles.gpsPillActive,
                  ]}
                  onPress={handleUseCurrentLocation}
                >
                  <Navigation size={12} color={isGpsActive ? Palette.snow : Palette.pineForestMuted} />
                  <Text style={[styles.gpsPillText, isGpsActive && styles.gpsPillTextActive]}>
                    My GPS
                  </Text>
                </Pressable>
              </View>

              <View
                style={[
                  styles.textInputBox,
                  {
                    backgroundColor: isDark ? Palette.surfaceDark : Palette.stoneLight,
                    borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                  },
                ]}
              >
                <MapPin size={18} color="#15803D" />
                <TextInput
                  value={originText}
                  onChangeText={handleOriginChange}
                  onFocus={() => {
                    if (originText.length >= 2) triggerAutocomplete(originText, 'origin');
                  }}
                  placeholder="Type origin (e.g. Rishikesh, Dehradun)"
                  placeholderTextColor={Palette.slateMuted}
                  style={[styles.inputField, { color: isDark ? Palette.snow : Palette.pineForest }]}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {originText.length > 0 && !isGpsActive && (
                  <Pressable onPress={() => { setOriginText(''); setOriginCoords(null); }}>
                    <X size={16} color={Palette.slateMuted} />
                  </Pressable>
                )}
              </View>

              {/* Suggestions for Origin */}
              {activeField === 'origin' && suggestions.length > 0 && (
                <View
                  style={[
                    styles.suggestionsDropdown,
                    {
                      backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                      borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                    },
                  ]}
                >
                  {suggestions.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.suggestionItem,
                        { borderBottomColor: isDark ? Palette.surfaceDarkBorder : Palette.stoneLight },
                      ]}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <MapPin size={16} color={Palette.pineForestMuted} style={styles.suggIcon} />
                      <View style={styles.suggTextCol}>
                        <Text style={[styles.suggTitle, { color: isDark ? Palette.snow : Palette.pineForest }]}>
                          {item.name}
                        </Text>
                        <Text style={styles.suggSubtitle}>
                          {item.categoryLabel || item.fullAddress}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Direction Swap Button */}
            <View style={styles.swapDividerRow}>
              <View style={[styles.swapLine, { backgroundColor: isDark ? Palette.surfaceDarkBorder : Palette.stone }]} />
              <Pressable
                style={[
                  styles.swapBtn,
                  {
                    backgroundColor: isDark ? Palette.surfaceDark : Palette.snow,
                    borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                  },
                ]}
                onPress={handleSwapDirections}
                accessibilityLabel="Swap Origin and Destination"
              >
                <ArrowUpDown size={16} color={isDark ? Palette.pineForestContainer : Palette.pineForest} />
              </Pressable>
              <View style={[styles.swapLine, { backgroundColor: isDark ? Palette.surfaceDarkBorder : Palette.stone }]} />
            </View>

            {/* 2. Destination Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabelRow}>
                <View style={styles.inputLabelLeft}>
                  <View style={[styles.pointDot, { backgroundColor: '#EA580C' }]} />
                  <Text style={[styles.inputLabel, { color: isDark ? Palette.stone : Palette.slate }]}>
                    DESTINATION (ARRIVAL POINT)
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.textInputBox,
                  {
                    backgroundColor: isDark ? Palette.surfaceDark : Palette.stoneLight,
                    borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                  },
                ]}
              >
                <Search size={18} color="#EA580C" />
                <TextInput
                  value={destinationText}
                  onChangeText={handleDestinationChange}
                  onFocus={() => {
                    if (destinationText.length >= 2) triggerAutocomplete(destinationText, 'destination');
                  }}
                  placeholder="Type destination (e.g. Devprayag, Joshimath)"
                  placeholderTextColor={Palette.slateMuted}
                  style={[styles.inputField, { color: isDark ? Palette.snow : Palette.pineForest }]}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={calculateRoute}
                />
                {destinationText.length > 0 && (
                  <Pressable onPress={() => { setDestinationText(''); setDestCoords(null); }}>
                    <X size={16} color={Palette.slateMuted} />
                  </Pressable>
                )}
              </View>

              {/* Suggestions for Destination */}
              {activeField === 'destination' && suggestions.length > 0 && (
                <View
                  style={[
                    styles.suggestionsDropdown,
                    {
                      backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                      borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                    },
                  ]}
                >
                  {suggestions.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.suggestionItem,
                        { borderBottomColor: isDark ? Palette.surfaceDarkBorder : Palette.stoneLight },
                      ]}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <MapPin size={16} color="#EA580C" style={styles.suggIcon} />
                      <View style={styles.suggTextCol}>
                        <Text style={[styles.suggTitle, { color: isDark ? Palette.snow : Palette.pineForest }]}>
                          {item.name}
                        </Text>
                        <Text style={styles.suggSubtitle}>
                          {item.categoryLabel || item.fullAddress}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Popular Himalayan Corridor Shortcuts */}
            <View style={styles.quickCorridorsWrapper}>
              <Text style={[styles.quickCorridorsTitle, { color: isDark ? Palette.stone : Palette.slate }]}>
                POPULAR MOUNTAIN ROUTES:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickCorridorsRow}
              >
                {POPULAR_CORRIDORS.map((c) => (
                  <Pressable
                    key={c.label}
                    style={[
                      styles.corridorChip,
                      {
                        backgroundColor: isDark ? Palette.surfaceDark : Palette.stoneLight,
                        borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                      },
                    ]}
                    onPress={() => handleSelectCorridor(c)}
                  >
                    <Compass size={12} color={Palette.pineForestMuted} />
                    <Text
                      style={[
                        styles.corridorChipText,
                        { color: isDark ? Palette.snow : Palette.pineForest },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Calculate Button */}
            <Pressable
              style={[
                styles.calculateBtn,
                routeStatus === 'loading' && styles.calculateBtnLoading,
              ]}
              onPress={calculateRoute}
              disabled={routeStatus === 'loading'}
            >
              <Navigation size={18} color={Palette.snow} />
              <Text style={styles.calculateBtnText}>
                {routeStatus === 'loading' ? 'Calculating Safe Mountain Corridor…' : 'Calculate Safe Route'}
              </Text>
            </Pressable>
          </View>

          {/* Interactive Map */}
          <View style={styles.section}>
            <View style={styles.mapHeaderRow}>
              <Text style={[styles.sectionLabel, { color: isDark ? Palette.stone : Palette.slate }]}>
                CORRIDOR MAP & SATELLITE ROADBLOCKS
              </Text>
              <View style={styles.hazardBadge}>
                <AlertTriangle size={12} color="#DC2626" />
                <Text style={styles.hazardBadgeText}>
                  {hazards.length} Active Mountain Hazards
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.mapContainer,
                { borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone },
              ]}
            >
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={mapRegion}
                region={mapRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {/* Turn-by-Turn Route Polyline */}
                {routePolyline && routePolyline.length > 1 && (
                  <Polyline
                    coordinates={routePolyline}
                    strokeColor="#EA580C"
                    strokeWidth={5}
                  />
                )}

                {/* Origin Marker */}
                {originCoords && (
                  <Marker
                    coordinate={{ latitude: originCoords.lat, longitude: originCoords.lon }}
                    title={originText}
                    pinColor="#15803D"
                  />
                )}

                {/* Destination Marker */}
                {destCoords && (
                  <Marker
                    coordinate={{ latitude: destCoords.lat, longitude: destCoords.lon }}
                    title={destinationText}
                    pinColor="#EA580C"
                  />
                )}

                {/* Roadblocks on or near route */}
                {hazardsOnRoute.map((item) =>
                  item.hazard.latitude !== null && item.hazard.longitude !== null ? (
                    <Marker
                      key={item.hazard.id}
                      coordinate={{
                        latitude: item.hazard.latitude,
                        longitude: item.hazard.longitude,
                      }}
                      title={item.hazard.type}
                      description={`${Math.round(item.distanceMeters)} m from route • ${item.hazard.description}`}
                      pinColor={item.isConfirmedClosure ? '#B91C1C' : sevColor(item.hazard.severity)}
                    />
                  ) : null
                )}
              </MapView>
            </View>
          </View>

          {/* Route Summary */}
          {route && (
            <View style={styles.section}>
              <View
                style={[
                  styles.routeSummaryCard,
                  {
                    backgroundColor: isDark ? Palette.surfaceDarkElevated : Palette.snow,
                    borderColor: isDark ? Palette.surfaceDarkBorder : Palette.stone,
                  },
                ]}
              >
                <View style={styles.summaryTopRow}>
                  <View style={styles.summaryMetric}>
                    <Text style={styles.summaryMetricNumber}>
                      {(route.distanceMeters / 1000).toFixed(1)} km
                    </Text>
                    <Text style={styles.summaryMetricLabel}>Distance</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryMetric}>
                    <Text style={styles.summaryMetricNumber}>
                      ~{Math.round(route.durationSeconds / 60)} min
                    </Text>
                    <Text style={styles.summaryMetricLabel}>Travel Time</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryMetric}>
                    <Text style={styles.summaryMetricNumber}>
                      {hazardsOnRoute.length}
                    </Text>
                    <Text style={styles.summaryMetricLabel}>Nearby Hazards</Text>
                  </View>
                </View>

                {hazardWarning && (
                  <View style={styles.routeWarningBanner}>
                    <AlertTriangle size={16} color="#DC2626" />
                    <Text style={styles.routeWarningText}>{hazardWarning}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {routeError && (
            <View style={styles.section}>
              <View style={styles.errorBanner}>
                <AlertTriangle size={16} color="#B91C1C" />
                <Text style={styles.errorBannerText}>{routeError}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <BottomNavigation />
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
  return map[sev] || '#EA580C';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appShell: {
    width: '100%',
    maxWidth: 900,
    flex: 1,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerTitleGroup: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.caption,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: Typography.fontSize.subheading,
    fontFamily: Typography.fontFamily.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: '#FFF7ED',
  },
  resetBtnText: {
    color: '#C2410C',
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  vehicleSelector: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  vehicleOption: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Radii.sm,
  },
  vehicleText: {
    fontSize: Typography.fontSize.bodySm,
  },
  routeCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    zIndex: 50,
  },
  inputWrapper: {
    position: 'relative',
    zIndex: 40,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  inputLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    letterSpacing: 0.6,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    backgroundColor: Palette.stoneLight,
  },
  gpsPillActive: {
    backgroundColor: Palette.pineForest,
  },
  gpsPillText: {
    fontSize: Typography.fontSize.caption,
    fontFamily: Typography.fontFamily.semibold,
    color: Palette.pineForestMuted,
  },
  gpsPillTextActive: {
    color: Palette.snow,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: Spacing.xs,
  },
  inputField: {
    flex: 1,
    fontSize: Typography.fontSize.bodySm,
    paddingVertical: 4,
  },
  swapDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  swapLine: {
    flex: 1,
    height: 1,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.sm,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    borderRadius: Radii.md,
    borderWidth: 1,
    maxHeight: 220,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  suggIcon: {
    marginTop: 2,
  },
  suggTextCol: {
    flex: 1,
  },
  suggTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodySm,
  },
  suggSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
    marginTop: 2,
  },
  quickCorridorsWrapper: {
    marginTop: Spacing.md,
  },
  quickCorridorsTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  quickCorridorsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  corridorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  corridorChipText: {
    fontSize: Typography.fontSize.caption,
    fontFamily: Typography.fontFamily.medium,
  },
  calculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.pineForest,
    borderRadius: Radii.md,
    paddingVertical: 12,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  calculateBtnLoading: {
    opacity: 0.7,
  },
  calculateBtnText: {
    color: Palette.snow,
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  hazardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  hazardBadgeText: {
    color: '#DC2626',
    fontSize: Typography.fontSize.caption,
    fontFamily: Typography.fontFamily.bold,
  },
  mapContainer: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    height: 320,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  routeSummaryCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryMetric: {
    alignItems: 'center',
  },
  summaryMetricNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    color: Palette.pineForest,
  },
  summaryMetricLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: Palette.stone,
  },
  routeWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  routeWarningText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: Typography.fontSize.caption,
    fontFamily: Typography.fontFamily.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: Radii.sm,
    padding: Spacing.md,
  },
  errorBannerText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: Typography.fontSize.bodySm,
    fontFamily: Typography.fontFamily.medium,
  },
});
