/**
 * Gratitude Wall - Community Recognition Module
 * REQ-TIME-022: Recognition Without Hierarchy
 * REQ-TIME-018: Experience Sharing
 *
 * A public space for expressing gratitude and appreciation without creating
 * hierarchy, competition, or obligation. Celebrates diverse contributions equally
 * and focuses on community impact over individual achievement.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - No ranking or "top contributor" lists - all gratitude is equal
 * - Builds connection through appreciation, not obligation
 * - Public opt-in - gratitude must be explicitly shared publicly
 * - Story-focused - celebrates context and impact, not just actions
 * - Offline-first - works without internet connection
 */

import { db } from '../core/database';
import type { GratitudeExpression } from '../types';
import { sanitizeUserContent, requireValidIdentifier } from '../utils/sanitize';

/**
 * Options for expressing gratitude
 */
export interface ExpressGratitudeOptions {
  fromUserId: string;
  toUserId: string;
  message: string;
  relatedContributionId?: string;
  relatedEventId?: string;
  tags?: string[];
  isPublic: boolean; // Must be explicit - defaults to private in database
}

/**
 * Options for querying gratitude expressions
 */
export interface QueryGratitudeOptions {
  fromUserId?: string;
  toUserId?: string;
  relatedContributionId?: string;
  isPublic?: boolean;
  tags?: string[];
  startDate?: number;
  endDate?: number;
  limit?: number;
}

/**
 * Express gratitude to another community member
 * REQ-TIME-022: Recognition Without Hierarchy
 * REQ-TIME-018: Experience Sharing
 *
 * @param options - Gratitude expression options
 * @returns The created gratitude expression
 */
