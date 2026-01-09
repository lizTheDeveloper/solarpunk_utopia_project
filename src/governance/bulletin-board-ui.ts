/**
 * Bulletin Board UI - User interface components for the community bulletin board
 *
 * REQ-GOV-019: Community Bulletin Board
 *
 * This module provides UI rendering functions for the bulletin board.
 * Following accessibility-first design principles.
 */

import type { BulletinPost, BulletinComment, BulletinPostType, RSVPResponse } from '../types';
import { escapeHtml } from '../utils/sanitize';

/**
 * Format a timestamp for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    return 'just now';
  } else if (diff < hour) {
    const mins = Math.floor(diff / minute);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  } else if (diff < day) {
    const hrs = Math.floor(diff / hour);
    return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  } else if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(timestamp);
  }
}

/**
 * Get icon/emoji for post type
 */
function getPostTypeIcon(postType: BulletinPostType): string {
  const icons: Record<BulletinPostType, string> = {
    'announcement': '[!]',
    'event': '[*]',
    'celebration': '[+]',
    'discussion': '[?]',
    'request': '[~]',
    'other': '[-]',
  };
  return icons[postType];
}

/**
 * Render a single bulletin post for display
 */
export function renderBulletinPost(
  post: BulletinPost,
  options: {
    showFullContent?: boolean;
    currentUserId?: string;
  } = {}
): string {
  const { showFullContent = false, currentUserId } = options;

  const icon = getPostTypeIcon(post.postType);
  const isPinned = post.pinnedUntil && post.pinnedUntil > Date.now();
  const isAuthor = currentUserId === post.userId;

  // Truncate content if not showing full
  const displayContent = showFullContent
    ? escapeHtml(post.content)
    : escapeHtml(post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content);

  let html = `
<article class="bulletin-post${isPinned ? ' pinned' : ''}" data-post-id="${escapeHtml(post.id)}" role="article">
  <header class="post-header">
    <span class="post-type-icon" aria-label="${escapeHtml(post.postType)}">${icon}</span>
    <h3 class="post-title">${escapeHtml(post.title)}</h3>
    ${isPinned ? '<span class="pinned-badge" aria-label="Pinned post">[PINNED]</span>' : ''}
  </header>

  <div class="post-meta">
    <time datetime="${new Date(post.createdAt).toISOString()}" class="post-time">
      ${formatRelativeTime(post.createdAt)}
    </time>
    ${post.tags && post.tags.length > 0 ? `
    <div class="post-tags" role="list" aria-label="Tags">
      ${post.tags.map(tag => `<span class="tag" role="listitem">#${escapeHtml(tag)}</span>`).join(' ')}
    </div>
    ` : ''}
  </div>

  <div class="post-content">
    ${displayContent}
  </div>`;

  // Event details
  if (post.postType === 'event' && post.eventDetails) {
    const { startTime, endTime, location } = post.eventDetails;
    html += `
  <div class="event-details" role="complementary" aria-label="Event details">
    <div class="event-time">
      <strong>When:</strong> ${formatDate(startTime)}
      ${endTime ? ` - ${formatDate(endTime)}` : ''}
    </div>
    ${location ? `<div class="event-location"><strong>Where:</strong> ${escapeHtml(location)}</div>` : ''}
  </div>`;
  }

  // RSVP summary for events
  if (post.postType === 'event' && post.rsvps.length > 0) {
    const going = post.rsvps.filter(r => r.response === 'going').length;
    const maybe = post.rsvps.filter(r => r.response === 'maybe').length;

    html += `
  <div class="rsvp-summary" aria-label="RSVP summary">
    <span class="rsvp-going">${going} going</span>
    ${maybe > 0 ? `<span class="rsvp-maybe">${maybe} maybe</span>` : ''}
  </div>`;

    // Show current user's RSVP status
    if (currentUserId) {
      const userRsvp = post.rsvps.find(r => r.userId === currentUserId);
      if (userRsvp) {
        html += `<div class="your-rsvp">Your RSVP: <strong>${escapeHtml(userRsvp.response)}</strong></div>`;
      }
    }
  }

  // Comment count
  if (post.comments.length > 0) {
    html += `
  <div class="comment-count" aria-label="${post.comments.length} comments">
    ${post.comments.length} comment${post.comments.length > 1 ? 's' : ''}
  </div>`;
  }

  // Action buttons
  html += `
  <footer class="post-actions" role="group" aria-label="Post actions">`;

  if (post.postType === 'event') {
    html += `
    <button class="btn-rsvp" data-action="rsvp" data-post-id="${escapeHtml(post.id)}">
      RSVP
    </button>`;
  }

  html += `
    <button class="btn-interested" data-action="interested" data-post-id="${escapeHtml(post.id)}">
      ${post.interestedUsers.includes(currentUserId || '') ? 'Interested' : 'Mark Interested'}
    </button>
    <button class="btn-comment" data-action="comment" data-post-id="${escapeHtml(post.id)}">
      Comment
    </button>`;

  if (isAuthor) {
    html += `
    <button class="btn-edit" data-action="edit" data-post-id="${escapeHtml(post.id)}">
      Edit
    </button>`;
  }

  html += `
  </footer>
</article>`;

  return html;
}

