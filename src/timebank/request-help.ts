/**
 * Request Help - Time Bank Core
 * REQ-TIME-006: Explicit Time Requests
 * REQ-TIME-008: Emergency and Urgent Needs
 *
 * Enables community members to request help, skills, or time from others
 * in a gift economy framework - no payment, no obligation, just mutual aid.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gift economy - no payment required, just ask
 * - Community support - helping is voluntary, not enforced
 * - Offline-first - works without internet connection
 * - Privacy-preserving - control who sees your requests
 */

import { db } from '../core/database';
import type { HelpSession, TimeRange } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

/**
 * Urgency level for help requests
 * REQ-TIME-008: Emergency and Urgent Needs
 */
export type HelpRequestUrgency = 'routine' | 'soon' | 'urgent' | 'emergency';

/**
 * Options for creating a help request
 */
export interface CreateHelpRequestOptions {
  // Who needs help
  userId: string;

  // What help is needed
  title: string;
  description: string;
  skillCategories?: string[]; // e.g., ["moving", "physical"], ["repair", "plumbing"]
  skillOfferId?: string; // Optional: request specific skill offer

  // When is help needed
  preferredDate?: number; // Unix timestamp for preferred date
  preferredTime?: TimeRange; // Preferred time window
  flexibleTiming?: boolean; // Can the timing be adjusted?
  urgency?: HelpRequestUrgency; // How urgent is this need?

  // Where
  location?: {
    type: 'volunteer-place' | 'recipient-place' | 'community-space' | 'virtual' | 'flexible';
    details?: string;
  };

  // How long / how many people
  estimatedDuration?: number; // in minutes
  helpersNeeded?: number; // Number of volunteers needed (default: 1)

  // Additional context
  materialsProvided?: string[]; // What materials/tools the requester can provide
  materialsNeeded?: string[]; // What the volunteer should bring
  accessibilityInfo?: string; // REQ-TIME-011: Accessibility information
  notes?: string; // Any other important details
}

/**
 * Create a new help request
 * REQ-TIME-006: User requests help moving furniture
 *
 * Creates a HelpSession in 'proposed' status that waits for volunteers to accept
 */
