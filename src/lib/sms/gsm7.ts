/**
 * GSM 03.38 Character Set & Septet Counter
 * Ensures all SMS messages adhere strictly to 306 septet limit (2 concatenated segments)
 */

// GSM 7-bit standard character set (128 characters)
const GSM_7_BASIC = new Set([
  '@', '£', '$', '¥', 'è', 'é', 'ù', 'ì', 'ò', 'Ç', '\n', 'Ø', 'ø', '\r', 'Å', 'å',
  'Δ', '_', 'Φ', 'Γ', 'Λ', 'Ω', 'Π', 'Ψ', 'Σ', 'Θ', 'Ξ', ' ', 'Æ', 'æ', 'ß', 'É',
  ' ', '!', '"', '#', '¤', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?',
  '¡', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Ä', 'Ö', 'Ñ', 'Ü', '§',
  '¿', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ä', 'ö', 'ñ', 'ü', 'à',
]);

// GSM 7-bit extension characters (cost 2 septets: ESC + char)
const GSM_7_EXTENDED = new Set([
  '\f', '^', '{', '}', '\\', '[', '~', ']', '|', '€',
]);

export const GSM_SINGLE_SEGMENT_LIMIT = 160;
export const GSM_CONCATENATED_SEGMENT_LIMIT = 153;
export const GSM_MAX_ALLOWED_SEPTETS = 306; // Maximum 2 concatenated segments

export interface GsmAnalysis {
  septets: number;
  isGsm7: boolean;
  segments: number;
  remainingSeptets: number;
  fitsInMaxSegments: boolean;
}

/**
 * Counts septets according to GSM 03.38 standard.
 * If text contains characters outside GSM 7-bit, isGsm7 will be false.
 */
export function countGsm7Septets(text: string): GsmAnalysis {
  let septets = 0;
  let isGsm7 = true;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (GSM_7_BASIC.has(char)) {
      septets += 1;
    } else if (GSM_7_EXTENDED.has(char)) {
      septets += 2;
    } else {
      isGsm7 = false;
      // UCS-2 encoding fallback costs 2 octets (16 bits) per character
      septets += 2;
    }
  }

  let segments = 1;
  let remainingSeptets = 0;

  if (isGsm7) {
    if (septets <= GSM_SINGLE_SEGMENT_LIMIT) {
      segments = 1;
      remainingSeptets = GSM_SINGLE_SEGMENT_LIMIT - septets;
    } else {
      segments = Math.ceil(septets / GSM_CONCATENATED_SEGMENT_LIMIT);
      remainingSeptets = segments * GSM_CONCATENATED_SEGMENT_LIMIT - septets;
    }
  } else {
    // UCS-2 limits: 70 chars for single segment, 67 for concatenated
    const ucs2Chars = text.length;
    if (ucs2Chars <= 70) {
      segments = 1;
      remainingSeptets = 70 - ucs2Chars;
    } else {
      segments = Math.ceil(ucs2Chars / 67);
      remainingSeptets = segments * 67 - ucs2Chars;
    }
  }

  return {
    septets,
    isGsm7,
    segments,
    remainingSeptets,
    fitsInMaxSegments: septets <= GSM_MAX_ALLOWED_SEPTETS && segments <= 2,
  };
}

/**
 * Sanitizes input text to prevent CRLF injection and replaces non-GSM characters
 * with GSM equivalents where possible.
 */
export function sanitizeGsmInput(input: string): string {
  return input
    .replace(/[\r\n]+/g, ' ') // Collapse internal newlines to spaces
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/[•]/g, '*')
    .trim();
}