/**
 * Render a comment
 */
export function renderComment(comment: BulletinComment): string {
  return `
<div class="bulletin-comment" data-comment-id="${escapeHtml(comment.id)}" role="article">
  <div class="comment-content">${escapeHtml(comment.content)}</div>
  <div class="comment-meta">
    <time datetime="${new Date(comment.createdAt).toISOString()}">
      ${formatRelativeTime(comment.createdAt)}
    </time>
  </div>
</div>`;
}

/**
 * Render comment thread
 */
export function renderCommentThread(comments: BulletinComment[]): string {
  if (comments.length === 0) {
    return '<p class="no-comments">No comments yet. Be the first to comment!</p>';
  }

  // Organize comments by parent (for threading)
  const topLevel = comments.filter(c => !c.parentCommentId);
  const replies = comments.filter(c => c.parentCommentId);

  const replyMap = new Map<string, BulletinComment[]>();
  for (const reply of replies) {
    const parentId = reply.parentCommentId!;
    if (!replyMap.has(parentId)) {
      replyMap.set(parentId, []);
    }
    replyMap.get(parentId)!.push(reply);
  }

  function renderWithReplies(comment: BulletinComment, depth: number = 0): string {
    const commentReplies = replyMap.get(comment.id) || [];
    const indent = depth > 0 ? ` style="margin-left: ${depth * 20}px"` : '';

    return `
<div class="comment-thread"${indent}>
  ${renderComment(comment)}
  ${commentReplies.map(r => renderWithReplies(r, depth + 1)).join('')}
</div>`;
  }

  return `
<div class="comments-section" role="region" aria-label="Comments">
  ${topLevel.map(c => renderWithReplies(c)).join('')}
</div>`;
}

/**
 * Render bulletin board listing
 */
export function renderBulletinBoard(
  posts: BulletinPost[],
  pinnedPosts: BulletinPost[],
  options: { currentUserId?: string } = {}
): string {
  let html = `
<section class="bulletin-board" role="main" aria-label="Community Bulletin Board">
  <header class="bulletin-header">
    <h2>Community Bulletin Board</h2>
    <button class="btn-new-post" data-action="new-post" aria-label="Create new post">
      + New Post
    </button>
  </header>`;

  // Pinned posts
  if (pinnedPosts.length > 0) {
    html += `
  <section class="pinned-posts" aria-label="Pinned announcements">
    <h3>Pinned</h3>
    ${pinnedPosts.map(p => renderBulletinPost(p, { currentUserId: options.currentUserId })).join('')}
  </section>`;
  }

  // Recent posts
  if (posts.length > 0) {
    html += `
  <section class="recent-posts" aria-label="Recent posts">
    <h3>Recent Posts</h3>
    ${posts.map(p => renderBulletinPost(p, { currentUserId: options.currentUserId })).join('')}
  </section>`;
  } else {
    html += `
  <section class="no-posts">
    <p>No posts yet. Be the first to share with the community!</p>
  </section>`;
  }

  html += `
</section>`;

  return html;
}

/**
 * Render new post form
 */
export function renderNewPostForm(communityGroupId?: string): string {
  return `
<form class="new-post-form" role="form" aria-label="Create new bulletin post">
  <h3>Create New Post</h3>

  <fieldset>
    <legend>Post Type</legend>
    <label>
      <input type="radio" name="postType" value="announcement" checked>
      Announcement - Share news with the community
    </label>
    <label>
      <input type="radio" name="postType" value="event">
      Event - Organize a gathering or activity
    </label>
    <label>
      <input type="radio" name="postType" value="celebration">
      Celebration - Share joy and milestones
    </label>
    <label>
      <input type="radio" name="postType" value="discussion">
      Discussion - Start a conversation
    </label>
    <label>
      <input type="radio" name="postType" value="request">
      Request - Ask for help or coordination
    </label>
  </fieldset>

  <div class="form-group">
    <label for="post-title">Title</label>
    <input type="text" id="post-title" name="title" required maxlength="200"
           placeholder="What's this about?">
  </div>

  <div class="form-group">
    <label for="post-content">Content</label>
    <textarea id="post-content" name="content" required rows="5"
              placeholder="Share your message with the community..."></textarea>
  </div>

  <div class="form-group event-fields" style="display: none;">
    <label for="event-start">Event Date/Time</label>
    <input type="datetime-local" id="event-start" name="eventStart">

    <label for="event-location">Location (optional)</label>
    <input type="text" id="event-location" name="eventLocation"
           placeholder="Where is this happening?">
  </div>

  <div class="form-group">
    <label for="post-tags">Tags (comma-separated, optional)</label>
    <input type="text" id="post-tags" name="tags"
           placeholder="e.g., garden, potluck, volunteer">
  </div>

  ${communityGroupId ? `<input type="hidden" name="communityGroupId" value="${escapeHtml(communityGroupId)}">` : ''}

  <div class="form-actions">
    <button type="submit" class="btn-primary">Post</button>
    <button type="button" class="btn-secondary" data-action="cancel">Cancel</button>
  </div>
</form>

<script>
  // Show/hide event fields based on post type
  document.querySelectorAll('input[name="postType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const eventFields = document.querySelector('.event-fields');
      if (e.target.value === 'event') {
        eventFields.style.display = 'block';
      } else {
        eventFields.style.display = 'none';
      }
    });
  });
</script>`;
}

