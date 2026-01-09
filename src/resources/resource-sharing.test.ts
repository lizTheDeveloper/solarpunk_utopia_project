/**
 * Tests for Resource Sharing System
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  postItemToShare,
  browseAvailableItems,
  requestItem,
  markItemClaimed,
  markItemAvailable,
  getItemRequests,
  getMyRequests,
  getRequestsForMyItems,
  updateItem,
  removeItem,
  getItem,
} from './resource-sharing';

describe('Resource Sharing', () => {
  const testUserId1 = 'user-alice';
  const testUserId2 = 'user-bob';

  beforeEach(async () => {
    // Reset database before each test
    await db.init();
  });

  describe('postItemToShare', () => {
    it('should create a new resource listing', async () => {
      const resource = await postItemToShare(
        testUserId1,
        'Drill',
        'Cordless drill with battery',
        'tool',
        'lend',
        {
          location: 'North Oakland',
          tags: ['power-tools', 'DIY'],
        }
      );

      expect(resource.id).toBeDefined();
      expect(resource.name).toBe('Drill');
      expect(resource.description).toBe('Cordless drill with battery');
      expect(resource.resourceType).toBe('tool');
      expect(resource.shareMode).toBe('lend');
      expect(resource.available).toBe(true);
      expect(resource.ownerId).toBe(testUserId1);
      expect(resource.location).toBe('North Oakland');
      expect(resource.tags).toEqual(['power-tools', 'DIY']);
    });

    it('should sanitize user input', async () => {
      const resource = await postItemToShare(
        testUserId1,
        '<script>alert("xss")</script>Table Saw',
        'A <b>great</b> saw',
        'tool',
        'share'
      );

      expect(resource.name).not.toContain('<script>');
      expect(resource.description).not.toContain('<b>');
    });
  });

  describe('browseAvailableItems', () => {
    beforeEach(async () => {
      await postItemToShare(testUserId1, 'Drill', 'Power drill', 'tool', 'lend');
      await postItemToShare(testUserId1, 'Ladder', '10ft ladder', 'tool', 'lend');
      await postItemToShare(testUserId2, 'Sofa', 'Blue sofa, free', 'other', 'give');
    });

    it('should list all available items', () => {
      const items = browseAvailableItems();
      expect(items).toHaveLength(3);
    });

    it('should filter by resource type', () => {
      const tools = browseAvailableItems({ resourceType: 'tool' });
      expect(tools).toHaveLength(2);
      expect(tools.every(r => r.resourceType === 'tool')).toBe(true);
    });

    it('should filter by share mode', () => {
      const giveaway = browseAvailableItems({ shareMode: 'give' });
      expect(giveaway).toHaveLength(1);
      expect(giveaway[0].name).toBe('Sofa');
    });

    it('should filter by owner', () => {
      const aliceItems = browseAvailableItems({ ownerId: testUserId1 });
      expect(aliceItems).toHaveLength(2);
    });

    it('should search by query', () => {
      const results = browseAvailableItems({ searchQuery: 'drill' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Drill');
    });

    it('should not show unavailable items', async () => {
      const items = browseAvailableItems();
      const drillId = items.find(i => i.name === 'Drill')?.id;

      if (drillId) {
        await markItemClaimed(drillId);
        const availableItems = browseAvailableItems();
        expect(availableItems).toHaveLength(2);
        expect(availableItems.find(i => i.name === 'Drill')).toBeUndefined();
      }
    });
  });

  describe('requestItem', () => {
    let resourceId: string;

    beforeEach(async () => {
      const resource = await postItemToShare(
        testUserId1,
        'Drill',
        'Power drill',
        'tool',
        'lend'
      );
      resourceId = resource.id;
    });

    it('should create a request for an item', async () => {
      const result = await requestItem(
        testUserId2,
        resourceId,
        'I need this for a weekend project'
      );

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event?.action).toBe('transfer');
      expect(result.event?.providerId).toBe(testUserId1);
      expect(result.event?.receiverId).toBe(testUserId2);
    });

    it('should not allow requesting own item', async () => {
      const result = await requestItem(testUserId1, resourceId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot request your own item');
    });

    it('should not allow requesting unavailable item', async () => {
      await markItemClaimed(resourceId);
      const result = await requestItem(testUserId2, resourceId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resource is no longer available');
    });

    it('should not allow requesting non-existent item', async () => {
      const result = await requestItem(testUserId2, 'fake-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Resource not found');
    });
  });

  describe('markItemClaimed and markItemAvailable', () => {
    let resourceId: string;

    beforeEach(async () => {
      const resource = await postItemToShare(
        testUserId1,
        'Drill',
        'Power drill',
        'tool',
        'lend'
      );
      resourceId = resource.id;
    });

    it('should mark item as claimed', async () => {
      await markItemClaimed(resourceId, testUserId2);

      const resource = getItem(resourceId);
      expect(resource?.available).toBe(false);
    });

    it('should record claim event', async () => {
      await markItemClaimed(resourceId, testUserId2);

      const events = db.listEvents();
      const claimEvent = events.find(
        e => e.resourceId === resourceId && e.receiverId === testUserId2
      );

      expect(claimEvent).toBeDefined();
      expect(claimEvent?.action).toBe('lend');
    });

    it('should mark item as available again', async () => {
      await markItemClaimed(resourceId);
      await markItemAvailable(resourceId);

      const resource = getItem(resourceId);
      expect(resource?.available).toBe(true);
    });
  });

  describe('getItemRequests', () => {
    let resourceId: string;

    beforeEach(async () => {
      const resource = await postItemToShare(
        testUserId1,
        'Drill',
        'Power drill',
        'tool',
        'lend'
      );
      resourceId = resource.id;

      await requestItem(testUserId2, resourceId, 'I need this');
      await requestItem('user-charlie', resourceId, 'Me too please');
    });

    it('should get all requests for an item', () => {
      const requests = getItemRequests(resourceId);
      expect(requests).toHaveLength(2);
      expect(requests.every(r => r.resourceId === resourceId)).toBe(true);
    });
  });

  describe('getMyRequests', () => {
    beforeEach(async () => {
      const drill = await postItemToShare(testUserId1, 'Drill', 'Power drill', 'tool', 'lend');
      const ladder = await postItemToShare(testUserId1, 'Ladder', '10ft ladder', 'tool', 'lend');

      await requestItem(testUserId2, drill.id);
      await requestItem(testUserId2, ladder.id);
    });

    it('should get all items requested by user', () => {
      const myRequests = getMyRequests(testUserId2);
      expect(myRequests).toHaveLength(2);
      expect(myRequests.every(r => r.request.receiverId === testUserId2)).toBe(true);
    });

    it('should include resource details', () => {
      const myRequests = getMyRequests(testUserId2);
      expect(myRequests[0].resource).toBeDefined();
      expect(myRequests[0].resource?.name).toBeDefined();
    });
  });

  describe('getRequestsForMyItems', () => {
    beforeEach(async () => {
      const drill = await postItemToShare(testUserId1, 'Drill', 'Power drill', 'tool', 'lend');

      await requestItem(testUserId2, drill.id);
      await requestItem('user-charlie', drill.id);
    });

    it('should get all requests for my items', () => {
      const requests = getRequestsForMyItems(testUserId1);
      expect(requests).toHaveLength(2);
      expect(requests.every(r => r.request.providerId === testUserId1)).toBe(true);
    });
  });

  describe('updateItem', () => {
    let resourceId: string;

    beforeEach(async () => {
      const resource = await postItemToShare(
        testUserId1,
        'Drill',
        'Power drill',
        'tool',
        'lend'
      );
      resourceId = resource.id;
    });

    it('should update item details', async () => {
      await updateItem(resourceId, {
        name: 'Power Drill Pro',
        description: 'Professional grade cordless drill',
        tags: ['power-tools', 'professional'],
      });

      const updated = getItem(resourceId);
      expect(updated?.name).toBe('Power Drill Pro');
      expect(updated?.description).toBe('Professional grade cordless drill');
      expect(updated?.tags).toEqual(['power-tools', 'professional']);
    });

    it('should sanitize updated content', async () => {
      await updateItem(resourceId, {
        name: '<script>Drill</script>',
        description: '<b>Bad HTML</b>',
      });

      const updated = getItem(resourceId);
      expect(updated?.name).not.toContain('<script>');
      expect(updated?.description).not.toContain('<b>');
    });
  });

  describe('removeItem', () => {
    it('should delete an item', async () => {
      const resource = await postItemToShare(
        testUserId1,
        'Drill',
        'Power drill',
        'tool',
        'lend'
      );

      await removeItem(resource.id);

      const deleted = getItem(resource.id);
      expect(deleted).toBeUndefined();
    });
  });
});
