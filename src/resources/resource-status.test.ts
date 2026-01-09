/**
 * Tests for Resource Status Management
 * REQ-SHARE-006: Resource Lifecycle Tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalDatabase } from '../core/database';
import {
  markResourceClaimed,
  markResourceAvailable,
  toggleResourceAvailability,
  getAvailableResources,
  getClaimedResources,
  getUserAvailableResources,
  getUserClaimedResources,
} from './resource-status';

// Mock database
let testDb: LocalDatabase;

beforeEach(async () => {
  testDb = new LocalDatabase('test-resource-status');
  await testDb.init();

  // Set global db for tests
  (global as any).db = testDb;
});

describe('Resource Status Management', () => {
  describe('markResourceClaimed', () => {
    it('should mark a resource as claimed (not available)', async () => {
      // Add a test resource
      const resource = await testDb.addResource({
        name: 'Hand Drill',
        description: 'A good quality hand drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      // Mark as claimed
      await markResourceClaimed(resource.id, 'user-2');

      // Verify status
      const updated = testDb.getResource(resource.id);
      expect(updated?.available).toBe(false);
    });

    it('should record a transfer event when claimed', async () => {
      const resource = await testDb.addResource({
        name: 'Saw',
        description: 'Hand saw',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      await markResourceClaimed(resource.id, 'user-2', 'Borrowing for weekend project');

      // Check that event was recorded
      const events = testDb.listEvents();
      const claimEvent = events.find(
        e => e.resourceId === resource.id && e.action === 'transfer'
      );

      expect(claimEvent).toBeDefined();
      expect(claimEvent?.providerId).toBe('user-1');
      expect(claimEvent?.receiverId).toBe('user-2');
      expect(claimEvent?.note).toBe('Borrowing for weekend project');
    });
  });

  describe('markResourceAvailable', () => {
    it('should mark a resource as available', async () => {
      // Add a claimed resource
      const resource = await testDb.addResource({
        name: 'Ladder',
        description: '10-foot ladder',
        resourceType: 'tool',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-1',
      });

      // Mark as available
      await markResourceAvailable(resource.id, 'user-2');

      // Verify status
      const updated = testDb.getResource(resource.id);
      expect(updated?.available).toBe(true);
    });

    it('should record a return event when made available', async () => {
      const resource = await testDb.addResource({
        name: 'Ladder',
        description: '10-foot ladder',
        resourceType: 'tool',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-1',
      });

      await markResourceAvailable(resource.id, 'user-2', 'Thanks for lending!');

      // Check that event was recorded
      const events = testDb.listEvents();
      const returnEvent = events.find(
        e => e.resourceId === resource.id && e.action === 'return'
      );

      expect(returnEvent).toBeDefined();
      expect(returnEvent?.providerId).toBe('user-2');
      expect(returnEvent?.receiverId).toBe('user-1');
      expect(returnEvent?.note).toBe('Thanks for lending!');
    });
  });

  describe('toggleResourceAvailability', () => {
    it('should toggle from available to claimed', async () => {
      const resource = await testDb.addResource({
        name: 'Bicycle',
        description: 'Mountain bike',
        resourceType: 'other',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      const newStatus = await toggleResourceAvailability(resource.id, 'user-2');

      expect(newStatus).toBe(false);
      expect(testDb.getResource(resource.id)?.available).toBe(false);
    });

    it('should toggle from claimed to available', async () => {
      const resource = await testDb.addResource({
        name: 'Bicycle',
        description: 'Mountain bike',
        resourceType: 'other',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-1',
      });

      const newStatus = await toggleResourceAvailability(resource.id, 'user-2');

      expect(newStatus).toBe(true);
      expect(testDb.getResource(resource.id)?.available).toBe(true);
    });
  });

  describe('getAvailableResources', () => {
    it('should return only available resources', async () => {
      await testDb.addResource({
        name: 'Available Tool 1',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      await testDb.addResource({
        name: 'Claimed Tool',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-1',
      });

      await testDb.addResource({
        name: 'Available Tool 2',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-2',
      });

      const available = getAvailableResources();

      expect(available).toHaveLength(2);
      expect(available.every(r => r.available)).toBe(true);
    });
  });

  describe('getClaimedResources', () => {
    it('should return only claimed resources', async () => {
      await testDb.addResource({
        name: 'Available Tool',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      await testDb.addResource({
        name: 'Claimed Tool 1',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-1',
      });

      await testDb.addResource({
        name: 'Claimed Tool 2',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-2',
      });

      const claimed = getClaimedResources();

      expect(claimed).toHaveLength(2);
      expect(claimed.every(r => !r.available)).toBe(true);
    });
  });

  describe('getUserAvailableResources', () => {
    it('should return only available resources for a specific user', async () => {
      await testDb.addResource({
        name: 'User 1 Available',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      await testDb.addResource({
        name: 'User 1 Claimed',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-1',
      });

      await testDb.addResource({
        name: 'User 2 Available',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-2',
      });

      const user1Available = getUserAvailableResources('user-1');

      expect(user1Available).toHaveLength(1);
      expect(user1Available[0].name).toBe('User 1 Available');
      expect(user1Available[0].ownerId).toBe('user-1');
      expect(user1Available[0].available).toBe(true);
    });
  });

  describe('getUserClaimedResources', () => {
    it('should return only claimed resources for a specific user', async () => {
      await testDb.addResource({
        name: 'User 1 Available',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      await testDb.addResource({
        name: 'User 1 Claimed',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-1',
      });

      await testDb.addResource({
        name: 'User 2 Claimed',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: false,
        ownerId: 'user-2',
      });

      const user1Claimed = getUserClaimedResources('user-1');

      expect(user1Claimed).toHaveLength(1);
      expect(user1Claimed[0].name).toBe('User 1 Claimed');
      expect(user1Claimed[0].ownerId).toBe('user-1');
      expect(user1Claimed[0].available).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should throw error when resource not found', async () => {
      await expect(
        markResourceClaimed('nonexistent-id', 'user-1')
      ).rejects.toThrow('Resource not found');
    });

    it('should handle resources with no owner gracefully', async () => {
      const resource = await testDb.addResource({
        name: 'Orphan Resource',
        description: 'Test',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: '',
      });

      await expect(
        markResourceClaimed(resource.id, 'user-1')
      ).resolves.not.toThrow();
    });
  });
});
