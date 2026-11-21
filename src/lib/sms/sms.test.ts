import { describe, it } from 'node:test';
import assert from 'node:assert';
import { countGsm7Septets, sanitizeGsmInput, GSM_MAX_ALLOWED_SEPTETS } from './gsm7';
import { normalizeIndianPhoneNumber, isValidEmergencyRecipient } from './directory';
import { buildEmergencySmsMessage } from './format';

describe('Emergency SMS Subsystem Tests', () => {
  describe('GSM 03.38 Septet Counter', () => {
    it('should calculate standard GSM-7 basic characters as 1 septet each', () => {
      const basic = 'HELLO WORLD 12345';
      const analysis = countGsm7Septets(basic);
      assert.strictEqual(analysis.isGsm7, true);
      assert.strictEqual(analysis.septets, basic.length);
      assert.strictEqual(analysis.segments, 1);
      assert.strictEqual(analysis.fitsInMaxSegments, true);
    });

    it('should calculate GSM extension characters as 2 septets each', () => {
      const ext = '{|^}';
      const analysis = countGsm7Septets(ext);
      assert.strictEqual(analysis.isGsm7, true);
      assert.strictEqual(analysis.septets, 8); // 4 chars * 2 = 8 septets
    });

    it('should detect non-GSM characters and report isGsm7 false', () => {
      const devanagari = 'नमस्ते';
      const analysis = countGsm7Septets(devanagari);
      assert.strictEqual(analysis.isGsm7, false);
    });

    it('should enforce 306 septet budget cap (2 segments)', () => {
      const longMessage = 'A'.repeat(306);
      const analysis = countGsm7Septets(longMessage);
      assert.strictEqual(analysis.septets, 306);
      assert.strictEqual(analysis.segments, 2);
      assert.strictEqual(analysis.fitsInMaxSegments, true);

      const tooLongMessage = 'A'.repeat(307);
      const analysisOver = countGsm7Septets(tooLongMessage);
      assert.strictEqual(analysisOver.fitsInMaxSegments, false);
    });
  });

  describe('Indian Phone Number Normalization', () => {
    it('should preserve national emergency short codes untouched', () => {
      assert.strictEqual(normalizeIndianPhoneNumber('112'), '112');
      assert.strictEqual(normalizeIndianPhoneNumber('108'), '108');
      assert.strictEqual(normalizeIndianPhoneNumber('1078'), '1078');
      assert.strictEqual(normalizeIndianPhoneNumber('1033'), '1033');
      assert.strictEqual(isValidEmergencyRecipient('112'), true);
      assert.strictEqual(isValidEmergencyRecipient('108'), true);
    });

    it('should normalize 10-digit mobile numbers to E.164 +91 format', () => {
      assert.strictEqual(normalizeIndianPhoneNumber('9411112973'), '+919411112973');
      assert.strictEqual(normalizeIndianPhoneNumber('09411112973'), '+919411112973');
      assert.strictEqual(normalizeIndianPhoneNumber('+91 94111-12973'), '+919411112973');
      assert.strictEqual(isValidEmergencyRecipient('9411112973'), true);
    });

    it('should reject invalid numbers', () => {
      assert.strictEqual(isValidEmergencyRecipient('12345'), false);
      assert.strictEqual(isValidEmergencyRecipient('abcde'), false);
    });
  });

  describe('Canonical Emergency SMS Formatting', () => {
    it('should format message with accurate coordinates and map URL', () => {
      const result = buildEmergencySmsMessage({
        incidentId: '7F2A',
        type: 'Landslide',
        severity: 'HIGH',
        latitude: 30.0869,
        longitude: 78.2676,
        accuracyMeters: 18,
        timestamp: '21-11-2026 14:52',
        senderName: 'Rahul',
        senderPhone: '+919876543210',
      });

      assert.ok(result.body.includes('PAHAADSAATHI SOS'));
      assert.ok(result.body.includes('ID: PS-7F2A'));
      assert.ok(result.body.includes('TYPE: LANDSLIDE'));
      assert.ok(result.body.includes('SEV: HIGH'));
      assert.ok(result.body.includes('LOC: 30.08690,78.26760 ACC: 18M'));
      assert.ok(result.body.includes('MAP: https://maps.google.com/?q=30.08690,78.26760'));
      assert.ok(result.analysis.septets <= GSM_MAX_ALLOWED_SEPTETS);
      assert.ok(result.analysis.fitsInMaxSegments);
    });

    it('should write LOC: UNKNOWN when GPS coordinates are missing', () => {
      const result = buildEmergencySmsMessage({
        incidentId: 'B12C',
        type: 'Flash Flood',
        severity: 'CRITICAL',
        latitude: null,
        longitude: null,
      });

      assert.ok(result.body.includes('LOC: UNKNOWN'));
      assert.ok(!result.body.includes('MAP:'));
      assert.ok(result.analysis.septets <= GSM_MAX_ALLOWED_SEPTETS);
    });

    it('should sanitize input and collapse multiline injections', () => {
      const sanitized = sanitizeGsmInput('Dangerous\r\n\r\nLandslide');
      assert.strictEqual(sanitized, 'Dangerous Landslide');
    });
  });
});
