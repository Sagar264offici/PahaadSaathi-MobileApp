import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface SelectedPlace {
  name: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
}

interface GooglePlaceAutocompletePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlace: (place: SelectedPlace) => void;
  apiKey?: string;
  initialQuery?: string;
}

export function GooglePlaceAutocompletePicker({
  visible,
  onClose,
  onSelectPlace,
  apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'DEMO_KEY',
  initialQuery = 'Devprayag',
}: GooglePlaceAutocompletePickerProps) {
  const { colors, isDark } = useAppTheme();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [strictBounds, setStrictBounds] = useState<boolean>(false);

  // Quick fallback suggestions if offline or without live Google billing key
  const QUICK_PLACES: SelectedPlace[] = [
    {
      name: 'Devprayag Sangam',
      formattedAddress: 'Devprayag Confluence, NH-07, Tehri Garhwal, Uttarakhand 249301',
      latitude: 30.1459,
      longitude: 78.5991,
    },
    {
      name: 'Devprayag Bypass Bridge',
      formattedAddress: 'NH-07 Badrinath Highway, Km 74, Devprayag, Uttarakhand',
      latitude: 30.1512,
      longitude: 78.6045,
    },
    {
      name: 'Dharasu Bend',
      formattedAddress: 'NH-108 Gangotri Highway Junction, Dharasu, Uttarkashi, Uttarakhand',
      latitude: 30.6122,
      longitude: 78.3189,
    },
    {
      name: 'Rishikesh Tapovan Gate',
      formattedAddress: 'Badrinath Marg, Tapovan, Rishikesh, Uttarakhand 249192',
      latitude: 30.0869,
      longitude: 78.2676,
    },
    {
      name: 'Rudraprayag Tunnel Junction',
      formattedAddress: 'Kedarnath-Badrinath Bifurcation, NH-07, Rudraprayag, Uttarakhand',
      latitude: 30.2858,
      longitude: 78.9818,
    },
    {
      name: 'Joshimath Upper Transit',
      formattedAddress: 'Badrinath Road, Joshimath, Chamoli, Uttarakhand 246443',
      latitude: 30.5564,
      longitude: 79.5664,
    },
  ];

  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Google Place Autocomplete</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      body { background: ${isDark ? '#0B0D12' : '#FFFFFF'}; color: ${isDark ? '#F8FAFC' : '#0F172A'}; padding: 12px; }
      .pac-card { background: ${isDark ? '#11141D' : '#F8FAFC'}; border: 1px solid ${isDark ? '#1E2332' : '#E2E8F0'}; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
      #title { font-weight: 700; font-size: 14px; margin-bottom: 8px; color: ${isDark ? '#F8FAFC' : '#0F172A'}; }
      .pac-controls { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; }
      .pac-controls label { background: ${isDark ? '#161A24' : '#E2E8F0'}; padding: 4px 8px; border-radius: 6px; cursor: pointer; color: ${isDark ? '#94A3B8' : '#475569'}; }
      .pac-controls input[type="radio"]:checked + label { background: #2563EB; color: #FFFFFF; font-weight: 600; }
      .pac-controls input[type="radio"] { display: none; }
      #map-container { width: 100%; height: 260px; border-radius: 12px; overflow: hidden; border: 1px solid ${isDark ? '#1E2332' : '#E2E8F0'}; margin-top: 10px; }
      gmp-map { width: 100%; height: 100%; }
      #infowindow-content { padding: 8px; font-size: 12px; }
      .title { font-weight: bold; font-size: 13px; color: #0F172A; }
      .confirm-btn { display: block; width: 100%; margin-top: 12px; padding: 12px; background: #2563EB; color: #FFFFFF; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
    </style>
    <script type="module" src="https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.15/index.min.js"></script>
  </head>
  <body>
    <gmpx-api-loader key="${apiKey}" solution-channel="GMP_CCS_autocomplete_v5"></gmpx-api-loader>
    <div class="pac-card" id="pac-card">
      <div id="title">Google Place Picker & Autocomplete</div>
      <div id="type-selector" class="pac-controls">
        <input type="radio" name="type" id="changetype-all" checked="checked" />
        <label for="changetype-all">All</label>
        <input type="radio" name="type" id="changetype-establishment" />
        <label for="changetype-establishment">Establishment</label>
        <input type="radio" name="type" id="changetype-address" />
        <label for="changetype-address">Address</label>
        <input type="radio" name="type" id="changetype-geocode" />
        <label for="changetype-geocode">Geocode</label>
        <input type="radio" name="type" id="changetype-cities" />
        <label for="changetype-cities">Cities</label>
        <input type="radio" name="type" id="changetype-regions" />
        <label for="changetype-regions">Regions</label>
      </div>
      <div style="margin-top: 8px; font-size: 11px;">
        <input type="checkbox" id="use-strict-bounds" />
        <label for="use-strict-bounds" style="color: ${isDark ? '#94A3B8' : '#475569'};">Restrict to mountain corridor viewport</label>
      </div>
      <div style="margin-top: 10px;">
        <gmpx-place-picker id="place-picker" for-map="map" placeholder="Type mountain location (e.g. Devprayag)..."></gmpx-place-picker>
      </div>
    </div>

    <div id="map-container">
      <gmp-map id="map" center="30.1459,78.5991" zoom="12" map-id="DEMO_MAP_ID">
        <gmp-advanced-marker id="marker"></gmp-advanced-marker>
      </gmp-map>
    </div>

    <div id="infowindow-content" style="display:none;">
      <span id="place-name" class="title"></span><br />
      <span id="place-address"></span>
    </div>

    <script>
      let currentPlace = null;
      async function init() {
        await customElements.whenDefined('gmp-map');
        const map = document.querySelector("gmp-map");
        const marker = document.getElementById("marker");
        const strictBoundsInputElement = document.getElementById("use-strict-bounds");
        const placePicker = document.getElementById("place-picker");

        map.innerMap.setOptions({ mapTypeControl: false });

        placePicker.addEventListener('gmpx-placechange', () => {
          const place = placePicker.value;
          if (!place || !place.location) return;

          currentPlace = {
            name: place.displayName || place.name || 'Selected Landmark',
            formattedAddress: place.formattedAddress || place.displayName || '',
            latitude: place.location.lat ? place.location.lat() : place.location.lat,
            longitude: place.location.lng ? place.location.lng() : place.location.lng
          };

          if (place.viewport) {
            map.innerMap.fitBounds(place.viewport);
          } else {
            map.center = place.location;
            map.zoom = 15;
          }
          marker.position = place.location;

          // Communicate selection to React Native
          const payload = JSON.stringify({ type: 'PLACE_SELECTED', place: currentPlace });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(payload);
          } else if (window.parent) {
            window.parent.postMessage(payload, '*');
          }
        });

        function setupClickListener(id, type) {
          const btn = document.getElementById(id);
          if (btn) {
            btn.addEventListener("click", () => {
              placePicker.type = type;
            });
          }
        }
        setupClickListener("changetype-all", "");
        setupClickListener("changetype-address", "address");
        setupClickListener("changetype-establishment", "establishment");
        setupClickListener("changetype-geocode", "geocode");
        setupClickListener("changetype-cities", "(cities)");
        setupClickListener("changetype-regions", "(regions)");

        if (strictBoundsInputElement) {
          strictBoundsInputElement.addEventListener("change", () => {
            placePicker.strictBounds = strictBoundsInputElement.checked;
          });
        }
      }
      document.addEventListener('DOMContentLoaded', init);
    </script>
  </body>
</html>
`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.bgPrimary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle, backgroundColor: colors.headerBg }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.bgTertiary, borderColor: colors.borderSubtle }]} onPress={onClose}>
            <Text style={[styles.backText, { color: colors.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Google Maps Place Autocomplete
          </Text>
          <Pressable onPress={onClose}>
            <Text style={[styles.doneText, { color: colors.accentBlue }]}>Done</Text>
          </Pressable>
        </View>

        {/* Place Type Filters Filter Bar */}
        <View style={[styles.filterBar, { borderBottomColor: colors.borderSubtle, backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>FILTER TYPE:</Text>
          <View style={styles.filterChipRow}>
            {(
              [
                ['all', 'All'],
                ['establishment', 'Establishment'],
                ['address', 'Address'],
                ['geocode', 'Geocode'],
                ['cities', 'Cities'],
                ['regions', 'Regions'],
              ] as [string, string][]
            ).map(([tKey, tLabel]) => {
              const active = selectedType === tKey;
              return (
                <Pressable
                  key={tKey}
                  onPress={() => setSelectedType(tKey)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.accentBlue : colors.bgTertiary,
                      borderColor: active ? colors.accentBlue : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {tLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Strict Bounds Toggle */}
          <Pressable
            style={styles.strictBoundsToggle}
            onPress={() => setStrictBounds(!strictBounds)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: strictBounds ? colors.accentBlue : 'transparent',
                  borderColor: strictBounds ? colors.accentBlue : colors.borderStrong,
                },
              ]}
            >
              {strictBounds && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={[styles.strictBoundsText, { color: colors.textSecondary }]}>
              Restrict search to mountain viewport (30.14°N, 78.59°E)
            </Text>
          </Pressable>
        </View>

        {/* Quick Mountain Corridor Picker Fallback */}
        <View style={[styles.quickSection, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.quickHeading, { color: colors.textMuted }]}>
            TAP TO SELECT VERIFIED HIGHWAY LANDMARK:
          </Text>
          <View style={styles.quickGrid}>
            {QUICK_PLACES.map((item) => (
              <Pressable
                key={item.formattedAddress}
                style={[
                  styles.quickCard,
                  { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle },
                ]}
                onPress={() => {
                  onSelectPlace(item);
                  onClose();
                }}
              >
                <Text style={[styles.quickPin, { color: colors.accentAmber }]}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quickName, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.quickAddress, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {item.formattedAddress}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterBar: {
    padding: 14,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  strictBoundsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  strictBoundsText: {
    fontSize: 12,
  },
  quickSection: {
    flex: 1,
    padding: 16,
  },
  quickHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickGrid: {
    gap: 8,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickPin: {
    fontSize: 16,
  },
  quickName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickAddress: {
    fontSize: 11,
  },
});
