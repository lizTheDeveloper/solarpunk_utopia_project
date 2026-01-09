/**
 * Tests for Request Help - Time Bank Core
 * REQ-TIME-006: Explicit Time Requests
 * REQ-TIME-008: Emergency and Urgent Needs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  createHelpRequest,
  updateHelpRequest,
  cancelHelpRequest,
  getMyHelpRequests,
  getOpenHelpRequests,
  getUrgentHelpRequests,
  getHelpRequestsBySkill,
  searchHelpRequests,
  acceptHelpRequest,
  confirmHelpSession,
  type CreateHelpRequestOptions,
} from './request-help';

describe('Request Help - Time Bank', () => {
  beforeEach(async () => {
    // Initialize the global database for each test
    await db.init();
    await db.reset();
  });

  describe('createHelpRequest', () => {
    it('should create a basic help request', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Need help moving furniture',
        description: 'Moving a couch and some boxes to new apartment',
        preferredDate: Date.now() + 86400000, // Tomorrow
        preferredTime: { startTime: '10:00', endTime: '14:00' },
        location: { type: 'recipient-place', details: '123 Main St' },
      };

      const request = await createHelpRequest(options);

      expect(request.id).toBeDefined();
      expect(request.recipientId).toBe('user-123');
      expect(request.title).toBe('Need help moving furniture');
      expect(request.description).toBe('Moving a couch and some boxes to new apartment');
      expect(request.status).toBe('proposed');
      expect(request.volunteerId).toBe(''); // No volunteer yet
      expect(request.volunteerConfirmed).toBe(false);
      expect(request.recipientConfirmed).toBe(false);
    });

    it('should create urgent help request', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Urgent: Need childcare for tomorrow',
        description: 'Regular childcare fell through',
        urgency: 'urgent',
        helpersNeeded: 1,
        estimatedDuration: 480, // 8 hours
      };

      const request = await createHelpRequest(options);

      expect(request.status).toBe('proposed'); // Urgent goes to proposed
      expect(request.notes).toContain('Urgency: urgent');
    });

    it('should create emergency help request', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Emergency: Need ride to hospital',
        description: 'Medical emergency, need transport',
        urgency: 'emergency',
      };

      const request = await createHelpRequest(options);

      expect(request.status).toBe('pending'); // Emergency goes straight to pending
      expect(request.notes).toContain('Urgency: emergency');
    });

    it('should include skill categories in notes', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Need plumbing repair',
        description: 'Leaky faucet needs fixing',
        skillCategories: ['repair', 'plumbing'],
      };

      const request = await createHelpRequest(options);

      expect(request.notes).toContain('Skills: repair, plumbing');
    });

    it('should include materials information', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Help building garden bed',
        description: 'Need help assembling raised garden bed',
        materialsProvided: ['wood', 'screws', 'tools'],
        materialsNeeded: ['drill'],
      };

      const request = await createHelpRequest(options);

      expect(request.notes).toContain('Materials provided: wood, screws, tools');
      expect(request.notes).toContain('Please bring: drill');
    });

    it('should include accessibility information', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Need tutoring help',
        description: 'Math tutoring for high school student',
        accessibilityInfo: 'Wheelchair accessible location',
      };

      const request = await createHelpRequest(options);

      expect(request.notes).toContain('Accessibility: Wheelchair accessible location');
    });

    it('should sanitize user input', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: '<script>alert("xss")</script>Help needed',
        description: 'Normal description',
      };

      const request = await createHelpRequest(options);

      // Should not contain script tags
      expect(request.title).not.toContain('<script>');
      expect(request.title).not.toContain('</script>');
    });

    it('should require title', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: '',
        description: 'Some description',
      };

      await expect(createHelpRequest(options)).rejects.toThrow('title is required');
    });

    it('should require description', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Help needed',
        description: '',
      };

      await expect(createHelpRequest(options)).rejects.toThrow('description is required');
    });

    it('should require valid user ID', async () => {
      const options: CreateHelpRequestOptions = {
        userId: '',
        title: 'Help needed',
        description: 'Description',
      };

      await expect(createHelpRequest(options)).rejects.toThrow('User ID');
    });

    it('should handle multiple volunteers needed', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Community garden workday',
        description: 'Need volunteers for garden cleanup',
        helpersNeeded: 5,
      };

      const request = await createHelpRequest(options);

      expect(request.notes).toContain('Volunteers needed: 5');
    });

    it('should indicate flexible timing', async () => {
      const options: CreateHelpRequestOptions = {
        userId: 'user-123',
        title: 'Help with painting',
        description: 'Need to paint bedroom',
        flexibleTiming: true,
      };

      const request = await createHelpRequest(options);

      expect(request.notes).toContain('Timing is flexible');
    });
  });

  describe('updateHelpRequest', () => {
    it('should update help request before volunteer accepts', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Original title',
        description: 'Original description',
      });

      await updateHelpRequest(request.id, {
        title: 'Updated title',
        description: 'Updated description',
      });

      const updated = db.getHelpSession(request.id);
      expect(updated?.title).toBe('Updated title');
      expect(updated?.description).toBe('Updated description');
    });

    it('should not allow update after volunteer accepts', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Need help',
        description: 'Description',
      });

      // Simulate volunteer accepting
      await acceptHelpRequest(request.id, 'volunteer-456');

      // Try to update - should fail
      await expect(
        updateHelpRequest(request.id, { title: 'New title' })
      ).rejects.toThrow('after a volunteer has accepted');
    });

    it('should update scheduling information', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Help needed',
        description: 'Description',
      });

      const newDate = Date.now() + 172800000; // 2 days from now
      await updateHelpRequest(request.id, {
        preferredDate: newDate,
        preferredTime: { startTime: '14:00', endTime: '16:00' },
      });

      const updated = db.getHelpSession(request.id);
      expect(updated?.scheduledDate).toBe(newDate);
      expect(updated?.scheduledTime.startTime).toBe('14:00');
      expect(updated?.scheduledTime.endTime).toBe('16:00');
    });
  });

  describe('cancelHelpRequest', () => {
    it('should cancel help request', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Help needed',
        description: 'Description',
      });

      await cancelHelpRequest(request.id, 'user-123', 'No longer needed');

      const cancelled = db.getHelpSession(request.id);
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.cancelledBy).toBe('user-123');
      expect(cancelled?.cancellationReason).toBe('No longer needed');
      expect(cancelled?.cancelledAt).toBeDefined();
    });

    it('should only allow requester to cancel', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Help needed',
        description: 'Description',
      });

      await expect(
        cancelHelpRequest(request.id, 'other-user', 'Not authorized')
      ).rejects.toThrow('Only the person who requested help can cancel');
    });
  });

  describe('getMyHelpRequests', () => {
    it('should return all help requests by user', async () => {
      await createHelpRequest({
        userId: 'user-123',
        title: 'Request 1',
        description: 'Description 1',
      });

      await createHelpRequest({
        userId: 'user-123',
        title: 'Request 2',
        description: 'Description 2',
      });

      await createHelpRequest({
        userId: 'other-user',
        title: 'Other request',
        description: 'Other description',
      });

      const myRequests = getMyHelpRequests('user-123');
      expect(myRequests).toHaveLength(2);
      expect(myRequests.every(r => r.recipientId === 'user-123')).toBe(true);
    });

    it('should return empty array for invalid user ID', () => {
      const requests = getMyHelpRequests('');
      expect(requests).toEqual([]);
    });
  });

  describe('getOpenHelpRequests', () => {
    it('should return only proposed requests without volunteers', async () => {
      await createHelpRequest({
        userId: 'user-1',
        title: 'Open request 1',
        description: 'Description',
      });

      await createHelpRequest({
        userId: 'user-2',
        title: 'Open request 2',
        description: 'Description',
      });

      const accepted = await createHelpRequest({
        userId: 'user-3',
        title: 'Accepted request',
        description: 'Description',
      });
      await acceptHelpRequest(accepted.id, 'volunteer-1');

      const openRequests = getOpenHelpRequests();
      expect(openRequests).toHaveLength(2);
      expect(openRequests.every(r => r.status === 'proposed')).toBe(true);
      expect(openRequests.every(r => !r.volunteerId || r.volunteerId === '')).toBe(true);
    });
  });

  describe('getUrgentHelpRequests', () => {
    it('should return only urgent and emergency requests', async () => {
      await createHelpRequest({
        userId: 'user-1',
        title: 'Routine help',
        description: 'Description',
        urgency: 'routine',
      });

      await createHelpRequest({
        userId: 'user-2',
        title: 'Urgent help',
        description: 'Description',
        urgency: 'urgent',
      });

      await createHelpRequest({
        userId: 'user-3',
        title: 'Emergency help',
        description: 'Description',
        urgency: 'emergency',
      });

      const urgentRequests = getUrgentHelpRequests();
      expect(urgentRequests.length).toBeGreaterThanOrEqual(2);
      urgentRequests.forEach(req => {
        const hasUrgent = req.notes?.toLowerCase().includes('urgency: urgent') ||
                         req.notes?.toLowerCase().includes('urgency: emergency');
        expect(hasUrgent).toBe(true);
      });
    });
  });

  describe('getHelpRequestsBySkill', () => {
    it('should filter requests by skill category', async () => {
      await createHelpRequest({
        userId: 'user-1',
        title: 'Need plumbing help',
        description: 'Fix leaky pipe',
        skillCategories: ['repair', 'plumbing'],
      });

      await createHelpRequest({
        userId: 'user-2',
        title: 'Need tutoring',
        description: 'Math help',
        skillCategories: ['tutoring', 'education'],
      });

      const plumbingRequests = getHelpRequestsBySkill('plumbing');
      expect(plumbingRequests).toHaveLength(1);
      expect(plumbingRequests[0].title).toContain('plumbing');
    });
  });

  describe('searchHelpRequests', () => {
    it('should search by title keyword', async () => {
      await createHelpRequest({
        userId: 'user-1',
        title: 'Need help moving furniture',
        description: 'Heavy couch',
      });

      await createHelpRequest({
        userId: 'user-2',
        title: 'Need tutoring',
        description: 'Math help',
      });

      const results = searchHelpRequests('furniture');
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('furniture');
    });

    it('should search by description keyword', async () => {
      await createHelpRequest({
        userId: 'user-1',
        title: 'Help needed',
        description: 'Need help with bicycle repair',
      });

      const results = searchHelpRequests('bicycle');
      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('bicycle');
    });

    it('should be case insensitive', async () => {
      await createHelpRequest({
        userId: 'user-1',
        title: 'URGENT HELP NEEDED',
        description: 'Emergency situation',
      });

      const results = searchHelpRequests('urgent');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('acceptHelpRequest', () => {
    it('should allow volunteer to accept request', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Help needed',
        description: 'Description',
      });

      await acceptHelpRequest(request.id, 'volunteer-456');

      const accepted = db.getHelpSession(request.id);
      expect(accepted?.volunteerId).toBe('volunteer-456');
      expect(accepted?.status).toBe('pending');
      expect(accepted?.volunteerConfirmed).toBe(true);
      expect(accepted?.recipientConfirmed).toBe(false);
    });

    it('should not allow accepting already accepted request', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Help needed',
        description: 'Description',
      });

      await acceptHelpRequest(request.id, 'volunteer-1');

      await expect(
        acceptHelpRequest(request.id, 'volunteer-2')
      ).rejects.toThrow('already been accepted');
    });

    it('should not allow requesting user to volunteer for own request', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Help needed',
        description: 'Description',
      });

      await expect(
        acceptHelpRequest(request.id, 'user-123')
      ).rejects.toThrow('cannot volunteer for your own');
    });
  });

  describe('confirmHelpSession', () => {
    it('should confirm session and mark as confirmed when both parties agree', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Help needed',
        description: 'Description',
      });

      await acceptHelpRequest(request.id, 'volunteer-456');
      await confirmHelpSession(request.id, 'user-123');

      const confirmed = db.getHelpSession(request.id);
      expect(confirmed?.recipientConfirmed).toBe(true);
      expect(confirmed?.volunteerConfirmed).toBe(true);
      expect(confirmed?.status).toBe('confirmed');
    });

    it('should only allow recipient to confirm', async () => {
      const request = await createHelpRequest({
        userId: 'user-123',
        title: 'Help needed',
        description: 'Description',
      });

      await acceptHelpRequest(request.id, 'volunteer-456');

      await expect(
        confirmHelpSession(request.id, 'other-user')
      ).rejects.toThrow('Only the person who requested help');
    });
  });

  describe('REQ-TIME-006: Explicit Time Requests', () => {
    it('should enable users to explicitly request help with logistics', async () => {
      // Scenario from spec: User requests help moving furniture next weekend
      const options: CreateHelpRequestOptions = {
        userId: 'user-moving',
        title: 'Need help moving furniture',
        description: 'Moving a couch, bed frame, and boxes to new apartment',
        preferredDate: Date.now() + 7 * 86400000, // Next week
        preferredTime: { startTime: '09:00', endTime: '13:00' },
        location: {
          type: 'recipient-place',
          details: '123 Old Street → 456 New Avenue',
        },
        helpersNeeded: 2,
        materialsNeeded: ['dolly or hand truck'],
        notes: 'Narrow stairway, may need extra care',
      };

      const request = await createHelpRequest(options);

      // Should post to community
      const openRequests = getOpenHelpRequests();
      expect(openRequests.some(r => r.id === request.id)).toBe(true);

      // Should have all coordination details
      expect(request.notes).toContain('Volunteers needed: 2');
      expect(request.notes).toContain('Please bring: dolly or hand truck');
      expect(request.notes).toContain('Narrow stairway');
    });
  });

  describe('REQ-TIME-008: Emergency and Urgent Needs', () => {
    it('should prioritize and rapidly coordinate urgent needs', async () => {
      // Scenario from spec: User has urgent need for child care
      const urgentRequest = await createHelpRequest({
        userId: 'parent-user',
        title: 'Urgent childcare needed for tomorrow',
        description: 'Regular childcare fell through, need someone to watch 5yr old',
        urgency: 'urgent',
        preferredDate: Date.now() + 86400000, // Tomorrow
        preferredTime: { startTime: '08:00', endTime: '17:00' },
        estimatedDuration: 540, // 9 hours
      });

      // Should be in urgent requests
      const urgentRequests = getUrgentHelpRequests();
      expect(urgentRequests.some(r => r.id === urgentRequest.id)).toBe(true);

      // Should enable rapid coordination (volunteer can accept immediately)
      await acceptHelpRequest(urgentRequest.id, 'volunteer-caregiver');

      const accepted = db.getHelpSession(urgentRequest.id);
      expect(accepted?.status).toBe('pending'); // Ready for final confirmation
      expect(accepted?.volunteerId).toBe('volunteer-caregiver');
    });
  });
});
