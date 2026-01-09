/**
 * Need Response Example
 * Demonstrates how community members can respond to posted needs
 *
 * This example shows the joy of mutual aid - seeing what others need
 * and offering to help without money, debt, or obligation.
 */

import { LocalDatabase } from '../core/database';
import { NeedPosting } from './need-posting';
import { NeedBrowser } from './need-browser';
import {
  respondToNeed,
  getNeedResponses,
  markNeedFulfilled,
  getOpenNeeds,
  formatNeedForDisplay,
} from './need-response';

async function demonstrateNeedResponse() {
  console.log('🌻 Solarpunk Utopia - Community Needs Response Demo 🌻\n');

  // Initialize database
  const db = new LocalDatabase();
  await db.initialize();

  // Create service instances
  const needPosting = new NeedPosting(db);
  const needBrowser = new NeedBrowser(db);

  // ===== Scenario: Community Members Helping Each Other =====

  // Alex posts a need for tools
  console.log('📢 Alex posts a need for gardening tools...');
  const alexNeed = await needPosting.postNeed(
    {
      description: 'Looking for gardening tools - shovel, rake, and trowel. Planning to start a community garden plot this weekend!',
      urgency: 'helpful',
      resourceType: 'tool',
    },
    { userId: 'user-alex' }
  );
  console.log(`✅ Need posted: "${alexNeed.description}"`);
  console.log(`   Urgency: ${alexNeed.urgency}`);
  console.log('');

  // Jordan posts an urgent need
  console.log('📢 Jordan posts an urgent need for child care help...');
  const jordanNeed = await needPosting.postNeed(
    {
      description: 'Emergency childcare needed tomorrow afternoon (2-5pm). Regular sitter fell through. Two kids, ages 5 and 7.',
      urgency: 'urgent',
      resourceType: 'time',
    },
    { userId: 'user-jordan' }
  );
  console.log(`✅ Need posted: "${jordanNeed.description}"`);
  console.log(`   Urgency: ${jordanNeed.urgency} 🚨`);
  console.log('');

  // Browse all open needs
  console.log('👀 Community members browse open needs...\n');
  const openNeeds = getOpenNeeds();
  openNeeds.forEach((need, index) => {
    console.log(`${index + 1}. ${formatNeedForDisplay(need)}`);
    console.log('');
  });

  // ===== Community Responds! =====

  // Sam responds to Alex's need with an offer
  console.log('💚 Sam sees Alex\'s need and has extra tools to lend!');
  const samResponse = await respondToNeed(
    'user-sam',
    alexNeed.id,
    'I have all those tools! I can drop them off Saturday morning. They\'re yours to use for as long as you need.'
  );

  if (samResponse.success) {
    console.log(`✅ Sam's response recorded!`);
    console.log(`   Message: "${samResponse.response?.message}"`);
  }
  console.log('');

  // Riley also responds to Alex
  console.log('💚 Riley also wants to help Alex!');
  const rileyResponse = await respondToNeed(
    'user-riley',
    alexNeed.id,
    'I\'d love to help with the garden plot! I have experience with raised beds. Can I join you this weekend?'
  );

  if (rileyResponse.success) {
    console.log(`✅ Riley's response recorded!`);
    console.log(`   Message: "${rileyResponse.response?.message}"`);
  }
  console.log('');

  // Casey responds to Jordan's urgent need
  console.log('💚 Casey sees Jordan\'s urgent childcare need!');
  const caseyResponse = await respondToNeed(
    'user-casey',
    jordanNeed.id,
    'I can help! I\'m free tomorrow afternoon and my kids are the same age. Let\'s arrange a playdate at my place.',
    { responseType: 'offer-help' }
  );

  if (caseyResponse.success) {
    console.log(`✅ Casey's response recorded!`);
    console.log(`   This is mutual aid in action! 🌻`);
  }
  console.log('');

  // View responses to Alex's need
  console.log('📬 Alex checks responses to their need...\n');
  const alexResponses = getNeedResponses(alexNeed.id);
  console.log(`   ${alexResponses.length} community members have offered to help!`);
  alexResponses.forEach((response, index) => {
    console.log(`   ${index + 1}. ${response.event.note}`);
  });
  console.log('');

  // View responses to Jordan's urgent need
  console.log('📬 Jordan checks responses (urgent need)...\n');
  const jordanResponses = getNeedResponses(jordanNeed.id);
  console.log(`   ${jordanResponses.length} response to urgent need!`);
  jordanResponses.forEach((response, index) => {
    console.log(`   ${index + 1}. ${response.event.note}`);
  });
  console.log('');

  // Alex marks their need as fulfilled
  console.log('🎉 Alex\'s need was fulfilled! Marking it complete with gratitude...');
  const fulfilled = await markNeedFulfilled(
    alexNeed.id,
    'user-alex',
    {
      fulfilledBy: ['user-sam', 'user-riley'],
      gratitudeMessage: 'Thank you so much! The tools are perfect and I\'m so excited to have help with the garden. This community is amazing! 🌱',
    }
  );

  if (fulfilled.success) {
    console.log('✅ Need marked as fulfilled!');
    console.log('   Gratitude messages sent to helpers.');
    console.log('   No debt created - just community bonds strengthened! 💚');
  }
  console.log('');

  // Jordan marks their need as fulfilled too
  console.log('🎉 Jordan\'s urgent need was also fulfilled!');
  await markNeedFulfilled(
    jordanNeed.id,
    'user-jordan',
    {
      fulfilledBy: ['user-casey'],
      gratitudeMessage: 'Casey, you saved the day! The kids had so much fun. Thank you for being there when I needed help. 💖',
    }
  );
  console.log('✅ Emergency resolved through mutual aid!');
  console.log('');

  // Show updated open needs (should be empty now)
  console.log('📊 Community Status:');
  const remainingNeeds = getOpenNeeds();
  console.log(`   Open needs: ${remainingNeeds.length}`);
  console.log(`   Fulfilled needs: ${openNeeds.length - remainingNeeds.length}`);
  console.log('');

  console.log('🌻 This is the solarpunk vision in action:');
  console.log('   ✊ No money changed hands');
  console.log('   ✊ No debt was created');
  console.log('   ✊ No tracking or surveillance');
  console.log('   ✊ Just neighbors helping neighbors');
  console.log('   🌻 Building bonds, not bills');
  console.log('');

  // ===== Error Handling Examples =====

  console.log('🛡️ Testing Error Handling:\n');

  // Try to respond to your own need
  console.log('❌ Attempting to respond to your own need...');
  const selfResponse = await respondToNeed(
    'user-alex',
    alexNeed.id,
    'I can help myself!'
  );
  console.log(`   Result: ${selfResponse.success ? 'Success' : 'Failed'}`);
  console.log(`   Error: ${selfResponse.error}`);
  console.log('');

  // Try to respond to fulfilled need
  console.log('❌ Attempting to respond to already-fulfilled need...');
  const lateResponse = await respondToNeed(
    'user-taylor',
    alexNeed.id,
    'I want to help too!'
  );
  console.log(`   Result: ${lateResponse.success ? 'Success' : 'Failed'}`);
  console.log(`   Error: ${lateResponse.error}`);
  console.log('');

  console.log('✅ All tests complete!');
  console.log('🌻 Mutual aid works! Community care works! Solarpunk works! 🌻');
}

// Run the demonstration
if (require.main === module) {
  demonstrateNeedResponse()
    .then(() => {
      console.log('\n✨ Demo completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateNeedResponse };
