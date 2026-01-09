/**
 * Tests for Availability Calendar
 * REQ-TIME-016: Communication and Confirmation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  createAvailability,
  updateAvailability,
  deactivateAvailability,
  activateAvailability,
  getUserAvailability,
  getUserActiveAvailability,
  getSkillAvailability,
  queryAvailability,
  getAvailabilityForDate,
  isUserAvailable,
} from './availability-calendar';

describe('Availability Calendar', () => {
  beforeEach(async () => {
    // Reset database before each test to ensure clean state
    await db.reset();
  });

  describe('createAvailability', () => {
    it('should create a one-time availability slot', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const slot = await createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [
          { startTime: '09:00', endTime: '12:00' },
        ],
        location: {
          type: 'virtual',
        },
        notes: 'Available for tutoring',
      });

      expect(slot).toBeDefined();
      expect(slot.userId).toBe('user-1');
      expect(slot.date).toBe(tomorrow);
      expect(slot.timeRanges).toHaveLength(1);
      expect(slot.active).toBe(true);
    });

    it('should create a recurring availability slot', async () => {
      const slot = await createAvailability({
        userId: 'user-2',
        recurrence: {
          type: 'weekly',
          daysOfWeek: [2, 4], // Tuesday and Thursday
        },
        timeRanges: [
          { startTime: '14:00', endTime: '17:00' },
        ],
        preferredActivityTypes: ['repairs', 'maintenance'],
      });

      expect(slot).toBeDefined();
      expect(slot.recurrence).toBeDefined();
      expect(slot.recurrence?.type).toBe('weekly');
      expect(slot.recurrence?.daysOfWeek).toEqual([2, 4]);
    });

    it('should create multiple time ranges in one slot', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const slot = await createAvailability({
        userId: 'user-3',
        date: tomorrow,
        timeRanges: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '14:00', endTime: '17:00' },
        ],
      });

      expect(slot.timeRanges).toHaveLength(2);
    });

    it('should enforce required fields', async () => {
      await expect(createAvailability({
        userId: 'user-1',
        timeRanges: [],
      })).rejects.toThrow('At least one time range is required');
    });

    it('should validate time format', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await expect(createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [
          { startTime: '25:00', endTime: '12:00' },
        ],
      })).rejects.toThrow('Time must be in HH:MM format');
    });
  });

  describe('getUserAvailability', () => {
    it('should return all availability slots for a user', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
      });

      await createAvailability({
        userId: 'user-1',
        recurrence: { type: 'weekly', daysOfWeek: [1] },
        timeRanges: [{ startTime: '14:00', endTime: '17:00' }],
      });

      const slots = getUserAvailability('user-1');
      expect(slots).toHaveLength(2);
    });
  });

  describe('deactivateAvailability and activateAvailability', () => {
    it('should deactivate and reactivate a slot', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const slot = await createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
      });

      expect(getUserActiveAvailability('user-1')).toHaveLength(1);

      await deactivateAvailability(slot.id);
      expect(getUserActiveAvailability('user-1')).toHaveLength(0);

      await activateAvailability(slot.id);
      expect(getUserActiveAvailability('user-1')).toHaveLength(1);
    });
  });

  describe('queryAvailability', () => {
    it('should filter by date range', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const nextMonth = Date.now() + 30 * 24 * 60 * 60 * 1000;

      await createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
      });

      await createAvailability({
        userId: 'user-1',
        date: nextWeek,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
      });

      await createAvailability({
        userId: 'user-1',
        date: nextMonth,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
      });

      const results = queryAvailability({
        startDate: Date.now(),
        endDate: Date.now() + 10 * 24 * 60 * 60 * 1000, // Next 10 days
      });

      expect(results).toHaveLength(2); // tomorrow and next week, not next month
    });

    it('should filter by userId', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
      });

      await createAvailability({
        userId: 'user-2',
        date: tomorrow,
        timeRanges: [{ startTime: '14:00', endTime: '17:00' }],
      });

      const results = queryAvailability({
        startDate: Date.now(),
        endDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
        userId: 'user-1',
      });

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe('user-1');
    });

    it('should filter by activity type', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
        preferredActivityTypes: ['tutoring'],
      });

      await createAvailability({
        userId: 'user-2',
        date: tomorrow,
        timeRanges: [{ startTime: '14:00', endTime: '17:00' }],
        preferredActivityTypes: ['repairs'],
      });

      const results = queryAvailability({
        startDate: Date.now(),
        endDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
        activityType: 'tutoring',
      });

      expect(results).toHaveLength(1);
      expect(results[0].preferredActivityTypes).toContain('tutoring');
    });
  });

  describe('isUserAvailable', () => {
    it('should check if user is available at specific time', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '14:00', endTime: '17:00' },
        ],
      });

      const isAvailableMorning = isUserAvailable(
        'user-1',
        tomorrow,
        { startTime: '10:00', endTime: '11:00' }
      );
      expect(isAvailableMorning).toBe(true);

      const isAvailableAfternoon = isUserAvailable(
        'user-1',
        tomorrow,
        { startTime: '15:00', endTime: '16:00' }
      );
      expect(isAvailableAfternoon).toBe(true);

      const isAvailableEvening = isUserAvailable(
        'user-1',
        tomorrow,
        { startTime: '19:00', endTime: '20:00' }
      );
      expect(isAvailableEvening).toBe(false);
    });
  });

  describe('getSkillAvailability', () => {
    it('should get availability for a specific skill', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await createAvailability({
        userId: 'user-1',
        skillOfferId: 'skill-tutoring',
        date: tomorrow,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
      });

      await createAvailability({
        userId: 'user-1',
        skillOfferId: 'skill-repairs',
        date: tomorrow,
        timeRanges: [{ startTime: '14:00', endTime: '17:00' }],
      });

      const slots = getSkillAvailability('skill-tutoring');
      expect(slots).toHaveLength(1);
      expect(slots[0].skillOfferId).toBe('skill-tutoring');
    });
  });

  describe('booking capacity', () => {
    it('should respect maxBookings limit', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await createAvailability({
        userId: 'user-1',
        date: tomorrow,
        timeRanges: [{ startTime: '09:00', endTime: '12:00' }],
        maxBookings: 2,
      });

      let results = queryAvailability({
        startDate: Date.now(),
        endDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
      });
      expect(results).toHaveLength(1);

      // Simulate booking by directly updating through database
      // (In real implementation, this would be done through a booking function)
      await db.updateAvailabilitySlot(results[0].id, { currentBookings: 2 });

      results = queryAvailability({
        startDate: Date.now(),
        endDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
      });
      expect(results).toHaveLength(0); // Should be filtered out as fully booked
    });
  });
});
