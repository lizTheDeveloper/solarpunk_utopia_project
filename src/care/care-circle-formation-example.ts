/**
 * Care Circle Formation Example
 * Demonstrates the care circle formation workflow
 * REQ-CARE-001: Care circle coordination
 */

import { db } from '../core/database';
import {
  createCareCircle,
  addCareCircleMember,
  updateCareCircleSettings,
  renderCareCircleFormation,
  initCareCircleFormationHandlers,
} from './care-circle-formation';
import { getCareCircle } from './missed-check-in-alerts';

/**
 * Example: Setting up a care circle for an elderly community member
 */
export async function exampleElderlyCare() {
  console.log('=== Example: Elderly Care Circle Setup ===\n');

  // Initialize database
  await db.init();

  // Create community members
  await db.setUserProfile({
    id: 'margaret-elderly',
    did: 'did:key:margaret',
    displayName: 'Margaret (85)',
    bio: 'Retired teacher, lives alone, needs regular check-ins',
    joinedAt: Date.now(),
    publicKey: 'margaret-key',
  });

  await db.setUserProfile({
    id: 'sarah-neighbor',
    did: 'did:key:sarah',
    displayName: 'Sarah',
    bio: 'Neighbor, works from home',
    joinedAt: Date.now(),
    publicKey: 'sarah-key',
  });

  await db.setUserProfile({
    id: 'james-volunteer',
    did: 'did:key:james',
    displayName: 'James',
    bio: 'Community volunteer with medical training',
    joinedAt: Date.now(),
    publicKey: 'james-key',
  });

  await db.setUserProfile({
    id: 'kim-family',
    did: 'did:key:kim',
    displayName: 'Kim',
    bio: "Margaret's niece, lives nearby",
    joinedAt: Date.now(),
    publicKey: 'kim-key',
  });

  // Margaret creates a care circle with daily check-ins
  console.log('Margaret is setting up her care circle...');
  const careCircle = await createCareCircle(
    'margaret-elderly',
    ['sarah-neighbor', 'james-volunteer', 'kim-family'],
    {
      checkInEnabled: true,
      checkInFrequency: 'daily',
      preferredCheckInTime: 9 * 60, // 9:00 AM
      missedCheckInThreshold: 26, // 26 hours (more than a day)
      escalationThreshold: 2, // Escalate after 2 missed check-ins
    }
  );

  console.log('Care circle created!');
  console.log(`- ID: ${careCircle.id}`);
  console.log(`- Members: ${careCircle.members.length} people`);
  console.log(`- Check-in frequency: ${careCircle.checkInFrequency}`);
  console.log(`- Preferred time: 9:00 AM`);
  console.log(`- Monitoring: ${careCircle.checkInEnabled ? 'Active' : 'Paused'}\n`);

  // View the care circle
  const retrievedCircle = getCareCircle('margaret-elderly');
  console.log('Retrieved care circle:', retrievedCircle);
}

/**
 * Example: Setting up a care circle for a disabled community member
 */
export async function exampleDisabilityCare() {
  console.log('=== Example: Disability Care Circle Setup ===\n');

  // Initialize database
  await db.init();

  // Create community members
  await db.setUserProfile({
    id: 'alex-disabled',
    did: 'did:key:alex',
    displayName: 'Alex',
    bio: 'Wheelchair user, chronic illness, needs assistance with errands',
    joinedAt: Date.now(),
    publicKey: 'alex-key',
  });

  await db.setUserProfile({
    id: 'jordan-support',
    did: 'did:key:jordan',
    displayName: 'Jordan',
    bio: 'Disability advocate, peer support',
    joinedAt: Date.now(),
    publicKey: 'jordan-key',
  });

  await db.setUserProfile({
    id: 'taylor-aide',
    did: 'did:key:taylor',
    displayName: 'Taylor',
    bio: 'Personal care assistant',
    joinedAt: Date.now(),
    publicKey: 'taylor-key',
  });

  // Alex creates a care circle
  console.log('Alex is setting up their care circle...');
  const careCircle = await createCareCircle(
    'alex-disabled',
    ['jordan-support', 'taylor-aide'],
    {
      checkInEnabled: true,
      checkInFrequency: 'twice-daily',
      preferredCheckInTime: 10 * 60, // 10:00 AM and 10:00 PM
      missedCheckInThreshold: 14, // 14 hours
      escalationThreshold: 2,
    }
  );

  console.log('Care circle created!');
  console.log(`- Members: ${careCircle.members.length} people`);
  console.log(`- Check-in frequency: ${careCircle.checkInFrequency}`);
  console.log(`- Alert threshold: ${careCircle.missedCheckInThreshold} hours\n`);

  // Later, Alex adds another member
  console.log('Alex adds another trusted member to the circle...');
  await db.setUserProfile({
    id: 'pat-friend',
    did: 'did:key:pat',
    displayName: 'Pat',
    bio: 'Close friend, available for emergencies',
    joinedAt: Date.now(),
    publicKey: 'pat-key',
  });

  await addCareCircleMember('alex-disabled', 'pat-friend');
  const updatedCircle = getCareCircle('alex-disabled');
  console.log(`Updated circle now has ${updatedCircle?.members.length} members\n`);
}

