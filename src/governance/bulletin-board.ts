/**
 * Community Bulletin Board - Announcements, events, celebrations, and coordination
 *
 * REQ-GOV-019: Community Bulletin Board
 * "The platform SHALL provide a community bulletin board for announcements,
 * events, celebrations, and informal coordination."
 *
 * Following solarpunk values:
 * - No tracking or surveillance
 * - Offline-first
 * - Privacy-preserving
 * - Community ownership
 * - Mutual aid and gift economy
 */

import type { BulletinPost, BulletinPostType, BulletinPostStatus, BulletinComment, RSVPResponse } from '../types';
import { LocalDatabase } from '../core/database';
import { sanitizeUserContent } from '../utils/sanitize';

export interface BulletinPostInput {
  title: string;
  content: string;
  postType: BulletinPostType;
  communityGroupId?: string;
  tags?: string[];
  // Event-specific fields
  eventDetails?: {
    startTime: number;
    endTime?: number;
    location?: string;
    isRecurring?: boolean;
    recurrencePattern?: string;
  };
}

export interface BulletinBoardOptions {
  userId: string;
}

/**
 * Community Bulletin Board service
 *
 * Enables community members to:
 * - Post announcements, events, celebrations, and discussions
 * - Comment on posts
 * - RSVP to events
 * - Mark interest in posts for reminders
 * - Pin important posts
 */
export class BulletinBoard {
  constructor(private db: LocalDatabase) {}

  /**
   * Create a new bulletin post
   *
   * @param input - Post details
   * @param options - User context
   * @returns The created BulletinPost
   */
  async createPost(input: BulletinPostInput, options: BulletinBoardOptions): Promise<BulletinPost> {
    // Validate required fields
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Post title cannot be empty');
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }

    // Sanitize user content
    const sanitizedTitle = sanitizeUserContent(input.title);
    const sanitizedContent = sanitizeUserContent(input.content);
    const sanitizedTags = input.tags?.map(tag => sanitizeUserContent(tag));

    // Validate event details if this is an event post
    if (input.postType === 'event') {
      if (!input.eventDetails?.startTime) {
        throw new Error('Event posts require a start time');
      }
    }

    const post = await this.db.addBulletinPost({
      userId: options.userId,
      title: sanitizedTitle,
      content: sanitizedContent,
      postType: input.postType,
      status: 'active',
      communityGroupId: input.communityGroupId,
      tags: sanitizedTags,
      eventDetails: input.eventDetails ? {
        ...input.eventDetails,
        location: input.eventDetails.location
          ? sanitizeUserContent(input.eventDetails.location)
          : undefined,
      } : undefined,
    });

