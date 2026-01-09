/**
 * Resource Sharing System
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * REQ-SHARE-002: Tools and Equipment Access
 *
 * Implements the buy-nothing, gift economy approach to sharing physical items,
 * tools, and equipment within the community.
 */

import { db } from '../core/database';
import type { Resource, Need, ResourceType, ShareMode, UrgencyLevel, EconomicEvent, UserProfile } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

/**
 * Resource creation data - for building resources without undefined values (Automerge compatible)
 */
interface ResourceCreateData {
  name: string;
  description: string;
  resourceType: ResourceType;
  shareMode: ShareMode;
  available: boolean;
  ownerId: string;
  photos: string[];
  tags: string[];
  location?: string;
}

/**
 * Resource update data - for partial updates
 */
interface ResourceUpdateData {
  name?: string;
  description?: string;
  location?: string;
  photos?: string[];
  tags?: string[];
  available?: boolean;
}

/**
 * Post an item to share or give away
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 */
export async function postItemToShare(
  userId: string,
  name: string,
  description: string,
  resourceType: ResourceType,
  shareMode: ShareMode,
  options?: {
    location?: string;
    photos?: string[];
    tags?: string[];
  }
): Promise<Resource> {
  requireValidIdentifier(userId, 'User ID');

  // Build resource object without undefined values (Automerge doesn't support undefined)
  const resourceData: ResourceCreateData = {
    name: sanitizeUserContent(name),
    description: sanitizeUserContent(description),
    resourceType,
    shareMode,
    available: true,
    ownerId: userId,
    photos: options?.photos || [],
    tags: (options?.tags || []).map(tag => sanitizeUserContent(tag)),
  };

  // Only include location if provided
  if (options?.location) {
    resourceData.location = sanitizeUserContent(options.location);
  }

  const resource = await db.addResource(resourceData);

  return resource;
}

/**
 * Browse available items in the community
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 */
export function browseAvailableItems(filters?: {
  resourceType?: ResourceType;
  shareMode?: ShareMode;
  ownerId?: string;
  searchQuery?: string;
}): Resource[] {
  let resources = db.listResources().filter(r => r.available);

  if (filters?.resourceType) {
    resources = resources.filter(r => r.resourceType === filters.resourceType);
  }

  if (filters?.shareMode) {
    resources = resources.filter(r => r.shareMode === filters.shareMode);
  }

  if (filters?.ownerId) {
    resources = resources.filter(r => r.ownerId === filters.ownerId);
  }

  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    resources = resources.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Sort by most recently posted
  return resources.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Request an item from another community member
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 *
 * This creates an economic event representing the request and records
 * interest in the item.
 */
export async function requestItem(
  userId: string,
  resourceId: string,
  message?: string
): Promise<{
  success: boolean;
  event?: EconomicEvent;
  error?: string;
}> {
  try {
    requireValidIdentifier(userId, 'User ID');
    requireValidIdentifier(resourceId, 'Resource ID');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid input',
    };
  }

  const resource = db.getResource(resourceId);

  if (!resource) {
    return {
      success: false,
      error: 'Resource not found',
    };
  }

  if (!resource.available) {
    return {
      success: false,
      error: 'Resource is no longer available',
    };
  }

  if (resource.ownerId === userId) {
    return {
      success: false,
      error: 'Cannot request your own item',
    };
  }

  // Record the request as an economic event
  const event = await db.recordEvent({
    action: 'transfer', // Represents interest/request for transfer
    providerId: resource.ownerId,
    receiverId: userId,
    resourceId: resourceId,
    note: message ? sanitizeUserContent(message) : `Request for ${resource.name}`,
  });

  return {
    success: true,
    event,
  };
}

/**
 * Mark an item as claimed or no longer available
 * This would typically be called by the item owner after arranging pickup/delivery
 */
