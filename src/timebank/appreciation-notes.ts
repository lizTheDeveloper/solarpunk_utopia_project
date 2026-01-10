/**
 * Appreciation Notes - Time Bank Module
 * REQ-TIME-018: Experience Sharing
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * Enables volunteers and recipients to express gratitude and appreciation
 * after time bank activities (help sessions, skill sharing, etc.).
 *
 * This module provides time bank-specific convenience functions on top of
 * the general gratitude system, making it easy to express appreciation
 * in the context of time sharing and mutual aid.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gratitude, not ratings - no scoring or ranking
 * - Both volunteers and recipients can express appreciation
 * - Optional and joyful - never mandatory
 * - Builds connection through shared stories
 * - Offline-first compatible
 */

import { db } from '../core/database';
import type { GratitudeExpression, HelpSession } from '../types';
import { sanitizeUserContent, requireValidIdentifier } from '../utils/sanitize';
import { expressGratitude as expressGeneralGratitude } from './gratitude-wall';

/**
 * Options for expressing appreciation after a help session
 */
export interface ExpressAppreciationOptions {
  sessionId: string;
  fromUserId: string;
  message: string;
  isPublic?: boolean; // Defaults to true - celebrate publicly!
  tags?: string[]; // e.g., "helpful", "patient", "inspiring"
}

/**
 * Options for querying appreciation notes
 */
export interface QueryAppreciationOptions {
  sessionId?: string;
  volunteerId?: string;
  recipientId?: string;
  skillOfferId?: string;
  isPublic?: boolean;
  tags?: string[];
  limit?: number;
}

/**
 * Appreciation note with help session context
 */
export interface AppreciationNote extends GratitudeExpression {
  sessionId: string;
  sessionTitle: string;
  volunteerName: string;
  recipientName: string;
}

/**
 * Express appreciation after a help session
 * REQ-TIME-018: Experience Sharing
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * Can be used by either volunteer or recipient to express gratitude.
 * Links the appreciation to the specific help session.
 *
 * @param options - Appreciation expression options
 * @returns The created gratitude expression
 */
export async function expressAppreciation(
  options: ExpressAppreciationOptions
): Promise<GratitudeExpression> {
  requireValidIdentifier(options.sessionId, 'Session ID');
  requireValidIdentifier(options.fromUserId, 'From User ID');

  if (!options.message || options.message.trim().length === 0) {
    throw new Error('Appreciation message is required');
  }

  // Get the help session to link the appreciation
  const session = db.getHelpSession(options.sessionId);
  if (!session) {
    throw new Error('Help session not found');
  }

  // Verify that the user is part of this session
  if (session.volunteerId !== options.fromUserId && session.recipientId !== options.fromUserId) {
    throw new Error('Only session participants can express appreciation');
  }

  // Determine who is receiving the appreciation
  const toUserId = session.volunteerId === options.fromUserId
    ? session.recipientId
    : session.volunteerId;

  // Sanitize tags and add time bank context
  const tags = [
    'time-bank',
    'help-session',
    ...(options.tags || []),
  ].map(tag => sanitizeUserContent(tag.trim()).toLowerCase());

  // Express gratitude using the general gratitude system
  const gratitude = await expressGeneralGratitude({
    fromUserId: options.fromUserId,
    toUserId,
    message: options.message,
    relatedEventId: options.sessionId, // Link to the help session
    tags,
    isPublic: options.isPublic !== false, // Default to public
  });

  // Update the help session to mark that gratitude was expressed
  const updates: Partial<HelpSession> = {
    completionNotes: {
      ...session.completionNotes,
      gratitudeExpressed: true,
    },
  };
  await db.updateHelpSession(options.sessionId, updates);

  return gratitude;
}

/**
 * Express appreciation for a skill offer (not tied to a specific session)
 * REQ-TIME-018: Experience Sharing
 *
 * Allows users to thank someone for offering their time and skills,
 * even if no help session has occurred yet.
 */
export async function expressAppreciationForSkillOffer(
  skillOfferId: string,
  fromUserId: string,
  message: string,
  options?: {
    isPublic?: boolean;
    tags?: string[];
  }
): Promise<GratitudeExpression> {
  requireValidIdentifier(skillOfferId, 'Skill Offer ID');
  requireValidIdentifier(fromUserId, 'From User ID');

  if (!message || message.trim().length === 0) {
    throw new Error('Appreciation message is required');
  }

  const allSkills = db.listSkills();
  const skillOffer = allSkills.find(skill => skill.id === skillOfferId);
  if (!skillOffer) {
    throw new Error('Skill offer not found');
  }

  if (skillOffer.userId === fromUserId) {
    throw new Error('Cannot express appreciation for your own skill offer');
  }

  const tags = [
    'time-bank',
    'skill-offer',
    ...(options?.tags || []),
  ].map(tag => sanitizeUserContent(tag.trim()).toLowerCase());

  return await expressGeneralGratitude({
    fromUserId,
    toUserId: skillOffer.userId,
    message,
    relatedContributionId: skillOfferId,
    tags,
    isPublic: options?.isPublic !== false,
  });
}

