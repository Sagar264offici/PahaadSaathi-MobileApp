import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  communityStore,
} from './communityStore';

describe('Community Ecosystem Store Tests', () => {
  it('should provide pre-configured Uttarakhand disaster-prone communities', () => {
    const list = communityStore.getCommunities();
    assert.ok(list.length >= 4);

    const joshimath = communityStore.getCommunity('chamoli_joshimath');
    assert.ok(joshimath);
    assert.strictEqual(joshimath?.district, 'Chamoli');
    assert.ok(joshimath?.emergencyHotline);
  });

  it('should filter posts by community ID correctly', async () => {
    const allPosts = await communityStore.getPosts();
    assert.ok(allPosts.length >= 3);

    const joshimathPosts = await communityStore.getPosts('chamoli_joshimath');
    assert.ok(joshimathPosts.length >= 2);
    for (const post of joshimathPosts) {
      assert.strictEqual(post.communityId, 'chamoli_joshimath');
    }
  });

  it('should support creating and updating help requests', async () => {
    const newReq = await communityStore.createHelpRequest({
      communityId: 'chamoli_joshimath',
      requesterName: 'Aarti Devi',
      category: 'food',
      title: 'Warm blankets and water needed',
      description: 'Stranded at transit camp with two children.',
      location: 'Camp 2',
      urgency: 'high',
    });

    assert.ok(newReq.id.startsWith('help_'));
    assert.strictEqual(newReq.status, 'open');

    await communityStore.updateHelpRequestStatus(newReq.id, 'fulfilled');
    const updatedList = await communityStore.getHelpRequests('chamoli_joshimath');
    const found = updatedList.find((h) => h.id === newReq.id);
    assert.strictEqual(found?.status, 'fulfilled');
  });

  it('should return verified resources and filter by category', () => {
    const shelters = communityStore.getResources('chamoli_joshimath', 'shelter');
    assert.ok(shelters.length >= 1);
    assert.strictEqual(shelters[0].category, 'shelter');
    assert.ok(shelters[0].capacity && shelters[0].capacity > 0);
  });
});
