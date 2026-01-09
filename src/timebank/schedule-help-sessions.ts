/**
 * Schedule Help Sessions - Time Bank Coordination
 * REQ-TIME-016: Communication and Confirmation
 *
 * Enables community members to schedule and coordinate help sessions
 * (tutoring, skill sharing, repairs, etc.) in a gift economy framework.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gift economy - no transactional accounting, just mutual aid
 * - Clear communication - prevents misunderstandings and builds trust
 * - Offline-first - works without internet connection
 * - Flexibility - easy rescheduling respects everyone's time
 */

import { db } from '../core/database';
import type { HelpSession, HelpSessionStatus, TimeRange } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';
import { queryAvailability } from './availability-calendar';

/**
 * Options for scheduling a help session
 */
export interface ScheduleHelpSessionOptions {
  volunteerId: string;
  recipientId: string;

  // What help is being provided
  skillOfferId?: string;
  title: string;
  description?: string;

  // When
  scheduledDate: number;          // Unix timestamp
  scheduledTime: TimeRange;       // Time window
  estimatedDuration?: number;     // In minutes

  // Where
  location: {
    type: 'volunteer-place' | 'recipient-place' | 'community-space' | 'virtual' | 'flexible';
    details?: string;
  };

  // Additional context
  notes?: string;
}

/**
 * Schedule a new help session
 * REQ-TIME-016: Match confirmed for tutoring session scenario
 */
