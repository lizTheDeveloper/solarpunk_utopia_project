/**
 * Example: Posting Community Needs
 *
 * This demonstrates how to use the need posting feature to express
 * community needs in the spirit of mutual aid.
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * "When they search or state their need"
 */

import { LocalDatabase } from '../core/database';
import { NeedPosting } from './need-posting';
import { initNeedPostingUI } from '../ui/need-posting-ui';

async function exampleNeedPosting() {
  console.log('=== Need Posting Example ===\n');

  // Initialize database
  const db = new LocalDatabase('example-need-posting-db');
  await db.init();

  // Create need posting service
  const needPosting = new NeedPosting(db);

  // Example user ID (in real app, this comes from authentication)
  const userId = 'user-123';

  console.log('1. Posting a casual need...');
  const casualNeed = await needPosting.postNeed(
    {
      description: 'Looking for a bicycle for my daughter. Any size works!',
      urgency: 'casual',
      resourceType: 'other',
    },
    { userId }
  );
  console.log('✓ Posted casual need:', casualNeed);
  console.log();

  console.log('2. Posting an urgent need...');
  const urgentNeed = await needPosting.postNeed(
    {
      description: 'Need help moving furniture this weekend. Heavy couch and dresser.',
      urgency: 'urgent',
      resourceType: 'time',
    },
    { userId }
  );
  console.log('✓ Posted urgent need:', urgentNeed);
  console.log();

  console.log('3. Posting a food need...');
  const foodNeed = await needPosting.postNeed(
    {
      description: 'Could use some fresh vegetables if anyone has extra from their garden',
      urgency: 'helpful',
      resourceType: 'food',
    },
    { userId }
  );
  console.log('✓ Posted food need:', foodNeed);
  console.log();

  console.log('4. Listing all needs for the user...');
  const userNeeds = await needPosting.getUserNeeds(userId);
  console.log(`User has ${userNeeds.length} needs:`);
  userNeeds.forEach((need, index) => {
    console.log(`  ${index + 1}. [${need.urgency.toUpperCase()}] ${need.description}`);
  });
  console.log();

  console.log('5. Fulfilling a need...');
  await needPosting.fulfillNeed(foodNeed.id);
  console.log(`✓ Marked food need as fulfilled`);
  console.log();

  console.log('6. Getting active (unfulfilled) needs...');
  const activeNeeds = await needPosting.getUserActiveNeeds(userId);
  console.log(`User has ${activeNeeds.length} active needs:`);
  activeNeeds.forEach((need, index) => {
    console.log(`  ${index + 1}. [${need.urgency.toUpperCase()}] ${need.description}`);
  });
  console.log();

  console.log('7. Updating a need urgency...');
  await needPosting.updateNeed(casualNeed.id, { urgency: 'needed' });
  console.log('✓ Updated bicycle need urgency to "needed"');
  console.log();

  // Clean up
  await db.close();

  console.log('=== Example Complete ===');
}

/**
 * Example: Using the Need Posting UI
 */
async function exampleNeedPostingUI() {
  console.log('=== Need Posting UI Example ===\n');

  // Initialize database
  const db = new LocalDatabase('example-need-posting-ui-db');
  await db.init();

  // Current user ID (in real app, from authentication)
  const userId = 'user-456';

  console.log('Initializing Need Posting UI...');

  // In a browser environment, you would call:
  // const ui = initNeedPostingUI(db, userId, 'need-posting-container');

  // The UI will render a form that allows users to:
  // - Describe their need
  // - Select urgency level
  // - Optionally categorize the resource type
  // - Submit the need to the community

  console.log('✓ UI would be rendered in the specified container');
  console.log('✓ Form includes accessibility features (ARIA labels, keyboard navigation)');
  console.log('✓ Works offline - data is saved locally first');
  console.log();

  // Listen for need posted events
  console.log('Setting up event listener for posted needs...');
  window.addEventListener('needPosted', (event: any) => {
    console.log('✓ Need posted event received:', event.detail);
  });

  // Clean up
  await db.close();

  console.log('=== UI Example Complete ===');
}

/**
 * Example: Validation and Sanitization
 */
async function exampleValidation() {
  console.log('=== Validation Example ===\n');

  const db = new LocalDatabase('example-validation-db');
  await db.init();

  const needPosting = new NeedPosting(db);
  const userId = 'user-789';

  console.log('1. Testing urgency level validation...');
  console.log(`Is "casual" valid? ${needPosting.isValidUrgency('casual')}`);
  console.log(`Is "super-urgent" valid? ${needPosting.isValidUrgency('super-urgent')}`);
  console.log();

  console.log('2. Testing resource type validation...');
  console.log(`Is "food" valid? ${needPosting.isValidResourceType('food')}`);
  console.log(`Is "spaceship" valid? ${needPosting.isValidResourceType('spaceship')}`);
  console.log();

  console.log('3. Getting urgency descriptions...');
  console.log(`Casual: ${needPosting.getUrgencyDescription('casual')}`);
  console.log(`Urgent: ${needPosting.getUrgencyDescription('urgent')}`);
  console.log();

  console.log('4. Testing XSS protection...');
  try {
    const maliciousNeed = await needPosting.postNeed(
      {
        description: '<script>alert("xss")</script>Looking for help',
        urgency: 'casual',
      },
      { userId }
    );
    console.log('✓ Sanitized description:', maliciousNeed.description);
    console.log('  (Script tags removed)');
  } catch (error) {
    console.error('Error:', error);
  }
  console.log();

  console.log('5. Testing empty description validation...');
  try {
    await needPosting.postNeed(
      {
        description: '',
        urgency: 'casual',
      },
      { userId }
    );
    console.log('✗ Should have thrown an error');
  } catch (error: any) {
    console.log('✓ Correctly rejected:', error.message);
  }
  console.log();

  // Clean up
  await db.close();

  console.log('=== Validation Example Complete ===');
}

// Run examples if executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  exampleNeedPosting()
    .then(() => exampleValidation())
    .catch(console.error);
} else {
  // Browser environment
  console.log('Need Posting Examples loaded. Run:');
  console.log('- exampleNeedPosting() for basic posting');
  console.log('- exampleNeedPostingUI() for UI example');
  console.log('- exampleValidation() for validation examples');
}

// Export for use in browser
if (typeof window !== 'undefined') {
  (window as any).exampleNeedPosting = exampleNeedPosting;
  (window as any).exampleNeedPostingUI = exampleNeedPostingUI;
  (window as any).exampleValidation = exampleValidation;
}
