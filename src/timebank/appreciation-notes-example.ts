/**
 * Example: Time Bank Appreciation Notes
 * REQ-TIME-018: Experience Sharing
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * Demonstrates how community members express gratitude after time bank activities
 */

import { db } from '../core/database';
import {
  expressAppreciation,
  expressAppreciationForSkillOffer,
  getAppreciationForSession,
  getAppreciationForUser,
  getRecentAppreciation,
  getAppreciationStats,
  formatAppreciationNote,
  formatAppreciationList,
  formatAppreciationStats,
} from './appreciation-notes';

async function runExample() {
  console.log('\n=== Time Bank Appreciation Notes Example ===\n');

  // Initialize database
  await db.init();

  // Create test users
  const maria = await db.addUserProfile({
    displayName: 'Maria',
    bio: 'Math tutor and community member',
  });

  const jordan = await db.addUserProfile({
    displayName: 'Jordan',
    bio: 'Student learning algebra',
  });

  const alex = await db.addUserProfile({
    displayName: 'Alex',
    bio: 'Bicycle mechanic',
  });

  console.log('Created test users: Maria (tutor), Jordan (student), Alex (mechanic)\n');

  // Create a skill offer
  const mathTutorOffer = await db.addSkillOffer({
    userId: maria.id,
    title: 'Math Tutoring',
    description: 'Algebra, geometry, and calculus tutoring',
    category: 'education',
    skillLevel: 'advanced',
    availability: {
      daysOfWeek: [2, 4], // Tuesday and Thursday
      timeRanges: [{ start: '16:00', end: '19:00' }],
    },
  });

  console.log(`Maria offers: ${mathTutorOffer.title}\n`);

  // Create a help session
  const tutorSession = await db.addHelpSession({
    volunteerId: maria.id,
    recipientId: jordan.id,
    skillOfferId: mathTutorOffer.id,
    title: 'Algebra Tutoring Session',
    description: 'Quadratic equations and graphing',
    scheduledDate: Date.now() + (2 * 24 * 60 * 60 * 1000), // 2 days from now
    scheduledTime: { start: '16:00', end: '17:30' },
    estimatedDuration: 90,
    location: {
      type: 'community-space',
      details: 'Library study room 3',
    },
    status: 'completed', // Simulate completed session
    volunteerConfirmed: true,
    recipientConfirmed: true,
  });

  console.log(`Scheduled session: ${tutorSession.title}\n`);

  // ===== SCENARIO 1: Recipient expresses appreciation =====
  console.log('--- Scenario 1: Recipient expresses appreciation after help session ---\n');

  const appreciationFromJordan = await expressAppreciation({
    sessionId: tutorSession.id,
    fromUserId: jordan.id,
    message: 'Maria was so patient and really helped me understand quadratic equations! ' +
             'I finally feel confident about my upcoming test. Thank you! 🌻',
    isPublic: true,
    tags: ['patient', 'clear-explanation', 'inspiring'],
  });

  console.log('Jordan expressed appreciation:');
  console.log(`  "${appreciationFromJordan.message}"\n`);

  // ===== SCENARIO 2: Volunteer expresses appreciation back =====
  console.log('--- Scenario 2: Volunteer can also express appreciation ---\n');

  const appreciationFromMaria = await expressAppreciation({
    sessionId: tutorSession.id,
    fromUserId: maria.id,
    message: 'Jordan asked such thoughtful questions! It was a joy to see those "aha!" ' +
             'moments. Teaching is so rewarding when students are engaged like this.',
    isPublic: true,
    tags: ['engaged', 'thoughtful', 'joy'],
  });

  console.log('Maria expressed appreciation back:');
  console.log(`  "${appreciationFromMaria.message}"\n`);

  // ===== SCENARIO 3: Get appreciation for a session =====
  console.log('--- Scenario 3: View all appreciation for the session ---\n');

  const sessionAppreciation = getAppreciationForSession(tutorSession.id);
  console.log(`Found ${sessionAppreciation.length} appreciation notes for this session\n`);
  console.log(formatAppreciationList(sessionAppreciation, 'Session Appreciation'));

  // ===== SCENARIO 4: Express appreciation for skill offer (without session) =====
  console.log('\n--- Scenario 4: Appreciate skill offer before scheduling ---\n');

  const offerAppreciation = await expressAppreciationForSkillOffer(
    mathTutorOffer.id,
    alex.id,
    'Thank you for offering tutoring! It\'s so valuable to have someone willing to share ' +
    'their knowledge freely. Even though I don\'t need math help right now, I appreciate ' +
    'you making yourself available to the community.',
    {
      isPublic: true,
      tags: ['generous', 'community-spirit'],
    }
  );

  console.log('Alex appreciated the skill offer:');
  console.log(`  "${offerAppreciation.message}"\n`);

  // ===== SCENARIO 5: Get appreciation for a user =====
  console.log('--- Scenario 5: View all appreciation received by Maria ---\n');

  const mariaAppreciation = getAppreciationForUser(maria.id, {
    limit: 10,
    includePrivate: false,
  });

  console.log(`Maria has received ${mariaAppreciation.length} public appreciation notes\n`);
  console.log(formatAppreciationList(mariaAppreciation, 'Maria\'s Appreciation'));

  // ===== SCENARIO 6: Recent appreciation across community =====
  console.log('\n--- Scenario 6: Recent community appreciation ---\n');

  const recentAppreciation = getRecentAppreciation({
    days: 7,
    limit: 10,
    publicOnly: true,
  });

  console.log(`${recentAppreciation.length} appreciation notes in the last 7 days\n`);
  console.log(formatAppreciationList(recentAppreciation, 'Recent Time Bank Appreciation'));

  // ===== SCENARIO 7: Appreciation statistics =====
  console.log('\n--- Scenario 7: Appreciation statistics ---\n');

  const mariaStats = getAppreciationStats(maria.id);
  console.log(formatAppreciationStats(mariaStats, 'Maria'));

  const communityStats = getAppreciationStats();
  console.log(formatAppreciationStats(communityStats));

  // ===== SCENARIO 8: Private appreciation note =====
  console.log('\n--- Scenario 8: Private appreciation (not on public wall) ---\n');

  const privateSession = await db.addHelpSession({
    volunteerId: alex.id,
    recipientId: maria.id,
    title: 'Bicycle Repair Help',
    description: 'Fix flat tire',
    scheduledDate: Date.now(),
    scheduledTime: { start: '10:00', end: '11:00' },
    location: {
      type: 'recipient-place',
      details: 'Maria\'s house',
    },
    status: 'completed',
    volunteerConfirmed: true,
    recipientConfirmed: true,
  });

  const privateAppreciation = await expressAppreciation({
    sessionId: privateSession.id,
    fromUserId: maria.id,
    message: 'Alex was incredibly kind and patient. Fixed my bike and taught me how to do ' +
             'it myself next time. Really appreciate the help!',
    isPublic: false, // Keep this private
    tags: ['patient', 'helpful', 'teaching'],
  });

  console.log('Maria expressed private appreciation:');
  console.log(`  Public: ${privateAppreciation.isPublic}`);
  console.log(`  "${privateAppreciation.message}"\n`);

  // ===== SCENARIO 9: Appreciation encourages participation =====
  console.log('--- Scenario 9: How appreciation builds community culture ---\n');

  console.log('Appreciation notes serve multiple purposes:');
  console.log('  • Build personal connections between community members');
  console.log('  • Celebrate diverse contributions without ranking');
  console.log('  • Make visible the joy and impact of time sharing');
  console.log('  • Encourage participation through positive reinforcement');
  console.log('  • Create stories that inspire others to contribute\n');

  console.log('Unlike ratings or reviews:');
  console.log('  • No scores or numeric rankings');
  console.log('  • Both volunteers and recipients can express gratitude');
  console.log('  • Optional - never mandatory');
  console.log('  • Private or public - user\'s choice');
  console.log('  • Focuses on connection, not evaluation\n');

  // ===== SCENARIO 10: Offline-first appreciation =====
  console.log('--- Scenario 10: Offline-first design ---\n');

  console.log('Appreciation notes work offline:');
  console.log('  • Written and stored locally in Automerge CRDT');
  console.log('  • Sync automatically when connectivity returns');
  console.log('  • No internet required to express gratitude');
  console.log('  • Works on mesh networks and peer-to-peer sync\n');

  console.log('=== Example Complete ===\n');
}

// Run the example
runExample().catch(error => {
  console.error('Example failed:', error);
  process.exit(1);
});
