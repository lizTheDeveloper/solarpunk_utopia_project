/**
 * Resource Posting - Post Items to Share/Give
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 *
 * Enables community members to post items they want to give away, lend, or share.
 * This implements the buy-nothing gift economy - free exchange that strengthens
 * social bonds beyond monetary transactions.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - No money, no crypto, no tokens - pure gift economy
 * - No tracking or surveillance - privacy-preserving by default
 * - Offline-first - works without internet connection
 * - Accessible - simple, clear interface
 */

import { db } from '../core/database';
import type { Resource, ResourceType, ShareMode } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

export interface PostResourceOptions {
  name: string;
  description: string;
  resourceType: ResourceType;
  shareMode: ShareMode;
  ownerId: string;
  location?: string;
  photos?: string[];
  tags?: string[];
  condition?: string; // Item condition: 'new', 'like-new', 'good', 'fair', 'for-parts'
  pickupOptions?: {
    canDeliver?: boolean;
    canMeetup?: boolean;
    pickupLocation?: string;
    pickupInstructions?: string;
  };
}

/**
 * Post a new resource to share with the community
 * REQ-SHARE-001: User offers unused items
 */
export async function postResource(options: PostResourceOptions): Promise<Resource> {
  // Validate required fields
  if (!options.name || options.name.trim().length === 0) {
    throw new Error('Resource name is required');
  }

  if (!options.description || options.description.trim().length === 0) {
    throw new Error('Resource description is required');
  }

  requireValidIdentifier(options.ownerId, 'Owner ID');

  // Sanitize user-provided content to prevent XSS
  const sanitizedName = sanitizeUserContent(options.name.trim());
  const sanitizedDescription = sanitizeUserContent(options.description.trim());
  const sanitizedTags = options.tags?.map(tag => sanitizeUserContent(tag.trim()));

  // Create resource object (avoiding undefined values for Automerge compatibility)
  const resource: any = {
    name: sanitizedName,
    description: sanitizedDescription,
    resourceType: options.resourceType || 'other',
    shareMode: options.shareMode || 'give',
    available: true,
    ownerId: options.ownerId,
    photos: options.photos || [],
    tags: sanitizedTags || [],
  };

  // Only include location if provided
  if (options.location) {
    resource.location = sanitizeUserContent(options.location.trim());
  }

  // Add to database
  const savedResource = await db.addResource(resource);

  return savedResource;
}

/**
 * Update an existing resource posting
 */
export async function updateResource(
  resourceId: string,
  updates: Partial<PostResourceOptions>
): Promise<void> {
  requireValidIdentifier(resourceId, 'Resource ID');

  const resource = db.getResource(resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  // Sanitize any updated content (avoid undefined values for Automerge)
  const sanitizedUpdates: any = {};

  if (updates.name !== undefined) {
    sanitizedUpdates.name = sanitizeUserContent(updates.name.trim());
  }

  if (updates.description !== undefined) {
    sanitizedUpdates.description = sanitizeUserContent(updates.description.trim());
  }

  if (updates.location !== undefined && updates.location) {
    sanitizedUpdates.location = sanitizeUserContent(updates.location.trim());
  }

  if (updates.tags !== undefined) {
    sanitizedUpdates.tags = updates.tags.map(tag => sanitizeUserContent(tag.trim()));
  }

  if (updates.resourceType !== undefined) {
    sanitizedUpdates.resourceType = updates.resourceType;
  }

  if (updates.shareMode !== undefined) {
    sanitizedUpdates.shareMode = updates.shareMode;
  }

  if (updates.photos !== undefined) {
    sanitizedUpdates.photos = updates.photos;
  }

  await db.updateResource(resourceId, sanitizedUpdates);
}

/**
 * Mark a resource as unavailable (claimed, given away, etc.)
 */
export async function markResourceUnavailable(resourceId: string): Promise<void> {
  requireValidIdentifier(resourceId, 'Resource ID');

  await db.updateResource(resourceId, { available: false });
}

/**
 * Mark a resource as available again
 */
export async function markResourceAvailable(resourceId: string): Promise<void> {
  requireValidIdentifier(resourceId, 'Resource ID');

  await db.updateResource(resourceId, { available: true });
}

/**
 * Delete a resource posting
 */
export async function deleteResource(resourceId: string): Promise<void> {
  requireValidIdentifier(resourceId, 'Resource ID');

  await db.deleteResource(resourceId);
}

/**
 * Get all resources posted by a specific user
 */
export function getMyResources(userId: string): Resource[] {
  if (!validateIdentifier(userId)) {
    return [];
  }

  return db.getResourcesByOwner(userId);
}

/**
 * Get a specific resource by ID
 */
export function getResource(resourceId: string): Resource | undefined {
  if (!validateIdentifier(resourceId)) {
    return undefined;
  }

  return db.getResource(resourceId);
}

/**
 * Get all available resources in the community
 */
export function getAvailableResources(): Resource[] {
  return db.getAvailableResources();
}

/**
 * Get available resources by type
 */
export function getResourcesByType(resourceType: ResourceType): Resource[] {
  const allResources = db.getAvailableResources();
  return allResources.filter(r => r.resourceType === resourceType);
}

/**
 * Get available resources by share mode
 */
export function getResourcesByShareMode(shareMode: ShareMode): Resource[] {
  const allResources = db.getAvailableResources();
  return allResources.filter(r => r.shareMode === shareMode);
}

/**
 * Search resources by tags
 */
export function searchResourcesByTags(tags: string[]): Resource[] {
  const allResources = db.getAvailableResources();
  return allResources.filter(resource =>
    tags.some(tag => resource.tags?.includes(tag))
  );
}

/**
 * Search resources by keyword in name or description
 */
export function searchResources(keyword: string): Resource[] {
  const searchTerm = keyword.toLowerCase().trim();
  if (!searchTerm) return [];

  const allResources = db.getAvailableResources();
  return allResources.filter(resource =>
    resource.name.toLowerCase().includes(searchTerm) ||
    resource.description.toLowerCase().includes(searchTerm) ||
    resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

/**
 * Helper function to format resource for display
 */
export function formatResourceForDisplay(resource: Resource): string {
  const shareModeBadge = {
    'give': '🎁 Free',
    'lend': '🔄 Lend',
    'share': '🤝 Share',
    'borrow': '📥 Looking to Borrow',
  }[resource.shareMode];

  const typeBadge = {
    'tool': '🔧',
    'equipment': '⚙️',
    'space': '🏠',
    'energy': '⚡',
    'food': '🌱',
    'skill': '💡',
    'time': '⏰',
    'robot': '🤖',
    'fabrication': '🖨️',
    'other': '📦',
  }[resource.resourceType];

  return `
    ${typeBadge} ${shareModeBadge}
    <strong>${resource.name}</strong>
    ${resource.description}
    ${resource.location ? `📍 ${resource.location}` : ''}
    ${resource.tags && resource.tags.length > 0 ? `\n🏷️ ${resource.tags.join(', ')}` : ''}
  `.trim();
}
