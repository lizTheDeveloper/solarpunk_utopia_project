/**
 * Tests for Browse Community Needs feature
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import { browseNeeds, getActiveNeeds, getUrgentNeeds, getNeedsByType, getNeed } from './browse-needs';
import type { Need } from '../types';

describe('Browse Community Needs', () => {
  beforeEach(async () => {
    await db.init();
  });

  describe('browseNeeds', () => {
    it('should return all needs when no filters applied', async () => {
      // Add test needs
      const need1 = await db.addNeed({
        userId: 'user-1',
        description: 'Need a ladder for roof repair',
        urgency: 'needed',
        resourceType: 'tool',
        fulfilled: false,
      });

      const need2 = await db.addNeed({
        userId: 'user-2',
        description: 'Looking for gardening help',
        urgency: 'helpful',
        resourceType: 'skill',
        fulfilled: false,
      });

      const needs = browseNeeds();
      expect(needs.length).toBeGreaterThanOrEqual(2);
      expect(needs.find(n => n.id === need1.id)).toBeDefined();
      expect(needs.find(n => n.id === need2.id)).toBeDefined();
    });

    it('should exclude fulfilled needs by default', async () => {
      const fulfilledNeed = await db.addNeed({
        userId: 'user-3',
        description: 'Need a hammer (fulfilled)',
        urgency: 'casual',
        resourceType: 'tool',
        fulfilled: true,
      });

      const activeNeed = await db.addNeed({
        userId: 'user-4',
        description: 'Need a drill',
        urgency: 'needed',
        resourceType: 'tool',
        fulfilled: false,
      });

      const needs = browseNeeds();
      expect(needs.find(n => n.id === fulfilledNeed.id)).toBeUndefined();
      expect(needs.find(n => n.id === activeNeed.id)).toBeDefined();
    });

    it('should include fulfilled needs when requested', async () => {
      const fulfilledNeed = await db.addNeed({
        userId: 'user-5',
        description: 'Fulfilled need',
        urgency: 'casual',
        fulfilled: true,
      });

      const needsWithFulfilled = browseNeeds({ includeFulfilled: true });
      expect(needsWithFulfilled.find(n => n.id === fulfilledNeed.id)).toBeDefined();
    });

    it('should filter by resource type', async () => {
      const toolNeed = await db.addNeed({
        userId: 'user-6',
        description: 'Need a wrench',
        urgency: 'casual',
        resourceType: 'tool',
        fulfilled: false,
      });

      const skillNeed = await db.addNeed({
        userId: 'user-7',
        description: 'Need carpentry help',
        urgency: 'needed',
        resourceType: 'skill',
        fulfilled: false,
      });

      const toolNeeds = browseNeeds({ resourceType: 'tool' });
      expect(toolNeeds.find(n => n.id === toolNeed.id)).toBeDefined();
      expect(toolNeeds.find(n => n.id === skillNeed.id)).toBeUndefined();
    });

    it('should filter by urgency', async () => {
      const urgentNeed = await db.addNeed({
        userId: 'user-8',
        description: 'Urgent: Need medical supplies',
        urgency: 'urgent',
        fulfilled: false,
      });

      const casualNeed = await db.addNeed({
        userId: 'user-9',
        description: 'Casual: Looking for books',
        urgency: 'casual',
        fulfilled: false,
      });

      const urgentNeeds = browseNeeds({ urgency: 'urgent' });
      expect(urgentNeeds.find(n => n.id === urgentNeed.id)).toBeDefined();
      expect(urgentNeeds.find(n => n.id === casualNeed.id)).toBeUndefined();
    });

    it('should sort by urgency then by date', async () => {
      // Add needs in reverse urgency order
      const casualNeed = await db.addNeed({
        userId: 'user-10',
        description: 'Casual need',
        urgency: 'casual',
        fulfilled: false,
      });

      const helpfulNeed = await db.addNeed({
        userId: 'user-11',
        description: 'Helpful need',
        urgency: 'helpful',
        fulfilled: false,
      });

      const neededNeed = await db.addNeed({
        userId: 'user-12',
        description: 'Needed need',
        urgency: 'needed',
        fulfilled: false,
      });

      const urgentNeed = await db.addNeed({
        userId: 'user-13',
        description: 'Urgent need',
        urgency: 'urgent',
        fulfilled: false,
      });

      const needs = browseNeeds();

      // Find indices of our test needs
      const urgentIndex = needs.findIndex(n => n.id === urgentNeed.id);
      const neededIndex = needs.findIndex(n => n.id === neededNeed.id);
      const helpfulIndex = needs.findIndex(n => n.id === helpfulNeed.id);
      const casualIndex = needs.findIndex(n => n.id === casualNeed.id);

      // Verify urgency order
      expect(urgentIndex).toBeLessThan(neededIndex);
      expect(neededIndex).toBeLessThan(helpfulIndex);
      expect(helpfulIndex).toBeLessThan(casualIndex);
    });
  });

  describe('getActiveNeeds', () => {
    it('should return only unfulfilled needs', async () => {
      const activeNeed = await db.addNeed({
        userId: 'user-14',
        description: 'Active need',
        urgency: 'needed',
        fulfilled: false,
      });

      const fulfilledNeed = await db.addNeed({
        userId: 'user-15',
        description: 'Fulfilled need',
        urgency: 'casual',
        fulfilled: true,
      });

      const activeNeeds = getActiveNeeds();
      expect(activeNeeds.find(n => n.id === activeNeed.id)).toBeDefined();
      expect(activeNeeds.find(n => n.id === fulfilledNeed.id)).toBeUndefined();
    });
  });

  describe('getUrgentNeeds', () => {
    it('should return only urgent unfulfilled needs', async () => {
      const urgentNeed = await db.addNeed({
        userId: 'user-16',
        description: 'Urgent need',
        urgency: 'urgent',
        fulfilled: false,
      });

      const casualNeed = await db.addNeed({
        userId: 'user-17',
        description: 'Casual need',
        urgency: 'casual',
        fulfilled: false,
      });

      const urgentNeeds = getUrgentNeeds();
      expect(urgentNeeds.find(n => n.id === urgentNeed.id)).toBeDefined();
      expect(urgentNeeds.find(n => n.id === casualNeed.id)).toBeUndefined();
      expect(urgentNeeds.every(n => n.urgency === 'urgent')).toBe(true);
    });
  });

  describe('getNeedsByType', () => {
    it('should return needs of specified resource type', async () => {
      const toolNeed = await db.addNeed({
        userId: 'user-18',
        description: 'Need tools',
        urgency: 'needed',
        resourceType: 'tool',
        fulfilled: false,
      });

      const foodNeed = await db.addNeed({
        userId: 'user-19',
        description: 'Need food',
        urgency: 'needed',
        resourceType: 'food',
        fulfilled: false,
      });

      const toolNeeds = getNeedsByType('tool');
      expect(toolNeeds.find(n => n.id === toolNeed.id)).toBeDefined();
      expect(toolNeeds.find(n => n.id === foodNeed.id)).toBeUndefined();
      expect(toolNeeds.every(n => n.resourceType === 'tool')).toBe(true);
    });
  });

  describe('getNeed', () => {
    it('should return a specific need by ID', async () => {
      const need = await db.addNeed({
        userId: 'user-20',
        description: 'Specific need',
        urgency: 'helpful',
        fulfilled: false,
      });

      const retrieved = getNeed(need.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(need.id);
      expect(retrieved?.description).toBe('Specific need');
    });

    it('should return undefined for non-existent need', () => {
      const retrieved = getNeed('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });
});
