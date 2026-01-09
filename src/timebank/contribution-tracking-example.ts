/**
 * Example usage of Community Contribution Tracking
 * REQ-TIME-002: Abundance Tracking Over Debt
 * REQ-TIME-019: Participation Encouragement
 * REQ-TIME-020: Skill Gap Identification
 * REQ-TIME-021: Care and Burnout Prevention
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * This file demonstrates how to track community contributions, analyze vitality,
 * and prevent burnout - all without creating debt or obligation.
 */

import {
  recordContribution,
  celebrateContribution,
  getUserContributions,
  analyzeVitality,
  checkBurnoutRisk,
  getUserStats,
  formatVitalityInsights,
  formatUserStats,
} from './contribution-tracking';

/**
 * Example: Record a time bank contribution
 * REQ-TIME-002: Track contributions to build picture of community vitality
 */
export async function exampleRecordWorkshop() {
  console.log('📝 Recording a workshop contribution...\n');

  const contribution = await recordContribution({
    userId: 'user-maria',
    contributionType: 'skill-share',
    description: 'Taught bicycle repair workshop in the community garden',
    skillsUsed: ['bicycle repair', 'teaching', 'public speaking'],
    timeInvested: 120, // 2 hours
    impactDescription: '8 community members learned to fix flat tires and adjust brakes',
    visibility: 'community',
  });

  console.log('✅ Contribution recorded:');
  console.log(`   ID: ${contribution.id}`);
  console.log(`   Type: ${contribution.contributionType}`);
  console.log(`   Description: ${contribution.description}`);
  console.log(`   Skills used: ${contribution.skillsUsed?.join(', ')}`);
  console.log(`   Time invested: ${contribution.timeInvested} minutes`);
  console.log(`   Impact: ${contribution.impactDescription}`);
  console.log('');

  return contribution;
}

/**
 * Example: Record emotional support contribution
 * REQ-TIME-002: Track diverse types of contributions
 */
export async function exampleRecordEmotionalSupport() {
  console.log('📝 Recording emotional support contribution...\n');

  const contribution = await recordContribution({
    userId: 'user-alex',
    contributionType: 'emotional-support',
    description: 'Had coffee with neighbor going through difficult time',
    timeInvested: 90,
    impactDescription: 'Provided listening ear and companionship',
    recipientIds: ['user-jordan'],
    visibility: 'private', // Keep this one private
  });

  console.log('✅ Support contribution recorded (privately)');
  console.log(`   Type: ${contribution.contributionType}`);
  console.log(`   Visibility: ${contribution.visibility}`);
  console.log('');

  return contribution;
}

/**
 * Example: Celebrate a contribution
 * REQ-TIME-022: Recognition Without Hierarchy
 */
export async function exampleCelebrateContribution() {
  console.log('🎉 Celebrating a contribution...\n');

  // First create a contribution
  const contribution = await recordContribution({
    userId: 'user-sam',
    contributionType: 'random-kindness',
    description: 'Organized community potluck and invited new neighbors',
    skillsUsed: ['event planning', 'community building'],
    visibility: 'community',
  });

  // Now celebrate it
  await celebrateContribution(contribution.id, 'user-maria');
  await celebrateContribution(contribution.id, 'user-alex');
  await celebrateContribution(contribution.id, 'user-jordan');

  console.log('✅ Contribution celebrated by 3 community members!');
  console.log(`   Contribution: ${contribution.description}`);
  console.log('   This builds connection through gratitude, NOT obligation');
  console.log('');
}

/**
 * Example: View user's contribution history
 * REQ-TIME-019: Participation Encouragement
 */
