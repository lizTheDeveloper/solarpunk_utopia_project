/**
 * Skill and Time Offering - Time Bank Core
 * REQ-TIME-003: Skill and Service Offerings
 * REQ-TIME-004: Ongoing vs. One-Time Offers
 *
 * Enables community members to offer their skills, time, and services in a
 * gift economy framework - no hour-for-hour tracking, just abundance sharing.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gift economy - no debt tracking, no reciprocity enforcement
 * - Community vitality - track abundance, not obligation
 * - Offline-first - works without internet connection
 * - Privacy-preserving - opt-in sharing, no surveillance
 */

import { db } from '../core/database';
import type { SkillOffer } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

/**
 * Availability pattern for skill offers
 */
export interface AvailabilityPattern {
  type: 'ongoing' | 'one-time' | 'recurring';

  // For recurring offers
  daysOfWeek?: number[]; // 0 = Sunday, 6 = Saturday
  timesOfDay?: ('morning' | 'afternoon' | 'evening' | 'flexible')[];

  // For one-time offers
  specificDate?: number; // Unix timestamp

  // For all types
  notes?: string; // e.g., "Tuesdays after 6pm", "Flexible, just ask!"
}

/**
 * Location preferences for offering skills
 */
export interface LocationPreference {
  type: 'my-place' | 'your-place' | 'community-space' | 'virtual' | 'flexible';
  details?: string;
  maxDistance?: number; // in kilometers, for travel-based offers
}

/**
 * Skill level - for learning pathways
 * REQ-TIME-010: Skill Levels and Learning
 */
export type SkillLevel = 'beginner-friendly' | 'intermediate' | 'expert' | 'mentorship-offered';

/**
 * Options for creating a skill offer
 */
export interface CreateSkillOfferOptions {
  userId: string;
  skillName: string;
  description: string;
  categories: string[]; // e.g., ["repair", "electronics"], ["cooking", "vegan"]
  skillLevel?: SkillLevel;

  // Availability
  availability?: AvailabilityPattern;

  // Location
  location?: LocationPreference;

  // Accessibility
  accessibilityNotes?: string; // REQ-TIME-011: Accessibility and Accommodation

  // Materials/preparation needed
  materialsNeeded?: string[];
  preparationTime?: number; // in minutes

  // Duration estimate (not for accounting, just coordination)
  typicalDuration?: number; // in minutes, e.g., "tutoring sessions usually 60min"

  // Preferences (not requirements!)
  preferences?: {
    groupSize?: 'one-on-one' | 'small-group' | 'large-group' | 'flexible';
    ageGroups?: ('children' | 'teens' | 'adults' | 'elders' | 'all-ages')[];
    languages?: string[]; // Languages spoken, for matching
  };
}

/**
 * Create a new skill/time offering
 * REQ-TIME-003: User creates time offering
 */
