import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SandboxPublicAlertProvider,
  PublicAlertDraft,
} from './publicAlertProvider';

describe('Government Public Alert Provider Tests', () => {
  const provider = new SandboxPublicAlertProvider();

  it('should reject alerts without bilingual headlines and instructions', async () => {
    const invalidAlert: PublicAlertDraft = {
      id: 'alt_1',
      senderAgency: 'DDMA Chamoli',
      senderOfficerName: 'R. K. Sharma, ADM',
      targetRegion: 'Joshimath',
      targetDistrict: 'Chamoli',
      category: 'geophysical',
      headlineEn: 'Landslide Warning',
      headlineHi: '', // Missing Hindi translation
      instructionsEn: 'Stay indoors',
      instructionsHi: '',
      severity: 'WARNING',
      effectiveUntil: new Date(Date.now() + 86400000).toISOString(),
      approvalsRequired: 1,
      approvedBy: ['ADM_SIGN_1'],
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
    };

    const res = await provider.validateAlert(invalidAlert);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.length >= 2);
  });

  it('should enforce multi-officer approval threshold before dispatching', async () => {
    const validAlert: PublicAlertDraft = {
      id: 'alt_2',
      senderAgency: 'State Emergency Operations Centre',
      senderOfficerName: 'Dr. V. Anand, Director',
      targetRegion: 'Rudraprayag Valley',
      targetDistrict: 'Rudraprayag',
      category: 'meteorological',
      headlineEn: 'Severe Flash Flood Red Alert',
      headlineHi: 'अति तीव्र बाढ़ की लाल चेतावनी',
      instructionsEn: 'Evacuate riverbank settlements immediately to identified relief camps.',
      instructionsHi: 'नदी किनारे की बस्तियों को तुरंत खाली कर राहत शिविरों में जाएं।',
      severity: 'EXTREME_EMERGENCY',
      effectiveUntil: new Date(Date.now() + 86400000).toISOString(),
      approvalsRequired: 2,
      approvedBy: ['OFFICER_A'], // Only 1 approval out of 2 required
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
    };

    await assert.rejects(
      async () => {
        await provider.submitAlert(validAlert, 'SIG_KEY');
      },
      /Insufficient approvals/
    );

    // Add second approval signature
    validAlert.approvedBy.push('OFFICER_B');
    const dispatch = await provider.submitAlert(validAlert, 'SIG_KEY');
    assert.strictEqual(dispatch.status, 'DISPATCH_ACCEPTED');
    assert.ok(dispatch.dispatchId.startsWith('DISPATCH_SANDBOX_'));

    const status = await provider.getStatus(dispatch.dispatchId);
    assert.strictEqual(status.state, 'BROADCAST_ACTIVE');
  });
});
