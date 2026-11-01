import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

import {
  Hazard,
  HazardType,
  Severity,
  STATUS_LABELS,
  getHazards,
  addHazard,
  fetchHazardsFromSupabase,
  hazardTypes,
  severities,
  subscribe,
  syncOfflineQueue,
} from "@/data/hazardStore";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { uploadHazardPhoto } from "@/lib/storage";
import { getBluetoothRelayState, startBluetoothRelay, stopBluetoothRelay, subscribeBluetoothRelay, resumeBluetoothRelay, type BluetoothRelayState } from '@/lib/relay/bluetoothTransport';
import { relayEngine } from '@/lib/relay/engine';

type Tab = "home" | "report" | "feed";
type PickedPhoto = { uri: string; mimeType?: string | null; fileName?: string | null };

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string }> = {
  High: { label: "HIGH", color: "#EA580C" },
  Medium: { label: "MEDIUM", color: "#D97706" },
  Low: { label: "LOW", color: "#15803D" },
};

function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choiceChip,
        { backgroundColor: active ? theme.primary : theme.surface, borderColor: active ? theme.primary : theme.border },
      ]}
    >
      <Text style={[styles.choiceText, { color: active ? theme.buttonPrimaryText : theme.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function IncidentCard({ item }: { item: Hazard }) {
  const { theme } = useTheme();
  const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.Low;
  const statusLabel = STATUS_LABELS[item.status] || item.status;
  const isSample = item.sample;

  return (
    <Link href={`/hazard/${item.id}`} asChild>
      <Pressable style={StyleSheet.flatten([styles.row, { backgroundColor: theme.background, borderBottomColor: theme.border }])}>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowType, { color: theme.textPrimary }]}>{item.type}</Text>
            <View style={[styles.severityChip, { borderColor: sev.color }]}>
              <Text style={[styles.severityChipText, { color: sev.color }]}>{sev.label}</Text>
            </View>
          </View>
          <Text style={[styles.rowLocation, { color: theme.textSecondary }]}>{item.location}</Text>
          <View style={styles.rowMeta}>
            <Text style={[styles.rowTime, { color: theme.textTertiary }]}>{item.time || "—"}</Text>
            <View style={[styles.statusChip, { borderColor: theme.border }]}>
              <Text style={[styles.statusChipText, { color: isSample ? "#8A735B" : sev.color }]}>
                {isSample ? "DEMO" : statusLabel}
              </Text>
            </View>
          </View>
        </View>
        {item.photo_url && (
          <Image source={{ uri: item.photo_url }} contentFit="cover" style={[styles.incidentPhoto, { backgroundColor: theme.backgroundSecondary }]} />
        )}
      </Pressable>
    </Link>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>("home");
  const [hazards, setHazards] = useState<Hazard[]>(getHazards());
  const [bluetoothRelay, setBluetoothRelay] = useState<BluetoothRelayState>(getBluetoothRelayState());

  const [type, setType] = useState<HazardType>("Landslide");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [pickedImage, setPickedImage] = useState<PickedPhoto | null>(null);

  const { isOnline } = useConnectivity();

  useEffect(() => {
    const unsub = subscribe((items) => setHazards(items));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBluetoothRelay(setBluetoothRelay);
    void resumeBluetoothRelay();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchHazardsFromSupabase();
        if (isOnline) {
          await syncOfflineQueue();
        }
      } catch (err) {
        console.error("Failed to load hazards:", err);
      }
    };
    loadData();
  }, [isOnline]);

  const submitReport = useCallback(async () => {
    if (!location.trim() || !description.trim()) {
      Alert.alert("Required Fields", "Please specify a location and describe the incident.");
      return;
    }

    let photoUrl: string | null = null;

    // Upload photo if selected
    if (pickedImage) {
      const uploadResult = await uploadHazardPhoto(pickedImage);
      if (uploadResult.error) {
        const continueWithoutPhoto = await new Promise<boolean>((resolve) => {
          Alert.alert("Upload Failed", uploadResult.error || "Could not upload photo.", [
            { text: "Cancel Report", style: "cancel", onPress: () => resolve(false) },
            { text: "Submit Without Photo", style: "destructive", onPress: () => resolve(true) },
          ], { cancelable: false });
        });
        if (!continueWithoutPhoto) return;
      } else {
        photoUrl = uploadResult.url ?? null;
      }
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newReport: Hazard = {
      id: String(Date.now()),
      type,
      location: location.trim(),
      description: description.trim(),
      severity,
      status: "reported",
      time: timeString,
      sample: false,
      latitude: null,
      longitude: null,
      photo_url: photoUrl,
    };

    try {
      await addHazard(newReport);
    } catch {
      Alert.alert("Submission Error", "Unable to store this report right now. Please try again.");
      return;
    }

    try {
      await relayEngine.createAndSendAlert({
        title: `${severity} ${type}`,
        body: `${description.trim()}\nLocation: ${location.trim()}`,
        hazardId: newReport.id,
        hazardType: type,
        locationLabel: location.trim(),
        severity,
        verificationStatus: 'reported',
      });
    } catch (error) {
      console.warn('Could not add report to the nearby relay queue:', error);
    }

    setLocation("");
    setDescription("");
    setType("Landslide");
    setSeverity("Medium");
    setPickedImage(null);
    setTab("feed");

    Alert.alert("Report saved", "It will be shared with nearby phones when Bluetooth relay is on.");
  }, [location, description, type, severity, pickedImage]);

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

  function openAccount() {
    router.push("/account");
  }

  async function toggleBluetoothRelay() {
    if (bluetoothRelay.enabled) {
      stopBluetoothRelay();
      await relayEngine.setRelayActive(false);
      return;
    }
    try {
      await startBluetoothRelay();
      await relayEngine.setRelayActive(true);
    } catch (error) {
      Alert.alert('Bluetooth relay unavailable', error instanceof Error ? error.message : 'Could not start Bluetooth relay.');
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.appShell}>

      {/* Header */}
      <View style={[styles.topNav, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={styles.branding}>
          <Image source={require('@/assets/images/PahaadSaathi Mountain Safety Logo.png')} style={styles.logoImage} />
          <View>
            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>PahaadSaathi</Text>
            <Text style={[styles.brandTagline, { color: theme.textSecondary }]}>Mountain safety</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <ThemeToggle />
          <Pressable style={styles.iconBtn} onPress={openAccount}>
            <Text style={styles.iconBtnText}>👤</Text>
          </Pressable>
        </View>
      </View>

      {/* Connectivity Indicator */}
      <View style={[styles.connectionStatus, { backgroundColor: theme.surface }]}>
        <View style={[styles.connectionDot, { backgroundColor: isOnline === false ? '#D97706' : '#15803D' }]} />
        <Text style={[styles.connectionText, { color: theme.textSecondary }]}>
          {isOnline === false ? 'Offline · saved reports available' : 'Safety updates connected'}
        </Text>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: bluetoothRelay.enabled }}
        onPress={toggleBluetoothRelay}
        disabled={!bluetoothRelay.available}
        style={[styles.bluetoothCard, { backgroundColor: theme.surface, borderColor: bluetoothRelay.enabled ? theme.primary : theme.cardBorder }]}
      >
        <View style={[styles.bluetoothDot, { backgroundColor: bluetoothRelay.status === 'error' ? '#B42318' : bluetoothRelay.enabled ? '#15803D' : theme.textTertiary }]} />
        <View style={styles.bluetoothCopy}>
          <Text style={[styles.bluetoothTitle, { color: theme.textPrimary }]}>Nearby Bluetooth relay</Text>
          <Text style={[styles.bluetoothSubtitle, { color: theme.textSecondary }]}>
            {!bluetoothRelay.available ? bluetoothRelay.error || 'Use the iOS or Android app to connect nearby' : bluetoothRelay.status === 'error' ? bluetoothRelay.error : bluetoothRelay.enabled ? `${bluetoothRelay.peers.filter((peer) => peer.connected).length} nearby · sharing reports automatically` : 'Off · tap to find nearby travellers'}
          </Text>
        </View>
        <Text style={[styles.bluetoothAction, { color: bluetoothRelay.enabled ? theme.primary : theme.textSecondary }]}>
          {bluetoothRelay.enabled ? 'On' : bluetoothRelay.available ? 'Start' : 'Unavailable'}
        </Text>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* OVERVIEW TAB */}
        {tab === "home" && (
          <>
            <View style={styles.welcomeBlock}>
              <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>Stay safe on the road</Text>
              <Text style={[styles.pageSub, { color: theme.textSecondary }]}>Check conditions or share what you see.</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <View style={styles.actionsGrid}>
                <Pressable style={[styles.actionCard, styles.primaryAction, { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setTab("report")}>
                  <Text style={[styles.actionTitle, { color: '#FFFFFF' }]}>＋  Report a hazard</Text>
                  <Text style={[styles.actionSub, { color: '#FFFFFF' }]}>Share a road or weather issue</Text>
                </Pressable>
                <Pressable style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]} onPress={() => router.push("/map")}>
                  <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>⌖  Check a route</Text>
                  <Text style={[styles.actionSub, { color: theme.textSecondary }]}>View hazards along your way</Text>
                </Pressable>
                <Pressable style={[styles.actionCard, styles.emergencyAction, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]} onPress={() => router.push("/emergency")}>
                  <Text style={[styles.actionTitle, { color: '#B42318' }]}>Call emergency services</Text>
                  <Text style={[styles.actionSub, { color: theme.textSecondary }]}>Get help · 112</Text>
                </Pressable>
              </View>
            </View>

            {/* Recent Incidents */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Incidents</Text>
                <Pressable style={styles.linkRow} onPress={() => setTab("feed")}>
                  <Text style={[styles.linkText, { color: theme.primary }]}>View all →</Text>
                </Pressable>
              </View>
              {hazards.length > 0 ? (
                hazards.slice(0, 5).map((item) => (
                  <IncidentCard key={item.id} item={item} />
                ))
              ) : (
                <View style={styles.emptyBlock}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No incidents reported.</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* REPORT TAB */}
        {tab === "report" && (
          <>
            <View style={styles.section}>
              <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Report a Hazard</Text>
              <Text style={[styles.pageSub, { color: theme.textSecondary }]}>Submit a road hazard report to alert other travellers.</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Hazard Type</Text>
                <View style={styles.chipWrap}>
                  {hazardTypes.map((item) => (
                    <ChoiceChip
                      key={item}
                      label={item}
                      active={type === item}
                      onPress={() => setType(item)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Severity Level</Text>
                <View style={styles.chipWrap}>
                  {severities.map((item) => (
                    <ChoiceChip
                      key={item}
                      label={item}
                      active={severity === item}
                      onPress={() => setSeverity(item)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Location & Landmark</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. 5 km after Rudraprayag bypass, NH-07"
                  placeholderTextColor={theme.placeholderText}
                  style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe current road conditions..."
                  placeholderTextColor={theme.placeholderText}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.textArea, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
                />
              </View>

              {/* Photo Upload */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Photo (Optional)</Text>
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

              <Pressable style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={submitReport}>
                <Text style={[styles.submitBtnText, { color: '#FFFFFF' }]}>Submit Report</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* FEED TAB */}
        {tab === "feed" && (
          <>
            <View style={styles.section}>
              <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Incident Feed</Text>
              <Text style={[styles.pageSub, { color: theme.textSecondary }]}>All reported hazards in this session.</Text>
            </View>

            <View style={styles.section}>
              {hazards.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No reports</Text>
                  <Text style={[styles.emptySub, { color: theme.textSecondary }]}>No incidents have been reported yet.</Text>
                </View>
              ) : (
                hazards.map((item) => (
                  <IncidentCard key={item.id} item={item} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.navBackground, borderTopColor: theme.border }]}>
        {(
          [
            ["home", "⌂", "Home"],
            ["report", "+", "Report"],
            ["feed", "≡", "Reports"],
          ] as [Tab, string, string][]
        ).map(([tabKey, tabIcon, tabTitle]) => {
          const isActive = tab === tabKey;
          return (
            <Pressable
              key={tabKey}
              onPress={() => setTab(tabKey)}
              style={[styles.navItem, isActive && [styles.navItemActive, { backgroundColor: theme.primaryLight }]]}
            >
              <Text style={[styles.navIcon, { color: isActive ? theme.navActive : theme.navInactive }]}>{tabIcon}</Text>
              <Text style={[styles.navLabel, { color: isActive ? theme.navActive : theme.navInactive }]}>{tabTitle}</Text>
            </Pressable>
          );
        })}
      </View>
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
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    backgroundColor: '#FFFDF5',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandTitle: {
    color: '#3B2F2F',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandTagline: {
    color: '#8A735B',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  welcomeBlock: {
    marginBottom: 20,
    marginTop: 6,
  },
  welcomeTitle: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#141824',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#202636',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#2A303E',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  notice: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  noticeText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
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
  bluetoothCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 12,
  },
  bluetoothDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  bluetoothCopy: {
    flex: 1,
  },
  bluetoothTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bluetoothSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  bluetoothAction: {
    fontSize: 12,
    fontWeight: '700',
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
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#3B2F2F',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    overflow: 'hidden',
  },
  statCol: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#FED7AA',
  },
  statDiv: {
    width: 1,
    backgroundColor: '#FED7AA',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3B2F2F',
    marginBottom: 2,
  },
  statLabel: {
    color: '#8A735B',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  rowBody: {
    flex: 1,
  },
  incidentPhoto: {
    width: 68,
    height: 68,
    borderRadius: 10,
    marginLeft: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowType: {
    color: '#3B2F2F',
    fontSize: 13,
    fontWeight: '800',
  },
  rowLocation: {
    color: '#5B4A3E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTime: {
    color: '#8A735B',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: 'monospace',
  },
  severityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyBlock: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8A735B',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: '#8A735B',
    fontSize: 13,
  },
  pageTitle: {
    color: '#3B2F2F',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  pageSub: {
    color: '#8A735B',
    fontSize: 13,
    lineHeight: 19,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    color: '#5B4A3E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
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
  submitBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
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
  actionsGrid: {
    gap: 10,
  },
  actionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  primaryAction: {
    borderWidth: 0,
  },
  emergencyAction: {
    paddingVertical: 13,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  actionTitle: {
    color: '#3B2F2F',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  actionSub: {
    color: '#8A735B',
    fontSize: 12,
    fontWeight: '500',
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
