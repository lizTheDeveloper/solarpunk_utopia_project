/**
 * Browse Available Skills - Example Usage
 * REQ-TIME-003: Browse available skills
 *
 * This file demonstrates how community members can discover and browse
 * skills offered by others in their community.
 */

import { createSkillOffer } from './skill-offer';
import {
  browseSkills,
  getCategoriesWithCounts,
  getSkillStatistics,
  formatSkillsList,
  formatCategoriesList,
  formatStatistics,
  suggestSkillsForNeed
} from './browse-skills';

// ============================================================================
// EXAMPLE 1: Browse All Available Skills
// ============================================================================

async function example1_BrowseAllSkills() {
  console.log('=== Example 1: Browse All Available Skills ===\n');

  // First, let's add some skills to the community
  await createSkillOffer({
    userId: 'user-maria',
    skillName: 'Bicycle Repair',
    description: 'I can fix flat tires, adjust brakes, tune up bikes. I have tools!',
    categories: ['repair', 'transportation']
  });

  await createSkillOffer({
    userId: 'user-jamal',
    skillName: 'Sourdough Baking',
    description: 'Teaching bread making with natural starter. I can show you how!',
    categories: ['cooking', 'education']
  });

  await createSkillOffer({
    userId: 'user-chen',
    skillName: 'Garden Design',
    description: 'Permaculture garden planning and companion planting advice',
    categories: ['gardening', 'education']
  });

  // Browse all available skills
  const allSkills = browseSkills();
  console.log(`Found ${allSkills.total} skills in the community:\n`);
  console.log(formatSkillsList(allSkills.skills));
  console.log('\n');
}

// ============================================================================
// EXAMPLE 2: Browse Skills by Category
// ============================================================================

function example2_BrowseByCategory() {
  console.log('=== Example 2: Browse Skills by Category ===\n');

  // See what categories are available
  const categories = getCategoriesWithCounts();
  console.log(formatCategoriesList(categories));
  console.log('\n');

  // Browse repair skills
  const repairSkills = browseSkills({ category: 'repair' });
  console.log(`🔧 Repair Skills (${repairSkills.total}):\n`);
  console.log(formatSkillsList(repairSkills.skills));
  console.log('\n');

  // Browse education skills
  const educationSkills = browseSkills({ category: 'education' });
  console.log(`📚 Education Skills (${educationSkills.total}):\n`);
  console.log(formatSkillsList(educationSkills.skills));
  console.log('\n');
}

// ============================================================================
// EXAMPLE 3: Search for Specific Skills
// ============================================================================

function example3_SearchSkills() {
  console.log('=== Example 3: Search for Specific Skills ===\n');

  // Search for skills related to bikes
  const bikeSkills = browseSkills({ searchTerm: 'bike' });
  console.log(`🚲 Search results for "bike":\n`);
  console.log(formatSkillsList(bikeSkills.skills));
  console.log('\n');

  // Search for skills related to food
  const foodSkills = browseSkills({ searchTerm: 'cooking' });
  console.log(`🍳 Search results for "cooking":\n`);
  console.log(formatSkillsList(foodSkills.skills));
  console.log('\n');
}

// ============================================================================
// EXAMPLE 4: View Community Statistics
// ============================================================================

function example4_ViewStatistics() {
  console.log('=== Example 4: View Community Statistics ===\n');

  const stats = getSkillStatistics();
  console.log(formatStatistics(stats));
  console.log('\n');
}

// ============================================================================
// EXAMPLE 5: Pagination (for large communities)
// ============================================================================

function example5_Pagination() {
  console.log('=== Example 5: Paginated Browsing ===\n');

  // Get first page (2 skills per page)
  const page1 = browseSkills({ limit: 2, offset: 0 });
  console.log(`Page 1 (showing ${page1.skills.length} of ${page1.total}):\n`);
  console.log(formatSkillsList(page1.skills));
  console.log(`\nHas more: ${page1.hasMore}\n`);

  if (page1.hasMore) {
    // Get second page
    const page2 = browseSkills({ limit: 2, offset: 2 });
    console.log(`Page 2 (showing ${page2.skills.length} of ${page2.total}):\n`);
    console.log(formatSkillsList(page2.skills));
    console.log(`\nHas more: ${page2.hasMore}\n`);
  }
}

// ============================================================================
// EXAMPLE 6: Sort Skills Different Ways
// ============================================================================

