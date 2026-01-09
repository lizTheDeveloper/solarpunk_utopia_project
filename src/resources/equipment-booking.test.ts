/**
 * Equipment Booking System Tests
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-012: Resource Availability Calendars
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  createBooking,
  getBookingsForResource,
  getBookingsByUser,
  getBooking,
  updateBooking,
  cancelBooking,
  markBookingActive,
  completeBooking,
  checkBookingConflicts,
  getResourceAvailability,
  findOptimalBookingTimes,
  getUpcomingBookings,
  getActiveBookings,
  getPastBookings,
  getOverdueBookings,
} from './equipment-booking';
import { addToolToLibrary } from './tool-library';

describe('Equipment Booking System', () => {
  beforeEach(async () => {
    await db.init();
    await db.reset(); // Reset database between tests
  });

  describe('createBooking', () => {
    it('should create a booking for available equipment', async () => {
      // Add a tool
      const tool = await addToolToLibrary('user-1', {
        name: 'Power Drill',
        description: 'Cordless power drill',
        category: 'power-tools',
        condition: 'good',
      });

      // Create booking
      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      const booking = await createBooking('user-2', tool.id, tomorrow, dayAfter, {
        purpose: 'Building shelves',
        notes: 'Will pick up in the morning',
      });

      expect(booking).toBeDefined();
      expect(booking.userId).toBe('user-2');
      expect(booking.resourceId).toBe(tool.id);
      expect(booking.status).toBe('confirmed');
      expect(booking.purpose).toBe('Building shelves');
    });

    it('should reject booking with invalid time range', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Saw',
        description: 'Hand saw',
        category: 'hand-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);

      await expect(
        createBooking('user-2', tool.id, tomorrow, tomorrow)
      ).rejects.toThrow('Start time must be before end time');
    });

    it('should reject booking in the past', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Hammer',
        description: 'Claw hammer',
        category: 'hand-tools',
        condition: 'good',
      });

      const yesterday = Date.now() - (24 * 60 * 60 * 1000);
      const today = Date.now();

      await expect(
        createBooking('user-2', tool.id, yesterday, today)
      ).rejects.toThrow('Cannot book equipment in the past');
    });

    it('should prevent resource owner from booking their own equipment', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Wrench',
        description: 'Adjustable wrench',
        category: 'hand-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      const result = await createBooking('user-1', tool.id, tomorrow, dayAfter);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Resource owners manage their own equipment schedule');
    });

    it('should detect booking conflicts', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Ladder',
        description: '6-foot ladder',
        category: 'hand-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const threeDaysFromNow = tomorrow + (2 * 24 * 60 * 60 * 1000);

      // First booking
      await createBooking('user-2', tool.id, tomorrow, threeDaysFromNow);

      // Try overlapping booking
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);
      const fourDaysFromNow = threeDaysFromNow + (24 * 60 * 60 * 1000);

      const result = await createBooking('user-3', tool.id, dayAfter, fourDaysFromNow);

      expect(result.success).toBe(false);
      expect(result.error).toContain('conflicts with existing bookings');
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts!.length).toBeGreaterThan(0);
    });

    it('should enforce max borrow days', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Expensive Tool',
        description: 'Limited availability',
        category: 'power-tools',
        condition: 'good',
        maxBorrowDays: 3,
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const fiveDaysFromNow = tomorrow + (4 * 24 * 60 * 60 * 1000);

      const result = await createBooking('user-2', tool.id, tomorrow, fiveDaysFromNow);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum borrow period');
    });

    it('should sanitize user input', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Screwdriver',
        description: 'Phillips head',
        category: 'hand-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      const result = await createBooking('user-2', tool.id, tomorrow, dayAfter, {
        purpose: '<script>alert("xss")</script>Fix bike',
        notes: '<b>Urgent</b>',
      });

      expect(result.success).toBe(true);
      expect(result.booking?.purpose).not.toContain('<script>');
      expect(result.booking?.notes).not.toContain('<b>');
    });
  });

  describe('updateBooking', () => {
    it('should allow user to update their booking', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Chainsaw',
        description: 'Gas chainsaw',
        category: 'power-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const threeDaysFromNow = tomorrow + (2 * 24 * 60 * 60 * 1000);

      const booking = await createBooking('user-2', tool.id, tomorrow, threeDaysFromNow);
      expect(booking.success).toBe(true);

      // Update booking
      const newEnd = tomorrow + (24 * 60 * 60 * 1000);
      const updateResult = await updateBooking(booking.booking!.id, 'user-2', {
        endTime: newEnd,
        purpose: 'Cutting firewood',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.booking?.endTime).toBe(newEnd);
      expect(updateResult.booking?.purpose).toBe('Cutting firewood');
    });

    it('should allow resource owner to update booking', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Sander',
        description: 'Orbital sander',
        category: 'power-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      const booking = await createBooking('user-2', tool.id, tomorrow, dayAfter);
      expect(booking.success).toBe(true);

      // Owner updates
      const updateResult = await updateBooking(booking.booking!.id, 'user-1', {
        notes: 'Confirmed pickup time',
      });

      expect(updateResult.success).toBe(true);
    });

    it('should reject unauthorized updates', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Pliers',
        description: 'Needle nose',
        category: 'hand-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      const booking = await createBooking('user-2', tool.id, tomorrow, dayAfter);
      expect(booking.success).toBe(true);

      // User-3 tries to update
      const updateResult = await updateBooking(booking.booking!.id, 'user-3', {
        notes: 'Hacked',
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('Not authorized');
    });

    it('should prevent updating to conflicting times', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Clamp',
        description: 'Large clamp',
        category: 'woodworking',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const threeDaysFromNow = tomorrow + (2 * 24 * 60 * 60 * 1000);
      const fiveDaysFromNow = threeDaysFromNow + (2 * 24 * 60 * 60 * 1000);

      // Two bookings
      const booking1 = await createBooking('user-2', tool.id, tomorrow, threeDaysFromNow);
      const booking2 = await createBooking('user-3', tool.id, fiveDaysFromNow, fiveDaysFromNow + (24 * 60 * 60 * 1000));

      expect(booking1.success).toBe(true);
      expect(booking2.success).toBe(true);

      // Try to extend booking1 into booking2's time
      const updateResult = await updateBooking(booking1.booking!.id, 'user-2', {
        endTime: fiveDaysFromNow + (12 * 60 * 60 * 1000), // Overlap by 12 hours
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('conflicts');
    });
  });

  describe('cancelBooking', () => {
    it('should allow user to cancel their booking', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Rake',
        description: 'Garden rake',
        category: 'garden-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      const booking = await createBooking('user-2', tool.id, tomorrow, dayAfter);
      expect(booking.success).toBe(true);

      const result = await cancelBooking(booking.booking!.id, 'user-2', 'Plans changed');

      expect(result.success).toBe(true);

      const cancelledBooking = getBooking(booking.booking!.id);
      expect(cancelledBooking?.status).toBe('cancelled');
      expect(cancelledBooking?.notes).toContain('Plans changed');
    });

    it('should allow resource owner to cancel booking', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Shovel',
        description: 'Garden shovel',
        category: 'garden-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      const booking = await createBooking('user-2', tool.id, tomorrow, dayAfter);
      expect(booking.success).toBe(true);

      const result = await cancelBooking(booking.booking!.id, 'user-1', 'Tool needs repair');

      expect(result.success).toBe(true);

      const cancelledBooking = getBooking(booking.booking!.id);
      expect(cancelledBooking?.status).toBe('cancelled');
    });
  });

  describe('Booking lifecycle', () => {
    it('should complete full booking lifecycle', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Miter Saw',
        description: 'Compound miter saw',
        category: 'power-tools',
        condition: 'excellent',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      // 1. Create booking
      const booking = await createBooking('user-2', tool.id, tomorrow, dayAfter);
      expect(booking.success).toBe(true);
      expect(booking.booking?.status).toBe('confirmed');

      // 2. Mark as active (pickup)
      const activeResult = await markBookingActive(booking.booking!.id, 'user-1');
      expect(activeResult.success).toBe(true);

      const activeBooking = getBooking(booking.booking!.id);
      expect(activeBooking?.status).toBe('active');

      // Resource should be unavailable
      const resource = db.getResource(tool.id);
      expect(resource?.available).toBe(false);

      // 3. Complete booking (return)
      const completeResult = await completeBooking(booking.booking!.id, 'user-1', {
        condition: 'good',
        notes: 'Everything worked great',
      });
      expect(completeResult.success).toBe(true);

      const completedBooking = getBooking(booking.booking!.id);
      expect(completedBooking?.status).toBe('completed');

      // Resource should be available again
      const returnedResource = db.getResource(tool.id);
      expect(returnedResource?.available).toBe(true);
    });

    it('should only allow owner to mark booking active', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Router',
        description: 'Wood router',
        category: 'woodworking',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      const booking = await createBooking('user-2', tool.id, tomorrow, dayAfter);
      expect(booking.success).toBe(true);

      // User-2 tries to activate (should fail)
      const result = await markBookingActive(booking.booking!.id, 'user-2');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Only resource owner');
    });
  });

  describe('getResourceAvailability', () => {
    it('should return availability calendar', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Compressor',
        description: 'Air compressor',
        category: 'power-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const twoDaysFromNow = tomorrow + (24 * 60 * 60 * 1000);
      const threeDaysFromNow = twoDaysFromNow + (24 * 60 * 60 * 1000);
      const sevenDaysFromNow = tomorrow + (6 * 24 * 60 * 60 * 1000);

      // Book two days
      await createBooking('user-2', tool.id, tomorrow, threeDaysFromNow);

      // Get availability for next 7 days
      const availability = getResourceAvailability(tool.id, tomorrow, sevenDaysFromNow);

      expect(availability.length).toBeGreaterThan(0);
      expect(availability[0].available).toBe(false); // First day is booked
      expect(availability[0].bookings.length).toBeGreaterThan(0);
    });
  });

  describe('findOptimalBookingTimes', () => {
    it('should find available times across multiple resources', async () => {
      const tool1 = await addToolToLibrary('user-1', {
        name: 'Drill 1',
        description: 'First drill',
        category: 'power-tools',
        condition: 'good',
      });

      const tool2 = await addToolToLibrary('user-2', {
        name: 'Drill 2',
        description: 'Second drill',
        category: 'power-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);
      const sevenDaysFromNow = tomorrow + (6 * 24 * 60 * 60 * 1000);

      // Book tool1 for tomorrow
      await createBooking('user-3', tool1.id, tomorrow, dayAfter);

      // Find times when at least one tool is available
      const duration = 24 * 60 * 60 * 1000; // 1 day
      const optimalTimes = findOptimalBookingTimes(
        [tool1.id, tool2.id],
        duration,
        tomorrow,
        sevenDaysFromNow
      );

      expect(optimalTimes.length).toBeGreaterThan(0);

      // First day should only have tool2 available
      const firstDay = optimalTimes.find(t => t.startTime === tomorrow);
      expect(firstDay).toBeDefined();
      expect(firstDay!.availableResources).toContain(tool2.id);
    });
  });

  describe('getUpcomingBookings', () => {
    it('should return upcoming bookings for user', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Paint Sprayer',
        description: 'Electric sprayer',
        category: 'painting',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const threeDaysFromNow = tomorrow + (2 * 24 * 60 * 60 * 1000);
      const tenDaysFromNow = Date.now() + (10 * 24 * 60 * 60 * 1000);

      // Booking within 7 days
      await createBooking('user-2', tool.id, tomorrow, threeDaysFromNow);

      // Booking beyond 7 days (should not appear)
      await createBooking('user-2', tool.id, tenDaysFromNow, tenDaysFromNow + (24 * 60 * 60 * 1000));

      const upcoming = getUpcomingBookings('user-2');

      expect(upcoming.length).toBe(1);
      expect(upcoming[0].startTime).toBe(tomorrow);
    });
  });

  describe('getOverdueBookings', () => {
    it('should detect overdue active bookings', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Jackhammer',
        description: 'Heavy duty',
        category: 'power-tools',
        condition: 'good',
      });

      // Create a booking that will be in the past (but was future when created)
      const twoHoursFromNow = Date.now() + (2 * 60 * 60 * 1000);
      const threeHoursFromNow = Date.now() + (3 * 60 * 60 * 1000);

      const booking = await createBooking('user-2', tool.id, twoHoursFromNow, threeHoursFromNow);
      expect(booking.success).toBe(true);

      // Mark as active
      await markBookingActive(booking.booking!.id, 'user-1');

      // Simulate time passing by manually setting the end time to the past
      const activeBooking = getBooking(booking.booking!.id);
      if (activeBooking) {
        activeBooking.endTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
      }

      const overdue = getOverdueBookings('user-2');

      expect(overdue.length).toBe(1);
      expect(overdue[0].id).toBe(booking.booking!.id);
    });
  });

  describe('Query functions', () => {
    it('should get bookings for resource', async () => {
      const tool = await addToolToLibrary('user-1', {
        name: 'Grinder',
        description: 'Angle grinder',
        category: 'power-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      await createBooking('user-2', tool.id, tomorrow, dayAfter);
      await createBooking('user-3', tool.id, dayAfter + (24 * 60 * 60 * 1000), dayAfter + (48 * 60 * 60 * 1000));

      const bookings = getBookingsForResource(tool.id);

      expect(bookings.length).toBe(2);
      expect(bookings[0].startTime).toBeLessThan(bookings[1].startTime);
    });

    it('should get bookings by user', async () => {
      const tool1 = await addToolToLibrary('user-1', {
        name: 'Tool 1',
        description: 'First tool',
        category: 'hand-tools',
        condition: 'good',
      });

      const tool2 = await addToolToLibrary('user-1', {
        name: 'Tool 2',
        description: 'Second tool',
        category: 'hand-tools',
        condition: 'good',
      });

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const dayAfter = tomorrow + (24 * 60 * 60 * 1000);

      await createBooking('user-2', tool1.id, tomorrow, dayAfter);
      await createBooking('user-2', tool2.id, dayAfter, dayAfter + (24 * 60 * 60 * 1000));

      const bookings = getBookingsByUser('user-2');

      expect(bookings.length).toBe(2);
    });
  });
});
