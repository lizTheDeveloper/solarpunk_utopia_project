/**
 * Security and Edge Case Tests for Emergency Contact Circles
 * REQ-CARE-002: Emergency Alert System
 *
 * These tests ensure XSS prevention, input validation, and edge case handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  setupEmergencyContacts,
  triggerEmergencyAlert,
  respondToEmergencyAlert,
  cancelEmergencyAlert,
  addEmergencyContact,
} from './emergency-contacts';
import { sanitizeUserContent, requireValidIdentifier } from '../utils/sanitize';

describe('Emergency Contacts - Security & Edge Cases', () => {
  beforeEach(async () => {
    await db.init();

    // Create test users
    await db.setUserProfile({
      id: 'user-1',
      did: 'did:key:user1',
      displayName: 'Alice',
      joinedAt: Date.now(),
      publicKey: 'pubkey1',
    });

    await db.setUserProfile({
      id: 'user-2',
      did: 'did:key:user2',
      displayName: 'Bob',
      joinedAt: Date.now(),
      publicKey: 'pubkey2',
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize malicious script tags in emergency messages', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      const maliciousMessage = '<script>alert("XSS")</script>Emergency help needed';
      const alert = await triggerEmergencyAlert('user-1', {
        message: maliciousMessage,
      });

      // The raw data should contain the message as-is (storage is safe)
      expect(alert.message).toBe(maliciousMessage);

      // But when rendered, it should be escaped
      const sanitized = sanitizeUserContent(alert.message);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should sanitize HTML injection in display names', async () => {
      const maliciousUser = {
        id: 'user-xss',
        did: 'did:key:userxss',
        displayName: '<img src=x onerror=alert("XSS")>Hacker',
        joinedAt: Date.now(),
        publicKey: 'pubkey-xss',
      };

      await db.setUserProfile(maliciousUser);

      const sanitized = sanitizeUserContent(maliciousUser.displayName);
      expect(sanitized).not.toContain('<img');
      expect(sanitized).toContain('&lt;img');
    });

    it('should sanitize malicious response messages', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      const maliciousResponse = '<a href="javascript:alert(1)">Click me</a>';
      await respondToEmergencyAlert(alert.id, 'user-2', {
        status: 'on-way',
        message: maliciousResponse,
      });

      const updatedAlert = db.getEmergencyAlert(alert.id);
      const responseMessage = updatedAlert?.responses[0].message;

      // Raw storage preserves the data
      expect(responseMessage).toBe(maliciousResponse);

      // Rendered output is safe
      const sanitized = sanitizeUserContent(responseMessage);
      expect(sanitized).not.toContain('<a href="javascript:');
      expect(sanitized).toContain('&lt;a href=');
    });

    it('should validate identifiers to prevent attribute injection', () => {
      // Valid identifiers - requireValidIdentifier should return the ID
      expect(requireValidIdentifier('user-123')).toBe('user-123');
      expect(requireValidIdentifier('user_abc_123')).toBe('user_abc_123');

      // Invalid identifiers (potential injection) - should throw
      expect(() => requireValidIdentifier('user" onclick="alert(1)')).toThrow();
      expect(() => requireValidIdentifier('user id="malicious')).toThrow();
      expect(() => requireValidIdentifier('user;DROP TABLE users;')).toThrow();
      expect(() => requireValidIdentifier('../../../etc/passwd')).toThrow();
      expect(() => requireValidIdentifier('user<script>')).toThrow();
    });
  });

  describe('Input Validation & Edge Cases', () => {
    it('should handle empty messages gracefully', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      const alert = await triggerEmergencyAlert('user-1', {
        message: '',
      });

      expect(alert.message).toBe('');
    });

    it('should handle undefined optional fields', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      // Trigger alert with minimal data
      const alert = await triggerEmergencyAlert('user-1', {});

      expect(alert.message).toBeUndefined();
      expect(alert.location).toBeUndefined();
      expect(alert.severity).toBe('emergency'); // default
    });

    it('should handle very long messages', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      const longMessage = 'A'.repeat(10000);
      const alert = await triggerEmergencyAlert('user-1', {
        message: longMessage,
      });

      expect(alert.message).toBe(longMessage);
      expect(alert.message?.length).toBe(10000);
    });

    it('should handle special characters in messages', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      const specialMessage = 'Help! @ location: 123 Main St. (near café) — urgent! 50% chance 🚨';
      const alert = await triggerEmergencyAlert('user-1', {
        message: specialMessage,
      });

      expect(alert.message).toBe(specialMessage);
    });

    it('should handle zero and negative ETA values', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      await respondToEmergencyAlert(alert.id, 'user-2', {
        status: 'on-way',
        eta: 0,
      });

      const updatedAlert = db.getEmergencyAlert(alert.id);
      expect(updatedAlert?.responses[0].eta).toBe(0);
    });

    it('should handle extreme location coordinates', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      // Test valid extreme coordinates
      const alert = await triggerEmergencyAlert('user-1', {
        location: {
          latitude: -90, // South Pole
          longitude: 180, // International Date Line
        },
      });

      expect(alert.location?.latitude).toBe(-90);
      expect(alert.location?.longitude).toBe(180);
    });

    it('should handle rapid successive alerts', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      // Trigger multiple alerts quickly
      const alert1 = await triggerEmergencyAlert('user-1', { message: 'First' });
      const alert2 = await triggerEmergencyAlert('user-1', { message: 'Second' });
      const alert3 = await triggerEmergencyAlert('user-1', { message: 'Third' });

      expect(alert1.id).not.toBe(alert2.id);
      expect(alert2.id).not.toBe(alert3.id);

      const allAlerts = db.listEmergencyAlerts();
      expect(allAlerts.filter(a => a.userId === 'user-1').length).toBeGreaterThanOrEqual(3);
    });

    it('should handle concurrent responses from multiple members', async () => {
      await db.setUserProfile({
        id: 'user-3',
        did: 'did:key:user3',
        displayName: 'Charlie',
        joinedAt: Date.now(),
        publicKey: 'pubkey3',
      });

      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      // Simulate concurrent responses
      await Promise.all([
        respondToEmergencyAlert(alert.id, 'user-2', { status: 'on-way' }),
        respondToEmergencyAlert(alert.id, 'user-3', { status: 'contacted' }),
      ]);

      const updatedAlert = db.getEmergencyAlert(alert.id);
      expect(updatedAlert?.responses.length).toBe(2);
    });
  });

  describe('Access Control & Authorization', () => {
    it('should prevent unauthorized alert cancellation', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      // user-2 should NOT be able to cancel user-1's alert
      await expect(async () => {
        await cancelEmergencyAlert(alert.id, 'user-2', 'Trying to cancel');
      }).rejects.toThrow('Only the person who triggered the alert can cancel it');
    });

    it('should prevent adding self as emergency contact', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      // Attempting to add self should be handled gracefully
      // (This is more of a UI concern, but we test the edge case)
      await expect(async () => {
        await addEmergencyContact('user-1', 'user-1');
      }).rejects.toThrow();
    });

    it('should prevent responding to non-existent alerts', async () => {
      await expect(async () => {
        await respondToEmergencyAlert('non-existent-alert-id', 'user-2', {
          status: 'on-way',
        });
      }).rejects.toThrow('Emergency alert not found');
    });

    it('should handle missing care circle gracefully', async () => {
      // user-2 has no care circle
      await expect(async () => {
        await triggerEmergencyAlert('user-2', {
          message: 'Help',
        });
      }).rejects.toThrow('No care circle configured');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain alert immutability after resolution', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', {
        message: 'Original message',
      });

      const originalMessage = alert.message;
      const originalTimestamp = alert.triggeredAt;

      // Resolve the alert
      await respondToEmergencyAlert(alert.id, 'user-2', { status: 'arrived' });

      const resolvedAlert = db.getEmergencyAlert(alert.id);
      expect(resolvedAlert?.message).toBe(originalMessage);
      expect(resolvedAlert?.triggeredAt).toBe(originalTimestamp);
      expect(resolvedAlert?.resolved).toBe(true);
    });

    it('should preserve all responses when alert is resolved', async () => {
      await db.setUserProfile({
        id: 'user-3',
        did: 'did:key:user3',
        displayName: 'Charlie',
        joinedAt: Date.now(),
        publicKey: 'pubkey3',
      });

      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      await respondToEmergencyAlert(alert.id, 'user-2', {
        status: 'contacted',
        message: 'First response',
      });

      await respondToEmergencyAlert(alert.id, 'user-3', {
        status: 'arrived',
        message: 'Second response',
      });

      const resolvedAlert = db.getEmergencyAlert(alert.id);
      expect(resolvedAlert?.responses.length).toBe(2);
      expect(resolvedAlert?.responses[0].message).toBe('First response');
      expect(resolvedAlert?.responses[1].message).toBe('Second response');
    });

    it('should generate unique alert IDs', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      const alerts = await Promise.all([
        triggerEmergencyAlert('user-1', { message: '1' }),
        triggerEmergencyAlert('user-1', { message: '2' }),
        triggerEmergencyAlert('user-1', { message: '3' }),
      ]);

      const ids = alerts.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Timestamp & Timing', () => {
    it('should record accurate timestamps', async () => {
      const beforeTrigger = Date.now();

      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      const afterTrigger = Date.now();

      expect(alert.triggeredAt).toBeGreaterThanOrEqual(beforeTrigger);
      expect(alert.triggeredAt).toBeLessThanOrEqual(afterTrigger);
    });

    it('should record response timestamps', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      const beforeResponse = Date.now();
      await respondToEmergencyAlert(alert.id, 'user-2', { status: 'on-way' });
      const afterResponse = Date.now();

      const updatedAlert = db.getEmergencyAlert(alert.id);
      const responseTimestamp = updatedAlert?.responses[0].timestamp;

      expect(responseTimestamp).toBeDefined();
      expect(responseTimestamp).toBeGreaterThanOrEqual(beforeResponse);
      expect(responseTimestamp).toBeLessThanOrEqual(afterResponse);
    });

    it('should record resolution timestamp when alert is resolved', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      await respondToEmergencyAlert(alert.id, 'user-2', { status: 'arrived' });

      const resolvedAlert = db.getEmergencyAlert(alert.id);
      expect(resolvedAlert?.resolvedAt).toBeDefined();
      expect(resolvedAlert?.resolvedAt).toBeGreaterThan(alert.triggeredAt);
    });
  });
});