/**
 * Get appreciation notes for a help session
 * REQ-TIME-018: Experience Sharing
 *
 * Returns all appreciation notes related to a specific help session,
 * with context about the session and participants.
 */
export function getAppreciationForSession(sessionId: string): AppreciationNote[] {
  requireValidIdentifier(sessionId, 'Session ID');

  const session = db.getHelpSession(sessionId);
  if (!session) {
    return [];
  }

  const doc = db.getDoc();
  const allGratitude = Object.values(doc.gratitude || {});

  // Find gratitude linked to this session
  const sessionGratitude = allGratitude.filter(
    g => g.relatedEventId === sessionId
  );

  // Enrich with session context
  return sessionGratitude.map(g => enrichWithSessionContext(g, session));
}

/**
 * Get all appreciation notes for a user (volunteer or recipient)
 * REQ-TIME-018: Experience Sharing
 *
 * Returns appreciation notes where the user was either the volunteer
 * or recipient in help sessions.
 */
export function getAppreciationForUser(userId: string, options?: {
  limit?: number;
  includePrivate?: boolean;
}): AppreciationNote[] {
  requireValidIdentifier(userId, 'User ID');

  const doc = db.getDoc();

  // Get all gratitude expressions involving this user
  const allGratitude = Object.values(doc.gratitude || {})
    .filter(g => {
      // Filter by public/private
      if (!options?.includePrivate && !g.isPublic) {
        return false;
      }

      // Check if user is involved
      return g.fromUserId === userId || g.toUserId === userId;
    })
    .filter(g => g.tags?.includes('time-bank')); // Only time bank related

  // Sort by most recent first
  allGratitude.sort((a, b) => b.createdAt - a.createdAt);

  // Apply limit
  const limited = options?.limit ? allGratitude.slice(0, options.limit) : allGratitude;

  // Enrich with session context where available
  return limited.map(g => {
    if (g.relatedEventId) {
      const session = db.getHelpSession(g.relatedEventId);
      if (session) {
        return enrichWithSessionContext(g, session);
      }
    }
    // Fallback to basic enrichment without session
    return enrichWithoutSessionContext(g);
  });
}

/**
 * Get appreciation notes for a specific skill offer
 * REQ-TIME-018: Experience Sharing
 */
