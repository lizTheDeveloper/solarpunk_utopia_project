/**
 * Tests for Resource Browser
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalDatabase } from '../core/database';
import { ResourceBrowser } from './resource-browser';
import type { Resource } from '../types';

describe('ResourceBrowser', () => {
  let db: LocalDatabase;
  let browser: ResourceBrowser;

  beforeEach(async () => {
    // Create a test database with unique name
    const testDbName = `test-resource-browser-${Date.now()}`;
    db = new LocalDatabase(testDbName);
    await db.init();
    browser = new ResourceBrowser(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('browseResources', () => {
    it('should return all available resources by default', async () => {
      // Add test resources
      await db.addResource({
        name: 'Power Drill',
        description: 'Cordless drill with battery',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1'
      });

      await db.addResource({
        name: 'Bike',
        description: 'Mountain bike',
        resourceType: 'equipment',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2'
      });

      await db.addResource({
        name: 'Tent',
        description: 'Camping tent',
        resourceType: 'equipment',
        shareMode: 'lend',
        available: false,
        ownerId: 'user3'
      });

      const results = await browser.browseResources();

      // Should return only available resources (2 out of 3)
      expect(results).toHaveLength(2);
      expect(results.every(r => r.resource.available)).toBe(true);
    });

    it('should filter by resource type', async () => {
      await db.addResource({
        name: 'Power Drill',
        description: 'Cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1'
      });

      await db.addResource({
        name: 'Bike',
        description: 'Mountain bike',
        resourceType: 'equipment',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2'
      });

      const results = await browser.browseResources({
        resourceType: 'tool',
        availableOnly: true
      });

      expect(results).toHaveLength(1);
      expect(results[0].resource.name).toBe('Power Drill');
    });

    it('should filter by share mode', async () => {
      await db.addResource({
        name: 'Old couch',
        description: 'Free couch',
        resourceType: 'other',
        shareMode: 'give',
        available: true,
        ownerId: 'user1'
      });

      await db.addResource({
        name: 'Ladder',
        description: 'Extension ladder',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2'
      });

      const results = await browser.browseResources({
        shareMode: 'give',
        availableOnly: true
      });

      expect(results).toHaveLength(1);
      expect(results[0].resource.shareMode).toBe('give');
    });

    it('should search by query (name, description, tags)', async () => {
      await db.addResource({
        name: 'Power Drill',
        description: 'Cordless drill with battery',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1',
        tags: ['power-tools', 'woodworking']
      });

      await db.addResource({
        name: 'Hand saw',
        description: 'Manual saw for woodworking',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2',
        tags: ['hand-tools', 'woodworking']
      });

      // Search by name
      let results = await browser.browseResources({
        searchQuery: 'drill',
        availableOnly: true
      });
      expect(results).toHaveLength(1);
      expect(results[0].resource.name).toBe('Power Drill');

      // Search by description
      results = await browser.browseResources({
        searchQuery: 'manual',
        availableOnly: true
      });
      expect(results).toHaveLength(1);
      expect(results[0].resource.name).toBe('Hand saw');

      // Search by tag
      results = await browser.browseResources({
        searchQuery: 'woodworking',
        availableOnly: true
      });
      expect(results).toHaveLength(2);
    });

    it('should filter by tags', async () => {
      await db.addResource({
        name: 'Power Drill',
        description: 'Cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1',
        tags: ['power-tools', 'woodworking']
      });

      await db.addResource({
        name: 'Sewing machine',
        description: 'Electric sewing machine',
        resourceType: 'equipment',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2',
        tags: ['crafts', 'sewing']
      });

      const results = await browser.browseResources({
        tags: ['woodworking'],
        availableOnly: true
      });

      expect(results).toHaveLength(1);
      expect(results[0].resource.name).toBe('Power Drill');
    });
  });

  describe('geographic proximity (REQ-SHARE-011)', () => {
    it('should calculate distance between user and resources', async () => {
      // Add resources with locations (lat,lng format)
      await db.addResource({
        name: 'Near Resource',
        description: 'Close by',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1',
        location: '40.7128,-74.0060' // New York (example)
      });

      await db.addResource({
        name: 'Far Resource',
        description: 'Far away',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2',
        location: '34.0522,-118.2437' // Los Angeles (example)
      });

      const results = await browser.browseResources({
        location: {
          latitude: 40.7128,
          longitude: -74.0060 // New York
        },
        availableOnly: true
      });

      // Should return both, sorted by distance (nearest first)
      expect(results).toHaveLength(2);
      expect(results[0].resource.name).toBe('Near Resource');
      expect(results[0].distance).toBeDefined();
      expect(results[0].distance!).toBeLessThan(1000); // Very close
      expect(results[1].resource.name).toBe('Far Resource');
      expect(results[1].distance).toBeDefined();
      expect(results[1].distance!).toBeGreaterThan(1000000); // Far away
    });

    it('should filter by maximum distance', async () => {
      await db.addResource({
        name: 'Near Resource',
        description: 'Walking distance',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1',
        location: '40.7128,-74.0060'
      });

      await db.addResource({
        name: 'Far Resource',
        description: 'Too far',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2',
        location: '34.0522,-118.2437'
      });

      const results = await browser.browseResources({
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          maxDistance: 5000 // 5km
        },
        availableOnly: true
      });

      // Should only return nearby resource
      expect(results).toHaveLength(1);
      expect(results[0].resource.name).toBe('Near Resource');
    });

    it('should handle invalid location formats gracefully', async () => {
      await db.addResource({
        name: 'Invalid Location',
        description: 'Bad location format',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1',
        location: 'invalid-format'
      });

      const results = await browser.browseResources({
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        availableOnly: true
      });

      // Should still return resource, but with no distance
      expect(results).toHaveLength(1);
      expect(results[0].distance).toBe(Infinity);
    });
  });

  describe('getWalkableResources', () => {
    it('should return resources within walking distance', async () => {
      await db.addResource({
        name: 'Nearby Tool',
        description: 'Close enough to walk',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1',
        location: '40.7128,-74.0060'
      });

      await db.addResource({
        name: 'Far Tool',
        description: 'Too far to walk',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2',
        location: '34.0522,-118.2437'
      });

      const results = await browser.getWalkableResources(40.7128, -74.0060, 5000);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.distance! <= 5000)).toBe(true);
    });
  });

  describe('searchResources', () => {
    it('should be a convenience method for text search', async () => {
      await db.addResource({
        name: 'Power Drill',
        description: 'Cordless drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1'
      });

      const results = await browser.searchResources('power');

      expect(results).toHaveLength(1);
      expect(results[0].resource.name).toBe('Power Drill');
    });
  });

  describe('getResourcesByType', () => {
    it('should return resources of specific type', async () => {
      await db.addResource({
        name: 'Drill',
        description: 'Power drill',
        resourceType: 'tool',
        shareMode: 'lend',
        available: true,
        ownerId: 'user1'
      });

      await db.addResource({
        name: 'Bike',
        description: 'Mountain bike',
        resourceType: 'equipment',
        shareMode: 'lend',
        available: true,
        ownerId: 'user2'
      });

      const tools = await browser.getResourcesByType('tool');

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('Drill');
    });
  });

  describe('formatDistance', () => {
    it('should format distances in meters', () => {
      expect(browser.formatDistance(50)).toBe('50m');
      expect(browser.formatDistance(500)).toBe('500m');
    });

    it('should format distances in kilometers', () => {
      expect(browser.formatDistance(1500)).toBe('1.5km');
      expect(browser.formatDistance(5000)).toBe('5.0km');
      expect(browser.formatDistance(15000)).toBe('15km');
    });
  });
});