/**
 * Render RSVP form for events
 */
export function renderRsvpForm(postId: string, currentResponse?: RSVPResponse): string {
  return `
<form class="rsvp-form" data-post-id="${escapeHtml(postId)}" role="form" aria-label="RSVP to event">
  <fieldset>
    <legend>Will you attend?</legend>

    <label>
      <input type="radio" name="rsvp" value="going" ${currentResponse === 'going' ? 'checked' : ''}>
      Going - I'll be there!
    </label>

    <label>
      <input type="radio" name="rsvp" value="maybe" ${currentResponse === 'maybe' ? 'checked' : ''}>
      Maybe - Not sure yet
    </label>

    <label>
      <input type="radio" name="rsvp" value="not-going" ${currentResponse === 'not-going' ? 'checked' : ''}>
      Can't make it
    </label>
  </fieldset>

  <div class="form-group">
    <label for="rsvp-note">Note (optional)</label>
    <input type="text" id="rsvp-note" name="note"
           placeholder="e.g., I can bring food">
  </div>

  <div class="form-actions">
    <button type="submit" class="btn-primary">Update RSVP</button>
  </div>
</form>`;
}

/**
 * Render upcoming events widget
 */
export function renderUpcomingEventsWidget(events: BulletinPost[]): string {
  if (events.length === 0) {
    return `
<aside class="upcoming-events-widget" role="complementary" aria-label="Upcoming events">
  <h4>Upcoming Events</h4>
  <p>No upcoming events. Create one!</p>
</aside>`;
  }

  return `
<aside class="upcoming-events-widget" role="complementary" aria-label="Upcoming events">
  <h4>Upcoming Events</h4>
  <ul class="event-list">
    ${events.slice(0, 5).map(event => `
    <li class="event-item">
      <a href="#post-${escapeHtml(event.id)}">
        <span class="event-title">${escapeHtml(event.title)}</span>
        <time class="event-time">${formatDate(event.eventDetails?.startTime || 0)}</time>
      </a>
    </li>`).join('')}
  </ul>
</aside>`;
}

/**
 * Export CSS for bulletin board styling
 */
export const bulletinBoardStyles = `
.bulletin-board {
  max-width: 800px;
  margin: 0 auto;
  font-family: system-ui, sans-serif;
}

.bulletin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ddd;
}

.bulletin-post {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fff;
}

.bulletin-post.pinned {
  border-color: #f0ad4e;
  background: #fffdf5;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.post-type-icon {
  font-weight: bold;
  color: #666;
}

.post-title {
  margin: 0;
  font-size: 1.25rem;
}

.pinned-badge {
  color: #f0ad4e;
  font-size: 0.75rem;
  font-weight: bold;
}

.post-meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.post-tags {
  display: flex;
  gap: 0.5rem;
}

.tag {
  background: #e9ecef;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.post-content {
  margin: 1rem 0;
  line-height: 1.6;
}

.event-details {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.rsvp-summary {
  display: flex;
  gap: 1rem;
  color: #666;
  margin: 0.5rem 0;
}

.post-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
}

.post-actions button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.post-actions button:hover {
  background: #f8f9fa;
}

.bulletin-comment {
  border-left: 3px solid #ddd;
  padding-left: 1rem;
  margin: 0.5rem 0;
}

.comment-meta {
  color: #666;
  font-size: 0.75rem;
}

.new-post-form,
.rsvp-form {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="datetime-local"],
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-primary {
  background: #0d6efd;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.upcoming-events-widget {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
}

.event-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.event-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.event-item:last-child {
  border-bottom: none;
}

@media (max-width: 600px) {
  .post-actions {
    flex-wrap: wrap;
  }

  .post-actions button {
    flex: 1 1 auto;
  }
}
`;
