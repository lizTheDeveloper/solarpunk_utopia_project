/**
 * Tests for Resource Posting
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalDatabase } from '../core/database';
import {
  postResource,
  updateResource,
  markResourceUnavailable,
  markResourceAvailable,
  deleteResource,
  getMyResources,
  getResource,
  getAvailableResources,
  getResourcesByType,
  getResourcesByShareMode,
  searchResourcesByTags,
  searchResources,
  type PostResourceOptions,
} from './resource-posting';

describe('Resource Posting - REQ-SHARE-001', () => {
  let testDb: LocalDatabase;
  const testUserId = 'test-user-123';
  const testUserId2 = 'test-user-456';

  beforeEach(async () => {
    // Create fresh test database
    testDb = new LocalDatabase('test-resource-posting');
    await testDb.init();

    // Replace global db with test db
    const dbModule = await import('../core/database');
    (dbModule as any).db = testDb;
  });

  describe('postResource', () => {
    it('should create a new resource with required fields', async () => {
      const options: PostResourceOptions = {
        name: 'Bread maker',
        description: 'Barely used bread maker, works great!',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
      };

      const resource = await postResource(options);

      expect(resource.id).toBeDefined();
      expect(resource.name).toBe('Bread maker');
      expect(resource.description).toBe('Barely used bread maker, works great!');
      expect(resource.resourceType).toBe('tool');
      expect(resource.shareMode).toBe('give');
      expect(resource.ownerId).toBe(testUserId);
      expect(resource.available).toBe(true);
      expect(resource.createdAt).toBeDefined();
      expect(resource.updatedAt).toBeDefined();
    });

    it('should create a resource with optional fields', async () => {
      const options: PostResourceOptions = {
        name: 'Garden tools',
        description: 'Shovel, rake, and hoe',
        resourceType: 'tool',
        shareMode: 'lend',
        ownerId: testUserId,
        location: '123 Main St, Community Garden',
        photos: ['photo1.jpg', 'photo2.jpg'],
        tags: ['gardening', 'tools', 'outdoor'],
      };

      const resource = await postResource(options);

      expect(resource.location).toBe('123 Main St, Community Garden');
      expect(resource.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
      expect(resource.tags).toEqual(['gardening', 'tools', 'outdoor']);
    });

    it('should sanitize user-provided content to prevent XSS', async () => {
      const options: PostResourceOptions = {
        name: '<script>alert("xss")</script>Chair',
        description: 'Comfy <img src=x onerror=alert(1)>chair',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
        tags: ['<script>tag</script>'],
      };

      const resource = await postResource(options);

      // Content should be sanitized
      expect(resource.name).not.toContain('<script>');
      expect(resource.description).not.toContain('onerror=');
      expect(resource.tags?.[0]).not.toContain('<script>');
    });

    it('should reject empty name', async () => {
      const options: PostResourceOptions = {
        name: '',
        description: 'A description',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
      };

      await expect(postResource(options)).rejects.toThrow('Resource name is required');
    });

    it('should reject empty description', async () => {
      const options: PostResourceOptions = {
        name: 'Something',
        description: '',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
      };

      await expect(postResource(options)).rejects.toThrow('Resource description is required');
    });

    it('should reject invalid owner ID', async () => {
      const options: PostResourceOptions = {
        name: 'Something',
        description: 'A description',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: '<script>alert("xss")</script>',
      };

      await expect(postResource(options)).rejects.toThrow('Invalid owner ID');
    });
  });

  describe('updateResource', () => {
    it('should update resource fields', async () => {
      const resource = await postResource({
        name: 'Old name',
        description: 'Old description',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
      });

      await updateResource(resource.id, {
        name: 'New name',
        description: 'New description',
        tags: ['updated', 'test'],
      });

      const updated = getResource(resource.id);
      expect(updated?.name).toBe('New name');
      expect(updated?.description).toBe('New description');
      expect(updated?.tags).toEqual(['updated', 'test']);
    });

    it('should sanitize updated content', async () => {
      const resource = await postResource({
        name: 'Original',
        description: 'Original description',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
      });

      await updateResource(resource.id, {
        name: '<script>alert("xss")</script>Hacked',
      });

      const updated = getResource(resource.id);
      expect(updated?.name).not.toContain('<script>');
    });

    it('should reject invalid resource ID', async () => {
      await expect(updateResource('<script>bad</script>', { name: 'Test' }))
        .rejects.toThrow('Invalid resource ID');
    });

    it('should handle non-existent resource', async () => {
      await expect(updateResource('non-existent-id', { name: 'Test' }))
        .rejects.toThrow('Resource not found');
    });
  });

  describe('markResourceUnavailable/Available', () => {
    it('should mark resource as unavailable', async () => {
      const resource = await postResource({
        name: 'Item',
        description: 'Description',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
      });

      expect(resource.available).toBe(true);

      await markResourceUnavailable(resource.id);

      const updated = getResource(resource.id);
      expect(updated?.available).toBe(false);
    });

    it('should mark resource as available again', async () => {
      const resource = await postResource({
        name: 'Item',
        description: 'Description',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
      });

      await markResourceUnavailable(resource.id);
      await markResourceAvailable(resource.id);

      const updated = getResource(resource.id);
      expect(updated?.available).toBe(true);
    });
  });

  describe('deleteResource', () => {
    it('should delete a resource', async () => {
      const resource = await postResource({
        name: 'Item to delete',
        description: 'Will be deleted',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
      });

      expect(getResource(resource.id)).toBeDefined();

      await deleteResource(resource.id);

      expect(getResource(resource.id)).toBeUndefined();
    });

    it('should reject invalid resource ID', async () => {
      await expect(deleteResource('<script>bad</script>'))
        .rejects.toThrow('Invalid resource ID');
    });
  });

  describe('getMyResources', () => {
    it('should return only resources owned by user', async () => {
      await postResource({
        name: 'My item 1',
        description: 'Mine',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
      });

      await postResource({
        name: 'My item 2',
        description: 'Also mine',
        resourceType: 'tool',
        shareMode: 'lend',
        ownerId: testUserId,
      });

      await postResource({
        name: 'Someone elses item',
        description: 'Not mine',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId2,
      });

      const myResources = getMyResources(testUserId);

      expect(myResources).toHaveLength(2);
      expect(myResources.every(r => r.ownerId === testUserId)).toBe(true);
    });

    it('should return empty array for invalid user ID', () => {
      const resources = getMyResources('<script>bad</script>');
      expect(resources).toEqual([]);
    });
  });

  describe('getAvailableResources', () => {
    it('should return only available resources', async () => {
      const r1 = await postResource({
        name: 'Available item',
        description: 'This is available',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
      });

      const r2 = await postResource({
        name: 'Unavailable item',
        description: 'This is not available',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
      });

      await markResourceUnavailable(r2.id);

      const available = getAvailableResources();

      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(r1.id);
    });
  });

  describe('getResourcesByType', () => {
    it('should filter resources by type', async () => {
      await postResource({
        name: 'Tool 1',
        description: 'A tool',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
      });

      await postResource({
        name: 'Tool 2',
        description: 'Another tool',
        resourceType: 'tool',
        shareMode: 'lend',
        ownerId: testUserId,
      });

      await postResource({
        name: 'Food item',
        description: 'Some food',
        resourceType: 'food',
        shareMode: 'give',
        ownerId: testUserId,
      });

      const tools = getResourcesByType('tool');

      expect(tools).toHaveLength(2);
      expect(tools.every(r => r.resourceType === 'tool')).toBe(true);
    });
  });

  describe('getResourcesByShareMode', () => {
    it('should filter resources by share mode', async () => {
      await postResource({
        name: 'Item to give',
        description: 'Free to a good home',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
      });

      await postResource({
        name: 'Item to lend',
        description: 'Borrow and return',
        resourceType: 'other',
        shareMode: 'lend',
        ownerId: testUserId,
      });

      const toGive = getResourcesByShareMode('give');

      expect(toGive).toHaveLength(1);
      expect(toGive[0].shareMode).toBe('give');
    });
  });

  describe('searchResourcesByTags', () => {
    it('should find resources matching tags', async () => {
      await postResource({
        name: 'Garden tool',
        description: 'For gardening',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
        tags: ['garden', 'outdoor', 'tools'],
      });

      await postResource({
        name: 'Kitchen tool',
        description: 'For cooking',
        resourceType: 'tool',
        shareMode: 'give',
        ownerId: testUserId,
        tags: ['kitchen', 'cooking'],
      });

      const gardenItems = searchResourcesByTags(['garden']);

      expect(gardenItems).toHaveLength(1);
      expect(gardenItems[0].name).toBe('Garden tool');
    });

    it('should match any of the provided tags', async () => {
      await postResource({
        name: 'Item 1',
        description: 'First item',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
        tags: ['tag1'],
      });

      await postResource({
        name: 'Item 2',
        description: 'Second item',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
        tags: ['tag2'],
      });

      const results = searchResourcesByTags(['tag1', 'tag2']);

      expect(results).toHaveLength(2);
    });
  });

  describe('searchResources', () => {
    it('should search by keyword in name', async () => {
      await postResource({
        name: 'Bicycle pump',
        description: 'For inflating tires',
        resourceType: 'tool',
        shareMode: 'lend',
        ownerId: testUserId,
      });

      const results = searchResources('bicycle');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bicycle pump');
    });

    it('should search by keyword in description', async () => {
      await postResource({
        name: 'Air pump',
        description: 'Perfect for bicycle tires',
        resourceType: 'tool',
        shareMode: 'lend',
        ownerId: testUserId,
      });

      const results = searchResources('bicycle');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Air pump');
    });

    it('should search by keyword in tags', async () => {
      await postResource({
        name: 'Pump',
        description: 'Inflates things',
        resourceType: 'tool',
        shareMode: 'lend',
        ownerId: testUserId,
        tags: ['bicycle', 'inflation'],
      });

      const results = searchResources('bicycle');

      expect(results).toHaveLength(1);
    });

    it('should be case-insensitive', async () => {
      await postResource({
        name: 'BICYCLE PUMP',
        description: 'For inflating',
        resourceType: 'tool',
        shareMode: 'lend',
        ownerId: testUserId,
      });

      const results = searchResources('bicycle');

      expect(results).toHaveLength(1);
    });

    it('should return empty array for empty search', () => {
      const results = searchResources('');
      expect(results).toEqual([]);
    });
  });

  describe('REQ-SHARE-001 Scenarios', () => {
    it('Scenario: User offers unused items', async () => {
      // GIVEN a user has items they no longer need
      const userId = 'user-with-items';

      // WHEN they post to the buy-nothing section
      const resource = await postResource({
        name: 'Sofa',
        description: 'Comfortable 3-seater sofa, minor wear on cushions. Great for a student apartment!',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: userId,
        location: 'Downtown neighborhood, near park',
        photos: ['sofa-front.jpg', 'sofa-side.jpg'],
        condition: 'good',
        pickupOptions: {
          canDeliver: false,
          canMeetup: true,
          pickupLocation: 'My apartment building lobby',
          pickupInstructions: 'Please bring help to carry - its heavy!',
        },
      });

      // THEN the system creates a listing with all details
      expect(resource.id).toBeDefined();
      expect(resource.name).toBe('Sofa');
      expect(resource.description).toContain('Comfortable 3-seater');
      expect(resource.shareMode).toBe('give');
      expect(resource.location).toContain('Downtown');
      expect(resource.photos).toHaveLength(2);
      expect(resource.available).toBe(true);
    });

    it('Scenario: User searches for needed item', async () => {
      // GIVEN a user needs a particular item
      await postResource({
        name: 'Desk lamp',
        description: 'Adjustable LED desk lamp',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId,
        location: 'East side',
      });

      await postResource({
        name: 'Floor lamp',
        description: 'Tall standing lamp',
        resourceType: 'other',
        shareMode: 'give',
        ownerId: testUserId2,
        location: 'West side',
      });

      // WHEN they search for their need
      const results = searchResources('lamp');

      // THEN the system shows matching available items
      expect(results).toHaveLength(2);
      expect(results.every(r => r.available)).toBe(true);

      // Items include proximity information (location)
      expect(results[0].location).toBeDefined();
    });
  });
});
