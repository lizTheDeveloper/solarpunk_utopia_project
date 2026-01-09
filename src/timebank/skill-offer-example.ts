/**
 * Example usage of Skill Offering feature
 * REQ-TIME-003: Skill and Service Offerings
 *
 * This file demonstrates how community members can offer their skills and time
 * in the gift economy time bank.
 */

import {
  createSkillOffer,
  updateSkillOffer,
  markSkillUnavailable,
  markSkillAvailable,
  getMySkillOffers,
  getAvailableSkills,
  getSkillsByCategory,
  searchSkills,
  getAllSkillCategories,
  formatSkillForDisplay,
} from './skill-offer';

/**
 * Example: User offers bicycle repair skills
 * REQ-TIME-003: User creates time offering
 */
export async function exampleOfferBicycleRepair() {
  console.log('📝 Creating bicycle repair skill offer...\n');

  const skill = await createSkillOffer({
    userId: 'user-maria',
    skillName: 'Bicycle Repair & Maintenance',
    description: 'I can fix flat tires, adjust brakes and gears, replace chains, and do basic tune-ups. I have tools and a repair stand. Happy to teach you while I work!',
    categories: ['repair', 'transportation', 'teaching'],
  });

  console.log('✅ Skill offer created:');
  console.log(formatSkillForDisplay(skill));
  console.log('');

  return skill;
}

/**
 * Example: User offers multiple skills
 * REQ-TIME-003: User offers multiple skills
 */
export async function exampleOfferMultipleSkills() {
  console.log('📝 Offering multiple skills...\n');

  // Gardening skill
  const gardening = await createSkillOffer({
    userId: 'user-alex',
    skillName: 'Permaculture Garden Design',
    description: 'I can help design food forests, create composting systems, and plan water-efficient gardens. 20 years of experience!',
    categories: ['gardening', 'food', 'ecology', 'teaching'],
  });

  // Cooking skill
  const cooking = await createSkillOffer({
    userId: 'user-alex',
    skillName: 'Vegan Cooking Classes',
    description: 'Learn to make delicious plant-based meals on a budget. Great for beginners!',
    categories: ['cooking', 'food', 'education', 'health'],
  });

  // Solar installation skill
  const solar = await createSkillOffer({
    userId: 'user-alex',
    skillName: 'DIY Solar Panel Installation',
    description: 'Help with small solar projects - phone chargers, garden lights, battery systems. Safety first!',
    categories: ['energy', 'technology', 'teaching'],
  });

  console.log('✅ Created 3 skill offers:');
  console.log('1. ' + formatSkillForDisplay(gardening));
  console.log('2. ' + formatSkillForDisplay(cooking));
  console.log('3. ' + formatSkillForDisplay(solar));
  console.log('');

  return [gardening, cooking, solar];
}

/**
 * Example: Browse available skills in the community
 * REQ-TIME-003: Browse available skills
 */
export async function exampleBrowseSkills() {
  console.log('🔍 Browsing available skills in the community...\n');

  const allSkills = getAvailableSkills();

  console.log(`Found ${allSkills.length} available skills:\n`);

  allSkills.forEach((skill, index) => {
    console.log(`${index + 1}. ${formatSkillForDisplay(skill)}\n`);
  });

  return allSkills;
}

/**
 * Example: Search for specific skills
 */
export async function exampleSearchSkills() {
  console.log('🔍 Searching for repair skills...\n');

  const repairSkills = searchSkills('repair');

  console.log(`Found ${repairSkills.length} repair-related skills:\n`);

  repairSkills.forEach(skill => {
    console.log('• ' + skill.skillName);
    console.log('  ' + skill.description);
    console.log('  Categories: ' + skill.categories.join(', '));
    console.log('');
  });

  return repairSkills;
}

/**
 * Example: Browse skills by category
 * REQ-TIME-009: Skill Taxonomy
 */
export async function exampleBrowseByCategory() {
  console.log('📂 Browsing skills by category...\n');

  // Get all available categories
  const categories = getAllSkillCategories();
  console.log('Available categories:', categories.join(', '));
  console.log('');

  // Browse a specific category
  console.log('🍳 Cooking skills:\n');
  const cookingSkills = getSkillsByCategory('cooking');

  cookingSkills.forEach(skill => {
    console.log('• ' + skill.skillName);
    console.log('  ' + skill.description);
    console.log('');
  });

  return cookingSkills;
}

