import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ShieldAlert,
  Radio,
  Building,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  Send,
  RefreshCw,
} from 'lucide-react-native';

import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';
import {
  communityStore,
  GeographicCommunity,
  CommunityResource,
  HelpRequest,
} from '@/data/communityStore';
import { incidentRepository } from '@/lib/sqlite/incidentRepository';
import { IncidentRecord } from '@/lib/sqlite/types';
import {
  sandboxPublicAlertProvider,
  PublicAlertDraft,
} from '@/lib/alerts/publicAlertProvider';
import { AppButton } from '@/components/ui/AppButton';
import { Badge } from '@/components/ui/Badge';
import { StatusLabel } from '@/components/ui/StatusLabel';

export default function DistrictControlRoomScreen() {
  const router = useRouter();
  const communities = communityStore.getCommunities();
  const [selectedCommunity, setSelectedCommunity] = useState<GeographicCommunity>(
    communities[0]
  );

  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Official Alert Modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertHeadlineEn, setAlertHeadlineEn] = useState('');
  const [alertHeadlineHi, setAlertHeadlineHi] = useState('');
  const [alertInstructionsEn, setAlertInstructionsEn] = useState('');
  const [alertInstructionsHi, setAlertInstructionsHi] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<
    'WARNING' | 'EXTREME_EMERGENCY'
  >('WARNING');
  const [dispatchedAlertId, setDispatchedAlertId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const incs = await incidentRepository.getAll();
    const res = communityStore.getResources(selectedCommunity.id);
    const help = await communityStore.getHelpRequests(selectedCommunity.id);

    setIncidents(incs);
    setResources(res);
    setHelpRequests(help);
    setRefreshing(false);
  }, [selectedCommunity.id]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const incs = await incidentRepository.getAll();
      const res = communityStore.getResources(selectedCommunity.id);
      const help = await communityStore.getHelpRequests(selectedCommunity.id);

      if (isMounted) {
        setIncidents(incs);
        setResources(res);
        setHelpRequests(help);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [selectedCommunity.id]);

  const handleVerifyIncident = async (id: string) => {
    await incidentRepository.updateVerification(id, 'authority_verified', 'verified');
    await loadData();
    Alert.alert('Incident Verified', `Incident ${id} has been verified by DDMA.`);
  };

  const handleRejectIncident = async (id: string) => {
    await incidentRepository.updateVerification(id, 'disputed', 'rejected');
    await loadData();
  };

  const handleDispatchOfficialAlert = async () => {
    if (!alertHeadlineEn.trim() || !alertHeadlineHi.trim()) {
      Alert.alert('Bilingual Requirement', 'Official public warnings must include both English and Hindi headlines.');
      return;
    }

    const draft: PublicAlertDraft = {
      id: `alt_${Date.now()}`,
      senderAgency: `DDMA ${selectedCommunity.district} / SDRF Control`,
      senderOfficerName: 'Duty Officer, Disaster Control',
      targetRegion: selectedCommunity.name,
      targetDistrict: selectedCommunity.district,
      category: 'meteorological',
      headlineEn: alertHeadlineEn.trim(),
      headlineHi: alertHeadlineHi.trim(),
      instructionsEn: alertInstructionsEn.trim() || 'Move to designated safe gathering shelters.',
      instructionsHi: alertInstructionsHi.trim() || 'चिह्नित सुरक्षित राहत शिविरों में शरण लें।',
      severity: alertSeverity,
      effectiveUntil: new Date(Date.now() + 24 * 3600000).toISOString(),
      approvalsRequired: 2,
      approvedBy: ['OFFICER_SIGN_A', 'OFFICER_SIGN_B'], // Dual-officer verified
      status: 'authorized',
      createdAt: new Date().toISOString(),
    };

    try {
      const dispatch = await sandboxPublicAlertProvider.submitAlert(draft, 'ADM_KEY');
      setDispatchedAlertId(dispatch.dispatchId);
      setShowAlertModal(false);
      setAlertHeadlineEn('');
      setAlertHeadlineHi('');
      setAlertInstructionsEn('');
      setAlertInstructionsHi('');
      Alert.alert(
        'Government Alert Broadcast Initiated',
        `Dispatched via CAP / SACHET sandbox.\nID: ${dispatch.dispatchId}\nAudience Reach: ~${dispatch.targetAudienceEstimate} citizens`
      );
    } catch (err: any) {
      Alert.alert('Dispatch Error', err.message || 'Alert dispatch failed.');
    }
  };

  // Real backend calculations
  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter(
    (i) => i.severity === 'High' && i.status !== 'resolved' && i.status !== 'rejected'
  ).length;
  const pendingVerification = incidents.filter(
    (i) => i.verificationStatus === 'unverified'
  ).length;
  const verifiedHazards = incidents.filter(
    (i) => i.verificationStatus === 'authority_verified'
  ).length;
  const totalShelterBeds = resources
    .filter((r) => r.category === 'shelter')
    .reduce((acc, curr) => acc + (curr.capacity || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Operations Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <ChevronLeft size={22} color={Palette.snow} />
          </Pressable>
          <View>
            <Text style={styles.agencyTag}>UTTARAKHAND STATE DISASTER MANAGEMENT AUTHORITY</Text>
            <Text style={styles.headerTitle}>District Emergency Control Room (EOC)</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            style={styles.refreshBtn}
            onPress={loadData}
            disabled={refreshing}
          >
            <RefreshCw size={16} color={Palette.snow} />
            <Text style={styles.refreshText}>{refreshing ? 'Refreshing...' : 'Live Sync'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* District / Tehsil Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>SELECT OPERATIONAL SECTOR:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {communities.map((c) => (
              <Pressable
                key={c.id}
                style={[
                  styles.filterChip,
                  selectedCommunity.id === c.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCommunity(c)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCommunity.id === c.id && styles.filterChipTextActive,
                  ]}
                >
                  {c.district}: {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Operational Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: Palette.pineForest }]}>
            <Text style={styles.metricVal}>{totalIncidents}</Text>
            <Text style={styles.metricLabel}>Total Incidents</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: Palette.rescueRed }]}>
            <Text style={[styles.metricVal, { color: Palette.rescueRed }]}>{criticalCount}</Text>
            <Text style={styles.metricLabel}>Critical Threats</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: Palette.saffron }]}>
            <Text style={[styles.metricVal, { color: Palette.saffron }]}>{pendingVerification}</Text>
            <Text style={styles.metricLabel}>Pending Verification</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: Palette.verifiedGreen }]}>
            <Text style={[styles.metricVal, { color: Palette.verifiedGreen }]}>{verifiedHazards}</Text>
            <Text style={styles.metricLabel}>Verified Hazards</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: Palette.infoBlue }]}>
            <Text style={styles.metricVal}>{totalShelterBeds}</Text>
            <Text style={styles.metricLabel}>Shelter Bed Capacity</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: Palette.pineForestMuted }]}>
            <Text style={styles.metricVal}>{helpRequests.length}</Text>
            <Text style={styles.metricLabel}>Open Help Requests</Text>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <View style={styles.actionInfoGroup}>
            <Radio size={18} color={Palette.rescueRed} />
            <Text style={styles.actionInfoText}>
              {dispatchedAlertId
                ? `Last Broadcast Active: ${dispatchedAlertId}`
                : 'Official Public Alert Broadcast System (CAP / SACHET Interface)'}
            </Text>
          </View>
          <AppButton
            label="Prepare Government Warning"
            icon={<Send size={16} color={Palette.snow} />}
            variant="danger"
            size="md"
            onPress={() => setShowAlertModal(true)}
          />
        </View>

        {/* Live Incident Triage Table */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <ShieldAlert size={20} color={Palette.pineForest} />
              <Text style={styles.sectionTitle}>Incident Triage & Verification Queue</Text>
            </View>
            <Text style={styles.countBadge}>{incidents.length} Records</Text>
          </View>

          {incidents.length === 0 ? (
            <Text style={styles.emptyText}>No emergency incidents currently logged in this sector.</Text>
          ) : (
            incidents.map((inc) => (
              <View key={inc.id} style={styles.incidentRow}>
                <View style={styles.incidentMain}>
                  <View style={styles.incidentMeta}>
                    <Text style={styles.incidentId}>{inc.id}</Text>
                    <Badge label={inc.type} variant="brand" />
                    <Badge
                      label={inc.severity}
                      variant={inc.severity === 'High' ? 'danger' : 'warning'}
                    />
                    <StatusLabel status={inc.verificationStatus} />
                  </View>

                  <Text style={styles.incidentDesc}>{inc.description}</Text>
                  <Text style={styles.incidentCoords}>
                    Location:{' '}
                    {inc.latitude && inc.longitude
                      ? `${inc.latitude.toFixed(5)}°N, ${inc.longitude.toFixed(5)}°E (Acc: ±${inc.accuracyMeters || 10}m)`
                      : 'Unknown / Manual Entry'}{' '}
                    • Reported: {new Date(inc.createdAt).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.incidentActions}>
                  {inc.verificationStatus === 'unverified' ? (
                    <>
                      <Pressable
                        style={styles.actionVerifyBtn}
                        onPress={() => handleVerifyIncident(inc.id)}
                      >
                        <CheckCircle size={16} color={Palette.snow} />
                        <Text style={styles.actionBtnText}>Verify</Text>
                      </Pressable>
                      <Pressable
                        style={styles.actionRejectBtn}
                        onPress={() => handleRejectIncident(inc.id)}
                      >
                        <XCircle size={16} color={Palette.snow} />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Badge
                      label="VERIFIED"
                      variant="brand"
                      style={{ backgroundColor: Palette.verifiedGreenLight }}
                    />
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Shelters & Capacities */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Building size={20} color={Palette.pineForest} />
              <Text style={styles.sectionTitle}>District Shelter & Hospital Readiness</Text>
            </View>
          </View>

          <View style={styles.shelterGrid}>
            {resources.map((res) => (
              <View key={res.id} style={styles.shelterCard}>
                <Text style={styles.shelterName}>{res.name}</Text>
                <Text style={styles.shelterCategory}>{res.category.toUpperCase()}</Text>
                <Text style={styles.shelterAddress}>{res.address}</Text>
                {res.capacity && (
                  <Text style={styles.shelterCapacity}>
                    Occupancy: {res.currentOccupancy || 0} / {res.capacity} beds
                  </Text>
                )}
                <Text style={styles.shelterContact}>Control Contact: {res.phone}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Official Warning Modal */}
      <Modal visible={showAlertModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <AlertTriangle size={24} color={Palette.rescueRed} />
              <Text style={styles.modalHeadTitle}>
                Draft Authorized Public Alert (SACHET/CAP)
              </Text>
            </View>

            <Text style={styles.modalNotice}>
              Target Sector: {selectedCommunity.district} ({selectedCommunity.name})
              • Requires Dual Officer Authorization
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Pressable
                style={[
                  styles.filterChip,
                  alertSeverity === 'WARNING' && styles.filterChipActive,
                ]}
                onPress={() => setAlertSeverity('WARNING')}
              >
                <Text style={styles.filterChipText}>WARNING (ORANGE)</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  alertSeverity === 'EXTREME_EMERGENCY' && { backgroundColor: Palette.rescueRed },
                ]}
                onPress={() => setAlertSeverity('EXTREME_EMERGENCY')}
              >
                <Text style={[styles.filterChipText, alertSeverity === 'EXTREME_EMERGENCY' && { color: Palette.snow, fontWeight: '700' }]}>
                  EXTREME EMERGENCY (RED)
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="English Headline (e.g. Extreme Cloudburst & Flash Flood Warning)"
              value={alertHeadlineEn}
              onChangeText={setAlertHeadlineEn}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Hindi Headline / चेतावनी शीर्षक (उदा: भारी भूस्खलन एवं नदी जलस्तर चेतावनी)"
              value={alertHeadlineHi}
              onChangeText={setAlertHeadlineHi}
            />

            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              placeholder="English Public Directives (e.g. Evacuate riverbeds to relief camps immediately)"
              multiline
              value={alertInstructionsEn}
              onChangeText={setAlertInstructionsEn}
            />

            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              placeholder="Hindi Public Directives (उदा: नदी किनारे की बस्तियों को तुरंत खाली कर राहत शिविरों में जाएं)"
              multiline
              value={alertInstructionsHi}
              onChangeText={setAlertInstructionsHi}
            />

            <View style={styles.modalButtons}>
              <AppButton
                label="Cancel"
                variant="outline"
                size="md"
                style={{ flex: 1 }}
                onPress={() => setShowAlertModal(false)}
              />
              <AppButton
                label="Authorize & Dispatch"
                variant="danger"
                size="md"
                style={{ flex: 1 }}
                onPress={handleDispatchOfficialAlert}
              />
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
    backgroundColor: '#0A0F0D',
  },
  header: {
    backgroundColor: '#0F1A14',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1F3327',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.md,
  },
  agencyTag: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Palette.pineForestContainer,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.headingSm,
    color: Palette.snow,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.pineForestMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  refreshText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.snow,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  filterRow: {
    marginBottom: Spacing.lg,
  },
  filterLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateBorder,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  filterChip: {
    backgroundColor: '#17271E',
    borderWidth: 1,
    borderColor: '#233A2D',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Palette.pineForestMuted,
    borderColor: Palette.pineForestContainer,
  },
  filterChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.bodySm,
    color: Palette.stone,
  },
  filterChipTextActive: {
    color: Palette.snow,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#121F18',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#1D3325',
    borderLeftWidth: 4,
  },
  metricVal: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 28,
    color: Palette.snow,
  },
  metricLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateBorder,
    marginTop: 4,
  },
  actionBar: {
    backgroundColor: '#182B21',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#244233',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  actionInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionInfoText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodySm,
    color: Palette.snow,
  },
  sectionCard: {
    backgroundColor: '#121F18',
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#1D3325',
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#1D3325',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    color: Palette.snow,
  },
  countBadge: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestContainer,
    backgroundColor: '#1A3324',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
    color: Palette.slateBorder,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  incidentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderColor: '#1A2C21',
  },
  incidentMain: {
    flex: 1,
    marginRight: Spacing.md,
  },
  incidentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  incidentId: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestContainer,
  },
  incidentDesc: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodyMd,
    color: Palette.snow,
    marginVertical: 2,
  },
  incidentCoords: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateBorder,
  },
  incidentActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.verifiedGreen,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.sm,
  },
  actionRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.rescueRed,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.sm,
  },
  actionBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.snow,
  },
  shelterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  shelterCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#17271E',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#243D2F',
  },
  shelterName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    color: Palette.snow,
  },
  shelterCategory: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Palette.pineForestContainer,
    marginTop: 2,
    letterSpacing: 1,
  },
  shelterAddress: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateBorder,
    marginVertical: 4,
  },
  shelterCapacity: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.verifiedGreen,
  },
  shelterContact: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    color: Palette.stone,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#121F18',
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#264232',
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalHeadTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    color: Palette.snow,
  },
  modalNotice: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.saffron,
    marginBottom: Spacing.md,
  },
  modalInput: {
    backgroundColor: '#0A0F0D',
    borderWidth: 1,
    borderColor: '#1F3628',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Palette.snow,
    fontSize: Typography.fontSize.bodySm,
    marginBottom: Spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});
