/**
 * Example usage of the Missed Check-In Alert System
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 *
 * This file demonstrates how to set up and use the missed check-in alert system
 */

import { db } from '../core/database';
import {
  setupCareCircle,
  checkForMissedCheckIns,
  startCheckInMonitoring,
  getMissedCheckInSummary,
  enableCheckInMonitoring,
  disableCheckInMonitoring,
} from './missed-check-in-alerts';
import { submitCheckIn } from './check-in';

/**
 * Example 1: Set up a care circle for an elderly community member
 */
export async function exampleSetupCareCircle() {
  // Elderly member who lives alone
  const elderlyUserId = 'user-elderly-1';

  // Care circle members (family, neighbors, friends)
  const careCircleMembers = [
    'user-neighbor-1',
    'user-family-1',
    'user-friend-1',
  ];

  // Create care circle with daily check-ins
  const careCircle = await setupCareCircle(elderlyUserId, careCircleMembers, {
    checkInEnabled: true,
    checkInFrequency: 'daily',
    missedCheckInThreshold: 26, // Alert if no check-in within 26 hours
    escalationThreshold: 2, // Escalate after 2 consecutive missed check-ins
    preferredCheckInTime: 9 * 60, // 9:00 AM (in minutes from midnight)
  });

  console.log('Care circle created:', careCircle);
}

/**
 * Example 2: Set up care circle for someone needing twice-daily check-ins
 */
export async function exampleTwiceDailyCheckIns() {
  const userId = 'user-disabled-1';

  const careCircle = await setupCareCircle(userId, ['user-caregiver-1', 'user-caregiver-2'], {
    checkInEnabled: true,
    checkInFrequency: 'twice-daily',
    missedCheckInThreshold: 14, // Alert if no check-in within 14 hours
    escalationThreshold: 3, // More tolerance for twice-daily
  });

  console.log('Twice-daily care circle created:', careCircle);
}

/**
 * Example 3: Submit a check-in (which clears any alerts)
 */
export async function exampleSubmitCheckIn() {
  const userId = 'user-elderly-1';

  // Submit "I'm okay" check-in
  await submitCheckIn(userId, 'okay');

  console.log('Check-in submitted, any alerts cleared');
}

/**
 * Example 4: Manually check for missed check-ins
 */
export async function exampleCheckForMissed() {
  // This would typically run on a schedule (e.g., every hour)
  const alerts = await checkForMissedCheckIns();

  if (alerts.length > 0) {
    console.log(`Found ${alerts.length} missed check-in(s):`);
    alerts.forEach(alert => {
      console.log(`- User ${alert.userId} has missed ${alert.consecutiveMissed} check-in(s)`);
      if (alert.escalated) {
        console.log('  ⚠️ ESCALATED - Multiple consecutive misses');
      }
    });
  } else {
    console.log('No missed check-ins');
  }
}

/**
 * Example 5: Start automatic monitoring
 */
export async function exampleStartMonitoring() {
  // Check every 60 minutes
  const stopMonitoring = startCheckInMonitoring(60);

  console.log('Check-in monitoring started');

  // To stop monitoring later:
  // stopMonitoring();
}

/**
 * Example 6: Get summary for a user
 */
export async function exampleGetSummary() {
  const userId = 'user-elderly-1';
  const summary = getMissedCheckInSummary(userId);

  console.log('Check-in summary:', {
    'Has care circle': summary.hasCareCircle,
    'Monitoring enabled': summary.monitoringEnabled,
    'Has active alert': summary.hasActiveAlert,
    'Consecutive missed': summary.consecutiveMissed,
    'Escalated': summary.escalated,
    'Hours since last check-in': summary.hoursSinceLastCheckIn,
  });
}

/**
 * Example 7: Temporarily pause monitoring (e.g., during vacation)
 */
export async function examplePauseMonitoring() {
  const userId = 'user-elderly-1';

  // Pause monitoring
  await disableCheckInMonitoring(userId);
  console.log('Monitoring paused for vacation');

  // Resume later
  await enableCheckInMonitoring(userId);
  console.log('Monitoring resumed');
}

/**
 * Example 8: Scenario - elderly member's routine
 */
export async function exampleDailyRoutine() {
  const elderlyUserId = 'user-elderly-1';
  const caregiverUserId = 'user-neighbor-1';

  // Day 1: Check in normally
  console.log('Day 1: Elder checks in');
  await submitCheckIn(elderlyUserId, 'okay');

  // Day 2: Missed check-in
  console.log('Day 2: Elder forgets to check in');
  // (24 hours pass, no check-in)

  // Hour 26: System detects missed check-in
  console.log('Hour 26: Checking for missed check-ins');
  const alerts = await checkForMissedCheckIns();

  if (alerts.length > 0) {
    console.log('Alert sent to care circle!');
    // Care circle members would see this in their UI

    // Neighbor checks on elder
    console.log('Neighbor checks on elder, finds them okay');
    // Elder checks in
    await submitCheckIn(elderlyUserId, 'okay', 'Sorry, forgot to check in!');
    console.log('Check-in received, alerts cleared');
  }
}

/**
 * Example 9: Escalation scenario
 */
export async function exampleEscalation() {
  const userId = 'user-elderly-1';

  // Multiple days pass without check-in
  console.log('Day 1: No check-in');
  await checkForMissedCheckIns(); // Alert created

  console.log('Day 2: Still no check-in');
  await checkForMissedCheckIns(); // Alert escalated

  const summary = getMissedCheckInSummary(userId);
  if (summary.escalated) {
    console.log('⚠️ ESCALATED: Multiple consecutive missed check-ins');
    console.log('Care circle should check on this person immediately');
  }
}

/**
 * Example 10: Complete workflow
 */
export async function exampleCompleteWorkflow() {
  // 1. Set up care circle
  const elderUserId = 'user-elder';
  const careMembers = ['user-daughter', 'user-neighbor'];

  await setupCareCircle(elderUserId, careMembers, {
    checkInEnabled: true,
    checkInFrequency: 'daily',
    missedCheckInThreshold: 26,
    escalationThreshold: 2,
  });

  console.log('✓ Care circle set up');

  // 2. Start monitoring
  const stopMonitoring = startCheckInMonitoring(60);
  console.log('✓ Monitoring started');

  // 3. Elder checks in daily
  await submitCheckIn(elderUserId, 'okay');
  console.log('✓ Check-in submitted');

  // 4. If check-in is missed, care circle is alerted automatically
  // (happens in background via startCheckInMonitoring)

  // 5. Care circle members can see alerts in their UI
  // (rendered via renderMissedCheckInAlerts)

  console.log('✓ Complete workflow example done');
}