export async function scheduleHelpSession(options: ScheduleHelpSessionOptions): Promise<HelpSession> {
  // Validate required fields
  requireValidIdentifier(options.volunteerId, 'Volunteer ID');
  requireValidIdentifier(options.recipientId, 'Recipient ID');

  if (!options.title || options.title.trim().length === 0) {
    throw new Error('Session title is required');
  }

  if (!options.scheduledDate || options.scheduledDate <= 0) {
    throw new Error('Scheduled date is required');
  }

  if (!options.scheduledTime || !options.scheduledTime.startTime || !options.scheduledTime.endTime) {
    throw new Error('Scheduled time range is required');
  }

  // Sanitize user content
  const sanitizedTitle = sanitizeUserContent(options.title.trim());
  const sanitizedDescription = options.description ? sanitizeUserContent(options.description.trim()) : undefined;
  const sanitizedNotes = options.notes ? sanitizeUserContent(options.notes.trim()) : undefined;
  const sanitizedLocationDetails = options.location.details ? sanitizeUserContent(options.location.details.trim()) : undefined;

  // Build session object (avoiding undefined for Automerge)
  const sessionData: Omit<HelpSession, 'id' | 'createdAt' | 'updatedAt'> = {
    volunteerId: options.volunteerId,
    recipientId: options.recipientId,
    title: sanitizedTitle,
    scheduledDate: options.scheduledDate,
    scheduledTime: options.scheduledTime,
    location: {
      type: options.location.type,
      ...(sanitizedLocationDetails && { details: sanitizedLocationDetails }),
    },
    status: 'pending',
    volunteerConfirmed: false,
    recipientConfirmed: false,
    ...(options.skillOfferId && { skillOfferId: options.skillOfferId }),
    ...(sanitizedDescription && { description: sanitizedDescription }),
    ...(options.estimatedDuration && { estimatedDuration: options.estimatedDuration }),
    ...(sanitizedNotes && { notes: sanitizedNotes }),
  };

  try {
    const session = await db.addHelpSession(sessionData);
    return session;
  } catch (error) {
    console.error('Failed to schedule help session:', error);
    throw new Error(`Could not schedule help session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Confirm a help session (by volunteer or recipient)
 * REQ-TIME-016: Both parties accept scenario
 */
export async function confirmHelpSession(sessionId: string, userId: string): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');
  requireValidIdentifier(userId, 'User ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    throw new Error('Help session not found');
  }

  // Determine if user is volunteer or recipient
  const isVolunteer = session.volunteerId === userId;
  const isRecipient = session.recipientId === userId;

  if (!isVolunteer && !isRecipient) {
    throw new Error('User is not a participant in this help session');
  }

  // Update confirmation status
  const updates: Partial<HelpSession> = {};

  if (isVolunteer) {
    updates.volunteerConfirmed = true;
  }

  if (isRecipient) {
    updates.recipientConfirmed = true;
  }

  // If both confirmed, update status to 'confirmed'
  const willBeFullyConfirmed =
    (isVolunteer ? true : session.volunteerConfirmed) &&
    (isRecipient ? true : session.recipientConfirmed);

  if (willBeFullyConfirmed) {
    updates.status = 'confirmed';
  }

  try {
    await db.updateHelpSession(sessionId, updates);
  } catch (error) {
    console.error(`Failed to confirm help session ${sessionId}:`, error);
    throw new Error(`Could not confirm help session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cancel a help session
 * REQ-TIME-016: Enable rescheduling if needed scenario
 */
export async function cancelHelpSession(
  sessionId: string,
  userId: string,
  reason?: string
): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');
  requireValidIdentifier(userId, 'User ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    throw new Error('Help session not found');
  }

  // Verify user is a participant
  if (session.volunteerId !== userId && session.recipientId !== userId) {
    throw new Error('User is not a participant in this help session');
  }

  const updates: Partial<HelpSession> = {
    status: 'cancelled',
    cancelledAt: Date.now(),
    cancelledBy: userId,
  };

  if (reason) {
    updates.cancellationReason = sanitizeUserContent(reason.trim());
  }

  try {
    await db.updateHelpSession(sessionId, updates);
  } catch (error) {
    console.error(`Failed to cancel help session ${sessionId}:`, error);
    throw new Error(`Could not cancel help session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reschedule a help session to a new date/time
 * REQ-TIME-016: Enable rescheduling if needed scenario
 */
export async function rescheduleHelpSession(
  sessionId: string,
  newDate: number,
  newTime: TimeRange,
  notes?: string
): Promise<HelpSession> {
  requireValidIdentifier(sessionId, 'Session ID');

  const originalSession = db.getHelpSession(sessionId);
  if (!originalSession) {
    throw new Error('Help session not found');
  }

  // Cancel the original session
  await db.updateHelpSession(sessionId, {
    status: 'cancelled',
    cancelledAt: Date.now(),
    cancellationReason: 'Rescheduled',
  });

  // Create new session with same details but new date/time
  const newSession = await scheduleHelpSession({
    volunteerId: originalSession.volunteerId,
    recipientId: originalSession.recipientId,
    skillOfferId: originalSession.skillOfferId,
    title: originalSession.title,
    description: originalSession.description,
    scheduledDate: newDate,
    scheduledTime: newTime,
    estimatedDuration: originalSession.estimatedDuration,
    location: originalSession.location,
    notes: notes || originalSession.notes,
  });

  // Link the sessions for history
  await db.updateHelpSession(sessionId, { rescheduledTo: newSession.id });
  await db.updateHelpSession(newSession.id, { rescheduledFrom: sessionId });

  // Return the updated session with reschedule link
  const updatedSession = db.getHelpSession(newSession.id);
  return updatedSession || newSession;
}

/**
 * Mark session as in-progress (happening now)
 */
export async function startHelpSession(sessionId: string): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    throw new Error('Help session not found');
  }

  if (session.status !== 'confirmed') {
    throw new Error('Session must be confirmed before starting');
  }

  await db.updateHelpSession(sessionId, { status: 'in-progress' });
}

/**
 * Mark session as completed and optionally add feedback
 * REQ-TIME-016: Follow up after session scenario
 */
export async function completeHelpSession(
  sessionId: string,
  userId: string,
  feedback?: string
): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');
  requireValidIdentifier(userId, 'User ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    throw new Error('Help session not found');
  }

  // Verify user is a participant
  const isVolunteer = session.volunteerId === userId;
  const isRecipient = session.recipientId === userId;

  if (!isVolunteer && !isRecipient) {
    throw new Error('User is not a participant in this help session');
  }

  const updates: Partial<HelpSession> = {
    status: 'completed',
  };

  // Add feedback if provided
  if (feedback) {
    const sanitizedFeedback = sanitizeUserContent(feedback.trim());
    updates.completionNotes = {
      ...session.completionNotes,
      ...(isVolunteer && { volunteerFeedback: sanitizedFeedback }),
      ...(isRecipient && { recipientFeedback: sanitizedFeedback }),
    };
  }

  try {
    await db.updateHelpSession(sessionId, updates);
  } catch (error) {
    console.error(`Failed to complete help session ${sessionId}:`, error);
    throw new Error(`Could not complete help session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Express gratitude for a completed session
 * REQ-TIME-016: Gift economy - gratitude not ratings
 */
export async function expressGratitude(sessionId: string, userId: string): Promise<void> {
  requireValidIdentifier(sessionId, 'Session ID');
  requireValidIdentifier(userId, 'User ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    throw new Error('Help session not found');
  }

  // Verify user is the recipient
  if (session.recipientId !== userId) {
    throw new Error('Only the recipient can express gratitude');
  }

  const updates: Partial<HelpSession> = {
    completionNotes: {
      ...session.completionNotes,
      gratitudeExpressed: true,
    },
  };

  await db.updateHelpSession(sessionId, updates);
}

/**
 * Get help session by ID
 */
export function getHelpSession(sessionId: string): HelpSession | undefined {
  if (!validateIdentifier(sessionId)) {
    return undefined;
  }
  return db.getHelpSession(sessionId);
}

/**
 * Get all help sessions for a user (as volunteer or recipient)
 */
export function getUserHelpSessions(userId: string): HelpSession[] {
  if (!validateIdentifier(userId)) {
    return [];
  }
  return db.getHelpSessionsByUser(userId);
}

/**
 * Get upcoming help sessions for a user
 */
export function getUpcomingHelpSessions(userId?: string): HelpSession[] {
  return db.getUpcomingHelpSessions(userId);
}

/**
 * Get help sessions by status
 */
export function getHelpSessionsByStatus(status: HelpSessionStatus, userId?: string): HelpSession[] {
  let sessions = db.listHelpSessions().filter(session => session.status === status);

  if (userId) {
    sessions = sessions.filter(
      session => session.volunteerId === userId || session.recipientId === userId
    );
  }

  return sessions;
}

/**
 * Get help sessions for a specific date
 */
export function getHelpSessionsForDate(date: number, userId?: string): HelpSession[] {
  const startOfDay = getStartOfDay(date);
  const endOfDay = getEndOfDay(date);

  let sessions = db.listHelpSessions().filter(
    session => session.scheduledDate >= startOfDay && session.scheduledDate <= endOfDay
  );

  if (userId) {
    sessions = sessions.filter(
      session => session.volunteerId === userId || session.recipientId === userId
    );
  }

  return sessions.sort((a, b) => {
    const aTime = timeToMinutes(a.scheduledTime.startTime);
    const bTime = timeToMinutes(b.scheduledTime.startTime);
    return aTime - bTime;
  });
}

/**
 * Check if a user has a session conflict at a given date/time
 */
export function hasSessionConflict(
  userId: string,
  date: number,
  timeRange: TimeRange
): boolean {
  const sessionsOnDate = getHelpSessionsForDate(date, userId);

  return sessionsOnDate.some(session => {
    // Only check non-cancelled sessions
    if (session.status === 'cancelled') return false;

    return timeRangesOverlap(session.scheduledTime, timeRange);
  });
}

/**
 * Find available time slots for a session between volunteer and recipient
 * REQ-TIME-016: Coordinate schedules scenario
 */
export function findAvailableTimeSlots(
  volunteerId: string,
  recipientId: string,
  startDate: number,
  endDate: number,
  _duration: number = 60 // default 60 minutes - reserved for future use
): Array<{ date: number; timeRange: TimeRange }> {
  // Get availability for both parties
  // TODO: Use duration parameter to filter time slots that are long enough
  const volunteerAvailability = queryAvailability({
    startDate,
    endDate,
    userId: volunteerId,
  });

  const recipientAvailability = queryAvailability({
    startDate,
    endDate,
    userId: recipientId,
  });

  const availableSlots: Array<{ date: number; timeRange: TimeRange }> = [];

  // Find overlapping availability
  // This is a simplified version - a full implementation would calculate
  // all possible overlapping time windows
  for (const vSlot of volunteerAvailability) {
    for (const rSlot of recipientAvailability) {
      // Check if slots are on the same day
      const vDate = vSlot.date || (vSlot.dateRange ? vSlot.dateRange.start : 0);
      const rDate = rSlot.date || (rSlot.dateRange ? rSlot.dateRange.start : 0);

      if (isSameDay(vDate, rDate)) {
        // Find overlapping time ranges
        for (const vTime of vSlot.timeRanges) {
          for (const rTime of rSlot.timeRanges) {
            if (timeRangesOverlap(vTime, rTime)) {
              availableSlots.push({
                date: vDate,
                timeRange: vTime, // Simplified - should calculate actual overlap
              });
            }
          }
        }
      }
    }
  }

  return availableSlots;
}

/**
 * Format help session for display
 */
export function formatHelpSessionForDisplay(session: HelpSession): string {
  const date = new Date(session.scheduledDate).toLocaleDateString();
  const timeStr = `${session.scheduledTime.startTime}-${session.scheduledTime.endTime}`;
  const duration = session.estimatedDuration ? ` (${session.estimatedDuration}min)` : '';
  const locationStr = `📍 ${session.location.type}${session.location.details ? ': ' + session.location.details : ''}`;

  const statusEmoji = {
    'proposed': '💡',
    'pending': '⏳',
    'confirmed': '✅',
    'in-progress': '🔄',
    'completed': '✨',
    'cancelled': '❌',
    'no-show': '⚠️',
  }[session.status];

  return `
${statusEmoji} ${session.title}
📅 ${date} at ${timeStr}${duration}
${locationStr}
${session.description ? '\n' + session.description : ''}
${session.notes ? '\n💬 ' + session.notes : ''}
  `.trim();
}

// ===== Helper Functions =====

function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getEndOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function timeRangesOverlap(range1: TimeRange, range2: TimeRange): boolean {
  const start1 = timeToMinutes(range1.startTime);
  const end1 = timeToMinutes(range1.endTime);
  const start2 = timeToMinutes(range2.startTime);
  const end2 = timeToMinutes(range2.endTime);

  return start1 < end2 && start2 < end1;
}
