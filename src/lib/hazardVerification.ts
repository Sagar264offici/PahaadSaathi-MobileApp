/**
 * PAHAADSAATHI — NVIDIA AI Hazard Image Verification Service
 *
 * Implements automated image-evidence analysis using the NVIDIA PaliGemma
 * Vision-Language API (https://ai.api.nvidia.com/v1/vlm/google/paligemma).
 *
 * Follows the Master Engineering Implementation specification:
 * - Secure backend/service-level execution
 * - Idempotency protection against duplicate calls
 * - Resilient error handling (401, 403, 429, 500/503, timeouts)
 * - Strict evidence evaluation rules (Section 5)
 * - Non-destructive: AI never marks official clearance or deletes reports
 */

import { supabase } from '@/lib/supabase';
import {
  AiVerificationResult,
  AiVerificationStatus,
  AiVerificationVerdict,
  ImageQuality,
  VerifyHazardImageRequest,
  VerifyHazardImageResponse,
} from '@/types/hazardVerification';

export const NVIDIA_PALIGEMMA_ENDPOINT =
  'https://ai.api.nvidia.com/v1/vlm/google/paligemma';

export const MODEL_IDENTIFIER = 'google/paligemma';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB safety limit

// In-memory cache to enforce strict idempotency and prevent duplicate API hits
const verificationCache = new Map<string, AiVerificationResult>();

// ── Hazard Keyword Dictionaries for Visual Evidence Mapping ──────────────────
const HAZARD_KEYWORDS: Record<string, string[]> = {
  Landslide: [
    'landslide',
    'rockfall',
    'rock',
    'rocks',
    'boulder',
    'boulders',
    'soil',
    'debris',
    'mud',
    'mudslide',
    'earthquake',
    'rubble',
    'gravel',
    'scree',
    'cliff collapse',
  ],
  'Road Damage': [
    'crack',
    'cracks',
    'pothole',
    'potholes',
    'caved',
    'subsidence',
    'collapse',
    'damaged road',
    'broken asphalt',
    'broken tarmac',
    'fissure',
    'erosion',
  ],
  'Fallen Trees': [
    'tree',
    'trees',
    'trunk',
    'branch',
    'branches',
    'pine',
    'log',
    'fallen tree',
    'timber',
    'foliage',
    'power line',
  ],
  Waterlogging: [
    'water',
    'flood',
    'flooding',
    'submerged',
    'puddle',
    'stream',
    'inundated',
    'standing water',
  ],
  'Flash Flood': [
    'flash flood',
    'torrent',
    'overflowing',
    'rushing water',
    'river',
    'muddy water',
    'washed out',
  ],
  'Forest Fire': [
    'fire',
    'smoke',
    'flame',
    'flames',
    'blaze',
    'wildfire',
    'burned',
    'charred',
  ],
  Accident: [
    'accident',
    'crash',
    'collision',
    'overturned',
    'damaged vehicle',
    'wreckage',
    'smashed',
  ],
};

const CONTRADICTION_INDICATORS = [
  'clear road',
  'empty road with no obstacles',
  'smooth pavement',
  'clean asphalt',
  'indoor',
  'room',
  'door',
  'wall',
  'digital graphic',
  'screenshot',
  'selfie',
  'logo',
  'sign with number',
  'white arrow on blue',
];

function hasWordMatch(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
}

/**
 * Core Evidence Evaluation Engine.
 * Implements Section 5 classification rules comparing PaliGemma's factual
 * visual caption against the reported category and description.
 */
