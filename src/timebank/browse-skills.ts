/**
 * Browse Available Skills - Time Bank Core
 * REQ-TIME-003: Browse available skills
 *
 * Enables community members to discover skills and services offered by others
 * in their community through browsing, searching, and filtering.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gift economy - discover what people offer freely, no transactional focus
 * - Community vitality - see the abundance of skills in your community
 * - Offline-first - works without internet connection
 * - Privacy-preserving - only see what people choose to share
 */

import {
  getAvailableSkills,
  getSkillsByCategory,
  searchSkills,
  getAllSkillCategories,
  formatSkillForDisplay
} from './skill-offer';
import type { SkillOffer } from '../types';

/**
 * Browse options for filtering and sorting skill offers
 */
export interface BrowseOptions {
  // Filter by category
  category?: string;

  // Search by keyword
  searchTerm?: string;

  // Sort order
  sortBy?: 'newest' | 'oldest' | 'name' | 'category';

  // Limit results (useful for pagination)
  limit?: number;
  offset?: number;
}

/**
 * Result of browsing skills, with pagination info
 */
export interface BrowseResult {
  skills: SkillOffer[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Statistics about available skills in the community
 */
export interface SkillStatistics {
  totalSkills: number;
  totalCategories: number;
  topCategories: Array<{ category: string; count: number }>;
  recentlyAdded: SkillOffer[];
}

/**
 * Browse available skills with filtering and sorting
 *
 * @param options - Options for filtering, searching, and pagination
 * @returns Paginated results with skills matching the criteria
 */
export function browseSkills(options: BrowseOptions = {}): BrowseResult {
  let skills: SkillOffer[];

  // Apply filters
  if (options.searchTerm) {
    // Search takes precedence
    skills = searchSkills(options.searchTerm);
  } else if (options.category) {
    // Filter by category
    skills = getSkillsByCategory(options.category);
  } else {
    // Get all available skills
    skills = getAvailableSkills();
  }

  // Sort
  skills = sortSkills(skills, options.sortBy || 'newest');

  // Pagination
  const offset = options.offset || 0;
  const limit = options.limit || skills.length; // Default: no limit
  const total = skills.length;
  const paginatedSkills = skills.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    skills: paginatedSkills,
    total,
    offset,
    limit,
    hasMore
  };
}

/**
 * Get all skill categories with counts
 * Useful for showing category navigation/filters
 */
export function getCategoriesWithCounts(): Array<{ category: string; count: number }> {
  const allSkills = getAvailableSkills();
  const categoryCounts = new Map<string, number>();

  allSkills.forEach(skill => {
    skill.categories.forEach(category => {
      const count = categoryCounts.get(category) || 0;
      categoryCounts.set(category, count + 1);
    });
  });

  return Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * Get statistics about skills in the community
 * Helps visualize community abundance and identify needs
 */
export function getSkillStatistics(): SkillStatistics {
  const allSkills = getAvailableSkills();
  const categories = getAllSkillCategories();
  const categoriesWithCounts = getCategoriesWithCounts();

  // Get recently added (last 5)
  const sorted = sortSkills(allSkills, 'newest');
  const recentlyAdded = sorted.slice(0, 5);

  return {
    totalSkills: allSkills.length,
    totalCategories: categories.length,
    topCategories: categoriesWithCounts.slice(0, 5), // Top 5 categories
    recentlyAdded
  };
}

/**
 * Format skills for display in a list
 *
 * @param skills - Skills to format
 * @returns Formatted string for CLI display
 */
export function formatSkillsList(skills: SkillOffer[]): string {
  if (skills.length === 0) {
    return '🌻 No skills found. Be the first to offer your talents to the community!';
  }

  const formatted = skills.map((skill, index) => {
    const categories = skill.categories.map(c => `🏷️ ${c}`).join(' ');
    const number = `${index + 1}.`;

    return `
${number} 💡 ${skill.skillName}
   ${skill.description}
   ${categories}
   Offered by: ${skill.userId}
   Status: ${skill.available ? '✅ Available' : '⏸️ Unavailable'}
   Added: ${new Date(skill.createdAt).toLocaleDateString()}
    `.trim();
  }).join('\n\n');

  return formatted;
}

/**
 * Format category list for navigation
 *
 * @param categoriesWithCounts - Categories with their counts
 * @returns Formatted string for CLI display
 */
export function formatCategoriesList(categoriesWithCounts: Array<{ category: string; count: number }>): string {
  if (categoriesWithCounts.length === 0) {
    return '🌻 No categories yet. Start offering skills to create categories!';
  }

  const formatted = categoriesWithCounts.map(({ category, count }) => {
    return `  🏷️  ${category} (${count} ${count === 1 ? 'skill' : 'skills'})`;
  }).join('\n');

  return `Available Categories:\n${formatted}`;
}

/**
 * Format statistics for display
 *
 * @param stats - Statistics object
 * @returns Formatted string for CLI display
 */
export function formatStatistics(stats: SkillStatistics): string {
  const topCategories = stats.topCategories
    .map(({ category, count }) => `   ${category} (${count})`)
    .join('\n');

  const recentSkills = stats.recentlyAdded
    .map(skill => `   • ${skill.skillName} by ${skill.userId}`)
    .join('\n');

  return `
🌻 Community Skills Overview

Total Skills Offered: ${stats.totalSkills}
Skill Categories: ${stats.totalCategories}

Top Categories:
${topCategories || '   (none yet)'}

Recently Added:
${recentSkills || '   (none yet)'}
  `.trim();
}

/**
 * Helper: Sort skills by different criteria
 */
function sortSkills(skills: SkillOffer[], sortBy: 'newest' | 'oldest' | 'name' | 'category'): SkillOffer[] {
  const sorted = [...skills]; // Don't mutate original array

  switch (sortBy) {
    case 'newest':
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'oldest':
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case 'name':
      sorted.sort((a, b) => a.skillName.localeCompare(b.skillName));
      break;
    case 'category':
      sorted.sort((a, b) => {
        const catA = a.categories[0] || '';
        const catB = b.categories[0] || '';
        return catA.localeCompare(catB);
      });
      break;
  }

  return sorted;
}

/**
 * Suggest skills based on a need or interest
 * Simple keyword-based matching (AI matching comes in Phase 10)
 *
 * @param need - Description of what the user needs help with
 * @returns Skills that might match the need
 */
export function suggestSkillsForNeed(need: string): SkillOffer[] {
  // For now, use simple search
  // Phase 10 will add AI-powered intelligent matching
  return searchSkills(need);
}
