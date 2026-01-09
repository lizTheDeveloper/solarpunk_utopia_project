/**
 * Resource Sharing Example Usage
 * Demonstrates how to use the Request Items feature
 */

import { db } from '../core/database';
import {
  postItemToShare,
  browseAvailableItems,
  requestItem,
  markItemClaimed,
  getMyRequests,
  getRequestsForMyItems,
} from './resource-sharing';
import {
  renderBrowseItemsPage,
  renderRequestDialog,
  renderMyRequestsPage,
  renderIncomingRequestsPage,
} from './resource-request-ui';

/**
 * Example: Community member posts items to share
 */
async function examplePostItems() {
  console.log('🌻 Example: Posting items to share\n');

  // Alice shares a power drill
  const drill = await postItemToShare(
    'user-alice',
    'Cordless Drill',
    'DeWalt 20V cordless drill with battery and charger. Great for DIY projects!',
    'tool',
    'lend',
    {
      location: 'North Oakland',
      tags: ['power-tools', 'DIY', 'construction'],
    }
  );
  console.log(`✓ Posted: ${drill.name} (${drill.shareMode})`);

  // Bob gives away a sofa
  const sofa = await postItemToShare(
    'user-bob',
    'Blue Sofa',
    'Comfortable 3-seater sofa, blue fabric. Moving and need to give it away!',
    'other',
    'give',
    {
      location: 'Downtown Oakland',
      tags: ['furniture', 'free'],
    }
  );
  console.log(`✓ Posted: ${sofa.name} (${sofa.shareMode})`);

  // Charlie shares gardening tools
  const shovel = await postItemToShare(
    'user-charlie',
    'Garden Shovel',
    'Heavy-duty garden shovel, perfect for digging beds',
    'tool',
    'lend',
    {
      location: 'East Oakland',
      tags: ['gardening', 'tools'],
    }
  );
  console.log(`✓ Posted: ${shovel.name} (${shovel.shareMode})\n`);
}

/**
 * Example: Browse available items with filters
 */
function exampleBrowseItems() {
  console.log('🔍 Example: Browsing available items\n');

  // Browse all items
  const allItems = browseAvailableItems();
  console.log(`Found ${allItems.length} total items available`);

  // Filter by type
  const tools = browseAvailableItems({ resourceType: 'tool' });
  console.log(`Found ${tools.length} tools available`);

  // Filter by share mode
  const freeItems = browseAvailableItems({ shareMode: 'give' });
  console.log(`Found ${freeItems.length} items being given away`);

  // Search by query
  const drills = browseAvailableItems({ searchQuery: 'drill' });
  console.log(`Found ${drills.length} items matching "drill"`);

  console.log('\nAvailable items:');
  allItems.forEach(item => {
    console.log(`  - ${item.name} (${item.shareMode}) @ ${item.location || 'location not specified'}`);
  });
  console.log();
}

/**
 * Example: Request an item
 */
async function exampleRequestItem() {
  console.log('📦 Example: Requesting an item\n');

  // Find the drill
  const items = browseAvailableItems({ searchQuery: 'drill' });
  if (items.length === 0) {
    console.log('No drills found to request');
    return;
  }

  const drill = items[0];

  // David requests the drill
  const result = await requestItem(
    'user-david',
    drill.id,
    'Hi! I need to build some shelves this weekend. Would Saturday morning work for pickup?'
  );

  if (result.success) {
    console.log(`✓ Request sent for: ${drill.name}`);
    console.log(`  From: ${drill.ownerId}`);
    console.log(`  Event ID: ${result.event?.id}\n`);
  } else {
    console.error(`✗ Request failed: ${result.error}\n`);
  }
}

/**
 * Example: View my requests
 */
function exampleViewMyRequests() {
  console.log('📋 Example: Viewing my requests\n');

  const myRequests = getMyRequests('user-david');

  if (myRequests.length === 0) {
    console.log('You have not requested any items yet.\n');
    return;
  }

  console.log(`You have ${myRequests.length} active request(s):\n`);
  myRequests.forEach(({ request, resource }) => {
    if (resource) {
      console.log(`  - ${resource.name}`);
      console.log(`    Status: ${resource.available ? 'Still available' : 'No longer available'}`);
      console.log(`    Owner: ${resource.ownerId}`);
      console.log(`    Requested: ${new Date(request.createdAt).toLocaleDateString()}`);
      if (request.note) {
        console.log(`    Message: "${request.note}"`);
      }
      console.log();
    }
  });
}

/**
 * Example: View incoming requests for my items
 */
function exampleViewIncomingRequests() {
  console.log('📬 Example: Viewing requests for my items\n');

  const incomingRequests = getRequestsForMyItems('user-alice');

  if (incomingRequests.length === 0) {
    console.log('No one has requested your items yet.\n');
    return;
  }

  console.log(`You have ${incomingRequests.length} incoming request(s):\n`);
  incomingRequests.forEach(({ request, resource, requesterProfile }) => {
    if (resource) {
      const requesterName = requesterProfile?.displayName || request.receiverId;
      console.log(`  - ${resource.name}`);
      console.log(`    From: ${requesterName}`);
      console.log(`    Requested: ${new Date(request.createdAt).toLocaleDateString()}`);
      if (request.note) {
        console.log(`    Message: "${request.note}"`);
      }
      console.log();
    }
  });
}

/**
 * Example: Mark item as claimed
 */
async function exampleMarkClaimed() {
  console.log('✅ Example: Marking an item as claimed\n');

  const items = browseAvailableItems({ searchQuery: 'drill' });
  if (items.length === 0) {
    console.log('No items found to claim');
    return;
  }

  const drill = items[0];

  // Alice marks the drill as claimed by David
  await markItemClaimed(drill.id, 'user-david');
  console.log(`✓ Marked "${drill.name}" as claimed by user-david`);

  // Verify it's no longer showing as available
  const availableAfter = browseAvailableItems({ searchQuery: 'drill' });
  console.log(`Drills still available: ${availableAfter.length}\n`);
}

/**
 * Example: Render UI components
 */
function exampleRenderUI() {
  console.log('🎨 Example: Rendering UI components\n');

  const items = browseAvailableItems();

  // Render browse page
  const browsePage = renderBrowseItemsPage(items);
  console.log('✓ Rendered browse items page');

  // Render request dialog for first item
  if (items.length > 0) {
    const requestDialog = renderRequestDialog(items[0]);
    console.log('✓ Rendered request dialog');
  }

  // Render my requests page
  const myRequests = getMyRequests('user-david');
  const myRequestsPage = renderMyRequestsPage(myRequests);
  console.log('✓ Rendered my requests page');

  // Render incoming requests page
  const incomingRequests = getRequestsForMyItems('user-alice');
  const incomingPage = renderIncomingRequestsPage(incomingRequests);
  console.log('✓ Rendered incoming requests page\n');
}

/**
 * Run all examples
 */
export async function runResourceSharingExamples() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🌻 Resource Sharing System - Example Usage');
  console.log('═══════════════════════════════════════════════════════\n');

  // Initialize database
  await db.init();
  console.log('✓ Database initialized\n');

  // Run examples in sequence
  await examplePostItems();
  exampleBrowseItems();
  await exampleRequestItem();
  exampleViewMyRequests();
  exampleViewIncomingRequests();
  await exampleMarkClaimed();
  exampleRenderUI();

  console.log('═══════════════════════════════════════════════════════');
  console.log('✓ All examples completed!');
  console.log('═══════════════════════════════════════════════════════');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runResourceSharingExamples().catch(console.error);
}
