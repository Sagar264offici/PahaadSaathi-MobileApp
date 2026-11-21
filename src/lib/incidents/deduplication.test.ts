import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateHaversineDistanceMeters,
  detectDuplicateIncident,
} from './deduplication';
import { IncidentRecord } from '../sqlite/types';

describe('Incident Deduplication & Proximity Tests', () => {
  it('should accurately calculate Haversine distance between coordinates', () => {
    // Rudraprayag (30.2844, 78.9811) to Tilwara (30.3444, 78.9811) ~ 6.6km
    const dist = calculateHaversineDistanceMeters(30.2844, 78.9811, 30.3444, 78.9811);
    assert.ok(dist > 6500 && dist < 6800);

    // Nearby points (approx 100 meters)
    const nearbyDist = calculateHaversineDistanceMeters(30.08690, 78.26760, 30.08750, 78.26760);
    assert.ok(nearbyDist > 50 && nearbyDist < 100);
  });

  it('should identify a duplicate incident within 500m and 6 hours', () => {
    const existing: IncidentRecord[] = [
      {
        id: 'INC-100',
        type: 'Landslide',
        severity: 'High',
        latitude: 30.0869,
        longitude: 78.2676,
        description: 'Badrinath highway blocked',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'reported',
        verificationStatus: 'unverified',
        syncStatus: 'synced',
      },
    ];

    const result = detectDuplicateIncident(
      {
        type: 'Landslide',
        latitude: 30.0871, // approx 25 meters away
        longitude: 78.2676,
        createdAt: new Date().toISOString(),
      },
      existing
    );

    assert.strictEqual(result.isDuplicate, true);
    assert.strictEqual(result.matchedIncidentId, 'INC-100');
    assert.strictEqual(result.confidence, 'high');
  });

  it('should not mark as duplicate if incident type is different', () => {
    const existing: IncidentRecord[] = [
      {
        id: 'INC-100',
        type: 'Landslide',
        severity: 'High',
        latitude: 30.0869,
        longitude: 78.2676,
        description: 'Badrinath highway blocked',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'reported',
        verificationStatus: 'unverified',
        syncStatus: 'synced',
      },
    ];

    const result = detectDuplicateIncident(
      {
        type: 'Road Damage', // Different category
        latitude: 30.0869,
        longitude: 78.2676,
        createdAt: new Date().toISOString(),
      },
      existing
    );

    assert.strictEqual(result.isDuplicate, false);
  });
});
