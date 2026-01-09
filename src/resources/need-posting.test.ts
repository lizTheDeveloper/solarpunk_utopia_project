/**
 * Tests for Need Posting
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalDatabase } from '../core/database';
import { NeedPosting } from './need-posting';
import type { Need } from '../types';

describe('NeedPosting', () => {
  let db: LocalDatabase;
  let needPosting: NeedPosting;
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    // Create a fresh database for each test
    db = new LocalDatabase(`test-need-posting-${Date.now()}`);
    await db.init();
    needPosting = new NeedPosting(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('postNeed', () => {
    it('should create a new need with all fields', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Need help moving furniture',
          urgency: 'urgent',
          resourceType: 'time',
        },
        { userId: testUserId }
      );

      expect(need.id).toBeDefined();
      expect(need.userId).toBe(testUserId);
      expect(need.description).toBe('Need help moving furniture');
      expect(need.urgency).toBe('urgent');
      expect(need.resourceType).toBe('time');
      expect(need.fulfilled).toBe(false);
      expect(need.createdAt).toBeDefined();
      expect(need.updatedAt).toBeDefined();
    });

    it('should default urgency to "casual" if not specified', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Looking for a bicycle',
        },
        { userId: testUserId }
      );

      expect(need.urgency).toBe('casual');
    });

    it('should allow posting without resource type', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Need something',
          urgency: 'helpful',
        },
        { userId: testUserId }
      );

      expect(need.resourceType).toBeUndefined();
    });

    it('should trim whitespace from description', async () => {
      const need = await needPosting.postNeed(
        {
          description: '  Need help   ',
        },
        { userId: testUserId }
      );

      expect(need.description).toBe('Need help');
    });

    it('should throw error for empty description', async () => {
      await expect(
        needPosting.postNeed(
          {
            description: '',
          },
          { userId: testUserId }
        )
      ).rejects.toThrow('Need description cannot be empty');
    });

    it('should throw error for whitespace-only description', async () => {
      await expect(
        needPosting.postNeed(
          {
            description: '   ',
          },
          { userId: testUserId }
        )
      ).rejects.toThrow('Need description cannot be empty');
    });

    it('should sanitize HTML from description', async () => {
      const need = await needPosting.postNeed(
        {
          description: '<script>alert("xss")</script>Looking for help',
        },
        { userId: testUserId }
      );

      expect(need.description).not.toContain('<script>');
      expect(need.description).toContain('Looking for help');
    });

    it('should store need in database', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
        },
        { userId: testUserId }
      );

      const allNeeds = db.listNeeds();
      expect(allNeeds).toHaveLength(1);
      expect(allNeeds[0].id).toBe(need.id);
    });
  });

  describe('updateNeed', () => {
    let testNeed: Need;

    beforeEach(async () => {
      testNeed = await needPosting.postNeed(
        {
          description: 'Original description',
          urgency: 'casual',
        },
        { userId: testUserId }
      );
    });

    it('should update description', async () => {
      await needPosting.updateNeed(testNeed.id, {
        description: 'Updated description',
      });

      const allNeeds = db.listNeeds();
      expect(allNeeds[0].description).toBe('Updated description');
    });

    it('should update urgency', async () => {
      await needPosting.updateNeed(testNeed.id, {
        urgency: 'urgent',
      });

      const allNeeds = db.listNeeds();
      expect(allNeeds[0].urgency).toBe('urgent');
    });

    it('should update fulfilled status', async () => {
      await needPosting.updateNeed(testNeed.id, {
        fulfilled: true,
      });

      const allNeeds = db.listNeeds();
      expect(allNeeds[0].fulfilled).toBe(true);
    });

    it('should sanitize description when updating', async () => {
      await needPosting.updateNeed(testNeed.id, {
        description: '<b>Bold</b> text',
      });

      const allNeeds = db.listNeeds();
      // HTML tags should be escaped to prevent XSS
      expect(allNeeds[0].description).not.toContain('<b>');
      expect(allNeeds[0].description).toContain('&lt;b&gt;Bold&lt;/b&gt;');
    });
  });

  describe('fulfillNeed', () => {
    it('should mark need as fulfilled', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
        },
        { userId: testUserId }
      );

      await needPosting.fulfillNeed(need.id);

      const allNeeds = db.listNeeds();
      expect(allNeeds[0].fulfilled).toBe(true);
    });
  });

  describe('unfulfillNeed', () => {
    it('should mark need as unfulfilled', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
        },
        { userId: testUserId }
      );

      await needPosting.fulfillNeed(need.id);
      await needPosting.unfulfillNeed(need.id);

      const allNeeds = db.listNeeds();
      expect(allNeeds[0].fulfilled).toBe(false);
    });
  });

  describe('deleteNeed', () => {
    it('should delete need from database', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
        },
        { userId: testUserId }
      );

      await needPosting.deleteNeed(need.id);

      const allNeeds = db.listNeeds();
      expect(allNeeds).toHaveLength(0);
    });
  });

  describe('getUserNeeds', () => {
    it('should return all needs for a user', async () => {
      await needPosting.postNeed(
        { description: 'Need 1' },
        { userId: testUserId }
      );
      await needPosting.postNeed(
        { description: 'Need 2' },
        { userId: testUserId }
      );
      await needPosting.postNeed(
        { description: 'Need 3' },
        { userId: 'other-user' }
      );

      const userNeeds = await needPosting.getUserNeeds(testUserId);

      expect(userNeeds).toHaveLength(2);
      expect(userNeeds.every(n => n.userId === testUserId)).toBe(true);
    });

    it('should return empty array if user has no needs', async () => {
      const userNeeds = await needPosting.getUserNeeds('nonexistent-user');
      expect(userNeeds).toHaveLength(0);
    });
  });

  describe('getUserActiveNeeds', () => {
    it('should return only unfulfilled needs', async () => {
      const need1 = await needPosting.postNeed(
        { description: 'Active need' },
        { userId: testUserId }
      );
      const need2 = await needPosting.postNeed(
        { description: 'Fulfilled need' },
        { userId: testUserId }
      );

      await needPosting.fulfillNeed(need2.id);

      const activeNeeds = await needPosting.getUserActiveNeeds(testUserId);

      expect(activeNeeds).toHaveLength(1);
      expect(activeNeeds[0].id).toBe(need1.id);
      expect(activeNeeds[0].fulfilled).toBe(false);
    });

    it('should return empty array if all needs are fulfilled', async () => {
      const need = await needPosting.postNeed(
        { description: 'Need' },
        { userId: testUserId }
      );

      await needPosting.fulfillNeed(need.id);

      const activeNeeds = await needPosting.getUserActiveNeeds(testUserId);
      expect(activeNeeds).toHaveLength(0);
    });
  });

  describe('validation helpers', () => {
    it('should validate urgency levels', () => {
      expect(needPosting.isValidUrgency('casual')).toBe(true);
      expect(needPosting.isValidUrgency('helpful')).toBe(true);
      expect(needPosting.isValidUrgency('needed')).toBe(true);
      expect(needPosting.isValidUrgency('urgent')).toBe(true);
      expect(needPosting.isValidUrgency('invalid')).toBe(false);
    });

    it('should validate resource types', () => {
      expect(needPosting.isValidResourceType('tool')).toBe(true);
      expect(needPosting.isValidResourceType('food')).toBe(true);
      expect(needPosting.isValidResourceType('time')).toBe(true);
      expect(needPosting.isValidResourceType('invalid')).toBe(false);
    });

    it('should provide urgency descriptions', () => {
      expect(needPosting.getUrgencyDescription('casual')).toContain('No rush');
      expect(needPosting.getUrgencyDescription('urgent')).toContain('Urgent');
    });
  });
});