export async function createHelpRequest(options: CreateHelpRequestOptions): Promise<HelpSession> {
  // Validate required fields
  if (!options.title || options.title.trim().length === 0) {
    throw new Error('Help request title is required');
  }

  if (!options.description || options.description.trim().length === 0) {
    throw new Error('Help request description is required');
  }

  requireValidIdentifier(options.userId, 'User ID');

  // Sanitize user-provided content
  const sanitizedTitle = sanitizeUserContent(options.title.trim());
  const sanitizedDescription = sanitizeUserContent(options.description.trim());

  // Determine urgency
  const urgency = options.urgency || 'routine';

  // Build help session object
  // volunteerId starts as empty/placeholder since no volunteer yet
  // Avoid undefined values for Automerge compatibility
  const helpSession: any = {
    volunteerId: '', // Will be filled when someone accepts
    recipientId: options.userId,

    title: sanitizedTitle,
    description: sanitizedDescription,

    // Scheduling - use preferred date/time or set to future if not specified
    scheduledDate: options.preferredDate || Date.now() + 86400000, // Default: tomorrow
    scheduledTime: options.preferredTime || { startTime: '09:00', endTime: '17:00' }, // Default: business hours

    // Location
    location: options.location || { type: 'flexible' },

    // Status - starts as 'proposed' (waiting for volunteer)
    status: urgency === 'emergency' ? 'pending' : 'proposed',
    volunteerConfirmed: false,
    recipientConfirmed: false,

    // Notes and coordination
    notes: buildRequestNotes(options),
  };

  // Add optional fields only if defined (Automerge doesn't allow undefined)
  if (options.skillOfferId) {
    helpSession.skillOfferId = options.skillOfferId;
  }
  if (options.estimatedDuration) {
    helpSession.estimatedDuration = options.estimatedDuration;
  }

  try {
    const savedRequest = await db.addHelpSession(helpSession);

    // TODO: When AI matchmaking is implemented (REQ-TIME-012), notify potential volunteers
    // For now, the request sits in 'proposed' status until someone browses and accepts

    return savedRequest;
  } catch (error) {
    console.error(`Failed to create help request for user ${options.userId}:`, error);
    throw new Error(`Could not create help request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build comprehensive notes for the help request
 */
function buildRequestNotes(options: CreateHelpRequestOptions): string {
  const noteParts: string[] = [];

  if (options.urgency) {
    noteParts.push(`Urgency: ${options.urgency}`);
  }

  if (options.helpersNeeded && options.helpersNeeded > 1) {
    noteParts.push(`Volunteers needed: ${options.helpersNeeded}`);
  }

  if (options.flexibleTiming) {
    noteParts.push('Timing is flexible');
  }

  if (options.skillCategories && options.skillCategories.length > 0) {
    noteParts.push(`Skills: ${options.skillCategories.join(', ')}`);
  }

  if (options.materialsProvided && options.materialsProvided.length > 0) {
    noteParts.push(`Materials provided: ${options.materialsProvided.join(', ')}`);
  }

  if (options.materialsNeeded && options.materialsNeeded.length > 0) {
    noteParts.push(`Please bring: ${options.materialsNeeded.join(', ')}`);
  }

  if (options.accessibilityInfo) {
    noteParts.push(`Accessibility: ${sanitizeUserContent(options.accessibilityInfo)}`);
  }

  if (options.notes) {
    noteParts.push(sanitizeUserContent(options.notes));
  }

  return noteParts.join('\n');
}

/**
 * Update an existing help request
 * (Only allowed if no volunteer has accepted yet)
 */
export async function updateHelpRequest(
  sessionId: string,
  updates: Partial<CreateHelpRequestOptions>
): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');

  // Get existing session to verify it's still in proposed status
  const existingSession = db.getHelpSession(sessionId);
  if (!existingSession) {
    throw new Error('Help request not found');
  }

  // Only allow updates if still proposed (no volunteer assigned)
  if (existingSession.volunteerId && existingSession.volunteerId !== '') {
    throw new Error('Cannot update help request after a volunteer has accepted');
  }

  // Build sanitized updates
  const sessionUpdates: Partial<HelpSession> = {};

  if (updates.title !== undefined) {
    sessionUpdates.title = sanitizeUserContent(updates.title.trim());
  }

  if (updates.description !== undefined) {
    sessionUpdates.description = sanitizeUserContent(updates.description.trim());
  }

  if (updates.preferredDate !== undefined) {
    sessionUpdates.scheduledDate = updates.preferredDate;
  }

  if (updates.preferredTime !== undefined) {
    sessionUpdates.scheduledTime = updates.preferredTime;
  }

  if (updates.estimatedDuration !== undefined) {
    sessionUpdates.estimatedDuration = updates.estimatedDuration;
  }

  if (updates.location !== undefined) {
    sessionUpdates.location = updates.location;
  }

  // Rebuild notes if any note-related fields changed
  const noteFieldsChanged = updates.urgency || updates.helpersNeeded || updates.flexibleTiming ||
    updates.skillCategories || updates.materialsProvided || updates.materialsNeeded ||
    updates.accessibilityInfo || updates.notes;

  if (noteFieldsChanged) {
    // Merge with existing values to rebuild notes
    const mergedOptions: CreateHelpRequestOptions = {
      userId: existingSession.recipientId,
      title: updates.title || existingSession.title,
      description: updates.description || existingSession.description || '',
      ...updates,
    };
    sessionUpdates.notes = buildRequestNotes(mergedOptions);
  }

  try {
    await db.updateHelpSession(sessionId, sessionUpdates);
  } catch (error) {
    console.error(`Failed to update help request ${sessionId}:`, error);
    throw new Error(`Could not update help request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cancel a help request
 * Can be done at any time, with optional reason
 */
export async function cancelHelpRequest(
  sessionId: string,
  userId: string,
  reason?: string
): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');
  requireValidIdentifier(userId, 'User ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    throw new Error('Help request not found');
  }

  // Verify the user is the one who requested help
  if (session.recipientId !== userId) {
    throw new Error('Only the person who requested help can cancel it');
  }

  try {
    await db.updateHelpSession(sessionId, {
      status: 'cancelled',
      cancelledAt: Date.now(),
      cancelledBy: userId,
      cancellationReason: reason ? sanitizeUserContent(reason) : undefined,
    });
  } catch (error) {
    console.error(`Failed to cancel help request ${sessionId}:`, error);
    throw new Error(`Could not cancel help request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all help requests by a specific user
 */
export function getMyHelpRequests(userId: string): HelpSession[] {
  if (!validateIdentifier(userId)) {
    return [];
  }

  return db.getHelpSessionsByRecipient(userId);
}

/**
 * Get all open help requests in the community (waiting for volunteers)
 * These are requests in 'proposed' status with no volunteer assigned
 */
export function getOpenHelpRequests(): HelpSession[] {
  const allSessions = db.listHelpSessions();
  return allSessions.filter(
    session => session.status === 'proposed' && (!session.volunteerId || session.volunteerId === '')
  );
}

/**
 * Get urgent help requests that need immediate attention
 * REQ-TIME-008: Emergency and Urgent Needs
 */
export function getUrgentHelpRequests(): HelpSession[] {
  // Get all sessions without volunteers (both proposed and pending for emergencies)
  const allSessions = db.listHelpSessions();
  const openRequests = allSessions.filter(
    session => (!session.volunteerId || session.volunteerId === '') &&
               (session.status === 'proposed' || session.status === 'pending')
  );

  return openRequests.filter(session => {
    // Check if marked as urgent/emergency in notes
    const notes = session.notes || '';
    return notes.toLowerCase().includes('urgency: urgent') ||
           notes.toLowerCase().includes('urgency: emergency');
  });
}

/**
 * Get help requests by skill category
 * Useful for volunteers browsing for opportunities that match their skills
 */
export function getHelpRequestsBySkill(skillCategory: string): HelpSession[] {
  const openRequests = getOpenHelpRequests();
  const normalizedCategory = skillCategory.toLowerCase().trim();

  return openRequests.filter(session => {
    const notes = session.notes || '';
    return notes.toLowerCase().includes(normalizedCategory);
  });
}

/**
 * Search help requests by keyword in title or description
 */
export function searchHelpRequests(keyword: string): HelpSession[] {
  const searchTerm = keyword.toLowerCase().trim();
  if (!searchTerm) return [];

  const openRequests = getOpenHelpRequests();
  return openRequests.filter(session =>
    session.title.toLowerCase().includes(searchTerm) ||
    (session.description && session.description.toLowerCase().includes(searchTerm)) ||
    (session.notes && session.notes.toLowerCase().includes(searchTerm))
  );
}

/**
 * Accept a help request as a volunteer
 * REQ-TIME-016: Match confirmed for tutoring session
 */
export async function acceptHelpRequest(
  sessionId: string,
  volunteerId: string
): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');
  requireValidIdentifier(volunteerId, 'Volunteer ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    throw new Error('Help request not found');
  }

  // Verify it's still open
  if (session.volunteerId && session.volunteerId !== '') {
    throw new Error('This help request has already been accepted by another volunteer');
  }

  if (session.status !== 'proposed') {
    throw new Error('This help request is no longer available');
  }

  // Can't volunteer for your own request
  if (session.recipientId === volunteerId) {
    throw new Error('You cannot volunteer for your own help request');
  }

  try {
    await db.updateHelpSession(sessionId, {
      volunteerId: volunteerId,
      status: 'pending', // Now pending confirmation from both parties
      volunteerConfirmed: true, // Volunteer confirmed by accepting
    });

    // TODO: Notify the recipient that someone accepted (REQ-TIME-016)
  } catch (error) {
    console.error(`Failed to accept help request ${sessionId}:`, error);
    throw new Error(`Could not accept help request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Confirm a help session as the recipient
 * After volunteer accepts, recipient should confirm to finalize
 */
export async function confirmHelpSession(
  sessionId: string,
  userId: string
): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');
  requireValidIdentifier(userId, 'User ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    throw new Error('Help session not found');
  }

  // Verify the user is the recipient
  if (session.recipientId !== userId) {
    throw new Error('Only the person who requested help can confirm the session');
  }

  try {
    const updates: Partial<HelpSession> = {
      recipientConfirmed: true,
    };

    // If both parties confirmed, mark as confirmed
    if (session.volunteerConfirmed) {
      updates.status = 'confirmed';
    }

    await db.updateHelpSession(sessionId, updates);

    // TODO: Send confirmation notifications (REQ-TIME-016)
  } catch (error) {
    console.error(`Failed to confirm help session ${sessionId}:`, error);
    throw new Error(`Could not confirm help session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format help request for display
 */
export function formatHelpRequestForDisplay(session: HelpSession): string {
  const urgencyMatch = session.notes?.match(/Urgency: (\w+)/);
  const urgencyBadge = urgencyMatch ? `🚨 ${urgencyMatch[1].toUpperCase()}` : '';

  const date = new Date(session.scheduledDate);
  const dateStr = date.toLocaleDateString();

  return `
    🆘 <strong>${session.title}</strong> ${urgencyBadge}
    ${session.description || ''}
    📅 ${dateStr} ${session.scheduledTime.startTime}-${session.scheduledTime.endTime}
    📍 ${session.location.type}
    ${session.notes ? `\n📝 ${session.notes}` : ''}
    ${session.status === 'proposed' ? '✨ Looking for volunteer!' : ''}
  `.trim();
}