/**
 * Example: Temporary care circle for recovery
 */
export async function exampleRecoveryCare() {
  console.log('=== Example: Recovery Care Circle (Temporary) ===\n');

  // Initialize database
  await db.init();

  // Create community members
  await db.setUserProfile({
    id: 'casey-recovery',
    did: 'did:key:casey',
    displayName: 'Casey',
    bio: 'Recovering from surgery, needs temporary support',
    joinedAt: Date.now(),
    publicKey: 'casey-key',
  });

  await db.setUserProfile({
    id: 'morgan-helper',
    did: 'did:key:morgan',
    displayName: 'Morgan',
    bio: 'Can help with meals and errands',
    joinedAt: Date.now(),
    publicKey: 'morgan-key',
  });

  await db.setUserProfile({
    id: 'riley-driver',
    did: 'did:key:riley',
    displayName: 'Riley',
    bio: 'Can provide transportation',
    joinedAt: Date.now(),
    publicKey: 'riley-key',
  });

  // Casey creates a care circle during recovery
  console.log('Casey sets up a temporary care circle for post-surgery recovery...');
  const careCircle = await createCareCircle(
    'casey-recovery',
    ['morgan-helper', 'riley-driver'],
    {
      checkInEnabled: true,
      checkInFrequency: 'daily',
      missedCheckInThreshold: 30, // More lenient during recovery
      escalationThreshold: 3,
    }
  );

  console.log('Care circle created for recovery period!');
  console.log(`- Members: ${careCircle.members.length} people`);
  console.log('- Focus: Meal support, transportation to appointments\n');

  // After a few weeks, Casey is feeling better
  console.log('After recovery progress, Casey adjusts settings...');
  await updateCareCircleSettings('casey-recovery', {
    checkInFrequency: 'weekly', // Less frequent as they recover
    missedCheckInThreshold: 168, // Full week
  });

  const updatedCircle = getCareCircle('casey-recovery');
  console.log(`Updated frequency: ${updatedCircle?.checkInFrequency}`);
  console.log('Care is gradually scaling down as Casey regains independence.\n');
}

/**
 * Example: Care circle respecting autonomy
 */
export async function exampleAutonomyAndPreferences() {
  console.log('=== Example: Respecting Autonomy and Preferences ===\n');

  // Initialize database
  await db.init();

  await db.setUserProfile({
    id: 'sam-independent',
    did: 'did:key:sam',
    displayName: 'Sam',
    bio: 'Values independence, wants minimal monitoring',
    joinedAt: Date.now(),
    publicKey: 'sam-key',
  });

  await db.setUserProfile({
    id: 'friend1',
    did: 'did:key:friend1',
    displayName: 'Friend 1',
    bio: 'Trusted contact',
    joinedAt: Date.now(),
    publicKey: 'friend1-key',
  });

  // Sam sets up a care circle but keeps monitoring off initially
  console.log('Sam creates care circle but keeps monitoring off...');
  const careCircle = await createCareCircle(
    'sam-independent',
    ['friend1'],
    {
      checkInEnabled: false, // Respects autonomy - no monitoring by default
      checkInFrequency: 'weekly',
    }
  );

  console.log('Care circle created with monitoring OFF');
  console.log('- Sam can enable it anytime they want');
  console.log('- Sam remains in full control of their privacy\n');

  console.log('This demonstrates:');
  console.log('✓ User autonomy is respected');
  console.log('✓ Opt-in only, no surveillance');
  console.log('✓ Care adapts to individual preferences\n');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Care Circle Formation Examples                        ║');
  console.log('║  REQ-CARE-001: Check-In Support for Vulnerable Members ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  await exampleElderlyCare();
  console.log('\n' + '─'.repeat(60) + '\n');

  await exampleDisabilityCare();
  console.log('\n' + '─'.repeat(60) + '\n');

  await exampleRecoveryCare();
  console.log('\n' + '─'.repeat(60) + '\n');

  await exampleAutonomyAndPreferences();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  All examples completed successfully!                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
