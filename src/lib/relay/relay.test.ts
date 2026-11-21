import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canForward,
  computePayloadHash,
  createSafetyAlert,
  DEFAULT_MAX_HOPS,
  isDuplicateMessage,
  isMessageExpired,
  RelayMessage,
} from './protocol';

describe('Bluetooth Store-and-Forward Relay Protocol Tests', () => {
  it('should enforce strict 5-hop bound limit', () => {
    assert.strictEqual(DEFAULT_MAX_HOPS, 5);

    const alert = createSafetyAlert('dev_origin', 'moderator', {
      title: 'NH-07 Badrinath Blockage',
      body: 'Debris at Helang',
    });

    assert.strictEqual(alert.maxHops, 5);
    assert.strictEqual(alert.hopCount, 0);
    assert.strictEqual(canForward(alert), true);

    // Simulate 4 hops
    alert.hopCount = 4;
    assert.strictEqual(canForward(alert), true);

    // Reached maximum 5 hops
    alert.hopCount = 5;
    assert.strictEqual(canForward(alert), false);
  });

  it('should reject expired messages from being forwarded', () => {
    const pastDate = new Date(Date.now() - 10000).toISOString();
    const alert: RelayMessage = {
      id: 'msg_old',
      messageId: 'msg_old',
      messageType: 'SAFETY_ALERT',
      priority: 'high',
      originDeviceId: 'dev_1',
      originRole: 'moderator',
      destinationDeviceId: null,
      deliveryScope: 'broadcast',
      createdAt: pastDate,
      expiresAt: pastDate,
      maxHops: 5,
      hopCount: 1,
      hopPath: ['dev_1'],
      verified: false,
    };

    assert.strictEqual(isMessageExpired(alert), true);
    assert.strictEqual(canForward(alert), false);
  });

  it('should detect duplicate message IDs to prevent broadcast storms', () => {
    const processed = new Set<string>(['msg_101', 'msg_102']);
    assert.strictEqual(isDuplicateMessage('msg_101', processed), true);
    assert.strictEqual(isDuplicateMessage('msg_103', processed), false);
  });

  it('should calculate deterministic payload hash for integrity verification', () => {
    const payloadA = { title: 'Flood Alert', level: 3 };
    const payloadB = { title: 'Flood Alert', level: 3 };
    const payloadC = { title: 'Earthquake Alert', level: 5 };

    const hashA = computePayloadHash(payloadA);
    const hashB = computePayloadHash(payloadB);
    const hashC = computePayloadHash(payloadC);

    assert.strictEqual(hashA, hashB);
    assert.notStrictEqual(hashA, hashC);
  });
});
