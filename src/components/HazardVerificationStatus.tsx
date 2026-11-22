/**
 * PAHAADSAATHI — AI Image Verification Status Component
 *
 * Displays NVIDIA PaliGemma Vision AI analysis for hazard photographs.
 * Implements the 7 UI states specified in Section 9 of the engineering prompt.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  CheckCircle2,
  FileText,
} from 'lucide-react-native';

import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/hooks/useTheme';
import {
  AiVerificationResult,
  AiVerificationStatus,
  AiVerificationVerdict,
  VerificationUiState,
} from '@/types/hazardVerification';
import { getVerdictConfig } from '@/lib/hazardVerification';

interface Props {
  status?: AiVerificationStatus | null;
  verdict?: AiVerificationVerdict | null;
  result?: AiVerificationResult | null;
  photoUrl?: string | null;
  isModerator?: boolean;
  onReverify?: () => Promise<void>;
  isVerifying?: boolean;
}

export function HazardVerificationStatus({
  status = 'pending',
  verdict,
  result,
  photoUrl,
  isModerator = false,
  onReverify,
  isVerifying = false,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme.name === 'dark';
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Determine current UI State (1 of 7 defined in specification)
  let uiState: VerificationUiState = 'pending';
  if (isVerifying || status === 'processing') {
    uiState = 'analyzing';
  } else if (status === 'failed') {
    uiState = 'failed';
  } else if (status === 'completed' || verdict || result) {
    const v = (verdict || result?.verdict || '').toLowerCase();
    if (v.includes('partially')) uiState = 'partially_consistent';
    else if (v.includes('inconsistent')) uiState = 'inconsistent';
    else if (v.includes('insufficient')) uiState = 'insufficient_evidence';
    else if (v.includes('consistent')) uiState = 'consistent';
    else uiState = 'insufficient_evidence';
  } else if (!photoUrl) {
    uiState = 'insufficient_evidence';
  }

  // Configuration map for the 7 UI states
  const stateConfigs: Record<
    VerificationUiState,
    {
      badgeLabel: string;
      heading: string;
      description: string;
      accentColor: string;
      badgeBg: string;
      badgeBorder: string;
      icon: any;
    }
  > = {
    pending: {
      badgeLabel: 'VERIFICATION PENDING',
      heading: 'Verification Pending',
      description: 'Your photograph is waiting for automated verification.',
      accentColor: '#9CA3AF',
      badgeBg: isDark ? '#1F2937' : '#F3F4F6',
      badgeBorder: isDark ? '#374151' : '#E5E7EB',
      icon: Clock,
    },
    analyzing: {
      badgeLabel: 'ANALYZING PHOTOGRAPH',
      heading: 'Analyzing Photograph',
      description: 'Checking whether the photograph matches the reported hazard.',
      accentColor: Palette.infoBlue,
      badgeBg: isDark ? '#1E293B' : '#EFF6FF',
      badgeBorder: isDark ? '#334155' : '#BFDBFE',
      icon: RefreshCw,
    },
    consistent: {
      badgeLabel: 'CONSISTENT WITH REPORT',
      heading: 'Visual Evidence Corroborated',
      description: 'Photograph visually supports the reported hazard.',
      accentColor: Palette.verifiedGreen,
      badgeBg: isDark ? '#142E1F' : '#DCFCE7',
      badgeBorder: isDark ? '#235937' : '#86EFAC',
      icon: ShieldCheck,
    },
    partially_consistent: {
      badgeLabel: 'PARTIALLY CONSISTENT',
      heading: 'Partial Details Corroborated',
      description: 'Some reported details are visible. Additional verification is needed.',
      accentColor: Palette.saffron,
      badgeBg: isDark ? '#362A14' : '#FEF3C7',
      badgeBorder: isDark ? '#5B4319' : '#FCD34D',
      icon: AlertTriangle,
    },
    inconsistent: {
      badgeLabel: 'POSSIBLE MISMATCH',
      heading: 'Visual Discrepancy Flagged',
      description:
        'The photograph does not appear to match the submitted description. Moderator review required.',
      accentColor: Palette.rescueRed,
      badgeBg: isDark ? '#381616' : '#FEE2E2',
      badgeBorder: isDark ? '#5B2222' : '#FCA5A5',
      icon: XCircle,
    },
    insufficient_evidence: {
      badgeLabel: 'INSUFFICIENT EVIDENCE',
      heading: 'Low Evidence Confidence',
      description: 'The photograph does not provide enough visual evidence.',
      accentColor: '#D97706',
      badgeBg: isDark ? '#2D2316' : '#FFFBEB',
      badgeBorder: isDark ? '#4A3B22' : '#FDE68A',
      icon: HelpCircle,
    },
    failed: {
      badgeLabel: 'VERIFICATION UNAVAILABLE',
      heading: 'Verification Temporarily Unavailable',
      description:
        'Automatic verification is temporarily unavailable. Your report has been saved safely.',
      accentColor: '#9CA3AF',
      badgeBg: isDark ? '#1F2937' : '#F3F4F6',
      badgeBorder: isDark ? '#374151' : '#E5E7EB',
      icon: AlertTriangle,
    },
  };

  const currentConfig = stateConfigs[uiState];
  const StateIcon = currentConfig.icon;
  const verdictDetails = getVerdictConfig(result?.verdict || verdict);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#12181F' : '#F8FAFC',
          borderColor: currentConfig.badgeBorder,
        },
      ]}
    >
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: currentConfig.badgeBg, borderColor: currentConfig.badgeBorder },
            ]}
          >
            {uiState === 'analyzing' ? (
              <ActivityIndicator size="small" color={currentConfig.accentColor} />
            ) : (
              <StateIcon size={16} color={currentConfig.accentColor} />
            )}
          </View>
          <View>
            <View style={styles.brandBadgeRow}>
              <Text style={styles.sectionOverline}>AI IMAGE VERIFICATION</Text>
              <View style={styles.nvidiaBadge}>
                <Sparkles size={10} color="#76B900" />
                <Text style={styles.nvidiaBadgeText}>NVIDIA PaliGemma</Text>
              </View>
            </View>
            <Text
              style={[
                styles.stateHeading,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              {currentConfig.heading}
            </Text>
          </View>
        </View>

        {/* Verdict Badge */}
        <View
          style={[
            styles.verdictBadge,
            { backgroundColor: currentConfig.badgeBg, borderColor: currentConfig.badgeBorder },
          ]}
        >
          <Text style={[styles.verdictBadgeText, { color: currentConfig.accentColor }]}>
            {currentConfig.badgeLabel}
          </Text>
        </View>
      </View>

      {/* Primary Description */}
      <Text
        style={[
          styles.stateDescription,
          { color: isDark ? Palette.stone : Palette.slate },
        ]}
      >
        {result?.explanation || currentConfig.description}
      </Text>

      {/* Comparison Grid (Reported vs Detected) */}
      {(result?.reported_hazard || result?.detected_hazard) && (
        <View
          style={[
            styles.comparisonGrid,
            {
              backgroundColor: isDark ? '#19222D' : '#FFFFFF',
              borderColor: isDark ? '#273544' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.comparisonCol}>
            <Text style={styles.comparisonLabel}>REPORTED HAZARD</Text>
            <Text
              style={[
                styles.comparisonValue,
                { color: isDark ? Palette.snow : Palette.pineForest },
              ]}
            >
              {result?.reported_hazard || '—'}
            </Text>
          </View>
          <View style={styles.comparisonDivider} />
          <View style={styles.comparisonCol}>
            <Text style={styles.comparisonLabel}>DETECTED BY AI</Text>
            <Text
              style={[
                styles.comparisonValue,
                {
                  color:
                    result?.detected_hazard && result.detected_hazard !== 'none'
                      ? Palette.verifiedGreen
                      : isDark
                      ? Palette.slateMuted
                      : Palette.slate,
                  textTransform: 'capitalize',
                },
              ]}
            >
              {result?.detected_hazard && result.detected_hazard !== 'none'
                ? result.detected_hazard
                : 'No clear debris'}
            </Text>
          </View>
        </View>
      )}

      {/* Visual Evidence List */}
      {result?.visual_evidence && result.visual_evidence.length > 0 && (
        <View style={styles.evidenceSection}>
          <Text style={styles.evidenceSectionTitle}>VISUAL EVIDENCE OBSERVED:</Text>
          {result.visual_evidence.map((evidence, idx) => (
            <View key={idx} style={styles.evidenceItemRow}>
              <CheckCircle2 size={13} color={Palette.verifiedGreen} style={styles.evidenceBullet} />
              <Text
                style={[
                  styles.evidenceText,
                  { color: isDark ? Palette.snow : Palette.pineForest },
                ]}
              >
                {evidence}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Contradictions List (if flagged) */}
      {result?.contradictions && result.contradictions.length > 0 && (
        <View
          style={[
            styles.contradictionBox,
            {
              backgroundColor: isDark ? '#321919' : '#FEF2F2',
              borderColor: isDark ? '#592929' : '#FECACA',
            },
          ]}
        >
          <Text style={styles.contradictionTitle}>POTENTIAL CONTRADICTIONS:</Text>
          {result.contradictions.map((c, idx) => (
            <View key={idx} style={styles.evidenceItemRow}>
              <AlertTriangle size={13} color={Palette.rescueRed} style={styles.evidenceBullet} />
              <Text style={styles.contradictionText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Human Review Advisory */}
      <View
        style={[
          styles.advisoryRow,
          {
            backgroundColor: isDark ? '#18222C' : '#F1F5F9',
            borderColor: isDark ? '#253545' : '#E2E8F0',
          },
        ]}
      >
        <Eye size={13} color={Palette.slateMuted} />
        <Text style={styles.advisoryText}>
          {result?.human_review_recommended
            ? '⚠️ Field verification or officer corroboration required before official road status changes.'
            : '✓ AI-screened. Eligible for highway control room confirmation.'}
        </Text>
      </View>

      {/* Moderator Action Bar (when active or reverifying) */}
      {isModerator && onReverify && (
        <View style={styles.moderatorBar}>
          <Pressable
            style={[styles.reverifyBtn, isVerifying && { opacity: 0.6 }]}
            onPress={onReverify}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <RefreshCw size={13} color="#FFFFFF" />
            )}
            <Text style={styles.reverifyBtnText}>
              {isVerifying ? 'Running PaliGemma Inference...' : 'Re-Analyze with NVIDIA AI'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Technical Audit Collapsible */}
      <Pressable
        style={styles.techToggle}
        onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
      >
        <Text style={styles.techToggleText}>
          {showTechnicalDetails ? 'Hide Model Audit Info' : 'View Model Audit Info'}
        </Text>
        {showTechnicalDetails ? (
          <ChevronUp size={12} color={Palette.slateMuted} />
        ) : (
          <ChevronDown size={12} color={Palette.slateMuted} />
        )}
      </Pressable>

      {showTechnicalDetails && (
        <View
          style={[
            styles.techBox,
            { backgroundColor: isDark ? '#0F141C' : '#F1F5F9' },
          ]}
        >
          <Text style={styles.techLine}>
            <Text style={{ fontWeight: '700' }}>Engine: </Text>
            NVIDIA VLM (google/paligemma)
          </Text>
          <Text style={styles.techLine}>
            <Text style={{ fontWeight: '700' }}>Status: </Text>
            {status} ({verdictDetails.label})
          </Text>
          <Text style={styles.techLine}>
            <Text style={{ fontWeight: '700' }}>Quality: </Text>
            {result?.image_quality || 'good'}
          </Text>
          {result?.verified_at && (
            <Text style={styles.techLine}>
              <Text style={{ fontWeight: '700' }}>Verified: </Text>
              {new Date(result.verified_at).toLocaleString()}
            </Text>
          )}
          {result?.raw_caption && (
            <Text style={styles.techLine}>
              <Text style={{ fontWeight: '700' }}>Raw Caption: </Text>
              "{result.raw_caption}"
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    flex: 1,
    marginRight: Spacing.xs,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sectionOverline: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: Palette.slateMuted,
  },
  nvidiaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(118, 185, 0, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radii.full,
  },
  nvidiaBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 8,
    color: '#76B900',
  },
  stateHeading: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodySm,
    lineHeight: 18,
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  verdictBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  stateDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  comparisonGrid: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  comparisonCol: {
    flex: 1,
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: Spacing.sm,
  },
  comparisonLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 8,
    letterSpacing: 0.5,
    color: Palette.slateMuted,
    marginBottom: 2,
  },
  comparisonValue: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
  },
  evidenceSection: {
    marginBottom: Spacing.xs,
  },
  evidenceSectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: Palette.slateMuted,
    marginBottom: 4,
  },
  evidenceItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 3,
  },
  evidenceBullet: {
    marginTop: 2,
  },
  evidenceText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  contradictionBox: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.xs,
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  contradictionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: Palette.rescueRed,
    marginBottom: 2,
  },
  contradictionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Palette.rescueRed,
    lineHeight: 16,
    flex: 1,
  },
  advisoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginTop: 4,
  },
  advisoryText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Palette.slateMuted,
    flex: 1,
    lineHeight: 14,
  },
  moderatorBar: {
    marginTop: Spacing.sm,
  },
  reverifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#76B900',
    paddingVertical: 7,
    borderRadius: Radii.md,
  },
  reverifyBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  techToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: Spacing.xs,
  },
  techToggleText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 9,
    color: Palette.slateMuted,
  },
  techBox: {
    borderRadius: Radii.sm,
    padding: Spacing.xs,
    marginTop: 4,
  },
  techLine: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 9,
    lineHeight: 14,
    color: Palette.slateMuted,
    marginBottom: 2,
  },
});
