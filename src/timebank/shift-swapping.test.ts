/**
 * Tests for Shift Swapping and Coverage
 * REQ-GOV-019B: Shift Swapping and Coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  requestShiftSwap,
  acceptShiftSwap,
  declineShiftSwap,
  cancelShiftSwap,
  findPotentialSwapPartners,
  getShiftSwapRequest,
  browseOpenSwapRequests,
  getMySwapRequests,
  getSwapRequestsProposedToMe,
  formatSwapRequestForDisplay,
} from './shift-swapping';
import type { UserProfile, VolunteerShift } from '../types';

describe('Shift Swapping and Coverage', () => {
  let userA: UserProfile;
  let userB: UserProfile;
  let userC: UserProfile;
  let shiftA: VolunteerShift;
  let shiftB: VolunteerShift;
  let shiftC: VolunteerShift;

  beforeEach(async () => {
    await db.init();
    await db.reset();

    // Create test users
    userA = await db.addUserProfile({
      displayName: 'User A',
      bio: 'Test user A',
    });

    userB = await db.addUserProfile({
      displayName: 'User B',
      bio: 'Test user B',
    });

    userC = await db.addUserProfile({
      displayName: 'User C',
      bio: 'Test user C',
    });

    // Create test shifts
    shiftA = await db.addVolunteerShift({
      title: 'Community Garden Shift A',
      description: 'Help with watering',
      category: 'food-security',
      shiftDate: Date.now() + 86400000, // Tomorrow
      shiftTime: { startTime: '09:00', endTime: '12:00' },
      location: {
        type: 'physical',
        name: 'Community Garden',
        address: '123 Garden St',
      },
      volunteersNeeded: 3,
      volunteersSignedUp: [userA.id],
      status: 'open',
    });

    shiftB = await db.addVolunteerShift({
      title: 'Community Garden Shift B',
      description: 'Help with planting',
      category: 'food-security',
      shiftDate: Date.now() + 172800000, // Day after tomorrow
      shiftTime: { startTime: '14:00', endTime: '17:00' },
      location: {
        type: 'physical',
        name: 'Community Garden',
        address: '123 Garden St',
      },
      volunteersNeeded: 3,
      volunteersSignedUp: [userB.id],
      status: 'open',
    });

    shiftC = await db.addVolunteerShift({
      title: 'Different Category Shift',
      description: 'Different work',
      category: 'education',
      shiftDate: Date.now() + 259200000, // 3 days from now
      shiftTime: { startTime: '10:00', endTime: '13:00' },
      location: {
        type: 'physical',
        name: 'Library',
        address: '456 Library Ave',
      },
      volunteersNeeded: 2,
      volunteersSignedUp: [userC.id],
      status: 'open',
    });
  });

  describe('requestShiftSwap', () => {
    describe('Open Coverage Requests', () => {
      it('should create an open coverage request', async () => {
        const swapRequest = await requestShiftSwap({
          shiftId: shiftA.id,
          requesterId: userA.id,
          reason: 'Family emergency',
          isOpenRequest: true,
        });

        expect(swapRequest).toBeDefined();
        expect(swapRequest.shiftId).toBe(shiftA.id);
        expect(swapRequest.requesterId).toBe(userA.id);
        expect(swapRequest.status).toBe('pending');
        expect(swapRequest.isOpenRequest).toBe(true);
        expect(swapRequest.reason).toBe('Family emergency');
        expect(swapRequest.declinedByUserIds).toEqual([]);
      });

      it('should sanitize user content in reason', async () => {
        const swapRequest = await requestShiftSwap({
          shiftId: shiftA.id,
          requesterId: userA.id,
          reason: '<script>alert("xss")</script>Need help',
          isOpenRequest: true,
        });

        expect(swapRequest.reason).not.toContain('<script>');
      });

      it('should allow optional reason', async () => {
        const swapRequest = await requestShiftSwap({
          shiftId: shiftA.id,
          requesterId: userA.id,
          isOpenRequest: true,
        });

        expect(swapRequest.reason).toBeUndefined();
      });
    });

    describe('Direct Swap Proposals', () => {
      it('should create a direct swap proposal with specific user', async () => {
        const swapRequest = await requestShiftSwap({
          shiftId: shiftA.id,
          requesterId: userA.id,
          proposedToUserId: userB.id,
          isOpenRequest: false,
        });

        expect(swapRequest.proposedToUserId).toBe(userB.id);
        expect(swapRequest.isOpenRequest).toBe(false);
      });

      it('should create a direct swap proposal with specific shift', async () => {
        const swapRequest = await requestShiftSwap({
          shiftId: shiftA.id,
          requesterId: userA.id,
          proposedToUserId: userB.id,
          proposedShiftId: shiftB.id,
          isOpenRequest: false,
        });

        expect(swapRequest.proposedToUserId).toBe(userB.id);
        expect(swapRequest.proposedShiftId).toBe(shiftB.id);
      });

      it('should reject swap proposal with self', async () => {
        await expect(
          requestShiftSwap({
            shiftId: shiftA.id,
            requesterId: userA.id,
            proposedToUserId: userA.id,
            isOpenRequest: false,
          })
        ).rejects.toThrow('Cannot propose a swap with yourself');
      });

      it('should validate proposed user is on proposed shift', async () => {
        await expect(
          requestShiftSwap({
            shiftId: shiftA.id,
            requesterId: userA.id,
            proposedToUserId: userC.id,
            proposedShiftId: shiftB.id, // userC is not on shiftB
            isOpenRequest: false,
          })
        ).rejects.toThrow('Proposed user is not signed up for the proposed shift');
      });

      it('should reject swap with completed shift', async () => {
        // Mark shiftB as completed
        await db.updateVolunteerShift(shiftB.id, { status: 'completed' });

        await expect(
          requestShiftSwap({
            shiftId: shiftA.id,
            requesterId: userA.id,
            proposedToUserId: userB.id,
            proposedShiftId: shiftB.id,
            isOpenRequest: false,
          })
        ).rejects.toThrow('Cannot swap with a completed or cancelled shift');
      });
    });

    describe('Validation', () => {
      it('should reject invalid shift ID', async () => {
        await expect(
          requestShiftSwap({
            shiftId: 'non-existent-shift',
            requesterId: userA.id,
            isOpenRequest: true,
          })
        ).rejects.toThrow('Volunteer shift not found');
      });

      it('should reject if requester is not on the shift', async () => {
        await expect(
          requestShiftSwap({
            shiftId: shiftA.id,
            requesterId: userB.id, // Not signed up for shiftA
            isOpenRequest: true,
          })
        ).rejects.toThrow('You must be signed up for this shift to request a swap');
      });

      it('should reject swap of completed shift', async () => {
        await db.updateVolunteerShift(shiftA.id, { status: 'completed' });

        await expect(
          requestShiftSwap({
            shiftId: shiftA.id,
            requesterId: userA.id,
            isOpenRequest: true,
          })
        ).rejects.toThrow('Cannot swap a completed shift');
      });

      it('should reject swap of cancelled shift', async () => {
        await db.updateVolunteerShift(shiftA.id, { status: 'cancelled' });

        await expect(
          requestShiftSwap({
            shiftId: shiftA.id,
            requesterId: userA.id,
            isOpenRequest: true,
          })
        ).rejects.toThrow('Cannot swap a cancelled shift');
      });

      it('should reject duplicate pending swap request', async () => {
        await requestShiftSwap({
          shiftId: shiftA.id,
          requesterId: userA.id,
          isOpenRequest: true,
        });

        await expect(
          requestShiftSwap({
            shiftId: shiftA.id,
            requesterId: userA.id,
            isOpenRequest: true,
          })
        ).rejects.toThrow('You already have a pending swap request for this shift');
      });
    });
  });

  describe('acceptShiftSwap', () => {
    it('should accept an open coverage request', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await acceptShiftSwap(swapRequest.id, userB.id);

      // Check swap request status
      const updatedRequest = db.getShiftSwapRequest(swapRequest.id);
      expect(updatedRequest?.status).toBe('completed');
      expect(updatedRequest?.acceptedByUserId).toBe(userB.id);

      // Check shift volunteer assignments
      const updatedShift = db.getVolunteerShift(shiftA.id);
      expect(updatedShift?.volunteersSignedUp).not.toContain(userA.id);
      expect(updatedShift?.volunteersSignedUp).toContain(userB.id);
    });

    it('should perform a direct swap between two shifts', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userB.id,
        proposedShiftId: shiftB.id,
        isOpenRequest: false,
      });

      await acceptShiftSwap(swapRequest.id, userB.id);

      // Check shiftA now has userB
      const updatedShiftA = db.getVolunteerShift(shiftA.id);
      expect(updatedShiftA?.volunteersSignedUp).not.toContain(userA.id);
      expect(updatedShiftA?.volunteersSignedUp).toContain(userB.id);

      // Check shiftB now has userA
      const updatedShiftB = db.getVolunteerShift(shiftB.id);
      expect(updatedShiftB?.volunteersSignedUp).not.toContain(userB.id);
      expect(updatedShiftB?.volunteersSignedUp).toContain(userA.id);
    });

    it('should handle role-based swaps', async () => {
      // Create shift with roles
      const shiftWithRoles = await db.addVolunteerShift({
        title: 'Shift with Roles',
        description: 'Test',
        category: 'food-security',
        shiftDate: Date.now() + 86400000,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { type: 'physical', name: 'Garden' },
        volunteersNeeded: 2,
        volunteersSignedUp: [userA.id],
        status: 'open',
        roles: [
          {
            name: 'Lead Gardener',
            volunteersNeeded: 1,
            volunteersAssigned: [userA.id],
          },
        ],
      });

      const swapRequest = await requestShiftSwap({
        shiftId: shiftWithRoles.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await acceptShiftSwap(swapRequest.id, userB.id);

      const updatedShift = db.getVolunteerShift(shiftWithRoles.id);
      expect(updatedShift?.roles?.[0].volunteersAssigned).not.toContain(userA.id);
      expect(updatedShift?.roles?.[0].volunteersAssigned).toContain(userB.id);
    });

    it('should reject accepting non-existent swap', async () => {
      await expect(
        acceptShiftSwap('non-existent-swap', userB.id)
      ).rejects.toThrow('Swap request not found');
    });

    it('should reject accepting non-pending swap', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await db.updateShiftSwapRequest(swapRequest.id, { status: 'declined' });

      await expect(
        acceptShiftSwap(swapRequest.id, userB.id)
      ).rejects.toThrow('This swap request is no longer pending');
    });

    it('should reject accepting own swap request', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await expect(
        acceptShiftSwap(swapRequest.id, userA.id)
      ).rejects.toThrow('Cannot accept your own swap request');
    });

    it('should reject non-proposed user accepting direct swap', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userB.id,
        isOpenRequest: false,
      });

      await expect(
        acceptShiftSwap(swapRequest.id, userC.id)
      ).rejects.toThrow('This swap was proposed to a specific person');
    });

    it('should reject if accepting user not on proposed shift', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userC.id,
        proposedShiftId: shiftC.id,
        isOpenRequest: false,
      });

      // Add userB to shiftA so they're a valid volunteer, but not on proposed shiftC
      await db.update((doc) => {
        doc.volunteerShifts[shiftA.id].volunteersSignedUp.push(userB.id);
      });

      // UserB tries to accept but they're not on shiftC
      await expect(
        acceptShiftSwap(swapRequest.id, userB.id)
      ).rejects.toThrow(); // Will fail because userB is not the proposed user
    });
  });

  describe('declineShiftSwap', () => {
    it('should decline a direct swap proposal', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userB.id,
        isOpenRequest: false,
      });

      await declineShiftSwap(swapRequest.id, userB.id);

      const updatedRequest = db.getShiftSwapRequest(swapRequest.id);
      expect(updatedRequest?.status).toBe('declined');
    });

    it('should track declines for open requests', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await declineShiftSwap(swapRequest.id, userB.id);
      await declineShiftSwap(swapRequest.id, userC.id);

      const updatedRequest = db.getShiftSwapRequest(swapRequest.id);
      expect(updatedRequest?.status).toBe('pending'); // Still pending for others
      expect(updatedRequest?.declinedByUserIds).toContain(userB.id);
      expect(updatedRequest?.declinedByUserIds).toContain(userC.id);
    });

    it('should reject declining non-existent swap', async () => {
      await expect(
        declineShiftSwap('non-existent-swap', userB.id)
      ).rejects.toThrow('Swap request not found');
    });

    it('should reject declining non-pending swap', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userB.id,
        isOpenRequest: false,
      });

      await db.updateShiftSwapRequest(swapRequest.id, { status: 'accepted' });

      await expect(
        declineShiftSwap(swapRequest.id, userB.id)
      ).rejects.toThrow('This swap request is no longer pending');
    });

    it('should reject wrong user declining direct proposal', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userB.id,
        isOpenRequest: false,
      });

      await expect(
        declineShiftSwap(swapRequest.id, userC.id)
      ).rejects.toThrow('You cannot decline a swap that was not proposed to you');
    });
  });

  describe('cancelShiftSwap', () => {
    it('should allow requester to cancel their swap request', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await cancelShiftSwap(swapRequest.id, userA.id);

      const updatedRequest = db.getShiftSwapRequest(swapRequest.id);
      expect(updatedRequest?.status).toBe('cancelled');
      expect(updatedRequest?.cancelledAt).toBeDefined();
    });

    it('should reject non-requester cancelling', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await expect(
        cancelShiftSwap(swapRequest.id, userB.id)
      ).rejects.toThrow('Only the requester can cancel this swap request');
    });

    it('should reject cancelling non-pending swap', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await db.updateShiftSwapRequest(swapRequest.id, { status: 'accepted' });

      await expect(
        cancelShiftSwap(swapRequest.id, userA.id)
      ).rejects.toThrow('Can only cancel pending swap requests');
    });
  });

  describe('findPotentialSwapPartners', () => {
    beforeEach(async () => {
      // Ensure clean state for findPotentialSwapPartners tests
      await db.init();
      await db.reset();

      // Re-create users and shifts for this describe block
      userA = await db.addUserProfile({
        displayName: 'User A',
        bio: 'Test user A',
      });

      userB = await db.addUserProfile({
        displayName: 'User B',
        bio: 'Test user B',
      });

      userC = await db.addUserProfile({
        displayName: 'User C',
        bio: 'Test user C',
      });

      shiftA = await db.addVolunteerShift({
        title: 'Community Garden Shift A',
        description: 'Help with watering',
        category: 'food-security',
        shiftDate: Date.now() + 86400000,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: {
          type: 'physical',
          name: 'Community Garden',
          address: '123 Garden St',
        },
        volunteersNeeded: 3,
        volunteersSignedUp: [userA.id],
        status: 'open',
      });

      shiftB = await db.addVolunteerShift({
        title: 'Community Garden Shift B',
        description: 'Help with planting',
        category: 'food-security',
        shiftDate: Date.now() + 172800000,
        shiftTime: { startTime: '14:00', endTime: '17:00' },
        location: {
          type: 'physical',
          name: 'Community Garden',
          address: '123 Garden St',
        },
        volunteersNeeded: 3,
        volunteersSignedUp: [userB.id],
        status: 'open',
      });

      shiftC = await db.addVolunteerShift({
        title: 'Different Category Shift',
        description: 'Different work',
        category: 'education',
        shiftDate: Date.now() + 259200000,
        shiftTime: { startTime: '10:00', endTime: '13:00' },
        location: {
          type: 'physical',
          name: 'Library',
          address: '456 Library Ave',
        },
        volunteersNeeded: 2,
        volunteersSignedUp: [userC.id],
        status: 'open',
      });
    });

    it('should find shifts in same category with volunteers', async () => {
      const partners = findPotentialSwapPartners(shiftA.id, userA.id);

      expect(partners).toHaveLength(1);
      expect(partners[0].id).toBe(shiftB.id);
      expect(partners[0].category).toBe('food-security');
    });

    it('should exclude shifts user is already on', async () => {
      // Add userA to shiftB
      await db.update((doc) => {
        doc.volunteerShifts[shiftB.id].volunteersSignedUp.push(userA.id);
      });

      const partners = findPotentialSwapPartners(shiftA.id, userA.id);

      expect(partners).toHaveLength(0);
    });

    it('should exclude completed and cancelled shifts', async () => {
      await db.updateVolunteerShift(shiftB.id, { status: 'completed' });

      const partners = findPotentialSwapPartners(shiftA.id, userA.id);

      expect(partners).toHaveLength(0);
    });

    it('should exclude shifts with no volunteers', async () => {
      // Create empty shift
      const emptyShift = await db.addVolunteerShift({
        title: 'Empty Shift',
        description: 'No volunteers',
        category: 'food-security',
        shiftDate: Date.now() + 86400000,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { type: 'physical', name: 'Garden' },
        volunteersNeeded: 3,
        volunteersSignedUp: [],
        status: 'open',
      });

      const partners = findPotentialSwapPartners(shiftA.id, userA.id);

      expect(partners.find(s => s.id === emptyShift.id)).toBeUndefined();
    });

    it('should sort by date', async () => {
      // Create future shift
      const futureShift = await db.addVolunteerShift({
        title: 'Future Shift',
        description: 'Far away',
        category: 'food-security',
        shiftDate: Date.now() + 604800000, // 7 days from now
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: { type: 'physical', name: 'Garden' },
        volunteersNeeded: 2,
        volunteersSignedUp: [userC.id],
        status: 'open',
      });

      const partners = findPotentialSwapPartners(shiftA.id, userA.id);

      expect(partners[0].id).toBe(shiftB.id); // Sooner
      expect(partners[1].id).toBe(futureShift.id); // Later
    });

    it('should return empty array for invalid inputs', () => {
      // Test with malformed IDs (containing invalid characters)
      expect(findPotentialSwapPartners('../../../etc/passwd', userA.id)).toEqual([]);
      expect(findPotentialSwapPartners(shiftA.id, '<script>alert(1)</script>')).toEqual([]);
      // Test with non-existent but valid format ID
      expect(findPotentialSwapPartners('non-existent-shift-id', userA.id)).toEqual([]);
    });
  });

  describe('Query Functions', () => {
    beforeEach(async () => {
      // Ensure clean state for query tests
      await db.init();
      await db.reset();

      // Re-create users and shifts for this describe block
      userA = await db.addUserProfile({
        displayName: 'User A',
        bio: 'Test user A',
      });

      userB = await db.addUserProfile({
        displayName: 'User B',
        bio: 'Test user B',
      });

      userC = await db.addUserProfile({
        displayName: 'User C',
        bio: 'Test user C',
      });

      shiftA = await db.addVolunteerShift({
        title: 'Community Garden Shift A',
        description: 'Help with watering',
        category: 'food-security',
        shiftDate: Date.now() + 86400000,
        shiftTime: { startTime: '09:00', endTime: '12:00' },
        location: {
          type: 'physical',
          name: 'Community Garden',
          address: '123 Garden St',
        },
        volunteersNeeded: 3,
        volunteersSignedUp: [userA.id],
        status: 'open',
      });

      shiftB = await db.addVolunteerShift({
        title: 'Community Garden Shift B',
        description: 'Help with planting',
        category: 'food-security',
        shiftDate: Date.now() + 172800000,
        shiftTime: { startTime: '14:00', endTime: '17:00' },
        location: {
          type: 'physical',
          name: 'Community Garden',
          address: '123 Garden St',
        },
        volunteersNeeded: 3,
        volunteersSignedUp: [userB.id],
        status: 'open',
      });

      shiftC = await db.addVolunteerShift({
        title: 'Different Category Shift',
        description: 'Different work',
        category: 'education',
        shiftDate: Date.now() + 259200000,
        shiftTime: { startTime: '10:00', endTime: '13:00' },
        location: {
          type: 'physical',
          name: 'Library',
          address: '456 Library Ave',
        },
        volunteersNeeded: 2,
        volunteersSignedUp: [userC.id],
        status: 'open',
      });
    });

    it('should get swap request by ID', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      const retrieved = getShiftSwapRequest(swapRequest.id);
      expect(retrieved?.id).toBe(swapRequest.id);
    });

    it('should browse open swap requests', async () => {
      await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      await requestShiftSwap({
        shiftId: shiftB.id,
        requesterId: userB.id,
        proposedToUserId: userC.id,
        isOpenRequest: false, // Not open
      });

      const openRequests = browseOpenSwapRequests();
      expect(openRequests).toHaveLength(1);
      expect(openRequests[0].isOpenRequest).toBe(true);
    });

    it('should get user swap requests', async () => {
      await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      const myRequests = getMySwapRequests(userA.id);
      expect(myRequests).toHaveLength(1);
      expect(myRequests[0].requesterId).toBe(userA.id);
    });

    it('should get swap requests proposed to user', async () => {
      await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userB.id,
        isOpenRequest: false,
      });

      const proposedToMe = getSwapRequestsProposedToMe(userB.id);
      expect(proposedToMe).toHaveLength(1);
      expect(proposedToMe[0].proposedToUserId).toBe(userB.id);
    });
  });

  describe('formatSwapRequestForDisplay', () => {
    it('should format open coverage request', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        reason: 'Need help',
        isOpenRequest: true,
      });

      const formatted = formatSwapRequestForDisplay(swapRequest);

      expect(formatted).toContain('Community Garden Shift A');
      expect(formatted).toContain('Open coverage request');
      expect(formatted).toContain('Need help');
    });

    it('should format direct swap proposal', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userB.id,
        proposedShiftId: shiftB.id,
        isOpenRequest: false,
      });

      const formatted = formatSwapRequestForDisplay(swapRequest);

      expect(formatted).toContain('Community Garden Shift A');
      expect(formatted).toContain('Direct swap proposal');
      expect(formatted).toContain('Community Garden Shift B');
    });

    it('should show status emoji', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      const formatted = formatSwapRequestForDisplay(swapRequest);
      expect(formatted).toContain('⏳'); // Pending emoji
    });

    it('should handle missing shift gracefully', () => {
      const formatted = formatSwapRequestForDisplay({
        id: 'test',
        shiftId: 'non-existent',
        requesterId: userA.id,
        status: 'pending',
        isOpenRequest: true,
        declinedByUserIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      expect(formatted).toBe('Shift not found');
    });
  });

  describe('Automerge Compatibility', () => {
    it('should not create undefined values', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
        // No reason provided
      });

      // Check that reason is truly absent, not undefined
      const doc = db.getDoc();
      const storedRequest = doc.shiftSwapRequests[swapRequest.id];
      expect('reason' in storedRequest).toBe(false);
    });

    it('should use array operations correctly', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        isOpenRequest: true,
      });

      // Decline with multiple users
      await declineShiftSwap(swapRequest.id, userB.id);
      await declineShiftSwap(swapRequest.id, userC.id);

      const updated = db.getShiftSwapRequest(swapRequest.id);
      expect(updated?.declinedByUserIds).toHaveLength(2);
    });
  });

  describe('Security', () => {
    it('should sanitize XSS in reason', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        reason: '<img src=x onerror=alert(1)>',
        isOpenRequest: true,
      });

      // sanitizeUserContent() HTML-encodes dangerous content
      // The HTML tags should be encoded, preventing script execution
      expect(swapRequest.reason).not.toContain('<img');
      expect(swapRequest.reason).not.toContain('>');
      // It should be HTML-encoded
      expect(swapRequest.reason).toContain('&lt;');
      expect(swapRequest.reason).toContain('&gt;');
      // The text content is preserved but HTML is neutered so it can't execute
      expect(swapRequest.reason).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('should validate all IDs', async () => {
      await expect(
        requestShiftSwap({
          shiftId: '../../../etc/passwd',
          requesterId: userA.id,
          isOpenRequest: true,
        })
      ).rejects.toThrow();
    });

    it('should prevent unauthorized swap acceptance', async () => {
      const swapRequest = await requestShiftSwap({
        shiftId: shiftA.id,
        requesterId: userA.id,
        proposedToUserId: userB.id,
        isOpenRequest: false,
      });

      await expect(
        acceptShiftSwap(swapRequest.id, userC.id)
      ).rejects.toThrow();
    });
  });
});
