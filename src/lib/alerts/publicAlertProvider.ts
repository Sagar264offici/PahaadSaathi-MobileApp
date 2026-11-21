export type AlertSeverityLevel = 'ADVISORY' | 'WATCH' | 'WARNING' | 'EXTREME_EMERGENCY';

export interface PublicAlertDraft {
  id: string;
  senderAgency: string;
  senderOfficerName: string;
  targetRegion: string;
  targetDistrict: string;
  category: 'meteorological' | 'geophysical' | 'infrastructure' | 'rescue';
  headlineEn: string;
  headlineHi: string;
  instructionsEn: string;
  instructionsHi: string;
  severity: AlertSeverityLevel;
  effectiveUntil: string;
  approvalsRequired: number;
  approvedBy: string[];
  status: 'draft' | 'pending_approval' | 'authorized' | 'dispatched' | 'cancelled';
  createdAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DispatchResult {
  dispatchId: string;
  status: 'DISPATCH_ACCEPTED' | 'DISPATCH_QUEUED' | 'REJECTED';
  providerName: string;
  timestamp: string;
  targetAudienceEstimate?: number;
}

export interface DispatchStatus {
  dispatchId: string;
  state: 'DELIVERING' | 'BROADCAST_ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'REVOKED';
  deliveredChannels: string[];
  auditTimestamp: string;
}

export interface PublicAlertProvider {
  validateAlert(alert: PublicAlertDraft): Promise<ValidationResult>;
  submitAlert(alert: PublicAlertDraft, approverSignature: string): Promise<DispatchResult>;
  getStatus(dispatchId: string): Promise<DispatchStatus>;
}

/**
 * Sandbox Government Alert Provider (CAP / SACHET compliant workflow)
 * Simulates government-wide cell broadcast and official SMS gateway integration
 * with strict multi-officer approval verification.
 */
export class SandboxPublicAlertProvider implements PublicAlertProvider {
  private dispatches = new Map<string, DispatchStatus>();

  async validateAlert(alert: PublicAlertDraft): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!alert.headlineEn.trim() || !alert.headlineHi.trim()) {
      errors.push('Bilingual headlines (English & Hindi) are mandatory for government alerts.');
    }

    if (!alert.instructionsEn.trim() || !alert.instructionsHi.trim()) {
      errors.push('Public instructions in both English and Hindi are required.');
    }

    if (!alert.targetDistrict.trim()) {
      errors.push('Geographical targeting (District) must be specified.');
    }

    if (new Date(alert.effectiveUntil).getTime() <= Date.now()) {
      errors.push('Expiry time must be in the future.');
    }

    if (alert.severity === 'EXTREME_EMERGENCY' && alert.approvalsRequired < 2) {
      warnings.push('Extreme emergency warnings recommend at least 2 authorized officer sign-offs.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async submitAlert(
    alert: PublicAlertDraft,
    approverSignature: string
  ): Promise<DispatchResult> {
    const validation = await this.validateAlert(alert);
    if (!validation.isValid) {
      throw new Error(`Alert validation failed: ${validation.errors.join(', ')}`);
    }

    if (alert.approvedBy.length < alert.approvalsRequired) {
      throw new Error(
        `Insufficient approvals: ${alert.approvedBy.length}/${alert.approvalsRequired} signatures recorded.`
      );
    }

    const dispatchId = `DISPATCH_SANDBOX_${Date.now()}`;
    this.dispatches.set(dispatchId, {
      dispatchId,
      state: 'BROADCAST_ACTIVE',
      deliveredChannels: ['SANDBOX_CELL_BROADCAST', 'SANDBOX_DISASTER_SMS', 'CAP_FEED'],
      auditTimestamp: new Date().toISOString(),
    });

    return {
      dispatchId,
      status: 'DISPATCH_ACCEPTED',
      providerName: 'Sandbox-CAP-SACHET-Adapter',
      timestamp: new Date().toISOString(),
      targetAudienceEstimate: 45000,
    };
  }

  async getStatus(dispatchId: string): Promise<DispatchStatus> {
    const status = this.dispatches.get(dispatchId);
    if (!status) {
      return {
        dispatchId,
        state: 'REVOKED',
        deliveredChannels: [],
        auditTimestamp: new Date().toISOString(),
      };
    }
    return status;
  }
}

export const sandboxPublicAlertProvider = new SandboxPublicAlertProvider();
