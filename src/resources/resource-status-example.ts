/**
 * Example: Resource Status Management in Action
 * REQ-SHARE-006: Resource Lifecycle Tracking
 *
 * This example demonstrates the claimed/available status feature
 * for resource sharing in a solarpunk gift economy.
 */

import { LocalDatabase } from '../core/database';
import {
  markResourceClaimed,
  markResourceAvailable,
  toggleResourceAvailability,
  getAvailableResources,
  renderResourcesList,
  renderMyResources,
  initResourceStatusHandlers,
} from './resource-status';

// Initialize database
const db = new LocalDatabase('solarpunk-demo');

async function runExample() {
  console.log('🌻 Solarpunk Resource Sharing Demo 🌻');
  console.log('=====================================\n');

  await db.init();

  // Create some example users
  await db.addUser({
    did: 'did:key:user-1',
    displayName: 'Rosa Luxembourg',
    bio: 'Community organizer, loves sharing tools',
    publicKey: 'mock-public-key-1',
  });

  await db.addUser({
    did: 'did:key:user-2',
    displayName: 'Ursula Le Guin',
    bio: 'Writer and mutual aid enthusiast',
    publicKey: 'mock-public-key-2',
  });

  // Rosa shares some tools
  console.log('📦 Rosa shares three tools with the community:\n');

  const drill = await db.addResource({
    name: 'Electric Drill',
    description: 'Cordless 18V drill with two batteries. Great for DIY projects!',
    resourceType: 'tool',
    shareMode: 'lend',
    available: true,
    ownerId: 'user-1',
    location: 'Downtown co-op',
    tags: ['power-tools', 'DIY', 'construction'],
  });
  console.log('  ✓ Electric Drill - Available for lending');

  const saw = await db.addResource({
    name: 'Hand Saw',
    description: 'Well-maintained hand saw for woodworking',
    resourceType: 'tool',
    shareMode: 'lend',
    available: true,
    ownerId: 'user-1',
    location: 'Downtown co-op',
    tags: ['woodworking', 'hand-tools'],
  });
  console.log('  ✓ Hand Saw - Available for lending');

  const ladder = await db.addResource({
    name: '10-foot Ladder',
    description: 'Aluminum ladder, very sturdy',
    resourceType: 'tool',
    shareMode: 'lend',
    available: true,
    ownerId: 'user-1',
    location: 'Downtown co-op',
    tags: ['household', 'maintenance'],
  });
  console.log('  ✓ 10-foot Ladder - Available for lending\n');

  // Show available resources
  console.log('🔍 Available resources in the community:\n');
  const available = getAvailableResources();
  available.forEach(r => {
    console.log(`  • ${r.name} (${r.shareMode}) - ${r.description}`);
  });
  console.log('');

  // Ursula claims the drill
  console.log('🤝 Ursula claims the drill for a garden bed project:\n');
  await markResourceClaimed(
    drill.id,
    'user-2',
    'Building raised garden beds this weekend!'
  );
  console.log('  ✓ Drill marked as claimed by Ursula\n');

  // Check Rosa's resources
  console.log("📊 Rosa's resource status:\n");
  const rosaResources = db.listResources().filter(r => r.ownerId === 'user-1');
  rosaResources.forEach(r => {
    const status = r.available ? '✓ Available' : '○ Claimed';
    console.log(`  ${status} - ${r.name}`);
  });
  console.log('');

  // Show remaining available resources
  console.log('🔍 Still available in the community:\n');
  const stillAvailable = getAvailableResources();
  stillAvailable.forEach(r => {
    console.log(`  • ${r.name} (${r.shareMode})`);
  });
  console.log('');

  // A few days later, Ursula returns the drill
  console.log('📅 A few days later...\n');
  console.log('🔄 Ursula returns the drill:\n');
  await markResourceAvailable(
    drill.id,
    'user-2',
    'Thanks so much! Garden beds look great!'
  );
  console.log('  ✓ Drill marked as available again\n');

  // Toggle example
  console.log('🔄 Rosa temporarily claims the ladder for her own use:\n');
  await toggleResourceAvailability(ladder.id, 'user-1');
  console.log('  ✓ Ladder toggled to claimed\n');

  console.log('...and makes it available again:\n');
  await toggleResourceAvailability(ladder.id, 'user-1');
  console.log('  ✓ Ladder toggled back to available\n');

  // Final status
  console.log("📊 Final status of Rosa's resources:\n");
  const finalResources = db.listResources().filter(r => r.ownerId === 'user-1');
  finalResources.forEach(r => {
    const status = r.available ? '✓ Available' : '○ Claimed';
    console.log(`  ${status} - ${r.name}`);
  });
  console.log('');

  // Show the gift economy in action
  console.log('🎁 Gift Economy Events:\n');
  const events = db.listEvents();
  events.forEach(event => {
    const resource = db.getResource(event.resourceId);
    const provider = db.getUserProfile(event.providerId);
    const receiver = db.getUserProfile(event.receiverId);

    console.log(
      `  ${event.action.toUpperCase()}: ${provider?.displayName} → ${receiver?.displayName}`
    );
    console.log(`    Resource: ${resource?.name}`);
    if (event.note) {
      console.log(`    Note: "${event.note}"`);
    }
    console.log('');
  });

  console.log('=====================================');
  console.log('🌻 This is the solarpunk gift economy in action! 🌻');
  console.log('No money. No debt. Just community care and resource sharing.\n');
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample };
