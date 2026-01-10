/**
 * Shift Swapping and Coverage - Phase 3, Group B
 * REQ-GOV-019B: Shift Swapping and Coverage
 *
 * Enables members to easily swap shifts, find coverage, or transfer
 * responsibilities when conflicts arise.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Life happens - flexible, not punitive
 * - Community support - helping each other maintain commitments
 * - Offline-first - works without internet connection
 * - Gift economy - no penalties for needing help
 */

import { db } from '../core/database';
import type { ShiftSwapRequest, VolunteerShift } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

/**
 * Options for requesting a shift swap
 */
export interface RequestShiftSwapOptions {
  shiftId: string;
  requesterId: string;
  reason?: string;

  // For direct swap proposal
  proposedToUserId?: string;
  proposedShiftId?: string;

  // For open coverage request
  isOpenRequest: boolean;
}

/**
 * Request a shift swap or coverage
 * REQ-GOV-019B: Member requests to swap or find coverage scenario
 */
export async function requestShiftSwap(options: RequestShiftSwapOptions): Promise<ShiftSwapRequest> {
  // Validate required fields
  requireValidIdentifier(options.shiftId, 'Shift ID');
  requireValidIdentifier(options.requesterId, 'Requester ID');

  // Validate shift exists
  const shift = db.getVolunteerShift(options.shiftId);
  if (!shift) {
    throw new Error('Volunteer shift not found');
  }

  // Validate requester is signed up for the shift
  if (!shift.volunteersSignedUp.includes(options.requesterId)) {
    throw new Error('You must be signed up for this shift to request a swap');
  }

  // Validate shift is not already completed or cancelled
  if (shift.status === 'completed') {
    throw new Error('Cannot swap a completed shift');
  }

  if (shift.status === 'cancelled') {
    throw new Error('Cannot swap a cancelled shift');
  }

  // Check for existing pending swap requests for this shift by this user
  const existingRequests = db.getPendingSwapRequestsForShift(options.shiftId)
    .filter(req => req.requesterId === options.requesterId);

  if (existingRequests.length > 0) {
    throw new Error('You already have a pending swap request for this shift');
  }

  // Validate direct swap proposal if provided
  if (options.proposedToUserId) {
    requireValidIdentifier(options.proposedToUserId, 'Proposed user ID');

    if (options.proposedToUserId === options.requesterId) {
      throw new Error('Cannot propose a swap with yourself');
    }

    // If a specific shift is proposed, validate it
    if (options.proposedShiftId) {
      requireValidIdentifier(options.proposedShiftId, 'Proposed shift ID');

      const proposedShift = db.getVolunteerShift(options.proposedShiftId);
      if (!proposedShift) {
        throw new Error('Proposed shift not found');
      }

      if (!proposedShift.volunteersSignedUp.includes(options.proposedToUserId)) {
        throw new Error('Proposed user is not signed up for the proposed shift');
      }

      if (proposedShift.status === 'completed' || proposedShift.status === 'cancelled') {
        throw new Error('Cannot swap with a completed or cancelled shift');
      }
    }
  }

  // Sanitize user content
  const sanitizedReason = options.reason ? sanitizeUserContent(options.reason.trim()) : undefined;

  // Build swap request object
  const requestData: Omit<ShiftSwapRequest, 'id' | 'createdAt' | 'updatedAt'> = {
    shiftId: options.shiftId,
    requesterId: options.requesterId,
    status: 'pending',
    isOpenRequest: options.isOpenRequest,
    declinedByUserIds: [],
    ...(sanitizedReason && { reason: sanitizedReason }),
    ...(options.proposedToUserId && { proposedToUserId: options.proposedToUserId }),
    ...(options.proposedShiftId && { proposedShiftId: options.proposedShiftId }),
  };

  try {
    const swapRequest = await db.addShiftSwapRequest(requestData);
    return swapRequest;
  } catch (error) {
    console.error('Failed to create shift swap request:', error);
    throw new Error(`Could not create shift swap request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Accept a shift swap request
 * REQ-GOV-019B: Enable direct swap proposals scenario
 */
export async function acceptShiftSwap(swapRequestId: string, acceptingUserId: string): Promise<void> {
  requireValidIdentifier(swapRequestId, 'Swap request ID');
  requireValidIdentifier(acceptingUserId, 'Accepting user ID');

  const swapRequest = db.getShiftSwapRequest(swapRequestId);
  if (!swapRequest) {
    throw new Error('Swap request not found');
  }

  if (swapRequest.status !== 'pending') {
    throw new Error('This swap request is no longer pending');
  }

  // Validate the accepting user is eligible
  if (swapRequest.proposedToUserId && swapRequest.proposedToUserId !== acceptingUserId) {
    throw new Error('This swap was proposed to a specific person');
  }

  if (swapRequest.requesterId === acceptingUserId) {
    throw new Error('Cannot accept your own swap request');
  }

  // Get the shift being swapped
  const shift = db.getVolunteerShift(swapRequest.shiftId);
  if (!shift) {
    throw new Error('Shift not found');
  }

  // For direct swaps with a proposed shift, validate the accepting user is on that shift
  if (swapRequest.proposedShiftId) {
    const proposedShift = db.getVolunteerShift(swapRequest.proposedShiftId);
    if (!proposedShift) {
      throw new Error('Proposed shift not found');
    }

    if (!proposedShift.volunteersSignedUp.includes(acceptingUserId)) {
      throw new Error('You are not signed up for the proposed shift');
    }
  }

  // Update swap request status
  await db.updateShiftSwapRequest(swapRequestId, {
    status: 'accepted',
    acceptedByUserId: acceptingUserId,
    acceptedAt: Date.now(),
  });

  // Perform the actual swap in the database
  // This is Automerge-safe by using update() with direct array operations
  await db.update((doc) => {
    const docShift = doc.volunteerShifts[swapRequest.shiftId];
    if (!docShift) return;

    // Remove requester from the shift
    const requesterIndex = docShift.volunteersSignedUp.indexOf(swapRequest.requesterId);
    if (requesterIndex >= 0) {
      docShift.volunteersSignedUp.splice(requesterIndex, 1);
    }

    // Add accepting user to the shift
    if (!docShift.volunteersSignedUp.includes(acceptingUserId)) {
      docShift.volunteersSignedUp.push(acceptingUserId);
    }

    // Handle role-based swaps if applicable
    if (docShift.roles) {
      for (const role of docShift.roles) {
        const roleRequesterIndex = role.volunteersAssigned.indexOf(swapRequest.requesterId);
        if (roleRequesterIndex >= 0) {
          role.volunteersAssigned.splice(roleRequesterIndex, 1);
          if (!role.volunteersAssigned.includes(acceptingUserId)) {
            role.volunteersAssigned.push(acceptingUserId);
          }
        }
      }
    }

    docShift.updatedAt = Date.now();

    // If there was a proposed shift, do the reverse swap
    if (swapRequest.proposedShiftId) {
      const docProposedShift = doc.volunteerShifts[swapRequest.proposedShiftId];
      if (docProposedShift) {
        // Remove accepting user from proposed shift
        const acceptorIndex = docProposedShift.volunteersSignedUp.indexOf(acceptingUserId);
        if (acceptorIndex >= 0) {
          docProposedShift.volunteersSignedUp.splice(acceptorIndex, 1);
        }

        // Add requester to proposed shift
        if (!docProposedShift.volunteersSignedUp.includes(swapRequest.requesterId)) {
          docProposedShift.volunteersSignedUp.push(swapRequest.requesterId);
        }

        // Handle role-based swaps for proposed shift
        if (docProposedShift.roles) {
          for (const role of docProposedShift.roles) {
            const roleAcceptorIndex = role.volunteersAssigned.indexOf(acceptingUserId);
            if (roleAcceptorIndex >= 0) {
              role.volunteersAssigned.splice(roleAcceptorIndex, 1);
              if (!role.volunteersAssigned.includes(swapRequest.requesterId)) {
                role.volunteersAssigned.push(swapRequest.requesterId);
              }
            }
          }
        }

        docProposedShift.updatedAt = Date.now();
      }
    }
  });

  // Mark swap as completed
  await db.updateShiftSwapRequest(swapRequestId, {
    status: 'completed',
    completedAt: Date.now(),
  });
}

/**
 * Decline a shift swap request
 * REQ-GOV-019B: Members can decline swap proposals
 */
export async function declineShiftSwap(swapRequestId: string, decliningUserId: string): Promise<void> {
  requireValidIdentifier(swapRequestId, 'Swap request ID');
  requireValidIdentifier(decliningUserId, 'Declining user ID');

  const swapRequest = db.getShiftSwapRequest(swapRequestId);
  if (!swapRequest) {
    throw new Error('Swap request not found');
  }

  if (swapRequest.status !== 'pending') {
    throw new Error('This swap request is no longer pending');
  }

  // Only the person it was proposed to can decline it
  if (swapRequest.proposedToUserId && swapRequest.proposedToUserId !== decliningUserId) {
    throw new Error('You cannot decline a swap that was not proposed to you');
  }

  // For open requests, track who declined
  if (swapRequest.isOpenRequest) {
    await db.update((doc) => {
      const request = doc.shiftSwapRequests[swapRequestId];
      if (request && !request.declinedByUserIds.includes(decliningUserId)) {
        request.declinedByUserIds.push(decliningUserId);
        request.updatedAt = Date.now();
      }
    });
  } else {
    // For direct proposals, mark as declined
    await db.updateShiftSwapRequest(swapRequestId, {
      status: 'declined',
    });
  }
}

/**
 * Cancel a shift swap request (by the requester)
 * REQ-GOV-019B: Requester can cancel their request
 */
export async function cancelShiftSwap(swapRequestId: string, requesterId: string): Promise<void> {
  requireValidIdentifier(swapRequestId, 'Swap request ID');
  requireValidIdentifier(requesterId, 'Requester ID');

  const swapRequest = db.getShiftSwapRequest(swapRequestId);
  if (!swapRequest) {
    throw new Error('Swap request not found');
  }

  if (swapRequest.requesterId !== requesterId) {
    throw new Error('Only the requester can cancel this swap request');
  }

  if (swapRequest.status !== 'pending') {
    throw new Error('Can only cancel pending swap requests');
  }

  await db.updateShiftSwapRequest(swapRequestId, {
    status: 'cancelled',
    cancelledAt: Date.now(),
  });
}

/**
 * Find potential swap partners for a shift
 * Helps users find others who might be willing to swap
 */
export function findPotentialSwapPartners(shiftId: string, requesterId: string): VolunteerShift[] {
  if (!validateIdentifier(shiftId) || !validateIdentifier(requesterId)) {
    return [];
  }

  const requestedShift = db.getVolunteerShift(shiftId);
  if (!requestedShift) {
    return [];
  }

  // Find shifts where:
  // 1. The requester is NOT already signed up
  // 2. The shift is in the same category (similar work)
  // 3. The shift is open or has space
  // 4. The shift is not completed or cancelled
  const allShifts = db.listVolunteerShifts();

  return allShifts
    .filter(shift => {
      // Not the same shift
      if (shift.id === shiftId) return false;

      // Not completed or cancelled
      if (shift.status === 'completed' || shift.status === 'cancelled') return false;

      // Requester is not already signed up
      if (shift.volunteersSignedUp.includes(requesterId)) return false;

      // Same category (similar work)
      if (shift.category !== requestedShift.category) return false;

      // Has volunteers signed up (potential swap partners)
      if (shift.volunteersSignedUp.length === 0) return false;

      return true;
    })
    .sort((a, b) => a.shiftDate - b.shiftDate);
}

/**
 * Get swap request by ID
 */
export function getShiftSwapRequest(swapRequestId: string): ShiftSwapRequest | undefined {
  if (!validateIdentifier(swapRequestId)) {
    return undefined;
  }
  return db.getShiftSwapRequest(swapRequestId);
}

/**
 * Get all open swap requests (coverage requests available for anyone)
 */
export function browseOpenSwapRequests(): ShiftSwapRequest[] {
  return db.getOpenSwapRequests();
}

/**
 * Get swap requests for a user (ones they created)
 */
export function getMySwapRequests(userId: string): ShiftSwapRequest[] {
  if (!validateIdentifier(userId)) {
    return [];
  }
  return db.getSwapRequestsByUser(userId);
}

/**
 * Get swap requests proposed to a user
 */
export function getSwapRequestsProposedToMe(userId: string): ShiftSwapRequest[] {
  if (!validateIdentifier(userId)) {
    return [];
  }
  return db.getSwapRequestsProposedToUser(userId);
}

/**
 * Format shift swap request for display
 */
export function formatSwapRequestForDisplay(swapRequest: ShiftSwapRequest): string {
  const shift = db.getVolunteerShift(swapRequest.shiftId);
  if (!shift) {
    return 'Shift not found';
  }

  const statusEmoji = {
    'pending': '⏳',
    'accepted': '✅',
    'declined': '❌',
    'cancelled': '🚫',
    'completed': '✨',
  }[swapRequest.status];

  const date = new Date(shift.shiftDate).toLocaleDateString();
  const timeStr = `${shift.shiftTime.startTime}-${shift.shiftTime.endTime}`;

  let swapType = '';
  if (swapRequest.isOpenRequest) {
    swapType = '📢 Open coverage request (anyone can help)';
  } else if (swapRequest.proposedToUserId) {
    swapType = '🤝 Direct swap proposal';
    if (swapRequest.proposedShiftId) {
      const proposedShift = db.getVolunteerShift(swapRequest.proposedShiftId);
      if (proposedShift) {
        const proposedDate = new Date(proposedShift.shiftDate).toLocaleDateString();
        const proposedTimeStr = `${proposedShift.shiftTime.startTime}-${proposedShift.shiftTime.endTime}`;
        swapType += `\n   In exchange for: ${proposedShift.title} on ${proposedDate} at ${proposedTimeStr}`;
      }
    }
  }

  return `
${statusEmoji} Swap Request for: ${shift.title}
📅 ${date} at ${timeStr}
📍 ${shift.location.name}
${swapType}
${swapRequest.reason ? `💭 Reason: ${swapRequest.reason}` : ''}
${swapRequest.acceptedByUserId ? `✅ Accepted by user ${swapRequest.acceptedByUserId}` : ''}
  `.trim();
}
