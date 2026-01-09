/**
 * Tests for local-first database and CRDT functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalDatabase } from './database';
import type { Resource } from '../types';

describe('LocalDatabase', () => {
  let db: LocalDatabase;

  beforeEach(async () => {
    // Use unique database name for each test
    db = new LocalDatabase(`test-db-${Date.now()}-${Math.random()}`);
    await db.init();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Resource Operations', () => {
    it('should add a resource', async () => {
      const resource = await db.addResource({
        name: 'Garden Shovel',
        description: 'Heavy-duty shovel for garden work',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      expect(resource.id).toBeDefined();
      expect(resource.name).toBe('Garden Shovel');
      expect(resource.createdAt).toBeGreaterThan(0);
    });

    it('should list all resources', async () => {
      await db.addResource({
        name: 'Bike Pump',
        description: 'Floor pump with gauge',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      await db.addResource({
        name: '3D Printer',
        description: 'Prusa i3 MK3S+',
        resourceType: 'equipment',
        shareMode: 'share',
        available: true,
        ownerId: 'user-2',
      });

      const resources = db.listResources();
      expect(resources).toHaveLength(2);
    });

    it('should update a resource', async () => {
      const resource = await db.addResource({
        name: 'Solar Panel',
        description: '100W portable solar panel',
        resourceType: 'energy',
        shareMode: 'share',
        available: true,
        ownerId: 'user-1',
      });

      await db.updateResource(resource.id, {
        available: false,
      });

      const updated = db.getResource(resource.id);
      expect(updated?.available).toBe(false);
    });

    it('should delete a resource', async () => {
      const resource = await db.addResource({
        name: 'Test Item',
        description: 'This will be deleted',
        resourceType: 'other',
        shareMode: 'give',
        available: true,
        ownerId: 'user-1',
      });

      await db.deleteResource(resource.id);

      const deleted = db.getResource(resource.id);
      expect(deleted).toBeUndefined();
    });
  });

  describe('CRDT Sync Operations', () => {
    it('should export and merge data between peers', async () => {
      // Peer 1 adds resources
      const db1 = new LocalDatabase();
      await db1.init();

      await db1.addResource({
        name: 'Peer 1 Resource',
        description: 'From peer 1',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      // Peer 2 adds different resources
      const db2 = new LocalDatabase();
      await db2.init();

      await db2.addResource({
        name: 'Peer 2 Resource',
        description: 'From peer 2',
        resourceType: 'equipment',
        shareMode: 'share',
        available: true,
        ownerId: 'user-2',
      });

      // Export from peer 1
      const binary1 = db1.getBinary();

      // Merge into peer 2
      await db2.merge(binary1);

      // Peer 2 should now have both resources
      const resources = db2.listResources();
      expect(resources.length).toBeGreaterThanOrEqual(2);

      // Find both resources
      const hasPeer1 = resources.some((r) => r.name === 'Peer 1 Resource');
      const hasPeer2 = resources.some((r) => r.name === 'Peer 2 Resource');

      expect(hasPeer1).toBe(true);
      expect(hasPeer2).toBe(true);

      await db1.close();
      await db2.close();
    });

    it('should handle concurrent edits with CRDT conflict resolution', async () => {
      // Both peers start with same initial state
      const db1 = new LocalDatabase();
      await db1.init();

      const resource = await db1.addResource({
        name: 'Shared Resource',
        description: 'Initial description',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      // Get initial state
      const initialBinary = db1.getBinary();

      // Create peer 2 from same initial state
      const db2 = new LocalDatabase();
      await db2.init();
      await db2.merge(initialBinary);

      // Both peers edit the same resource concurrently (offline)
      await db1.updateResource(resource.id, {
        description: 'Updated by peer 1',
      });

      await db2.updateResource(resource.id, {
        location: 'Community Center',
      });

      // Sync: merge peer 2's changes into peer 1
      const binary2 = db2.getBinary();
      await db1.merge(binary2);

      // Sync: merge peer 1's changes into peer 2
      const binary1 = db1.getBinary();
      await db2.merge(binary1);

      // Both should converge to same state (eventual consistency)
      const resource1 = db1.getResource(resource.id);
      const resource2 = db2.getResource(resource.id);

      // CRDTs ensure both peers converge
      // Last-write-wins for different fields
      expect(resource1?.location).toBe('Community Center');
      expect(resource2?.location).toBe('Community Center');

      await db1.close();
      await db2.close();
    });
  });

  describe('Offline-First Operations', () => {
    it('should work entirely offline', async () => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // All operations should work
      await db.addResource({
        name: 'Offline Resource',
        description: 'Added while offline',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      await db.addNeed({
        userId: 'user-1',
        description: 'Need help while offline',
        urgency: 'needed',
        fulfilled: false,
      });

      const resources = db.listResources();
      const needs = db.listNeeds();

      expect(resources.length).toBeGreaterThan(0);
      expect(needs.length).toBeGreaterThan(0);

      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    it('should persist data across sessions', async () => {
      // Add data
      await db.addResource({
        name: 'Persistent Resource',
        description: 'Should survive restart',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user-1',
      });

      // Close database
      await db.close();

      // Reopen (simulating app restart)
      const db2 = new LocalDatabase();
      await db2.init();

      // Data should still be there
      const resources = db2.listResources();
      const hasPersisted = resources.some((r) => r.name === 'Persistent Resource');

      expect(hasPersisted).toBe(true);

      await db2.close();
    });
  });
});
