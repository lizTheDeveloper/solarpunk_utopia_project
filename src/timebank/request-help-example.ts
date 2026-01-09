/**
 * Request Help Examples - Time Bank Core
 * REQ-TIME-006: Explicit Time Requests
 * REQ-TIME-008: Emergency and Urgent Needs
 *
 * This file demonstrates how to use the help request system
 * for various community mutual aid scenarios.
 */

import { db } from '../core/database';
import {
  createHelpRequest,
  updateHelpRequest,
  cancelHelpRequest,
  getMyHelpRequests,
  getOpenHelpRequests,
  getUrgentHelpRequests,
  getHelpRequestsBySkill,
  searchHelpRequests,
  acceptHelpRequest,
  confirmHelpSession,
  formatHelpRequestForDisplay,
} from './request-help';

/**
 * Example: Request help moving furniture
 * Common scenario: Someone needs physical help with a one-time task
 */
async function exampleMovingHelp() {
  console.log('\n📦 Example: Request help moving furniture\n');

  // Create a help request
  const request = await createHelpRequest({
    userId: 'maria-user',
    title: 'Need help moving furniture this weekend',
    description: 'Moving to a new apartment - need help with couch, bed frame, and boxes. About 2 hours of work.',
    skillCategories: ['moving', 'physical'],
    preferredDate: Date.now() + 3 * 86400000, // 3 days from now
    preferredTime: { startTime: '09:00', endTime: '13:00' },
    location: {
      type: 'recipient-place',
      details: '123 Oak Street → 456 Maple Avenue (both ground floor)',
    },
    estimatedDuration: 120, // 2 hours
    helpersNeeded: 2,
    materialsProvided: ['boxes', 'packing materials'],
    materialsNeeded: ['dolly or hand truck (if you have one)'],
    flexibleTiming: true,
    notes: 'I have a small pickup truck for transport. Pizza and beverages provided!',
  });

  console.log('Help request created:');
  console.log(formatHelpRequestForDisplay(request));
  console.log('\nRequest ID:', request.id);
}

/**
 * Example: Urgent childcare need
 * REQ-TIME-008: Emergency and Urgent Needs
 */
async function exampleUrgentChildcare() {
  console.log('\n👶 Example: Urgent childcare request\n');

  const request = await createHelpRequest({
    userId: 'parent-user',
    title: 'Urgent: Childcare needed for tomorrow',
    description: 'My regular childcare fell through. Need someone to watch my 5-year-old daughter.',
    skillCategories: ['childcare', 'care'],
    urgency: 'urgent',
    preferredDate: Date.now() + 86400000, // Tomorrow
    preferredTime: { startTime: '08:00', endTime: '17:00' },
    estimatedDuration: 540, // 9 hours
    location: {
      type: 'volunteer-place',
      details: 'Preferably at your home if child-friendly',
    },
    notes: 'She is potty-trained, loves to draw, has no allergies. Can provide meals and snacks.',
  });

  console.log('Urgent help request created:');
  console.log(formatHelpRequestForDisplay(request));

  // Check urgent requests
  const urgentRequests = getUrgentHelpRequests();
  console.log(`\nTotal urgent requests in community: ${urgentRequests.length}`);
}

/**
 * Example: Request tutoring help
 * Ongoing/recurring help scenario
 */
async function exampleTutoringHelp() {
  console.log('\n📚 Example: Request tutoring help\n');

  const request = await createHelpRequest({
    userId: 'student-user',
    title: 'Need math tutoring for algebra',
    description: 'High school student struggling with algebra 2. Looking for patient tutor.',
    skillCategories: ['tutoring', 'education', 'math'],
    preferredDate: Date.now() + 7 * 86400000, // Next week
    preferredTime: { startTime: '16:00', endTime: '18:00' },
    estimatedDuration: 60,
    location: {
      type: 'community-space',
      details: 'Library study room or coffee shop',
    },
    flexibleTiming: true,
    accessibilityInfo: 'Need wheelchair accessible location',
    notes: 'Weekly sessions would be ideal if possible. Can provide textbook.',
  });

  console.log('Tutoring request created:');
  console.log(formatHelpRequestForDisplay(request));
}