export function evaluateVisualEvidence(params: {
  reportedHazard: string;
  description: string;
  caption: string;
  rawConfidence?: number;
}): AiVerificationResult {
  const { reportedHazard, description, caption } = params;
  const lowerCaption = (caption || '').toLowerCase().trim();
  const lowerDesc = (description || '').toLowerCase().trim();
  const targetCategory = reportedHazard || 'Landslide';
  const expectedTerms = HAZARD_KEYWORDS[targetCategory] || HAZARD_KEYWORDS.Landslide;

  const visualEvidence: string[] = [];
  const contradictions: string[] = [];

  // Check 1: Image Quality / Clarity Check
  let imageQuality: ImageQuality = 'good';
  if (
    !lowerCaption ||
    lowerCaption.includes('unanswerable') ||
    lowerCaption.includes('blurry') ||
    lowerCaption.includes('too dark') ||
    lowerCaption.includes('unclear') ||
    lowerCaption.length < 5
  ) {
    imageQuality = 'unclear';
  }

  // Check 2: Identify visual evidence supporting the hazard using whole word boundaries
  let hazardDetectedInPhoto = false;
  let detectedHazardName = 'none';

  for (const [category, terms] of Object.entries(HAZARD_KEYWORDS)) {
    const matchedTerms = terms.filter((term) => hasWordMatch(lowerCaption, term));
    if (matchedTerms.length > 0) {
      hazardDetectedInPhoto = true;
      detectedHazardName = category.toLowerCase();
      visualEvidence.push(
        `Visible ${category.toLowerCase()} indicators: ${matchedTerms.slice(0, 3).join(', ')}`
      );
      break;
    }
  }

  // Extract road context
  if (
    hasWordMatch(lowerCaption, 'road') ||
    hasWordMatch(lowerCaption, 'highway') ||
    hasWordMatch(lowerCaption, 'path') ||
    hasWordMatch(lowerCaption, 'street') ||
    hasWordMatch(lowerCaption, 'track')
  ) {
    visualEvidence.push('Roadway or transport corridor is visible in photograph');
  }

  // Check 3: Check for contradictions
  for (const indicator of CONTRADICTION_INDICATORS) {
    if (hasWordMatch(lowerCaption, indicator) || lowerCaption.includes(indicator)) {
      contradictions.push(`Photograph shows unrelated scenery/element: "${indicator}"`);
    }
  }

  // Check 4: Cross-category mismatch (e.g. reported Flood, but caption clearly shows Landslide)
  if (
    hazardDetectedInPhoto &&
    detectedHazardName !== 'none' &&
    detectedHazardName !== targetCategory.toLowerCase() &&
    !detectedHazardName.includes(targetCategory.toLowerCase())
  ) {
    contradictions.push(
      `Reported as ${targetCategory}, but visual evidence indicates ${detectedHazardName}`
    );
  }

  // Check 5: Determine Verdict based on strict Section 5 rules
  let verdict: 'CONSISTENT' | 'PARTIALLY_CONSISTENT' | 'INCONSISTENT' | 'INSUFFICIENT_EVIDENCE';
  let descriptionMatch = false;
  let explanation = '';
  let humanReviewRecommended = true;

  if (imageQuality === 'unclear') {
    verdict = 'INSUFFICIENT_EVIDENCE';
    descriptionMatch = false;
    explanation =
      'The uploaded photograph is too unclear, dark, blurry, or low-resolution to make a definitive visual comparison.';
    humanReviewRecommended = true;
  } else if (contradictions.length > 0 && !hazardDetectedInPhoto) {
    verdict = 'INCONSISTENT';
    descriptionMatch = false;
    explanation = `The photograph does not visually support the reported ${targetCategory}. It appears to show: "${caption}".`;
    humanReviewRecommended = true;
  } else if (
    hazardDetectedInPhoto &&
    detectedHazardName === targetCategory.toLowerCase()
  ) {
    // Check if the user description is fully or partially matched
    const descClaims = lowerDesc.split(/[.,;\n]/).filter((c) => c.trim().length > 3);
    const mentionsBlocked =
      lowerDesc.includes('block') ||
      lowerDesc.includes('close') ||
      lowerDesc.includes('cannot pass') ||
      lowerDesc.includes('massive');

    const photoShowsBlockage =
      lowerCaption.includes('block') ||
      lowerCaption.includes('cover') ||
      lowerCaption.includes('across') ||
      lowerCaption.includes('debris');

    if (mentionsBlocked && !photoShowsBlockage) {
      verdict = 'PARTIALLY_CONSISTENT';
      descriptionMatch = true;
      explanation = `Photograph shows visible signs of ${targetCategory}, but claims of complete road closure cannot be confirmed from the visible angle alone.`;
      humanReviewRecommended = true;
    } else {
      verdict = 'CONSISTENT';
      descriptionMatch = true;
      explanation = `Photograph visibly depicts ${targetCategory.toLowerCase()} evidence consistent with the submitted report.`;
      humanReviewRecommended = false;
    }
  } else if (hazardDetectedInPhoto) {
    verdict = 'INCONSISTENT';
    descriptionMatch = false;
    explanation = `The photograph shows visual evidence of ${detectedHazardName}, which contradicts the reported category (${targetCategory}).`;
    humanReviewRecommended = true;
  } else {
    // Neither explicit hazard nor explicit contradiction detected (e.g. generic mountain road)
    verdict = 'INSUFFICIENT_EVIDENCE';
    descriptionMatch = false;
    explanation = `Photograph shows: "${caption}". No definitive ${targetCategory.toLowerCase()} debris or obstruction is clearly visible.`;
    humanReviewRecommended = true;
  }

  return {
    hazard_visible: hazardDetectedInPhoto,
    detected_hazard: detectedHazardName,
    reported_hazard: targetCategory,
    verdict,
    description_match: descriptionMatch,
    visual_evidence:
      visualEvidence.length > 0
        ? visualEvidence
        : ['Visual elements observed: ' + (caption || 'None discernible')],
    contradictions,
    image_quality: imageQuality,
    possible_image_reuse: 'not_determined',
    manipulation_indicators: 'not_determined',
    explanation,
    human_review_recommended: humanReviewRecommended,
    raw_caption: caption,
    model: MODEL_IDENTIFIER,
    verified_at: new Date().toISOString(),
  };
}