    return post;
  }

  /**
   * Update an existing post
   *
   * @param postId - ID of the post to update
   * @param updates - Fields to update
   * @param options - User context
   */
  async updatePost(
    postId: string,
    updates: Partial<Pick<BulletinPost, 'title' | 'content' | 'tags' | 'eventDetails' | 'status'>>,
    options: BulletinBoardOptions
  ): Promise<void> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Only allow the author to update
    if (post.userId !== options.userId) {
      throw new Error('Only the author can update this post');
    }

    // Sanitize any text fields
    const sanitizedUpdates: Partial<BulletinPost> = {};

    if (updates.title) {
      sanitizedUpdates.title = sanitizeUserContent(updates.title);
    }
    if (updates.content) {
      sanitizedUpdates.content = sanitizeUserContent(updates.content);
    }
    if (updates.tags) {
      sanitizedUpdates.tags = updates.tags.map(tag => sanitizeUserContent(tag));
    }
    if (updates.status) {
      sanitizedUpdates.status = updates.status;
    }
    if (updates.eventDetails) {
      sanitizedUpdates.eventDetails = {
        ...updates.eventDetails,
        location: updates.eventDetails.location
          ? sanitizeUserContent(updates.eventDetails.location)
          : undefined,
      };
    }

    await this.db.updateBulletinPost(postId, sanitizedUpdates);
  }

  /**
   * Archive a post (soft delete)
   */
  async archivePost(postId: string, options: BulletinBoardOptions): Promise<void> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== options.userId) {
      throw new Error('Only the author can archive this post');
    }

    await this.db.updateBulletinPost(postId, { status: 'archived' });
  }

  /**
   * Cancel an event post
   */
  async cancelEvent(postId: string, options: BulletinBoardOptions): Promise<void> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.postType !== 'event') {
      throw new Error('Only event posts can be cancelled');
    }

    if (post.userId !== options.userId) {
      throw new Error('Only the author can cancel this event');
    }

    await this.db.updateBulletinPost(postId, { status: 'cancelled' });
  }

  /**
   * Delete a post permanently
   */
  async deletePost(postId: string, options: BulletinBoardOptions): Promise<void> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== options.userId) {
      throw new Error('Only the author can delete this post');
    }

    await this.db.deleteBulletinPost(postId);
  }

  /**
   * Add a comment to a post
   *
   * REQ-GOV-019: Support comment threads
   */
  async addComment(
    postId: string,
    content: string,
    options: BulletinBoardOptions,
    parentCommentId?: string
  ): Promise<BulletinComment> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.status !== 'active') {
      throw new Error('Cannot comment on archived or cancelled posts');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Comment cannot be empty');
    }

    const sanitizedContent = sanitizeUserContent(content);

    const comment = await this.db.addBulletinComment(postId, {
      userId: options.userId,
      content: sanitizedContent,
      parentCommentId,
    });

    return comment;
  }

  /**
   * RSVP to an event
   *
   * REQ-GOV-019: Enable RSVPs and coordination
   */
  async rsvp(postId: string, response: RSVPResponse, options: BulletinBoardOptions, note?: string): Promise<void> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.postType !== 'event') {
      throw new Error('Can only RSVP to event posts');
    }

    if (post.status !== 'active') {
      throw new Error('Cannot RSVP to archived or cancelled events');
    }

    const sanitizedNote = note ? sanitizeUserContent(note) : undefined;

    await this.db.setBulletinRSVP(postId, options.userId, response, sanitizedNote);
  }

  /**
   * Mark interest in a post (for reminders)
   *
   * REQ-GOV-019: Send reminders to interested members
   */
  async markInterested(postId: string, options: BulletinBoardOptions): Promise<void> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    await this.db.markInterested(postId, options.userId);
  }

  /**
   * Remove interest from a post
   */
  async removeInterest(postId: string, options: BulletinBoardOptions): Promise<void> {
    await this.db.removeInterest(postId, options.userId);
  }

  /**
   * Pin a post (requires being the author)
   *
   * @param postId - Post to pin
   * @param durationMs - How long to pin (default 7 days)
   * @param options - User context
   */
  async pinPost(postId: string, durationMs: number = 7 * 24 * 60 * 60 * 1000, options: BulletinBoardOptions): Promise<void> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== options.userId) {
      throw new Error('Only the author can pin this post');
    }

    await this.db.updateBulletinPost(postId, {
      pinnedUntil: Date.now() + durationMs,
    });
  }

  /**
   * Unpin a post
   */
  async unpinPost(postId: string, options: BulletinBoardOptions): Promise<void> {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== options.userId) {
      throw new Error('Only the author can unpin this post');
    }

    await this.db.updateBulletinPost(postId, {
      pinnedUntil: undefined,
    });
  }

  // ===== Read Operations =====

  /**
   * Get a single post by ID
   */
  getPost(postId: string): BulletinPost | undefined {
    return this.db.getBulletinPost(postId);
  }

  /**
   * Get all active posts, sorted by recency (newest first)
   */
  getActivePosts(): BulletinPost[] {
    return this.db.getActiveBulletinPosts()
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get pinned posts
   */
  getPinnedPosts(): BulletinPost[] {
    return this.db.getPinnedBulletinPosts()
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get posts for a specific community group
   */
  getGroupPosts(communityGroupId: string): BulletinPost[] {
    return this.db.getBulletinPostsByGroup(communityGroupId)
      .filter(p => p.status === 'active')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get posts by type
   */
  getPostsByType(postType: BulletinPostType): BulletinPost[] {
    return this.db.getActiveBulletinPosts()
      .filter(p => p.postType === postType)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get upcoming events
   *
   * REQ-GOV-019: Integrate with event calendar
   */
  getUpcomingEvents(): BulletinPost[] {
    return this.db.getUpcomingEventPosts();
  }

  /**
   * Get posts a user has created
   */
  getUserPosts(userId: string): BulletinPost[] {
    return this.db.listBulletinPosts()
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get posts a user is interested in
   */
  getUserInterestedPosts(userId: string): BulletinPost[] {
    return this.db.getActiveBulletinPosts()
      .filter(p => p.interestedUsers.includes(userId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get events a user has RSVP'd "going" to
   */
  getUserRsvpedEvents(userId: string): BulletinPost[] {
    return this.db.getActiveBulletinPosts()
      .filter(p =>
        p.postType === 'event' &&
        p.rsvps.some(r => r.userId === userId && r.response === 'going')
      )
      .sort((a, b) => (a.eventDetails?.startTime || 0) - (b.eventDetails?.startTime || 0));
  }

  /**
   * Search posts by text (simple search)
   */
  searchPosts(query: string): BulletinPost[] {
    const lowerQuery = query.toLowerCase();
    return this.db.getActiveBulletinPosts()
      .filter(p =>
        p.title.toLowerCase().includes(lowerQuery) ||
        p.content.toLowerCase().includes(lowerQuery) ||
        p.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get RSVP counts for an event
   */
  getEventRsvpCounts(postId: string): { going: number; maybe: number; notGoing: number } {
    const post = this.db.getBulletinPost(postId);
    if (!post || post.postType !== 'event') {
      return { going: 0, maybe: 0, notGoing: 0 };
    }

    return {
      going: post.rsvps.filter(r => r.response === 'going').length,
      maybe: post.rsvps.filter(r => r.response === 'maybe').length,
      notGoing: post.rsvps.filter(r => r.response === 'not-going').length,
    };
  }

  /**
   * Get comment thread for a post (organized by parent/child)
   */
  getCommentThread(postId: string): BulletinComment[] {
    const post = this.db.getBulletinPost(postId);
    if (!post) {
      return [];
    }

    // Sort by creation time
    return [...post.comments].sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Get human-readable description of post type
   */
  getPostTypeDescription(postType: BulletinPostType): string {
    const descriptions: Record<BulletinPostType, string> = {
      'announcement': 'Announcement - Share news with the community',
      'event': 'Event - Organize a gathering or activity',
      'celebration': 'Celebration - Share joy and milestones',
      'discussion': 'Discussion - Start a conversation',
      'request': 'Request - Ask for help or coordination',
      'other': 'Other - General post',
    };
    return descriptions[postType];
  }
}