export async function exampleViewUserContributions() {
  console.log('📊 Viewing user contribution history...\n');

  // Create some example contributions
  await recordContribution({
    userId: 'user-maria',
    contributionType: 'skill-share',
    description: 'Bicycle repair workshop',
    skillsUsed: ['bicycle repair', 'teaching'],
  });

  await recordContribution({
    userId: 'user-maria',
    contributionType: 'care',
    description: 'Visited elderly neighbor',
    timeInvested: 60,
  });

  await recordContribution({
    userId: 'user-maria',
    contributionType: 'resource-share',
    description: 'Shared garden harvest with 5 families',
    skillsUsed: ['gardening'],
  });

  const contributions = getUserContributions('user-maria');

  console.log(`✅ Found ${contributions.length} contributions from user-maria:`);
  contributions.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.contributionType}: ${c.description}`);
  });
  console.log('');
}

/**
 * Example: Get user statistics
 * REQ-TIME-002: Show participation vitality
 */
export async function exampleUserStats() {
  console.log('📊 Getting user statistics...\n');

  // Create diverse contributions
  await recordContribution({
    userId: 'user-alex',
    contributionType: 'skill-share',
    description: 'Gardening workshop',
    skillsUsed: ['gardening', 'teaching'],
  });

  await recordContribution({
    userId: 'user-alex',
    contributionType: 'skill-share',
    description: 'Cooking class',
    skillsUsed: ['cooking', 'teaching'],
  });

  await recordContribution({
    userId: 'user-alex',
    contributionType: 'time-offer',
    description: 'Helped build community shed',
    skillsUsed: ['carpentry'],
    timeInvested: 240,
  });

  const stats = getUserStats('user-alex');
  const formatted = formatUserStats('user-alex', stats);

  console.log(formatted);
}

/**
 * Example: Analyze community vitality
 * REQ-TIME-002: Show abundance, unmet needs, and participation vitality
 * REQ-TIME-020: Skill Gap Identification
 */
export async function exampleAnalyzeVitality() {
  console.log('📊 Analyzing community vitality...\n');

  // Create diverse community contributions
  await recordContribution({
    userId: 'user-maria',
    contributionType: 'skill-share',
    description: 'Bicycle repair workshop',
    skillsUsed: ['bicycle repair', 'teaching'],
  });

  await recordContribution({
    userId: 'user-alex',
    contributionType: 'care',
    description: 'Elder check-in visits',
    skillsUsed: ['caregiving', 'companionship'],
  });

  await recordContribution({
    userId: 'user-sam',
    contributionType: 'resource-share',
    description: 'Shared power tools',
    skillsUsed: ['tool maintenance'],
  });

  await recordContribution({
    userId: 'user-jordan',
    contributionType: 'random-kindness',
    description: 'Made welcome baskets for new neighbors',
    skillsUsed: ['community building', 'crafts'],
  });

  const vitality = analyzeVitality({ periodDays: 30 });
  const formatted = formatVitalityInsights(vitality);

  console.log(formatted);
  console.log('💡 This shows what the community HAS, not what people "owe"');
  console.log('');
}

/**
 * Example: Check for burnout risk
 * REQ-TIME-021: Care and Burnout Prevention
 */
export async function exampleBurnoutCheck() {
  console.log('🛡️ Checking for burnout risk...\n');

  // User with healthy participation
  await recordContribution({
    userId: 'user-healthy',
    contributionType: 'skill-share',
    description: 'Workshop 1',
  });

  await recordContribution({
    userId: 'user-healthy',
    contributionType: 'care',
    description: 'Support visit',
  });

  const healthyRisk = checkBurnoutRisk('user-healthy', 14);
  console.log('✅ User with healthy participation:');
  console.log(`   At risk? ${healthyRisk.atRisk}`);
  console.log('');

  // User at risk of burnout
  for (let i = 0; i < 20; i++) {
    await recordContribution({
      userId: 'user-overcommitted',
      contributionType: 'time-offer',
      description: `Contribution ${i + 1}`,
    });
  }

  const burnoutRisk = checkBurnoutRisk('user-overcommitted', 14);
  console.log('⚠️ User at risk of burnout:');
  console.log(`   At risk? ${burnoutRisk.atRisk}`);
  console.log(`   Reason: ${burnoutRisk.reason}`);
  console.log(`   Suggestion: ${burnoutRisk.suggestion}`);
  console.log('');
  console.log('   This is GENTLE encouragement, not enforcement.');
  console.log('   The system respects autonomy while caring for wellbeing.');
  console.log('');
}

/**
 * Example: Demonstrate abundance tracking vs debt tracking
 * REQ-TIME-001: Gift-Based Time Sharing
 * REQ-TIME-002: Abundance Tracking Over Debt
 */
export async function exampleAbundanceNotDebt() {
  console.log('✨ Demonstrating Gift Economy (NOT debt tracking)...\n');

  // Maria gives help
  const contribution1 = await recordContribution({
    userId: 'user-maria',
    contributionType: 'skill-share',
    description: 'Taught Jordan bicycle repair',
    recipientIds: ['user-jordan'],
  });

  console.log('✅ Maria helped Jordan learn bicycle repair');
  console.log('   Contribution tracked: YES');
  console.log('   Debt created: NO');
  console.log('   Jordan "owes" Maria: NO');
  console.log('');

  // Jordan receives help but doesn't "owe" anything
  const jordanContributions = getUserContributions('user-jordan');
  console.log(`📊 Jordan's "balance": ${jordanContributions.length} contributions`);
  console.log('   This is NOT a balance sheet!');
  console.log('   Jordan can contribute when/how they want');
  console.log('   No reciprocity required');
  console.log('');

  // Later, Jordan helps someone else (NOT "paying back" Maria)
  await recordContribution({
    userId: 'user-jordan',
    contributionType: 'care',
    description: 'Visited elderly neighbor Sam',
    recipientIds: ['user-sam'],
  });

  console.log('✅ Jordan later helped Sam');
  console.log('   This is gift economy in action!');
  console.log('   Jordan helped Sam because they wanted to');
  console.log('   NOT because they "owed" Maria');
  console.log('');

  console.log('🌻 Key principle: We track ABUNDANCE, not DEBT');
  console.log('   - What skills the community has');
  console.log('   - What contributions are happening');
  console.log('   - Who might need support or rest');
  console.log('   - How to celebrate generosity');
  console.log('');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('Community Contribution Tracking Examples');
  console.log('='.repeat(60));
  console.log('');

  await exampleRecordWorkshop();
  await exampleRecordEmotionalSupport();
  await exampleCelebrateContribution();
  await exampleViewUserContributions();
  await exampleUserStats();
  await exampleAnalyzeVitality();
  await exampleBurnoutCheck();
  await exampleAbundanceNotDebt();

  console.log('='.repeat(60));
  console.log('✅ All examples completed!');
  console.log('='.repeat(60));
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