/**
 * Converts an image URL or local URI into a base64 Data URL suitable
 * for NVIDIA PaliGemma Vision API transmission (< 250 KB recommended).
 */
export async function prepareImageForNvidia(photoUrl: string): Promise<string> {
  if (!photoUrl) throw new Error('Missing photo URL');

  // Handle direct data URLs
  if (photoUrl.startsWith('data:image/')) {
    return photoUrl;
  }

  // Fetch remote image bytes
  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download hazard photo (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Image exceeds 4MB size threshold. Compress before sending.');
  }

  // Determine MIME type
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const mimeType = contentType.includes('png')
    ? 'image/png'
    : contentType.includes('webp')
    ? 'image/webp'
    : 'image/jpeg';

  // In Node / React Native environment, convert ArrayBuffer to Base64
  let base64 = '';
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  if (g.Buffer) {
    base64 = g.Buffer.from(arrayBuffer).toString('base64');
  } else {
    // Browser / Edge Worker environment
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }

  return `data:${mimeType};base64,${base64}`;
}

/**
 * Invokes the NVIDIA PaliGemma VLM endpoint directly using the backend API key.
 * Strictly adheres to PaliGemma's documented message schema.
 */
export async function queryNvidiaPaliGemma(params: {
  imageBase64: string;
  promptText?: string;
  apiKey?: string;
}): Promise<string> {
  const apiKey =
    params.apiKey ||
    (typeof process !== 'undefined' ? process.env?.NVIDIA_API_KEY : undefined);

  if (!apiKey) {
    const error: any = new Error('NVIDIA_API_KEY is not configured on backend');
    error.status = 401;
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  const promptText = params.promptText || 'caption en';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(NVIDIA_PALIGEMMA_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: params.imageBase64 },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      const err: any = new Error('NVIDIA API authentication failed: Invalid API Key or access forbidden');
      err.status = response.status;
      err.code = 'INVALID_API_KEY';
      throw err;
    }

    if (response.status === 429) {
      const err: any = new Error('NVIDIA API quota / rate limit exceeded');
      err.status = 429;
      err.code = 'RATE_LIMIT_EXCEEDED';
      throw err;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const err: any = new Error(`NVIDIA API error (HTTP ${response.status}): ${errText}`);
      err.status = response.status;
      err.code = `HTTP_${response.status}`;
      throw err;
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || '';
    return caption;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr: any = new Error('NVIDIA PaliGemma request timed out');
      timeoutErr.status = 408;
      timeoutErr.code = 'REQUEST_TIMEOUT';
      throw timeoutErr;
    }
    throw err;
  }
}

/**
 * Primary Master Verification Function.
 * Orchestrates image retrieval, NVIDIA PaliGemma inference, rule evaluation,
 * and database persistence.
 */
