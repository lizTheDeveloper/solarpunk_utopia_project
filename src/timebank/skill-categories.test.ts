/**
 * Tests for Skill Categories Management
 * REQ-TIME-009: Skill Taxonomy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import { createSkillOffer } from './skill-offer';
import {
  defineCategory,
  updateCategoryDefinition,
  getCategoryDefinition,
  getCategoryByName,
  getAllCategoryDefinitions,
  getUndefinedCategories,
  getRelatedCategories,
  searchCategories,
  formatCategoryForDisplay,
  formatCategoriesListDetailed,
  formatUndefinedCategories,
  suggestCategoriesForSkill
} from './skill-categories';

describe('Skill Categories Management', () => {
  beforeEach(async () => {
    // Reset database before each test
    await db.reset();

    // Create some skill offers with categories for testing
    await createSkillOffer({
      userId: 'user-alice',
      skillName: 'Bicycle Repair',
      description: 'I can fix flat tires, adjust brakes, tune up bikes',
      categories: ['repair', 'transportation']
    });

    await createSkillOffer({
      userId: 'user-bob',
      skillName: 'Computer Repair',
      description: 'Fix laptops and desktops',
      categories: ['repair', 'technology']
    });

    await createSkillOffer({
      userId: 'user-charlie',
      skillName: 'Garden Planning',
      description: 'Help design permaculture gardens',
      categories: ['gardening', 'education']
    });

    await createSkillOffer({
      userId: 'user-diana',
      skillName: 'Sourdough Baking',
      description: 'Teach sourdough bread making',
      categories: ['cooking', 'education']
    });
  });

  describe('defineCategory', () => {
    it('should create a new category definition', async () => {
      const category = await defineCategory({
        name: 'Repair',
        description: 'Skills related to fixing and maintaining items',
        createdBy: 'user-alice',
        examples: ['bicycle repair', 'computer repair', 'appliance repair'],
        relatedCategories: ['maintenance', 'diy']
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('repair'); // Should be normalized to lowercase
      expect(category.description).toBe('Skills related to fixing and maintaining items');
      expect(category.createdBy).toBe('user-alice');
      expect(category.examples).toContain('bicycle repair');
      expect(category.relatedCategories).toContain('maintenance');
      expect(category.createdAt).toBeDefined();
      expect(category.updatedAt).toBeDefined();
    });

    it('should normalize category name to lowercase', async () => {
      const category = await defineCategory({
        name: 'GARDENING',
        description: 'Growing plants and food',
        createdBy: 'user-bob'
      });

      expect(category.name).toBe('gardening');
    });

    it('should throw error if name is missing', async () => {
      await expect(
        defineCategory({
          name: '',
          description: 'Test description',
          createdBy: 'user-alice'
        })
      ).rejects.toThrow('Category name is required');
    });

    it('should throw error if description is missing', async () => {
      await expect(
        defineCategory({
          name: 'test',
          description: '',
          createdBy: 'user-alice'
        })
      ).rejects.toThrow('Category description is required');
    });

    it('should handle categories without examples or related categories', async () => {
      const category = await defineCategory({
        name: 'test',
        description: 'Test category',
        createdBy: 'user-alice'
      });

      expect(category.examples).toEqual([]);
      expect(category.relatedCategories).toEqual([]);
    });
  });

  describe('updateCategoryDefinition', () => {
    it('should update category description', async () => {
      const category = await defineCategory({
        name: 'repair',
        description: 'Original description',
        createdBy: 'user-alice'
      });

      await updateCategoryDefinition(category.id, {
        description: 'Updated description'
      });

      const updated = getCategoryDefinition(category.id);
      expect(updated?.description).toBe('Updated description');
    });

    it('should update examples', async () => {
      const category = await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice',
        examples: ['bike repair']
      });

      await updateCategoryDefinition(category.id, {
        examples: ['bike repair', 'computer repair', 'appliance repair']
      });

      const updated = getCategoryDefinition(category.id);
      expect(updated?.examples).toHaveLength(3);
      expect(updated?.examples).toContain('computer repair');
    });

    it('should throw error if category not found', async () => {
      await expect(
        updateCategoryDefinition('nonexistent-id', {
          description: 'Test'
        })
      ).rejects.toThrow('Category not found');
    });
  });

  describe('getCategoryByName', () => {
    it('should retrieve category by name', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      const category = getCategoryByName('repair');
      expect(category).toBeDefined();
      expect(category?.name).toBe('repair');
    });

    it('should be case-insensitive', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      const category = getCategoryByName('REPAIR');
      expect(category).toBeDefined();
      expect(category?.name).toBe('repair');
    });

    it('should return undefined for non-existent category', () => {
      const category = getCategoryByName('nonexistent');
      expect(category).toBeUndefined();
    });
  });

  describe('getAllCategoryDefinitions', () => {
    it('should return all category definitions', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      await defineCategory({
        name: 'gardening',
        description: 'Growing plants',
        createdBy: 'user-bob'
      });

      const categories = getAllCategoryDefinitions();
      expect(categories.length).toBeGreaterThanOrEqual(2);
    });

    it('should include usage counts from actual skills', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      const categories = getAllCategoryDefinitions();
      const repairCategory = categories.find(c => c.name === 'repair');

      // We created 2 skills with 'repair' category in beforeEach
      expect(repairCategory?.usageCount).toBeGreaterThanOrEqual(1);
    });

    it('should sort by usage count descending', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      await defineCategory({
        name: 'gardening',
        description: 'Growing plants',
        createdBy: 'user-bob'
      });

      const categories = getAllCategoryDefinitions();

      // Check sorting (repair has 2 skills, gardening has 1)
      for (let i = 0; i < categories.length - 1; i++) {
        expect(categories[i].usageCount).toBeGreaterThanOrEqual(categories[i + 1].usageCount);
      }
    });
  });

  describe('getUndefinedCategories', () => {
    it('should identify categories used in skills but not defined', () => {
      // Skills were created in beforeEach with categories:
      // 'repair', 'transportation', 'technology', 'gardening', 'education', 'cooking'
      // But no category definitions exist yet

      const undefined = getUndefinedCategories();

      expect(undefined.length).toBeGreaterThan(0);
      const categoryNames = undefined.map(c => c.name);
      expect(categoryNames).toContain('repair');
      expect(categoryNames).toContain('gardening');
    });

    it('should not include defined categories', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      const undefined = getUndefinedCategories();
      const categoryNames = undefined.map(c => c.name);

      expect(categoryNames).not.toContain('repair');
    });

    it('should include usage counts', () => {
      const undefined = getUndefinedCategories();

      const repair = undefined.find(c => c.name === 'repair');
      // We have skills with 'repair' category
      expect(repair?.count).toBeGreaterThanOrEqual(1);
    });

    it('should sort by usage count descending', () => {
      const undefined = getUndefinedCategories();

      for (let i = 0; i < undefined.length - 1; i++) {
        expect(undefined[i].count).toBeGreaterThanOrEqual(undefined[i + 1].count);
      }
    });

    it('should return empty array when all categories are defined', async () => {
      // Define all categories used in skills
      await defineCategory({ name: 'repair', description: 'Repair', createdBy: 'user-alice' });
      await defineCategory({ name: 'transportation', description: 'Transport', createdBy: 'user-alice' });
      await defineCategory({ name: 'technology', description: 'Tech', createdBy: 'user-alice' });
      await defineCategory({ name: 'gardening', description: 'Garden', createdBy: 'user-alice' });
      await defineCategory({ name: 'education', description: 'Teach', createdBy: 'user-alice' });
      await defineCategory({ name: 'cooking', description: 'Cook', createdBy: 'user-alice' });

      const undefined = getUndefinedCategories();
      expect(undefined.length).toBe(0);
    });
  });

  describe('getRelatedCategories', () => {
    it('should return related categories', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice',
        relatedCategories: ['maintenance', 'diy']
      });

      await defineCategory({
        name: 'maintenance',
        description: 'Maintaining items',
        createdBy: 'user-bob'
      });

      await defineCategory({
        name: 'diy',
        description: 'Do it yourself',
        createdBy: 'user-charlie'
      });

      const related = getRelatedCategories('repair');
      expect(related.length).toBe(2);
      const names = related.map(c => c.name);
      expect(names).toContain('maintenance');
      expect(names).toContain('diy');
    });

    it('should return empty array if no related categories', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      const related = getRelatedCategories('repair');
      expect(related).toEqual([]);
    });

    it('should return empty array for non-existent category', () => {
      const related = getRelatedCategories('nonexistent');
      expect(related).toEqual([]);
    });
  });

  describe('searchCategories', () => {
    it('should search by name', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Fixing things',
        createdBy: 'user-alice'
      });

      await defineCategory({
        name: 'gardening',
        description: 'Growing plants',
        createdBy: 'user-bob'
      });

      const results = searchCategories('repair');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('repair');
    });

    it('should search by description', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Fixing broken items',
        createdBy: 'user-alice'
      });

      const results = searchCategories('broken');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('repair');
    });

    it('should search by examples', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Fixing things',
        createdBy: 'user-alice',
        examples: ['bicycle repair', 'appliance repair']
      });

      const results = searchCategories('bicycle');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('repair');
    });

    it('should be case-insensitive', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Fixing things',
        createdBy: 'user-alice'
      });

      const results = searchCategories('REPAIR');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for no matches', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Fixing things',
        createdBy: 'user-alice'
      });

      const results = searchCategories('zzz-nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('formatCategoryForDisplay', () => {
    it('should format category with all fields', async () => {
      const category = await defineCategory({
        name: 'repair',
        description: 'Skills related to fixing and maintaining items',
        createdBy: 'user-alice',
        examples: ['bicycle repair', 'computer repair'],
        relatedCategories: ['maintenance', 'diy']
      });

      // Update usage count to match actual skills
      category.usageCount = 2;

      const formatted = formatCategoryForDisplay(category);

      expect(formatted).toContain('repair');
      expect(formatted).toContain('Skills related to fixing and maintaining items');
      expect(formatted).toContain('bicycle repair');
      expect(formatted).toContain('computer repair');
      expect(formatted).toContain('maintenance');
      expect(formatted).toContain('diy');
      expect(formatted).toContain('2 skills');
    });

    it('should handle singular "skill" for count of 1', async () => {
      const category = await defineCategory({
        name: 'test',
        description: 'Test category',
        createdBy: 'user-alice'
      });

      category.usageCount = 1;

      const formatted = formatCategoryForDisplay(category);
      expect(formatted).toContain('1 skill');
      expect(formatted).not.toContain('1 skills');
    });

    it('should handle categories without examples or related', async () => {
      const category = await defineCategory({
        name: 'test',
        description: 'Test category',
        createdBy: 'user-alice'
      });

      const formatted = formatCategoryForDisplay(category);
      expect(formatted).toContain('test');
      expect(formatted).toContain('Test category');
    });
  });

  describe('formatCategoriesListDetailed', () => {
    it('should format multiple categories', async () => {
      const cat1 = await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      const cat2 = await defineCategory({
        name: 'gardening',
        description: 'Growing plants',
        createdBy: 'user-bob'
      });

      const formatted = formatCategoriesListDetailed([cat1, cat2]);

      expect(formatted).toContain('repair');
      expect(formatted).toContain('gardening');
      expect(formatted).toContain('1.');
      expect(formatted).toContain('2.');
    });

    it('should show message when no categories', () => {
      const formatted = formatCategoriesListDetailed([]);
      expect(formatted).toContain('No categories defined yet');
      expect(formatted).toContain('🌻');
    });
  });

  describe('formatUndefinedCategories', () => {
    it('should format undefined categories with counts', () => {
      const undefined = getUndefinedCategories();

      const formatted = formatUndefinedCategories(undefined);

      expect(formatted).toContain('Emerging Categories');
      expect(formatted).toContain('repair');
      expect(formatted).toContain('needs definition');
    });

    it('should show success message when all defined', async () => {
      // Define all categories
      await defineCategory({ name: 'repair', description: 'Repair', createdBy: 'user-alice' });
      await defineCategory({ name: 'transportation', description: 'Transport', createdBy: 'user-alice' });
      await defineCategory({ name: 'technology', description: 'Tech', createdBy: 'user-alice' });
      await defineCategory({ name: 'gardening', description: 'Garden', createdBy: 'user-alice' });
      await defineCategory({ name: 'education', description: 'Teach', createdBy: 'user-alice' });
      await defineCategory({ name: 'cooking', description: 'Cook', createdBy: 'user-alice' });

      const undefined = getUndefinedCategories();
      const formatted = formatUndefinedCategories(undefined);

      expect(formatted).toContain('All categories in use have been defined');
      expect(formatted).toContain('✅');
    });
  });

  describe('suggestCategoriesForSkill', () => {
    it('should suggest categories based on skill name', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Fixing things',
        createdBy: 'user-alice',
        examples: ['bike', 'computer']
      });

      const suggestions = suggestCategoriesForSkill('Bicycle Repair', 'Fix bikes');

      expect(suggestions).toContain('repair');
    });

    it('should suggest categories based on description', async () => {
      await defineCategory({
        name: 'gardening',
        description: 'Growing plants',
        createdBy: 'user-alice',
        examples: ['vegetables', 'permaculture']
      });

      const suggestions = suggestCategoriesForSkill('Garden Design', 'Design permaculture gardens');

      expect(suggestions).toContain('gardening');
    });

    it('should match example keywords', async () => {
      await defineCategory({
        name: 'cooking',
        description: 'Food preparation',
        createdBy: 'user-alice',
        examples: ['baking', 'sourdough', 'fermentation']
      });

      const suggestions = suggestCategoriesForSkill('Sourdough Starter', 'Teaching bread making');

      expect(suggestions).toContain('cooking');
    });

    it('should limit suggestions to 5', async () => {
      // Create many categories that might match
      for (let i = 0; i < 10; i++) {
        await defineCategory({
          name: `category-${i}`,
          description: 'test test test',
          createdBy: 'user-alice',
          examples: ['test']
        });
      }

      const suggestions = suggestCategoriesForSkill('test', 'test test test');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array when no matches', async () => {
      await defineCategory({
        name: 'repair',
        description: 'Fixing things',
        createdBy: 'user-alice'
      });

      const suggestions = suggestCategoriesForSkill('Unique Skill', 'Very unique description');
      expect(suggestions).toEqual([]);
    });
  });

  describe('Gift Economy Principles', () => {
    it('should not track or enforce any hierarchies', async () => {
      const category = await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      const formatted = formatCategoryForDisplay(category);

      // Should NOT contain competitive or hierarchical language
      expect(formatted.toLowerCase()).not.toContain('rank');
      expect(formatted.toLowerCase()).not.toContain('level');
      expect(formatted.toLowerCase()).not.toContain('expert');
      expect(formatted.toLowerCase()).not.toContain('beginner');
    });

    it('should focus on abundance and community definition', async () => {
      const categories = getAllCategoryDefinitions();
      const undefined = getUndefinedCategories();

      const formattedDefined = formatCategoriesListDetailed(categories);
      const formattedUndefined = formatUndefinedCategories(undefined);

      // Should focus on community and organic growth
      expect(formattedUndefined).toContain('Emerging');
      expect(formattedDefined).toContain('organic');
    });
  });

  describe('Community-Defined Taxonomy', () => {
    it('should allow anyone to define categories', async () => {
      // Different users can define categories
      const cat1 = await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice'
      });

      const cat2 = await defineCategory({
        name: 'gardening',
        description: 'Growing plants',
        createdBy: 'user-bob'
      });

      expect(cat1.createdBy).toBe('user-alice');
      expect(cat2.createdBy).toBe('user-bob');
    });

    it('should track which categories emerge from practice', () => {
      // Categories are used in skills before being formally defined
      const undefined = getUndefinedCategories();

      // These categories emerged organically from skill offers
      expect(undefined.length).toBeGreaterThan(0);
    });

    it('should support related/overlapping categories', async () => {
      const category = await defineCategory({
        name: 'repair',
        description: 'Repair skills',
        createdBy: 'user-alice',
        relatedCategories: ['maintenance', 'diy', 'troubleshooting']
      });

      // Categories can overlap and relate, not a rigid hierarchy
      expect(category.relatedCategories).toHaveLength(3);
    });
  });
});
