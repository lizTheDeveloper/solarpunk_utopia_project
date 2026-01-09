/**
 * Missed Check-In Alert System
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 *
 * Detects when check-ins are missed and alerts designated care circles
 * Escalates appropriately if multiple check-ins missed
 */

import { db } from '../core/database';
import type { CareCircle, MissedCheckInAlert } from '../types';

/**
 * Check all care circles for missed check-ins
 * This should be run periodically (e.g., every hour)
 */
export async function checkForMissedCheckIns(): Promise<MissedCheckInAlert[]> {
  const alerts: MissedCheckInAlert[] = [];
  const careCircles = db.listCareCircles();
  const now = Date.now();

  for (const careCircle of careCircles) {
    // Only check if monitoring is enabled
    if (!careCircle.checkInEnabled) continue;

    const latestCheckIn = db.getLatestCheckIn(careCircle.userId);
    const hoursSinceLastCheckIn = latestCheckIn
      ? (now - latestCheckIn.createdAt) / (1000 * 60 * 60)
      : Infinity;

    // Determine if check-in is overdue
    const isOverdue = hoursSinceLastCheckIn > careCircle.missedCheckInThreshold;

    if (isOverdue) {
      // Count consecutive missed check-ins
      const consecutiveMissed = countConsecutiveMissedCheckIns(
        careCircle.userId,
        careCircle.checkInFrequency,
        careCircle.missedCheckInThreshold
      );

      // Check if we already have an active alert for this situation
      const existingAlert = db.listMissedCheckInAlerts().find(
        alert =>
          alert.userId === careCircle.userId &&
          alert.careCircleId === careCircle.id &&
          !alert.acknowledged
      );

      if (existingAlert) {
        // Update existing alert with new consecutive count
        if (existingAlert.consecutiveMissed !== consecutiveMissed) {
          await db.updateMissedCheckInAlert(existingAlert.id, {
            consecutiveMissed,
            escalated: consecutiveMissed >= careCircle.escalationThreshold,
          });
        }
      } else {
        // Create new alert
        const alert = await db.addMissedCheckInAlert({
          userId: careCircle.userId,
          careCircleId: careCircle.id,
          consecutiveMissed,
          lastCheckInAt: latestCheckIn?.createdAt,
          alertSentAt: now,
          escalated: consecutiveMissed >= careCircle.escalationThreshold,
          acknowledged: false,
        });
        alerts.push(alert);
      }
    }
  }

  return alerts;
}

/**
 * Count how many consecutive check-ins have been missed
 */
function countConsecutiveMissedCheckIns(
  userId: string,
  frequency: 'daily' | 'twice-daily' | 'weekly',
  thresholdHours: number
): number {
  const latestCheckIn = db.getLatestCheckIn(userId);
  const now = Date.now();

  if (!latestCheckIn) {
    // No check-ins ever - count as 1 missed
    return 1;
  }

  const hoursSinceLastCheckIn = (now - latestCheckIn.createdAt) / (1000 * 60 * 60);

  // Calculate expected intervals based on frequency
  const intervalHours = {
    'twice-daily': 12,
    'daily': 24,
    'weekly': 168,
  }[frequency];

  // Count how many intervals have been missed
  const missedIntervals = Math.floor(hoursSinceLastCheckIn / intervalHours);

  return Math.max(1, missedIntervals);
}

/**
 * Acknowledge a missed check-in alert
 */
export async function acknowledgeMissedCheckInAlert(
  alertId: string,
  acknowledgedBy: string
): Promise<void> {
  const alert = db.getMissedCheckInAlert(alertId);
  if (!alert) return;

  const acknowledgers = alert.acknowledgedBy || [];
  if (!acknowledgers.includes(acknowledgedBy)) {
    acknowledgers.push(acknowledgedBy);
  }

  await db.updateMissedCheckInAlert(alertId, {
    acknowledged: true,
    acknowledgedBy: acknowledgers,
  });
}

/**
 * Clear alerts for a user (e.g., when they check in)
 */
export async function clearAlertsForUser(userId: string): Promise<void> {
  const alerts = db.listMissedCheckInAlerts().filter(
    alert => alert.userId === userId && !alert.acknowledged
  );

  for (const alert of alerts) {
    await db.updateMissedCheckInAlert(alert.id, {
      acknowledged: true,
    });
  }
}