export async function verifyHazardWithNvidia(
  request: VerifyHazardImageRequest & { apiKey?: string }
): Promise<VerifyHazardImageResponse> {
  const { hazard_id, photo_url, type = 'Landslide', description = '', force = false, apiKey } = request;

  // STEP 1: Idempotency Check
  if (!force && verificationCache.has(hazard_id)) {
    const cached = verificationCache.get(hazard_id)!;
    return {
      success: true,
      hazard_id,
      status: 'completed',
      verdict: cached.verdict.toLowerCase() as AiVerificationVerdict,
      result: cached,
    };
  }

  // If no photo is attached, return INSUFFICIENT_EVIDENCE safely
  if (!photo_url) {
    const noPhotoResult: AiVerificationResult = {
      hazard_visible: false,
      detected_hazard: 'none',
      reported_hazard: type,
      verdict: 'INSUFFICIENT_EVIDENCE',
      description_match: false,
      visual_evidence: ['No photograph attached to this incident report'],
      contradictions: [],
      image_quality: 'unclear',
      possible_image_reuse: 'not_determined',
      manipulation_indicators: 'not_determined',
      explanation: 'Verification requires an uploaded photograph.',
      human_review_recommended: true,
      model: MODEL_IDENTIFIER,
      verified_at: new Date().toISOString(),
    };

    await persistVerificationResult(hazard_id, 'completed', noPhotoResult).catch(() => {});
    return {
      success: true,
      hazard_id,
      status: 'completed',
      verdict: 'insufficient_evidence',
      result: noPhotoResult,
    };
  }

  const startTime = Date.now();

  try {
    // STEP 2: Image Retrieval & Formatting
    const imageBase64 = await prepareImageForNvidia(photo_url);

    // STEP 3: NVIDIA PaliGemma Analysis (Captioning & Hazard Check)
    const caption = await queryNvidiaPaliGemma({
      imageBase64,
      promptText: 'caption en',
      apiKey,
    });

    // STEP 4: Rule Evaluation
    const result = evaluateVisualEvidence({
      reportedHazard: type,
      description,
      caption,
    });
    result.execution_time_ms = Date.now() - startTime;

    // STEP 5: Persist Result in Database & Memory Cache
    verificationCache.set(hazard_id, result);
    await persistVerificationResult(hazard_id, 'completed', result).catch((err) => {
      console.warn('Database persistence notice (schema update recommended):', err.message);
    });

    return {
      success: true,
      hazard_id,
      status: 'completed',
      verdict: result.verdict.toLowerCase() as AiVerificationVerdict,
      result,
    };
  } catch (err: any) {
    const errorCode = err.code || `HTTP_${err.status || 500}`;
    console.warn(`NVIDIA AI verification notice for hazard ${hazard_id}:`, err.message);

    // Save failed status safely without corrupting the hazard record
    await persistVerificationResult(hazard_id, 'failed', null, errorCode).catch(() => {});

    return {
      success: false,
      hazard_id,
      status: 'failed',
      error_code: errorCode,
      message: err.message || 'Verification could not be completed.',
    };
  }
}

/**
 * Safely persists AI verification results into Supabase `hazards` table.
 * Designed with additive resilience so that missing columns never crash the application.
 */
async function persistVerificationResult(
  hazardId: string,
  status: AiVerificationStatus,
  result: AiVerificationResult | null,
  errorCode?: string
): Promise<void> {
  const payload: Record<string, any> = {
    ai_verification_status: status,
    ai_verified_at: new Date().toISOString(),
    ai_verification_model: MODEL_IDENTIFIER,
    ai_verification_error_code: errorCode || null,
  };

  if (result) {
    payload.ai_verification_verdict = result.verdict.toLowerCase();
    payload.ai_verification_result = result;
  }

  try {
    const { error } = await supabase
      .from('hazards')
      .update(payload)
      .eq('id', hazardId);

    if (error) {
      // If column does not exist in schema cache yet, log gracefully
      if (error.code === '42703' || error.message?.includes('ai_verification')) {
        console.info('ai_verification columns pending migration run in Supabase SQL editor.');
      } else {
        throw error;
      }
    }
  } catch (err: any) {
    // Non-blocking: preserving reporting integrity
    console.info('AI verification local cache active. Database notice:', err?.message);
  }
}

/**
 * UI State and Color Mapping Helpers
 */
export function getVerdictConfig(verdict?: string | null) {
  switch ((verdict || '').toUpperCase()) {
    case 'CONSISTENT':
      return {
        label: 'CONSISTENT',
        title: 'Photograph Visually Supports Hazard',
        subtitle: 'Visual evidence aligns with reported claims.',
        badgeBg: '#DCFCE7',
        badgeBorder: '#86EFAC',
        textColor: '#15803D',
        icon: '✓',
      };
    case 'PARTIALLY_CONSISTENT':
      return {
        label: 'PARTIALLY CONSISTENT',
        title: 'Partial Visual Evidence Detected',
        subtitle: 'Some claims are visible; full blockage unconfirmed.',
        badgeBg: '#FEF3C7',
        badgeBorder: '#FCD34D',
        textColor: '#B45309',
        icon: '⚠️',
      };
    case 'INCONSISTENT':
      return {
        label: 'INCONSISTENT',
        title: 'Visual Evidence Mismatch Detected',
        subtitle: 'The photograph does not appear to match the submitted description.',
        badgeBg: '#FEE2E2',
        badgeBorder: '#FCA5A5',
        textColor: '#B91C1C',
        icon: '✕',
      };
    case 'INSUFFICIENT_EVIDENCE':
    default:
      return {
        label: 'INSUFFICIENT EVIDENCE',
        title: 'Insufficient Visual Evidence',
        subtitle: 'The photograph is unclear or lacks definitive hazard indicators.',
        badgeBg: '#F3F4F6',
        badgeBorder: '#E5E7EB',
        textColor: '#4B5563',
        icon: 'ℹ',
      };
  }
}