/**
 * Example: Request repair help
 * Specialized skill scenario
 */
async function exampleRepairHelp() {
  console.log('\n🔧 Example: Request plumbing repair help\n');

  const request = await createHelpRequest({
    userId: 'homeowner-user',
    title: 'Need help fixing leaky kitchen faucet',
    description: 'Kitchen faucet has been dripping for a week. Not sure if it needs new washers or full replacement.',
    skillCategories: ['repair', 'plumbing'],
    preferredDate: Date.now() + 2 * 86400000, // 2 days from now
    preferredTime: { startTime: '10:00', endTime: '17:00' },
    estimatedDuration: 90,
    location: {
      type: 'recipient-place',
      details: '789 Pine Street, Apartment 2B',
    },
    flexibleTiming: true,
    materialsProvided: ['basic tools'],
    notes: 'I can buy parts if you can diagnose the issue and help install.',
  });

  console.log('Repair request created:');
  console.log(formatHelpRequestForDisplay(request));
}

/**
 * Example: Community event help
 * Multiple volunteers needed
 */
async function exampleCommunityEventHelp() {
  console.log('\n🌻 Example: Request help for community garden workday\n');

  const request = await createHelpRequest({
    userId: 'organizer-user',
    title: 'Volunteers needed for community garden workday',
    description: 'Building new raised beds and planting spring vegetables. All skill levels welcome!',
    skillCategories: ['gardening', 'physical', 'community'],
    preferredDate: Date.now() + 10 * 86400000, // 10 days from now
    preferredTime: { startTime: '09:00', endTime: '15:00' },
    estimatedDuration: 360, // 6 hours (can come for any portion)
    location: {
      type: 'community-space',
      details: 'Sunshine Community Garden, 321 Garden Way',
    },
    helpersNeeded: 10,
    materialsProvided: ['tools', 'lumber', 'soil', 'plants'],
    notes: 'Come for any amount of time! Lunch provided. Bring gloves and water bottle.',
  });

  console.log('Community workday request created:');
  console.log(formatHelpRequestForDisplay(request));
}

/**
 * Example: Browse open help requests
 * What a volunteer would see
 */
async function exampleBrowseRequests() {
  console.log('\n🔍 Example: Browse open help requests\n');

  // Get all open requests
  const openRequests = getOpenHelpRequests();
  console.log(`Total open requests: ${openRequests.length}\n`);

  // Show first few
  openRequests.slice(0, 3).forEach((request, index) => {
    console.log(`${index + 1}. ${formatHelpRequestForDisplay(request)}\n`);
  });

  // Search by keyword
  console.log('\nSearching for "tutoring" requests:');
  const tutoringRequests = searchHelpRequests('tutoring');
  console.log(`Found ${tutoringRequests.length} tutoring requests`);

  // Filter by skill
  console.log('\nFiltering by "repair" skill:');
  const repairRequests = getHelpRequestsBySkill('repair');
  console.log(`Found ${repairRequests.length} repair requests`);

  // Check urgent requests
  console.log('\nUrgent requests:');
  const urgentRequests = getUrgentHelpRequests();
  console.log(`Found ${urgentRequests.length} urgent requests`);
}

/**
 * Example: Volunteer accepts a help request
 * Complete flow from request to confirmation
 */
