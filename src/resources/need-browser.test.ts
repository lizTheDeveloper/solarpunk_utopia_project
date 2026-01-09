/**
 * Tests for Need Browser with Urgency Indicators
 *
 * Phase 2, Group C: Urgency indicators
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NeedBrowser } from './need-browser';
import { LocalDatabase } from '../core/database';
import type { Need, UrgencyLevel } from '../types';

describe('NeedBrowser - Urgency Indicators', () => {
  let db: LocalDatabase;
  let browser: NeedBrowser;

  beforeEach(() => {
    db = new LocalDatabase();
    browser = new NeedBrowser(db);
  });

  describe('Urgency Filtering', () => {
    beforeEach(async () => {
      // Add test needs with different urgency levels
      await db.addNeed({
        userId: 'user-1',
        description: 'Urgent: Need food',
        urgency: 'urgent',
        fulfilled: false
      });

      await db.addNeed({
        userId: 'user-2',
        description: 'Need drill by Friday',
        urgency: 'needed',
        fulfilled: false
      });

      await db.addNeed({
        userId: 'user-3',
        description: 'Would be helpful to borrow a book',
        urgency: 'helpful',
        fulfilled: false
      });

      await db.addNeed({
        userId: 'user-4',
        description: 'Casually looking for gardening tips',
        urgency: 'casual',
        fulfilled: false
      });
    });

    it('should filter needs by urgency level', async () => {
      const urgentNeeds = await browser.getNeedsByUrgency('urgent');
      expect(urgentNeeds).toHaveLength(1);
      expect(urgentNeeds[0].description).toContain('Urgent');
    });

    it('should get high-priority needs (urgent + needed)', async () => {
      const highPriority = await browser.getHighPriorityNeeds();
      expect(highPriority.length).toBeGreaterThanOrEqual(2);

      const urgencyLevels = highPriority.map(n => n.urgency);
      expect(urgencyLevels).toContain('urgent');
      expect(urgencyLevels).toContain('needed');
    });

    it('should exclude fulfilled needs by default', async () => {
      // Add a fulfilled need
      await db.addNeed({
        userId: 'user-5',
        description: 'Already helped',
        urgency: 'urgent',
        fulfilled: true
      });

      const results = await browser.browseNeeds({
        unfulfilledOnly: true
      });

      const descriptions = results.map(r => r.need.description);
      expect(descriptions).not.toContain('Already helped');
    });
  });

  describe('Urgency Sorting', () => {
    it('should sort needs by urgency (most urgent first)', async () => {
      await db.addNeed({
        userId: 'user-1',
        description: 'Casual need',
        urgency: 'casual',
        fulfilled: false
      });

      await db.addNeed({
        userId: 'user-2',
        description: 'Urgent need',
        urgency: 'urgent',
        fulfilled: false
      });

      await db.addNeed({
        userId: 'user-3',
        description: 'Needed soon',
        urgency: 'needed',
        fulfilled: false
      });

      const results = await browser.browseNeeds({
        sortByUrgency: true
      });

      const urgencyOrder = results.map(r => r.need.urgency);
      expect(urgencyOrder[0]).toBe('urgent');
      expect(urgencyOrder[1]).toBe('needed');
      expect(urgencyOrder[urgencyOrder.length - 1]).toBe('casual');
    });
  });

  describe('Urgency Display Helpers', () => {
    it('should provide urgency descriptions', () => {
      const urgencyLevels: UrgencyLevel[] = ['casual', 'helpful', 'needed', 'urgent'];

      urgencyLevels.forEach(urgency => {
        const description = browser.getUrgencyDescription(urgency);
        expect(description).toBeTruthy();
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });

    it('should provide urgency icons', () => {
      const urgencyLevels: UrgencyLevel[] = ['casual', 'helpful', 'needed', 'urgent'];

      urgencyLevels.forEach(urgency => {
        const icon = browser.getUrgencyIcon(urgency);
        expect(icon).toBeTruthy();
        expect(typeof icon).toBe('string');
      });
    });

    it('should provide CSS color classes', () => {
      const urgencyLevels: UrgencyLevel[] = ['casual', 'helpful', 'needed', 'urgent'];

      urgencyLevels.forEach(urgency => {
        const colorClass = browser.getUrgencyColorClass(urgency);
        expect(colorClass).toBe(`urgency-${urgency}`);
      });
    });
  });

  describe('Relevance Scoring', () => {
    it('should assign higher scores to urgent needs', async () => {
      await db.addNeed({
        userId: 'user-1',
        description: 'Urgent need',
        urgency: 'urgent',
        fulfilled: false
      });

      await db.addNeed({
        userId: 'user-2',
        description: 'Casual need',
        urgency: 'casual',
        fulfilled: false
      });

      const results = await browser.browseNeeds({
        sortByUrgency: true
      });

      const urgentResult = results.find(r => r.need.urgency === 'urgent');
      const casualResult = results.find(r => r.need.urgency === 'casual');

      expect(urgentResult?.relevanceScore).toBeGreaterThan(casualResult?.relevanceScore || 0);
    });

    it('should assign scores within valid range (0-100)', async () => {
      await db.addNeed({
        userId: 'user-1',
        description: 'Test need',
        urgency: 'urgent',
        fulfilled: false
      });

      const results = await browser.browseNeeds();

      results.forEach(result => {
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Search and Filter Combination', () => {
    it('should combine search query with urgency filter', async () => {
      await db.addNeed({
        userId: 'user-1',
        description: 'Urgent: Need food assistance',
        urgency: 'urgent',
        fulfilled: false
      });

      await db.addNeed({
        userId: 'user-2',
        description: 'Need tool for repair',
        urgency: 'needed',
        fulfilled: false
      });

      const results = await browser.browseNeeds({
        searchQuery: 'food',
        urgency: 'urgent'
      });

      expect(results).toHaveLength(1);
      expect(results[0].need.description).toContain('food');
      expect(results[0].need.urgency).toBe('urgent');
    });

    it('should filter by resource type and urgency', async () => {
      await db.addNeed({
        userId: 'user-1',
        description: 'Urgent: Need food',
        urgency: 'urgent',
        resourceType: 'food',
        fulfilled: false
      });

      await db.addNeed({
        userId: 'user-2',
        description: 'Urgent: Need tool',
        urgency: 'urgent',
        resourceType: 'tool',
        fulfilled: false
      });

      const results = await browser.browseNeeds({
        urgency: 'urgent',
        resourceType: 'food'
      });

      expect(results).toHaveLength(1);
      expect(results[0].need.resourceType).toBe('food');
    });
  });
});