/**
 * Example: Manage your own skill offers
 */
export async function exampleManageMySkills() {
  const userId = 'user-maria';

  console.log(`📋 Managing skills for ${userId}...\n`);

  // Create a skill
  const skill = await createSkillOffer({
    userId,
    skillName: 'Spanish Tutoring',
    description: 'Native Spanish speaker, can help with conversation practice',
    categories: ['education', 'language'],
  });

  console.log('✅ Created skill:');
  console.log(formatSkillForDisplay(skill));
  console.log('');

  // Update the skill
  console.log('✏️ Updating skill description...');
  await updateSkillOffer(skill.id, {
    description: 'Native Spanish speaker from Argentina. Can help with conversation, grammar, and cultural context. All levels welcome!',
  });

  console.log('✅ Updated!\n');

  // Temporarily mark as unavailable
  console.log('⏸️ Taking a break for the summer...');
  await markSkillUnavailable(skill.id);
  console.log('✅ Marked as unavailable\n');

  // Later, mark as available again
  console.log('▶️ Back from vacation!');
  await markSkillAvailable(skill.id);
  console.log('✅ Marked as available again\n');

  // View all my skills
  const mySkills = getMySkillOffers(userId);
  console.log(`📊 ${userId} has ${mySkills.length} skill offer(s):\n`);

  mySkills.forEach(s => {
    console.log(formatSkillForDisplay(s));
    console.log('');
  });

  return skill;
}

/**
 * Example: Accessibility-aware skill offering
 * REQ-TIME-011: Accessibility and Accommodation
 */
export async function exampleAccessibleSkillOffer() {
  console.log('♿ Creating accessibility-aware skill offer...\n');

  const skill = await createSkillOffer({
    userId: 'user-jamie',
    skillName: 'Digital Art & Design',
    description: 'Help with graphic design, photo editing, social media graphics. I use screen readers and can teach accessible design practices.',
    categories: ['technology', 'art', 'education', 'accessibility'],
  });

  console.log('✅ Created accessible skill offer:');
  console.log(formatSkillForDisplay(skill));
  console.log('');
  console.log('Note: This offer includes accessibility information so');
  console.log('the community can ensure appropriate accommodations.');
  console.log('');

  return skill;
}

/**
 * Example scenario: Community needs plumbing help
 * REQ-TIME-020: Skill Gap Identification
 */
export async function exampleSkillGapIdentification() {
  console.log('🔍 Identifying skill gaps in the community...\n');

  // Check if plumbing skills are available
  const plumbingSkills = searchSkills('plumbing');

  if (plumbingSkills.length === 0) {
    console.log('⚠️ Skill Gap Identified: No plumbing skills available');
    console.log('');
    console.log('Suggestions:');
    console.log('• Host a "Basic Plumbing for Everyone" workshop');
    console.log('• Reach out to retired plumbers in the community');
    console.log('• Partner with local trade schools');
    console.log('• Share DIY plumbing resources');
    console.log('');
  } else {
    console.log(`✅ Found ${plumbingSkills.length} plumbing skill offer(s)`);
    console.log('');
  }

  // Show all categories to identify what's abundant vs scarce
  const allCategories = getAllSkillCategories();
  console.log('Skill categories in the community:');
  console.log(allCategories.join(', '));
  console.log('');

  return { plumbingSkills, allCategories };
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🌻 Solarpunk Time Bank - Skill Offering Examples 🌻');
  console.log('=================================================\n');

  await exampleOfferBicycleRepair();
  await exampleOfferMultipleSkills();
  await exampleBrowseSkills();
  await exampleSearchSkills();
  await exampleBrowseByCategory();
  await exampleManageMySkills();
  await exampleAccessibleSkillOffer();
  await exampleSkillGapIdentification();

  console.log('✨ All examples completed! ✨');
  console.log('');
  console.log('Remember: This is a gift economy - no hour tracking,');
  console.log('no debt, just community members helping each other! 🌻');
}

// Uncomment to run examples:
// import { db } from '../core/database';
// db.init().then(runAllExamples);
