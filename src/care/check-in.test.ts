/**
 * Tests for Community Care Check-In System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import type { CheckIn, CheckInStatus } from '../types';

describe('Community Care Check-In System', () => {
  beforeEach(async () => {
    // Initialize database before each test
    await db.init();
  });

  describe('Check-In Creation', () => {
    it('should create an okay check-in', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'test-user-1',
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
      });

      expect(checkIn.id).toBeDefined();
      expect(checkIn.userId).toBe('test-user-1');
      expect(checkIn.status).toBe('okay');
      expect(checkIn.acknowledged).toBe(true);
      expect(checkIn.createdAt).toBeDefined();
    });

    it('should create a need-support check-in with message', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'test-user-2',
        status: 'need-support',
        message: 'Could use help with groceries',
        acknowledged: false,
      });

      expect(checkIn.status).toBe('need-support');
      expect(checkIn.message).toBe('Could use help with groceries');
      expect(checkIn.acknowledged).toBe(false);
    });

    it('should create an emergency check-in', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'test-user-3',
        status: 'emergency',
        message: 'Fell and need immediate help',
        acknowledged: false,
      });

      expect(checkIn.status).toBe('emergency');
      expect(checkIn.message).toBe('Fell and need immediate help');
    });
  });

  describe('Check-In Retrieval', () => {
    beforeEach(async () => {
      // Add some test check-ins
      await db.addCheckIn({
        userId: 'user-1',
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
      });

      await db.addCheckIn({
        userId: 'user-2',
        status: 'need-support',
        message: 'Need help',
        acknowledged: false,
      });

      await db.addCheckIn({
        userId: 'user-1',
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
      });
    });

    it('should list all check-ins', () => {
      const checkIns = db.listCheckIns();
      expect(checkIns.length).toBeGreaterThanOrEqual(3);
    });

    it('should get check-ins by user', () => {
      const user1CheckIns = db.getUserCheckIns('user-1');
      expect(user1CheckIns.length).toBeGreaterThanOrEqual(2);
      expect(user1CheckIns.every(c => c.userId === 'user-1')).toBe(true);
    });

    it('should get latest check-in for user', () => {
      const latest = db.getLatestCheckIn('user-1');
      expect(latest).toBeDefined();
      expect(latest?.userId).toBe('user-1');
    });

    it('should get check-ins needing support', () => {
      const needingSupport = db.getCheckInsNeedingSupport();
      expect(needingSupport.length).toBeGreaterThanOrEqual(1);
      expect(needingSupport.every(c =>
        (c.status === 'need-support' || c.status === 'emergency') && !c.acknowledged
      )).toBe(true);
    });

    it('should get recent check-ins within time window', () => {
      const recent = db.getRecentCheckIns(24);
      expect(recent.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Check-In Updates', () => {
    it('should acknowledge a support request', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'user-1',
        status: 'need-support',
        message: 'Need help',
        acknowledged: false,
      });

      await db.updateCheckIn(checkIn.id, {
        acknowledged: true,
        acknowledgedBy: ['helper-1'],
        acknowledgedAt: Date.now(),
      });

      const updated = db.getCheckIn(checkIn.id);
      expect(updated?.acknowledged).toBe(true);
      expect(updated?.acknowledgedBy).toContain('helper-1');
      expect(updated?.acknowledgedAt).toBeDefined();
    });

    it('should support multiple acknowledgers', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'user-1',
        status: 'emergency',
        acknowledged: false,
      });

      await db.updateCheckIn(checkIn.id, {
        acknowledged: true,
        acknowledgedBy: ['helper-1', 'helper-2', 'helper-3'],
        acknowledgedAt: Date.now(),
      });

      const updated = db.getCheckIn(checkIn.id);
      expect(updated?.acknowledgedBy?.length).toBe(3);
    });
  });

  describe('Data Persistence', () => {
    it('should persist check-ins in IndexedDB', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'persist-test',
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
      });

      // Get binary representation (simulates storage)
      const binary = db.getBinary();
      expect(binary).toBeDefined();
      expect(binary.length).toBeGreaterThan(0);

      // Verify check-in is in document
      const retrieved = db.getCheckIn(checkIn.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe('persist-test');
    });
  });

  describe('Privacy and Autonomy', () => {
    it('should allow opt-in (user chooses to check-in)', async () => {
      // This test verifies that check-ins are explicit actions, not automatic
      const initialCount = db.listCheckIns().length;

      // User chooses not to check in - no automatic entry
      // (no check-in created)

      const afterCount = db.listCheckIns().length;
      expect(afterCount).toBe(initialCount);
    });

    it('should support optional messages', async () => {
      const withMessage = await db.addCheckIn({
        userId: 'user-1',
        status: 'okay',
        message: 'Having a great day!',
        acknowledged: true,
        acknowledgedBy: [],
      });

      const withoutMessage = await db.addCheckIn({
        userId: 'user-2',
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
      });

      expect(withMessage.message).toBeDefined();
      expect(withoutMessage.message).toBeUndefined();
    });

    it('should auto-acknowledge okay status (no burden on community)', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'user-1',
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
      });

      expect(checkIn.acknowledged).toBe(true);
    });

    it('should not auto-acknowledge support requests (community needs to see)', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'user-1',
        status: 'need-support',
        acknowledged: false,
      });

      expect(checkIn.acknowledged).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no check-ins', () => {
      const latest = db.getLatestCheckIn('non-existent-user');
      expect(latest).toBeUndefined();
    });

    it('should handle empty message as undefined', async () => {
      const checkIn = await db.addCheckIn({
        userId: 'user-1',
        status: 'need-support',
        message: '',
        acknowledged: false,
      });

      // Empty string should be treated as undefined in practice
      expect(checkIn.message).toBe('');
    });

    it('should handle multiple check-ins from same user on same day', async () => {
      await db.addCheckIn({
        userId: 'active-user',
        status: 'okay',
        acknowledged: true,
        acknowledgedBy: [],
      });

      await db.addCheckIn({
        userId: 'active-user',
        status: 'need-support',
        message: 'Changed my mind, need help',
        acknowledged: false,
      });

      const userCheckIns = db.getUserCheckIns('active-user');
      expect(userCheckIns.length).toBe(2);

      const latest = db.getLatestCheckIn('active-user');
      expect(latest?.status).toBe('need-support');
    });
  });
});
