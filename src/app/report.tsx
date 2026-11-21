/**
 * PahaadSaathi Incident Report Screen
 *
 * Authorized moderators submit incident reports through two channels:
 * 1. ONLINE - via secure API when mobile internet is available
 * 2. SMS FALLBACK - structured text to gateway when data is out
 */

import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  HazardType,
  Severity,
  addHazard,
  hazardTypes,
  severities,
} from "@/data/hazardStore";
import { getUser, isModerator } from "@/data/userStore";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { buildSmsBody, SMS_GATEWAY_NUMBER } from "@/lib/sms";
import { useConnectivity } from "@/hooks/useConnectivity";

type PickedPhoto = { uri: string; mimeType?: string | null; fileName?: string | null };

export default function ReportScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isOnline } = useConnectivity();
  const user = getUser();

  const [type, setType] = useState<HazardType>("Landslide");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [pickedImage, setPickedImage] = useState<PickedPhoto | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [smsFallback, setSmsFallback] = useState(!isOnline);
  const [smsSent, setSmsSent] = useState(false);

  const moderatorName = user?.name || "Moderator";
  const moderatorRole = user?.role || "moderator";

  useEffectLocationPermission();

  function useEffectLocationPermission() {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setLocationPermission(status as 'granted' | 'denied' | 'undetermined');
      } catch {
        setLocationPermission(null);
      }
    })();
  }

  const captureCurrentLocation = useCallback(async () => {
    if (locationPermission === 'denied') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status as 'granted' | 'denied' | 'undetermined');
      if (status !== 'granted') {
        
        alert('Location access needed. Enable location access to tag your report with GPS coordinates.');
        return;
      }
    }

    setIsCapturingGps(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude, longitude } = pos.coords;
      setGpsCoords({ latitude, longitude });

      try {
        const response = await fetch(
          `https://photon.komoot.io/api/reverse?lat=${latitude}&lon=${longitude}&limit=1`,
          { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          const feature = data.features?.[0];
          if (feature) {
            const props = feature.properties || {};
            const parts = [props.city, props.state, props.country].filter(Boolean);
            const name = parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocation(name);
          }
        }
      } catch {
        setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch {
      
      alert('Unable to get location. Please check Location Services or enter manually.');
    } finally {
      setIsCapturingGps(false);
    }
  }, [locationPermission]);

  const handleSubmit = async () => {
    if (!location.trim() || !description.trim()) {
      
      alert('Please specify a location and describe the incident.');
      return;
    }

    if (!isModerator()) {
      
      alert('Only authorized moderators can submit incident reports.');
      return;
    }

    setSubmitting(true);

    let photoUrl: string | null = null;
    if (pickedImage) {
      const { uploadHazardPhoto } = await import("@/lib/storage");
      const uploadResult = await uploadHazardPhoto(pickedImage);
      if (uploadResult.error) {
        
        const continueWithoutPhoto = await new Promise<boolean>((resolve) => {
          
          alert("Upload failed: " + (uploadResult.error || "Could not upload photo."));
          resolve(false);
        });
        if (!continueWithoutPhoto) {
          setSubmitting(false);
          return;
        }
      } else {
        photoUrl = uploadResult.url ?? null;
      }
    }

    try {
      await addHazard({
        type,
        location: location.trim(),
        area: area.trim() || undefined,
        description: description.trim(),
        severity,
        status: "reported",
        latitude: gpsCoords?.latitude ?? null,
        longitude: gpsCoords?.longitude ?? null,
        photo_url: photoUrl,
        reportedBy: moderatorName,
        reportedByRole: moderatorRole,
      });

      setType("Landslide");
      setSeverity("Medium");
      setLocation("");
      setArea("");
      setDescription("");
      setPickedImage(null);
      setGpsCoords(null);
      setSmsSent(false);
      router.replace("/");
      
      alert('Incident report submitted. It will be reviewed and a targeted alert issued.');
    } catch (err) {
      
      alert(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSmsFallback = async () => {
    if (!location.trim() || !description.trim()) {
      
      alert('Please specify a location and describe the incident.');
      return;
    }

    const smsBody = buildSmsBody({
      type,
      location: location.trim(),
      description: description.trim(),
    });

    try {
      const available = await SMS.isAvailableAsync();
      if (!available) {
        
        alert('SMS is not available on this device.');
        return;
      }

      await SMS.sendSMSAsync([SMS_GATEWAY_NUMBER], smsBody);
      setSmsSent(true);
      
      alert(`SMS fallback report sent to ${SMS_GATEWAY_NUMBER}.\n\n${smsBody}`);
    } catch {
      
      alert('Failed to send SMS. Please check your signal and try again.');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPickedImage({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.appShell}>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
            <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Report Incident</Text>
          <ThemeToggle />
        </View>

        <View style={[styles.connectionStatus, { backgroundColor: theme.surface }]}>
          <View style={[styles.connectionDot, { backgroundColor: isOnline === false ? '#D97706' : '#15803D' }]} />
          <Text style={[styles.connectionText, { color: theme.textSecondary }]}>
            {isOnline === false ? 'Offline — SMS fallback available' : 'Online — secure API reporting'}
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Report as</Text>
            <Text style={[styles.modRole, { color: theme.textPrimary }]}>{moderatorName} ({moderatorRole})</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Incident Type</Text>
            <View style={styles.chipWrap}>
              {hazardTypes.map((item) => (
                <Pressable key={item} style={[styles.choiceChip, type === item && styles.choiceChipActive]} onPress={() => setType(item)}>
                  <Text style={[styles.choiceText, type === item && styles.choiceTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Severity Level</Text>
            <View style={styles.chipWrap}>
              {severities.map((item) => (
                <Pressable key={item} style={[styles.choiceChip, severity === item && styles.choiceChipActive]} onPress={() => setSeverity(item)}>
                  <Text style={[styles.choiceText, severity === item && styles.choiceTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Location & Landmark</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Rudraprayag bypass, NH-07"
              placeholderTextColor={theme.placeholderText}
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
            />
            <View style={styles.gpsRow}>
              {gpsCoords && (
                <Text style={[styles.gpsStatus, { color: theme.success }]}>
                  📍 GPS: {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)}
                </Text>
              )}
              <Pressable style={[styles.gpsBtn, isCapturingGps && styles.gpsBtnCapturing]} onPress={captureCurrentLocation} disabled={isCapturingGps}>
                <Text style={[styles.gpsBtnText, { color: isCapturingGps ? theme.textTertiary : theme.primary }]}>
                  {isCapturingGps ? 'Capturing…' : locationPermission === 'denied' ? 'Enable Location' : 'Use Current Location'}
                </Text>
              </Pressable>
              {locationPermission === 'denied' && (
                <Text style={[styles.gpsHint, { color: theme.error }]}>
                  Location access denied — enter location manually
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Area / Corridor</Text>
            <TextInput
              value={area}
              onChangeText={setArea}
              placeholder="e.g. NH-07 Badrinath Highway"
              placeholderTextColor={theme.placeholderText}
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the incident..."
              placeholderTextColor={theme.placeholderText}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.textArea, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Photo (Optional)</Text>
            <View style={styles.photoPickerContainer}>
              <Pressable style={[styles.photoPicker, pickedImage && styles.photoPickerSelected]} onPress={pickImage}>
                {pickedImage ? (
                  <Image source={{ uri: pickedImage.uri }} contentFit="cover" style={styles.selectedPhoto} />
                ) : (
                  <Text style={{ color: theme.textSecondary }}>📷</Text>
                )}
              </Pressable>
              {pickedImage && (
                <Pressable style={styles.removePhotoBtn} onPress={() => setPickedImage(null)}>
                  <Text style={[styles.removePhotoText, { color: theme.textSecondary }]}>Remove</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.channelSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Submission Channel</Text>
            <View style={styles.channelToggle}>
              <Pressable style={[styles.channelBtn, !smsFallback && styles.channelBtnActive]} onPress={() => setSmsFallback(false)}>
                <Text style={[styles.channelText, { color: !smsFallback ? theme.buttonPrimaryText : theme.textSecondary }]}>Online (API)</Text>
              </Pressable>
              <Pressable style={[styles.channelBtn, smsFallback && styles.channelBtnActive]} onPress={() => setSmsFallback(true)}>
                <Text style={[styles.channelText, { color: smsFallback ? theme.buttonPrimaryText : theme.textSecondary }]}>SMS Fallback</Text>
              </Pressable>
            </View>
            {smsFallback && (
              <View style={[styles.smsPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.smsLabel, { color: theme.textSecondary }]}>Message to gateway:</Text>
                <Text style={[styles.smsBody, { color: theme.textPrimary }]}>{buildSmsBody({ type, location: location.trim(), description: description.trim() })}</Text>
                <Text style={[styles.smsTo, { color: theme.textSecondary }]}>To: {SMS_GATEWAY_NUMBER}</Text>
              </View>
            )}
          </View>

          <Pressable
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled, smsFallback ? styles.smsBtn : styles.apiBtn]}
            onPress={smsFallback ? handleSmsFallback : handleSubmit}
            disabled={submitting || smsSent}
          >
            <Text style={[styles.submitBtnText, { color: '#FFFFFF' }]}>
              {submitting ? 'Submitting…' : smsFallback ? (smsSent ? 'SMS Sent' : 'Send SMS Fallback') : 'Submit Report'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  appShell: {
    width: '100%',
    maxWidth: 720,
    flex: 1,
    alignSelf: 'center',
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
  headerTitle: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '800',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  modRole: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '800',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  choiceChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#9C4221',
  },
  choiceText: {
    color: '#5B4A3E',
    fontSize: 12,
    fontWeight: '700',
  },
  choiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#3B2F2F',
    fontSize: 13,
  },
  textArea: {
    height: 120,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
    flexWrap: 'wrap',
  },
  gpsStatus: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  gpsBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#EA580C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 130,
  },
  gpsBtnCapturing: {
    opacity: 0.6,
  },
  gpsBtnText: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '800',
  },
  gpsHint: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  channelSection: {
    marginBottom: 20,
  },
  channelToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  channelBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  channelBtnActive: {
    backgroundColor: '#EA580C',
    borderColor: '#9C4221',
  },
  channelText: {
    fontSize: 13,
    fontWeight: '800',
  },
  smsPreview: {
    padding: 14,
    borderRadius: 10,
  },
  smsLabel: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  smsBody: {
    color: '#3B2F2F',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 19,
    marginBottom: 6,
  },
  smsTo: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '800',
  },
  photoPickerContainer: {
    marginTop: 16,
  },
  photoPicker: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#D4D4D4',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  selectedPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoBtn: {
    marginTop: 6,
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  apiBtn: {
    backgroundColor: '#EA580C',
  },
  smsBtn: {
    backgroundColor: '#15803D',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
