/**
 * Item Pickup Coordination System
 * REQ-SHARE-013: Resource Pickup and Delivery
 * Phase 3, Group C: Tool Library & Equipment
 *
 * Facilitates coordination of resource pickup, delivery, or drop-off between community members.
 * Makes logistics easier so sharing actually works in practice.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gift economy - logistics coordination without transactions
 * - Community care - making it easy to help each other
 * - Offline-first - coordination works without internet (uses Automerge database)
 * - Privacy - minimal data collection, user controls visibility
 */

import { db } from '../core/database';
import type { Resource, EconomicEvent, UserProfile } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';
import { v4 as uuidv4 } from 'uuid';

/**
 * Pickup coordination status
 */
export type PickupStatus =
  | 'pending'        // Initial state, waiting for coordination
  | 'scheduled'      // Time and place agreed upon
  | 'in-progress'    // Pickup happening now
  | 'completed'      // Pickup confirmed complete
  | 'cancelled';     // Pickup cancelled

/**
 * Pickup method options
 */
export type PickupMethod =
  | 'pickup'         // Receiver picks up from provider
  | 'delivery'       // Provider delivers to receiver
  | 'meetup'         // Meet at neutral location
  | 'other';         // Other arrangement

/**
 * Pickup coordination data structure
 */
export interface PickupCoordination {
  id: string;
  resourceId: string;
  providerId: string;      // Person giving/lending the item
  receiverId: string;      // Person receiving the item
  eventId?: string;        // Link to the economic event (request/claim)
  bookingId?: string;      // Link to equipment booking if applicable

  // Coordination details
  status: PickupStatus;
  method: PickupMethod;
  scheduledTime?: number;  // Unix timestamp for agreed pickup time
  location?: string;       // Pickup/delivery/meetup location
  directions?: string;     // Additional directions or instructions

  // Communication
  messages: PickupMessage[];

  // Confirmation
  completedAt?: number;    // When pickup was marked complete
  completedBy?: string;    // Who confirmed completion

  createdAt: number;
  updatedAt: number;
}

/**
 * Message within pickup coordination
 */
export interface PickupMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
}

/**
 * Create a new pickup coordination
 * REQ-SHARE-013: Resource Pickup and Delivery
 *
 * This is typically called after someone requests/claims an item
 */