/**
 * Get alerts for care circles the user is a member of
 */
export function getMyMissedCheckInAlerts(memberId: string): MissedCheckInAlert[] {
  return db.getAlertsForCareCircleMember(memberId);
}

/**
 * Create or update a care circle
 */
export async function setupCareCircle(
  userId: string,
  members: string[],
  options: {
    checkInEnabled?: boolean;
    preferredCheckInTime?: number;
    checkInFrequency?: 'daily' | 'twice-daily' | 'weekly';
    missedCheckInThreshold?: number;
    escalationThreshold?: number;
  } = {}
): Promise<CareCircle> {
  const existing = db.getUserCareCircle(userId);

  if (existing) {
    // Update existing care circle
    await db.updateCareCircle(existing.id, {
      members,
      ...options,
    });
    return db.getCareCircle(existing.id)!;
  } else {
    // Create new care circle with defaults
    const careCircleData: any = {
      userId,
      members,
      checkInEnabled: options.checkInEnabled ?? true,
      checkInFrequency: options.checkInFrequency ?? 'daily',
      missedCheckInThreshold: options.missedCheckInThreshold ?? 26, // 26 hours = more than a day
      escalationThreshold: options.escalationThreshold ?? 2, // Escalate after 2 missed check-ins
    };

    // Only add preferredCheckInTime if it's defined (Automerge doesn't accept undefined)
    if (options.preferredCheckInTime !== undefined) {
      careCircleData.preferredCheckInTime = options.preferredCheckInTime;
    }

    return await db.addCareCircle(careCircleData);
  }
}

/**
 * Get care circle for a user
 */
export function getCareCircle(userId: string): CareCircle | undefined {
  return db.getUserCareCircle(userId);
}

/**
 * Disable check-in monitoring for a user
 */
export async function disableCheckInMonitoring(userId: string): Promise<void> {
  const careCircle = db.getUserCareCircle(userId);
  if (careCircle) {
    await db.updateCareCircle(careCircle.id, {
      checkInEnabled: false,
    });
  }
}

/**
 * Enable check-in monitoring for a user
 */
export async function enableCheckInMonitoring(userId: string): Promise<void> {
  const careCircle = db.getUserCareCircle(userId);
  if (careCircle) {
    await db.updateCareCircle(careCircle.id, {
      checkInEnabled: true,
    });
  }
}

/**
 * Get summary of missed check-in situation
 */
export function getMissedCheckInSummary(userId: string): {
  hasCareCircle: boolean;
  monitoringEnabled: boolean;
  hasActiveAlert: boolean;
  consecutiveMissed: number;
  escalated: boolean;
  hoursSinceLastCheckIn: number | null;
} {
  const careCircle = db.getUserCareCircle(userId);
  const latestCheckIn = db.getLatestCheckIn(userId);
  const activeAlerts = db.listMissedCheckInAlerts().filter(
    alert => alert.userId === userId && !alert.acknowledged
  );

  const hoursSinceLastCheckIn = latestCheckIn
    ? (Date.now() - latestCheckIn.createdAt) / (1000 * 60 * 60)
    : null;

  const latestAlert = activeAlerts.sort((a, b) => b.alertSentAt - a.alertSentAt)[0];

  return {
    hasCareCircle: !!careCircle,
    monitoringEnabled: careCircle?.checkInEnabled ?? false,
    hasActiveAlert: activeAlerts.length > 0,
    consecutiveMissed: latestAlert?.consecutiveMissed ?? 0,
    escalated: latestAlert?.escalated ?? false,
    hoursSinceLastCheckIn,
  };
}

/**
 * Start periodic check-in monitoring
 * Returns a function to stop monitoring
 */
export function startCheckInMonitoring(intervalMinutes: number = 60): () => void {
  const intervalId = setInterval(() => {
    checkForMissedCheckIns().catch(error => {
      console.error('Error checking for missed check-ins:', error);
    });
  }, intervalMinutes * 60 * 1000);

  // Run immediately on start
  checkForMissedCheckIns().catch(error => {
    console.error('Error checking for missed check-ins:', error);
  });

  return () => clearInterval(intervalId);
}
