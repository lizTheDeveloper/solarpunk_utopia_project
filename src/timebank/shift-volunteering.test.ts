/**
 * Tests for Shift Volunteering
 * REQ-TIME-017: Group Coordination
 * REQ-TIME-005: Collective Time Projects
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  createVolunteerShift,
  signUpForShift,
  cancelShiftSignup,
  startShift,
  completeShift,
  cancelShift,
  createRecurringShift,
  toggleRecurringShift,
  getVolunteerShift,
  browseOpenShifts,
  getMyShifts,
  getOrganizedShifts,
  getUpcomingShifts,
  getShiftsByCategory,
  getActiveRecurringShifts,
  formatShiftForDisplay,
  formatRecurringShiftForDisplay,
} from './shift-volunteering';
import type { TimeRange, RecurrencePattern } from '../types';

describe('Shift Volunteering', () => {
  beforeEach(async () => {
    // Initialize fresh database for each test
    await db.init();
    await db.reset();
  });

  describe('createVolunteerShift', () => {
    it('should create a volunteer shift', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const timeRange: TimeRange = { startTime: '09:00', endTime: '12:00' };

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Community Garden Workday',
        description: 'Help us prepare the garden for spring planting!',
        category: 'gardening',
        shiftDate: nextSaturday,
        shiftTime: timeRange,
        estimatedDuration: 180,
        location: {
          name: 'Main Street Community Garden',
          address: '123 Main St',
        },
        volunteersNeeded: 10,
        whatToBring: ['Gloves', 'Water bottle'],
        preparationNotes: 'Wear clothes that can get dirty',
        accessibilityInfo: 'Wheelchair accessible paths available',
      });

      expect(shift.id).toBeDefined();
      expect(shift.organizerId).toBe('organizer-1');
      expect(shift.title).toBe('Community Garden Workday');
      expect(shift.category).toBe('gardening');
      expect(shift.volunteersNeeded).toBe(10);
      expect(shift.volunteersSignedUp).toHaveLength(0);
      expect(shift.status).toBe('open');
      expect(shift.whatToBring).toContain('Gloves');
    });

    it('should require title', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      await expect(
        createVolunteerShift({
          organizerId: 'organizer-1',
          title: '',
          description: 'Description',
          category: 'gardening',
          shiftDate: nextSaturday,
          shiftTime: { startTime: '09:00', endTime: '12:00' },
          location: { name: 'Garden' },
          volunteersNeeded: 5,
        })
      ).rejects.toThrow('title is required');
    });

    it('should require at least 1 volunteer', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      await expect(
        createVolunteerShift({
          organizerId: 'organizer-1',
          title: 'Test Shift',
          description: 'Description',
          category: 'test',
          shiftDate: nextSaturday,
          shiftTime: { startTime: '09:00', endTime: '12:00' },
          location: { name: 'Location' },
          volunteersNeeded: 0,
        })
      ).rejects.toThrow('at least 1');
    });

    it('should sanitize user content', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: '<script>alert("xss")</script>Garden Work',
        description: 'Help us<script>',
        category: 'gardening',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Garden' },
        volunteersNeeded: 5,
      });

      expect(shift.title).not.toContain('<script>');
      expect(shift.description).not.toContain('<script>');
    });

    it('should support role-based volunteering', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Food Bank Shift',
        description: 'Help distribute food to families',
        category: 'food-distribution',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '10:00', endTime: '14:00' },
        location: { name: 'Community Food Bank' },
        volunteersNeeded: 15,
        roles: [
          { name: 'Greeter', description: 'Welcome families', volunteersNeeded: 2 },
          { name: 'Packer', description: 'Pack food boxes', volunteersNeeded: 8 },
          { name: 'Loader', description: 'Load cars', volunteersNeeded: 5 },
        ],
      });

      expect(shift.roles).toHaveLength(3);
      expect(shift.roles![0].name).toBe('Greeter');
      expect(shift.roles![0].volunteersNeeded).toBe(2);
      expect(shift.roles![0].volunteersAssigned).toHaveLength(0);
    });
  });

  describe('signUpForShift', () => {
    it('should allow volunteer to sign up', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Community Cleanup',
        description: 'Clean up the park',
        category: 'environment',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'City Park' },
        volunteersNeeded: 5,
      });

      await signUpForShift(shift.id, 'volunteer-1');

      const updated = db.getVolunteerShift(shift.id);
      expect(updated?.volunteersSignedUp).toContain('volunteer-1');
      expect(updated?.volunteersSignedUp).toHaveLength(1);
      expect(updated?.status).toBe('open'); // Still open, needs 5 total
    });

    it('should mark shift as filled when capacity reached', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Small Shift',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 2,
      });

      await signUpForShift(shift.id, 'volunteer-1');
      await signUpForShift(shift.id, 'volunteer-2');

      const updated = db.getVolunteerShift(shift.id);
      expect(updated?.status).toBe('filled');
      expect(updated?.volunteersSignedUp).toHaveLength(2);
    });

    it('should prevent duplicate signups', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Test Shift',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 5,
      });

      await signUpForShift(shift.id, 'volunteer-1');

      await expect(signUpForShift(shift.id, 'volunteer-1')).rejects.toThrow(
        'already signed up'
      );
    });

    it('should support role-based signup', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Food Bank',
        description: 'Help distribute food',
        category: 'food',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '10:00', endTime: '14:00' },
        location: { name: 'Food Bank' },
        volunteersNeeded: 10,
        roles: [
          { name: 'Greeter', volunteersNeeded: 2 },
          { name: 'Packer', volunteersNeeded: 5 },
        ],
      });

      await signUpForShift(shift.id, 'volunteer-1', 0); // Sign up for Greeter role

      const updated = db.getVolunteerShift(shift.id);
      expect(updated?.roles![0].volunteersAssigned).toContain('volunteer-1');
      expect(updated?.volunteersSignedUp).toContain('volunteer-1');
    });

    it('should prevent signup for cancelled shift', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 5,
      });

      await cancelShift(shift.id, 'organizer-1', 'Weather cancellation');

      await expect(signUpForShift(shift.id, 'volunteer-1')).rejects.toThrow(
        'cancelled shift'
      );
    });
  });

  describe('cancelShiftSignup', () => {
    it('should allow volunteer to cancel signup', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 5,
      });

      await signUpForShift(shift.id, 'volunteer-1');
      await cancelShiftSignup(shift.id, 'volunteer-1');

      const updated = db.getVolunteerShift(shift.id);
      expect(updated?.volunteersSignedUp).not.toContain('volunteer-1');
    });

    it('should reopen filled shift when volunteer cancels', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Small Shift',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 2,
      });

      await signUpForShift(shift.id, 'volunteer-1');
      await signUpForShift(shift.id, 'volunteer-2');

      let updated = db.getVolunteerShift(shift.id);
      expect(updated?.status).toBe('filled');

      await cancelShiftSignup(shift.id, 'volunteer-1');

      updated = db.getVolunteerShift(shift.id);
      expect(updated?.status).toBe('open');
      expect(updated?.volunteersSignedUp).toHaveLength(1);
    });

    it('should prevent cancelling if not signed up', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 5,
      });

      await expect(cancelShiftSignup(shift.id, 'volunteer-1')).rejects.toThrow(
        'not signed up'
      );
    });
  });

  describe('shift lifecycle', () => {
    it('should allow organizer to start shift', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 5,
      });

      await startShift(shift.id, 'organizer-1');

      const updated = db.getVolunteerShift(shift.id);
      expect(updated?.status).toBe('in-progress');
    });

    it('should allow organizer to complete shift', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Garden Work',
        description: 'Spring planting',
        category: 'gardening',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Garden' },
        volunteersNeeded: 5,
      });

      await completeShift(
        shift.id,
        'organizer-1',
        'Great work everyone!',
        'We planted 50 tomato seedlings and prepared 3 beds for spring crops'
      );

      const updated = db.getVolunteerShift(shift.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completionNotes).toBe('Great work everyone!');
      expect(updated?.impactDescription).toContain('50 tomato seedlings');
    });

    it('should allow organizer to cancel shift', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 5,
      });

      await cancelShift(shift.id, 'organizer-1', 'Rain forecast');

      const updated = db.getVolunteerShift(shift.id);
      expect(updated?.status).toBe('cancelled');
      expect(updated?.cancellationReason).toBe('Rain forecast');
      expect(updated?.cancelledAt).toBeDefined();
    });

    it('should prevent non-organizer from managing shift', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Location' },
        volunteersNeeded: 5,
      });

      await expect(startShift(shift.id, 'other-user')).rejects.toThrow(
        'Only the organizer'
      );

      await expect(completeShift(shift.id, 'other-user')).rejects.toThrow(
        'Only the organizer'
      );

      await expect(cancelShift(shift.id, 'other-user')).rejects.toThrow(
        'Only the organizer'
      );
    });
  });

  describe('createRecurringShift', () => {
    it('should create a recurring shift pattern', async () => {
      const recurrence: RecurrencePattern = {
        type: 'weekly',
        daysOfWeek: [6], // Saturday
      };

      const pattern = await createRecurringShift({
        organizerId: 'organizer-1',
        title: 'Weekly Food Distribution',
        description: 'Help distribute food to families every Saturday',
        category: 'food-distribution',
        location: { name: 'Food Bank', address: '456 Oak St' },
        recurrence,
        shiftTime: { startTime: '10:00', endTime: '13:00' },
        estimatedDuration: 180,
        volunteersNeeded: 12,
        whatToBring: ['Comfortable shoes'],
        preparationNotes: 'Parking available in back lot',
      });

      expect(pattern.id).toBeDefined();
      expect(pattern.title).toBe('Weekly Food Distribution');
      expect(pattern.recurrence.type).toBe('weekly');
      expect(pattern.recurrence.daysOfWeek).toContain(6);
      expect(pattern.active).toBe(true);
    });

    it('should allow pausing and resuming recurring shift', async () => {
      const recurrence: RecurrencePattern = {
        type: 'weekly',
        daysOfWeek: [6],
      };

      const pattern = await createRecurringShift({
        organizerId: 'organizer-1',
        title: 'Weekly Shift',
        description: 'Test',
        category: 'test',
        location: { name: 'Location' },
        recurrence,
        shiftTime: { startTime: '10:00', endTime: '13:00' },
        volunteersNeeded: 5,
      });

      await toggleRecurringShift(pattern.id, 'organizer-1', false);

      let updated = db.getRecurringShiftPattern(pattern.id);
      expect(updated?.active).toBe(false);

      await toggleRecurringShift(pattern.id, 'organizer-1', true);

      updated = db.getRecurringShiftPattern(pattern.id);
      expect(updated?.active).toBe(true);
    });

    it('should sanitize recurring shift content', async () => {
      const recurrence: RecurrencePattern = {
        type: 'weekly',
        daysOfWeek: [6],
      };

      const pattern = await createRecurringShift({
        organizerId: 'organizer-1',
        title: '<script>Test</script>Weekly Shift',
        description: 'Test<script>',
        category: 'test',
        location: { name: 'Location' },
        recurrence,
        shiftTime: { startTime: '10:00', endTime: '13:00' },
        volunteersNeeded: 5,
      });

      expect(pattern.title).not.toContain('<script>');
      expect(pattern.description).not.toContain('<script>');
    });
  });

  describe('browsing and filtering', () => {
    beforeEach(async () => {
      // Create several shifts for testing
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;

      await createVolunteerShift({
        organizerId: 'org-1',
        title: 'Garden Work',
        description: 'Planting',
        category: 'gardening',
        shiftDate: tomorrow,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Garden' },
        volunteersNeeded: 10,
      });

      await createVolunteerShift({
        organizerId: 'org-1',
        title: 'Food Distribution',
        description: 'Help families',
        category: 'food-distribution',
        shiftDate: nextWeek,
        shiftTime: { startTime: '10:00', endTime: '14:00' },
        location: { name: 'Food Bank' },
        volunteersNeeded: 15,
      });

      await createVolunteerShift({
        organizerId: 'org-2',
        title: 'Park Cleanup',
        description: 'Clean the park',
        category: 'environment',
        shiftDate: nextWeek,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { name: 'Park' },
        volunteersNeeded: 8,
      });
    });

    it('should browse all open shifts', () => {
      const shifts = browseOpenShifts();
      expect(shifts).toHaveLength(3);
    });

    it('should filter by category', () => {
      const gardeningShifts = browseOpenShifts({ category: 'gardening' });
      expect(gardeningShifts).toHaveLength(1);
      expect(gardeningShifts[0].title).toBe('Garden Work');
    });

    it('should filter by date range', () => {
      const now = Date.now();
      const threeDays = now + 3 * 24 * 60 * 60 * 1000;

      const nearShifts = browseOpenShifts({ startDate: now, endDate: threeDays });
      expect(nearShifts).toHaveLength(1);
      expect(nearShifts[0].title).toBe('Garden Work');
    });

    it('should get shifts by volunteer', async () => {
      const shifts = browseOpenShifts();
      await signUpForShift(shifts[0].id, 'volunteer-1');
      await signUpForShift(shifts[1].id, 'volunteer-1');

      const myShifts = getMyShifts('volunteer-1');
      expect(myShifts).toHaveLength(2);
    });

    it('should get shifts by organizer', () => {
      const org1Shifts = getOrganizedShifts('org-1');
      expect(org1Shifts).toHaveLength(2);

      const org2Shifts = getOrganizedShifts('org-2');
      expect(org2Shifts).toHaveLength(1);
    });

    it('should get upcoming shifts', () => {
      const upcoming = getUpcomingShifts();
      expect(upcoming.length).toBeGreaterThan(0);
      // Should be sorted by date
      for (let i = 1; i < upcoming.length; i++) {
        expect(upcoming[i].shiftDate).toBeGreaterThanOrEqual(upcoming[i - 1].shiftDate);
      }
    });

    it('should get shifts by category', () => {
      const foodShifts = getShiftsByCategory('food-distribution');
      expect(foodShifts).toHaveLength(1);
      expect(foodShifts[0].title).toBe('Food Distribution');
    });
  });

  describe('formatting', () => {
    it('should format shift for display', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Community Garden',
        description: 'Help us plant vegetables',
        category: 'gardening',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        estimatedDuration: 180,
        location: { name: 'Main St Garden', address: '123 Main St' },
        volunteersNeeded: 10,
        whatToBring: ['Gloves', 'Water'],
        preparationNotes: 'Wear old clothes',
        accessibilityInfo: 'Wheelchair accessible',
      });

      await signUpForShift(shift.id, 'volunteer-1');
      await signUpForShift(shift.id, 'volunteer-2');

      const formatted = formatShiftForDisplay(shift);

      expect(formatted).toContain('Community Garden');
      expect(formatted).toContain('2/10 volunteers');
      expect(formatted).toContain('Gloves');
      expect(formatted).toContain('Wear old clothes');
      expect(formatted).toContain('Wheelchair accessible');
    });

    it('should format recurring shift for display', async () => {
      const recurrence: RecurrencePattern = {
        type: 'weekly',
        daysOfWeek: [6],
      };

      const pattern = await createRecurringShift({
        organizerId: 'organizer-1',
        title: 'Weekly Food Bank',
        description: 'Distribute food',
        category: 'food',
        location: { name: 'Food Bank', address: '456 Oak St' },
        recurrence,
        shiftTime: { startTime: '10:00', endTime: '13:00' },
        volunteersNeeded: 12,
        whatToBring: ['Comfortable shoes'],
      });

      const formatted = formatRecurringShiftForDisplay(pattern);

      expect(formatted).toContain('Weekly Food Bank');
      expect(formatted).toContain('Weekly on Sat');
      expect(formatted).toContain('12 volunteers needed');
      expect(formatted).toContain('Comfortable shoes');
    });
  });

  describe('gift economy principles', () => {
    it('should track impact, not debt', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Community Meal',
        description: 'Serve meals to neighbors',
        category: 'mutual-aid',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '17:00', endTime: '20:00' },
        location: { name: 'Community Center' },
        volunteersNeeded: 8,
      });

      await signUpForShift(shift.id, 'volunteer-1');
      await signUpForShift(shift.id, 'volunteer-2');

      // Complete with impact description
      await completeShift(
        shift.id,
        'organizer-1',
        'Amazing volunteers!',
        'Served 120 meals to 45 families. Created warm community connections.'
      );

      const completed = db.getVolunteerShift(shift.id);

      // Impact is tracked
      expect(completed?.impactDescription).toContain('120 meals');
      expect(completed?.impactDescription).toContain('community connections');

      // NO debt or hour tracking - just celebration!
      expect(completed).not.toHaveProperty('hoursOwed');
      expect(completed).not.toHaveProperty('reciprocityExpected');
    });

    it('should support collective action without hierarchy', async () => {
      const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const shift = await createVolunteerShift({
        organizerId: 'organizer-1',
        title: 'Tool Library Setup',
        description: 'Set up the new tool library',
        category: 'community-building',
        shiftDate: nextSaturday,
        shiftTime: { startTime: '10:00', endTime: '15:00' },
        location: { name: 'Library' },
        volunteersNeeded: 6,
        roles: [
          { name: 'Organizer', description: 'Coordinate the work', volunteersNeeded: 1 },
          { name: 'Setup', description: 'Arrange shelves', volunteersNeeded: 3 },
          { name: 'Cataloging', description: 'Catalog tools', volunteersNeeded: 2 },
        ],
      });

      // Different roles, but all contribute equally in gift economy
      await signUpForShift(shift.id, 'user-1', 0); // Organizer role
      await signUpForShift(shift.id, 'user-2', 1); // Setup role
      await signUpForShift(shift.id, 'user-3', 1); // Setup role

      const updated = db.getVolunteerShift(shift.id);

      // Roles help coordinate, not create hierarchy
      expect(updated?.roles).toBeDefined();
      // All volunteers are equal - no "leader" privilege system
      expect(updated?.volunteersSignedUp).toHaveLength(3);
    });
  });
});