export async function markItemClaimed(
  resourceId: string,
  claimedBy?: string
): Promise<void> {
  requireValidIdentifier(resourceId, 'Resource ID');

  if (claimedBy) {
    requireValidIdentifier(claimedBy, 'Claimer ID');
  }

  await db.updateResource(resourceId, {
    available: false,
  });

  // If we know who claimed it, record the event
  if (claimedBy) {
    const resource = db.getResource(resourceId);
    if (resource) {
      await db.recordEvent({
        action: resource.shareMode === 'give' ? 'give' : 'lend',
        providerId: resource.ownerId,
        receiverId: claimedBy,
        resourceId: resourceId,
        note: `${resource.name} claimed`,
      });
    }
  }
}

/**
 * Mark an item as available again
 * Useful if a claim fell through or a borrowed item was returned
 */
export async function markItemAvailable(resourceId: string): Promise<void> {
  requireValidIdentifier(resourceId, 'Resource ID');

  await db.updateResource(resourceId, {
    available: true,
  });
}

/**
 * Get all requests for a specific item
 * Returns all transfer events where this resource is the subject
 */
export function getItemRequests(resourceId: string): EconomicEvent[] {
  if (!validateIdentifier(resourceId)) {
    return [];
  }
  return db.listEvents()
    .filter(event =>
      event.resourceId === resourceId &&
      event.action === 'transfer'
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get items requested by a specific user
 */
export function getMyRequests(userId: string): Array<{
  request: EconomicEvent;
  resource: Resource | undefined;
}> {
  if (!validateIdentifier(userId)) {
    return [];
  }
  return db.listEvents()
    .filter(event =>
      event.receiverId === userId &&
      event.action === 'transfer'
    )
    .map(event => ({
      request: event,
      resource: db.getResource(event.resourceId),
    }))
    .sort((a, b) => b.request.createdAt - a.request.createdAt);
}

/**
 * Get items that others have requested from me
 */
export function getRequestsForMyItems(userId: string): Array<{
  request: EconomicEvent;
  resource: Resource | undefined;
  requesterProfile?: UserProfile;
}> {
  if (!validateIdentifier(userId)) {
    return [];
  }
  return db.listEvents()
    .filter(event =>
      event.providerId === userId &&
      event.action === 'transfer'
    )
    .map(event => ({
      request: event,
      resource: db.getResource(event.resourceId),
      requesterProfile: db.getUserProfile(event.receiverId),
    }))
    .sort((a, b) => b.request.createdAt - a.request.createdAt);
}

/**
 * Update an item's details
 */
export async function updateItem(
  resourceId: string,
  updates: {
    name?: string;
    description?: string;
    location?: string;
    photos?: string[];
    tags?: string[];
    available?: boolean;
  }
): Promise<void> {
  requireValidIdentifier(resourceId, 'Resource ID');

  const sanitizedUpdates: ResourceUpdateData = {};

  if (updates.name !== undefined) {
    sanitizedUpdates.name = sanitizeUserContent(updates.name);
  }
  if (updates.description !== undefined) {
    sanitizedUpdates.description = sanitizeUserContent(updates.description);
  }
  if (updates.location !== undefined) {
    // Only add location if it has a value, otherwise leave it as-is
    if (updates.location) {
      sanitizedUpdates.location = sanitizeUserContent(updates.location);
    }
  }
  if (updates.photos !== undefined) {
    sanitizedUpdates.photos = updates.photos;
  }
  if (updates.tags !== undefined) {
    sanitizedUpdates.tags = updates.tags;
  }
  if (updates.available !== undefined) {
    sanitizedUpdates.available = updates.available;
  }

  await db.updateResource(resourceId, sanitizedUpdates);
}

/**
 * Delete/remove an item listing
 */
export async function removeItem(resourceId: string): Promise<void> {
  requireValidIdentifier(resourceId, 'Resource ID');
  await db.deleteResource(resourceId);
}

/**
 * Get a single resource by ID
 */
export function getItem(resourceId: string): Resource | undefined {
  if (!validateIdentifier(resourceId)) {
    return undefined;
  }
  return db.getResource(resourceId);
}
