/**
 * Emergency Contact Circles - Usage Example
 * REQ-CARE-002: Emergency Alert System
 *
 * Demonstrates how to use the emergency contact circles feature
 */

import { db } from '../core/database';
import {
  setupEmergencyContacts,
  triggerEmergencyAlert,
  respondToEmergencyAlert,
  getMyEmergencyAlerts,
  addEmergencyContact,
  hasEmergencyContacts,
} from './emergency-contacts';

/**
 * Example: Setting up emergency contacts for an elderly community member
 */
async function exampleSetupEmergencyContacts() {
  console.log('=== Setting Up Emergency Contacts ===\n');

  // Alice is an elderly member who wants emergency contacts
  const aliceId = 'alice-123';

  // She chooses Bob and Charlie as her emergency contacts
  const bobId = 'bob-456';
  const charlieId = 'charlie-789';

  const careCircle = await setupEmergencyContacts(aliceId, [bobId, charlieId]);

  console.log('✓ Emergency contacts set up for Alice');
  console.log(`  Care Circle ID: ${careCircle.id}`);
  console.log(`  Emergency contacts: ${careCircle.members.length} people`);
  console.log();
}

/**
 * Example: Alice has a medical emergency
 */
async function exampleMedicalEmergency() {
  console.log('=== Medical Emergency Scenario ===\n');

  const aliceId = 'alice-123';

  // Alice falls and triggers an emergency alert
  const alert = await triggerEmergencyAlert(aliceId, {
    message: 'I fell in the bathroom and cannot get up. Please help!',
    severity: 'emergency',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
  });

  console.log('🚨 Emergency alert triggered!');
  console.log(`  Alert ID: ${alert.id}`);
  console.log(`  Message: ${alert.message}`);
  console.log(`  Location: ${alert.location?.latitude}, ${alert.location?.longitude}`);
  console.log(`  Severity: ${alert.severity}`);
  console.log();

  return alert.id;
}

/**
 * Example: Emergency contacts respond
 */
async function exampleEmergencyResponse(alertId: string) {
  console.log('=== Emergency Response ===\n');

  const bobId = 'bob-456';
  const charlieId = 'charlie-789';

  // Bob sees the alert and responds that he's on his way
  await respondToEmergencyAlert(alertId, bobId, {
    status: 'on-way',
    eta: 5,
    message: 'I am 5 minutes away, hold on!',
  });

  console.log('🏃 Bob responded: On my way (ETA: 5 minutes)');
  console.log();

  // Charlie calls Alice to check on her
  await respondToEmergencyAlert(alertId, charlieId, {
    status: 'contacted',
    message: 'I called Alice, she is conscious and responsive',
  });

  console.log('📞 Charlie responded: Made contact');
  console.log();

  // Bob arrives and helps Alice
  await respondToEmergencyAlert(alertId, bobId, {
    status: 'arrived',
    message: 'I am with Alice, helping her up. She seems okay but bruised.',
  });

  console.log('✓ Bob responded: Arrived and providing help');
  console.log();

  // Check alert status
  const updatedAlert = db.getEmergencyAlert(alertId);
  console.log('Alert Status:');
  console.log(`  Resolved: ${updatedAlert?.resolved ? 'YES' : 'NO'}`);
  console.log(`  Responses: ${updatedAlert?.responses.length}`);
  console.log();
}

/**
 * Example: Urgent (non-emergency) help request
 */
async function exampleUrgentRequest() {
  console.log('=== Urgent Help Request ===\n');

  const aliceId = 'alice-123';

  // Alice needs help but it's not a life-threatening emergency
  const alert = await triggerEmergencyAlert(aliceId, {
    message: 'My power went out and I need help with my medical equipment',
    severity: 'urgent',
  });

  console.log('⚠️  Urgent help request sent');
  console.log(`  Message: ${alert.message}`);
  console.log(`  Severity: ${alert.severity}`);
  console.log();

  return alert.id;
}

/**
 * Example: Managing emergency contacts
 */
async function exampleManageContacts() {
  console.log('=== Managing Emergency Contacts ===\n');

  const aliceId = 'alice-123';
  const dianaId = 'diana-101';

  // Check if Alice has emergency contacts
  const hasContacts = hasEmergencyContacts(aliceId);
  console.log(`Alice has emergency contacts: ${hasContacts ? 'YES' : 'NO'}`);
  console.log();

  // Add a new emergency contact
  await addEmergencyContact(aliceId, dianaId);
  console.log('✓ Added Diana as emergency contact');
  console.log();

  const careCircle = db.getUserCareCircle(aliceId);
  console.log(`Total emergency contacts: ${careCircle?.members.length}`);
  console.log();
}

/**
 * Example: Care circle member checking for alerts
 */
async function exampleCheckForAlerts() {
  console.log('=== Checking for Emergency Alerts ===\n');

  const bobId = 'bob-456';

  // Bob checks if any of his care circle members need help
  const alerts = getMyEmergencyAlerts(bobId);

  console.log(`Bob has ${alerts.length} active emergency alert(s)`);

  if (alerts.length > 0) {
    console.log('\nActive Alerts:');
    alerts.forEach((alert, index) => {
      const user = db.getUserProfile(alert.userId);
      const severityEmoji = alert.severity === 'emergency' ? '🚨' : '⚠️';

      console.log(`\n  ${index + 1}. ${severityEmoji} ${user?.displayName || 'Unknown'}`);
      console.log(`     Message: ${alert.message}`);
      console.log(`     Triggered: ${new Date(alert.triggeredAt).toLocaleTimeString()}`);
      console.log(`     Responses: ${alert.responses.length}`);

      if (alert.location) {
        console.log(`     Location: ${alert.location.latitude}, ${alert.location.longitude}`);
      }
    });
  }

  console.log();
}

/**
 * Run all examples
 */
export async function runEmergencyContactsExample() {
  // Initialize database
  await db.init();

  // Create test users
  await db.setUserProfile({
    id: 'alice-123',
    did: 'did:key:alice',
    displayName: 'Alice (elderly member)',
    joinedAt: Date.now(),
    publicKey: 'pubkey-alice',
  });

  await db.setUserProfile({
    id: 'bob-456',
    did: 'did:key:bob',
    displayName: 'Bob (neighbor)',
    joinedAt: Date.now(),
    publicKey: 'pubkey-bob',
  });

  await db.setUserProfile({
    id: 'charlie-789',
    did: 'did:key:charlie',
    displayName: 'Charlie (friend)',
    joinedAt: Date.now(),
    publicKey: 'pubkey-charlie',
  });

  await db.setUserProfile({
    id: 'diana-101',
    did: 'did:key:diana',
    displayName: 'Diana (community member)',
    joinedAt: Date.now(),
    publicKey: 'pubkey-diana',
  });

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  Emergency Contact Circles - Usage Example   ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Run examples
  await exampleSetupEmergencyContacts();
  const emergencyAlertId = await exampleMedicalEmergency();
  await exampleEmergencyResponse(emergencyAlertId);

  const urgentAlertId = await exampleUrgentRequest();
  await exampleManageContacts();
  await exampleCheckForAlerts();

  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  Example Complete                             ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  console.log('Key Takeaways:');
  console.log('• Emergency contacts provide rapid response for urgent situations');
  console.log('• Alerts include optional location data for faster help');
  console.log('• Multiple responses tracked for coordination');
  console.log('• System works offline using mesh networking');
  console.log('• Privacy-preserving: users control who is in their circle');
  console.log('• No surveillance: data stays local and encrypted');
  console.log();
}

// Run if executed directly
if (require.main === module) {
  runEmergencyContactsExample().catch(console.error);
}
