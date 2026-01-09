/**
 * Integration Tests for Complete Check-In Workflow
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 *
 * Tests the complete end-to-end flow of the check-in system including:
 * - Care circle setup
 * - Daily check-ins
 * - Missed check-in detection
 * - Alert notifications
 * - Community response
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  setupCareCircle,
  checkForMissedCheckIns,
  acknowledgeMissedCheckInAlert,
  getMyMissedCheckInAlerts,
  getMissedCheckInSummary,
  disableCheckInMonitoring,
  enableCheckInMonitoring,
} from './missed-check-in-alerts';
import {
  submitCheckIn,
  acknowledgeCheckIn,
  getCheckInsNeedingResponse,
  getUserLatestStatus,
} from './check-in';

describe('Check-In System Integration Tests', () => {
  beforeEach(async () => {
    await db.init();
  });

  describe('Complete Workflow: Happy Path', () => {
    it('should handle complete daily check-in routine', async () => {
      // Scenario: Elderly user with a care circle checks in daily
      const elderUserId = 'elder-1';
      const neighborId = 'neighbor-1';
      const familyId = 'family-1';

      // Step 1: Set up care circle
      const careCircle = await setupCareCircle(elderUserId, [neighborId, familyId], {
        checkInEnabled: true,
        checkInFrequency: 'daily',
        missedCheckInThreshold: 26,
        escalationThreshold: 2,
      });

      expect(careCircle).toBeDefined();
      expect(careCircle.members).toContain(neighborId);
      expect(careCircle.members).toContain(familyId);

      // Step 2: Elder checks in as "okay"
      const checkIn = await submitCheckIn(elderUserId, 'okay');

      expect(checkIn.userId).toBe(elderUserId);
      expect(checkIn.status).toBe('okay');
      expect(checkIn.acknowledged).toBe(true); // Auto-acknowledged for "okay"

      // Step 3: Verify latest status
      const latestStatus = getUserLatestStatus(elderUserId);
      expect(latestStatus?.status).toBe('okay');

      // Step 4: Run missed check-in monitoring
      const alerts = await checkForMissedCheckIns();

      // No alerts should be generated (just checked in)
      const elderAlerts = alerts.filter(a => a.userId === elderUserId);
      expect(elderAlerts).toHaveLength(0);

      // Step 5: Verify summary
      const summary = getMissedCheckInSummary(elderUserId);
      expect(summary.hasCareCircle).toBe(true);
      expect(summary.monitoringEnabled).toBe(true);
      expect(summary.hasActiveAlert).toBe(false);
    });
  });

  describe('Complete Workflow: Need Support', () => {
    it('should handle support request workflow', async () => {
      // Scenario: User needs help with groceries
      const userId = 'user-need-help';
      const helperId = 'helper-1';

      await setupCareCircle(userId, [helperId]);

      // Step 1: User submits "need-support" check-in
      const checkIn = await submitCheckIn(
        userId,
        'need-support',
        'Could use help with groceries today'
      );

      expect(checkIn.status).toBe('need-support');
      expect(checkIn.acknowledged).toBe(false); // Not auto-acknowledged
      expect(checkIn.message).toBe('Could use help with groceries today');

      // Step 2: Helper sees the support request
      const needingSupport = getCheckInsNeedingResponse();

      const supportRequest = needingSupport.find(c => c.id === checkIn.id);
      expect(supportRequest).toBeDefined();

      // Step 3: Helper acknowledges they can help
      await acknowledgeCheckIn(checkIn.id, helperId);

      // Step 4: Verify acknowledgement
      const updated = db.getCheckIn(checkIn.id);
      expect(updated?.acknowledged).toBe(true);
      expect(updated?.acknowledgedBy).toContain(helperId);

      // Step 5: Request no longer shows in needing support
      const stillNeeding = getCheckInsNeedingResponse();
      const stillNeedingRequest = stillNeeding.find(c => c.id === checkIn.id);
      expect(stillNeedingRequest).toBeUndefined();
    });
  });

  describe('Complete Workflow: Emergency', () => {
    it('should handle emergency workflow', async () => {
      // Scenario: User has fallen and needs immediate help
      const userId = 'user-emergency';
      const responder1 = 'responder-1';
      const responder2 = 'responder-2';

      await setupCareCircle(userId, [responder1, responder2]);

      // Step 1: User submits emergency check-in
      const checkIn = await submitCheckIn(
        userId,
        'emergency',
        'Fell in kitchen, need help now'
      );

      expect(checkIn.status).toBe('emergency');
      expect(checkIn.acknowledged).toBe(false);

      // Step 2: Multiple responders see the emergency
      const emergencies = getCheckInsNeedingResponse();
      const emergency = emergencies.find(c => c.id === checkIn.id);

      expect(emergency).toBeDefined();
      expect(emergency?.status).toBe('emergency');

      // Step 3: Multiple people respond
      await acknowledgeCheckIn(checkIn.id, responder1);
      await acknowledgeCheckIn(checkIn.id, responder2);

      // Step 4: Verify multiple acknowledgers
      const updated = db.getCheckIn(checkIn.id);
      expect(updated?.acknowledgedBy).toHaveLength(2);
      expect(updated?.acknowledgedBy).toContain(responder1);
      expect(updated?.acknowledgedBy).toContain(responder2);
    });
  });

  describe('Complete Workflow: Missed Check-In', () => {
    it('should handle complete missed check-in detection and response', async () => {
      // Scenario: Elder misses check-in, care circle is alerted
      const elderUserId = 'elder-missed';
      const neighborId = 'neighbor-respond';

      // Step 1: Set up care circle
      await setupCareCircle(elderUserId, [neighborId], {
        checkInEnabled: true,
        checkInFrequency: 'daily',
        missedCheckInThreshold: 0, // Immediate detection for testing
        escalationThreshold: 2,
      });

      // Step 2: Time passes, elder doesn't check in
      // (no check-in submitted)

      // Step 3: System detects missed check-in
      const alerts = await checkForMissedCheckIns();
      const elderAlert = alerts.find(a => a.userId === elderUserId);

      expect(elderAlert).toBeDefined();
      expect(elderAlert?.acknowledged).toBe(false);

      // Step 4: Neighbor sees the alert
      const neighborAlerts = getMyMissedCheckInAlerts(neighborId);
      expect(neighborAlerts.length).toBeGreaterThan(0);

      const relevantAlert = neighborAlerts.find(a => a.userId === elderUserId);
      expect(relevantAlert).toBeDefined();

      // Step 5: Neighbor acknowledges they're checking
      await acknowledgeMissedCheckInAlert(elderAlert!.id, neighborId);

      // Step 6: Verify alert is acknowledged
      const updatedAlert = db.getMissedCheckInAlert(elderAlert!.id);
      expect(updatedAlert?.acknowledged).toBe(true);
      expect(updatedAlert?.acknowledgedBy).toContain(neighborId);

      // Step 7: Elder checks in after neighbor visits
      await submitCheckIn(elderUserId, 'okay', 'Sorry, forgot to check in!');

      // Step 8: Verify no more active alerts
      const summary = getMissedCheckInSummary(elderUserId);
      expect(summary.hasActiveAlert).toBe(false);
    });
  });

  describe('Complete Workflow: Escalation', () => {
    it('should handle escalation for multiple missed check-ins', async () => {
      // Scenario: Elder misses multiple check-ins, alert escalates
      const elderUserId = 'elder-escalation';
      const caregiverId = 'caregiver-1';

      // Step 1: Set up care circle
      await setupCareCircle(elderUserId, [caregiverId], {
        checkInEnabled: true,
        checkInFrequency: 'daily',
        missedCheckInThreshold: 0,
        escalationThreshold: 2,
      });

      // Step 2: Create old check-in (multiple days ago)
      const oldTimestamp = Date.now() - (3 * 24 * 60 * 60 * 1000);
      await db.addCheckIn({
        userId: elderUserId,
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
        createdAt: oldTimestamp,
      });

      // Step 3: System detects multiple consecutive misses
      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === elderUserId);

      expect(alert).toBeDefined();
      expect(alert?.consecutiveMissed).toBeGreaterThanOrEqual(2);
      expect(alert?.escalated).toBe(true);

      // Step 4: Caregiver sees escalated alert
      const caregiverAlerts = getMyMissedCheckInAlerts(caregiverId);
      const escalatedAlert = caregiverAlerts.find(a => a.escalated);

      expect(escalatedAlert).toBeDefined();

      // Step 5: Summary shows escalation
      const summary = getMissedCheckInSummary(elderUserId);
      expect(summary.hasActiveAlert).toBe(true);
      expect(summary.escalated).toBe(true);
      expect(summary.consecutiveMissed).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Complete Workflow: Temporary Pause', () => {
    it('should handle vacation/pause workflow', async () => {
      // Scenario: User goes on vacation, pauses monitoring
      const userId = 'user-vacation';
      const caregiverId = 'caregiver-vacation';

      // Step 1: Set up care circle
      await setupCareCircle(userId, [caregiverId], {
        checkInEnabled: true,
        missedCheckInThreshold: 0,
      });

      // Step 2: User pauses monitoring for vacation
      await disableCheckInMonitoring(userId);

      const summary1 = getMissedCheckInSummary(userId);
      expect(summary1.monitoringEnabled).toBe(false);

      // Step 3: Time passes, no check-in
      // Run monitoring - should NOT create alert
      const alertsDuringVacation = await checkForMissedCheckIns();
      const vacationAlert = alertsDuringVacation.find(a => a.userId === userId);

      expect(vacationAlert).toBeUndefined();

      // Step 4: User returns, resumes monitoring
      await enableCheckInMonitoring(userId);

      const summary2 = getMissedCheckInSummary(userId);
      expect(summary2.monitoringEnabled).toBe(true);

      // Step 5: User checks in after returning
      await submitCheckIn(userId, 'okay', 'Back from vacation!');

      const latestStatus = getUserLatestStatus(userId);
      expect(latestStatus?.message).toBe('Back from vacation!');
    });
  });

  describe('Complete Workflow: Multiple Care Circle Members', () => {
    it('should coordinate multiple care circle members', async () => {
      // Scenario: User has family and neighbors in care circle
      const userId = 'user-multi-care';
      const daughter = 'daughter-1';
      const son = 'son-1';
      const neighbor1 = 'neighbor-1';
      const neighbor2 = 'neighbor-2';

      // Step 1: Set up care circle with multiple members
      await setupCareCircle(userId, [daughter, son, neighbor1, neighbor2]);

      // Step 2: User needs support
      const checkIn = await submitCheckIn(
        userId,
        'need-support',
        'Feeling unwell, could use some company'
      );

      // Step 3: All care circle members can see the request
      const needingSupport = getCheckInsNeedingResponse();
      const request = needingSupport.find(c => c.id === checkIn.id);

      expect(request).toBeDefined();

      // Step 4: Daughter responds first
      await acknowledgeCheckIn(checkIn.id, daughter);

      let updated = db.getCheckIn(checkIn.id);
      expect(updated?.acknowledgedBy).toContain(daughter);

      // Step 5: Neighbor also offers to help
      await acknowledgeCheckIn(checkIn.id, neighbor1);

      updated = db.getCheckIn(checkIn.id);
      expect(updated?.acknowledgedBy).toHaveLength(2);
      expect(updated?.acknowledgedBy).toContain(daughter);
      expect(updated?.acknowledgedBy).toContain(neighbor1);
    });
  });

  describe('Complete Workflow: Twice-Daily Check-Ins', () => {
    it('should handle twice-daily check-in schedule', async () => {
      // Scenario: User with disability requires twice-daily check-ins
      const userId = 'user-twice-daily';
      const caregiver = 'caregiver-twice';

      // Step 1: Set up twice-daily care circle
      await setupCareCircle(userId, [caregiver], {
        checkInEnabled: true,
        checkInFrequency: 'twice-daily',
        missedCheckInThreshold: 14, // 14 hours
        escalationThreshold: 3,
      });

      // Step 2: Morning check-in
      await submitCheckIn(userId, 'okay', 'Good morning');

      const morning = getUserLatestStatus(userId);
      expect(morning?.message).toBe('Good morning');

      // Step 3: Simulate passage of time and evening check-in
      // (In real system, this would be hours later)
      await submitCheckIn(userId, 'okay', 'Evening check-in');

      const evening = getUserLatestStatus(userId);
      expect(evening?.message).toBe('Evening check-in');

      // Step 4: Both check-ins recorded
      const userCheckIns = db.getUserCheckIns(userId);
      expect(userCheckIns.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Complete Workflow: Offline-First Operation', () => {
    it('should work entirely offline', async () => {
      // Scenario: All operations work without internet
      const userId = 'user-offline';
      const helperId = 'helper-offline';

      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Step 1: Set up care circle while offline
      const careCircle = await setupCareCircle(userId, [helperId]);
      expect(careCircle).toBeDefined();

      // Step 2: Submit check-in while offline
      const checkIn = await submitCheckIn(userId, 'okay');
      expect(checkIn).toBeDefined();

      // Step 3: Run monitoring while offline
      const alerts = await checkForMissedCheckIns();
      expect(Array.isArray(alerts)).toBe(true);

      // Step 4: Get summary while offline
      const summary = getMissedCheckInSummary(userId);
      expect(summary.hasCareCircle).toBe(true);

      // Everything works offline!
      expect(navigator.onLine).toBe(false);

      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });
  });

  describe('Complete Workflow: CRDT Synchronization', () => {
    it('should sync check-ins between peers', async () => {
      // Scenario: Two devices sync check-in data
      const userId = 'user-sync';
      const caregiverId = 'caregiver-sync';

      // Device 1: Set up care circle and check in
      await setupCareCircle(userId, [caregiverId]);
      await submitCheckIn(userId, 'okay', 'From device 1');

      // Export state from device 1
      const device1Binary = db.getBinary();

      // Device 2: Create new database
      const db2 = await import('../core/database').then(m => {
        const instance = new m.LocalDatabase();
        return instance;
      });
      await db2.init();

      // Device 2: Merge data from device 1
      await db2.merge(device1Binary);

      // Device 2 should have the check-in
      const syncedCheckIns = db2.getUserCheckIns(userId);
      expect(syncedCheckIns.length).toBeGreaterThan(0);

      const syncedCheckIn = syncedCheckIns.find(c => c.message === 'From device 1');
      expect(syncedCheckIn).toBeDefined();

      await db2.close();
    });
  });

  describe('Real-World Scenario: Week-Long Routine', () => {
    it('should handle a week of daily check-ins with one missed day', async () => {
      // Scenario: Elder's weekly routine with one missed check-in
      const elderUserId = 'elder-week';
      const neighborId = 'neighbor-week';

      // Set up care circle
      await setupCareCircle(elderUserId, [neighborId], {
        checkInEnabled: true,
        checkInFrequency: 'daily',
        missedCheckInThreshold: 26,
        escalationThreshold: 2,
      });

      // Monday: Check in
      await submitCheckIn(elderUserId, 'okay');
      expect(getUserLatestStatus(elderUserId)?.status).toBe('okay');

      // Tuesday: Check in
      await submitCheckIn(elderUserId, 'okay');

      // Wednesday: Forgot to check in (simulate old check-in)
      const oldTimestamp = Date.now() - (27 * 60 * 60 * 1000); // 27 hours ago
      const lastCheckIn = db.getUserCheckIns(elderUserId).sort((a, b) => b.createdAt - a.createdAt)[0];
      await db.updateCheckIn(lastCheckIn.id, { createdAt: oldTimestamp });

      // System detects missed check-in
      const alerts = await checkForMissedCheckIns();
      const alert = alerts.find(a => a.userId === elderUserId);
      expect(alert).toBeDefined();

      // Neighbor checks
      const neighborAlerts = getMyMissedCheckInAlerts(neighborId);
      expect(neighborAlerts.length).toBeGreaterThan(0);

      // Neighbor acknowledges
      await acknowledgeMissedCheckInAlert(alert!.id, neighborId);

      // Thursday: Elder checks in after reminder
      await submitCheckIn(elderUserId, 'okay', 'Thanks for checking on me!');

      // Alert is cleared
      const summary = getMissedCheckInSummary(elderUserId);
      expect(summary.hasActiveAlert).toBe(false);

      // Friday-Sunday: Continues normal check-ins
      await submitCheckIn(elderUserId, 'okay');
      await submitCheckIn(elderUserId, 'okay');
      await submitCheckIn(elderUserId, 'okay');

      // Week complete with all check-ins
      const weekCheckIns = db.getUserCheckIns(elderUserId);
      expect(weekCheckIns.length).toBeGreaterThanOrEqual(5);
    });
  });
});
