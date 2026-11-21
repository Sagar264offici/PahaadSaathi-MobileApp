import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MOUNTAIN_SAFETY_GUIDES } from './safetyGuides';

describe('Bilingual Offline Safety Guides Tests', () => {
  it('should cover all 6 primary mountain disaster categories', () => {
    const categories = MOUNTAIN_SAFETY_GUIDES.map((g) => g.category);
    assert.ok(categories.includes('landslide'));
    assert.ok(categories.includes('flash_flood'));
    assert.ok(categories.includes('earthquake'));
    assert.ok(categories.includes('avalanche'));
    assert.ok(categories.includes('forest_fire'));
    assert.ok(categories.includes('accident'));
  });

  it('should have complete Hindi and English content for each guide', () => {
    for (const guide of MOUNTAIN_SAFETY_GUIDES) {
      assert.ok(guide.titleEn.length > 5);
      assert.ok(guide.titleHi.length > 5);
      assert.ok(guide.dosEn.length >= 3);
      assert.ok(guide.dosHi.length >= 3);
      assert.ok(guide.dontsEn.length >= 2);
      assert.ok(guide.dontsHi.length >= 2);
      assert.ok(guide.vitalHelpline.length >= 3);
      assert.ok(guide.offlineTipEn.length > 10);
      assert.ok(guide.offlineTipHi.length > 10);
    }
  });
});
