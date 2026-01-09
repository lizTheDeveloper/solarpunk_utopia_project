/**
 * Need Response System
 * Phase 2, Group C: Open Requests & Needs - Respond to needs
 *
 * Implements the ability for community members to respond to posted needs.
 * This is a core feature of mutual aid - seeing what others need and offering help.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - No money, no crypto, no tokens - pure gift economy
 * - No tracking or surveillance - privacy-preserving by default
 * - Offline-first - works without internet connection
 * - Community care - building bonds through mutual aid
 * - Liberation Rating: ✊✊✊✊ (high - enables direct mutual aid)
 * - Joy Rating: 🌻🌻🌻🌻🌻 (highest - helping others brings joy!)
 */

import { db } from '../core/database';
import type { Need, EconomicEvent, Resource } from '../types';
import { sanitizeUserContent, validateIdentifier } from '../utils/sanitize';

/**
 * Response to a need - can offer resources, skills, or general help
 */
export interface NeedResponse {
  id: string;
  needId: string;
  responderId: string;
  responseType: 'offer-resource' | 'offer-skill' | 'offer-help' | 'already-fulfilled';
  resourceId?: string; // If offering a specific resource
  skillId?: string; // If offering a specific skill
  message: string; // How they want to help
  createdAt: number;
}

/**
 * Respond to a community need with an offer of help
 *
 * This is the heart of mutual aid - seeing what someone needs and offering to help.
 * No money, no debt, no obligation - just community members helping each other.
 *
 * @param userId - The person responding (offering help)
 * @param needId - The need they're responding to
 * @param message - How they want to help
 * @param options - Optional resource or skill they're offering
 */
export async function respondToNeed(
  userId: string,
  needId: string,
  message: string,
  options?: {
    resourceId?: string; // If offering a specific resource
    skillId?: string; // If offering a specific skill
    responseType?: 'offer-resource' | 'offer-skill' | 'offer-help' | 'already-fulfilled';
  }
): Promise<{
  success: boolean;
  response?: NeedResponse;
  error?: string;
}> {
  // Validate inputs
  if (!validateIdentifier(userId)) {
    return {
      success: false,
      error: 'Invalid user ID',
    };
  }

  if (!validateIdentifier(needId)) {
    return {
      success: false,
      error: 'Invalid need ID',
    };
  }

  if (!message || message.trim().length === 0) {
    return {
      success: false,
      error: 'Response message is required',
    };
  }

  // Get the need from the database
  const needs = db.listNeeds();
  const need = needs.find(n => n.id === needId);

  if (!need) {
    return {
      success: false,
      error: 'Need not found',
    };
  }

  // Check if need is already fulfilled
  if (need.fulfilled) {
    return {
      success: false,
      error: 'This need has already been fulfilled',
    };
  }

  // Cannot respond to your own need (though you can mark it fulfilled)
  if (need.userId === userId) {
    return {
      success: false,
      error: 'Cannot respond to your own need. If it\'s been fulfilled, mark it as complete instead.',
    };
  }

  // Determine response type
  let responseType: NeedResponse['responseType'] = options?.responseType || 'offer-help';
  if (options?.resourceId) {
    responseType = 'offer-resource';
  } else if (options?.skillId) {
    responseType = 'offer-skill';
  }

  // Validate resource/skill if provided
  if (options?.resourceId) {
    if (!validateIdentifier(options.resourceId)) {
      return {
        success: false,
        error: 'Invalid resource ID',
      };
    }

    const resource = db.getResource(options.resourceId);
    if (!resource) {
      return {
        success: false,
        error: 'Resource not found',
      };
    }

    if (!resource.available) {
      return {
        success: false,
        error: 'This resource is no longer available',
      };
    }
  }

  if (options?.skillId) {
    if (!validateIdentifier(options.skillId)) {
      return {
        success: false,
        error: 'Invalid skill ID',
      };
    }
    // Note: Skill validation would go here when skills are fully implemented
  }

  // Create the response
  const response: NeedResponse = {
    id: crypto.randomUUID(),
    needId,
    responderId: userId,
    responseType,
    resourceId: options?.resourceId,
    skillId: options?.skillId,
    message: sanitizeUserContent(message.trim()),
    createdAt: Date.now(),
  };

  // Record this as an economic event (mutual aid action)
  // This helps track community vitality without creating debt
  const event: Omit<EconomicEvent, 'id' | 'createdAt'> = {
    action: 'transfer', // Represents offer of help
    providerId: userId, // Person offering help
    receiverId: need.userId, // Person with the need
    resourceId: options?.resourceId || needId, // Link to resource or need
    note: sanitizeUserContent(`Response to need: ${message}`),
  };

  await db.recordEvent(event);

  // Store the response
  // Note: In a full implementation, we'd have a responses collection in the database
  // For now, the economic event serves as the record of the response

  return {
    success: true,
    response,
  };
}

/**
 * Get all responses to a specific need
 *
 * @param needId - The need to get responses for
 * @returns Array of responses (represented as economic events)
 */
