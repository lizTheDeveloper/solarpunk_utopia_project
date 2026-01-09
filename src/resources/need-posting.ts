/**
 * Need Posting - Post open requests and needs to the community
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * Implements posting and expressing community needs
 *
 * Following solarpunk values:
 * - No tracking or surveillance
 * - Offline-first
 * - Privacy-preserving
 * - Accessibility-first design
 * - Mutual aid and gift economy
 */

import type { Need, UrgencyLevel, ResourceType } from '../types';
import { LocalDatabase } from '../core/database';
import { sanitizeUserContent } from '../utils/sanitize';

export interface NeedInput {
  description: string;
  urgency?: UrgencyLevel;
  resourceType?: ResourceType;
}

export interface NeedPostOptions {
  userId: string;
}

/**
 * Post and manage community needs/requests
 *
 * This implements the ability for community members to express needs
 * in the spirit of mutual aid - not as transactions, but as vulnerable
 * asks that the community can respond to with care.
 */
export class NeedPosting {
  constructor(private db: LocalDatabase) {}

  /**
   * Post a new need or request to the community
   *
   * REQ-SHARE-001: User needs a particular item
   * "When they search or state their need"
   *
   * @param need - Description and details of the need
   * @param options - User context (who is posting)
   * @returns The created Need object
   */
  async postNeed(need: NeedInput, options: NeedPostOptions): Promise<Need> {
    // Validate description is not empty
    if (!need.description || need.description.trim().length === 0) {
      throw new Error('Need description cannot be empty');
    }

    // Sanitize description to prevent XSS
    const sanitizedDescription = sanitizeUserContent(need.description);

    // Default urgency to 'casual' if not specified
    // This reflects the non-transactional, non-demanding nature of mutual aid
    const urgency: UrgencyLevel = need.urgency || 'casual';

    // Create the need object
    const newNeed = await this.db.addNeed({
      userId: options.userId,
      description: sanitizedDescription,
      urgency: urgency,
      resourceType: need.resourceType,
      fulfilled: false,
    });

    return newNeed;
  }

  /**
   * Update an existing need (e.g., to mark as fulfilled or change urgency)
   *
   * @param needId - ID of the need to update
   * @param updates - Fields to update
   */
  async updateNeed(
    needId: string,
    updates: Partial<Pick<Need, 'description' | 'urgency' | 'resourceType' | 'fulfilled'>>
  ): Promise<void> {
    // Sanitize description if provided
    if (updates.description) {
      updates.description = sanitizeUserContent(updates.description);
    }

    await this.db.updateNeed(needId, updates);
  }

  /**
   * Mark a need as fulfilled
   *
   * @param needId - ID of the need to fulfill
   */
  async fulfillNeed(needId: string): Promise<void> {
    await this.db.updateNeed(needId, { fulfilled: true });
  }

  /**
   * Mark a need as unfulfilled (reopen)
   *
   * @param needId - ID of the need to reopen
   */
  async unfulfillNeed(needId: string): Promise<void> {
    await this.db.updateNeed(needId, { fulfilled: false });
  }

  /**
   * Delete a need (if user changes their mind or it's no longer relevant)
   *
   * @param needId - ID of the need to delete
   */
  async deleteNeed(needId: string): Promise<void> {
    await this.db.deleteNeed(needId);
  }

  /**
   * Get needs posted by a specific user
   *
   * @param userId - ID of the user
   * @returns Array of needs posted by the user
   */
  async getUserNeeds(userId: string): Promise<Need[]> {
    const allNeeds = this.db.listNeeds();
    return allNeeds.filter(need => need.userId === userId);
  }

  /**
   * Get active (unfulfilled) needs for a user
   *
   * @param userId - ID of the user
   * @returns Array of active needs
   */
  async getUserActiveNeeds(userId: string): Promise<Need[]> {
    const userNeeds = await this.getUserNeeds(userId);
    return userNeeds.filter(need => !need.fulfilled);
  }

  /**
   * @deprecated Use sanitizeUserContent from utils/sanitize instead
   * This method has been removed to use the centralized, more secure sanitization utility.
   */

  /**
   * Validate urgency level
   *
   * @param urgency - Urgency level to validate
   * @returns true if valid
   */
  isValidUrgency(urgency: string): urgency is UrgencyLevel {
    const validLevels: UrgencyLevel[] = ['casual', 'helpful', 'needed', 'urgent'];
    return validLevels.includes(urgency as UrgencyLevel);
  }

  /**
   * Validate resource type
   *
   * @param resourceType - Resource type to validate
   * @returns true if valid
   */
  isValidResourceType(resourceType: string): resourceType is ResourceType {
    const validTypes: ResourceType[] = [
      'tool', 'equipment', 'space', 'energy', 'food',
      'skill', 'time', 'robot', 'fabrication', 'other'
    ];
    return validTypes.includes(resourceType as ResourceType);
  }

  /**
   * Get human-readable description of urgency level
   *
   * @param urgency - Urgency level
   * @returns Human-readable description
   */
  getUrgencyDescription(urgency: UrgencyLevel): string {
    const descriptions: Record<UrgencyLevel, string> = {
      'casual': 'No rush - just putting it out there',
      'helpful': 'Would be helpful if available',
      'needed': 'Needed soon',
      'urgent': 'Urgent - needed as soon as possible'
    };
    return descriptions[urgency];
  }
}
