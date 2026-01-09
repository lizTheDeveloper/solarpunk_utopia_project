/**
 * Pickup Coordination CLI Interface
 * REQ-SHARE-013: Resource Pickup and Delivery
 * Phase 3, Group C: Tool Library & Equipment
 *
 * Command-line interface for managing pickup coordination
 */

import { db } from '../core/database';
import {
  createPickupCoordination,
  getMyPickupCoordinations,
  getPickupCoordination,
  addPickupMessage,
  schedulePickup,
  markPickupInProgress,
  completePickupCoordination,
  cancelPickupCoordination,
  getPendingCoordinations,
  getActiveCoordinations,
  getCompletedCoordinations,
  formatPickupCoordination,
  type PickupCoordination,
  type PickupMethod,
} from './pickup-coordination';

/**
 * Format date and time for display
 */
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a relative time (e.g., "in 2 hours", "3 days ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  const minutes = Math.floor(absDiff / (60 * 1000));
  const hours = Math.floor(absDiff / (60 * 60 * 1000));
  const days = Math.floor(absDiff / (24 * 60 * 60 * 1000));

  if (absDiff < 60 * 1000) {
    return 'now';
  } else if (minutes < 60) {
    const suffix = diff > 0 ? 'from now' : 'ago';
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${suffix}`;
  } else if (hours < 24) {
    const suffix = diff > 0 ? 'from now' : 'ago';
    return `${hours} hour${hours !== 1 ? 's' : ''} ${suffix}`;
  } else {
    const suffix = diff > 0 ? 'from now' : 'ago';
    return `${days} day${days !== 1 ? 's' : ''} ${suffix}`;
  }
}

/**
 * Display a single coordination in detail
 */
export function displayCoordination(coordinationId: string, currentUserId: string): void {
  const coordination = getPickupCoordination(coordinationId);
  if (!coordination) {
    console.log('Coordination not found.');
    return;
  }

  const resource = db.getResource(coordination.resourceId);
  const provider = db.getUserProfile(coordination.providerId);
  const receiver = db.getUserProfile(coordination.receiverId);

  const resourceName = resource?.name || 'Unknown item';
  const providerName = provider?.displayName || 'Unknown';
  const receiverName = receiver?.displayName || 'Unknown';

  const isProvider = coordination.providerId === currentUserId;
  const isReceiver = coordination.receiverId === currentUserId;
  const role = isProvider ? 'PROVIDER' : 'RECEIVER';

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`📦 Pickup Coordination - ${role}`);
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`Item:     ${resourceName}`);
  console.log(`Provider: ${providerName}`);
  console.log(`Receiver: ${receiverName}`);
  console.log(`Status:   ${coordination.status.toUpperCase()}`);
  console.log(`Method:   ${coordination.method}`);

  if (coordination.scheduledTime) {
    console.log(`Scheduled: ${formatDateTime(coordination.scheduledTime)}`);
    console.log(`           (${formatRelativeTime(coordination.scheduledTime)})`);
  }

  if (coordination.location) {
    console.log(`Location: ${coordination.location}`);
  }

  if (coordination.directions) {
    console.log(`Directions: ${coordination.directions}`);
  }

  if (coordination.messages.length > 0) {
    console.log('\n───────────────────────────────────────────────────');
    console.log('Messages:');
    console.log('───────────────────────────────────────────────────');

    coordination.messages.forEach(msg => {
      const sender = db.getUserProfile(msg.senderId);
      const senderName = sender?.displayName || 'Unknown';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const isMe = msg.senderId === currentUserId;

      console.log(`\n[${time}] ${senderName}${isMe ? ' (you)' : ''}:`);
      console.log(`  ${msg.content}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════\n');
}

/**
 * List all my pickup coordinations
 */
export function listMyCoordinations(userId: string): void {
  const coordinations = getMyPickupCoordinations(userId);

  if (coordinations.length === 0) {
    console.log('\nNo pickup coordinations found.\n');
    return;
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('My Pickup Coordinations');
  console.log('═══════════════════════════════════════════════════\n');

  coordinations.forEach((coord, index) => {
    const formatted = formatPickupCoordination(coord, userId);
    const statusIcon = coord.status === 'completed' ? '✓' :
                       coord.status === 'cancelled' ? '✗' :
                       coord.status === 'in-progress' ? '🚚' :
                       coord.status === 'scheduled' ? '📅' : '⏳';

    console.log(`${index + 1}. ${statusIcon} ${formatted.title}`);
    console.log(`   ${formatted.status}`);
    formatted.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
    console.log(`   ID: ${coord.id}\n`);
  });

  console.log('═══════════════════════════════════════════════════\n');
}

/**
 * List pending coordinations that need attention
 */
export function listPendingCoordinations(userId: string): void {
  const coordinations = getPendingCoordinations(userId);

  if (coordinations.length === 0) {
    console.log('\nNo pending pickup coordinations.\n');
    return;
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('⏳ Pending Pickup Coordinations');
  console.log('═══════════════════════════════════════════════════\n');

  coordinations.forEach((coord, index) => {
    const formatted = formatPickupCoordination(coord, userId);
    const role = formatted.isProvider ? '[PROVIDER]' : '[RECEIVER]';

    console.log(`${index + 1}. ${role} ${formatted.title}`);
    console.log(`   ${formatted.status}`);
    formatted.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
    console.log(`   ID: ${coord.id}\n`);
  });

  console.log('═══════════════════════════════════════════════════\n');
}

/**
 * Create a new pickup coordination (CLI helper)
 */
export async function createNewCoordination(
  resourceId: string,
  providerId: string,
  receiverId: string,
  options?: {
    method?: PickupMethod;
    initialMessage?: string;
  }
): Promise<void> {
  try {
    const coordination = await createPickupCoordination(
      resourceId,
      providerId,
      receiverId,
      options
    );

    console.log('\n✓ Pickup coordination created successfully!\n');
    console.log(`Coordination ID: ${coordination.id}`);

    const resource = db.getResource(resourceId);
    if (resource) {
      console.log(`Item: ${resource.name}`);
    }
    console.log(`Status: ${coordination.status}`);
    console.log(`Method: ${coordination.method}\n`);
  } catch (error) {
    console.error('\n✗ Failed to create pickup coordination:');
    console.error(`  ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Send a message in a coordination
 */
export async function sendMessage(
  coordinationId: string,
  senderId: string,
  message: string
): Promise<void> {
  try {
    await addPickupMessage(coordinationId, senderId, message);
    console.log('\n✓ Message sent!\n');
  } catch (error) {
    console.error('\n✗ Failed to send message:');
    console.error(`  ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Schedule a pickup
 */
export async function schedulePickupCLI(
  coordinationId: string,
  userId: string,
  scheduledTime: number,
  location?: string,
  directions?: string,
  method?: PickupMethod
): Promise<void> {
  try {
    await schedulePickup(coordinationId, userId, {
      scheduledTime,
      location,
      directions,
      method,
    });

    console.log('\n✓ Pickup scheduled successfully!\n');
    console.log(`Time: ${formatDateTime(scheduledTime)}`);
    if (location) {
      console.log(`Location: ${location}`);
    }
    console.log('');
  } catch (error) {
    console.error('\n✗ Failed to schedule pickup:');
    console.error(`  ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Mark pickup as in progress
 */
export async function markInProgressCLI(
  coordinationId: string,
  userId: string
): Promise<void> {
  try {
    await markPickupInProgress(coordinationId, userId);
    console.log('\n✓ Pickup marked as in progress!\n');
  } catch (error) {
    console.error('\n✗ Failed to update status:');
    console.error(`  ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Complete a pickup coordination
 */
export async function completePickupCLI(
  coordinationId: string,
  userId: string,
  confirmationNote?: string
): Promise<void> {
  try {
    await completePickupCoordination(coordinationId, userId, confirmationNote);
    console.log('\n✓ Pickup completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Failed to complete pickup:');
    console.error(`  ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Cancel a pickup coordination
 */
export async function cancelPickupCLI(
  coordinationId: string,
  userId: string,
  reason?: string
): Promise<void> {
  try {
    await cancelPickupCoordination(coordinationId, userId, reason);
    console.log('\n✓ Pickup cancelled.\n');
  } catch (error) {
    console.error('\n✗ Failed to cancel pickup:');
    console.error(`  ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

/**
 * Show coordination summary
 */
export function showCoordinationSummary(userId: string): void {
  const pending = getPendingCoordinations(userId);
  const active = getActiveCoordinations(userId);
  const completed = getCompletedCoordinations(userId);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('Pickup Coordination Summary');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`⏳ Pending:     ${pending.length}`);
  console.log(`🚚 In Progress: ${active.length}`);
  console.log(`✓  Completed:   ${completed.length}\n`);

  if (pending.length > 0) {
    console.log('Next pending pickups:');
    pending.slice(0, 3).forEach((coord, index) => {
      const resource = db.getResource(coord.resourceId);
      const resourceName = resource?.name || 'Unknown';
      const time = coord.scheduledTime
        ? ` - ${formatRelativeTime(coord.scheduledTime)}`
        : '';
      console.log(`  ${index + 1}. ${resourceName}${time}`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════\n');
}