export async function createPickupCoordination(
  resourceId: string,
  providerId: string,
  receiverId: string,
  options?: {
    eventId?: string;
    bookingId?: string;
    method?: PickupMethod;
    initialMessage?: string;
  }
): Promise<PickupCoordination> {
  requireValidIdentifier(resourceId, 'Resource ID');
  requireValidIdentifier(providerId, 'Provider ID');
  requireValidIdentifier(receiverId, 'Receiver ID');

  if (providerId === receiverId) {
    throw new Error('Provider and receiver cannot be the same person');
  }

  // Verify resource exists
  const resource = db.getResource(resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  // Verify provider owns the resource
  if (resource.ownerId !== providerId) {
    throw new Error('Provider must be the resource owner');
  }

  // Build initial coordination object
  const coordinationData: Omit<PickupCoordination, 'id' | 'createdAt' | 'updatedAt'> = {
    resourceId,
    providerId,
    receiverId,
    status: 'pending',
    method: options?.method || 'pickup',
    messages: [],
    ...(options?.eventId && { eventId: options.eventId }),
    ...(options?.bookingId && { bookingId: options.bookingId }),
  };

  // Add initial message if provided
  if (options?.initialMessage) {
    coordinationData.messages.push({
      id: generateMessageId(),
      senderId: receiverId,
      content: sanitizeUserContent(options.initialMessage),
      timestamp: Date.now(),
    });
  }

  // Save to database
  const coordination = await db.addPickupCoordination(coordinationData);

  return coordination;
}

/**
 * Get pickup coordination by ID
 */
export function getPickupCoordination(coordinationId: string): PickupCoordination | undefined {
  if (!validateIdentifier(coordinationId)) {
    return undefined;
  }
  return db.getPickupCoordination(coordinationId);
}

/**
 * Get all pickup coordinations for a user (both as provider and receiver)
 */
export function getMyPickupCoordinations(userId: string): PickupCoordination[] {
  if (!validateIdentifier(userId)) {
    return [];
  }

  return db.listPickupCoordinations()
    .filter(pc => pc.providerId === userId || pc.receiverId === userId)
    .sort((a, b) => {
      // Sort by scheduled time if available, otherwise by creation time
      if (a.scheduledTime && b.scheduledTime) {
        return a.scheduledTime - b.scheduledTime;
      }
      return b.createdAt - a.createdAt;
    });
}

/**
 * Get pickup coordinations where I'm providing items
 */
export function getMyProviderCoordinations(providerId: string): PickupCoordination[] {
  if (!validateIdentifier(providerId)) {
    return [];
  }

  return db.listPickupCoordinations()
    .filter(pc => pc.providerId === providerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get pickup coordinations where I'm receiving items
 */
export function getMyReceiverCoordinations(receiverId: string): PickupCoordination[] {
  if (!validateIdentifier(receiverId)) {
    return [];
  }

  return db.listPickupCoordinations()
    .filter(pc => pc.receiverId === receiverId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get coordination for a specific resource
 */
export function getCoordinationForResource(resourceId: string): PickupCoordination[] {
  if (!validateIdentifier(resourceId)) {
    return [];
  }

  return db.listPickupCoordinations()
    .filter(pc => pc.resourceId === resourceId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Add a message to the coordination
 * REQ-SHARE-013: Facilitate messaging
 */
export async function addPickupMessage(
  coordinationId: string,
  senderId: string,
  message: string
): Promise<PickupCoordination> {
  requireValidIdentifier(coordinationId, 'Coordination ID');
  requireValidIdentifier(senderId, 'Sender ID');

  const coordination = db.getPickupCoordination(coordinationId);
  if (!coordination) {
    throw new Error('Pickup coordination not found');
  }

  // Verify sender is part of this coordination
  if (senderId !== coordination.providerId && senderId !== coordination.receiverId) {
    throw new Error('Only participants can send messages');
  }

  // Can't message cancelled or completed coordinations
  if (coordination.status === 'cancelled' || coordination.status === 'completed') {
    throw new Error(`Cannot message ${coordination.status} coordination`);
  }

  // Create new message
  const newMessage: PickupMessage = {
    id: generateMessageId(),
    senderId,
    content: sanitizeUserContent(message),
    timestamp: Date.now(),
  };

  // Add message using direct database method for Automerge-safe array operations
  await db.update((doc) => {
    const coord = doc.pickupCoordinations[coordinationId];
    if (coord) {
      // Push to existing array (Automerge-safe)
      coord.messages.push(newMessage);
      coord.updatedAt = Date.now();
    }
  });

  const updated = db.getPickupCoordination(coordinationId);
  if (!updated) {
    throw new Error('Coordination not found after update');
  }

  return updated;
}

/**
 * Schedule pickup time and location
 * REQ-SHARE-013: Coordinate timing
 */
export async function schedulePickup(
  coordinationId: string,
  userId: string,
  schedule: {
    scheduledTime: number;
    location?: string;
    directions?: string;
    method?: PickupMethod;
  }
): Promise<PickupCoordination> {
  requireValidIdentifier(coordinationId, 'Coordination ID');
  requireValidIdentifier(userId, 'User ID');

  const coordination = db.getPickupCoordination(coordinationId);
  if (!coordination) {
    throw new Error('Pickup coordination not found');
  }

  // Verify user is part of this coordination
  if (userId !== coordination.providerId && userId !== coordination.receiverId) {
    throw new Error('Only participants can schedule pickup');
  }

  // Can't schedule cancelled or completed coordinations
  if (coordination.status === 'cancelled' || coordination.status === 'completed') {
    throw new Error(`Cannot schedule ${coordination.status} coordination`);
  }

  // Validate scheduled time is in the future
  if (schedule.scheduledTime < Date.now()) {
    throw new Error('Scheduled time must be in the future');
  }

  // Build updates
  const updates: Partial<PickupCoordination> = {
    status: 'scheduled',
    scheduledTime: schedule.scheduledTime,
  };

  if (schedule.location !== undefined) {
    updates.location = sanitizeUserContent(schedule.location);
  }

  if (schedule.directions !== undefined) {
    updates.directions = sanitizeUserContent(schedule.directions);
  }

  if (schedule.method !== undefined) {
    updates.method = schedule.method;
  }

  await db.updatePickupCoordination(coordinationId, updates);

  // Add system message about scheduling
  const resource = db.getResource(coordination.resourceId);
  const userProfile = db.getUserProfile(userId);
  const userName = userProfile?.displayName || 'Someone';
  const resourceName = resource?.name || 'item';
  const dateStr = new Date(schedule.scheduledTime).toLocaleString();

  const systemMessage = `${userName} scheduled pickup for ${resourceName} on ${dateStr}${schedule.location ? ` at ${schedule.location}` : ''}`;

  await addPickupMessage(coordinationId, userId, systemMessage);

  const updated = db.getPickupCoordination(coordinationId);
  if (!updated) {
    throw new Error('Coordination not found after update');
  }

  return updated;
}

/**
 * Mark pickup as in progress (happening now)
 */
export async function markPickupInProgress(
  coordinationId: string,
  userId: string
): Promise<void> {
  requireValidIdentifier(coordinationId, 'Coordination ID');
  requireValidIdentifier(userId, 'User ID');

  const coordination = db.getPickupCoordination(coordinationId);
  if (!coordination) {
    throw new Error('Pickup coordination not found');
  }

  // Verify user is part of this coordination
  if (userId !== coordination.providerId && userId !== coordination.receiverId) {
    throw new Error('Only participants can update status');
  }

  if (coordination.status !== 'scheduled' && coordination.status !== 'pending') {
    throw new Error(`Cannot mark ${coordination.status} coordination as in-progress`);
  }

  await db.updatePickupCoordination(coordinationId, {
    status: 'in-progress',
  });
}

/**
 * Complete the pickup coordination
 * REQ-SHARE-013: Confirm completion
 */
export async function completePickupCoordination(
  coordinationId: string,
  userId: string,
  confirmationNote?: string
): Promise<void> {
  requireValidIdentifier(coordinationId, 'Coordination ID');
  requireValidIdentifier(userId, 'User ID');

  const coordination = db.getPickupCoordination(coordinationId);
  if (!coordination) {
    throw new Error('Pickup coordination not found');
  }

  // Verify user is part of this coordination
  if (userId !== coordination.providerId && userId !== coordination.receiverId) {
    throw new Error('Only participants can complete coordination');
  }

  if (coordination.status === 'cancelled' || coordination.status === 'completed') {
    throw new Error(`Coordination is already ${coordination.status}`);
  }

  const now = Date.now();

  // Update status and add completion message in one operation
  await db.update((doc) => {
    const coord = doc.pickupCoordinations[coordinationId];
    if (coord) {
      coord.status = 'completed';
      coord.completedAt = now;
      coord.completedBy = userId;

      // Add completion message if provided
      if (confirmationNote) {
        const message = {
          id: generateMessageId(),
          senderId: userId,
          content: sanitizeUserContent(`✓ Pickup completed: ${confirmationNote}`),
          timestamp: now,
        };
        coord.messages.push(message);
      }

      coord.updatedAt = now;
    }
  });

  // Record completion event
  const resource = db.getResource(coordination.resourceId);
  if (resource) {
    const note = confirmationNote
      ? `Pickup completed: ${resource.name} - ${sanitizeUserContent(confirmationNote)}`
      : `Pickup completed: ${resource.name}`;

    await db.recordEvent({
      action: resource.shareMode === 'give' ? 'give' : 'lend',
      providerId: coordination.providerId,
      receiverId: coordination.receiverId,
      resourceId: coordination.resourceId,
      note,
    });
  }
}

/**
 * Cancel the pickup coordination
 */
export async function cancelPickupCoordination(
  coordinationId: string,
  userId: string,
  reason?: string
): Promise<void> {
  requireValidIdentifier(coordinationId, 'Coordination ID');
  requireValidIdentifier(userId, 'User ID');

  const coordination = db.getPickupCoordination(coordinationId);
  if (!coordination) {
    throw new Error('Pickup coordination not found');
  }

  // Verify user is part of this coordination
  if (userId !== coordination.providerId && userId !== coordination.receiverId) {
    throw new Error('Only participants can cancel coordination');
  }

  if (coordination.status === 'cancelled' || coordination.status === 'completed') {
    throw new Error(`Coordination is already ${coordination.status}`);
  }

  const now = Date.now();

  // Update status and add cancellation message in one operation
  await db.update((doc) => {
    const coord = doc.pickupCoordinations[coordinationId];
    if (coord) {
      coord.status = 'cancelled';

      // Add cancellation message if provided
      if (reason) {
        const message = {
          id: generateMessageId(),
          senderId: userId,
          content: sanitizeUserContent(`Cancelled: ${reason}`),
          timestamp: now,
        };
        coord.messages.push(message);
      }

      coord.updatedAt = now;
    }
  });
}

/**
 * Get pending coordinations (need attention)
 */
export function getPendingCoordinations(userId: string): PickupCoordination[] {
  return getMyPickupCoordinations(userId)
    .filter(pc => pc.status === 'pending' || pc.status === 'scheduled');
}

/**
 * Get active coordinations (in progress)
 */
export function getActiveCoordinations(userId: string): PickupCoordination[] {
  return getMyPickupCoordinations(userId)
    .filter(pc => pc.status === 'in-progress');
}

/**
 * Get completed coordinations (history)
 */
export function getCompletedCoordinations(userId: string): PickupCoordination[] {
  return getMyPickupCoordinations(userId)
    .filter(pc => pc.status === 'completed');
}

/**
 * Get coordination summary with resource and user details
 */
export function getCoordinationSummary(coordinationId: string): {
  coordination: PickupCoordination;
  resource: Resource | undefined;
  provider: UserProfile | undefined;
  receiver: UserProfile | undefined;
} | undefined {
  const coordination = getPickupCoordination(coordinationId);
  if (!coordination) {
    return undefined;
  }

  return {
    coordination,
    resource: db.getResource(coordination.resourceId),
    provider: db.getUserProfile(coordination.providerId),
    receiver: db.getUserProfile(coordination.receiverId),
  };
}

/**
 * Helper function to generate unique message IDs
 */
function generateMessageId(): string {
  return `msg-${uuidv4()}`;
}

/**
 * Format pickup coordination for display
 */
export function formatPickupCoordination(
  coordination: PickupCoordination,
  currentUserId: string
): {
  title: string;
  status: string;
  details: string[];
  isProvider: boolean;
  isReceiver: boolean;
} {
  const resource = db.getResource(coordination.resourceId);
  const resourceName = resource?.name || 'Unknown item';

  const isProvider = coordination.providerId === currentUserId;
  const isReceiver = coordination.receiverId === currentUserId;

  const otherUserId = isProvider ? coordination.receiverId : coordination.providerId;
  const otherUser = db.getUserProfile(otherUserId);
  const otherUserName = otherUser?.displayName || 'Community member';

  const title = isProvider
    ? `Providing: ${resourceName} to ${otherUserName}`
    : `Receiving: ${resourceName} from ${otherUserName}`;

  const statusEmoji: Record<PickupStatus, string> = {
    'pending': '⏳',
    'scheduled': '📅',
    'in-progress': '🚚',
    'completed': '✓',
    'cancelled': '✗',
  };

  const status = `${statusEmoji[coordination.status]} ${coordination.status.charAt(0).toUpperCase() + coordination.status.slice(1)}`;

  const details: string[] = [];

  if (coordination.method) {
    const methodLabels: Record<PickupMethod, string> = {
      'pickup': '📍 Pickup',
      'delivery': '🚚 Delivery',
      'meetup': '🤝 Meetup',
      'other': '📋 Other arrangement',
    };
    details.push(methodLabels[coordination.method]);
  }

  if (coordination.scheduledTime) {
    details.push(`📅 ${new Date(coordination.scheduledTime).toLocaleString()}`);
  }

  if (coordination.location) {
    details.push(`📍 ${coordination.location}`);
  }

  if (coordination.messages.length > 0) {
    details.push(`💬 ${coordination.messages.length} message${coordination.messages.length > 1 ? 's' : ''}`);
  }

  return {
    title,
    status,
    details,
    isProvider,
    isReceiver,
  };
}