export async function expressGratitude(options: ExpressGratitudeOptions): Promise<GratitudeExpression> {
  // Validate required fields
  requireValidIdentifier(options.fromUserId, 'From User ID');
  requireValidIdentifier(options.toUserId, 'To User ID');

  if (!options.message || options.message.trim().length === 0) {
    throw new Error('Gratitude message is required');
  }

  if (options.fromUserId === options.toUserId) {
    throw new Error('Cannot express gratitude to yourself');
  }

  // Sanitize user-provided content
  const sanitizedMessage = sanitizeUserContent(options.message.trim());
  const sanitizedTags = options.tags?.map(tag => sanitizeUserContent(tag.trim()).toLowerCase()) || [];

  // Build gratitude expression (avoiding undefined for Automerge)
  const gratitudeData: Omit<GratitudeExpression, 'id' | 'createdAt'> = {
    fromUserId: options.fromUserId,
    toUserId: options.toUserId,
    message: sanitizedMessage,
    isPublic: options.isPublic,
    ...(sanitizedTags.length > 0 && { tags: sanitizedTags }),
    ...(options.relatedContributionId && { relatedContributionId: options.relatedContributionId }),
    ...(options.relatedEventId && { relatedEventId: options.relatedEventId }),
  };

  // Add to database
  try {
    return await db.addGratitude(gratitudeData);
  } catch (error) {
    console.error(`Failed to express gratitude from ${options.fromUserId} to ${options.toUserId}:`, error);
    throw new Error(`Could not express gratitude: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a specific gratitude expression by ID
 */
export function getGratitude(gratitudeId: string): GratitudeExpression | null {
  requireValidIdentifier(gratitudeId, 'Gratitude ID');

  const doc = db.getDoc();
  return doc.gratitude?.[gratitudeId] || null;
}

/**
 * Query gratitude expressions based on filters
 * REQ-TIME-022: Recognition Without Hierarchy
 */
export function queryGratitude(options: QueryGratitudeOptions = {}): GratitudeExpression[] {
  const doc = db.getDoc();
  let expressions = Object.values(doc.gratitude || {});

  // Apply filters
  if (options.fromUserId) {
    expressions = expressions.filter(g => g.fromUserId === options.fromUserId);
  }

  if (options.toUserId) {
    expressions = expressions.filter(g => g.toUserId === options.toUserId);
  }

  if (options.relatedContributionId) {
    expressions = expressions.filter(g => g.relatedContributionId === options.relatedContributionId);
  }

  if (options.isPublic !== undefined) {
    expressions = expressions.filter(g => g.isPublic === options.isPublic);
  }

  if (options.tags && options.tags.length > 0) {
    const searchTags = options.tags.map(t => t.toLowerCase());
    expressions = expressions.filter(g =>
      g.tags && g.tags.some(tag => searchTags.includes(tag.toLowerCase()))
    );
  }

  if (options.startDate) {
    expressions = expressions.filter(g => g.createdAt >= options.startDate!);
  }

  if (options.endDate) {
    expressions = expressions.filter(g => g.createdAt <= options.endDate!);
  }

  // Sort by most recent first
  expressions.sort((a, b) => b.createdAt - a.createdAt);

  // Apply limit
  if (options.limit && options.limit > 0) {
    expressions = expressions.slice(0, options.limit);
  }

  return expressions;
}

/**
 * Get all public gratitude for the gratitude wall
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * Returns expressions in chronological order (most recent first) without
 * any ranking or scoring. All gratitude is equal.
 */
export function getGratitudeWall(limit?: number): GratitudeExpression[] {
  return queryGratitude({
    isPublic: true,
    limit,
  });
}

/**
 * Get gratitude received by a user
 * Includes both public and private gratitude they've received
 */
export function getGratitudeReceived(userId: string, includePrivate: boolean = true): GratitudeExpression[] {
  requireValidIdentifier(userId, 'User ID');

  const options: QueryGratitudeOptions = {
    toUserId: userId,
  };

  if (!includePrivate) {
    options.isPublic = true;
  }

  return queryGratitude(options);
}

/**
 * Get gratitude expressed by a user
 */
export function getGratitudeExpressed(userId: string): GratitudeExpression[] {
  requireValidIdentifier(userId, 'User ID');

  return queryGratitude({
    fromUserId: userId,
  });
}

/**
 * Get recent gratitude (last N days)
 */
export function getRecentGratitude(days: number = 7, publicOnly: boolean = true): GratitudeExpression[] {
  const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);

  return queryGratitude({
    startDate,
    isPublic: publicOnly ? true : undefined,
  });
}

/**
 * Get gratitude by tag
 */
export function getGratitudeByTag(tag: string, publicOnly: boolean = true): GratitudeExpression[] {
  return queryGratitude({
    tags: [tag],
    isPublic: publicOnly ? true : undefined,
  });
}

/**
 * Get all unique tags used in gratitude expressions
 */
export function getGratitudeTags(): string[] {
  const doc = db.getDoc();
  const allTags = Object.values(doc.gratitude || {})
    .filter(g => g.isPublic) // Only count tags from public gratitude
    .flatMap(g => g.tags || []);

  return Array.from(new Set(allTags)).sort();
}

/**
 * Get gratitude statistics for a user
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * Note: These are for the individual user's awareness, not for public ranking
 */
export function getUserGratitudeStats(userId: string): {
  received: number;
  expressed: number;
  publicReceived: number;
  privateReceived: number;
  recentReceived: number; // Last 30 days
  commonTags: string[];
} {
  requireValidIdentifier(userId, 'User ID');

  const received = getGratitudeReceived(userId, true);
  const expressed = getGratitudeExpressed(userId);
  const publicReceived = received.filter(g => g.isPublic);
  const privateReceived = received.filter(g => !g.isPublic);

  const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentReceived = received.filter(g => g.createdAt >= last30Days);

  // Find most common tags in gratitude received
  const tagCounts = received.reduce((acc, g) => {
    (g.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const commonTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    received: received.length,
    expressed: expressed.length,
    publicReceived: publicReceived.length,
    privateReceived: privateReceived.length,
    recentReceived: recentReceived.length,
    commonTags,
  };
}

/**
 * Format gratitude for display
 */
export function formatGratitude(gratitude: GratitudeExpression, options?: {
  includeIds?: boolean;
  getUserName?: (userId: string) => string;
}): string {
  const getUserName = options?.getUserName || ((id: string) => {
    const user = db.getUserProfile(id);
    return user?.displayName || 'Anonymous';
  });

  const fromName = getUserName(gratitude.fromUserId);
  const toName = getUserName(gratitude.toUserId);
  const date = new Date(gratitude.createdAt).toLocaleDateString();

  let output = `${fromName} → ${toName} (${date})\n`;
  output += `"${gratitude.message}"\n`;

  if (gratitude.tags && gratitude.tags.length > 0) {
    output += `Tags: ${gratitude.tags.join(', ')}\n`;
  }

  if (options?.includeIds) {
    output += `ID: ${gratitude.id}\n`;
  }

  return output;
}

/**
 * Format the gratitude wall for display
 * REQ-TIME-022: Recognition Without Hierarchy
 */
export function formatGratitudeWall(limit?: number, options?: {
  getUserName?: (userId: string) => string;
}): string {
  const expressions = getGratitudeWall(limit);

  if (expressions.length === 0) {
    return '\n=== Gratitude Wall ===\n\nNo gratitude expressions yet. Be the first to express appreciation!\n';
  }

  let output = '\n=== Gratitude Wall ===\n';
  output += `Celebrating the gifts we give each other\n\n`;

  expressions.forEach((gratitude, index) => {
    if (index > 0) output += '\n';
    output += formatGratitude(gratitude, options);
  });

  return output;
}

/**
 * Format user gratitude statistics for display
 */
export function formatUserGratitudeStats(userId: string): string {
  const stats = getUserGratitudeStats(userId);

  let output = '\n=== Your Gratitude Statistics ===\n\n';
  output += `Gratitude received: ${stats.received} (${stats.publicReceived} public, ${stats.privateReceived} private)\n`;
  output += `Gratitude expressed: ${stats.expressed}\n`;
  output += `Recent gratitude (30 days): ${stats.recentReceived}\n`;

  if (stats.commonTags.length > 0) {
    output += `\nCommon themes in gratitude you've received:\n`;
    stats.commonTags.forEach(tag => {
      output += `  • ${tag}\n`;
    });
  }

  return output;
}
