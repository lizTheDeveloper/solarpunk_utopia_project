/**
 * Need Browser - Browse community needs and requests
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * "When they search or state their need"
 *
 * Following solarpunk values:
 * - No tracking or surveillance
 * - Offline-first
 * - Privacy-preserving
 * - Mutual aid focused
 */

import type { Need, UrgencyLevel, ResourceType } from '../types';
import { LocalDatabase } from '../core/database';

export interface NeedFilter {
  /**
   * Filter by urgency level
   */
  urgency?: UrgencyLevel;

  /**
   * Filter by resource type
   */
  resourceType?: ResourceType;

  /**
   * Only show unfulfilled needs
   */
  unfulfilledOnly?: boolean;

  /**
   * Search query (searches in description)
   */
  searchQuery?: string;

  /**
   * Sort by urgency (most urgent first)
   */
  sortByUrgency?: boolean;
}

export interface NeedSearchResult {
  need: Need;
  relevanceScore?: number;
}

/**
 * Browse and search community needs
 */
export class NeedBrowser {
  constructor(private db: LocalDatabase) {}

  /**
   * Browse needs with optional filtering and sorting
   *
   * @param filter - Filter criteria for needs
   * @returns Array of matching needs with search metadata
   */
  async browseNeeds(filter: NeedFilter = {}): Promise<NeedSearchResult[]> {
    let needs = this.db.listNeeds();

    // Filter by fulfilled status
    if (filter.unfulfilledOnly !== false) {
      needs = needs.filter(need => !need.fulfilled);
    }

    // Filter by urgency
    if (filter.urgency) {
      needs = needs.filter(need => need.urgency === filter.urgency);
    }

    // Filter by resource type
    if (filter.resourceType) {
      needs = needs.filter(need => need.resourceType === filter.resourceType);
    }

    // Search by query
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const query = filter.searchQuery.toLowerCase().trim();
      needs = needs.filter(need =>
        need.description.toLowerCase().includes(query)
      );
    }

    // Sort by urgency if requested (or by default)
    if (filter.sortByUrgency !== false) {
      needs = this.sortByUrgency(needs);
    }

    // Convert to search results
    return needs.map(need => ({
      need,
      relevanceScore: this.calculateRelevanceScore(need)
    }));
  }

  /**
   * Get needs by specific urgency level
   *
   * @param urgency - Urgency level to filter by
   * @returns Array of needs with that urgency
   */
  async getNeedsByUrgency(urgency: UrgencyLevel): Promise<Need[]> {
    const results = await this.browseNeeds({ urgency, unfulfilledOnly: true });
    return results.map(r => r.need);
  }

  /**
   * Get urgent and needed requests (priority view)
   *
   * @returns Array of high-priority needs
   */
  async getHighPriorityNeeds(): Promise<Need[]> {
    const allNeeds = this.db.listNeeds();
    const unfulfilled = allNeeds.filter(need => !need.fulfilled);
    const urgent = unfulfilled.filter(need =>
      need.urgency === 'urgent' || need.urgency === 'needed'
    );
    return this.sortByUrgency(urgent);
  }

  /**
   * Sort needs by urgency level (most urgent first)
   *
   * @param needs - Array of needs to sort
   * @returns Sorted array
   */
  private sortByUrgency(needs: Need[]): Need[] {
    const urgencyOrder: Record<UrgencyLevel, number> = {
      'urgent': 0,
      'needed': 1,
      'helpful': 2,
      'casual': 3
    };

    return [...needs].sort((a, b) => {
      const aOrder = urgencyOrder[a.urgency];
      const bOrder = urgencyOrder[b.urgency];
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      // If same urgency, sort by creation time (newer first)
      return b.createdAt - a.createdAt;
    });
  }

  /**
   * Calculate relevance score for a need
   * Higher scores indicate more critical/time-sensitive needs
   *
   * @param need - Need to score
   * @returns Relevance score (0-100)
   */
  private calculateRelevanceScore(need: Need): number {
    let score = 50; // Base score

    // Urgency adds to score
    const urgencyScores: Record<UrgencyLevel, number> = {
      'urgent': 40,
      'needed': 30,
      'helpful': 15,
      'casual': 0
    };
    score += urgencyScores[need.urgency];

    // Newer needs get slight boost
    const ageInDays = (Date.now() - need.createdAt) / (1000 * 60 * 60 * 24);
    if (ageInDays < 1) {
      score += 10;
    } else if (ageInDays < 3) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Get human-readable urgency description
   *
   * @param urgency - Urgency level
   * @returns Description text
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

  /**
   * Get emoji/icon for urgency level
   *
   * @param urgency - Urgency level
   * @returns Emoji representing urgency
   */
  getUrgencyIcon(urgency: UrgencyLevel): string {
    const icons: Record<UrgencyLevel, string> = {
      'casual': '💭',
      'helpful': '🌱',
      'needed': '⚡',
      'urgent': '🚨'
    };
    return icons[urgency];
  }

  /**
   * Get color class for urgency level (for CSS styling)
   *
   * @param urgency - Urgency level
   * @returns CSS class name
   */
  getUrgencyColorClass(urgency: UrgencyLevel): string {
    return `urgency-${urgency}`;
  }
}