function example6_Sorting() {
  console.log('=== Example 6: Different Sort Orders ===\n');

  // Sort by name
  const byName = browseSkills({ sortBy: 'name' });
  console.log('📝 Sorted by name:\n');
  console.log(formatSkillsList(byName.skills.slice(0, 3)));
  console.log('\n');

  // Sort by newest
  const byNewest = browseSkills({ sortBy: 'newest' });
  console.log('⏰ Sorted by newest:\n');
  console.log(formatSkillsList(byNewest.skills.slice(0, 3)));
  console.log('\n');
}

// ============================================================================
// EXAMPLE 7: Get Suggestions for a Need
// ============================================================================

function example7_SuggestSkills() {
  console.log('=== Example 7: Get Skill Suggestions for a Need ===\n');

  // Imagine someone says "I need help fixing my bike"
  const suggestions = suggestSkillsForNeed('fix my bike');
  console.log('💡 Suggestions for "I need help fixing my bike":\n');
  console.log(formatSkillsList(suggestions));
  console.log('\n');

  // Someone wants to learn about gardening
  const gardenSuggestions = suggestSkillsForNeed('learn about gardening');
  console.log('💡 Suggestions for "I want to learn about gardening":\n');
  console.log(formatSkillsList(gardenSuggestions));
  console.log('\n');
}

// ============================================================================
// EXAMPLE 8: Combined Filters
// ============================================================================

function example8_CombinedFilters() {
  console.log('=== Example 8: Combined Filters ===\n');

  // Get education skills, sorted by name, limited to 2
  const filtered = browseSkills({
    category: 'education',
    sortBy: 'name',
    limit: 2
  });

  console.log(`📚 Education skills (sorted by name, limited to 2):\n`);
  console.log(formatSkillsList(filtered.skills));
  console.log('\n');
}

// ============================================================================
// EXAMPLE 9: Gift Economy Principles in Action
// ============================================================================

function example9_GiftEconomyPrinciples() {
  console.log('=== Example 9: Gift Economy Principles ===\n');

  console.log('🌻 GIFT ECONOMY PRINCIPLES:\n');
  console.log('✓ No hour-for-hour tracking');
  console.log('✓ No debt or obligation');
  console.log('✓ No reciprocity enforcement');
  console.log('✓ Focus on abundance and community needs\n');

  const stats = getSkillStatistics();
  console.log('Instead of tracking who "owes" whom, we track:\n');
  console.log(`• Community abundance: ${stats.totalSkills} skills offered`);
  console.log(`• Diversity: ${stats.totalCategories} different categories`);
  console.log(`• Vitality: ${stats.recentlyAdded.length} skills added recently\n`);

  console.log('This creates a culture of:');
  console.log('• Contributing according to ability');
  console.log('• Receiving according to need');
  console.log('• Building connections over transactions\n');
}

// ============================================================================
// EXAMPLE 10: Real-World Use Cases
// ============================================================================

function example10_RealWorldUseCases() {
  console.log('=== Example 10: Real-World Use Cases ===\n');

  console.log('USE CASE 1: New Community Member');
  console.log('Sarah just joined the community and wants to see what skills are available:\n');
  const overview = browseSkills({ limit: 5 });
  console.log(formatSkillsList(overview.skills));
  console.log('\n');

  console.log('USE CASE 2: Specific Need');
  console.log('Marcus needs bike repair and searches for help:\n');
  const bikeHelp = browseSkills({ searchTerm: 'bicycle' });
  console.log(formatSkillsList(bikeHelp.skills));
  console.log('\n');

  console.log('USE CASE 3: Learning Opportunity');
  console.log('Aisha wants to learn a new skill and browses education offerings:\n');
  const learning = browseSkills({ category: 'education' });
  console.log(formatSkillsList(learning.skills));
  console.log('\n');

  console.log('USE CASE 4: Community Coordinator');
  console.log('Jamie reviews community statistics to identify skill gaps:\n');
  const communityStats = getSkillStatistics();
  console.log(formatStatistics(communityStats));
  console.log('\n');
}

// ============================================================================
// Run all examples
// ============================================================================

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  BROWSE AVAILABLE SKILLS - EXAMPLE USAGE                  ║');
  console.log('║  Time Bank Core (Gift Economy!)                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await example1_BrowseAllSkills();
  example2_BrowseByCategory();
  example3_SearchSkills();
  example4_ViewStatistics();
  example5_Pagination();
  example6_Sorting();
  example7_SuggestSkills();
  example8_CombinedFilters();
  example9_GiftEconomyPrinciples();
  example10_RealWorldUseCases();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🌻 The future is solarpunk ✨                             ║');
  console.log('║  Liberation infrastructure for the new world!              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
