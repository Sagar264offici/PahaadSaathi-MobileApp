/**
 * PahaadSaathi — Report Incident Screen (Full Rewrite)
 *
 * Features:
 * - Photo card FIRST (Camera + Gallery, optional)
 * - In-app live camera capture via expo-camera
 * - GPS auto-captured on photo capture/selection
 * - SMS auto-shifts when offline (no manual toggle)
 * - Bilingual EN / हिंदी labels throughout
 * - Consistent design system tokens
 * - Reporter phone stored for authority verification callback
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Camera,
  Images,
  MapPin,
  ChevronLeft,
  X,
  CheckCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Phone,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { Palette, Radii, Spacing, Typography, Shadows } from '@/theme/tokens';
import { HazardType, Severity, addHazard, hazardTypes, severities } from '@/data/hazardStore';
import { getUser, isModerator } from '@/data/userStore';
import { useConnectivity } from '@/hooks/useConnectivity';
import { buildSmsBody, SMS_GATEWAY_NUMBER } from '@/lib/sms';
import { t, strings, Lang } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = 'pahaadsaathi:lang';

type PickedPhoto = { uri: string; mimeType?: string | null; fileName?: string | null };

// Hazard type configs with icons / colors
const HAZARD_META: Record<string, { emoji: string; color: string }> = {
  Landslide:    { emoji: '⛰️', color: '#B45309' },
  Flood:        { emoji: '🌊', color: '#1D4ED8' },
  'Road Block': { emoji: '🚧', color: '#D97706' },
  Avalanche:    { emoji: '❄️', color: '#6366F1' },
  Wildfire:     { emoji: '🔥', color: '#DC2626' },
  Other:        { emoji: '⚠️', color: '#64748B' },
};

const SEVERITY_COLORS: Record<string, string> = {
  Low:      '#15803D',
  Medium:   '#D97706',
  High:     '#DC2626',
  Critical: '#7F1D1D',
};

export default function ReportScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isOnline } = useConnectivity();
  const user = getUser();
  const isDark = theme.name === 'dark';

  // Language
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => { if (v === 'hi' || v === 'en') setLang(v); });
  }, []);
  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
  };

  // Form state
  const [hazardType, setHazardType] = useState<HazardType>('Landslide');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [locationText, setLocationText] = useState('');
  const [description, setDescription] = useState('');
  const [reporterPhone, setReporterPhone] = useState(user?.phone || '');

  // Photo & GPS state
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'locked' | 'error'>('idle');

  // Camera modal
  const [showCamera, setShowCamera] = useState(false);
  const [CameraComponent, setCameraComponent] = useState<React.ComponentType<any> | null>(null);
  const cameraRef = useRef<any>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Auto detect SMS fallback
  const useSms = isOnline === false;

  // ── Load camera lazily (expo-camera may not be available in all builds)
  useEffect(() => {
    if (showCamera && !CameraComponent) {
      import('expo-camera').then((mod) => {
        setCameraComponent(() => mod.CameraView ?? mod.Camera);
      }).catch(() => {
        setShowCamera(false);
        Alert.alert('Camera unavailable', 'Please use "From Gallery" instead.');
      });
    }
  }, [showCamera]);

  // ── Capture GPS automatically
  const captureGps = useCallback(async () => {
    setGpsStatus('capturing');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsStatus('error'); return; }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
      setGpsStatus('locked');

      // Reverse geocode for readable location
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&limit=1`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const data = await res.json();
          const f = data.features?.[0]?.properties;
          if (f) {
            const parts = [f.village || f.city, f.county, f.state].filter(Boolean);
            setLocationText(parts.join(', '));
          }
        }
      } catch { /* use coords */ }
    } catch {
      setGpsStatus('error');
    }
  }, []);

  // ── Take photo with camera
  const handleTakePhoto = async () => {
    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: false });
      setPhoto({ uri: pic.uri });
      setShowCamera(false);
      await captureGps(); // Auto-GPS on capture
    } catch {
      Alert.alert('Capture failed', 'Could not take photo. Please try again.');
    }
  };

  // ── Pick from gallery
  const handlePickGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPhoto({ uri: a.uri, mimeType: a.mimeType, fileName: a.fileName });
      await captureGps(); // Auto-GPS on selection
    }
  };

  // ── Submit
  const handleSubmit = async () => {
    if (!locationText.trim()) {
      Alert.alert(
        lang === 'en' ? 'Location required' : 'स्थान आवश्यक है',
        lang === 'en' ? 'Please capture GPS or enter a location.' : 'कृपया GPS या स्थान दर्ज करें।'
      );
      return;
    }
    if (!description.trim()) {
      Alert.alert(
        lang === 'en' ? 'Description required' : 'विवरण आवश्यक है',
        lang === 'en' ? 'Please describe the incident.' : 'कृपया घटना का विवरण दें।'
      );
      return;
    }

    setSubmitting(true);

    try {
      // Upload photo if present
      let photoUrl: string | null = null;
      if (photo) {
        try {
          const { uploadHazardPhoto } = await import('@/lib/storage');
          const up = await uploadHazardPhoto(photo);
          photoUrl = up.url ?? photo.uri ?? null;
        } catch {
          photoUrl = photo.uri ?? null;
        }
      }

      await addHazard({
        type: hazardType,
        location: locationText.trim(),
        description: description.trim(),
        severity,
        status: 'reported',
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        photo_url: photoUrl,
        reportedBy: user?.name ?? 'Anonymous',
        reportedByRole: user?.role ?? 'resident',
        reporterPhone: reporterPhone.trim() || null,
      });

      Alert.alert(
        lang === 'en' ? '✅ Report Submitted' : '✅ रिपोर्ट जमा हुई',
        lang === 'en'
          ? 'Authorities have been notified. They may call you to verify.'
          : 'अधिकारियों को सूचित किया गया है। वे सत्यापन के लिए कॉल कर सकते हैं।'
      );
      router.replace('/');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── SMS fallback submit
  const handleSmsFallback = async () => {
    if (!locationText.trim() || !description.trim()) {
      Alert.alert(lang === 'en' ? 'Missing fields' : 'जानकारी अधूरी है',
        lang === 'en' ? 'Fill location and description first.' : 'पहले स्थान और विवरण भरें।');
      return;
    }
    const body = buildSmsBody({ type: hazardType, location: locationText.trim(), description: description.trim() });
    const avail = await SMS.isAvailableAsync();
    if (!avail) { Alert.alert('SMS unavailable'); return; }
    await SMS.sendSMSAsync([SMS_GATEWAY_NUMBER], body);
    Alert.alert(
      lang === 'en' ? '📱 SMS Sent' : '📱 SMS भेजा गया',
      lang === 'en' ? 'Emergency report sent via SMS.' : 'आपातकालीन रिपोर्ट SMS से भेजी गई।'
    );
    router.replace('/');
  };

  const bg = isDark ? Palette.surfaceDark : Palette.glacier;
  const cardBg = isDark ? Palette.surfaceDarkElevated : Palette.snow;
  const cardBorder = isDark ? Palette.surfaceDarkBorder : Palette.stone;
  const textPrimary = isDark ? Palette.snow : Palette.pineForest;
  const textSecondary = isDark ? Palette.slateMuted : Palette.slate;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            {t(strings.reportIncident, lang)}
          </Text>
          <Text style={[styles.headerSub, { color: textSecondary }]}>
            {t(strings.reportIncidentSub, lang)}
          </Text>
        </View>
        <Pressable style={styles.langBtn} onPress={toggleLang}>
          <Text style={styles.langBtnText}>{lang === 'en' ? 'हिं' : 'EN'}</Text>
        </Pressable>
      </View>

      {/* ── Connectivity Banner ── */}
      <View style={[styles.connBanner, { backgroundColor: useSms ? '#FEF3C7' : '#DCFCE7' }]}>
        {useSms
          ? <WifiOff size={14} color={Palette.saffron} />
          : <Wifi size={14} color={Palette.verifiedGreen} />}
        <Text style={[styles.connText, { color: useSms ? Palette.saffronMuted : Palette.verifiedGreen }]}>
          {t(useSms ? strings.offline : strings.online, lang)}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ════ SECTION 1: PHOTO — FIRST THING ════ */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeader}>
            <Camera size={18} color={Palette.pineForest} />
            <Text style={[styles.cardTitle, { color: textPrimary }]}>
              {t(strings.photoEvidence, lang)}
            </Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalText}>{t(strings.photoOptional, lang)}</Text>
            </View>
          </View>

          {photo ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: photo.uri }} contentFit="cover" style={styles.photoPreview} />
              <Pressable style={styles.photoRemove} onPress={() => { setPhoto(null); setGps(null); setGpsStatus('idle'); }}>
                <X size={16} color={Palette.snow} />
              </Pressable>
              {gpsStatus === 'locked' && gps && (
                <View style={styles.gpsTagOverlay}>
                  <MapPin size={12} color={Palette.snow} />
                  <Text style={styles.gpsTagText}>
                    {gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
              {gpsStatus === 'capturing' && (
                <View style={styles.gpsTagOverlay}>
                  <ActivityIndicator size="small" color={Palette.snow} />
                  <Text style={styles.gpsTagText}>{t(strings.gpsCapturing, lang)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.photoActions}>
              <Pressable style={[styles.photoBtn, styles.photoBtnCamera]} onPress={handleTakePhoto}>
                <Camera size={22} color={Palette.snow} />
                <Text style={styles.photoBtnText}>{t(strings.takePhoto, lang)}</Text>
              </Pressable>
              <Pressable style={[styles.photoBtn, styles.photoBtnGallery, { borderColor: cardBorder }]} onPress={handlePickGallery}>
                <Images size={22} color={Palette.pineForest} />
                <Text style={[styles.photoBtnText, { color: Palette.pineForest }]}>{t(strings.chooseGallery, lang)}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ════ SECTION 2: INCIDENT TYPE ════ */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>{t(strings.incidentType, lang)}</Text>
          <View style={styles.chipGrid}>
            {hazardTypes.map((item) => {
              const meta = HAZARD_META[item] ?? { emoji: '⚠️', color: '#64748B' };
              const active = hazardType === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.chip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
                  onPress={() => setHazardType(item)}
                >
                  <Text style={styles.chipEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.chipText, { color: active ? Palette.snow : textPrimary }]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ════ SECTION 3: SEVERITY ════ */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>{t(strings.severity, lang)}</Text>
          <View style={styles.chipGrid}>
            {severities.map((item) => {
              const color = SEVERITY_COLORS[item] ?? Palette.slate;
              const active = severity === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.chip, styles.chipSeverity, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setSeverity(item)}
                >
                  <Text style={[styles.chipText, { color: active ? Palette.snow : textPrimary, fontWeight: active ? '800' : '600' }]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ════ SECTION 4: LOCATION ════ */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>{t(strings.captureLocation, lang)}</Text>
            {gpsStatus === 'locked' && (
              <View style={styles.gpsPill}>
                <CheckCircle size={12} color={Palette.verifiedGreen} />
                <Text style={styles.gpsPillText}>{t(strings.gpsTagged, lang)}</Text>
              </View>
            )}
          </View>

          <TextInput
            value={locationText}
            onChangeText={setLocationText}
            placeholder={t(strings.locationPlaceholder, lang)}
            placeholderTextColor={Palette.slateMuted}
            style={[styles.input, { color: textPrimary, borderColor: cardBorder, backgroundColor: isDark ? Palette.surfaceDark : Palette.glacierDark }]}
          />

          {gpsStatus !== 'locked' && (
            <Pressable
              style={[styles.gpsCapBtn, gpsStatus === 'capturing' && styles.gpsCapBtnBusy]}
              onPress={captureGps}
              disabled={gpsStatus === 'capturing'}
            >
              {gpsStatus === 'capturing'
                ? <ActivityIndicator size="small" color={Palette.snow} />
                : <MapPin size={16} color={Palette.snow} />}
              <Text style={styles.gpsCapBtnText}>
                {gpsStatus === 'capturing' ? t(strings.gpsCapturing, lang) : t(strings.captureLocation, lang)}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ════ SECTION 5: DESCRIPTION ════ */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>{t(strings.description, lang)}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t(strings.descPlaceholder, lang)}
            placeholderTextColor={Palette.slateMuted}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textArea, { color: textPrimary, borderColor: cardBorder, backgroundColor: isDark ? Palette.surfaceDark : Palette.glacierDark }]}
          />
        </View>

        {/* ════ SECTION 6: REPORTER PHONE ════ */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Phone size={16} color={Palette.pineForestMuted} />
            <Text style={[styles.cardTitle, { color: textPrimary, flex: 1 }]}>{t(strings.reporterPhone, lang)}</Text>
          </View>
          <TextInput
            value={reporterPhone}
            onChangeText={setReporterPhone}
            placeholder={t(strings.phonePlaceholder, lang)}
            placeholderTextColor={Palette.slateMuted}
            keyboardType="phone-pad"
            style={[styles.input, { color: textPrimary, borderColor: cardBorder, backgroundColor: isDark ? Palette.surfaceDark : Palette.glacierDark }]}
          />
          <Text style={[styles.phoneHint, { color: textSecondary }]}>
            {lang === 'en'
              ? 'Authorities may call you to confirm this report is genuine.'
              : 'अधिकारी इस रिपोर्ट की पुष्टि के लिए कॉल कर सकते हैं।'}
          </Text>
        </View>

        {/* ════ SUBMIT ════ */}
        {useSms ? (
          <View>
            <View style={[styles.smsNotice, { borderColor: Palette.saffron }]}>
              <WifiOff size={16} color={Palette.saffron} />
              <Text style={[styles.smsNoticeText, { color: Palette.saffronMuted }]}>
                {lang === 'en'
                  ? 'No internet — report will be sent via SMS automatically.'
                  : 'इंटरनेट नहीं — रिपोर्ट SMS से स्वतः भेजी जाएगी।'}
              </Text>
            </View>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: Palette.verifiedGreen }, submitting && styles.submitBtnDisabled]}
              onPress={handleSmsFallback}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>{t(strings.sendSms, lang)}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.submitBtn, { backgroundColor: Palette.pineForest }, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={Palette.snow} />
              : <Text style={styles.submitBtnText}>{t(strings.submitReport, lang)}</Text>}
          </Pressable>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ════ LIVE CAMERA MODAL ════ */}
      <Modal visible={showCamera} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.cameraModal}>
          {CameraComponent ? (
            <CameraComponent
              ref={cameraRef}
              style={styles.cameraView}
              facing="back"
            >
              {/* Overlay controls */}
              <View style={styles.cameraOverlay}>
                <Pressable style={styles.cameraCloseBtn} onPress={() => setShowCamera(false)}>
                  <X size={24} color={Palette.snow} />
                </Pressable>
                <View style={styles.cameraBottomBar}>
                  <Text style={styles.cameraHint}>
                    {lang === 'en' ? 'Point at the hazard and capture' : 'खतरे की ओर कैमरा करें और कैप्चर करें'}
                  </Text>
                  <Pressable style={styles.captureBtn} onPress={handleCapture}>
                    <View style={styles.captureBtnInner} />
                  </Pressable>
                </View>
              </View>
            </CameraComponent>
          ) : (
            <View style={styles.cameraLoading}>
              <ActivityIndicator size="large" color={Palette.snow} />
              <Text style={{ color: Palette.snow, marginTop: 12 }}>
                {lang === 'en' ? 'Opening camera…' : 'कैमरा खुल रहा है…'}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    lineHeight: Typography.lineHeight.subheading,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    marginTop: 1,
  },
  langBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: Palette.pineForestContainer,
  },
  langBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForest,
  },
  connBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 6,
  },
  connText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
  },
  scroll:         { flex: 1 },
  scrollContent:  { padding: Spacing.screenPadding, paddingBottom: 48, gap: Spacing.md },

  card: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyLg,
  },
  optionalBadge: {
    marginLeft: 'auto',
    backgroundColor: Palette.stoneLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  optionalText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Palette.slateMuted,
  },

  // Photo
  photoActions: { flexDirection: 'row', gap: Spacing.sm },
  photoBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xl,
    borderRadius: Radii.md,
  },
  photoBtnCamera: { backgroundColor: Palette.pineForest },
  photoBtnGallery: { backgroundColor: 'transparent', borderWidth: 1.5 },
  photoBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodySm,
    color: Palette.snow,
  },
  photoPreviewWrap: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
  },
  photoPreview:   { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTagOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  gpsTagText: {
    fontFamily: Typography.fontFamily.mono,
    fontSize: 10,
    color: Palette.snow,
  },

  // Chips
  chipGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Palette.stone,
  },
  chipSeverity: { minWidth: 76, justifyContent: 'center' },
  chipEmoji: { fontSize: 14 },
  chipText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodySm,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.bodyMd,
    fontFamily: Typography.fontFamily.regular,
  },
  textArea:   { height: 100, textAlignVertical: 'top' },

  // GPS
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.verifiedGreenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  gpsPillText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: 10,
    color: Palette.verifiedGreen,
  },
  gpsCapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.pineForestMuted,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  gpsCapBtnBusy:  { opacity: 0.6 },
  gpsCapBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodySm,
    color: Palette.snow,
  },

  // Phone
  phoneHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    lineHeight: Typography.lineHeight.caption,
    marginTop: 4,
  },

  // SMS Notice
  smsNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    backgroundColor: '#FFFBEB',
    marginBottom: Spacing.sm,
  },
  smsNoticeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.bodySm,
    flex: 1,
    lineHeight: 18,
  },

  // Submit
  submitBtn: {
    height: Spacing.primaryActionHeight,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyLg,
    color: Palette.snow,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Camera modal
  cameraModal:  { flex: 1, backgroundColor: '#000' },
  cameraView:   { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  cameraCloseBtn: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomBar: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  cameraHint: {
    color: Palette.snow,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.bodySm,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Palette.snow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.snow,
  },
  cameraLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
});
