import { countGsm7Septets, GsmAnalysis, sanitizeGsmInput } from './gsm7';

export interface EmergencyMessageParams {
  incidentId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  timestamp?: string; // Formatted date string
  senderName?: string;
  senderPhone?: string;
  details?: string;
}

export interface FormattedSmsResult {
  body: string;
  analysis: GsmAnalysis;
}

/**
 * Builds the canonical PahaadSaathi Emergency SMS message.
 * Strict GSM-7 compliance and 306 septet (2 segment) budget limit.
 */
export function buildEmergencySmsMessage(params: EmergencyMessageParams): FormattedSmsResult {
  const shortId = params.incidentId.startsWith('PS-')
    ? params.incidentId
    : `PS-${params.incidentId.substring(0, 6).toUpperCase()}`;

  const cleanType = sanitizeGsmInput(params.type.toUpperCase());
  const cleanSev = params.severity.toUpperCase();

  let locStr = 'LOC: UNKNOWN';
  let mapUrl = '';

  if (
    params.latitude !== undefined &&
    params.latitude !== null &&
    params.longitude !== undefined &&
    params.longitude !== null
  ) {
    const lat = params.latitude.toFixed(5);
    const lng = params.longitude.toFixed(5);
    const acc =
      params.accuracyMeters !== undefined && params.accuracyMeters !== null
        ? ` ACC: ${Math.round(params.accuracyMeters)}M`
        : '';
    locStr = `LOC: ${lat},${lng}${acc}`;
    mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
  }

  const timeStr = params.timestamp || new Date().toISOString().substring(0, 16).replace('T', ' ');

  const lines: string[] = [
    'PAHAADSAATHI SOS',
    `ID: ${shortId}`,
    `TYPE: ${cleanType}`,
    `SEV: ${cleanSev}`,
    locStr,
    `TIME: ${timeStr}`,
  ];

  if (params.senderName) {
    const cleanName = sanitizeGsmInput(params.senderName).substring(0, 24);
    lines.push(`NAME: ${cleanName}`);
  }

  if (params.senderPhone) {
    const cleanPhone = sanitizeGsmInput(params.senderPhone);
    lines.push(`PH: ${cleanPhone}`);
  }

  if (mapUrl) {
    lines.push(`MAP: ${mapUrl}`);
  }

  if (params.details) {
    const cleanDetails = sanitizeGsmInput(params.details).substring(0, 48);
    lines.push(`INFO: ${cleanDetails}`);
  }

  let body = lines.join('\n');
  let analysis = countGsm7Septets(body);

  // If payload exceeds 306 septets, trim optional INFO first
  if (analysis.septets > 306 && params.details) {
    const linesWithoutDetails = lines.filter((l) => !l.startsWith('INFO: '));
    body = linesWithoutDetails.join('\n');
    analysis = countGsm7Septets(body);
  }

  return { body, analysis };
}