export function getAppreciationForSkillOffer(skillOfferId: string): GratitudeExpression[] {
  requireValidIdentifier(skillOfferId, 'Skill Offer ID');

  const doc = db.getDoc();
  return Object.values(doc.gratitude || {})
    .filter(g => g.relatedContributionId === skillOfferId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get recent appreciation notes across all time bank activities
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * Returns recent appreciation notes to celebrate community contributions.
 * Sorted chronologically (most recent first), no ranking.
 */
export function getRecentAppreciation(options?: {
  days?: number;
  limit?: number;
  publicOnly?: boolean;
}): AppreciationNote[] {
  const days = options?.days || 7;
  const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);

  const doc = db.getDoc();
  const allGratitude = Object.values(doc.gratitude || {})
    .filter(g => {
      // Filter by time bank tag
      if (!g.tags?.includes('time-bank')) {
        return false;
      }

      // Filter by date
      if (g.createdAt < startDate) {
        return false;
      }

      // Filter by public/private
      if (options?.publicOnly === true && !g.isPublic) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  // Apply limit
  const limited = options?.limit ? allGratitude.slice(0, options.limit) : allGratitude;

  // Enrich with context
  return limited.map(g => {
    if (g.relatedEventId) {
      const session = db.getHelpSession(g.relatedEventId);
      if (session) {
        return enrichWithSessionContext(g, session);
      }
    }
    return enrichWithoutSessionContext(g);
  });
}

/**
 * Helper: Enrich gratitude expression with session context
 */
function enrichWithSessionContext(
  gratitude: GratitudeExpression,
  session: HelpSession
): AppreciationNote {
  const volunteerProfile = db.getUserProfile(session.volunteerId);
  const recipientProfile = db.getUserProfile(session.recipientId);

  return {
    ...gratitude,
    sessionId: session.id,
    sessionTitle: session.title,
    volunteerName: volunteerProfile?.displayName || 'Anonymous',
    recipientName: recipientProfile?.displayName || 'Anonymous',
  };
}

/**
 * Helper: Enrich gratitude expression without session context
 */
function enrichWithoutSessionContext(gratitude: GratitudeExpression): AppreciationNote {
  const fromProfile = db.getUserProfile(gratitude.fromUserId);
  const toProfile = db.getUserProfile(gratitude.toUserId);

  return {
    ...gratitude,
    sessionId: gratitude.relatedEventId || '',
    sessionTitle: 'Time Bank Activity',
    volunteerName: toProfile?.displayName || 'Anonymous',
    recipientName: fromProfile?.displayName || 'Anonymous',
  };
}

/**
 * Format appreciation note for display
 */
export function formatAppreciationNote(note: AppreciationNote): string {
  const date = new Date(note.createdAt).toLocaleDateString();

  let output = `\n=== ${note.sessionTitle} ===\n`;
  output += `${note.fromUserId === note.toUserId ? note.volunteerName : note.recipientName} → `;
  output += `${note.fromUserId === note.toUserId ? note.recipientName : note.volunteerName}\n`;
  output += `Date: ${date}\n\n`;
  output += `"${note.message}"\n`;

  if (note.tags && note.tags.length > 0) {
    // Filter out the automatic tags
    const displayTags = note.tags.filter(t => t !== 'time-bank' && t !== 'help-session' && t !== 'skill-offer');
    if (displayTags.length > 0) {
      output += `\nTags: ${displayTags.join(', ')}\n`;
    }
  }

  return output;
}

/**
 * Format a list of appreciation notes for display
 */
export function formatAppreciationList(
  notes: AppreciationNote[],
  title: string = 'Appreciation Notes'
): string {
  if (notes.length === 0) {
    return `\n=== ${title} ===\n\nNo appreciation notes yet. Share your gratitude!\n`;
  }

  let output = `\n=== ${title} ===\n`;
  output += `Celebrating time shared and connections made\n`;

  notes.forEach((note, index) => {
    if (index > 0) output += '\n---\n';
    output += formatAppreciationNote(note);
  });

  return output;
}

/**
 * Get appreciation statistics for time bank activities
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * Non-competitive statistics for awareness, not ranking
 */
export function getAppreciationStats(userId?: string): {
  totalNotes: number;
  publicNotes: number;
  privateNotes: number;
  last7Days: number;
  last30Days: number;
  commonTags: string[];
  sessionsWithAppreciation: number;
  totalSessions: number;
} {
  const doc = db.getDoc();

  let gratitudeList = Object.values(doc.gratitude || {})
    .filter(g => g.tags?.includes('time-bank'));

  // Filter by user if specified
  if (userId) {
    requireValidIdentifier(userId, 'User ID');
    gratitudeList = gratitudeList.filter(
      g => g.fromUserId === userId || g.toUserId === userId
    );
  }

  const publicNotes = gratitudeList.filter(g => g.isPublic);
  const privateNotes = gratitudeList.filter(g => !g.isPublic);

  const now = Date.now();
  const last7Days = gratitudeList.filter(
    g => g.createdAt >= now - (7 * 24 * 60 * 60 * 1000)
  ).length;

  const last30Days = gratitudeList.filter(
    g => g.createdAt >= now - (30 * 24 * 60 * 60 * 1000)
  ).length;

  // Count common tags (excluding automatic ones)
  const tagCounts: Record<string, number> = {};
  gratitudeList.forEach(g => {
    (g.tags || []).forEach(tag => {
      if (tag !== 'time-bank' && tag !== 'help-session' && tag !== 'skill-offer') {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
  });

  const commonTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Count sessions with appreciation
  const sessionsWithAppreciation = new Set(
    gratitudeList
      .filter(g => g.relatedEventId)
      .map(g => g.relatedEventId!)
  ).size;

  // Count total sessions
  let totalSessions = Object.keys(doc.helpSessions || {}).length;
  if (userId) {
    totalSessions = Object.values(doc.helpSessions || {})
      .filter(s => s.volunteerId === userId || s.recipientId === userId)
      .length;
  }

  return {
    totalNotes: gratitudeList.length,
    publicNotes: publicNotes.length,
    privateNotes: privateNotes.length,
    last7Days,
    last30Days,
    commonTags,
    sessionsWithAppreciation,
    totalSessions,
  };
}

/**
 * Format appreciation statistics for display
 */
export function formatAppreciationStats(
  stats: ReturnType<typeof getAppreciationStats>,
  userName?: string
): string {
  const title = userName
    ? `${userName}'s Time Bank Appreciation`
    : 'Community Time Bank Appreciation';

  let output = `\n=== ${title} ===\n\n`;
  output += `Total appreciation notes: ${stats.totalNotes}\n`;
  output += `  Public: ${stats.publicNotes}\n`;
  output += `  Private: ${stats.privateNotes}\n\n`;
  output += `Recent activity:\n`;
  output += `  Last 7 days: ${stats.last7Days} notes\n`;
  output += `  Last 30 days: ${stats.last30Days} notes\n\n`;
  output += `Sessions with appreciation: ${stats.sessionsWithAppreciation} of ${stats.totalSessions}\n`;

  if (stats.commonTags.length > 0) {
    output += `\nCommon themes:\n`;
    stats.commonTags.forEach(tag => {
      output += `  • ${tag}\n`;
    });
  }

  return output;
}