export function getNeedResponses(needId: string): Array<{
  event: EconomicEvent;
  responder: any; // Would be UserProfile in full implementation
}> {
  if (!validateIdentifier(needId)) {
    return [];
  }

  // Find the need to get the receiver (person with the need)
  const needs = db.listNeeds();
  const need = needs.find(n => n.id === needId);

  if (!need) {
    return [];
  }

  // Get all transfer events where this person is the receiver
  // and the resource matches the need
  const events = db.listEvents()
    .filter(event =>
      event.receiverId === need.userId &&
      event.action === 'transfer' &&
      (event.resourceId === needId || event.note?.includes(needId))
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return events.map(event => ({
    event,
    responder: db.getUserProfile(event.providerId),
  }));
}

/**
 * Get all needs a user has responded to
 *
 * @param userId - The user who offered help
 * @returns Array of needs they've responded to
 */
export function getMyResponses(userId: string): Array<{
  need: Need | undefined;
  response: EconomicEvent;
}> {
  if (!validateIdentifier(userId)) {
    return [];
  }

  // Get all events where this user was the provider (offering help)
  const events = db.listEvents()
    .filter(event =>
      event.providerId === userId &&
      event.action === 'transfer' &&
      event.note?.includes('Response to need')
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  // Match with needs
  const needs = db.listNeeds();
  return events.map(event => ({
    response: event,
    need: needs.find(n => n.userId === event.receiverId),
  }));
}

/**
 * Mark a need as fulfilled
 * This should be called by the person who posted the need
 *
 * @param needId - The need that was fulfilled
 * @param userId - The person marking it fulfilled (must be the need creator)
 * @param fulfilledBy - Optional ID of the person/people who helped
 * @param gratitudeMessage - Optional message of thanks
 */
export async function markNeedFulfilled(
  needId: string,
  userId: string,
  options?: {
    fulfilledBy?: string[];
    gratitudeMessage?: string;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!validateIdentifier(needId)) {
    return {
      success: false,
      error: 'Invalid need ID',
    };
  }

  if (!validateIdentifier(userId)) {
    return {
      success: false,
      error: 'Invalid user ID',
    };
  }

  const needs = db.listNeeds();
  const need = needs.find(n => n.id === needId);

  if (!need) {
    return {
      success: false,
      error: 'Need not found',
    };
  }

  // Only the person who posted the need can mark it fulfilled
  if (need.userId !== userId) {
    return {
      success: false,
      error: 'Only the person who posted this need can mark it as fulfilled',
    };
  }

  if (need.fulfilled) {
    return {
      success: false,
      error: 'This need is already marked as fulfilled',
    };
  }

  // Mark the need as fulfilled
  await db.updateNeed(needId, {
    fulfilled: true,
    updatedAt: Date.now(),
  });

  // If there's a gratitude message, record it as an event
  // This builds community vitality without creating obligation
  if (options?.gratitudeMessage && options.fulfilledBy && options.fulfilledBy.length > 0) {
    for (const helperId of options.fulfilledBy) {
      if (validateIdentifier(helperId)) {
        await db.recordEvent({
          action: 'transfer',
          providerId: helperId,
          receiverId: userId,
          resourceId: needId,
          note: sanitizeUserContent(`Gratitude: ${options.gratitudeMessage}`),
        });
      }
    }
  }

  return {
    success: true,
  };
}

/**
 * Get needs that are still open (unfulfilled)
 * Optionally filter by urgency level
 *
 * @param options - Filter options
 * @returns Array of unfulfilled needs
 */
export function getOpenNeeds(options?: {
  urgency?: Need['urgency'];
  resourceType?: Need['resourceType'];
  userId?: string; // Get needs from a specific user
}): Need[] {
  let needs = db.listNeeds().filter(n => !n.fulfilled);

  if (options?.urgency) {
    needs = needs.filter(n => n.urgency === options.urgency);
  }

  if (options?.resourceType) {
    needs = needs.filter(n => n.resourceType === options.resourceType);
  }

  if (options?.userId) {
    needs = needs.filter(n => n.userId === options.userId);
  }

  // Sort by urgency (urgent first), then by date (newest first)
  const urgencyOrder = { urgent: 0, needed: 1, helpful: 2, casual: 3 };
  return needs.sort((a, b) => {
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return b.createdAt - a.createdAt;
  });
}

/**
 * Get count of responses to a need
 *
 * @param needId - The need to count responses for
 * @returns Number of responses
 */
export function getResponseCount(needId: string): number {
  return getNeedResponses(needId).length;
}

/**
 * Check if a user has already responded to a need
 *
 * @param userId - The user to check
 * @param needId - The need to check
 * @returns true if user has already responded
 */
export function hasUserResponded(userId: string, needId: string): boolean {
  const responses = getNeedResponses(needId);
  return responses.some(r => r.event.providerId === userId);
}

/**
 * Format a need for display
 *
 * @param need - The need to format
 * @returns Formatted string for display
 */
export function formatNeedForDisplay(need: Need): string {
  const urgencyBadge = {
    urgent: '🚨 URGENT',
    needed: '⚠️ Needed',
    helpful: '💚 Helpful',
    casual: '💬 Casual',
  }[need.urgency];

  const responseCount = getResponseCount(need.id);
  const statusBadge = need.fulfilled ? '✅ Fulfilled' : '🔓 Open';

  return `
${urgencyBadge} ${statusBadge}
${need.description}
${responseCount > 0 ? `💬 ${responseCount} response${responseCount > 1 ? 's' : ''}` : ''}
  `.trim();
}
