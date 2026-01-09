/**
 * Tests for Gratitude Wall
 * REQ-TIME-022: Recognition Without Hierarchy
 * REQ-TIME-018: Experience Sharing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  expressGratitude,
  getGratitude,
  queryGratitude,
  getGratitudeWall,
  getGratitudeReceived,
  getGratitudeExpressed,
  getRecentGratitude,
  getGratitudeByTag,
  getGratitudeTags,
  getUserGratitudeStats,
  formatGratitude,
  formatGratitudeWall,
} from './gratitude-wall';

describe('Gratitude Wall', () => {
  beforeEach(async () => {
    await db.init();
    await db.reset();

    // Create test users
    await db.setUserProfile({
      id: 'user-1',
      did: 'did:key:user1',
      displayName: 'Alice',
      publicKey: 'test-key-1',
      joinedAt: Date.now(),
    });

    await db.setUserProfile({
      id: 'user-2',
      did: 'did:key:user2',
      displayName: 'Bob',
      publicKey: 'test-key-2',
      joinedAt: Date.now(),
    });

    await db.setUserProfile({
      id: 'user-3',
      did: 'did:key:user3',
      displayName: 'Carol',
      publicKey: 'test-key-3',
      joinedAt: Date.now(),
    });
  });

  describe('expressGratitude', () => {
    it('should create a public gratitude expression', async () => {
      const gratitude = await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thank you for helping me fix my bike!',
        tags: ['repair', 'kindness'],
        isPublic: true,
      });

      expect(gratitude.id).toBeDefined();
      expect(gratitude.fromUserId).toBe('user-1');
      expect(gratitude.toUserId).toBe('user-2');
      expect(gratitude.message).toBe('Thank you for helping me fix my bike!');
      expect(gratitude.tags).toEqual(['repair', 'kindness']);
      expect(gratitude.isPublic).toBe(true);
      expect(gratitude.createdAt).toBeGreaterThan(0);
    });

    it('should create a private gratitude expression', async () => {
      const gratitude = await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thank you for the emotional support',
        isPublic: false,
      });

      expect(gratitude.isPublic).toBe(false);
    });

    it('should sanitize tags to lowercase', async () => {
      const gratitude = await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks!',
        tags: ['KINDNESS', 'Support', 'HELP'],
        isPublic: true,
      });

      expect(gratitude.tags).toEqual(['kindness', 'support', 'help']);
    });

    it('should throw error if message is empty', async () => {
      await expect(
        expressGratitude({
          fromUserId: 'user-1',
          toUserId: 'user-2',
          message: '',
          isPublic: true,
        })
      ).rejects.toThrow('Gratitude message is required');
    });

    it('should throw error if expressing gratitude to self', async () => {
      await expect(
        expressGratitude({
          fromUserId: 'user-1',
          toUserId: 'user-1',
          message: 'Thanks me!',
          isPublic: true,
        })
      ).rejects.toThrow('Cannot express gratitude to yourself');
    });

    it('should link to a contribution', async () => {
      const gratitude = await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Amazing tutoring session!',
        relatedContributionId: 'contrib-123',
        isPublic: true,
      });

      expect(gratitude.relatedContributionId).toBe('contrib-123');
    });

    it('should link to an event', async () => {
      const gratitude = await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks for organizing the potluck!',
        relatedEventId: 'event-456',
        isPublic: true,
      });

      expect(gratitude.relatedEventId).toBe('event-456');
    });
  });

  describe('getGratitude', () => {
    it('should retrieve a gratitude expression by ID', async () => {
      const created = await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks!',
        isPublic: true,
      });

      const retrieved = getGratitude(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent gratitude', () => {
      const retrieved = getGratitude('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('queryGratitude', () => {
    beforeEach(async () => {
      // Create test gratitude expressions
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks for the bike repair!',
        tags: ['repair', 'kindness'],
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-2',
        toUserId: 'user-1',
        message: 'Thanks for the tutoring!',
        tags: ['teaching', 'support'],
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-3',
        toUserId: 'user-1',
        message: 'Private thanks',
        isPublic: false,
      });
    });

    it('should filter by fromUserId', () => {
      const results = queryGratitude({ fromUserId: 'user-1' });
      expect(results).toHaveLength(1);
      expect(results[0].fromUserId).toBe('user-1');
    });

    it('should filter by toUserId', () => {
      const results = queryGratitude({ toUserId: 'user-1' });
      expect(results).toHaveLength(2);
      expect(results.every(g => g.toUserId === 'user-1')).toBe(true);
    });

    it('should filter by public/private', () => {
      const publicGratitude = queryGratitude({ isPublic: true });
      expect(publicGratitude).toHaveLength(2);

      const privateGratitude = queryGratitude({ isPublic: false });
      expect(privateGratitude).toHaveLength(1);
    });

    it('should filter by tags', () => {
      const results = queryGratitude({ tags: ['repair'] });
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('repair');
    });

    it('should apply limit', () => {
      const results = queryGratitude({ limit: 1 });
      expect(results).toHaveLength(1);
    });

    it('should sort by most recent first', async () => {
      const results = queryGratitude({});
      expect(results.length).toBeGreaterThan(1);

      // Verify descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].createdAt).toBeGreaterThanOrEqual(results[i].createdAt);
      }
    });
  });

  describe('getGratitudeWall', () => {
    beforeEach(async () => {
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Public thanks 1',
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-2',
        toUserId: 'user-3',
        message: 'Public thanks 2',
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-3',
        toUserId: 'user-1',
        message: 'Private thanks',
        isPublic: false,
      });
    });

    it('should return only public gratitude', () => {
      const wall = getGratitudeWall();
      expect(wall).toHaveLength(2);
      expect(wall.every(g => g.isPublic)).toBe(true);
    });

    it('should respect limit', () => {
      const wall = getGratitudeWall(1);
      expect(wall).toHaveLength(1);
    });

    it('should return in chronological order (most recent first)', () => {
      const wall = getGratitudeWall();
      expect(wall[0].createdAt).toBeGreaterThanOrEqual(wall[1].createdAt);
    });
  });

  describe('getGratitudeReceived', () => {
    beforeEach(async () => {
      await expressGratitude({
        fromUserId: 'user-2',
        toUserId: 'user-1',
        message: 'Public thanks',
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-3',
        toUserId: 'user-1',
        message: 'Private thanks',
        isPublic: false,
      });
    });

    it('should return all gratitude received including private', () => {
      const received = getGratitudeReceived('user-1', true);
      expect(received).toHaveLength(2);
    });

    it('should return only public gratitude when requested', () => {
      const received = getGratitudeReceived('user-1', false);
      expect(received).toHaveLength(1);
      expect(received[0].isPublic).toBe(true);
    });
  });

  describe('getGratitudeExpressed', () => {
    beforeEach(async () => {
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks Bob!',
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-3',
        message: 'Thanks Carol!',
        isPublic: false,
      });
    });

    it('should return all gratitude expressed by user', () => {
      const expressed = getGratitudeExpressed('user-1');
      expect(expressed).toHaveLength(2);
      expect(expressed.every(g => g.fromUserId === 'user-1')).toBe(true);
    });
  });

  describe('getRecentGratitude', () => {
    it('should return gratitude from recent days', async () => {
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Recent thanks',
        isPublic: true,
      });

      const recent = getRecentGratitude(7, true);
      expect(recent).toHaveLength(1);
    });

    it('should filter by public only when requested', async () => {
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Public recent',
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-2',
        toUserId: 'user-3',
        message: 'Private recent',
        isPublic: false,
      });

      const publicRecent = getRecentGratitude(7, true);
      expect(publicRecent).toHaveLength(1);

      const allRecent = getRecentGratitude(7, false);
      expect(allRecent).toHaveLength(2);
    });
  });

  describe('getGratitudeByTag', () => {
    beforeEach(async () => {
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks for kindness',
        tags: ['kindness', 'support'],
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-2',
        toUserId: 'user-3',
        message: 'Thanks for help',
        tags: ['help'],
        isPublic: true,
      });
    });

    it('should return gratitude with specific tag', () => {
      const results = getGratitudeByTag('kindness');
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('kindness');
    });

    it('should return empty array for non-existent tag', () => {
      const results = getGratitudeByTag('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getGratitudeTags', () => {
    beforeEach(async () => {
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks',
        tags: ['kindness', 'support'],
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-2',
        toUserId: 'user-3',
        message: 'Thanks',
        tags: ['help', 'kindness'],
        isPublic: true,
      });

      // Private gratitude - tags should not be counted
      await expressGratitude({
        fromUserId: 'user-3',
        toUserId: 'user-1',
        message: 'Private thanks',
        tags: ['private-tag'],
        isPublic: false,
      });
    });

    it('should return all unique tags from public gratitude', () => {
      const tags = getGratitudeTags();
      expect(tags).toContain('kindness');
      expect(tags).toContain('support');
      expect(tags).toContain('help');
    });

    it('should not include tags from private gratitude', () => {
      const tags = getGratitudeTags();
      expect(tags).not.toContain('private-tag');
    });

    it('should return sorted tags', () => {
      const tags = getGratitudeTags();
      const sortedTags = [...tags].sort();
      expect(tags).toEqual(sortedTags);
    });
  });

  describe('getUserGratitudeStats', () => {
    beforeEach(async () => {
      // User 1 receives gratitude
      await expressGratitude({
        fromUserId: 'user-2',
        toUserId: 'user-1',
        message: 'Public thanks 1',
        tags: ['kindness'],
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-3',
        toUserId: 'user-1',
        message: 'Public thanks 2',
        tags: ['kindness', 'support'],
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-2',
        toUserId: 'user-1',
        message: 'Private thanks',
        tags: ['support'],
        isPublic: false,
      });

      // User 1 expresses gratitude
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks Bob!',
        isPublic: true,
      });
    });

    it('should count received and expressed gratitude', () => {
      const stats = getUserGratitudeStats('user-1');
      expect(stats.received).toBe(3);
      expect(stats.expressed).toBe(1);
    });

    it('should separate public and private received', () => {
      const stats = getUserGratitudeStats('user-1');
      expect(stats.publicReceived).toBe(2);
      expect(stats.privateReceived).toBe(1);
    });

    it('should count recent gratitude', () => {
      const stats = getUserGratitudeStats('user-1');
      expect(stats.recentReceived).toBe(3);
    });

    it('should identify common tags', () => {
      const stats = getUserGratitudeStats('user-1');
      expect(stats.commonTags).toContain('kindness');
      expect(stats.commonTags).toContain('support');
    });
  });

  describe('formatGratitude', () => {
    it('should format gratitude expression', async () => {
      const gratitude = await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thank you!',
        tags: ['kindness'],
        isPublic: true,
      });

      const formatted = formatGratitude(gratitude);
      expect(formatted).toContain('Alice → Bob');
      expect(formatted).toContain('Thank you!');
      expect(formatted).toContain('kindness');
    });
  });

  describe('formatGratitudeWall', () => {
    it('should format empty gratitude wall', () => {
      const formatted = formatGratitudeWall();
      expect(formatted).toContain('Gratitude Wall');
      expect(formatted).toContain('No gratitude expressions yet');
    });

    it('should format gratitude wall with expressions', async () => {
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thank you!',
        isPublic: true,
      });

      const formatted = formatGratitudeWall();
      expect(formatted).toContain('Gratitude Wall');
      expect(formatted).toContain('Alice → Bob');
      expect(formatted).toContain('Thank you!');
    });
  });

  describe('REQ-TIME-022: Recognition Without Hierarchy', () => {
    it('should not provide ranking or "top contributor" functionality', async () => {
      // Create multiple gratitude expressions
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks 1',
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-3',
        toUserId: 'user-2',
        message: 'Thanks 2',
        isPublic: true,
      });

      // The gratitude wall should show all gratitude equally
      const wall = getGratitudeWall();

      // Wall is sorted by time, not by who has most gratitude
      // All gratitude is equal - no ranking
      expect(wall).toHaveLength(2);
    });

    it('should celebrate diverse contributions equally', async () => {
      // Different types of gratitude - all should be treated equally
      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        message: 'Thanks for fixing my bike',
        tags: ['repair'],
        isPublic: true,
      });

      await expressGratitude({
        fromUserId: 'user-1',
        toUserId: 'user-3',
        message: 'Thanks for listening',
        tags: ['emotional-support'],
        isPublic: true,
      });

      const wall = getGratitudeWall();
      expect(wall).toHaveLength(2);

      // Both appear on the wall equally - no prioritization
      expect(wall.some(g => g.tags?.includes('repair'))).toBe(true);
      expect(wall.some(g => g.tags?.includes('emotional-support'))).toBe(true);
    });
  });
});
