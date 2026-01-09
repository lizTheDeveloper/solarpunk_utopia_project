/**
 * Tests for Community Bulletin Board (Phase 2, Group D)
 * REQ-GOV-019: Community Bulletin Board
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalDatabase } from '../core/database';
import { BulletinBoard } from './bulletin-board';

describe('Bulletin Board', () => {
  let db: LocalDatabase;
  let bulletinBoard: BulletinBoard;
  const testUserId = 'test-user-1';
  const otherUserId = 'test-user-2';

  beforeEach(async () => {
    db = new LocalDatabase(`test-db-${Date.now()}`);
    await db.init();
    bulletinBoard = new BulletinBoard(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Post Creation', () => {
    it('should create an announcement post', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: 'Community Meeting Tomorrow',
          content: 'Join us for our weekly community meeting!',
          postType: 'announcement',
        },
        { userId: testUserId }
      );

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.title).toBe('Community Meeting Tomorrow');
      expect(post.postType).toBe('announcement');
      expect(post.status).toBe('active');
      expect(post.userId).toBe(testUserId);
      expect(post.rsvps).toEqual([]);
      expect(post.comments).toEqual([]);
      expect(post.interestedUsers).toEqual([]);
    });

    it('should create an event post with event details', async () => {
      const startTime = Date.now() + 24 * 60 * 60 * 1000; // Tomorrow
      const post = await bulletinBoard.createPost(
        {
          title: 'Garden Potluck',
          content: 'Bring a dish to share!',
          postType: 'event',
          eventDetails: {
            startTime,
            location: 'Community Garden',
          },
        },
        { userId: testUserId }
      );

      expect(post.postType).toBe('event');
      expect(post.eventDetails).toBeDefined();
      expect(post.eventDetails?.startTime).toBe(startTime);
      expect(post.eventDetails?.location).toBe('Community Garden');
    });

    it('should create a celebration post', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: 'First Harvest!',
          content: 'Our garden produced its first tomatoes!',
          postType: 'celebration',
          tags: ['garden', 'harvest'],
        },
        { userId: testUserId }
      );

      expect(post.postType).toBe('celebration');
      expect(post.tags).toContain('garden');
      expect(post.tags).toContain('harvest');
    });

    it('should require title and content', async () => {
      await expect(
        bulletinBoard.createPost(
          { title: '', content: 'Some content', postType: 'announcement' },
          { userId: testUserId }
        )
      ).rejects.toThrow('Post title cannot be empty');

      await expect(
        bulletinBoard.createPost(
          { title: 'Some title', content: '', postType: 'announcement' },
          { userId: testUserId }
        )
      ).rejects.toThrow('Post content cannot be empty');
    });

    it('should require start time for event posts', async () => {
      await expect(
        bulletinBoard.createPost(
          {
            title: 'Event without time',
            content: 'This should fail',
            postType: 'event',
          },
          { userId: testUserId }
        )
      ).rejects.toThrow('Event posts require a start time');
    });

    it('should sanitize user input to prevent XSS', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: '<script>alert("xss")</script>Test',
          content: '<img onerror="alert(1)" src="x">Content',
          postType: 'announcement',
          tags: ['<script>bad</script>'],
        },
        { userId: testUserId }
      );

      expect(post.title).not.toContain('<script>');
      expect(post.content).not.toContain('onerror');
      expect(post.tags?.[0]).not.toContain('<script>');
    });
  });

  describe('Post Updates', () => {
    it('should update post content', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: 'Original Title',
          content: 'Original content',
          postType: 'announcement',
        },
        { userId: testUserId }
      );

      await bulletinBoard.updatePost(
        post.id,
        { title: 'Updated Title', content: 'Updated content' },
        { userId: testUserId }
      );

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.content).toBe('Updated content');
    });

    it('should only allow author to update', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await expect(
        bulletinBoard.updatePost(
          post.id,
          { title: 'Hacked!' },
          { userId: otherUserId }
        )
      ).rejects.toThrow('Only the author can update this post');
    });

    it('should archive a post', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await bulletinBoard.archivePost(post.id, { userId: testUserId });

      const archived = bulletinBoard.getPost(post.id);
      expect(archived?.status).toBe('archived');
    });

    it('should cancel an event', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: 'Event',
          content: 'Content',
          postType: 'event',
          eventDetails: { startTime: Date.now() + 100000 },
        },
        { userId: testUserId }
      );

      await bulletinBoard.cancelEvent(post.id, { userId: testUserId });

      const cancelled = bulletinBoard.getPost(post.id);
      expect(cancelled?.status).toBe('cancelled');
    });
  });

  describe('Comments', () => {
    it('should add a comment to a post', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'discussion' },
        { userId: testUserId }
      );

      const comment = await bulletinBoard.addComment(
        post.id,
        'Great idea!',
        { userId: otherUserId }
      );

      expect(comment.id).toBeDefined();
      expect(comment.content).toBe('Great idea!');
      expect(comment.postId).toBe(post.id);
      expect(comment.userId).toBe(otherUserId);

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.comments).toHaveLength(1);
    });

    it('should support threaded replies', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'discussion' },
        { userId: testUserId }
      );

      const comment = await bulletinBoard.addComment(
        post.id,
        'First comment',
        { userId: otherUserId }
      );

      const reply = await bulletinBoard.addComment(
        post.id,
        'Reply to first',
        { userId: testUserId },
        comment.id
      );

      expect(reply.parentCommentId).toBe(comment.id);
    });

    it('should not allow comments on archived posts', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await bulletinBoard.archivePost(post.id, { userId: testUserId });

      await expect(
        bulletinBoard.addComment(post.id, 'Late comment', { userId: otherUserId })
      ).rejects.toThrow('Cannot comment on archived or cancelled posts');
    });
  });

  describe('RSVPs', () => {
    it('should allow RSVP to events', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: 'Event',
          content: 'Join us!',
          postType: 'event',
          eventDetails: { startTime: Date.now() + 100000 },
        },
        { userId: testUserId }
      );

      await bulletinBoard.rsvp(post.id, 'going', { userId: otherUserId }, 'I can bring drinks');

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.rsvps).toHaveLength(1);
      expect(updated?.rsvps[0].response).toBe('going');
      expect(updated?.rsvps[0].note).toBe('I can bring drinks');
    });

    it('should update existing RSVP', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: 'Event',
          content: 'Join us!',
          postType: 'event',
          eventDetails: { startTime: Date.now() + 100000 },
        },
        { userId: testUserId }
      );

      await bulletinBoard.rsvp(post.id, 'going', { userId: otherUserId });
      await bulletinBoard.rsvp(post.id, 'maybe', { userId: otherUserId });

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.rsvps).toHaveLength(1);
      expect(updated?.rsvps[0].response).toBe('maybe');
    });

    it('should only allow RSVP to event posts', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Announcement', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await expect(
        bulletinBoard.rsvp(post.id, 'going', { userId: otherUserId })
      ).rejects.toThrow('Can only RSVP to event posts');
    });

    it('should get RSVP counts', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: 'Event',
          content: 'Join us!',
          postType: 'event',
          eventDetails: { startTime: Date.now() + 100000 },
        },
        { userId: testUserId }
      );

      await bulletinBoard.rsvp(post.id, 'going', { userId: testUserId });
      await bulletinBoard.rsvp(post.id, 'going', { userId: otherUserId });
      await bulletinBoard.rsvp(post.id, 'maybe', { userId: 'user-3' });

      const counts = bulletinBoard.getEventRsvpCounts(post.id);
      expect(counts.going).toBe(2);
      expect(counts.maybe).toBe(1);
      expect(counts.notGoing).toBe(0);
    });
  });

  describe('Interest Tracking', () => {
    it('should mark user as interested', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await bulletinBoard.markInterested(post.id, { userId: otherUserId });

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.interestedUsers).toContain(otherUserId);
    });

    it('should remove interest', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await bulletinBoard.markInterested(post.id, { userId: otherUserId });
      await bulletinBoard.removeInterest(post.id, { userId: otherUserId });

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.interestedUsers).not.toContain(otherUserId);
    });

    it('should not duplicate interest', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await bulletinBoard.markInterested(post.id, { userId: otherUserId });
      await bulletinBoard.markInterested(post.id, { userId: otherUserId });

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.interestedUsers.filter(u => u === otherUserId)).toHaveLength(1);
    });
  });

  describe('Pinning', () => {
    it('should pin a post', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Important', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await bulletinBoard.pinPost(post.id, 7 * 24 * 60 * 60 * 1000, { userId: testUserId });

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.pinnedUntil).toBeGreaterThan(Date.now());
    });

    it('should unpin a post', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Important', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await bulletinBoard.pinPost(post.id, 7 * 24 * 60 * 60 * 1000, { userId: testUserId });
      await bulletinBoard.unpinPost(post.id, { userId: testUserId });

      const updated = bulletinBoard.getPost(post.id);
      expect(updated?.pinnedUntil).toBeUndefined();
    });

    it('should get pinned posts', async () => {
      const post1 = await bulletinBoard.createPost(
        { title: 'Pinned', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );
      await bulletinBoard.createPost(
        { title: 'Not pinned', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      await bulletinBoard.pinPost(post1.id, 7 * 24 * 60 * 60 * 1000, { userId: testUserId });

      const pinned = bulletinBoard.getPinnedPosts();
      expect(pinned).toHaveLength(1);
      expect(pinned[0].id).toBe(post1.id);
    });
  });

  describe('Queries', () => {
    it('should get active posts', async () => {
      await bulletinBoard.createPost(
        { title: 'Active', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );
      const archived = await bulletinBoard.createPost(
        { title: 'Archived', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );
      await bulletinBoard.archivePost(archived.id, { userId: testUserId });

      const active = bulletinBoard.getActivePosts();
      expect(active).toHaveLength(1);
      expect(active[0].title).toBe('Active');
    });

    it('should get posts by type', async () => {
      await bulletinBoard.createPost(
        { title: 'Event', content: 'Content', postType: 'event', eventDetails: { startTime: Date.now() + 100000 } },
        { userId: testUserId }
      );
      await bulletinBoard.createPost(
        { title: 'Discussion', content: 'Content', postType: 'discussion' },
        { userId: testUserId }
      );

      const events = bulletinBoard.getPostsByType('event');
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Event');
    });

    it('should get upcoming events', async () => {
      const futureTime = Date.now() + 24 * 60 * 60 * 1000;
      const pastTime = Date.now() - 24 * 60 * 60 * 1000;

      await bulletinBoard.createPost(
        { title: 'Future Event', content: 'Content', postType: 'event', eventDetails: { startTime: futureTime } },
        { userId: testUserId }
      );
      await bulletinBoard.createPost(
        { title: 'Past Event', content: 'Content', postType: 'event', eventDetails: { startTime: pastTime } },
        { userId: testUserId }
      );

      const upcoming = bulletinBoard.getUpcomingEvents();
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].title).toBe('Future Event');
    });

    it('should get user posts', async () => {
      await bulletinBoard.createPost(
        { title: 'User 1 Post', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );
      await bulletinBoard.createPost(
        { title: 'User 2 Post', content: 'Content', postType: 'announcement' },
        { userId: otherUserId }
      );

      const userPosts = bulletinBoard.getUserPosts(testUserId);
      expect(userPosts).toHaveLength(1);
      expect(userPosts[0].title).toBe('User 1 Post');
    });

    it('should search posts', async () => {
      await bulletinBoard.createPost(
        { title: 'Garden Update', content: 'Tomatoes are ripe', postType: 'announcement' },
        { userId: testUserId }
      );
      await bulletinBoard.createPost(
        { title: 'Other Post', content: 'Something else', postType: 'announcement' },
        { userId: testUserId }
      );

      const results = bulletinBoard.searchPosts('garden');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Garden Update');

      const results2 = bulletinBoard.searchPosts('tomatoes');
      expect(results2).toHaveLength(1);
    });

    it('should get group posts', async () => {
      const groupId = 'test-group';
      await bulletinBoard.createPost(
        { title: 'Group Post', content: 'Content', postType: 'announcement', communityGroupId: groupId },
        { userId: testUserId }
      );
      await bulletinBoard.createPost(
        { title: 'General Post', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      const groupPosts = bulletinBoard.getGroupPosts(groupId);
      expect(groupPosts).toHaveLength(1);
      expect(groupPosts[0].title).toBe('Group Post');
    });
  });

  describe('Solarpunk Values Compliance', () => {
    it('should not track user activity beyond what is necessary', async () => {
      const post = await bulletinBoard.createPost(
        { title: 'Test', content: 'Content', postType: 'announcement' },
        { userId: testUserId }
      );

      // Verify no tracking fields exist
      expect(post).not.toHaveProperty('views');
      expect(post).not.toHaveProperty('analytics');
      expect(post).not.toHaveProperty('tracking');
      expect(post).not.toHaveProperty('metrics');
    });

    it('should preserve user privacy in RSVPs', async () => {
      const post = await bulletinBoard.createPost(
        {
          title: 'Event',
          content: 'Join us!',
          postType: 'event',
          eventDetails: { startTime: Date.now() + 100000 },
        },
        { userId: testUserId }
      );

      await bulletinBoard.rsvp(post.id, 'going', { userId: otherUserId });

      const updated = bulletinBoard.getPost(post.id);
      // RSVPs should only contain minimal information
      expect(updated?.rsvps[0]).not.toHaveProperty('email');
      expect(updated?.rsvps[0]).not.toHaveProperty('ipAddress');
      expect(updated?.rsvps[0]).not.toHaveProperty('deviceInfo');
    });

    it('should support community-oriented features', async () => {
      // Verify the system supports gift economy principles
      const post = await bulletinBoard.createPost(
        {
          title: 'Free Seeds Available',
          content: 'I have extra tomato seeds to share with anyone who wants them!',
          postType: 'request',
          tags: ['free', 'seeds', 'sharing'],
        },
        { userId: testUserId }
      );

      expect(post.postType).toBe('request');
      expect(post.tags).toContain('free');
      expect(post.tags).toContain('sharing');
      // No monetary fields
      expect(post).not.toHaveProperty('price');
      expect(post).not.toHaveProperty('cost');
    });
  });
});
