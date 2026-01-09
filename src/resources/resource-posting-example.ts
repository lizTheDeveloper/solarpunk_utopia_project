/**
 * Example usage of Resource Posting feature
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 *
 * This demonstrates how community members can post items to share,
 * implementing the buy-nothing gift economy.
 */

import {
  postResource,
  updateResource,
  markResourceUnavailable,
  getMyResources,
  getAvailableResources,
  searchResources,
  getResourcesByType,
} from './resource-posting';

/**
 * Example 1: Community member gives away a sofa
 */
async function exampleGiveAwaySofa() {
  console.log('🎁 Example: Giving away a sofa\n');

  const userId = 'alice-123';

  // Alice posts her sofa to the community
  const sofa = await postResource({
    name: 'Comfortable 3-seater sofa',
    description: 'Moving to a smaller place and need to find a good home for this sofa. It\'s in great condition, just some minor wear on the cushions. Perfect for a student apartment or community space!',
    resourceType: 'other',
    shareMode: 'give',
    ownerId: userId,
    location: 'Downtown neighborhood, near Central Park',
    photos: ['sofa-front.jpg', 'sofa-side.jpg', 'sofa-cushions.jpg'],
    tags: ['furniture', 'seating', 'living-room'],
  });

  console.log('✅ Posted sofa:', sofa.name);
  console.log(`   ID: ${sofa.id}`);
  console.log(`   Available: ${sofa.available}`);
  console.log(`   Location: ${sofa.location}\n`);
}

/**
 * Example 2: Community member lends garden tools
 */
async function exampleLendGardenTools() {
  console.log('🔄 Example: Lending garden tools\n');

  const userId = 'bob-456';

  // Bob shares his garden tools
  const tools = await postResource({
    name: 'Garden tool set',
    description: 'Complete set including shovel, rake, hoe, trowel, and hand cultivator. I\'m happy to lend these out to anyone working on community gardens or their own yard. Please return clean!',
    resourceType: 'tool',
    shareMode: 'lend',
    ownerId: userId,
    location: 'Northside Community Garden',
    tags: ['garden', 'tools', 'outdoor', 'farming'],
    pickupOptions: {
      canDeliver: false,
      canMeetup: true,
      pickupLocation: 'Tool shed at community garden',
      pickupInstructions: 'Message me first - I\'ll leave them in the shed with your name on them',
    },
  });

  console.log('✅ Posted garden tools:', tools.name);
  console.log(`   Share mode: ${tools.shareMode}`);
  console.log(`   Tags: ${tools.tags?.join(', ')}\n`);
}

/**
 * Example 3: Browsing available items
 */
async function exampleBrowseItems() {
  console.log('👀 Example: Browsing available items\n');

  // Get all available items
  const allItems = getAvailableResources();
  console.log(`Total available items: ${allItems.length}\n`);

  // Browse by category
  const tools = getResourcesByType('tool');
  console.log(`Available tools: ${tools.length}`);
  tools.forEach(tool => {
    console.log(`  - ${tool.name} (${tool.shareMode})`);
  });
  console.log();

  const food = getResourcesByType('food');
  console.log(`Available food: ${food.length}`);
  food.forEach(item => {
    console.log(`  - ${item.name} (${item.shareMode})`);
  });
  console.log();
}

/**
 * Example 4: Searching for specific items
 */
async function exampleSearchItems() {
  console.log('🔍 Example: Searching for items\n');

  // Someone needs a bicycle
  const bicycleResults = searchResources('bicycle');
  console.log(`Found ${bicycleResults.length} items matching "bicycle"`);
  bicycleResults.forEach(item => {
    console.log(`  - ${item.name}`);
    console.log(`    ${item.description}`);
    console.log(`    Location: ${item.location || 'Not specified'}\n`);
  });
}

/**
 * Example 5: Marking item as claimed/given away
 */
async function exampleMarkItemClaimed() {
  console.log('✓ Example: Item claimed and given away\n');

  const userId = 'carol-789';

  // Carol posts a bike
  const bike = await postResource({
    name: 'Mountain bike',
    description: 'Great bike, just too small for me now',
    resourceType: 'other',
    shareMode: 'give',
    ownerId: userId,
  });

  console.log(`Posted: ${bike.name} (Available: ${bike.available})`);

  // Someone claims it
  await markResourceUnavailable(bike.id);
  console.log(`Item claimed! (Available: false)\n`);
}

/**
 * Example 6: Managing your posted items
 */
async function exampleManageMyItems() {
  console.log('📋 Example: Managing my posted items\n');

  const userId = 'dave-012';

  // Dave posts several items
  await postResource({
    name: 'Desk lamp',
    description: 'LED desk lamp, adjustable',
    resourceType: 'other',
    shareMode: 'give',
    ownerId: userId,
  });

  await postResource({
    name: 'Power drill',
    description: 'Cordless drill with battery',
    resourceType: 'tool',
    shareMode: 'lend',
    ownerId: userId,
  });

  // View all items Dave has posted
  const myItems = getMyResources(userId);
  console.log(`I have posted ${myItems.length} items:`);
  myItems.forEach(item => {
    console.log(`  - ${item.name} (${item.shareMode}, ${item.available ? 'available' : 'claimed'})`);
  });
  console.log();
}

/**
 * Example 7: Updating a resource posting
 */
async function exampleUpdatePosting() {
  console.log('✏️ Example: Updating a resource posting\n');

  const userId = 'eve-345';

  const item = await postResource({
    name: 'Office chair',
    description: 'Basic office chair',
    resourceType: 'other',
    shareMode: 'give',
    ownerId: userId,
  });

  console.log('Original:', item.description);

  // Eve adds more details
  await updateResource(item.id, {
    description: 'Ergonomic office chair with lumbar support. Height adjustable. Some wear on armrests but still very comfortable!',
    tags: ['furniture', 'office', 'ergonomic'],
    location: 'East Side, near library',
  });

  console.log('Updated with more details!\n');
}

/**
 * Run all examples
 */
export async function runExamples() {
  console.log('🌻 Solarpunk Resource Posting Examples 🌻');
  console.log('==========================================\n');

  await exampleGiveAwaySofa();
  await exampleLendGardenTools();
  await exampleBrowseItems();
  await exampleSearchItems();
  await exampleMarkItemClaimed();
  await exampleManageMyItems();
  await exampleUpdatePosting();

  console.log('✅ All examples complete!\n');
  console.log('Key Principles:');
  console.log('  - No money involved - pure gift economy');
  console.log('  - No tracking or surveillance');
  console.log('  - Community care and mutual aid');
  console.log('  - Offline-first architecture');
  console.log('  - Privacy-preserving by default\n');
}

// Uncomment to run examples
// runExamples().catch(console.error);
