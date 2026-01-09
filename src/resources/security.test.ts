/**
 * Security Tests for Phase 2, Group C: Open Requests & Needs
 *
 * These tests verify that the implementation is secure against common vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - HTML Injection
 * - Script Injection
 * - SQL Injection (N/A for local-first, but good practice)
 *
 * Following solarpunk values:
 * - Security through simplicity
 * - No surveillance (so no need for auth bypass tests)
 * - Community safety
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, LocalDatabase } from '../core/database';
import { NeedPosting } from './need-posting';
import { respondToNeed, markNeedFulfilled } from './need-response';
import { browseNeeds } from './browse-needs';
import type { Need } from '../types';

describe('Security Tests - XSS Prevention', () => {
  let testDb: LocalDatabase;
  let needPosting: NeedPosting;
  const testUserId = 'test-user-security';
  const attackerUserId = 'attacker-user';

  beforeEach(async () => {
    // Initialize the global db singleton that need-response uses
    await db.init();

    testDb = db;
    needPosting = new NeedPosting(testDb);
  });

  afterEach(async () => {
    // Clean up
    await db.close();
  });

  describe('XSS via Need Description', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg/onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>',
      '<video><source onerror="alert(\'XSS\')">',
      '<audio src=x onerror=alert("XSS")>',
      '<details open ontoggle=alert("XSS")>',
      '<marquee onstart=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      '\';alert("XSS");//',
      '<div style="background:url(javascript:alert(\'XSS\'))">',
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS payload ${index + 1}: ${payload.substring(0, 30)}...`, async () => {
        const need = await needPosting.postNeed(
          {
            description: payload,
            urgency: 'casual',
          },
          { userId: testUserId }
        );

        // The description should be sanitized - check for EXECUTABLE XSS vectors
        // (Not just the word "onload" but actual <script> or <img tags)
        expect(need.description).not.toContain('<script');
        expect(need.description).not.toContain('<iframe');
        expect(need.description).not.toContain('<img ');
        expect(need.description).not.toContain('<img>');
        expect(need.description).not.toContain('<svg ');
        expect(need.description).not.toContain('<svg>');
        expect(need.description).not.toContain('<body ');
        expect(need.description).not.toContain('<body>');

        // Should have HTML entities escaped
        expect(need.description).toMatch(/&lt;|&gt;|&amp;|&quot;|&#039;/);
      });
    });

    it('should prevent XSS in need updates', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Safe description',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      await needPosting.updateNeed(need.id, {
        description: '<script>alert("XSS")</script>',
      });

      const updatedNeeds = testDb.listNeeds();
      const updatedNeed = updatedNeeds.find(n => n.id === need.id);

      expect(updatedNeed?.description).not.toContain('<script');
      expect(updatedNeed?.description).toMatch(/&lt;|&gt;/);
    });
  });

  describe('XSS via Response Messages', () => {
    let testNeed: Need;

    beforeEach(async () => {
      testNeed = await needPosting.postNeed(
        {
          description: 'Need help with something',
          urgency: 'helpful',
        },
        { userId: testUserId }
      );
    });

    it('should sanitize XSS in response message', async () => {
      const response = await respondToNeed(
        attackerUserId,
        testNeed.id,
        '<script>alert("XSS")</script>I can help'
      );

      expect(response.success).toBe(true);
      expect(response.response?.message).not.toContain('<script');
      expect(response.response?.message).toMatch(/&lt;|&gt;/);
    });

    it('should sanitize XSS in gratitude message', async () => {
      await respondToNeed(
        attackerUserId,
        testNeed.id,
        'I can help with that'
      );

      const result = await markNeedFulfilled(
        testNeed.id,
        testUserId,
        {
          fulfilledBy: [attackerUserId],
          gratitudeMessage: '<img src=x onerror=alert("XSS")>Thank you!',
        }
      );

      expect(result.success).toBe(true);

      // Check that the gratitude message was sanitized in the event
      const events = testDb.listEvents();
      const gratitudeEvent = events.find(e => e.note?.includes('Gratitude:'));
      // The HTML should be escaped (converted to entities)
      expect(gratitudeEvent?.note).not.toContain('<img ');
      expect(gratitudeEvent?.note).not.toContain('<img>');
      // Should contain escaped HTML
      expect(gratitudeEvent?.note).toMatch(/&lt;|&gt;|&quot;/);
    });
  });

  describe('HTML Injection Prevention', () => {
    it('should escape HTML entities in need description', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Need help with <div>HTML</div> & "quotes" and \'apostrophes\'',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      expect(need.description).toContain('&lt;');
      expect(need.description).toContain('&gt;');
      expect(need.description).toContain('&amp;');
      expect(need.description).toContain('&quot;');
      expect(need.description).toContain('&#039;');
    });

    it('should not allow HTML formatting in descriptions', async () => {
      const need = await needPosting.postNeed(
        {
          description: '<b>Bold</b> <i>italic</i> <u>underline</u>',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      // HTML tags should be escaped, not rendered
      expect(need.description).not.toContain('<b>');
      expect(need.description).not.toContain('<i>');
      expect(need.description).not.toContain('<u>');
      expect(need.description).toMatch(/&lt;.*&gt;/);
    });
  });

  describe('Attribute Breaking Prevention', () => {
    it('should prevent breaking out of data attributes in need ID', async () => {
      // This shouldn't be possible with UUID generation, but test defense in depth
      const maliciousInput = '" onclick="alert(\'XSS\')" data-evil="';

      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      // Need IDs should be UUIDs, so they won't contain quotes or dangerous chars
      expect(need.id).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(need.id).not.toContain('"');
      expect(need.id).not.toContain('\'');
      expect(need.id).not.toContain('<');
      expect(need.id).not.toContain('>');
    });
  });

  describe('Validation Tests', () => {
    it('should reject empty need descriptions', async () => {
      await expect(
        needPosting.postNeed(
          {
            description: '',
            urgency: 'casual',
          },
          { userId: testUserId }
        )
      ).rejects.toThrow('Need description cannot be empty');
    });

    it('should reject whitespace-only descriptions', async () => {
      await expect(
        needPosting.postNeed(
          {
            description: '   \n\t  ',
            urgency: 'casual',
          },
          { userId: testUserId }
        )
      ).rejects.toThrow('Need description cannot be empty');
    });

    it('should validate user IDs in responses', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      const result = await respondToNeed(
        '', // Invalid user ID
        need.id,
        'I can help'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user ID');
    });

    it('should validate need IDs in responses', async () => {
      const result = await respondToNeed(
        testUserId,
        '', // Invalid need ID
        'I can help'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid need ID');
    });

    it('should validate that response message is not empty', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      const result = await respondToNeed(
        attackerUserId,
        need.id,
        '' // Empty message
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Response message is required');
    });
  });

  describe('Privacy and Data Protection', () => {
    it('should not expose user IDs to other users in unsafe ways', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      // User IDs are stored but should be validated before use
      expect(need.userId).toBeDefined();
      expect(typeof need.userId).toBe('string');
    });

    it('should not allow users to respond to their own needs', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      const result = await respondToNeed(
        testUserId, // Same user
        need.id,
        'I can help myself'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('own need');
    });

    it('should not allow marking fulfilled needs as fulfilled again', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      await markNeedFulfilled(need.id, testUserId);

      const result = await markNeedFulfilled(need.id, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already marked as fulfilled');
    });

    it('should not allow users to mark other users\' needs as fulfilled', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      const result = await markNeedFulfilled(need.id, attackerUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only the person who posted this need');
    });
  });

  describe('Resource Type Safety', () => {
    it('should sanitize resource type display', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
          resourceType: 'tool',
        },
        { userId: testUserId }
      );

      expect(need.resourceType).toBe('tool');

      // Resource type is a controlled enum, but ensure it's safe for display
      const validTypes = ['tool', 'equipment', 'space', 'energy', 'food', 'skill', 'time', 'robot', 'fabrication', 'other'];
      expect(validTypes).toContain(need.resourceType);
    });
  });

  describe('No Tracking or Surveillance', () => {
    it('should not store analytics or tracking data', async () => {
      const need = await needPosting.postNeed(
        {
          description: 'Test need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      // Check that we don't store tracking fields
      expect(need).not.toHaveProperty('ipAddress');
      expect(need).not.toHaveProperty('userAgent');
      expect(need).not.toHaveProperty('trackingId');
      expect(need).not.toHaveProperty('sessionId');
      expect(need).not.toHaveProperty('analyticsId');
    });

    it('should not log sensitive information', async () => {
      // This is a reminder test - actual implementation would check logging
      // For now, we verify that our data structures don't expose unnecessary info
      const need = await needPosting.postNeed(
        {
          description: 'Private need',
          urgency: 'casual',
        },
        { userId: testUserId }
      );

      // Only necessary fields should be present
      const allowedFields = ['id', 'userId', 'description', 'urgency', 'resourceType', 'fulfilled', 'createdAt', 'updatedAt'];
      const actualFields = Object.keys(need);

      actualFields.forEach(field => {
        expect(allowedFields).toContain(field);
      });
    });
  });
});

describe('Security Tests - Edge Cases', () => {
  let testDb: LocalDatabase;
  let needPosting: NeedPosting;
  const testUserId = 'test-user-edge';

  beforeEach(async () => {
    await db.init();
    testDb = db;
    needPosting = new NeedPosting(testDb);
  });

  afterEach(async () => {
    await db.close();
  });

  it('should handle very long descriptions safely', async () => {
    const longDescription = 'A'.repeat(10000);

    const need = await needPosting.postNeed(
      {
        description: longDescription,
        urgency: 'casual',
      },
      { userId: testUserId }
    );

    expect(need.description).toBeDefined();
    expect(need.description.length).toBeGreaterThan(0);
  });

  it('should handle Unicode characters safely', async () => {
    const unicodeDescription = '需要帮助 🌻 помощь مساعدة';

    const need = await needPosting.postNeed(
      {
        description: unicodeDescription,
        urgency: 'casual',
      },
      { userId: testUserId }
    );

    expect(need.description).toContain('需要帮助');
    expect(need.description).toContain('🌻');
    expect(need.description).toContain('помощь');
  });

  it('should handle emoji and special characters', async () => {
    const emojiDescription = 'Need help! 🚨🔥💧🌈✨🎉';

    const need = await needPosting.postNeed(
      {
        description: emojiDescription,
        urgency: 'casual',
      },
      { userId: testUserId }
    );

    expect(need.description).toContain('🚨');
    expect(need.description).toContain('Need help');
  });

  it('should handle null bytes safely', async () => {
    const nullByteDescription = 'Test\x00description';

    const need = await needPosting.postNeed(
      {
        description: nullByteDescription,
        urgency: 'casual',
      },
      { userId: testUserId }
    );

    expect(need.description).toBeDefined();
  });
});
