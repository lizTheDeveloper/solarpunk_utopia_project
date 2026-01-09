/**
 * Tests for Community Contribution Tracking
 * REQ-TIME-002: Abundance Tracking Over Debt
 * REQ-TIME-019: Participation Encouragement
 * REQ-TIME-020: Skill Gap Identification
 * REQ-TIME-021: Care and Burnout Prevention
 * REQ-TIME-022: Recognition Without Hierarchy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  recordContribution,
  getContribution,
  queryContributions,
  getUserContributions,
  celebrateContribution,
  analyzeVitality,
  checkBurnoutRisk,
  getUserStats,
  formatVitalityInsights,
  formatUserStats,
} from './contribution-tracking';

describe('Community Contribution Tracking', () => {
  beforeEach(async () => {
    // Initialize and reset database before each test
    await db.init();
    await db.reset();
  });

  describe('recordContribution', () => {
    it('should record a new contribution with required fields', async () => {
      const contribution = await recordContribution({
        userId: 'user-123',
        contributionType: 'skill-share',
        description: 'Taught bicycle repair workshop to 5 community members',
        skillsUsed: ['bicycle repair', 'teaching'],
        timeInvested: 120,
        visibility: 'community',
      });

      expect(contribution.id).toBeDefined();
      expect(contribution.userId).toBe('user-123');
      expect(contribution.contributionType).toBe('skill-share');
      expect(contribution.description).toBe('Taught bicycle repair workshop to 5 community members');
      expect(contribution.skillsUsed).toEqual(['bicycle repair', 'teaching']);
      expect(contribution.timeInvested).toBe(120);
      expect(contribution.celebratedBy).toEqual([]);
      expect(contribution.visibility).toBe('community');
      expect(contribution.createdAt).toBeGreaterThan(0);
    });

    it('should sanitize user input to prevent XSS', async () => {
      const contribution = await recordContribution({
        userId: 'user-123',
        contributionType: 'time-offer',
        description: '<script>alert("xss")</script>Helped with gardening',
        skillsUsed: ['<img src=x onerror=alert(1)>gardening'],
        impactDescription: '<b>Great impact</b>',
      });

      expect(contribution.description).not.toContain('<script>');
      expect(contribution.skillsUsed?.[0]).not.toContain('<img');
      expect(contribution.impactDescription).not.toContain('<b>');
    });

    it('should reject empty description', async () => {
      await expect(
        recordContribution({
          userId: 'user-123',
          contributionType: 'care',
          description: '',
        })
      ).rejects.toThrow('Contribution description is required');
    });

    it('should reject invalid user ID', async () => {
      await expect(
        recordContribution({
          userId: '<script>evil</script>',
          contributionType: 'care',
          description: 'Valid description',
        })
      ).rejects.toThrow();
    });

    it('should default visibility to community', async () => {
      const contribution = await recordContribution({
        userId: 'user-123',
        contributionType: 'random-kindness',
        description: 'Left flowers on neighbor\'s doorstep',
      });

      expect(contribution.visibility).toBe('community');
    });

    it('should support all contribution types', async () => {
      const types: Array<'time-offer' | 'skill-share' | 'resource-share' | 'emotional-support' | 'care' | 'random-kindness' | 'other'> = [
        'time-offer',
        'skill-share',
        'resource-share',
        'emotional-support',
        'care',
        'random-kindness',
        'other',
      ];

      for (const type of types) {
        const contribution = await recordContribution({
          userId: 'user-123',
          contributionType: type,
          description: `Testing ${type}`,
        });
        expect(contribution.contributionType).toBe(type);
      }
    });
  });

  describe('getContribution', () => {
    it('should retrieve a contribution by ID', async () => {
      const created = await recordContribution({
        userId: 'user-123',
        contributionType: 'skill-share',
        description: 'Taught cooking class',
      });

      const retrieved = getContribution(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.description).toBe('Taught cooking class');
    });

    it('should return null for non-existent contribution', () => {
      const contribution = getContribution('non-existent-id');
      expect(contribution).toBeNull();
    });

    it('should reject invalid contribution ID', () => {
      expect(() => getContribution('<script>bad</script>')).toThrow();
    });
  });

  describe('queryContributions', () => {
    beforeEach(async () => {
      // Create test data
      await recordContribution({
        userId: 'user-1',
        contributionType: 'skill-share',
        description: 'Workshop 1',
        communityGroupId: 'group-1',
      });

      await recordContribution({
        userId: 'user-2',
        contributionType: 'care',
        description: 'Eldercare',
        communityGroupId: 'group-1',
      });

      await recordContribution({
        userId: 'user-1',
        contributionType: 'random-kindness',
        description: 'Surprise gift',
        communityGroupId: 'group-2',
      });
    });

    it('should return all contributions by default', () => {
      const results = queryContributions();
      expect(results.length).toBe(3);
    });

    it('should filter by user ID', () => {
      const results = queryContributions({ userId: 'user-1' });
      expect(results.length).toBe(2);
      results.forEach(c => expect(c.userId).toBe('user-1'));
    });

    it('should filter by contribution type', () => {
      const results = queryContributions({ contributionType: 'care' });
      expect(results.length).toBe(1);
      expect(results[0].contributionType).toBe('care');
    });

    it('should filter by community group', () => {
      const results = queryContributions({ communityGroupId: 'group-1' });
      expect(results.length).toBe(2);
      results.forEach(c => expect(c.communityGroupId).toBe('group-1'));
    });

    it('should filter by date range', () => {
      const now = Date.now();
      const results = queryContributions({
        startDate: now - 10000,
        endDate: now + 10000,
      });
      expect(results.length).toBe(3);
    });

    it('should limit results', () => {
      const results = queryContributions({ limit: 2 });
      expect(results.length).toBe(2);
    });

    it('should sort by most recent first', () => {
      const results = queryContributions();
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].createdAt).toBeGreaterThanOrEqual(results[i].createdAt);
      }
    });
  });

  describe('getUserContributions', () => {
    it('should get all contributions for a user', async () => {
      await recordContribution({
        userId: 'user-123',
        contributionType: 'skill-share',
        description: 'First contribution',
      });

      await recordContribution({
        userId: 'user-123',
        contributionType: 'care',
        description: 'Second contribution',
      });

      await recordContribution({
        userId: 'user-456',
        contributionType: 'time-offer',
        description: 'Someone else',
      });

      const results = getUserContributions('user-123');
      expect(results.length).toBe(2);
      results.forEach(c => expect(c.userId).toBe('user-123'));
    });

    it('should reject invalid user ID', () => {
      expect(() => getUserContributions('<script>bad</script>')).toThrow();
    });
  });

  describe('celebrateContribution', () => {
    it('should add celebration to a contribution', async () => {
      const contribution = await recordContribution({
        userId: 'user-123',
        contributionType: 'skill-share',
        description: 'Great workshop',
      });

      await celebrateContribution(contribution.id, 'user-456');

      const updated = getContribution(contribution.id);
      expect(updated?.celebratedBy).toContain('user-456');
    });

    it('should not add duplicate celebrations', async () => {
      const contribution = await recordContribution({
        userId: 'user-123',
        contributionType: 'skill-share',
        description: 'Great workshop',
      });

      await celebrateContribution(contribution.id, 'user-456');
      await celebrateContribution(contribution.id, 'user-456');

      const updated = getContribution(contribution.id);
      expect(updated?.celebratedBy?.length).toBe(1);
    });

    it('should reject invalid IDs', async () => {
      await expect(
        celebrateContribution('<script>bad</script>', 'user-123')
      ).rejects.toThrow();

      const contribution = await recordContribution({
        userId: 'user-123',
        contributionType: 'care',
        description: 'Valid',
      });

      await expect(
        celebrateContribution(contribution.id, '<script>bad</script>')
      ).rejects.toThrow();
    });
  });

  describe('analyzeVitality', () => {
    it('should analyze community vitality metrics', async () => {
      // Create some test data
      await recordContribution({
        userId: 'user-1',
        contributionType: 'skill-share',
        description: 'Workshop',
        skillsUsed: ['teaching', 'gardening'],
      });

      await recordContribution({
        userId: 'user-2',
        contributionType: 'care',
        description: 'Eldercare',
        skillsUsed: ['caregiving'],
      });

      const vitality = analyzeVitality({ periodDays: 30 });

      expect(vitality.period.startDate).toBeGreaterThan(0);
      expect(vitality.period.endDate).toBeGreaterThan(vitality.period.startDate);
      expect(vitality.metrics.activeContributors).toBe(2);
      expect(vitality.metrics.totalContributions).toBe(2);
      expect(vitality.metrics.participationTrend).toMatch(/growing|stable|declining/);
      expect(vitality.insights.length).toBeGreaterThan(0);
    });

    it('should handle empty community', () => {
      const vitality = analyzeVitality({ periodDays: 30 });

      expect(vitality.metrics.activeContributors).toBe(0);
      expect(vitality.metrics.totalContributions).toBe(0);
      expect(vitality.insights).toContain('No contributions recorded in this period');
    });

    it('should filter by community group', async () => {
      await recordContribution({
        userId: 'user-1',
        contributionType: 'skill-share',
        description: 'Group 1',
        communityGroupId: 'group-1',
      });

      await recordContribution({
        userId: 'user-2',
        contributionType: 'care',
        description: 'Group 2',
        communityGroupId: 'group-2',
      });

      const vitality = analyzeVitality({ communityGroupId: 'group-1', periodDays: 30 });

      expect(vitality.metrics.totalContributions).toBe(1);
    });
  });

  describe('checkBurnoutRisk', () => {
    it('should detect no burnout risk for healthy participation', () => {
      const result = checkBurnoutRisk('user-123');
      expect(result.atRisk).toBe(false);
    });

    it('should detect burnout risk from high volume', async () => {
      // Create many contributions in short period
      for (let i = 0; i < 20; i++) {
        await recordContribution({
          userId: 'user-123',
          contributionType: 'skill-share',
          description: `Contribution ${i}`,
        });
      }

      const result = checkBurnoutRisk('user-123', 14);
      expect(result.atRisk).toBe(true);
      expect(result.reason).toContain('contributions');
      expect(result.suggestion).toBeDefined();
    });

    it('should reject invalid user ID', () => {
      expect(() => checkBurnoutRisk('<script>bad</script>')).toThrow();
    });
  });

  describe('getUserStats', () => {
    beforeEach(async () => {
      // Create test contributions
      await recordContribution({
        userId: 'user-123',
        contributionType: 'skill-share',
        description: 'First',
        skillsUsed: ['teaching', 'gardening'],
      });

      await recordContribution({
        userId: 'user-123',
        contributionType: 'care',
        description: 'Second',
        skillsUsed: ['caregiving'],
      });

      await recordContribution({
        userId: 'user-123',
        contributionType: 'skill-share',
        description: 'Third',
        skillsUsed: ['teaching'],
      });

      // Celebrate one
      const contributions = getUserContributions('user-123');
      await celebrateContribution(contributions[0].id, 'user-456');
      await celebrateContribution(contributions[0].id, 'user-789');
    });

    it('should calculate user statistics', () => {
      const stats = getUserStats('user-123');

      expect(stats.totalContributions).toBe(3);
      expect(stats.contributionsByType['skill-share']).toBe(2);
      expect(stats.contributionsByType['care']).toBe(1);
      expect(stats.skillsShared).toContain('teaching');
      expect(stats.skillsShared).toContain('gardening');
      expect(stats.skillsShared).toContain('caregiving');
      expect(stats.celebrationsReceived).toBe(2);
      expect(stats.recentActivity).toBeGreaterThan(0);
    });

    it('should reject invalid user ID', () => {
      expect(() => getUserStats('<script>bad</script>')).toThrow();
    });
  });

  describe('formatVitalityInsights', () => {
    it('should format vitality data into readable text', () => {
      const vitality = {
        period: {
          startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
          endDate: Date.now(),
        },
        metrics: {
          activeContributors: 5,
          totalContributions: 15,
          skillsOffered: ['teaching', 'gardening', 'repair'],
          skillsNeeded: ['plumbing'],
          averageEnergyLevel: 4.2,
          participationTrend: 'growing' as const,
        },
        insights: ['Community is growing!', 'High energy levels'],
        recommendations: ['Keep it up!'],
      };

      const formatted = formatVitalityInsights(vitality);

      expect(formatted).toContain('Community Vitality Report');
      expect(formatted).toContain('Active contributors: 5');
      expect(formatted).toContain('Total contributions: 15');
      expect(formatted).toContain('Skills being shared: 3');
      expect(formatted).toContain('Average energy level: 4.2');
      expect(formatted).toContain('Participation trend: growing');
      expect(formatted).toContain('Community is growing!');
      expect(formatted).toContain('Keep it up!');
    });
  });

  describe('formatUserStats', () => {
    it('should format user statistics into readable text', () => {
      const stats = {
        totalContributions: 10,
        contributionsByType: {
          'skill-share': 5,
          'care': 3,
          'random-kindness': 2,
        } as any,
        skillsShared: ['teaching', 'gardening', 'cooking'],
        celebrationsReceived: 7,
        recentActivity: 3,
      };

      const formatted = formatUserStats('user-123', stats);

      expect(formatted).toContain('Contribution Statistics');
      expect(formatted).toContain('Total contributions: 10');
      expect(formatted).toContain('Recent activity (30 days): 3');
      expect(formatted).toContain('Celebrations received: 7');
      expect(formatted).toContain('skill-share: 5');
      expect(formatted).toContain('teaching, gardening, cooking');
    });
  });

  describe('REQ-TIME-002: Abundance Tracking Over Debt', () => {
    it('should track contributions WITHOUT creating debt relationships', async () => {
      await recordContribution({
        userId: 'user-giver',
        contributionType: 'skill-share',
        description: 'Taught workshop to user-receiver',
        recipientIds: ['user-receiver'],
      });

      // Verify: No "balance" or "debt" is tracked
      const giverContributions = getUserContributions('user-giver');
      const receiverContributions = getUserContributions('user-receiver');

      expect(giverContributions.length).toBe(1);
      expect(receiverContributions.length).toBe(0); // Receiver doesn't "owe" anything

      const vitality = analyzeVitality();
      expect(vitality.metrics).not.toHaveProperty('debts');
      expect(vitality.metrics).not.toHaveProperty('balances');
    });
  });

  describe('REQ-TIME-022: Recognition Without Hierarchy', () => {
    it('should enable celebration without creating rankings', async () => {
      const c1 = await recordContribution({
        userId: 'user-1',
        contributionType: 'skill-share',
        description: 'Workshop',
      });

      const c2 = await recordContribution({
        userId: 'user-2',
        contributionType: 'care',
        description: 'Support',
      });

      await celebrateContribution(c1.id, 'user-3');
      await celebrateContribution(c1.id, 'user-4');
      await celebrateContribution(c2.id, 'user-3');

      // Verify: No rankings or "top contributor" logic
      const vitality = analyzeVitality();
      expect(vitality.insights.join(' ')).not.toContain('top');
      expect(vitality.insights.join(' ')).not.toContain('rank');
      expect(vitality.insights.join(' ')).not.toContain('winner');
    });
  });
});
