/**
 * Tests for Browse Available Skills feature
 * REQ-TIME-003: Browse available skills
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import { createSkillOffer } from './skill-offer';
import {
  browseSkills,
  getCategoriesWithCounts,
  getSkillStatistics,
  formatSkillsList,
  formatCategoriesList,
  formatStatistics,
  suggestSkillsForNeed
} from './browse-skills';

describe('Browse Available Skills', () => {
  beforeEach(async () => {
    // Reset database before each test to ensure clean state
    await db.reset();

    // Create sample skills for testing
    await createSkillOffer({
      userId: 'user-alice',
      skillName: 'Bicycle Repair',
      description: 'I can fix flat tires, adjust brakes, tune up bikes',
      categories: ['repair', 'transportation']
    });

    await createSkillOffer({
      userId: 'user-bob',
      skillName: 'Garden Planning',
      description: 'Help design permaculture gardens',
      categories: ['gardening', 'education']
    });

    await createSkillOffer({
      userId: 'user-charlie',
      skillName: 'Sourdough Baking',
      description: 'Teach sourdough bread making',
      categories: ['cooking', 'education']
    });

    await createSkillOffer({
      userId: 'user-diana',
      skillName: 'Computer Repair',
      description: 'Fix laptops and desktops',
      categories: ['repair', 'technology']
    });
  });

  describe('browseSkills', () => {
    it('should return all available skills by default', () => {
      const result = browseSkills();

      expect(result.skills.length).toBe(4);
      expect(result.total).toBe(4);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by category', () => {
      const result = browseSkills({ category: 'repair' });

      expect(result.skills.length).toBeGreaterThanOrEqual(2);
      expect(result.skills.every(s => s.categories.includes('repair'))).toBe(true);
    });

    it('should search by keyword', () => {
      const result = browseSkills({ searchTerm: 'repair' });

      expect(result.skills.length).toBeGreaterThanOrEqual(2);
    });

    it('should prioritize search over category', () => {
      const result = browseSkills({
        searchTerm: 'Garden Planning',
        category: 'repair' // This should be ignored
      });

      expect(result.skills.length).toBeGreaterThanOrEqual(1);
      expect(result.skills.some(s => s.skillName === 'Garden Planning')).toBe(true);
    });

    it('should sort by newest (default)', () => {
      const result = browseSkills({ sortBy: 'newest' });

      // Check that sorting is applied (most recent first)
      for (let i = 0; i < result.skills.length - 1; i++) {
        expect(result.skills[i].createdAt).toBeGreaterThanOrEqual(result.skills[i + 1].createdAt);
      }
    });

    it('should sort by name', () => {
      const result = browseSkills({ sortBy: 'name' });

      // Check that skills are sorted alphabetically
      for (let i = 0; i < result.skills.length - 1; i++) {
        expect(result.skills[i].skillName.localeCompare(result.skills[i + 1].skillName)).toBeLessThanOrEqual(0);
      }
    });

    it('should handle pagination', () => {
      const page1 = browseSkills({ limit: 2, offset: 0 });
      expect(page1.skills.length).toBe(2);
      expect(page1.limit).toBe(2);
      expect(page1.offset).toBe(0);

      // Check hasMore is correctly calculated
      const allSkills = browseSkills();
      expect(page1.hasMore).toBe(allSkills.total > 2);
    });

    it('should return empty results for unknown category', () => {
      const result = browseSkills({ category: 'nonexistent' });

      expect(result.skills.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should return empty results for non-matching search', () => {
      const result = browseSkills({ searchTerm: 'zzz-nonexistent' });

      expect(result.skills.length).toBe(0);
    });
  });

  describe('getCategoriesWithCounts', () => {
    it('should return all categories with counts', () => {
      const categories = getCategoriesWithCounts();

      expect(categories.length).toBeGreaterThan(0);

      // Find specific categories we created in beforeEach
      const repair = categories.find(c => c.category === 'repair');
      const education = categories.find(c => c.category === 'education');

      // These categories should exist with at least 2 skills each from our test data
      expect(repair?.count).toBeGreaterThanOrEqual(2);
      expect(education?.count).toBeGreaterThanOrEqual(2);
    });

    it('should sort categories by count descending', () => {
      const categories = getCategoriesWithCounts();

      // Check that it's sorted by count
      for (let i = 0; i < categories.length - 1; i++) {
        expect(categories[i].count).toBeGreaterThanOrEqual(categories[i + 1].count);
      }
    });

    it('should handle empty category list', () => {
      // Test with empty input
      const formatted = formatCategoriesList([]);
      expect(formatted).toContain('No categories yet');
    });
  });

  describe('getSkillStatistics', () => {
    it('should return correct statistics', () => {
      const stats = getSkillStatistics();

      // We created 4 skills in beforeEach, but there may be more from other tests
      expect(stats.totalSkills).toBeGreaterThanOrEqual(4);
      expect(stats.totalCategories).toBeGreaterThan(0);
      expect(stats.topCategories.length).toBeGreaterThan(0);
      expect(stats.recentlyAdded.length).toBeGreaterThan(0);
    });

    it('should limit recently added to 5', async () => {
      // Add more skills
      for (let i = 0; i < 10; i++) {
        await createSkillOffer({
          userId: `user-${i}`,
          skillName: `Skill ${i}`,
          description: 'Test skill',
          categories: ['test']
        });
      }

      const stats = getSkillStatistics();
      expect(stats.recentlyAdded.length).toBe(5);
    });

    it('should limit top categories to 5', async () => {
      // Add skills in many categories
      for (let i = 0; i < 10; i++) {
        await createSkillOffer({
          userId: `user-${i}`,
          skillName: `Skill ${i}`,
          description: 'Test skill',
          categories: [`category-${i}`]
        });
      }

      const stats = getSkillStatistics();
      expect(stats.topCategories.length).toBeLessThanOrEqual(5);
    });
  });

  describe('formatSkillsList', () => {
    it('should format skills for display', () => {
      const result = browseSkills({ limit: 2 });
      const formatted = formatSkillsList(result.skills);

      expect(formatted).toContain('💡');
      expect(formatted).toContain('🏷️');
      expect(formatted).toContain('✅ Available');
    });

    it('should show message when no skills found', () => {
      const formatted = formatSkillsList([]);

      expect(formatted).toContain('No skills found');
      expect(formatted).toContain('🌻');
    });

    it('should number the skills', () => {
      const result = browseSkills({ limit: 2 });
      const formatted = formatSkillsList(result.skills);

      expect(formatted).toContain('1.');
      expect(formatted).toContain('2.');
    });
  });

  describe('formatCategoriesList', () => {
    it('should format categories with counts', () => {
      const categories = getCategoriesWithCounts();
      const formatted = formatCategoriesList(categories);

      expect(formatted).toContain('🏷️');
      expect(formatted).toContain('repair');
      expect(formatted).toContain('skills');
    });

    it('should handle singular "skill" for count of 1', async () => {
      await db.reset(); // Reset again for this specific test

      await createSkillOffer({
        userId: 'user-test',
        skillName: 'Test Skill',
        description: 'Test',
        categories: ['unique-category']
      });

      const categories = getCategoriesWithCounts();
      const formatted = formatCategoriesList(categories);

      expect(formatted).toContain('(1 skill)');
    });

    it('should show message when no categories exist', () => {
      const formatted = formatCategoriesList([]);

      expect(formatted).toContain('No categories yet');
      expect(formatted).toContain('🌻');
    });
  });

  describe('formatStatistics', () => {
    it('should format statistics for display', () => {
      const stats = getSkillStatistics();
      const formatted = formatStatistics(stats);

      expect(formatted).toContain('Community Skills Overview');
      expect(formatted).toContain('Total Skills Offered');
      expect(formatted).toContain('Top Categories');
      expect(formatted).toContain('Recently Added');
    });

    it('should include actual numbers', () => {
      const stats = getSkillStatistics();
      const formatted = formatStatistics(stats);

      expect(formatted).toContain('4'); // Total skills
    });
  });

  describe('suggestSkillsForNeed', () => {
    it('should suggest relevant skills based on need', () => {
      const suggestions = suggestSkillsForNeed('Bicycle');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].skillName).toContain('Bicycle');
    });

    it('should return empty array for non-matching need', () => {
      const suggestions = suggestSkillsForNeed('zzz-nonexistent-need');

      expect(suggestions.length).toBe(0);
    });

    it('should handle various phrasings of needs', () => {
      const suggestions = suggestSkillsForNeed('Garden');

      expect(suggestions.length).toBeGreaterThan(0);
      const hasGardenSkill = suggestions.some(s =>
        s.skillName.toLowerCase().includes('garden') ||
        s.categories.some(c => c.toLowerCase().includes('garden'))
      );
      expect(hasGardenSkill).toBe(true);
    });
  });

  describe('Gift Economy Principles', () => {
    it('should not track or display any debt information', () => {
      const result = browseSkills();
      const formatted = formatSkillsList(result.skills);

      // Should NOT contain debt-related language
      expect(formatted.toLowerCase()).not.toContain('owe');
      expect(formatted.toLowerCase()).not.toContain('debt');
      expect(formatted.toLowerCase()).not.toContain('balance');
      expect(formatted.toLowerCase()).not.toContain('credit');
    });

    it('should focus on abundance and availability', () => {
      const stats = getSkillStatistics();
      const formatted = formatStatistics(stats);

      // Should focus on positive, abundance-focused language
      expect(formatted).toContain('Total Skills');
      expect(formatted).toContain('Overview');
    });
  });

  describe('Offline-First Compatibility', () => {
    it('should work with only local data', () => {
      // All operations should work without network calls
      const result = browseSkills();
      expect(result).toBeDefined();

      const categories = getCategoriesWithCounts();
      expect(categories).toBeDefined();

      const stats = getSkillStatistics();
      expect(stats).toBeDefined();
    });
  });
});