export async function createSkillOffer(options: CreateSkillOfferOptions): Promise<SkillOffer> {
  // Validate required fields
  if (!options.skillName || options.skillName.trim().length === 0) {
    throw new Error('Skill name is required');
  }

  if (!options.description || options.description.trim().length === 0) {
    throw new Error('Skill description is required');
  }

  if (!options.categories || options.categories.length === 0) {
    throw new Error('At least one category is required');
  }

  requireValidIdentifier(options.userId, 'User ID');

  // Sanitize user-provided content
  const sanitizedSkillName = sanitizeUserContent(options.skillName.trim());
  const sanitizedDescription = sanitizeUserContent(options.description.trim());
  const sanitizedCategories = options.categories.map(cat => sanitizeUserContent(cat.trim()));

  // Build skill offer object (avoiding undefined for Automerge compatibility)
  const skillOffer: Omit<SkillOffer, 'id' | 'createdAt' | 'updatedAt'> = {
    userId: options.userId,
    skillName: sanitizedSkillName,
    description: sanitizedDescription,
    categories: sanitizedCategories,
    available: true,
  };

  // Add to database
  try {
    const savedSkill = await db.addSkill(skillOffer);
    return savedSkill;
  } catch (error) {
    console.error(`Failed to create skill offer for user ${options.userId}:`, error);
    throw new Error(`Could not create skill offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update an existing skill offer
 *
 * @param skillId - The unique identifier of the skill offer to update
 * @param updates - Partial updates to apply to the skill offer
 * @throws Error if skill not found or update fails
 */
export async function updateSkillOffer(
  skillId: string,
  updates: Partial<CreateSkillOfferOptions>
): Promise<void> {
  requireValidIdentifier(skillId, 'Skill ID');

  // Get existing skill to verify ownership could be checked here if needed
  const existingSkill = getSkillOffer(skillId);
  if (!existingSkill) {
    throw new Error('Skill offer not found');
  }

  // Build sanitized updates (avoid undefined for Automerge)
  const sanitizedUpdates: Partial<SkillOffer> = {};

  if (updates.skillName !== undefined) {
    sanitizedUpdates.skillName = sanitizeUserContent(updates.skillName.trim());
  }

  if (updates.description !== undefined) {
    sanitizedUpdates.description = sanitizeUserContent(updates.description.trim());
  }

  if (updates.categories !== undefined) {
    sanitizedUpdates.categories = updates.categories.map(cat => sanitizeUserContent(cat.trim()));
  }

  try {
    await db.updateSkill(skillId, sanitizedUpdates);
  } catch (error) {
    console.error(`Failed to update skill offer ${skillId}:`, error);
    throw new Error(`Could not update skill offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mark a skill offer as unavailable (temporarily or permanently)
 *
 * @param skillId - The unique identifier of the skill offer
 * @throws Error if update fails
 */
export async function markSkillUnavailable(skillId: string): Promise<void> {
  requireValidIdentifier(skillId, 'Skill ID');
  try {
    await db.updateSkill(skillId, { available: false });
  } catch (error) {
    console.error(`Failed to mark skill ${skillId} as unavailable:`, error);
    throw new Error(`Could not update skill availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mark a skill offer as available again
 *
 * @param skillId - The unique identifier of the skill offer
 * @throws Error if update fails
 */
export async function markSkillAvailable(skillId: string): Promise<void> {
  requireValidIdentifier(skillId, 'Skill ID');
  try {
    await db.updateSkill(skillId, { available: true });
  } catch (error) {
    console.error(`Failed to mark skill ${skillId} as available:`, error);
    throw new Error(`Could not update skill availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a skill offer
 * Note: Currently marks as unavailable until deleteSkill is implemented in database
 *
 * @param skillId - The unique identifier of the skill offer
 * @throws Error if update fails
 */
export async function deleteSkillOffer(skillId: string): Promise<void> {
  requireValidIdentifier(skillId, 'Skill ID');

  // For now, we'll mark as unavailable since there's no delete method yet
  // TODO: Add deleteSkill method to database when implementing full CRUD
  await markSkillUnavailable(skillId);
}

/**
 * Get all skill offers by a specific user
 */
export function getMySkillOffers(userId: string): SkillOffer[] {
  if (!validateIdentifier(userId)) {
    return [];
  }

  const allSkills = db.listSkills();
  return allSkills.filter(skill => skill.userId === userId);
}

/**
 * Get a specific skill offer by ID
 */
export function getSkillOffer(skillId: string): SkillOffer | undefined {
  if (!validateIdentifier(skillId)) {
    return undefined;
  }

  const allSkills = db.listSkills();
  return allSkills.find(skill => skill.id === skillId);
}

/**
 * Get all available skill offers in the community
 * REQ-TIME-003: Browse available skills
 */
export function getAvailableSkills(): SkillOffer[] {
  const allSkills = db.listSkills();
  return allSkills.filter(skill => skill.available);
}

/**
 * Get available skills by category
 * REQ-TIME-009: Skill Taxonomy
 */
export function getSkillsByCategory(category: string): SkillOffer[] {
  const availableSkills = getAvailableSkills();
  const normalizedCategory = category.toLowerCase().trim();

  return availableSkills.filter(skill =>
    skill.categories.some(cat => cat.toLowerCase() === normalizedCategory)
  );
}

/**
 * Search skills by keyword in name or description
 */
export function searchSkills(keyword: string): SkillOffer[] {
  const searchTerm = keyword.toLowerCase().trim();
  if (!searchTerm) return [];

  const availableSkills = getAvailableSkills();
  return availableSkills.filter(skill =>
    skill.skillName.toLowerCase().includes(searchTerm) ||
    skill.description.toLowerCase().includes(searchTerm) ||
    skill.categories.some(cat => cat.toLowerCase().includes(searchTerm))
  );
}

/**
 * Get all unique skill categories in the community
 * REQ-TIME-009: Community-defined taxonomy
 */
export function getAllSkillCategories(): string[] {
  const allSkills = db.listSkills();
  const categoriesSet = new Set<string>();

  allSkills.forEach(skill => {
    skill.categories.forEach(cat => categoriesSet.add(cat));
  });

  return Array.from(categoriesSet).sort();
}

/**
 * Format skill offer for display
 */
export function formatSkillForDisplay(skill: SkillOffer): string {
  const categoryBadges = skill.categories.map(cat => `🏷️ ${cat}`).join(' ');

  return `
    💡 <strong>${skill.skillName}</strong>
    ${skill.description}
    ${categoryBadges}
    ${skill.available ? '✅ Available' : '⏸️ Currently unavailable'}
  `.trim();
}
