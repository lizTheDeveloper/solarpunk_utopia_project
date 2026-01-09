/**
 * Gratitude Wall Example
 * REQ-TIME-022: Recognition Without Hierarchy
 * REQ-TIME-018: Experience Sharing
 *
 * Demonstrates how to use the gratitude wall to build community through appreciation
 */

import { db } from '../core/database';
import {
  expressGratitude,
  getGratitudeWall,
  getGratitudeReceived,
  getUserGratitudeStats,
  formatGratitudeWall,
  formatUserGratitudeStats,
  getGratitudeTags,
  getGratitudeByTag,
} from './gratitude-wall';

async function runExamples() {
  console.log('=== Gratitude Wall Examples ===\n');

  // Initialize database
  await db.init();

  // Create test users
  await db.setUserProfile({
    id: 'alice',
    did: 'did:key:alice',
    displayName: 'Alice',
    publicKey: 'alice-public-key',
    joinedAt: Date.now(),
  });

  await db.setUserProfile({
    id: 'bob',
    did: 'did:key:bob',
    displayName: 'Bob',
    publicKey: 'bob-public-key',
    joinedAt: Date.now(),
  });

  await db.setUserProfile({
    id: 'carol',
    did: 'did:key:carol',
    displayName: 'Carol',
    publicKey: 'carol-public-key',
    joinedAt: Date.now(),
  });

  console.log('1. Expressing Public Gratitude\n');
  console.log('Alice expresses gratitude to Bob for helping fix her bike:\n');

  const gratitude1 = await expressGratitude({
    fromUserId: 'alice',
    toUserId: 'bob',
    message: 'Thank you so much for helping me fix my bike yesterday! You spent two hours teaching me how to adjust the brakes and replace the chain. I really appreciate your patience and expertise.',
    tags: ['repair', 'teaching', 'kindness'],
    isPublic: true,
  });

  console.log('✓ Gratitude expressed publicly');
  console.log(`  ID: ${gratitude1.id}`);
  console.log(`  From: ${gratitude1.fromUserId}`);
  console.log(`  To: ${gratitude1.toUserId}`);
  console.log(`  Tags: ${gratitude1.tags?.join(', ')}`);
  console.log(`  Public: ${gratitude1.isPublic}\n`);

  console.log('2. Expressing Private Gratitude\n');
  console.log('Bob expresses private gratitude to Carol for emotional support:\n');

  const gratitude2 = await expressGratitude({
    fromUserId: 'bob',
    toUserId: 'carol',
    message: 'Thank you for listening when I was going through a tough time. Your support meant everything to me.',
    tags: ['emotional-support', 'care'],
    isPublic: false,
  });

  console.log('✓ Gratitude expressed privately');
  console.log(`  Public: ${gratitude2.isPublic}`);
  console.log('  (This will not appear on the public gratitude wall)\n');

  console.log('3. More Public Gratitude\n');

  await expressGratitude({
    fromUserId: 'carol',
    toUserId: 'alice',
    message: 'Thanks for sharing your harvest! Those tomatoes were delicious and saved my dinner party.',
    tags: ['food', 'sharing', 'generosity'],
    isPublic: true,
  });

  await expressGratitude({
    fromUserId: 'bob',
    toUserId: 'alice',
    message: 'Your tutoring session was amazing! I finally understand algebra now. Thank you for your patience.',
    tags: ['teaching', 'education', 'patience'],
    isPublic: true,
  });

  await expressGratitude({
    fromUserId: 'alice',
    toUserId: 'carol',
    message: 'Thank you for organizing the community potluck! It was wonderful to meet everyone.',
    tags: ['organizing', 'community', 'joy'],
    isPublic: true,
  });

  console.log('✓ Multiple public gratitude expressions created\n');

  console.log('4. Viewing the Gratitude Wall\n');
  console.log('The gratitude wall shows public expressions in chronological order:');
  console.log('(No rankings, no "top contributors" - all gratitude is equal)\n');

  const wall = formatGratitudeWall();
  console.log(wall);

  console.log('\n5. Viewing Tags on Gratitude Wall\n');
  console.log('Common themes in community gratitude:\n');

  const tags = getGratitudeTags();
  console.log(`Tags: ${tags.join(', ')}\n`);

  console.log('6. Browsing by Tag\n');
  console.log('Finding all gratitude tagged with "teaching":\n');

  const teachingGratitude = getGratitudeByTag('teaching');
  console.log(`Found ${teachingGratitude.length} expression(s):`);
  teachingGratitude.forEach(g => {
    const from = db.getUserProfile(g.fromUserId)?.displayName;
    const to = db.getUserProfile(g.toUserId)?.displayName;
    console.log(`  • ${from} → ${to}: "${g.message.substring(0, 50)}..."`);
  });
  console.log();

  console.log('7. Personal Gratitude Statistics\n');
  console.log('Alice checks her gratitude statistics:\n');

  const aliceStats = formatUserGratitudeStats('alice');
  console.log(aliceStats);

  console.log('\n8. Viewing Received Gratitude (Including Private)\n');
  console.log('Carol checks all gratitude she has received:\n');

  const carolReceived = getGratitudeReceived('carol', true);
  console.log(`Carol has received ${carolReceived.length} gratitude expression(s):`);
  carolReceived.forEach(g => {
    const from = db.getUserProfile(g.fromUserId)?.displayName;
    const visibility = g.isPublic ? '(public)' : '(private)';
    console.log(`  • From ${from} ${visibility}: "${g.message.substring(0, 50)}..."`);
  });
  console.log();

  console.log('\n9. Key Principles Demonstrated\n');
  console.log('✓ No rankings or "top volunteer" lists');
  console.log('✓ All gratitude is displayed equally');
  console.log('✓ Chronological order (most recent first)');
  console.log('✓ Privacy respected (private gratitude not on public wall)');
  console.log('✓ Tags help discover themes without creating competition');
  console.log('✓ Focus on community impact and connection, not individual achievement');
  console.log('✓ Diverse contributions celebrated equally (repair, teaching, emotional support, organizing)');

  console.log('\n=== Example Complete ===\n');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export { runExamples };
