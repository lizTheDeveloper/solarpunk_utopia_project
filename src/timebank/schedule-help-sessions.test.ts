/**
 * Tests for Schedule Help Sessions
 * REQ-TIME-016: Communication and Confirmation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  scheduleHelpSession,
  confirmHelpSession,
  cancelHelpSession,
  rescheduleHelpSession,
  completeHelpSession,
  expressGratitude,
  getHelpSession,
  getUpcomingHelpSessions,
  hasSessionConflict,
} from './schedule-help-sessions';
import type { TimeRange } from '../types';

describe('Schedule Help Sessions', () => {
  beforeEach(async () => {
    // Initialize fresh database for each test
    await db.init();
    await db.reset();
  });

  describe('scheduleHelpSession', () => {
    it('should create a new help session', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      const timeRange: TimeRange = { startTime: '14:00', endTime: '15:00' };

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Math tutoring',
        description: 'Help with algebra',
        scheduledDate: tomorrow,
        scheduledTime: timeRange,
        estimatedDuration: 60,
        location: {
          type: 'virtual',
          details: 'Zoom link: https://zoom.us/j/123456',
        },
        notes: 'Please bring homework questions',
      });

      expect(session.id).toBeDefined();
      expect(session.volunteerId).toBe('volunteer-1');
      expect(session.recipientId).toBe('recipient-1');
      expect(session.title).toBe('Math tutoring');
      expect(session.status).toBe('pending');
      expect(session.volunteerConfirmed).toBe(false);
      expect(session.recipientConfirmed).toBe(false);
    });

    it('should require title', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await expect(
        scheduleHelpSession({
          volunteerId: 'volunteer-1',
          recipientId: 'recipient-1',
          title: '',
          scheduledDate: tomorrow,
          scheduledTime: { startTime: '14:00', endTime: '15:00' },
          location: { type: 'virtual' },
        })
      ).rejects.toThrow('title is required');
    });

    it('should sanitize user content', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: '<script>alert("xss")</script>Math help',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '14:00', endTime: '15:00' },
        location: { type: 'virtual' },
      });

      expect(session.title).not.toContain('<script>');
    });
  });

  describe('confirmHelpSession', () => {
    it('should allow volunteer to confirm', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Bike repair',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'volunteer-place' },
      });

      await confirmHelpSession(session.id, 'volunteer-1');

      const updated = getHelpSession(session.id);
      expect(updated?.volunteerConfirmed).toBe(true);
      expect(updated?.recipientConfirmed).toBe(false);
      expect(updated?.status).toBe('pending'); // Still pending until both confirm
    });

    it('should allow recipient to confirm', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Bike repair',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'volunteer-place' },
      });

      await confirmHelpSession(session.id, 'recipient-1');

      const updated = getHelpSession(session.id);
      expect(updated?.recipientConfirmed).toBe(true);
      expect(updated?.volunteerConfirmed).toBe(false);
      expect(updated?.status).toBe('pending');
    });

    it('should mark as confirmed when both parties confirm', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Cooking lesson',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '18:00', endTime: '19:00' },
        location: { type: 'volunteer-place' },
      });

      await confirmHelpSession(session.id, 'volunteer-1');
      await confirmHelpSession(session.id, 'recipient-1');

      const updated = getHelpSession(session.id);
      expect(updated?.status).toBe('confirmed');
      expect(updated?.volunteerConfirmed).toBe(true);
      expect(updated?.recipientConfirmed).toBe(true);
    });

    it('should reject confirmation from non-participant', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Help session',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'virtual' },
      });

      await expect(
        confirmHelpSession(session.id, 'random-user')
      ).rejects.toThrow('not a participant');
    });
  });

  describe('cancelHelpSession', () => {
    it('should cancel a session', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Guitar lesson',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '15:00', endTime: '16:00' },
        location: { type: 'volunteer-place' },
      });

      await cancelHelpSession(session.id, 'volunteer-1', 'Something came up');

      const updated = getHelpSession(session.id);
      expect(updated?.status).toBe('cancelled');
      expect(updated?.cancelledBy).toBe('volunteer-1');
      expect(updated?.cancellationReason).toBe('Something came up');
      expect(updated?.cancelledAt).toBeDefined();
    });

    it('should reject cancellation from non-participant', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Help session',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'virtual' },
      });

      await expect(
        cancelHelpSession(session.id, 'random-user')
      ).rejects.toThrow('not a participant');
    });
  });

  describe('rescheduleHelpSession', () => {
    it('should reschedule a session', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Spanish lesson',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'virtual' },
      });

      const newSession = await rescheduleHelpSession(
        session.id,
        nextWeek,
        { startTime: '14:00', endTime: '15:00' },
        'Rescheduled to next week'
      );

      const oldSession = getHelpSession(session.id);
      expect(oldSession?.status).toBe('cancelled');
      expect(oldSession?.rescheduledTo).toBe(newSession.id);

      expect(newSession.status).toBe('pending');
      expect(newSession.scheduledDate).toBe(nextWeek);
      expect(newSession.rescheduledFrom).toBe(session.id);
    });
  });

  describe('completeHelpSession', () => {
    it('should complete a session with feedback', async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Computer help',
        scheduledDate: yesterday,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'recipient-place' },
      });

      await completeHelpSession(
        session.id,
        'volunteer-1',
        'Great session! Helped set up new laptop.'
      );

      const updated = getHelpSession(session.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completionNotes?.volunteerFeedback).toBe('Great session! Helped set up new laptop.');
    });

    it('should allow both parties to add feedback', async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Gardening help',
        scheduledDate: yesterday,
        scheduledTime: { startTime: '09:00', endTime: '10:00' },
        location: { type: 'recipient-place' },
      });

      await completeHelpSession(session.id, 'volunteer-1', 'Fun helping in the garden!');
      await completeHelpSession(session.id, 'recipient-1', 'Learned so much about pruning!');

      const updated = getHelpSession(session.id);
      expect(updated?.completionNotes?.volunteerFeedback).toBe('Fun helping in the garden!');
      expect(updated?.completionNotes?.recipientFeedback).toBe('Learned so much about pruning!');
    });
  });

  describe('expressGratitude', () => {
    it('should allow recipient to express gratitude', async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Moving help',
        scheduledDate: yesterday,
        scheduledTime: { startTime: '08:00', endTime: '12:00' },
        location: { type: 'recipient-place' },
      });

      await expressGratitude(session.id, 'recipient-1');

      const updated = getHelpSession(session.id);
      expect(updated?.completionNotes?.gratitudeExpressed).toBe(true);
    });

    it('should reject gratitude from volunteer', async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;

      const session = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Help session',
        scheduledDate: yesterday,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'virtual' },
      });

      await expect(
        expressGratitude(session.id, 'volunteer-1')
      ).rejects.toThrow('Only the recipient can express gratitude');
    });
  });

  describe('getUpcomingHelpSessions', () => {
    it('should return only future confirmed/pending sessions', async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;

      // Past session
      await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Past session',
        scheduledDate: yesterday,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'virtual' },
      });

      // Future pending session
      await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Tomorrow session',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '14:00', endTime: '15:00' },
        location: { type: 'virtual' },
      });

      // Future confirmed session
      const confirmedSession = await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Next week session',
        scheduledDate: nextWeek,
        scheduledTime: { startTime: '10:00', endTime: '11:00' },
        location: { type: 'virtual' },
      });
      await confirmHelpSession(confirmedSession.id, 'volunteer-1');
      await confirmHelpSession(confirmedSession.id, 'recipient-1');

      const upcoming = getUpcomingHelpSessions('volunteer-1');
      expect(upcoming.length).toBe(2);
      expect(upcoming[0].title).toBe('Tomorrow session');
      expect(upcoming[1].title).toBe('Next week session');
    });
  });

  describe('hasSessionConflict', () => {
    it('should detect time conflicts', async () => {
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      await scheduleHelpSession({
        volunteerId: 'volunteer-1',
        recipientId: 'recipient-1',
        title: 'Existing session',
        scheduledDate: tomorrow,
        scheduledTime: { startTime: '14:00', endTime: '15:00' },
        location: { type: 'virtual' },
      });

      // Overlapping time
      const conflict1 = hasSessionConflict(
        'volunteer-1',
        tomorrow,
        { startTime: '14:30', endTime: '15:30' }
      );
      expect(conflict1).toBe(true);

      // Non-overlapping time
      const conflict2 = hasSessionConflict(
        'volunteer-1',
        tomorrow,
        { startTime: '16:00', endTime: '17:00' }
      );
      expect(conflict2).toBe(false);
    });
  });
});
