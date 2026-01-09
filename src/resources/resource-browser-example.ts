/**
 * Resource Browser Example
 * Demonstrates how to use the resource browsing feature
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 */

import { db } from '../core/database';
import { ResourceBrowserUI } from './resource-browser-ui';

/**
 * Initialize the resource browser UI
 */
export async function initResourceBrowser() {
  // Initialize database
  await db.init();

  // Add some example resources for testing
  await addExampleResources();

  // Create the browser UI
  // Get user's location if available (privacy-preserving)
  let userLocation: { latitude: number; longitude: number } | undefined;

  if (navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000
        });
      });

      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (error) {
      console.log('Location access denied or unavailable - browsing without location');
    }
  }

  // Create and render the browser
  const browserUI = new ResourceBrowserUI(db, {
    containerId: 'resource-browser',
    showFilters: true,
    userLocation,
    onResourceClick: (resource) => {
      console.log('Resource clicked:', resource);
      // Custom handler - could open a request modal, show contact info, etc.
    }
  });

  await browserUI.render();

  return browserUI;
}

/**
 * Add example resources for demonstration
 */
async function addExampleResources() {
  const existingResources = db.listResources();
  if (existingResources.length > 0) {
    // Already have resources, don't add examples
    return;
  }

  console.log('Adding example resources...');

  // Tools
  await db.addResource({
    name: 'Power Drill',
    description: 'Cordless drill with battery pack. Great for home projects.',
    resourceType: 'tool',
    shareMode: 'lend',
    available: true,
    ownerId: 'user1',
    location: '40.7128,-74.0060',
    tags: ['power-tools', 'woodworking', 'diy']
  });

  await db.addResource({
    name: 'Ladder',
    description: '6-foot step ladder. Perfect for indoor and outdoor projects.',
    resourceType: 'tool',
    shareMode: 'lend',
    available: true,
    ownerId: 'user1',
    location: '40.7128,-74.0060',
    tags: ['home-improvement', 'diy']
  });

  await db.addResource({
    name: 'Garden Tools Set',
    description: 'Complete set of hand tools for gardening: shovel, rake, hoe, trowel.',
    resourceType: 'tool',
    shareMode: 'lend',
    available: true,
    ownerId: 'user2',
    location: '40.7150,-74.0080',
    tags: ['gardening', 'hand-tools', 'outdoor']
  });

  // Equipment
  await db.addResource({
    name: 'Cargo Bike',
    description: 'Electric cargo bike with large basket. Great for groceries or moving items.',
    resourceType: 'equipment',
    shareMode: 'share',
    available: true,
    ownerId: 'user3',
    location: '40.7100,-74.0050',
    tags: ['transportation', 'electric', 'sustainable']
  });

  await db.addResource({
    name: 'Camping Tent',
    description: '4-person tent with rainfly. Perfect for weekend camping trips.',
    resourceType: 'equipment',
    shareMode: 'lend',
    available: false, // Currently unavailable
    ownerId: 'user3',
    location: '40.7100,-74.0050',
    tags: ['camping', 'outdoor', 'recreation']
  });

  // Give-aways
  await db.addResource({
    name: 'Wooden Bookshelf',
    description: 'Solid wood bookshelf, 5 shelves. Some wear but very sturdy.',
    resourceType: 'other',
    shareMode: 'give',
    available: true,
    ownerId: 'user4',
    location: '40.7080,-74.0040',
    tags: ['furniture', 'free', 'storage']
  });

  await db.addResource({
    name: 'Plant Starts',
    description: 'Tomato and basil seedlings. Ready to transplant!',
    resourceType: 'food',
    shareMode: 'give',
    available: true,
    ownerId: 'user5',
    location: '40.7160,-74.0070',
    tags: ['gardening', 'plants', 'free', 'food-growing']
  });

  // Space
  await db.addResource({
    name: 'Workshop Space',
    description: 'Small workshop with basic tools. Available for community projects.',
    resourceType: 'space',
    shareMode: 'share',
    available: true,
    ownerId: 'user6',
    location: '40.7140,-74.0065',
    tags: ['workspace', 'tools', 'community']
  });

  console.log('Example resources added!');
}

/**
 * Example: Search for specific items
 */
export async function searchExample() {
  await db.init();

  const { ResourceBrowser } = await import('./resource-browser');
  const browser = new ResourceBrowser(db);

  // Search for woodworking tools
  const woodworkingTools = await browser.browseResources({
    tags: ['woodworking'],
    availableOnly: true
  });

  console.log('Woodworking tools:', woodworkingTools);

  // Search for items to give away (buy-nothing style)
  const giveaways = await browser.browseResources({
    shareMode: 'give',
    availableOnly: true
  });

  console.log('Items being given away:', giveaways);

  // Search within walking distance
  const nearby = await browser.getWalkableResources(
    40.7128,
    -74.0060,
    1000 // 1km
  );

  console.log('Resources within 1km:', nearby);
}

// Auto-initialize if this script is loaded directly
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initResourceBrowser().catch(console.error);
    });
  } else {
    initResourceBrowser().catch(console.error);
  }
}
