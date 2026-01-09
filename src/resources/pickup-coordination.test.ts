/**
 * Tests for Pickup Coordination System
 * REQ-SHARE-013: Resource Pickup and Delivery
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  createPickupCoordination,
  getPickupCoordination,
  getMyPickupCoordinations,
  addPickupMessage,
  schedulePickup,
  markPickupInProgress,
  completePickupCoordination,
  cancelPickupCoordination,
  getPendingCoordinations,
  getActiveCoordinations,
  getCompletedCoordinations,
} from './pickup-coordination';

describe('Pickup Coordination System', () => {
  beforeEach(async () => {
    await db.init();
    await db.reset(); // Reset database between tests
  });

  describe('Creating pickup coordination', () => {
    it('should create a new pickup coordination', async () => {
      // Create a test resource
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2',
        {
          method: 'pickup',
          initialMessage: 'Looking forward to using this drill!',
        }
      );

      expect(coordination).toBeDefined();
      expect(coordination.resourceId).toBe(resource.id);
      expect(coordination.providerId).toBe('user-1');
      expect(coordination.receiverId).toBe('user-2');
      expect(coordination.status).toBe('pending');
      expect(coordination.method).toBe('pickup');
      expect(coordination.messages).toHaveLength(1);
      expect(coordination.messages[0].content).toBe('Looking forward to using this drill!');
    });

    it('should not allow provider and receiver to be the same', async () => {
      const resource = await db.addResource({
        name: 'Test Tool',
        description: 'A tool',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      await expect(
        createPickupCoordination(
          resource.id,
          'user-1',
          'user-1'
        )
      ).rejects.toThrow('Provider and receiver cannot be the same person');
    });

    it('should verify provider owns the resource', async () => {
      const resource = await db.addResource({
        name: 'Test Tool',
        description: 'A tool',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      await expect(
        createPickupCoordination(
          resource.id,
          'user-2', // Wrong provider
          'user-1'
        )
      ).rejects.toThrow('Provider must be the resource owner');
    });
  });

  describe('Messaging', () => {
    it('should allow participants to send messages', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      const updated = await addPickupMessage(
        coordination.id,
        'user-1',
        'When would you like to pick it up?'
      );

      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0].content).toBe('When would you like to pick it up?');
      expect(updated.messages[0].senderId).toBe('user-1');
    });

    it('should not allow non-participants to send messages', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      await expect(
        addPickupMessage(
          coordination.id,
          'user-3',
          'Random message'
        )
      ).rejects.toThrow('Only participants can send messages');
    });
  });

  describe('Scheduling', () => {
    it('should schedule a pickup time and location', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const updated = await schedulePickup(
        coordination.id,
        'user-1',
        {
          scheduledTime: tomorrow,
          location: '123 Main St',
          directions: 'Blue house on the left',
          method: 'pickup',
        }
      );

      expect(updated.status).toBe('scheduled');
      expect(updated.scheduledTime).toBe(tomorrow);
      expect(updated.location).toBe('123 Main St');
      expect(updated.directions).toBe('Blue house on the left');
    });

    it('should not allow scheduling in the past', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      const yesterday = Date.now() - (24 * 60 * 60 * 1000);

      await expect(
        schedulePickup(coordination.id, 'user-1', {
          scheduledTime: yesterday,
          location: '123 Main St',
        })
      ).rejects.toThrow('Scheduled time must be in the future');
    });
  });

  describe('Status transitions', () => {
    it('should allow marking as in-progress', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      await markPickupInProgress(coordination.id, 'user-1');

      const updated = getPickupCoordination(coordination.id);
      expect(updated?.status).toBe('in-progress');
    });

    it('should allow completing the coordination', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      await markPickupInProgress(coordination.id, 'user-1');
      await completePickupCoordination(
        coordination.id,
        'user-2',
        'Got the drill, thanks!'
      );

      const updated = getPickupCoordination(coordination.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedBy).toBe('user-2');
      expect(updated?.completedAt).toBeDefined();
    });

    it('should allow cancelling the coordination', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      await cancelPickupCoordination(
        coordination.id,
        'user-2',
        'Changed my mind'
      );

      const updated = getPickupCoordination(coordination.id);
      expect(updated?.status).toBe('cancelled');
    });
  });

  describe('Filtering coordinations', () => {
    it('should get my coordinations (both provider and receiver)', async () => {
      const resource1 = await db.addResource({
        name: 'Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const resource2 = await db.addResource({
        name: 'Saw',
        description: 'A circular saw',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-2',
        photos: [],
        tags: [],
      });

      // User is provider for resource1
      await createPickupCoordination(
        resource1.id,
        'user-1',
        'user-2'
      );

      // User is receiver for resource2
      await createPickupCoordination(
        resource2.id,
        'user-2',
        'user-1'
      );

      const providerCoordinations = getMyPickupCoordinations('user-1');
      expect(providerCoordinations).toHaveLength(2);
    });

    it('should filter pending coordinations', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coord1 = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      // Schedule one
      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      await schedulePickup(coord1.id, 'user-1', {
        scheduledTime: tomorrow,
        location: '123 Main St',
      });

      const pending = getPendingCoordinations('user-1');
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('scheduled');
    });

    it('should filter active coordinations', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      await markPickupInProgress(coordination.id, 'user-1');

      const active = getActiveCoordinations('user-1');
      expect(active).toHaveLength(1);
      expect(active[0].status).toBe('in-progress');
    });

    it('should filter completed coordinations', async () => {
      const resource = await db.addResource({
        name: 'Test Drill',
        description: 'A cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const coordination = await createPickupCoordination(
        resource.id,
        'user-1',
        'user-2'
      );

      await markPickupInProgress(coordination.id, 'user-1');
      await completePickupCoordination(coordination.id, 'user-2');

      const completed = getCompletedCoordinations('user-1');
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe('completed');
    });
  });
});
