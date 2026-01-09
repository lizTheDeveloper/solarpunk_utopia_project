/**
 * Emergency Contact Circles
 * REQ-CARE-002: Emergency Alert System
 *
 * Enables vulnerable members to quickly alert their care network
 * in case of emergency or urgent need.
 */

import { db } from '../core/database';
import type { EmergencyAlert, CareCircle } from '../types';

/**
 * Trigger an emergency alert to care circle
 */
export async function triggerEmergencyAlert(
  userId: string,
  options: {
    message?: string;
    location?: { latitude: number; longitude: number };
    contactEmergencyServices?: boolean;
    severity?: 'urgent' | 'emergency';
  } = {}
): Promise<EmergencyAlert> {
  const careCircle = db.getUserCareCircle(userId);

  if (!careCircle) {
    throw new Error('No care circle configured. Please set up a care circle before triggering emergency alerts.');
  }

  // Build alert data, excluding undefined values (Automerge doesn't accept undefined)
  const alertData: any = {
    userId,
    careCircleId: careCircle.id,
    severity: options.severity || 'emergency',
    contactEmergencyServices: options.contactEmergencyServices || false,
    triggeredAt: Date.now(),
    resolved: false,
    responses: [],
  };

  // Only add optional fields if they are defined
  if (options.message !== undefined) {
    alertData.message = options.message;
  }
  if (options.location !== undefined) {
    alertData.location = options.location;
  }

  const alert = await db.addEmergencyAlert(alertData);

  // Log the emergency event
  await db.recordEvent({
    action: 'emergency-alert',
    providerId: userId,
    receiverId: 'system',
    resourceId: alert.id,
    note: `Emergency alert triggered: ${options.severity || 'emergency'}`,
  });

  return alert;
}

/**
 * Respond to an emergency alert
 */
export async function respondToEmergencyAlert(
  alertId: string,
  responderId: string,
  response: {
    message?: string;
    eta?: number; // Estimated time of arrival in minutes
    status: 'on-way' | 'contacted' | 'arrived' | 'resolved';
  }
): Promise<void> {
  const alert = db.getEmergencyAlert(alertId);
  if (!alert) {
    throw new Error('Emergency alert not found');
  }

  if (alert.resolved) {
    throw new Error('This emergency alert has already been resolved');
  }

  const careCircle = db.getCareCircle(alert.careCircleId);
  if (!careCircle || !careCircle.members.includes(responderId)) {
    throw new Error('Only care circle members can respond to emergency alerts');
  }

  // Build response record, excluding undefined values (Automerge doesn't accept undefined)
  const responseRecord: any = {
    responderId,
    timestamp: Date.now(),
    status: response.status,
  };

  if (response.message !== undefined) {
    responseRecord.message = response.message;
  }
  if (response.eta !== undefined) {
    responseRecord.eta = response.eta;
  }

  // Update the alert directly using db.update to properly handle Automerge arrays
  const isResolved = response.status === 'arrived' || response.status === 'resolved';

  await db.update((doc) => {
    const alert = doc.emergencyAlerts[alertId];
    if (alert) {
      // Push directly to the Automerge array (don't use spread operator or external references)
      alert.responses.push(responseRecord);

      // Update resolution status
      alert.resolved = isResolved;
      if (isResolved) {
        alert.resolvedAt = Date.now();
      }
    }
  });
}

/**
 * Get active emergency alerts for care circles the user is a member of
 */
export function getMyEmergencyAlerts(memberId: string): EmergencyAlert[] {
  return db.getEmergencyAlertsForMember(memberId);
}

/**
 * Get emergency alert by ID
 */
export function getEmergencyAlert(alertId: string): EmergencyAlert | undefined {
  return db.getEmergencyAlert(alertId);
}

/**
 * Resolve an emergency alert manually
 */
export async function resolveEmergencyAlert(
  alertId: string,
  resolvedBy: string,
  resolution?: string
): Promise<void> {
  const alert = db.getEmergencyAlert(alertId);
  if (!alert) {
    throw new Error('Emergency alert not found');
  }

  // Build update object, excluding undefined values
  const updates: any = {
    resolved: true,
    resolvedAt: Date.now(),
    resolvedBy,
  };

  if (resolution !== undefined) {
    updates.resolution = resolution;
  }

  await db.updateEmergencyAlert(alertId, updates);
}

/**
 * Get emergency alert history for a user
 */
export function getEmergencyAlertHistory(userId: string): EmergencyAlert[] {
  return db.listEmergencyAlerts().filter(alert => alert.userId === userId);
}

/**
 * Cancel an emergency alert (false alarm)
 */
export async function cancelEmergencyAlert(
  alertId: string,
  userId: string,
  reason?: string
): Promise<void> {
  const alert = db.getEmergencyAlert(alertId);
  if (!alert) {
    throw new Error('Emergency alert not found');
  }

  if (alert.userId !== userId) {
    throw new Error('Only the person who triggered the alert can cancel it');
  }

  await db.updateEmergencyAlert(alertId, {
    resolved: true,
    resolvedAt: Date.now(),
    resolvedBy: userId,
    resolution: reason ? `Cancelled: ${reason}` : 'Cancelled by user (false alarm)',
  });
}

/**
 * Setup emergency contacts for a user
 * This is an alias/helper for setting up a care circle focused on emergency response
 */
export async function setupEmergencyContacts(
  userId: string,
  contactIds: string[],
  options: {
    enableCheckIns?: boolean;
    checkInFrequency?: 'daily' | 'twice-daily' | 'weekly';
  } = {}
): Promise<CareCircle> {
  const { setupCareCircle } = await import('./missed-check-in-alerts');

  return setupCareCircle(userId, contactIds, {
    checkInEnabled: options.enableCheckIns ?? false, // Emergency contacts don't require check-ins
    checkInFrequency: options.checkInFrequency ?? 'daily',
    missedCheckInThreshold: 26, // Default to 26 hours
    escalationThreshold: 2, // Escalate after 2 missed check-ins
  });
}

/**
 * Add emergency contact to existing care circle
 */
export async function addEmergencyContact(
  userId: string,
  contactId: string
): Promise<void> {
  const careCircle = db.getUserCareCircle(userId);

  if (!careCircle) {
    throw new Error('No care circle found. Please set up emergency contacts first.');
  }

  if (careCircle.members.includes(contactId)) {
    throw new Error('This person is already in your emergency contacts');
  }

  const updatedMembers = [...careCircle.members, contactId];
  await db.updateCareCircle(careCircle.id, {
    members: updatedMembers,
  });
}

/**
 * Remove emergency contact from care circle
 */
export async function removeEmergencyContact(
  userId: string,
  contactId: string
): Promise<void> {
  const careCircle = db.getUserCareCircle(userId);

  if (!careCircle) {
    throw new Error('No care circle found');
  }

  const updatedMembers = careCircle.members.filter(id => id !== contactId);

  if (updatedMembers.length === 0) {
    throw new Error('Cannot remove last emergency contact. Care circle must have at least one member.');
  }

  await db.updateCareCircle(careCircle.id, {
    members: updatedMembers,
  });
}

/**
 * Get emergency contacts for a user
 */
export function getEmergencyContacts(userId: string): string[] {
  const careCircle = db.getUserCareCircle(userId);
  return careCircle?.members || [];
}

/**
 * Check if user has emergency contacts set up
 */
export function hasEmergencyContacts(userId: string): boolean {
  const careCircle = db.getUserCareCircle(userId);
  return !!careCircle && careCircle.members.length > 0;
}
