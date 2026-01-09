/**
 * Tests for Need Response System
 * Phase 2, Group C: Respond to needs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, LocalDatabase } from '../core/database';
import { NeedPosting } from './need-posting';
import {
  respondToNeed,
  getNeedResponses,
  markNeedFulfilled,
  getOpenNeeds,
  getResponseCount,
  hasUserResponded,
  formatNeedForDisplay,
} from './need-response';
import type { Need } from '../types';

describe('Need Response System', () => {
  let needPosting: NeedPosting;
  let testNeed: Need;

  beforeEach(async () => {
    // Use the global db singleton that need-response uses
    await db.init();

    // Clear all existing needs before each test to ensure isolation
    const existingNeeds = db.listNeeds();
    for (const need of existingNeeds) {
      await db.deleteNeed(need.id);
    }

    needPosting = new NeedPosting(db);

    // Create a test need
    testNeed = await needPosting.postNeed(
      {
        description: 'Need a ladder for weekend project',
        urgency: 'helpful',
        resourceType: 'tool',
      },
      { userId: 'user-alice' }
    );
  });

  describe('respondToNeed', () => {
    it('should allow responding to a need', async () => {
      const response = await respondToNeed(
        'user-bob',
        testNeed.id,
        'I have a 6ft ladder you can borrow!'
      );

      expect(response.success).toBe(true);
      expect(response.response).toBeDefined();
      expect(response.response?.message).toContain('6ft ladder');
      expect(response.response?.responderId).toBe('user-bob');
      expect(response.response?.needId).toBe(testNeed.id);
    });

    it('should not allow responding to your own need', async () => {
      const response = await respondToNeed(
        'user-alice',
        testNeed.id,
        'I can help myself'
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('own need');
    });

    it('should not allow responding to fulfilled need', async () => {
      // Mark need as fulfilled
      await markNeedFulfilled(testNeed.id, 'user-alice');

      // Try to respond
      const response = await respondToNeed(
        'user-bob',
        testNeed.id,
        'I want to help'
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('already been fulfilled');
    });

    it('should validate user ID', async () => {
      const response = await respondToNeed(
        '',
        testNeed.id,
        'Help message'
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid user ID');
    });

    it('should validate need ID', async () => {
      const response = await respondToNeed(
        'user-bob',
        '',
        'Help message'
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid need ID');
    });

    it('should require a message', async () => {
      const response = await respondToNeed(
        'user-bob',
        testNeed.id,
        ''
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('message is required');
    });

    it('should sanitize message content', async () => {
      const response = await respondToNeed(
        'user-bob',
        testNeed.id,
        'I can help! <script>alert("xss")</script>'
      );

      expect(response.success).toBe(true);
      expect(response.response?.message).not.toContain('<script>');
      expect(response.response?.message).toContain('I can help!');
    });

    it('should handle multiple responses to the same need', async () => {
      // First response
      const response1 = await respondToNeed(
        'user-bob',
        testNeed.id,
        'I have a ladder'
      );

      // Second response from different user
      const response2 = await respondToNeed(
        'user-charlie',
        testNeed.id,
        'I can also help'
      );

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);

      const responses = getNeedResponses(testNeed.id);
      expect(responses.length).toBe(2);
    });
  });

  describe('getNeedResponses', () => {
    it('should return all responses to a need', async () => {
      // Add some responses
      await respondToNeed('user-bob', testNeed.id, 'I can help');
      await respondToNeed('user-charlie', testNeed.id, 'Me too');

      const responses = getNeedResponses(testNeed.id);

      expect(responses.length).toBe(2);
      expect(responses[0].event).toBeDefined();
    });

    it('should return empty array for need with no responses', () => {
      const responses = getNeedResponses(testNeed.id);
      expect(responses.length).toBe(0);
    });

    it('should validate need ID', () => {
      const responses = getNeedResponses('');
      expect(responses.length).toBe(0);
    });
  });

  describe('markNeedFulfilled', () => {
    it('should allow need creator to mark it fulfilled', async () => {
      const result = await markNeedFulfilled(
        testNeed.id,
        'user-alice'
      );

      expect(result.success).toBe(true);

      // Verify need is marked fulfilled
      const needs = db.listNeeds();
      const updatedNeed = needs.find(n => n.id === testNeed.id);
      expect(updatedNeed?.fulfilled).toBe(true);
    });

    it('should not allow non-creator to mark need fulfilled', async () => {
      const result = await markNeedFulfilled(
        testNeed.id,
        'user-bob'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only the person who posted');
    });

    it('should not allow marking already fulfilled need', async () => {
      // Mark it fulfilled first time
      await markNeedFulfilled(testNeed.id, 'user-alice');

      // Try to mark again
      const result = await markNeedFulfilled(
        testNeed.id,
        'user-alice'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already marked as fulfilled');
    });

    it('should record gratitude messages', async () => {
      // Respond to need first
      await respondToNeed('user-bob', testNeed.id, 'I can help');

      // Mark fulfilled with gratitude
      const result = await markNeedFulfilled(
        testNeed.id,
        'user-alice',
        {
          fulfilledBy: ['user-bob'],
          gratitudeMessage: 'Thank you so much!',
        }
      );

      expect(result.success).toBe(true);

      // Check that gratitude was recorded
      const events = db.listEvents();
      const gratitudeEvent = events.find(e =>
        e.note?.includes('Gratitude:')
      );
      expect(gratitudeEvent).toBeDefined();
      expect(gratitudeEvent?.note).toContain('Thank you so much!');
    });

    it('should handle multiple helpers in gratitude', async () => {
      // Count existing events before this test
      const eventsBefore = db.listEvents().filter(e => e.note?.includes('Gratitude:'));
      const countBefore = eventsBefore.length;

      const result = await markNeedFulfilled(
        testNeed.id,
        'user-alice',
        {
          fulfilledBy: ['user-bob', 'user-charlie'],
          gratitudeMessage: 'Thanks everyone!',
        }
      );

      expect(result.success).toBe(true);

      // Should create gratitude events for each helper
      const eventsAfter = db.listEvents().filter(e =>
        e.note?.includes('Gratitude:')
      );
      // 2 new events should be created (one for each helper)
      expect(eventsAfter.length - countBefore).toBe(2);
    });
  });

  describe('getOpenNeeds', () => {
    it('should return only unfulfilled needs', async () => {
      // Create another need
      await needPosting.postNeed(
        {
          description: 'Another need',
          urgency: 'casual',
        },
        { userId: 'user-bob' }
      );

      // Mark first need as fulfilled
      await markNeedFulfilled(testNeed.id, 'user-alice');

      const openNeeds = getOpenNeeds();

      expect(openNeeds.length).toBe(1);
      expect(openNeeds[0].description).toBe('Another need');
    });

    it('should filter by urgency', async () => {
      // Create urgent need
      await needPosting.postNeed(
        {
          description: 'Urgent need',
          urgency: 'urgent',
        },
        { userId: 'user-bob' }
      );

      const urgentNeeds = getOpenNeeds({ urgency: 'urgent' });

      expect(urgentNeeds.length).toBe(1);
      expect(urgentNeeds[0].urgency).toBe('urgent');
    });

    it('should sort by urgency then date', async () => {
      // Create needs with different urgencies
      await needPosting.postNeed(
        { description: 'Casual', urgency: 'casual' },
        { userId: 'user-bob' }
      );
      await needPosting.postNeed(
        { description: 'Urgent', urgency: 'urgent' },
        { userId: 'user-charlie' }
      );
      await needPosting.postNeed(
        { description: 'Needed', urgency: 'needed' },
        { userId: 'user-dave' }
      );

      const openNeeds = getOpenNeeds();

      expect(openNeeds[0].urgency).toBe('urgent');
      expect(openNeeds[1].urgency).toBe('needed');
      expect(openNeeds[2].urgency).toBe('helpful');
      expect(openNeeds[3].urgency).toBe('casual');
    });
  });

  describe('getResponseCount', () => {
    it('should return correct count', async () => {
      expect(getResponseCount(testNeed.id)).toBe(0);

      await respondToNeed('user-bob', testNeed.id, 'Help 1');
      expect(getResponseCount(testNeed.id)).toBe(1);

      await respondToNeed('user-charlie', testNeed.id, 'Help 2');
      expect(getResponseCount(testNeed.id)).toBe(2);
    });
  });

  describe('hasUserResponded', () => {
    it('should return true if user has responded', async () => {
      await respondToNeed('user-bob', testNeed.id, 'I can help');

      expect(hasUserResponded('user-bob', testNeed.id)).toBe(true);
      expect(hasUserResponded('user-charlie', testNeed.id)).toBe(false);
    });
  });

  describe('formatNeedForDisplay', () => {
    it('should format need with urgency badge', () => {
      const formatted = formatNeedForDisplay(testNeed);

      expect(formatted).toContain('💚');
      expect(formatted).toContain('🔓 Open');
      expect(formatted).toContain('Need a ladder');
    });

    it('should show fulfilled status', async () => {
      await markNeedFulfilled(testNeed.id, 'user-alice');

      const needs = db.listNeeds();
      const fulfilledNeed = needs.find(n => n.id === testNeed.id);

      const formatted = formatNeedForDisplay(fulfilledNeed!);

      expect(formatted).toContain('✅ Fulfilled');
    });

    it('should show response count', async () => {
      await respondToNeed('user-bob', testNeed.id, 'Help');
      await respondToNeed('user-charlie', testNeed.id, 'Help too');

      const formatted = formatNeedForDisplay(testNeed);

      expect(formatted).toContain('2 responses');
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize message content in responses', async () => {
      const maliciousMessage = 'Help! <script>alert("xss")</script><img src=x onerror=alert(1)>';

      const response = await respondToNeed(
        'user-bob',
        testNeed.id,
        maliciousMessage
      );

      expect(response.success).toBe(true);
      // HTML tags should be escaped, not stripped
      // The raw HTML tags should not be present
      expect(response.response?.message).not.toContain('<script>');
      expect(response.response?.message).not.toContain('<img');
      // Should contain escaped versions
      expect(response.response?.message).toContain('&lt;script&gt;');
      expect(response.response?.message).toContain('&lt;img');
    });

    it('should sanitize gratitude messages', async () => {
      const result = await markNeedFulfilled(
        testNeed.id,
        'user-alice',
        {
          fulfilledBy: ['user-bob'],
          gratitudeMessage: 'Thanks! <script>alert("xss")</script>',
        }
      );

      expect(result.success).toBe(true);

      const events = db.listEvents();
      const gratitudeEvent = events.find(e => e.note?.includes('Gratitude:'));
      expect(gratitudeEvent?.note).not.toContain('<script>');
    });
  });

  describe('Solarpunk Values', () => {
    it('should not create debt when responding to needs', async () => {
      // Respond to need
      await respondToNeed('user-bob', testNeed.id, 'I can help');

      // No monetary value should be assigned
      // No debt tracking should exist
      // This is gift economy - just recording the offer to help

      const responses = getNeedResponses(testNeed.id);
      expect(responses.length).toBe(1);

      // The event records the offer but no debt
      const event = responses[0].event;
      expect(event.action).toBe('transfer'); // Offer of help
      // No monetary fields should exist
      expect((event as any).amount).toBeUndefined();
      expect((event as any).price).toBeUndefined();
      expect((event as any).debt).toBeUndefined();
    });

    it('should build community without surveillance', async () => {
      // Responding should not track location, device info, or other surveillance data
      const response = await respondToNeed(
        'user-bob',
        testNeed.id,
        'I can help'
      );

      expect(response.response).toBeDefined();
      // No surveillance fields
      expect((response.response as any).location).toBeUndefined();
      expect((response.response as any).ipAddress).toBeUndefined();
      expect((response.response as any).deviceInfo).toBeUndefined();
      expect((response.response as any).trackingId).toBeUndefined();
    });
  });
});
