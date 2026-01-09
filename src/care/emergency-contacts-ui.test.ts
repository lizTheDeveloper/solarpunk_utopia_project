/**
 * UI Tests for Emergency Contact Circles
 * REQ-CARE-002: Emergency Alert System
 *
 * Tests for UI rendering, accessibility, and security
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  setupEmergencyContacts,
  triggerEmergencyAlert,
  getEmergencyContacts,
} from './emergency-contacts';
import {
  renderEmergencyAlertButton,
  renderEmergencyContactsManagement,
  renderEmergencyAlerts,
} from './emergency-contacts-ui';
import { sanitizeAttribute } from '../utils/sanitize';

describe('Emergency Contacts UI', () => {
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

    await db.setUserProfile({
      id: 'user-3',
      did: 'did:key:user3',
      displayName: 'Charlie',
      joinedAt: Date.now(),
      publicKey: 'pubkey3',
    });
  });

  describe('renderEmergencyAlertButton', () => {
    it('should show setup prompt when no contacts exist', () => {
      const html = renderEmergencyAlertButton('user-1');

      expect(html).toContain('Set up emergency contacts');
      expect(html).toContain('setup-emergency-contacts');
      expect(html).not.toContain('ALERT EMERGENCY CONTACTS');
    });

    it('should show emergency button when contacts exist', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const html = renderEmergencyAlertButton('user-1');

      expect(html).toContain('ALERT EMERGENCY CONTACTS');
      expect(html).toContain('trigger-emergency-alert');
      expect(html).toContain('trigger-urgent-alert');
    });

    it('should have accessibility attributes on emergency button', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const html = renderEmergencyAlertButton('user-1');

      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Emergency alert controls"');
      expect(html).toContain('aria-label="Send emergency alert to all contacts"');
    });
  });

  describe('renderEmergencyContactsManagement', () => {
    it('should show "no contacts" message for user without contacts', () => {
      // user-3 has no contacts setup
      const html = renderEmergencyContactsManagement('user-no-contacts-test');

      expect(html).toContain('No emergency contacts set up yet');
    });

    it('should list emergency contacts', async () => {
      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);
      const html = renderEmergencyContactsManagement('user-1');

      expect(html).toContain('Bob');
      expect(html).toContain('Charlie');
      expect(html).toContain('Your Emergency Contacts (2)');
    });

    it('should sanitize display names in contact list', async () => {
      // Create a user with potentially malicious display name
      await db.setUserProfile({
        id: 'user-malicious',
        did: 'did:key:usermalicious',
        displayName: '<script>alert("xss")</script>Hacker',
        joinedAt: Date.now(),
        publicKey: 'pubkey-malicious',
      });

      await setupEmergencyContacts('user-1', ['user-malicious']);
      const html = renderEmergencyContactsManagement('user-1');

      // Should be escaped
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should sanitize contact IDs in data attributes', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const html = renderEmergencyContactsManagement('user-1');

      // The contact ID should be sanitized
      expect(html).toContain('data-contact-id="user-2"');

      // Verify sanitizeAttribute removes characters that could break attribute context
      // (quotes, angle brackets, backticks, equals signs)
      const maliciousId = 'user" onclick="alert(1)';
      const sanitized = sanitizeAttribute(maliciousId);
      // Quotes are removed, preventing attribute injection
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('=');
      // The result would be "user onclickalert(1)" which is harmless as an ID
    });
  });

  describe('renderEmergencyAlerts', () => {
    it('should return empty string when no alerts', () => {
      const html = renderEmergencyAlerts('user-2');
      expect(html).toBe('');
    });

    it('should render active alerts', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      await triggerEmergencyAlert('user-1', { message: 'Help needed!' });

      const html = renderEmergencyAlerts('user-2');

      expect(html).toContain('Active Emergency Alerts');
      expect(html).toContain('Help needed!');
      expect(html).toContain('Alice');
    });

    it('should have accessibility attributes for alerts section', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      await triggerEmergencyAlert('user-1', { message: 'Help!' });

      const html = renderEmergencyAlerts('user-2');

      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).toContain('role="list"');
    });

    it('should sanitize alert messages', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      await triggerEmergencyAlert('user-1', {
        message: '<img src=x onerror=alert("xss")>Help!'
      });

      const html = renderEmergencyAlerts('user-2');

      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });

    it('should sanitize alert IDs in data attributes', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help!' });

      const html = renderEmergencyAlerts('user-2');

      // Should contain sanitized alert ID in data attributes
      expect(html).toContain(`data-alert-id="${sanitizeAttribute(alert.id)}"`);
    });

    it('should display severity correctly', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      // Emergency severity
      await triggerEmergencyAlert('user-1', {
        message: 'Emergency!',
        severity: 'emergency'
      });

      let html = renderEmergencyAlerts('user-2');
      expect(html).toContain('alert-emergency');
      expect(html).toContain('🚨 EMERGENCY');
    });

    it('should display urgent alerts correctly', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      await triggerEmergencyAlert('user-1', {
        message: 'Urgent!',
        severity: 'urgent'
      });

      const html = renderEmergencyAlerts('user-2');
      expect(html).toContain('alert-urgent');
      expect(html).toContain('⚠️ URGENT');
    });

    it('should display location link when provided', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      await triggerEmergencyAlert('user-1', {
        message: 'Help!',
        location: { latitude: 37.7749, longitude: -122.4194 }
      });

      const html = renderEmergencyAlerts('user-2');

      expect(html).toContain('openstreetmap.org');
      expect(html).toContain('37.77490');
      expect(html).toContain('-122.41940');
      expect(html).toContain('rel="noopener noreferrer"'); // Security for external links
    });

    it('should show emergency services notification when requested', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      await triggerEmergencyAlert('user-1', {
        message: 'Help!',
        contactEmergencyServices: true
      });

      const html = renderEmergencyAlerts('user-2');
      expect(html).toContain('Emergency services requested');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle unknown user display name gracefully', async () => {
      // Setup a dedicated test user to avoid conflicts
      const testUserId = 'user-unknown-test';
      await db.setUserProfile({
        id: testUserId,
        did: 'did:key:userunknowntest',
        displayName: 'Test User',
        joinedAt: Date.now(),
        publicKey: 'pubkey-unknown-test',
      });

      // Setup emergency contacts with a non-existent user
      // Using setupEmergencyContacts which internally sets up the care circle
      await setupEmergencyContacts(testUserId, ['non-existent-user-id']);

      const html = renderEmergencyContactsManagement(testUserId);
      expect(html).toContain('Unknown User');
    });

    it('should escape special characters in all user-generated content', async () => {
      // Create user with special characters
      await db.setUserProfile({
        id: 'user-special',
        did: 'did:key:userspecial',
        displayName: 'Test & <Special> "User"',
        joinedAt: Date.now(),
        publicKey: 'pubkey-special',
      });

      await setupEmergencyContacts('user-1', ['user-special']);
      const html = renderEmergencyContactsManagement('user-1');

      expect(html).toContain('&amp;');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
      expect(html).toContain('&quot;');
    });
  });
});
