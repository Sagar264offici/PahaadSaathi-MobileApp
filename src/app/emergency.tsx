import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Clipboard,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  PhoneCall,
  Copy,
  ChevronLeft,
  ShieldAlert,
  MapPin,
  CheckCircle,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';
import {
  UTTARAKHAND_EMERGENCY_DIRECTORY,
} from '@/lib/sms/directory';
import { buildEmergencySmsMessage } from '@/lib/sms/format';
import { smsCoordinator, RecipientDispatchState } from '@/lib/sms/coordinator';
import { incidentRepository } from '@/lib/sqlite/incidentRepository';
import { AppButton } from '@/components/ui/AppButton';
import { Badge } from '@/components/ui/Badge';

export default function EmergencyScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  // Location telemetry state
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    'locating' | 'locked' | 'unavailable'
  >('locating');

  // SOS hold state
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<any>(null);

  // Active incident state
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [selectedIncidentType, setSelectedIncidentType] =
    useState<string>('Landslide');

  // SMS Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentRecipient, setCurrentRecipient] =
    useState<RecipientDispatchState | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(
    null
  );

  // Acquire real GPS fix on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setLocationStatus('unavailable');
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        if (isMounted) {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          if (position.coords.altitude !== null) {
            setAltitude(Math.round(position.coords.altitude));
          }
          setLocationStatus('locked');
        }
      } catch {
        if (isMounted) setLocationStatus('unavailable');
      }
    })();

    return () => {
      isMounted = false;
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  function startHold() {
    setIsHolding(true);
    setHoldProgress(0);
    const startTime = Date.now();
    const duration = 2000; // 2 seconds hold to trigger

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setHoldProgress(progress);

      if (progress >= 1) {
        clearInterval(holdIntervalRef.current);
        setIsHolding(false);
        triggerSosDispatch();
      }
    }, 50);
  }

  function cancelHold() {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
  }

  async function triggerSosDispatch() {
    const incId = `PS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setActiveIncidentId(incId);

    // 1. Immediately save incident locally to SQLite durable storage
    await incidentRepository.saveIncidentLocally({
      id: incId,
      type: selectedIncidentType,
      severity: 'High',
      latitude: coords ? coords.latitude : null,
      longitude: coords ? coords.longitude : null,
      accuracyMeters: coords ? coords.accuracy : null,
      locationTimestamp: new Date().toISOString(),
      description: `Emergency SOS initiated for ${selectedIncidentType}`,
      status: 'reported',
      verificationStatus: 'unverified',
    });

    // 2. Format GSM-7 canonical emergency SMS
    const { body } = buildEmergencySmsMessage({
      incidentId: incId,
      type: selectedIncidentType,
      severity: 'CRITICAL',
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      accuracyMeters: coords?.accuracy,
    });

    // 3. Initiate single-recipient SMS session with SDRF and National 112
    const recipients = [
      { id: '112', name: 'National Emergency 112', phone: '112' },
      { id: 'sdrf', name: 'Uttarakhand SDRF Rescue', phone: '+919411112973' },
    ];

    await smsCoordinator.startSession(incId, body, recipients);

    // 4. Dispatch first recipient composer
    dispatchNextRecipientComposer();
  }

  async function dispatchNextRecipientComposer() {
    const session = await smsCoordinator.getActiveSession();
    if (!session || session.isComplete) {
      return;
    }

    const res = await smsCoordinator.openCurrentRecipientComposer();
    if (res.success && res.recipient) {
      setCurrentRecipient(res.recipient);
      setShowConfirmModal(true);
    } else {
      Alert.alert(
        'SMS Fallback Note',
        res.error || 'Cellular SMS composer could not be launched. Use Call 112 instead.'
      );
    }
  }

  async function handleConfirmOutcome(outcome: 'yes' | 'no' | 'unsure') {
    if (!currentRecipient) return;

    await smsCoordinator.recordUserConfirmation(
      currentRecipient.recipientId,
      outcome
    );
    setShowConfirmModal(false);

    if (outcome === 'yes') {
      setConfirmationNotice(
        'You confirmed pressing Send in the SMS app. Delivery to recipient is unverified until acknowledged by emergency servers.'
      );
    } else {
      setConfirmationNotice('SMS dispatch was not sent or cancelled.');
    }

    // Check if more recipients are queued
    const session = await smsCoordinator.getActiveSession();
    if (session && !session.isComplete) {
      Alert.alert(
        'Next Emergency Recipient',
        `Send emergency alert to next authority: ${session.recipients[session.currentRecipientIndex]?.recipientName}?`,
        [
          { text: 'Skip', style: 'cancel' },
          { text: 'Send', onPress: () => dispatchNextRecipientComposer() },
        ]
      );
    }
  }

  function dialNumber(num: string, name: string) {
    Alert.alert(`Call ${name}`, `Open phone dialer to call ${num}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call Now', onPress: () => Linking.openURL(`tel:${num}`) },
    ]);
  }

  function copySosDetails() {
    const incId = activeIncidentId || 'PS-EMRG';
    const { body } = buildEmergencySmsMessage({
      incidentId: incId,
      type: selectedIncidentType,
      severity: 'CRITICAL',
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      accuracyMeters: coords?.accuracy,
    });

    Clipboard.setString(body);
    Alert.alert('Copied to Clipboard', 'Emergency coordinates & details copied.');
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.name === 'dark' ? Palette.surfaceDark : Palette.glacier,
        },
      ]}
    >
      <StatusBar
        barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor:
              theme.name === 'dark' ? Palette.surfaceDarkBorder : Palette.stone,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <ChevronLeft
            size={24}
            color={
              theme.name === 'dark' ? Palette.snow : Palette.pineForest
            }
          />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerProtocol,
              {
                color:
                  theme.name === 'dark'
                    ? Palette.pineForestContainer
                    : Palette.pineForestMuted,
              },
            ]}
          >
            ALPINE INCIDENT PROTOCOL
          </Text>
          <Text
            style={[
              styles.headerTitle,
              {
                color:
                  theme.name === 'dark' ? Palette.snow : Palette.pineForest,
              },
            ]}
          >
            Emergency Assistance
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Telemetry & Coordinates Banner */}
        <View style={styles.telemetryBanner}>
          <View style={styles.telemetryHeaderRow}>
            <View style={styles.telemetryStatusGroup}>
              <View
                style={[
                  styles.statusPulseDot,
                  {
                    backgroundColor:
                      locationStatus === 'locked'
                        ? Palette.verifiedGreen
                        : Palette.saffron,
                  },
                ]}
              />
              <Text style={styles.telemetryStatusText}>
                {locationStatus === 'locked'
                  ? 'GPS FIX LOCKED (ACCURATE)'
                  : locationStatus === 'locating'
                  ? 'ACQUIRING SATELLITE FIX...'
                  : 'GPS UNAVAILABLE'}
              </Text>
            </View>
            <Badge
              label="OFFLINE PERSISTENCE"
              variant="brand"
              style={{ backgroundColor: Palette.pineForestContainer }}
            />
          </View>

          <View style={styles.coordinatesRow}>
            <MapPin size={22} color={Palette.pineForestContainer} />
            <View style={styles.coordinatesTextGroup}>
              <Text style={styles.coordLabel}>EXACT TELEMETRY COORDINATES</Text>
              <Text style={styles.coordValue}>
                {coords
                  ? `${coords.latitude.toFixed(5)}°N, ${coords.longitude.toFixed(5)}°E`
                  : 'LOCATION UNKNOWN'}
              </Text>
              {coords?.accuracy && (
                <Text style={styles.coordAccuracy}>
                  Accuracy: ±{Math.round(coords.accuracy)}m
                  {altitude ? ` • Elevation: ~${altitude}m` : ''}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* SOS Hold Trigger Cluster */}
        <View
          style={[
            styles.sosCard,
            {
              backgroundColor:
                theme.name === 'dark'
                  ? Palette.surfaceDarkElevated
                  : Palette.snow,
              borderColor:
                theme.name === 'dark'
                  ? Palette.surfaceDarkBorder
                  : Palette.stone,
            },
          ]}
        >
          <Text
            style={[
              styles.sosInstruction,
              {
                color:
                  theme.name === 'dark' ? Palette.stone : Palette.slate,
              },
            ]}
          >
            Press and hold for 2 seconds to initiate local disaster SOS dispatch
          </Text>

          {/* Incident Type Selector */}
          <View style={styles.typeSelectorRow}>
            {['Landslide', 'Flash Flood', 'Medical', 'Trapped'].map((type) => (
              <Pressable
                key={type}
                onPress={() => setSelectedIncidentType(type)}
                style={[
                  styles.typeChip,
                  selectedIncidentType === type && styles.typeChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selectedIncidentType === type && styles.typeChipTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sosButtonContainer}>
            <Pressable
              onPressIn={startHold}
              onPressOut={cancelHold}
              style={[
                styles.sosButton,
                isHolding && styles.sosButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Hold 2 seconds for SOS emergency dispatch"
            >
              <ShieldAlert size={42} color={Palette.snow} />
              <Text style={styles.sosButtonLabel}>
                {isHolding ? `${Math.round(holdProgress * 100)}%` : 'HOLD SOS'}
              </Text>
              <Text style={styles.sosSubLabel}>2 SECONDS</Text>
            </Pressable>
          </View>

          {activeIncidentId && (
            <View style={styles.activeIncidentBadge}>
              <CheckCircle size={16} color={Palette.verifiedGreen} />
              <Text style={styles.activeIncidentText}>
                Incident {activeIncidentId} saved safely in offline database
              </Text>
            </View>
          )}

          {confirmationNotice && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{confirmationNotice}</Text>
            </View>
          )}
        </View>

        {/* Primary Direct Call 112 Action */}
        <View style={styles.directCallSection}>
          <Pressable
            style={styles.call112Button}
            onPress={() =>
              dialNumber('112', 'National Emergency Control (112)')
            }
          >
            <PhoneCall size={24} color={Palette.snow} />
            <View style={styles.call112TextGroup}>
              <Text style={styles.call112MainText}>Call 112 (National Emergency)</Text>
              <Text style={styles.call112SubText}>
                Direct cellular line • Police, Fire & Medical
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Copy & Share Utilities */}
        <View style={styles.utilityRow}>
          <AppButton
            label="Copy SOS Details"
            icon={<Copy size={16} color={Palette.pineForest} />}
            variant="outline"
            size="md"
            style={styles.utilityBtn}
            onPress={copySosDetails}
          />
        </View>

        {/* Regional Emergency Directory */}
        <View style={styles.directorySection}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.name === 'dark' ? Palette.snow : Palette.pineForest,
              },
            ]}
          >
            Uttarakhand Emergency Authorities
          </Text>

          {UTTARAKHAND_EMERGENCY_DIRECTORY.map((contact) => (
            <View
              key={contact.contactId}
              style={[
                styles.contactCard,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? Palette.surfaceDarkElevated
                      : Palette.snow,
                  borderColor:
                    theme.name === 'dark'
                      ? Palette.surfaceDarkBorder
                      : Palette.stone,
                },
              ]}
            >
              <View style={styles.contactInfo}>
                <Text
                  style={[
                    styles.contactName,
                    {
                      color:
                        theme.name === 'dark'
                          ? Palette.snow
                          : Palette.pineForest,
                    },
                  ]}
                >
                  {contact.authorityName}
                </Text>
                <Text
                  style={[
                    styles.contactDesc,
                    {
                      color:
                        theme.name === 'dark'
                          ? Palette.slateMuted
                          : Palette.slate,
                    },
                  ]}
                >
                  {contact.description}
                </Text>
                <Text style={styles.contactNumber}>{contact.phoneNumber}</Text>
              </View>

              <Pressable
                style={styles.contactDialButton}
                onPress={() =>
                  dialNumber(contact.phoneNumber, contact.authorityName)
                }
                accessibilityLabel={`Call ${contact.authorityName}`}
              >
                <PhoneCall size={18} color={Palette.snow} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Honest Post-SMS Confirmation Dialog */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalDialog,
              {
                backgroundColor:
                  theme.name === 'dark'
                    ? Palette.surfaceDarkElevated
                    : Palette.snow,
              },
            ]}
          >
            <AlertTriangle size={32} color={Palette.saffron} />
            <Text
              style={[
                styles.modalTitle,
                {
                  color:
                    theme.name === 'dark' ? Palette.snow : Palette.slate,
                },
              ]}
            >
              Confirm SMS Dispatch Outcome
            </Text>
            <Text
              style={[
                styles.modalBody,
                {
                  color:
                    theme.name === 'dark' ? Palette.stone : Palette.slateMuted,
                },
              ]}
            >
              Did you press the Send button in your native messaging app for{' '}
              {currentRecipient?.recipientName}?
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalBtnSuccess]}
                onPress={() => handleConfirmOutcome('yes')}
              >
                <Text style={styles.modalBtnTextWhite}>Yes, I Pressed Send</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalBtnDanger]}
                onPress={() => handleConfirmOutcome('no')}
              >
                <Text style={styles.modalBtnTextWhite}>No, Did Not Send</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalBtnNeutral]}
                onPress={() => handleConfirmOutcome('unsure')}
              >
                <Text style={styles.modalBtnTextDark}>I am Unsure</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerProtocol: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    letterSpacing: Typography.letterSpacing.wider,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.headingSm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
  },
  telemetryBanner: {
    backgroundColor: Palette.pineForest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  telemetryStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  telemetryStatusText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestContainer,
    letterSpacing: Typography.letterSpacing.wide,
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  coordinatesTextGroup: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  coordLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestContainer,
    letterSpacing: Typography.letterSpacing.wide,
  },
  coordValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    color: Palette.snow,
    marginVertical: 2,
  },
  coordAccuracy: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.glacierDark,
  },
  sosCard: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sosInstruction: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.bodySm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Palette.stoneLight,
  },
  typeChipSelected: {
    backgroundColor: Palette.pineForest,
  },
  typeChipText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.slate,
  },
  typeChipTextSelected: {
    color: Palette.snow,
  },
  sosButtonContainer: {
    marginVertical: Spacing.md,
  },
  sosButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Palette.rescueRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.rescueRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  sosButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#93000A',
  },
  sosButtonLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyLg,
    color: Palette.snow,
    marginTop: 4,
  },
  sosSubLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.rescueRedLight,
  },
  activeIncidentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    backgroundColor: Palette.verifiedGreenLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  activeIncidentText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.verifiedGreen,
    marginLeft: Spacing.xs,
  },
  noticeBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Palette.saffronLight,
    borderRadius: Radii.sm,
  },
  noticeText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.saffronMuted,
    textAlign: 'center',
  },
  directCallSection: {
    marginBottom: Spacing.md,
  },
  call112Button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.rescueRed,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  call112TextGroup: {
    marginLeft: Spacing.md,
  },
  call112MainText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyLg,
    color: Palette.snow,
  },
  call112SubText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.rescueRedLight,
  },
  utilityRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  utilityBtn: {
    flex: 1,
  },
  directorySection: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    marginBottom: Spacing.md,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  contactInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  contactName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
  },
  contactDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    marginTop: 2,
  },
  contactNumber: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestMuted,
    marginTop: 4,
  },
  contactDialButton: {
    backgroundColor: Palette.pineForest,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  modalButtons: {
    width: '100%',
    gap: Spacing.sm,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  modalBtnSuccess: {
    backgroundColor: Palette.verifiedGreen,
  },
  modalBtnDanger: {
    backgroundColor: Palette.rescueRed,
  },
  modalBtnNeutral: {
    backgroundColor: Palette.stone,
  },
  modalBtnTextWhite: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    color: Palette.snow,
  },
  modalBtnTextDark: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodyMd,
    color: Palette.slate,
  },
});
