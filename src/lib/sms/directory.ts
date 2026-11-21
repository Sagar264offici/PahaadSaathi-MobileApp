export interface EmergencyAuthorityContact {
  contactId: string;
  authorityName: string;
  phoneNumber: string;
  regionId: string;
  category: 'police' | 'medical' | 'disaster' | 'highway';
  description: string;
  isNationalEmergency: boolean;
  priority: number;
}

export const UTTARAKHAND_EMERGENCY_DIRECTORY: EmergencyAuthorityContact[] = [
  {
    contactId: 'auth_112',
    authorityName: 'National Emergency Service (112)',
    phoneNumber: '112',
    regionId: 'IN_ALL',
    category: 'police',
    description: 'Unified 24x7 Police, Fire & Medical dispatch',
    isNationalEmergency: true,
    priority: 1,
  },
  {
    contactId: 'auth_108',
    authorityName: 'Uttarakhand Emergency Ambulance (108)',
    phoneNumber: '108',
    regionId: 'IN_UK',
    category: 'medical',
    description: 'Free emergency medical transport & trauma rescue',
    isNationalEmergency: true,
    priority: 2,
  },
  {
    contactId: 'auth_sdrf_uk',
    authorityName: 'State Disaster Response Force (SDRF UK)',
    phoneNumber: '+919411112973',
    regionId: 'IN_UK',
    category: 'disaster',
    description: 'Himalayan mountain rescue, landslide & flood extrication',
    isNationalEmergency: false,
    priority: 3,
  },
  {
    contactId: 'auth_1078',
    authorityName: 'National Disaster Response Force (NDRF)',
    phoneNumber: '1078',
    regionId: 'IN_ALL',
    category: 'disaster',
    description: 'Disaster management crisis control room',
    isNationalEmergency: true,
    priority: 4,
  },
  {
    contactId: 'auth_1033',
    authorityName: 'NHAI Highway Emergency Patrol (1033)',
    phoneNumber: '1033',
    regionId: 'IN_ALL',
    category: 'highway',
    description: 'Chardham Yatra & National Highway road clearance',
    isNationalEmergency: true,
    priority: 5,
  },
];

/**
 * Normalizes Indian mobile numbers:
 * Converts 10-digit mobile numbers to E.164 (+91XXXXXXXXXX).
 * Preserves emergency short codes (112, 108, 1078, 1033).
 */
export function normalizeIndianPhoneNumber(rawNumber: string): string {
  const cleaned = rawNumber.replace(/[\s\-\(\)]/g, '');

  // Keep emergency short codes intact
  if (/^(112|108|1078|1033|1070|1926)$/.test(cleaned)) {
    return cleaned;
  }

  // Already with +91
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // With leading 0 (e.g. 09411112973)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.substring(1)}`;
  }

  // 10 digits starting with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // If already prefixed with 91 but no plus
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Validates whether a number is a valid emergency recipient.
 */
export function isValidEmergencyRecipient(phoneNumber: string): boolean {
  const normalized = normalizeIndianPhoneNumber(phoneNumber);
  if (/^(112|108|1078|1033|1070|1926)$/.test(normalized)) {
    return true;
  }
  return /^\+91[6-9]\d{9}$/.test(normalized);
}
