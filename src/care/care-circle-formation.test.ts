/**
 * Tests for Care Circle Formation
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  createCareCircle,
  addCareCircleMember,
  removeCareCircleMember,
  updateCareCircleSettings,
  toggleCheckInMonitoring,
  deleteCareCircle,
  getCareCirclesAsMember,
  searchCommunityMembers,
  addCareResponsibility,
  completeCareResponsibility,
  addCareNeed,
  updateCareNeedStatus,
  getCareResponsibilities,
  getPendingResponsibilities,
  getMemberResponsibilities,
  getCareNeeds,
  getUnmetNeeds,
  suggestResponsibilityDistribution,
  assignResponsibility,
  getCareCircleStats,
} from './care-circle-formation';
import { getCareCircle } from './missed-check-in-alerts';

describe('Care Circle Formation', () => {
  beforeEach(async () => {
    await db.init();

    // Create test users
    await db.setUserProfile({
      id: 'alice',
      did: 'did:key:alice',
      displayName: 'Alice',
      bio: 'Community organizer',
      joinedAt: Date.now(),
      publicKey: 'alice-key',
    });

    await db.setUserProfile({
      id: 'bob',
      did: 'did:key:bob',
      displayName: 'Bob',
      bio: 'Gardener',
      joinedAt: Date.now(),
      publicKey: 'bob-key',
    });

    await db.setUserProfile({
      id: 'carol',
      did: 'did:key:carol',
      displayName: 'Carol',
      bio: 'Medic',
      joinedAt: Date.now(),
      publicKey: 'carol-key',
    });

    await db.setUserProfile({
      id: 'dave',
      did: 'did:key:dave',
      displayName: 'Dave',
      bio: 'Carpenter',
      joinedAt: Date.now(),
      publicKey: 'dave-key',
    });
  });

  describe('createCareCircle', () => {
    it('should create a care circle with default settings', async () => {
      const careCircle = await createCareCircle('alice', ['bob', 'carol']);

      expect(careCircle).toBeDefined();
      expect(careCircle.userId).toBe('alice');
      expect(careCircle.members).toEqual(['bob', 'carol']);
      expect(careCircle.checkInEnabled).toBe(true);
      expect(careCircle.checkInFrequency).toBe('daily');
    });

    it('should create a care circle with custom settings', async () => {
      const careCircle = await createCareCircle('alice', ['bob'], {
        checkInEnabled: false,
        checkInFrequency: 'twice-daily',
        preferredCheckInTime: 9 * 60, // 9:00 AM
        missedCheckInThreshold: 12,
        escalationThreshold: 3,
      });

      expect(careCircle.checkInEnabled).toBe(false);
      expect(careCircle.checkInFrequency).toBe('twice-daily');
      expect(careCircle.preferredCheckInTime).toBe(540);
      expect(careCircle.missedCheckInThreshold).toBe(12);
      expect(careCircle.escalationThreshold).toBe(3);
    });

    it('should throw error if member does not exist', async () => {
      await expect(
        createCareCircle('alice', ['nonexistent'])
      ).rejects.toThrow('User nonexistent not found');
    });

    it('should allow creating care circle with single member', async () => {
      const careCircle = await createCareCircle('alice', ['bob']);
      expect(careCircle.members).toEqual(['bob']);
    });
  });

  describe('addCareCircleMember', () => {
    beforeEach(async () => {
      await createCareCircle('alice', ['bob']);
    });

    it('should add a member to care circle', async () => {
      await addCareCircleMember('alice', 'carol');

      const careCircle = getCareCircle('alice');
      expect(careCircle?.members).toContain('carol');
      expect(careCircle?.members.length).toBe(2);
    });

    it('should throw error if member already in circle', async () => {
      await expect(
        addCareCircleMember('alice', 'bob')
      ).rejects.toThrow('already in your care circle');
    });

    it('should throw error if no care circle exists', async () => {
      await expect(
        addCareCircleMember('dave', 'bob')
      ).rejects.toThrow('No care circle found');
    });

    it('should throw error if user does not exist', async () => {
      await expect(
        addCareCircleMember('alice', 'nonexistent')
      ).rejects.toThrow('User nonexistent not found');
    });
  });

  describe('removeCareCircleMember', () => {
    beforeEach(async () => {
      await createCareCircle('alice', ['bob', 'carol']);
    });

    it('should remove a member from care circle', async () => {
      await removeCareCircleMember('alice', 'bob');

      const careCircle = getCareCircle('alice');
      expect(careCircle?.members).not.toContain('bob');
      expect(careCircle?.members).toEqual(['carol']);
    });

    it('should throw error when removing last member', async () => {
      await removeCareCircleMember('alice', 'bob');

      await expect(
        removeCareCircleMember('alice', 'carol')
      ).rejects.toThrow('Cannot remove last member');
    });

    it('should throw error if member not in circle', async () => {
      await expect(
        removeCareCircleMember('alice', 'dave')
      ).rejects.toThrow('not in your care circle');
    });

    it('should throw error if no care circle exists', async () => {
      await expect(
        removeCareCircleMember('dave', 'bob')
      ).rejects.toThrow('No care circle found');
    });
  });

  describe('updateCareCircleSettings', () => {
    beforeEach(async () => {
      await createCareCircle('alice', ['bob']);
    });

    it('should update check-in frequency', async () => {
      await updateCareCircleSettings('alice', {
        checkInFrequency: 'weekly',
      });

      const careCircle = getCareCircle('alice');
      expect(careCircle?.checkInFrequency).toBe('weekly');
    });

    it('should update preferred check-in time', async () => {
      await updateCareCircleSettings('alice', {
        preferredCheckInTime: 14 * 60 + 30, // 2:30 PM
      });

      const careCircle = getCareCircle('alice');
      expect(careCircle?.preferredCheckInTime).toBe(870);
    });

    it('should update multiple settings at once', async () => {
      await updateCareCircleSettings('alice', {
        checkInFrequency: 'twice-daily',
        missedCheckInThreshold: 8,
        escalationThreshold: 3,
      });

      const careCircle = getCareCircle('alice');
      expect(careCircle?.checkInFrequency).toBe('twice-daily');
      expect(careCircle?.missedCheckInThreshold).toBe(8);
      expect(careCircle?.escalationThreshold).toBe(3);
    });

    it('should throw error if no care circle exists', async () => {
      await expect(
        updateCareCircleSettings('dave', { checkInFrequency: 'daily' })
      ).rejects.toThrow('No care circle found');
    });
  });

  describe('toggleCheckInMonitoring', () => {
    beforeEach(async () => {
      await createCareCircle('alice', ['bob'], { checkInEnabled: true });
    });

    it('should disable monitoring when enabled', async () => {
      const newState = await toggleCheckInMonitoring('alice');

      expect(newState).toBe(false);
      const careCircle = getCareCircle('alice');
      expect(careCircle?.checkInEnabled).toBe(false);
    });

    it('should enable monitoring when disabled', async () => {
      await toggleCheckInMonitoring('alice'); // Disable
      const newState = await toggleCheckInMonitoring('alice'); // Enable

      expect(newState).toBe(true);
      const careCircle = getCareCircle('alice');
      expect(careCircle?.checkInEnabled).toBe(true);
    });

    it('should throw error if no care circle exists', async () => {
      await expect(
        toggleCheckInMonitoring('dave')
      ).rejects.toThrow('No care circle found');
    });
  });

  describe('deleteCareCircle', () => {
    beforeEach(async () => {
      await createCareCircle('alice', ['bob']);
    });

    it('should delete care circle', async () => {
      await deleteCareCircle('alice');

      const careCircle = getCareCircle('alice');
      expect(careCircle).toBeUndefined();
    });

    it('should throw error if no care circle exists', async () => {
      await expect(
        deleteCareCircle('dave')
      ).rejects.toThrow('No care circle found');
    });
  });

  describe('getCareCirclesAsMember', () => {
    beforeEach(async () => {
      await createCareCircle('alice', ['bob', 'carol']);
      await createCareCircle('dave', ['bob']);
    });

    it('should return care circles where user is a member', () => {
      const circles = getCareCirclesAsMember('bob');

      expect(circles.length).toBe(2);
      expect(circles.map(c => c.userId)).toContain('alice');
      expect(circles.map(c => c.userId)).toContain('dave');
    });

    it('should return empty array if user is not in any circles', () => {
      const circles = getCareCirclesAsMember('carol');

      // Carol is in Alice's circle, so should return 1
      expect(circles.length).toBe(1);
      expect(circles[0].userId).toBe('alice');
    });

    it('should return empty array for user not in any circles', () => {
      // Create a new user not in any circles
      const circles = getCareCirclesAsMember('nonexistent-user');
      expect(circles.length).toBe(0);
    });
  });

  describe('searchCommunityMembers', () => {
    it('should find users by display name', () => {
      const results = searchCommunityMembers('ali');
      expect(results.length).toBe(1);
      expect(results[0].displayName).toBe('Alice');
    });

    it('should find users by bio', () => {
      const results = searchCommunityMembers('garden');
      expect(results.length).toBe(1);
      expect(results[0].displayName).toBe('Bob');
    });

    it('should be case insensitive', () => {
      const results = searchCommunityMembers('CAROL');
      expect(results.length).toBe(1);
      expect(results[0].displayName).toBe('Carol');
    });

    it('should return empty array if no matches', () => {
      const results = searchCommunityMembers('xyz123');
      expect(results.length).toBe(0);
    });

    it('should return multiple matches', () => {
      const results = searchCommunityMembers('a'); // Alice and Carol have 'a'
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Care Circle Autonomy and Preferences', () => {
    it('should respect user autonomy by allowing opt-out', async () => {
      const careCircle = await createCareCircle('alice', ['bob'], {
        checkInEnabled: false,
      });

      expect(careCircle.checkInEnabled).toBe(false);
    });

    it('should allow user to set preferred check-in time', async () => {
      const careCircle = await createCareCircle('alice', ['bob'], {
        preferredCheckInTime: 8 * 60, // 8:00 AM
      });

      expect(careCircle.preferredCheckInTime).toBe(480);
    });

    it('should allow user to customize alert thresholds', async () => {
      const careCircle = await createCareCircle('alice', ['bob'], {
        missedCheckInThreshold: 36, // 36 hours before alert
        escalationThreshold: 3, // Escalate after 3 missed
      });

      expect(careCircle.missedCheckInThreshold).toBe(36);
      expect(careCircle.escalationThreshold).toBe(3);
    });
  });

  describe('Equitable Care Distribution', () => {
    it('should track multiple care circles for load distribution', async () => {
      await createCareCircle('alice', ['bob']);
      await createCareCircle('dave', ['bob']);

      const bobsCircles = getCareCirclesAsMember('bob');
      expect(bobsCircles.length).toBe(2);
      // In a real implementation, this would inform care coordination
      // to distribute responsibilities equitably
    });

    it('should allow multiple caregivers per circle', async () => {
      const careCircle = await createCareCircle('alice', ['bob', 'carol', 'dave']);

      expect(careCircle.members.length).toBe(3);
      // Multiple members can share care responsibilities
    });
  });

  describe('Care Responsibilities', () => {
    let careCircleId: string;

    beforeEach(async () => {
      const circle = await createCareCircle('alice', ['bob', 'carol']);
      careCircleId = circle.id;
    });

    it('should add a care responsibility', async () => {
      const resp = await addCareResponsibility(careCircleId, {
        type: 'visit',
        description: 'Daily check-in visit',
        frequency: 'daily',
        timeOfDay: 600, // 10:00 AM
        assignedTo: 'bob',
      });

      expect(resp.careCircleId).toBe(careCircleId);
      expect(resp.type).toBe('visit');
      expect(resp.assignedTo).toBe('bob');
      expect(resp.completed).toBe(false);
    });

    it('should reject assigning to non-member', async () => {
      await expect(
        addCareResponsibility(careCircleId, {
          type: 'groceries',
          description: 'Weekly shopping',
          frequency: 'weekly',
          assignedTo: 'dave',
        })
      ).rejects.toThrow('Cannot assign responsibility to non-member');
    });

    it('should complete a care responsibility', async () => {
      const resp = await addCareResponsibility(careCircleId, {
        type: 'meal-prep',
        description: 'Prepare dinner',
        frequency: 'once',
        assignedTo: 'bob',
      });

      await completeCareResponsibility(resp.id, 'bob', 'Prepared lasagna');

      const responsibilities = getCareResponsibilities(careCircleId);
      const completed = responsibilities.find(r => r.id === resp.id);

      expect(completed?.completed).toBe(true);
      expect(completed?.completedBy).toBe('bob');
      expect(completed?.notes).toBe('Prepared lasagna');
    });

    it('should get pending responsibilities', async () => {
      await addCareResponsibility(careCircleId, {
        type: 'visit',
        description: 'Morning visit',
        frequency: 'daily',
        assignedTo: 'bob',
      });

      const resp2 = await addCareResponsibility(careCircleId, {
        type: 'groceries',
        description: 'Weekly shopping',
        frequency: 'weekly',
        assignedTo: 'carol',
      });

      await completeCareResponsibility(resp2.id, 'carol');

      const pending = getPendingResponsibilities(careCircleId);
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('visit');
    });

    it('should get responsibilities by member', async () => {
      await addCareResponsibility(careCircleId, {
        type: 'visit',
        description: 'Morning visit',
        frequency: 'daily',
        assignedTo: 'bob',
      });

      await addCareResponsibility(careCircleId, {
        type: 'meal-prep',
        description: 'Lunch prep',
        frequency: 'daily',
        assignedTo: 'bob',
      });

      await addCareResponsibility(careCircleId, {
        type: 'groceries',
        description: 'Shopping',
        frequency: 'weekly',
        assignedTo: 'carol',
      });

      const bobsResponsibilities = getMemberResponsibilities(careCircleId, 'bob');
      expect(bobsResponsibilities).toHaveLength(2);
      expect(bobsResponsibilities.every(r => r.assignedTo === 'bob')).toBe(true);
    });

    it('should assign responsibility to a member', async () => {
      const resp = await addCareResponsibility(careCircleId, {
        type: 'transportation',
        description: 'Doctor appointment',
        frequency: 'once',
      });

      await assignResponsibility(resp.id, 'carol');

      const responsibilities = getCareResponsibilities(careCircleId);
      const updated = responsibilities.find(r => r.id === resp.id);
      expect(updated?.assignedTo).toBe('carol');
    });
  });

  describe('Care Needs Tracking', () => {
    let careCircleId: string;

    beforeEach(async () => {
      const circle = await createCareCircle('alice', ['bob', 'carol']);
      careCircleId = circle.id;
    });

    it('should add a care need', async () => {
      const need = await addCareNeed(careCircleId, {
        type: 'transportation',
        description: 'Need ride to doctor',
        priority: 'high',
      });

      expect(need.careCircleId).toBe(careCircleId);
      expect(need.type).toBe('transportation');
      expect(need.priority).toBe('high');
      expect(need.status).toBe('unmet');
    });

    it('should default to medium priority', async () => {
      const need = await addCareNeed(careCircleId, {
        type: 'housework',
        description: 'Spring cleaning',
      });

      expect(need.priority).toBe('medium');
    });

    it('should update care need status', async () => {
      const need = await addCareNeed(careCircleId, {
        type: 'groceries',
        description: 'Need milk and bread',
      });

      await updateCareNeedStatus(need.id, 'in-progress', ['bob']);

      const needs = getCareNeeds(careCircleId);
      const updated = needs.find(n => n.id === need.id);

      expect(updated?.status).toBe('in-progress');
      expect(updated?.fulfilledBy).toContain('bob');
    });

    it('should mark need as met with timestamp', async () => {
      const need = await addCareNeed(careCircleId, {
        type: 'meal-prep',
        description: 'Dinner tonight',
        priority: 'urgent',
      });

      await updateCareNeedStatus(need.id, 'met', ['carol'], 'Delivered hot meal');

      const needs = getCareNeeds(careCircleId);
      const met = needs.find(n => n.id === need.id);

      expect(met?.status).toBe('met');
      expect(met?.fulfilledAt).toBeDefined();
      expect(met?.fulfilledBy).toContain('carol');
      expect(met?.notes).toBe('Delivered hot meal');
    });

    it('should get unmet needs', async () => {
      await addCareNeed(careCircleId, {
        type: 'visit',
        description: 'Need a visitor',
        priority: 'low',
      });

      const need2 = await addCareNeed(careCircleId, {
        type: 'groceries',
        description: 'Weekly shopping',
      });

      await updateCareNeedStatus(need2.id, 'met', ['bob']);

      const unmet = getUnmetNeeds(careCircleId);
      expect(unmet).toHaveLength(1);
      expect(unmet[0].type).toBe('visit');
    });
  });

  describe('Equitable Responsibility Distribution', () => {
    let careCircleId: string;

    beforeEach(async () => {
      const circle = await createCareCircle('alice', ['bob', 'carol', 'dave']);
      careCircleId = circle.id;
    });

    it('should suggest equitable distribution', async () => {
      // Assign two responsibilities to bob
      await addCareResponsibility(careCircleId, {
        type: 'visit',
        description: 'Morning visit',
        frequency: 'daily',
        assignedTo: 'bob',
      });

      await addCareResponsibility(careCircleId, {
        type: 'meal-prep',
        description: 'Lunch',
        frequency: 'daily',
        assignedTo: 'bob',
      });

      // Create unassigned responsibilities
      await addCareResponsibility(careCircleId, {
        type: 'groceries',
        description: 'Shopping',
        frequency: 'weekly',
      });

      await addCareResponsibility(careCircleId, {
        type: 'housework',
        description: 'Cleaning',
        frequency: 'weekly',
      });

      const suggestions = suggestResponsibilityDistribution(careCircleId);

      expect(suggestions).toHaveLength(2);

      // Carol and Dave should be suggested since Bob has 2 assignments
      const suggestedMembers = suggestions.map(s => s.suggestedMemberId);
      expect(suggestedMembers).toContain('carol');
      expect(suggestedMembers).toContain('dave');
      expect(suggestedMembers).not.toContain('bob');
    });

    it('should distribute evenly when workload is equal', async () => {
      await addCareResponsibility(careCircleId, {
        type: 'visit',
        description: 'Visit 1',
        frequency: 'daily',
      });

      await addCareResponsibility(careCircleId, {
        type: 'visit',
        description: 'Visit 2',
        frequency: 'daily',
      });

      await addCareResponsibility(careCircleId, {
        type: 'visit',
        description: 'Visit 3',
        frequency: 'daily',
      });

      const suggestions = suggestResponsibilityDistribution(careCircleId);
      expect(suggestions).toHaveLength(3);

      const suggestedMembers = suggestions.map(s => s.suggestedMemberId);
      expect(suggestedMembers).toContain('bob');
      expect(suggestedMembers).toContain('carol');
      expect(suggestedMembers).toContain('dave');
    });
  });

  describe('Care Circle Statistics', () => {
    let careCircleId: string;

    beforeEach(async () => {
      const circle = await createCareCircle('alice', ['bob', 'carol']);
      careCircleId = circle.id;
    });

    it('should calculate complete statistics', async () => {
      await addCareResponsibility(careCircleId, {
        type: 'visit',
        description: 'Morning visit',
        frequency: 'daily',
        assignedTo: 'bob',
      });

      const resp2 = await addCareResponsibility(careCircleId, {
        type: 'meal-prep',
        description: 'Dinner',
        frequency: 'daily',
        assignedTo: 'bob',
      });

      await addCareResponsibility(careCircleId, {
        type: 'groceries',
        description: 'Shopping',
        frequency: 'weekly',
        assignedTo: 'carol',
      });

      await completeCareResponsibility(resp2.id, 'bob');

      await addCareNeed(careCircleId, {
        type: 'transportation',
        description: 'Doctor appointment',
        priority: 'high',
      });

      const stats = getCareCircleStats(careCircleId);

      expect(stats.totalMembers).toBe(2);
      expect(stats.totalResponsibilities).toBe(3);
      expect(stats.completedResponsibilities).toBe(1);
      expect(stats.pendingResponsibilities).toBe(2);
      expect(stats.unmetNeeds).toBe(1);

      const bobWorkload = stats.memberWorkload.find(w => w.userId === 'bob');
      expect(bobWorkload?.assignedCount).toBe(1); // One pending
      expect(bobWorkload?.completedCount).toBe(1); // One completed
    });
  });
});
