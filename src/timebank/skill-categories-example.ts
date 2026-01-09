/**
 * Example usage of Skill Categories Management
 * REQ-TIME-009: Skill Taxonomy
 *
 * This example demonstrates how communities can define and manage
 * their own skill taxonomies that emerge from practice.
 */

import { db } from '../core/database';
import { createSkillOffer } from './skill-offer';
import {
  defineCategory,
  getAllCategoryDefinitions,
  getUndefinedCategories,
  formatCategoriesListDetailed,
  formatUndefinedCategories,
  suggestCategoriesForSkill
} from './skill-categories';

async function main() {
  // Initialize database
  await db.init();

  console.log('🌻 Skill Categories - Community-Defined Taxonomy Example\n');

  // ===== Step 1: Skills emerge organically =====
  console.log('📝 Step 1: Community members offer skills...\n');

  await createSkillOffer({
    userId: 'user-alice',
    skillName: 'Bicycle Repair',
    description: 'I can fix flat tires, adjust brakes, tune up bikes',
    categories: ['repair', 'transportation', 'maintenance']
  });

  await createSkillOffer({
    userId: 'user-bob',
    skillName: 'Computer Troubleshooting',
    description: 'Fix laptops, install Linux, recover data',
    categories: ['repair', 'technology', 'troubleshooting']
  });

  await createSkillOffer({
    userId: 'user-charlie',
    skillName: 'Garden Planning',
    description: 'Design permaculture gardens',
    categories: ['gardening', 'design', 'permaculture']
  });

  await createSkillOffer({
    userId: 'user-diana',
    skillName: 'Sourdough Baking',
    description: 'Teach sourdough bread making',
    categories: ['cooking', 'teaching', 'fermentation']
  });

  console.log('✅ 4 skills offered by community members\n');

  // ===== Step 2: See which categories emerged =====
  console.log('🌱 Step 2: See which categories emerged from practice...\n');

  const undefinedCategories = getUndefinedCategories();
  console.log(formatUndefinedCategories(undefinedCategories));
  console.log('\n');

  // ===== Step 3: Define commonly-used categories =====
  console.log('📖 Step 3: Define categories that are being used...\n');

  await defineCategory({
    name: 'Repair',
    description: 'Skills related to fixing and maintaining items - from bikes to computers to appliances',
    createdBy: 'user-alice',
    examples: [
      'bicycle repair',
      'computer repair',
      'appliance repair',
      'tool maintenance',
      'electronics troubleshooting'
    ],
    relatedCategories: ['maintenance', 'troubleshooting', 'diy']
  });

  await defineCategory({
    name: 'Gardening',
    description: 'Growing food, plants, and cultivating green spaces',
    createdBy: 'user-charlie',
    examples: [
      'vegetable gardening',
      'permaculture design',
      'composting',
      'seed saving',
      'native plants'
    ],
    relatedCategories: ['permaculture', 'food', 'ecology']
  });

  await defineCategory({
    name: 'Cooking',
    description: 'Food preparation, preservation, and culinary skills',
    createdBy: 'user-diana',
    examples: [
      'baking',
      'fermentation',
      'canning',
      'meal prep',
      'plant-based cooking'
    ],
    relatedCategories: ['food', 'fermentation', 'preservation']
  });

  console.log('✅ Defined 3 categories\n');

  // ===== Step 4: View all defined categories =====
  console.log('📚 Step 4: View all defined categories...\n');

  const allCategories = getAllCategoryDefinitions();
  console.log(formatCategoriesListDetailed(allCategories));
  console.log('\n');

  // ===== Step 5: Check which categories still need definition =====
  console.log('🔍 Step 5: See remaining undefined categories...\n');

  const stillUndefined = getUndefinedCategories();
  console.log(formatUndefinedCategories(stillUndefined));
  console.log('\n');

  // ===== Step 6: Get category suggestions for a new skill =====
  console.log('💡 Step 6: Get category suggestions for a new skill...\n');

  console.log('Skill: "Bicycle Maintenance Workshop"');
  console.log('Description: "Teach basic bike repair and maintenance"');

  const suggestions = suggestCategoriesForSkill(
    'Bicycle Maintenance Workshop',
    'Teach basic bike repair and maintenance'
  );

  console.log('\nSuggested categories:');
  if (suggestions.length > 0) {
    suggestions.forEach(cat => console.log(`  🏷️  ${cat}`));
  } else {
    console.log('  No suggestions found. Consider creating new categories!');
  }
  console.log('\n');

  // ===== Gift Economy Principles =====
  console.log('🌻 Gift Economy Principles:\n');
  console.log('- Categories emerge from community practice, not imposed top-down');
  console.log('- Anyone can define categories, not just administrators');
  console.log('- Categories can overlap and relate (not rigid hierarchies)');
  console.log('- Focus on abundance: "What skills do we have?" not "What are you qualified for?"');
  console.log('- Community-defined: each community creates taxonomies that reflect their values\n');
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