async function exampleAcceptAndConfirm() {
  console.log('\n🤝 Example: Volunteer accepts help request\n');

  // Someone creates a request
  const request = await createHelpRequest({
    userId: 'requester-123',
    title: 'Need help assembling IKEA furniture',
    description: 'Just got a new bookshelf, not great at assembly. Would appreciate help!',
    skillCategories: ['assembly', 'handy'],
    preferredDate: Date.now() + 2 * 86400000,
    preferredTime: { startTime: '14:00', endTime: '16:00' },
    location: { type: 'recipient-place' },
  });

  console.log('Step 1: Request created');
  console.log(`Status: ${request.status} (waiting for volunteer)\n`);

  // Volunteer browses and accepts
  await acceptHelpRequest(request.id, 'volunteer-456');
  console.log('Step 2: Volunteer accepted!');

  let session = db.getHelpSession(request.id);
  console.log(`Status: ${session?.status}`);
  console.log(`Volunteer confirmed: ${session?.volunteerConfirmed}`);
  console.log(`Recipient confirmed: ${session?.recipientConfirmed}\n`);

  // Recipient confirms
  await confirmHelpSession(request.id, 'requester-123');
  console.log('Step 3: Recipient confirmed!');

  session = db.getHelpSession(request.id);
  console.log(`Status: ${session?.status}`);
  console.log(`Volunteer confirmed: ${session?.volunteerConfirmed}`);
  console.log(`Recipient confirmed: ${session?.recipientConfirmed}`);
  console.log('\n✅ Session fully confirmed and ready to go!');
}

/**
 * Example: Update a help request
 * Before volunteer accepts
 */
async function exampleUpdateRequest() {
  console.log('\n✏️ Example: Update help request\n');

  const request = await createHelpRequest({
    userId: 'user-123',
    title: 'Need help with gardening',
    description: 'Planting vegetables',
    preferredDate: Date.now() + 5 * 86400000,
    preferredTime: { startTime: '10:00', endTime: '12:00' },
  });

  console.log('Original request:');
  console.log(formatHelpRequestForDisplay(request));

  // Oops, wrong time! Update it
  await updateHelpRequest(request.id, {
    preferredDate: Date.now() + 6 * 86400000, // One day later
    preferredTime: { startTime: '09:00', endTime: '11:00' },
    notes: 'Changed to Saturday morning instead - better weather expected!',
  });

  const updated = db.getHelpSession(request.id);
  console.log('\nUpdated request:');
  console.log(formatHelpRequestForDisplay(updated!));
}

/**
 * Example: Cancel a help request
 */
async function exampleCancelRequest() {
  console.log('\n❌ Example: Cancel help request\n');

  const request = await createHelpRequest({
    userId: 'user-123',
    title: 'Need help painting',
    description: 'Painting living room',
    preferredDate: Date.now() + 4 * 86400000,
  });

  console.log('Request created');
  console.log(`Status: ${request.status}\n`);

  // Plans changed - cancel it
  await cancelHelpRequest(
    request.id,
    'user-123',
    'Weather forecast changed, postponing painting project'
  );

  const cancelled = db.getHelpSession(request.id);
  console.log('Request cancelled');
  console.log(`Status: ${cancelled?.status}`);
  console.log(`Reason: ${cancelled?.cancellationReason}`);
}

/**
 * Example: View my help requests
 * See all requests I've made
 */
async function exampleMyRequests() {
  console.log('\n📋 Example: View my help requests\n');

  const userId = 'current-user-123';

  // Create a few requests
  await createHelpRequest({
    userId,
    title: 'Request 1: Moving help',
    description: 'Need help moving',
  });

  await createHelpRequest({
    userId,
    title: 'Request 2: Tutoring',
    description: 'Need math tutoring',
  });

  await createHelpRequest({
    userId,
    title: 'Request 3: Repair help',
    description: 'Fix bike',
  });

  // Get all my requests
  const myRequests = getMyHelpRequests(userId);
  console.log(`You have ${myRequests.length} help requests:\n`);

  myRequests.forEach((request, index) => {
    console.log(`${index + 1}. ${request.title} - Status: ${request.status}`);
  });
}

/**
 * Run all examples
 */
export async function runRequestHelpExamples() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Request Help Examples - Time Bank Gift Economy');
  console.log('═══════════════════════════════════════════════════════');

  // Initialize database
  await db.init();

  try {
    await exampleMovingHelp();
    await exampleUrgentChildcare();
    await exampleTutoringHelp();
    await exampleRepairHelp();
    await exampleCommunityEventHelp();
    await exampleBrowseRequests();
    await exampleAcceptAndConfirm();
    await exampleUpdateRequest();
    await exampleCancelRequest();
    await exampleMyRequests();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  All examples completed! 🌻');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRequestHelpExamples();
}
