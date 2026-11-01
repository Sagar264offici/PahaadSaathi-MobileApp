import {
  Alert,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

interface QuickContact {
  label: string;
  number: string;
  desc: string;
  color: string;
}

const EMERGENCY_CONTACTS: QuickContact[] = [
  { label: "National Emergency", number: "112", desc: "Police / Fire / Medical", color: "#EA580C" },
  { label: "Ambulance / Medical", number: "108", desc: "Emergency medical transport", color: "#D97706" },
  { label: "Disaster Mgmt (NDRF)", number: "1078", desc: "Landslides & rescue", color: "#15803D" },
  { label: "Highway Patrol", number: "1033", desc: "Highway assistance", color: "#15803D" },
];
const DEFAULT_EMERGENCY_CONTACT = '+918755903705';

export default function EmergencyScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  function dialNumber(num: string) {
    Alert.alert(
      `Call ${num}`,
      `Open phone dialler to connect with ${num}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call Now", onPress: () => Linking.openURL(`tel:${num}`) },
      ]
    );
  }

  async function shareLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location permission needed', 'Allow location access to include your current coordinates.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
      const message = `I need help. My current location is: ${mapLink}\nCoordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}\nSent from PahaadSaathi.`;
      const recipientDigits = DEFAULT_EMERGENCY_CONTACT.replace('+', '');

      Alert.alert('Share your location', `Send your current location to ${DEFAULT_EMERGENCY_CONTACT}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SMS',
          onPress: () => {
            void SMS.isAvailableAsync().then(async (available) => {
              if (!available) {
                Alert.alert('SMS unavailable', 'This device cannot open SMS right now.');
                return;
              }
              await SMS.sendSMSAsync([DEFAULT_EMERGENCY_CONTACT], message);
            }).catch(() => Alert.alert('SMS unavailable', 'Unable to open the messaging app.'));
          },
        },
        {
          text: 'WhatsApp',
          onPress: () => {
            void Linking.openURL(`https://wa.me/${recipientDigits}?text=${encodeURIComponent(message)}`)
              .catch(() => Alert.alert('WhatsApp unavailable', 'Unable to open WhatsApp on this device.'));
          },
        },
      ]);
    } catch {
      Alert.alert('Could not get location', 'Check that Location Services are enabled, then try again.');
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Emergency Assistance</Text>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={[styles.alertBanner, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={[styles.alertIndicator, { backgroundColor: theme.primary }]}>
              <View style={styles.alertDot} />
              <Text style={[styles.alertLabel, { color: theme.textPrimary }]}>DIRECT EMERGENCY RESPONSE</Text>
            </View>
            <Text style={[styles.alertTitle, { color: theme.textPrimary }]}>Immediate threat to life?</Text>
            <Text style={[styles.alertSubhead, { color: theme.textSecondary }]}>
              Dial 112 immediately. PahaadSaathi is advisory only, not emergency dispatch.
            </Text>
          </View>
          <Pressable style={[styles.mainDialBtn, { backgroundColor: theme.primary }]} onPress={() => dialNumber("112")}>
            <Text style={[styles.mainDialText, { color: '#FFFFFF' }]}>Call 112 (Emergency)</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Direct Helplines</Text>
          {EMERGENCY_CONTACTS.map((item) => (
            <Pressable key={item.number} style={[styles.contactRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]} onPress={() => dialNumber(item.number)}>
              <View style={styles.contactInfo}>
                <View style={[styles.contactTitleRow, { alignItems: 'center', gap: 8, marginBottom: 4 }]}>
                  <Text style={[styles.contactLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.contactBadge, { color: item.color, backgroundColor: item.color === '#EA580C' ? '#FEF2F2' : item.color === '#D97706' ? '#FEF4DB' : '#ECFDF5' }]}>{item.number}</Text>
                </View>
                <Text style={[styles.contactDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
              </View>
              <Text style={[styles.callIconText, { color: theme.textSecondary }]}>Call →</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Coordinate Broadcast</Text>
          <Pressable style={[styles.shareCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]} onPress={shareLocation}>
            <View style={[styles.shareRowBody, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }]}>
              <Text style={[styles.shareTitle, { color: theme.textPrimary }]}>Send my location</Text>
              <Text style={[styles.shareArrow, { color: theme.primary }]}>→</Text>
            </View>
            <Text style={[styles.shareDesc, { color: theme.textSecondary }]}>SMS or WhatsApp · {DEFAULT_EMERGENCY_CONTACT}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Mountain Safety Protocol</Text>
          <View style={styles.checkItem}>
            <Text style={[styles.checkNum, { color: theme.primary }]}>1</Text>
            <Text style={[styles.checkText, { color: theme.textSecondary }]}>In landslide zones, move to solid rock outcroppings. Avoid ravines and riverbeds.</Text>
          </View>
          <View style={styles.checkItem}>
            <Text style={[styles.checkNum, { color: theme.primary }]}>2</Text>
            <Text style={[styles.checkText, { color: theme.textSecondary }]}>Keep hazard lights on in poor visibility.</Text>
          </View>
          <View style={styles.checkItem}>
            <Text style={[styles.checkNum, { color: theme.primary }]}>3</Text>
            <Text style={[styles.checkText, { color: theme.textSecondary }]}>Conserve battery: use Low Power Mode.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5',
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
  headerTitle: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '800',
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
  alertBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  alertIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },
  alertLabel: {
    color: '#EA580C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertTitle: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  alertSubhead: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  mainDialBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  mainDialText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sectionLabel: {
    color: '#8A735B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
    paddingRight: 10,
  },
  contactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactLabel: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '700',
  },
  contactBadge: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contactDesc: {
    color: '#8A735B',
    fontSize: 12,
    lineHeight: 16,
  },
  callIconText: {
    color: '#8A735B',
    fontSize: 12,
    fontWeight: '700',
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  shareRowBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shareTitle: {
    color: '#3B2F2F',
    fontSize: 14,
    fontWeight: '700',
  },
  shareArrow: {
    color: '#EA580C',
    fontSize: 14,
    fontWeight: '800',
  },
  shareDesc: {
    color: '#8A735B',
    fontSize: 12,
    lineHeight: 17,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  checkNum: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '800',
    width: 16,
    marginTop: 1,
  },
  checkText: {
    color: '#3B2F2F',
    fontSize: 12,
    lineHeight: 18,
  },
});
