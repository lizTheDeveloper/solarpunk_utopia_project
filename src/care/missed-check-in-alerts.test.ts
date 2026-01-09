/**
 * Tests for Missed Check-In Alert System
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../core/database';
import {
  checkForMissedCheckIns,
  acknowledgeMissedCheckInAlert,
  clearAlertsForUser,
  getMyMissedCheckInAlerts,
  setupCareCircle,
  getCareCircle,
  disableCheckInMonitoring,
  enableCheckInMonitoring,
  getMissedCheckInSummary,
  startCheckInMonitoring,
} from './missed-check-in-alerts';
import { submitCheckIn } from './check-in';

describe('Missed Check-In Alert System', () => {
  beforeEach(async () => {
    await db.init();
  });

  describe('Care Circle Setup', () => {
    it('should create a care circle with default settings', async () => {
      const userId = 'user-1';
      const members = ['member-1', 'member-2'];

      const careCircle = await setupCareCircle(userId, members);

      expect(careCircle.id).toBeDefined();
      expect(careCircle.userId).toBe(userId);
      expect(careCircle.members).toEqual(members);
      expect(careCircle.checkInEnabled).toBe(true);
      expect(careCircle.checkInFrequency).toBe('daily');
      expect(careCircle.missedCheckInThreshold).toBe(26); // Default: 26 hours
      expect(careCircle.escalationThreshold).toBe(2); // Default: 2 consecutive misses
    });

    it('should create care circle with custom settings', async () => {
      const userId = 'user-2';
      const members = ['member-3', 'member-4', 'member-5'];

      const careCircle = await setupCareCircle(userId, members, {
        checkInEnabled: true,
        checkInFrequency: 'twice-daily',
        missedCheckInThreshold: 14,
        escalationThreshold: 3,
        preferredCheckInTime: 9 * 60, // 9:00 AM
      });

      expect(careCircle.checkInFrequency).toBe('twice-daily');
      expect(careCircle.missedCheckInThreshold).toBe(14);
      expect(careCircle.escalationThreshold).toBe(3);
      expect(careCircle.preferredCheckInTime).toBe(540);
    });

    it('should update existing care circle', async () => {
      const userId = 'user-3';
      const initialMembers = ['member-1'];
      const updatedMembers = ['member-1', 'member-2'];

      // Create initial care circle
      await setupCareCircle(userId, initialMembers);

      // Update with new members
      const updated = await setupCareCircle(userId, updatedMembers);

      expect(updated.members).toEqual(updatedMembers);
    });

    it('should retrieve care circle for user', async () => {
      const userId = 'user-4';
      const members = ['member-1'];

      await setupCareCircle(userId, members);

      const retrieved = getCareCircle(userId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe(userId);
    });
  });

  describe('Enable/Disable Monitoring', () => {
    it('should disable check-in monitoring', async () => {
      const userId = 'user-5';
      await setupCareCircle(userId, ['member-1'], { checkInEnabled: true });

      await disableCheckInMonitoring(userId);

      const careCircle = getCareCircle(userId);
      expect(careCircle?.checkInEnabled).toBe(false);
    });

    it('should enable check-in monitoring', async () => {
      const userId = 'user-6';
      await setupCareCircle(userId, ['member-1'], { checkInEnabled: false });

      await enableCheckInMonitoring(userId);

      const careCircle = getCareCircle(userId);
      expect(careCircle?.checkInEnabled).toBe(true);
    });

    it('should not create alerts when monitoring is disabled', async () => {
      const userId = 'user-7';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: false,
        missedCheckInThreshold: 0.01, // Very short threshold
      });

      // Wait a bit (simulated passage of time)
      const alerts = await checkForMissedCheckIns();

      // No alert should be created for disabled monitoring
      const userAlerts = alerts.filter(a => a.userId === userId);
      expect(userAlerts).toHaveLength(0);
    });
  });

  describe('Missed Check-In Detection', () => {
    it('should detect missed check-in after threshold', async () => {
      const userId = 'user-8';
      const careCircleId = (await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0, // Immediately overdue
      })).id;

      // No check-in exists
      const alerts = await checkForMissedCheckIns();

      const userAlert = alerts.find(a => a.userId === userId);
      expect(userAlert).toBeDefined();
      expect(userAlert?.careCircleId).toBe(careCircleId);
      expect(userAlert?.consecutiveMissed).toBeGreaterThanOrEqual(1);
    });

    it('should not detect missed check-in before threshold', async () => {
      const userId = 'user-9';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 1000, // 1000 hours - won't trigger
      });

      // Recent check-in
      await submitCheckIn(userId, 'okay');

      const alerts = await checkForMissedCheckIns();

      const userAlert = alerts.find(a => a.userId === userId);
      expect(userAlert).toBeUndefined();
    });

    it('should count consecutive missed check-ins', async () => {
      const userId = 'user-10';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        checkInFrequency: 'daily',
        missedCheckInThreshold: 0, // Immediately overdue
      });

      // Create an old check-in (simulating multiple days passed)
      const oldTimestamp = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 days ago
      await db.addCheckIn({
        userId,
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
        createdAt: oldTimestamp,
      });

      const alerts = await checkForMissedCheckIns();

      const userAlert = alerts.find(a => a.userId === userId);
      expect(userAlert).toBeDefined();
      // Should detect multiple consecutive misses
      expect(userAlert?.consecutiveMissed).toBeGreaterThan(1);
    });
  });

  describe('Alert Escalation', () => {
    it('should escalate alert after threshold', async () => {
      const userId = 'user-11';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
        escalationThreshold: 2,
        checkInFrequency: 'daily',
      });

      // Create very old check-in (3 days ago = 3 consecutive misses for daily)
      const oldTimestamp = Date.now() - (3 * 24 * 60 * 60 * 1000);
      await db.addCheckIn({
        userId,
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
        createdAt: oldTimestamp,
      });

      const alerts = await checkForMissedCheckIns();

      const userAlert = alerts.find(a => a.userId === userId);
      expect(userAlert).toBeDefined();
      expect(userAlert?.consecutiveMissed).toBeGreaterThanOrEqual(2);
      expect(userAlert?.escalated).toBe(true);
    });

    it('should not escalate before threshold', async () => {
      const userId = 'user-12';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
        escalationThreshold: 5, // High threshold
        checkInFrequency: 'daily',
      });

      // One day old check-in
      const oldTimestamp = Date.now() - (1.5 * 24 * 60 * 60 * 1000);
      await db.addCheckIn({
        userId,
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
        createdAt: oldTimestamp,
      });

      const alerts = await checkForMissedCheckIns();

      const userAlert = alerts.find(a => a.userId === userId);
      expect(userAlert?.escalated).toBe(false);
    });
  });

  describe('Alert Acknowledgement', () => {
    it('should acknowledge a missed check-in alert', async () => {
      const userId = 'user-13';
      const memberId = 'member-1';
      await setupCareCircle(userId, [memberId], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === userId);

      expect(alert).toBeDefined();
      expect(alert!.acknowledged).toBe(false);

      await acknowledgeMissedCheckInAlert(alert!.id, memberId);

      const updatedAlert = db.getMissedCheckInAlert(alert!.id);
      expect(updatedAlert?.acknowledged).toBe(true);
      expect(updatedAlert?.acknowledgedBy).toContain(memberId);
    });

    it('should support multiple acknowledgers', async () => {
      const userId = 'user-14';
      const member1 = 'member-1';
      const member2 = 'member-2';
      await setupCareCircle(userId, [member1, member2], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === userId);

      await acknowledgeMissedCheckInAlert(alert!.id, member1);
      await acknowledgeMissedCheckInAlert(alert!.id, member2);

      const updatedAlert = db.getMissedCheckInAlert(alert!.id);
      expect(updatedAlert?.acknowledgedBy).toContain(member1);
      expect(updatedAlert?.acknowledgedBy).toContain(member2);
    });
  });

  describe('Clear Alerts on Check-In', () => {
    it('should clear alerts when user checks in', async () => {
      const userId = 'user-15';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      // Create alert
      await checkForMissedCheckIns();

      const alertsBefore = db.listMissedCheckInAlerts().filter(
        a => a.userId === userId && !a.acknowledged
      );
      expect(alertsBefore.length).toBeGreaterThan(0);

      // User checks in
      await submitCheckIn(userId, 'okay');

      const alertsAfter = db.listMissedCheckInAlerts().filter(
        a => a.userId === userId && !a.acknowledged
      );
      expect(alertsAfter).toHaveLength(0);
    });

    it('should clear alerts manually', async () => {
      const userId = 'user-16';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      await checkForMissedCheckIns();

      const alertsBefore = db.listMissedCheckInAlerts().filter(
        a => a.userId === userId && !a.acknowledged
      );
      expect(alertsBefore.length).toBeGreaterThan(0);

      await clearAlertsForUser(userId);

      const alertsAfter = db.listMissedCheckInAlerts().filter(
        a => a.userId === userId && !a.acknowledged
      );
      expect(alertsAfter).toHaveLength(0);
    });
  });

  describe('Get Alerts for Care Circle Members', () => {
    it('should get alerts for care circles member belongs to', async () => {
      const user1 = 'user-17';
      const user2 = 'user-18';
      const member = 'member-shared';

      // Member is in both care circles
      await setupCareCircle(user1, [member], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      await setupCareCircle(user2, [member], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      await checkForMissedCheckIns();

      const memberAlerts = getMyMissedCheckInAlerts(member);

      // Member should see alerts for both users
      expect(memberAlerts.length).toBeGreaterThanOrEqual(2);
      const userIds = memberAlerts.map(a => a.userId);
      expect(userIds).toContain(user1);
      expect(userIds).toContain(user2);
    });

    it('should not get acknowledged alerts', async () => {
      const userId = 'user-19';
      const memberId = 'member-1';

      await setupCareCircle(userId, [memberId], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === userId);

      // Before acknowledgement
      const beforeAck = getMyMissedCheckInAlerts(memberId);
      expect(beforeAck.length).toBeGreaterThan(0);

      // Acknowledge
      await acknowledgeMissedCheckInAlert(alert!.id, memberId);

      // After acknowledgement
      const afterAck = getMyMissedCheckInAlerts(memberId);
      expect(afterAck).toHaveLength(0);
    });
  });

  describe('Missed Check-In Summary', () => {
    it('should provide accurate summary with no care circle', () => {
      const userId = 'user-20';

      const summary = getMissedCheckInSummary(userId);

      expect(summary.hasCareCircle).toBe(false);
      expect(summary.monitoringEnabled).toBe(false);
      expect(summary.hasActiveAlert).toBe(false);
      expect(summary.consecutiveMissed).toBe(0);
      expect(summary.escalated).toBe(false);
      expect(summary.hoursSinceLastCheckIn).toBeNull();
    });

    it('should provide accurate summary with care circle', async () => {
      const userId = 'user-21';

      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
      });

      await submitCheckIn(userId, 'okay');

      const summary = getMissedCheckInSummary(userId);

      expect(summary.hasCareCircle).toBe(true);
      expect(summary.monitoringEnabled).toBe(true);
      expect(summary.hasActiveAlert).toBe(false);
      expect(summary.hoursSinceLastCheckIn).toBeLessThan(1);
    });

    it('should show active alert in summary', async () => {
      const userId = 'user-22';

      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      await checkForMissedCheckIns();

      const summary = getMissedCheckInSummary(userId);

      expect(summary.hasActiveAlert).toBe(true);
      expect(summary.consecutiveMissed).toBeGreaterThan(0);
    });
  });

  describe('Different Check-In Frequencies', () => {
    it('should handle daily frequency', async () => {
      const userId = 'user-23';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        checkInFrequency: 'daily',
        missedCheckInThreshold: 0,
      });

      // Check-in from 2 days ago
      const oldTimestamp = Date.now() - (2 * 24 * 60 * 60 * 1000);
      await db.addCheckIn({
        userId,
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
        createdAt: oldTimestamp,
      });

      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === userId);

      // Should count roughly 2 consecutive misses for daily
      expect(alert?.consecutiveMissed).toBeGreaterThanOrEqual(2);
    });

    it('should handle twice-daily frequency', async () => {
      const userId = 'user-24';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        checkInFrequency: 'twice-daily',
        missedCheckInThreshold: 0,
      });

      // Check-in from 1 day ago
      const oldTimestamp = Date.now() - (24 * 60 * 60 * 1000);
      await db.addCheckIn({
        userId,
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
        createdAt: oldTimestamp,
      });

      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === userId);

      // Should count roughly 2 consecutive misses (2 intervals of 12 hours)
      expect(alert?.consecutiveMissed).toBeGreaterThanOrEqual(2);
    });

    it('should handle weekly frequency', async () => {
      const userId = 'user-25';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        checkInFrequency: 'weekly',
        missedCheckInThreshold: 0,
      });

      // Check-in from 2 weeks ago
      const oldTimestamp = Date.now() - (14 * 24 * 60 * 60 * 1000);
      await db.addCheckIn({
        userId,
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
        createdAt: oldTimestamp,
      });

      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === userId);

      // Should count roughly 2 consecutive misses for weekly
      expect(alert?.consecutiveMissed).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Periodic Monitoring', () => {
    it('should start and stop monitoring', () => {
      const stopMonitoring = startCheckInMonitoring(60);

      expect(typeof stopMonitoring).toBe('function');

      // Should be able to stop
      stopMonitoring();
    });

    it('should run check immediately on start', async () => {
      const userId = 'user-26';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      // Start monitoring (should run immediately)
      const stopMonitoring = startCheckInMonitoring(60);

      // Give it a moment to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have created alert
      const alerts = db.listMissedCheckInAlerts().filter(a => a.userId === userId);
      expect(alerts.length).toBeGreaterThan(0);

      stopMonitoring();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no check-ins ever', async () => {
      const userId = 'user-27';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === userId);

      expect(alert).toBeDefined();
      expect(alert?.lastCheckInAt).toBeUndefined();
      expect(alert?.consecutiveMissed).toBeGreaterThanOrEqual(1);
    });

    it('should not create duplicate alerts', async () => {
      const userId = 'user-28';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      // Run check twice
      await checkForMissedCheckIns();
      await checkForMissedCheckIns();

      const alerts = db.listMissedCheckInAlerts().filter(
        a => a.userId === userId && !a.acknowledged
      );

      // Should only have one active alert
      expect(alerts).toHaveLength(1);
    });

    it('should update existing alert with new consecutive count', async () => {
      const userId = 'user-29';
      await setupCareCircle(userId, ['member-1'], {
        checkInEnabled: true,
        checkInFrequency: 'daily',
        missedCheckInThreshold: 0,
      });

      // Create old check-in (1 day ago)
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // Just over 1 day
      await db.addCheckIn({
        userId,
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
        createdAt: oldTimestamp,
      });

      // First check
      await checkForMissedCheckIns();
      const alert1 = db.listMissedCheckInAlerts().find(
        a => a.userId === userId && !a.acknowledged
      );
      const firstCount = alert1?.consecutiveMissed || 0;

      // Simulate more time passing by updating the check-in timestamp
      await db.updateCheckIn((await db.getUserCheckIns(userId))[0].id, {
        createdAt: Date.now() - (49 * 60 * 60 * 1000), // Just over 2 days
      });

      // Second check
      await checkForMissedCheckIns();
      const alert2 = db.listMissedCheckInAlerts().find(
        a => a.userId === userId && !a.acknowledged
      );
      const secondCount = alert2?.consecutiveMissed || 0;

      // Consecutive count should increase
      expect(secondCount).toBeGreaterThan(firstCount);
    });
  });
});
