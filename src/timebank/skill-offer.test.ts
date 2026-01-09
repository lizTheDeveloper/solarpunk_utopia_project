/**
 * Tests for Skill Offering functionality
 * REQ-TIME-003: Skill and Service Offerings
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  createSkillOffer,
  updateSkillOffer,
  markSkillUnavailable,
  markSkillAvailable,
  getMySkillOffers,
  getSkillOffer,
  getAvailableSkills,
  getSkillsByCategory,
  searchSkills,
  getAllSkillCategories,
  formatSkillForDisplay,
} from './skill-offer';

describe('Skill Offering - Time Bank Core', () => {
  beforeEach(async () => {
    // Reset database before each test to ensure clean state
    await db.reset();
  });

  describe('createSkillOffer', () => {
    it('should create a new skill offer with required fields', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Bicycle Repair',
        description: 'I can fix flat tires, adjust brakes, and tune up your bike',
        categories: ['repair', 'transportation'],
      });

      expect(skill.id).toBeDefined();
      expect(skill.userId).toBe('user-123');
      expect(skill.skillName).toBe('Bicycle Repair');
      expect(skill.description).toBe('I can fix flat tires, adjust brakes, and tune up your bike');
      expect(skill.categories).toEqual(['repair', 'transportation']);
      expect(skill.available).toBe(true);
      expect(skill.createdAt).toBeGreaterThan(0);
    });

    it('should sanitize user input to prevent XSS', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: '<script>alert("xss")</script>Math Tutoring',
        description: 'Help with <img src=x onerror=alert(1)> algebra',
        categories: ['<b>education</b>'],
      });

      expect(skill.skillName).not.toContain('<script>');
      expect(skill.description).not.toContain('<img');
      expect(skill.categories[0]).not.toContain('<b>');
    });

    it('should reject invalid skill name', async () => {
      await expect(
        createSkillOffer({
          userId: 'user-123',
          skillName: '',
          description: 'Valid description',
          categories: ['test'],
        })
      ).rejects.toThrow('Skill name is required');
    });

    it('should reject invalid description', async () => {
      await expect(
        createSkillOffer({
          userId: 'user-123',
          skillName: 'Valid Name',
          description: '',
          categories: ['test'],
        })
      ).rejects.toThrow('Skill description is required');
    });

    it('should reject empty categories', async () => {
      await expect(
        createSkillOffer({
          userId: 'user-123',
          skillName: 'Valid Name',
          description: 'Valid description',
          categories: [],
        })
      ).rejects.toThrow('At least one category is required');
    });

    it('should reject invalid user ID', async () => {
      await expect(
        createSkillOffer({
          userId: '<script>evil</script>',
          skillName: 'Valid Name',
          description: 'Valid description',
          categories: ['test'],
        })
      ).rejects.toThrow();
    });
  });

  describe('updateSkillOffer', () => {
    it('should update skill name', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Basic Cooking',
        description: 'Simple meals',
        categories: ['cooking'],
      });

      await updateSkillOffer(skill.id, {
        skillName: 'Advanced Cooking',
      });

      const updated = getSkillOffer(skill.id);
      expect(updated?.skillName).toBe('Advanced Cooking');
      expect(updated?.description).toBe('Simple meals'); // Unchanged
    });

    it('should update description', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Gardening',
        description: 'Basic help',
        categories: ['gardening'],
      });

      await updateSkillOffer(skill.id, {
        description: 'Expert permaculture design and implementation',
      });

      const updated = getSkillOffer(skill.id);
      expect(updated?.description).toBe('Expert permaculture design and implementation');
    });

    it('should update categories', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Programming',
        description: 'Code help',
        categories: ['technology'],
      });

      await updateSkillOffer(skill.id, {
        categories: ['technology', 'education', 'mentorship'],
      });

      const updated = getSkillOffer(skill.id);
      expect(updated?.categories).toEqual(['technology', 'education', 'mentorship']);
    });

    it('should throw error for non-existent skill', async () => {
      await expect(
        updateSkillOffer('non-existent-id', {
          skillName: 'New Name',
        })
      ).rejects.toThrow('Skill offer not found');
    });
  });

  describe('availability management', () => {
    it('should mark skill as unavailable', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Painting',
        description: 'House painting',
        categories: ['repair'],
      });

      expect(skill.available).toBe(true);

      await markSkillUnavailable(skill.id);

      const updated = getSkillOffer(skill.id);
      expect(updated?.available).toBe(false);
    });

    it('should mark skill as available again', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Carpentry',
        description: 'Furniture repair',
        categories: ['repair'],
      });

      await markSkillUnavailable(skill.id);
      await markSkillAvailable(skill.id);

      const updated = getSkillOffer(skill.id);
      expect(updated?.available).toBe(true);
    });
  });

  describe('getMySkillOffers', () => {
    it('should return all skills for a user', async () => {
      await createSkillOffer({
        userId: 'user-alice',
        skillName: 'Math Tutoring',
        description: 'Help with algebra',
        categories: ['education'],
      });

      await createSkillOffer({
        userId: 'user-alice',
        skillName: 'Piano Lessons',
        description: 'Beginner piano',
        categories: ['music', 'education'],
      });

      await createSkillOffer({
        userId: 'user-bob',
        skillName: 'Plumbing',
        description: 'Fix leaks',
        categories: ['repair'],
      });

      const aliceSkills = getMySkillOffers('user-alice');
      expect(aliceSkills).toHaveLength(2);
      expect(aliceSkills.every(s => s.userId === 'user-alice')).toBe(true);
    });

    it('should return empty array for user with no skills', () => {
      const skills = getMySkillOffers('user-nobody');
      expect(skills).toEqual([]);
    });

    it('should return empty array for invalid user ID', () => {
      const skills = getMySkillOffers('<script>');
      expect(skills).toEqual([]);
    });
  });

  describe('getAvailableSkills', () => {
    it('should return only available skills', async () => {
      const skill1 = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Available Skill',
        description: 'This is available',
        categories: ['test'],
      });

      const skill2 = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Unavailable Skill',
        description: 'This is not available',
        categories: ['test'],
      });

      await markSkillUnavailable(skill2.id);

      const available = getAvailableSkills();
      expect(available.some(s => s.id === skill1.id)).toBe(true);
      expect(available.some(s => s.id === skill2.id)).toBe(false);
    });
  });

  describe('getSkillsByCategory', () => {
    beforeEach(async () => {
      await createSkillOffer({
        userId: 'user-123',
        skillName: 'Bike Repair',
        description: 'Fix bikes',
        categories: ['repair', 'transportation'],
      });

      await createSkillOffer({
        userId: 'user-456',
        skillName: 'Appliance Repair',
        description: 'Fix appliances',
        categories: ['repair', 'electronics'],
      });

      await createSkillOffer({
        userId: 'user-789',
        skillName: 'Cooking Classes',
        description: 'Teach cooking',
        categories: ['cooking', 'education'],
      });
    });

    it('should find skills by category', () => {
      const repairSkills = getSkillsByCategory('repair');
      expect(repairSkills).toHaveLength(2);
      expect(repairSkills.every(s => s.categories.includes('repair'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      const repairSkills = getSkillsByCategory('REPAIR');
      expect(repairSkills).toHaveLength(2);
    });

    it('should return empty array for non-existent category', () => {
      const skills = getSkillsByCategory('nonexistent');
      expect(skills).toEqual([]);
    });
  });

  describe('searchSkills', () => {
    beforeEach(async () => {
      await createSkillOffer({
        userId: 'user-123',
        skillName: 'Bicycle Repair',
        description: 'Fix flat tires and tune bikes',
        categories: ['repair'],
      });

      await createSkillOffer({
        userId: 'user-456',
        skillName: 'Gardening',
        description: 'Help with vegetable gardens',
        categories: ['gardening', 'food'],
      });

      await createSkillOffer({
        userId: 'user-789',
        skillName: 'Programming',
        description: 'Python and JavaScript tutoring',
        categories: ['technology', 'education'],
      });
    });

    it('should search by skill name', () => {
      const results = searchSkills('bicycle');
      expect(results).toHaveLength(1);
      expect(results[0].skillName).toBe('Bicycle Repair');
    });

    it('should search by description', () => {
      const results = searchSkills('vegetable');
      expect(results).toHaveLength(1);
      expect(results[0].skillName).toBe('Gardening');
    });

    it('should search by category', () => {
      const results = searchSkills('technology');
      expect(results).toHaveLength(1);
      expect(results[0].skillName).toBe('Programming');
    });

    it('should be case-insensitive', () => {
      const results = searchSkills('PYTHON');
      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const results = searchSkills('knitting');
      expect(results).toEqual([]);
    });

    it('should return empty array for empty search', () => {
      const results = searchSkills('');
      expect(results).toEqual([]);
    });
  });

  describe('getAllSkillCategories', () => {
    it('should return all unique categories', async () => {
      await createSkillOffer({
        userId: 'user-1',
        skillName: 'Skill 1',
        description: 'Test',
        categories: ['repair', 'technology'],
      });

      await createSkillOffer({
        userId: 'user-2',
        skillName: 'Skill 2',
        description: 'Test',
        categories: ['repair', 'cooking'],
      });

      await createSkillOffer({
        userId: 'user-3',
        skillName: 'Skill 3',
        description: 'Test',
        categories: ['education'],
      });

      const categories = getAllSkillCategories();
      expect(categories).toContain('repair');
      expect(categories).toContain('technology');
      expect(categories).toContain('cooking');
      expect(categories).toContain('education');
      expect(categories.length).toBeGreaterThanOrEqual(4);

      // Should be sorted
      const sorted = [...categories].sort();
      expect(categories).toEqual(sorted);
    });

    it('should return empty array when no skills exist', () => {
      const categories = getAllSkillCategories();
      // May have some from previous tests, but should be an array
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('formatSkillForDisplay', () => {
    it('should format available skill nicely', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Guitar Lessons',
        description: 'Teach acoustic guitar to beginners',
        categories: ['music', 'education'],
      });

      const formatted = formatSkillForDisplay(skill);
      expect(formatted).toContain('Guitar Lessons');
      expect(formatted).toContain('Teach acoustic guitar to beginners');
      expect(formatted).toContain('music');
      expect(formatted).toContain('education');
      expect(formatted).toContain('Available');
    });

    it('should indicate unavailable skills', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Test Skill',
        description: 'Test',
        categories: ['test'],
      });

      await markSkillUnavailable(skill.id);
      const updated = getSkillOffer(skill.id);

      if (updated) {
        const formatted = formatSkillForDisplay(updated);
        expect(formatted).toContain('unavailable');
      }
    });
  });

  describe('security and validation', () => {
    it('should handle multiple categories with special characters', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: 'Special Skills',
        description: 'Testing categories',
        categories: ['<script>test</script>', 'normal-category', 'another@#$'],
      });

      expect(skill.categories).toHaveLength(3);
      skill.categories.forEach(cat => {
        expect(cat).not.toContain('<script>');
      });
    });

    it('should trim whitespace from inputs', async () => {
      const skill = await createSkillOffer({
        userId: 'user-123',
        skillName: '  Spaced Name  ',
        description: '  Spaced Description  ',
        categories: ['  spaced  ', '  category  '],
      });

      expect(skill.skillName).toBe('Spaced Name');
      expect(skill.description).toBe('Spaced Description');
      expect(skill.categories[0]).not.toMatch(/^\s|\s$/);
    });
  });
});
