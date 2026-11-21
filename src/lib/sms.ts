/**
 * PahaadSaathi SMS Fallback
 *
 * When mobile internet is unavailable but cellular SMS works, moderators can
 * send a structured text to the designated gateway number:
 *
 *   PS | REPORT | <TYPE> | <LOCATION> | <DESCRIPTION>
 *
 * Example:
 *   PS | REPORT | Landslide | Rudraprayag bypass, NH-07 | Road blocked by debris
 */

export type SmsFallbackMessage = {
  type: string;
  location: string;
  description: string;
};

export const SMS_GATEWAY_NUMBER = '+918755903705';

export const SMS_PREFIX = 'PS';
export const SMS_COMMAND = 'REPORT';

/**
 * Build the structured SMS body for fallback reporting.
 */
export function buildSmsBody(message: SmsFallbackMessage): string {
  return `${SMS_PREFIX} | ${SMS_COMMAND} | ${message.type} | ${message.location} | ${message.description}`;
}

/**
 * Parse an inbound SMS fallback message (for gateway webhook reference).
 * Returns null if the format is invalid.
 */
export function parseSmsBody(body: string): SmsFallbackMessage | null {
  const parts = body.split('|').map((p) => p.trim());
  if (parts.length < 5) return null;
  if (parts[0] !== SMS_PREFIX || parts[1] !== SMS_COMMAND) return null;
  return {
    type: parts[2],
    location: parts[3],
    description: parts[4],
  };
}

/**
 * Check if the SMS body matches the PahaadSaathi fallback format.
 */
export function isSmsFallbackFormat(body: string): boolean {
  return parseSmsBody(body) !== null;
}
