/**
 * Skill Categories Management - Time Bank Core
 * REQ-TIME-009: Skill Taxonomy
 *
 * Enables communities to define and manage their own skill taxonomies
 * that emerge from community practice rather than being imposed top-down.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Community-defined - taxonomies emerge from actual community practice
 * - Flexible and organic - no rigid hierarchies, categories can overlap
 * - Offline-first - works without internet connection
 * - No gatekeeping - anyone can suggest categories, community decides
 */

import { db } from '../core/database';
import type { SkillCategory } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';
import { getAllSkillCategories } from './skill-offer';

/**
 * Options for creating a skill category definition
 */
export interface CreateCategoryOptions {
  name: string;
  description: string;
  createdBy: string; // User who suggested this category
  examples?: string[]; // Example skills that fit this category
  relatedCategories?: string[]; // Related/overlapping categories
}

/**
 * Create or update a skill category definition
 * REQ-TIME-009: Community adds new skill category
 *
 * @param options - Category details
 * @returns The created/updated category
 */
export async function defineCategory(options: CreateCategoryOptions): Promise<SkillCategory> {
  // Validate required fields
  if (!options.name || options.name.trim().length === 0) {
    throw new Error('Category name is required');
  }

  if (!options.description || options.description.trim().length === 0) {
    throw new Error('Category description is required');
  }

  requireValidIdentifier(options.createdBy, 'Creator user ID');

  // Sanitize user-provided content
  const sanitizedName = sanitizeUserContent(options.name.trim()).toLowerCase();
  const sanitizedDescription = sanitizeUserContent(options.description.trim());
  const sanitizedExamples = options.examples?.map(ex => sanitizeUserContent(ex.trim())) || [];
  const sanitizedRelated = options.relatedCategories?.map(cat => sanitizeUserContent(cat.trim()).toLowerCase()) || [];

  // Build category object
  const category: Omit<SkillCategory, 'id' | 'createdAt' | 'updatedAt'> = {
    name: sanitizedName,
    description: sanitizedDescription,
    createdBy: options.createdBy,
    examples: sanitizedExamples,
    relatedCategories: sanitizedRelated,
    usageCount: 0, // Will be calculated from actual skill offers
  };

  try {
    const saved = await db.addSkillCategory(category);
    return saved;
  } catch (error) {
    console.error(`Failed to create skill category ${sanitizedName}:`, error);
    throw new Error(`Could not create skill category: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update an existing skill category definition
 *
 * @param categoryId - The unique identifier of the category
 * @param updates - Partial updates to apply
 */
export async function updateCategoryDefinition(
  categoryId: string,
  updates: Partial<Omit<CreateCategoryOptions, 'createdBy'>>
): Promise<void> {
  requireValidIdentifier(categoryId, 'Category ID');

  // Get existing category
  const existing = getCategoryDefinition(categoryId);
  if (!existing) {
    throw new Error('Category not found');
  }

  // Build sanitized updates
  const sanitizedUpdates: Partial<SkillCategory> = {};

  if (updates.name !== undefined) {
    sanitizedUpdates.name = sanitizeUserContent(updates.name.trim()).toLowerCase();
  }

  if (updates.description !== undefined) {
    sanitizedUpdates.description = sanitizeUserContent(updates.description.trim());
  }

  if (updates.examples !== undefined) {
    sanitizedUpdates.examples = updates.examples.map(ex => sanitizeUserContent(ex.trim()));
  }

  if (updates.relatedCategories !== undefined) {
    sanitizedUpdates.relatedCategories = updates.relatedCategories.map(cat =>
      sanitizeUserContent(cat.trim()).toLowerCase()
    );
  }

  try {
    await db.updateSkillCategory(categoryId, sanitizedUpdates);
  } catch (error) {
    console.error(`Failed to update skill category ${categoryId}:`, error);
    throw new Error(`Could not update skill category: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a skill category definition by ID
 *
 * @param categoryId - The unique identifier of the category
 * @returns The category definition, or undefined if not found
 */
export function getCategoryDefinition(categoryId: string): SkillCategory | undefined {
  if (!validateIdentifier(categoryId)) {
    return undefined;
  }

  const allCategories = db.listSkillCategories();
  return allCategories.find(cat => cat.id === categoryId);
}

/**
 * Get a skill category definition by name
 *
 * @param categoryName - The name of the category (case-insensitive)
 * @returns The category definition, or undefined if not found
 */
export function getCategoryByName(categoryName: string): SkillCategory | undefined {
  const normalized = categoryName.toLowerCase().trim();
  if (!normalized) return undefined;

  const allCategories = db.listSkillCategories();
  return allCategories.find(cat => cat.name === normalized);
}

/**
 * Get all defined skill category definitions with usage statistics
 * REQ-TIME-009: Community-defined taxonomy
 *
 * @returns Array of category definitions, sorted by usage
 */
export function getAllCategoryDefinitions(): SkillCategory[] {
  const categories = db.listSkillCategories();

  // Calculate usage counts from actual skills
  const skillCategories = getAllSkillCategories();
  const usageCounts = new Map<string, number>();

  skillCategories.forEach(catName => {
    const normalized = catName.toLowerCase();
    usageCounts.set(normalized, (usageCounts.get(normalized) || 0) + 1);
  });

  // Update usage counts and sort by usage
  return categories
    .map(cat => ({
      ...cat,
      usageCount: usageCounts.get(cat.name) || 0
    }))
    .sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get categories that are being used in skill offers but not yet formally defined
 * This helps identify organic categories emerging from community practice
 * REQ-TIME-009: Community-defined taxonomy emerges from practice
 *
 * @returns Array of category names that need definitions
 */
export function getUndefinedCategories(): Array<{ name: string; count: number }> {
  const allUsedCategories = getAllSkillCategories();
  const definedCategories = db.listSkillCategories().map(cat => cat.name);
  const definedSet = new Set(definedCategories);

  // Count usage of undefined categories
  const undefinedCounts = new Map<string, number>();

  allUsedCategories.forEach(catName => {
    const normalized = catName.toLowerCase();
    if (!definedSet.has(normalized)) {
      undefinedCounts.set(normalized, (undefinedCounts.get(normalized) || 0) + 1);
    }
  });

  return Array.from(undefinedCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count); // Sort by usage descending
}

/**
 * Suggest related categories for a given category
 * Helps with navigation and discovery
 *
 * @param categoryName - The category to find relations for
 * @returns Array of related category definitions
 */
export function getRelatedCategories(categoryName: string): SkillCategory[] {
  const normalized = categoryName.toLowerCase().trim();
  const category = getCategoryByName(normalized);

  if (!category || !category.relatedCategories || category.relatedCategories.length === 0) {
    return [];
  }

  const allCategories = db.listSkillCategories();
  return allCategories.filter(cat =>
    category.relatedCategories!.includes(cat.name)
  );
}

/**
 * Search for categories by keyword
 *
 * @param keyword - Search term
 * @returns Array of matching category definitions
 */
export function searchCategories(keyword: string): SkillCategory[] {
  const searchTerm = keyword.toLowerCase().trim();
  if (!searchTerm) return [];

  const allCategories = getAllCategoryDefinitions();
  return allCategories.filter(cat =>
    cat.name.includes(searchTerm) ||
    cat.description.toLowerCase().includes(searchTerm) ||
    cat.examples.some(ex => ex.toLowerCase().includes(searchTerm))
  );
}

/**
 * Format a category for display
 *
 * @param category - The category to format
 * @returns Formatted string for CLI display
 */
export function formatCategoryForDisplay(category: SkillCategory): string {
  const relatedText = category.relatedCategories && category.relatedCategories.length > 0
    ? `\n   Related: ${category.relatedCategories.map(r => `🔗 ${r}`).join(', ')}`
    : '';

  const examplesText = category.examples && category.examples.length > 0
    ? `\n   Examples: ${category.examples.join(', ')}`
    : '';

  return `
🏷️  ${category.name} (${category.usageCount} skill${category.usageCount === 1 ? '' : 's'})
   ${category.description}${examplesText}${relatedText}
  `.trim();
}

/**
 * Format a list of categories for display
 *
 * @param categories - Categories to format
 * @returns Formatted string for CLI display
 */
export function formatCategoriesListDetailed(categories: SkillCategory[]): string {
  if (categories.length === 0) {
    return '🌻 No categories defined yet. Start offering skills to create organic categories!';
  }

  const formatted = categories.map((cat, index) => {
    const number = `${index + 1}.`;
    return `${number} ${formatCategoryForDisplay(cat)}`;
  }).join('\n\n');

  return formatted;
}

/**
 * Format undefined categories for display
 * Helps community coordinators see what categories are emerging
 *
 * @param undefinedCats - Undefined categories with usage counts
 * @returns Formatted string for CLI display
 */
export function formatUndefinedCategories(
  undefinedCats: Array<{ name: string; count: number }>
): string {
  if (undefinedCats.length === 0) {
    return '✅ All categories in use have been defined!';
  }

  const formatted = undefinedCats.map(({ name, count }) => {
    return `  🏷️  ${name} (${count} skill${count === 1 ? '' : 's'}) - needs definition`;
  }).join('\n');

  return `
🌱 Emerging Categories (not yet defined):
${formatted}

💡 These categories are being used in skill offers but don't have formal definitions yet.
   Consider defining them to help community members understand what they include!
  `.trim();
}

/**
 * Generate category suggestions based on skill name and description
 * Simple keyword-based suggestions (AI-powered suggestions come in Phase 10)
 *
 * @param skillName - Name of the skill
 * @param skillDescription - Description of the skill
 * @returns Array of suggested category names
 */
export function suggestCategoriesForSkill(
  skillName: string,
  skillDescription: string
): string[] {
  const text = `${skillName} ${skillDescription}`.toLowerCase();
  const allCategories = getAllCategoryDefinitions();

  // Simple keyword matching
  const suggestions = allCategories
    .filter(cat => {
      // Check if category name appears in skill text
      if (text.includes(cat.name)) return true;

      // Check if any example keywords match
      return cat.examples.some(ex =>
        text.includes(ex.toLowerCase())
      );
    })
    .map(cat => cat.name)
    .slice(0, 5); // Limit to 5 suggestions

  return suggestions;
}
