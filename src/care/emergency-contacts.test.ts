/**
 * Tests for Emergency Contact Circles
 * REQ-CARE-002: Emergency Alert System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  setupEmergencyContacts,
  triggerEmergencyAlert,
  respondToEmergencyAlert,
  getMyEmergencyAlerts,
  resolveEmergencyAlert,
  cancelEmergencyAlert,
  addEmergencyContact,
  removeEmergencyContact,
  getEmergencyContacts,
  hasEmergencyContacts,
} from './emergency-contacts';

describe('Emergency Contact Circles', () => {
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

  describe('Setup and Management', () => {
    it('should setup emergency contacts', async () => {
      const careCircle = await setupEmergencyContacts('user-1', ['user-2', 'user-3']);

      expect(careCircle.userId).toBe('user-1');
      expect(careCircle.members).toEqual(['user-2', 'user-3']);
      expect(careCircle.checkInEnabled).toBe(false); // Emergency contacts don't require check-ins by default
    });

    it('should check if user has emergency contacts', async () => {
      // Use a different user to avoid test isolation issues
      const testUserId = 'user-check-test';
      await db.setUserProfile({
        id: testUserId,
        did: 'did:key:usercheck',
        displayName: 'Check Test User',
        joinedAt: Date.now(),
        publicKey: 'pubkey-check',
      });

      expect(hasEmergencyContacts(testUserId)).toBe(false);

      await setupEmergencyContacts(testUserId, ['user-2']);
      expect(hasEmergencyContacts(testUserId)).toBe(true);
    });

    it('should get emergency contacts', async () => {
      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);

      const contacts = getEmergencyContacts('user-1');
      expect(contacts).toEqual(['user-2', 'user-3']);
    });

    it('should add emergency contact', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      await addEmergencyContact('user-1', 'user-3');

      const contacts = getEmergencyContacts('user-1');
      expect(contacts).toContain('user-2');
      expect(contacts).toContain('user-3');
    });

    it('should prevent adding duplicate emergency contact', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      await expect(async () => {
        await addEmergencyContact('user-1', 'user-2');
      }).rejects.toThrow('already in your emergency contacts');
    });

    it('should remove emergency contact', async () => {
      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);
      await removeEmergencyContact('user-1', 'user-3');

      const contacts = getEmergencyContacts('user-1');
      expect(contacts).toEqual(['user-2']);
    });

    it('should prevent removing last emergency contact', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      await expect(async () => {
        await removeEmergencyContact('user-1', 'user-2');
      }).rejects.toThrow('Cannot remove last emergency contact');
    });

    it('should prevent user from adding themselves as emergency contact', async () => {
      await expect(async () => {
        await setupEmergencyContacts('user-1', ['user-1']);
      }).rejects.toThrow('You cannot add yourself as an emergency contact');
    });

    it('should prevent adding self to existing care circle', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      await expect(async () => {
        await addEmergencyContact('user-1', 'user-1');
      }).rejects.toThrow('You cannot add yourself as an emergency contact');
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid user ID format', async () => {
      await expect(async () => {
        await setupEmergencyContacts('user<script>', ['user-2']);
      }).rejects.toThrow('contains invalid characters');
    });

    it('should reject invalid contact ID format', async () => {
      await expect(async () => {
        await setupEmergencyContacts('user-1', ['user-2', 'user<script>']);
      }).rejects.toThrow('contains invalid characters');
    });

    it('should reject empty user ID', async () => {
      await expect(async () => {
        await setupEmergencyContacts('', ['user-2']);
      }).rejects.toThrow('required');
    });

    it('should reject invalid alert ID in response', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);

      await expect(async () => {
        await respondToEmergencyAlert('alert<invalid>', 'user-2', { status: 'on-way' });
      }).rejects.toThrow('contains invalid characters');
    });

    it('should reject invalid responder ID', async () => {
      await setupEmergencyContacts('user-1', ['user-2']);
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      await expect(async () => {
        await respondToEmergencyAlert(alert.id, 'user<invalid>', { status: 'on-way' });
      }).rejects.toThrow('contains invalid characters');
    });

    it('should reject invalid user ID in hasEmergencyContacts', () => {
      expect(() => hasEmergencyContacts('<script>')).toThrow('contains invalid characters');
    });

    it('should reject invalid user ID in getEmergencyContacts', () => {
      expect(() => getEmergencyContacts('<script>')).toThrow('contains invalid characters');
    });
  });

  describe('Emergency Alerts', () => {
    beforeEach(async () => {
      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);
    });

    it('should trigger emergency alert', async () => {
      const alert = await triggerEmergencyAlert('user-1', {
        message: 'I fell and need help',
        severity: 'emergency',
      });

      expect(alert.userId).toBe('user-1');
      expect(alert.message).toBe('I fell and need help');
      expect(alert.severity).toBe('emergency');
      expect(alert.resolved).toBe(false);
      expect(alert.responses).toEqual([]);
    });

    it('should trigger urgent alert', async () => {
      const alert = await triggerEmergencyAlert('user-1', {
        message: 'Need help with groceries',
        severity: 'urgent',
      });

      expect(alert.severity).toBe('urgent');
    });

    it('should include location in alert', async () => {
      const alert = await triggerEmergencyAlert('user-1', {
        message: 'Emergency at my location',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      });

      expect(alert.location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    it('should fail to trigger alert without care circle', async () => {
      await expect(async () => {
        await triggerEmergencyAlert('user-2', {
          message: 'Help',
        });
      }).rejects.toThrow('No care circle configured');
    });

    it('should record emergency event', async () => {
      await triggerEmergencyAlert('user-1', {
        message: 'Emergency',
      });

      const events = db.listEvents();
      const emergencyEvent = events.find(e => e.action === 'emergency-alert');

      expect(emergencyEvent).toBeDefined();
      expect(emergencyEvent?.providerId).toBe('user-1');
    });
  });

  describe('Alert Responses', () => {
    let alertId: string;

    beforeEach(async () => {
      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);
      const alert = await triggerEmergencyAlert('user-1', {
        message: 'Emergency',
      });
      alertId = alert.id;
    });

    it('should respond to emergency alert - on way', async () => {
      await respondToEmergencyAlert(alertId, 'user-2', {
        status: 'on-way',
        eta: 10,
        message: 'On my way!',
      });

      const alert = db.getEmergencyAlert(alertId);
      expect(alert?.responses).toHaveLength(1);
      expect(alert?.responses[0].responderId).toBe('user-2');
      expect(alert?.responses[0].status).toBe('on-way');
      expect(alert?.responses[0].eta).toBe(10);
    });

    it('should respond to emergency alert - contacted', async () => {
      await respondToEmergencyAlert(alertId, 'user-2', {
        status: 'contacted',
        message: 'Called them, they are okay',
      });

      const alert = db.getEmergencyAlert(alertId);
      expect(alert?.responses[0].status).toBe('contacted');
    });

    it('should auto-resolve alert when someone arrives', async () => {
      await respondToEmergencyAlert(alertId, 'user-2', {
        status: 'arrived',
      });

      const alert = db.getEmergencyAlert(alertId);
      expect(alert?.resolved).toBe(true);
      expect(alert?.resolvedAt).toBeDefined();
    });

    it('should allow multiple responses', async () => {
      await respondToEmergencyAlert(alertId, 'user-2', {
        status: 'on-way',
      });

      await respondToEmergencyAlert(alertId, 'user-3', {
        status: 'contacted',
      });

      const alert = db.getEmergencyAlert(alertId);
      expect(alert?.responses).toHaveLength(2);
    });

    it('should prevent non-members from responding', async () => {
      // Create a care circle that doesn't include user-3
      const testUserId = 'user-nonmember-test';
      await db.setUserProfile({
        id: testUserId,
        did: 'did:key:nonmember',
        displayName: 'Non Member Test',
        joinedAt: Date.now(),
        publicKey: 'pubkey-nonmember',
      });

      await setupEmergencyContacts(testUserId, ['user-2']); // Only user-2 is a member
      const testAlert = await triggerEmergencyAlert(testUserId, { message: 'Help' });

      // user-3 is NOT a member of this care circle, should be rejected
      await expect(async () => {
        await respondToEmergencyAlert(testAlert.id, 'user-3', {
          status: 'on-way',
        });
      }).rejects.toThrow('Only care circle members can respond');

      // user-2 IS a member, should work
      await respondToEmergencyAlert(testAlert.id, 'user-2', {
        status: 'on-way',
      });

      const alert = db.getEmergencyAlert(testAlert.id);
      expect(alert?.responses).toHaveLength(1);
      expect(alert?.responses[0].responderId).toBe('user-2');
    });

    it('should prevent responding to resolved alerts', async () => {
      await resolveEmergencyAlert(alertId, 'user-2', 'Situation handled');

      await expect(async () => {
        await respondToEmergencyAlert(alertId, 'user-3', {
          status: 'on-way',
        });
      }).rejects.toThrow('already been resolved');
    });
  });

  describe('Alert Resolution', () => {
    let alertId: string;

    beforeEach(async () => {
      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);
      const alert = await triggerEmergencyAlert('user-1', {
        message: 'Emergency',
      });
      alertId = alert.id;
    });

    it('should manually resolve alert', async () => {
      await resolveEmergencyAlert(alertId, 'user-2', 'Everything is okay now');

      const alert = db.getEmergencyAlert(alertId);
      expect(alert?.resolved).toBe(true);
      expect(alert?.resolvedBy).toBe('user-2');
      expect(alert?.resolution).toBe('Everything is okay now');
    });

    it('should cancel alert (false alarm)', async () => {
      await cancelEmergencyAlert(alertId, 'user-1', 'False alarm, sorry');

      const alert = db.getEmergencyAlert(alertId);
      expect(alert?.resolved).toBe(true);
      expect(alert?.resolvedBy).toBe('user-1');
      expect(alert?.resolution).toContain('Cancelled: False alarm, sorry');
    });

    it('should only allow alert creator to cancel', async () => {
      await expect(async () => {
        await cancelEmergencyAlert(alertId, 'user-2');
      }).rejects.toThrow('Only the person who triggered the alert can cancel it');
    });
  });

  describe('Alert Retrieval', () => {
    beforeEach(async () => {
      await setupEmergencyContacts('user-1', ['user-2', 'user-3']);
      await setupEmergencyContacts('user-2', ['user-3']);
    });

    it('should get alerts for care circle member', async () => {
      // Get initial count to account for any existing alerts from other tests
      const initialUser2Alerts = getMyEmergencyAlerts('user-2');
      const initialUser3Alerts = getMyEmergencyAlerts('user-3');

      const alert1 = await triggerEmergencyAlert('user-1', { message: 'Help 1' });
      await triggerEmergencyAlert('user-2', { message: 'Help 2' });

      const user2Alerts = getMyEmergencyAlerts('user-2');
      expect(user2Alerts.length).toBe(initialUser2Alerts.length + 1);
      expect(user2Alerts.some(a => a.id === alert1.id)).toBe(true);

      const user3Alerts = getMyEmergencyAlerts('user-3');
      expect(user3Alerts.length).toBe(initialUser3Alerts.length + 2); // user-3 is in both care circles
    });

    it('should not return resolved alerts', async () => {
      const alert = await triggerEmergencyAlert('user-1', { message: 'Help' });

      // Verify the alert is initially in the list
      const alertsBefore = getMyEmergencyAlerts('user-2');
      expect(alertsBefore.some(a => a.id === alert.id)).toBe(true);

      // Resolve the alert
      await resolveEmergencyAlert(alert.id, 'user-2');

      // Verify the specific alert is no longer in the list
      const alertsAfter = getMyEmergencyAlerts('user-2');
      expect(alertsAfter.some(a => a.id === alert.id)).toBe(false);
    });

    it('should get all active emergency alerts', () => {
      const activeAlerts = db.getActiveEmergencyAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });
  });

  describe('Integration with Care Circles', () => {
    it('should use existing care circle for emergency contacts', async () => {
      // First setup with check-ins enabled
      await setupEmergencyContacts('user-1', ['user-2'], {
        enableCheckIns: true,
        checkInFrequency: 'daily',
      });

      const careCircle = db.getUserCareCircle('user-1');
      expect(careCircle?.checkInEnabled).toBe(true);

      // Emergency contacts and check-in monitoring can coexist
      const alert = await triggerEmergencyAlert('user-1', {
        message: 'Emergency',
      });

      expect(alert.careCircleId).toBe(careCircle?.id);
    });
  });
});
