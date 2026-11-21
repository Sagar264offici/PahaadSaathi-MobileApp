export type OutboxStatus =
  | 'pending'
  | 'processing'
  | 'synced'
  | 'failed'
  | 'needs_review';

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  status: OutboxStatus;
  retryCount: number;
  nextRetryAt?: string;
  idempotencyKey: string;
  lastError?: string;
}

export interface IncidentRecord {
  id: string;
  reporterId?: string;
  type: string;
  severity: 'Low' | 'Medium' | 'High';
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  locationTimestamp?: string;
  manualLocation?: string;
  description: string;
  mediaIds?: string[];
  createdAt: string;
  updatedAt: string;
  status:
    | 'reported'
    | 'under_review'
    | 'corroborated'
    | 'verified'
    | 'confirmed_closure'
    | 'resolved'
    | 'rejected';
  verificationStatus:
    | 'unverified'
    | 'community_corroborated'
    | 'authority_verified'
    | 'disputed';
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface EmergencyContactRecord {
  contactId: string;
  authorityName: string;
  phoneNumber: string;
  regionId: string;
  category: 'police' | 'medical' | 'disaster' | 'highway' | 'helpline';
  verifiedBy: string;
  verifiedAt: string;
  validUntil: string;
  directoryVersion: number;
  signature: string;
}

export interface CommunityRecord {
  id: string;
  name: string;
  district: string;
  tehsil?: string;
  block?: string;
  gramPanchayat?: string;
  description: string;
  emergencyHotline?: string;
  activeHazardsCount: number;
  lastUpdated: string;
}
