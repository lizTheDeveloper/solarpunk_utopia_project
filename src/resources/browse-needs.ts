/**
 * Browse Community Needs
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * Phase 2, Group C: Open Requests & Needs
 *
 * Enables community members to browse posted needs and requests from the community.
 * Supports filtering by urgency, resource type, and fulfillment status.
 */

import { db } from '../core/database';
import type { Need, ResourceType, UrgencyLevel } from '../types';
import { sanitizeUserContent, validateIdentifier } from '../utils/sanitize';

/**
 * Browse needs with optional filters
 */
export function browseNeeds(filters?: {
  resourceType?: ResourceType;
  urgency?: UrgencyLevel;
  includeFulfilled?: boolean;
}): Need[] {
  let needs = db.listNeeds();

  // Filter by fulfillment status (by default, exclude fulfilled needs)
  if (filters?.includeFulfilled === false || filters?.includeFulfilled === undefined) {
    needs = needs.filter(need => !need.fulfilled);
  }

  // Filter by resource type
  if (filters?.resourceType) {
    needs = needs.filter(need => need.resourceType === filters.resourceType);
  }

  // Filter by urgency
  if (filters?.urgency) {
    needs = needs.filter(need => need.urgency === filters.urgency);
  }

  // Sort by urgency (urgent first) and then by creation date (newest first)
  needs.sort((a, b) => {
    const urgencyOrder = { urgent: 0, needed: 1, helpful: 2, casual: 3 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return b.createdAt - a.createdAt;
  });

  return needs;
}

/**
 * Get unfulfilled needs (active needs)
 */
export function getActiveNeeds(): Need[] {
  return browseNeeds({ includeFulfilled: false });
}

/**
 * Get urgent needs
 */
export function getUrgentNeeds(): Need[] {
  return browseNeeds({ urgency: 'urgent', includeFulfilled: false });
}

/**
 * Get needs by resource type
 */
export function getNeedsByType(resourceType: ResourceType): Need[] {
  return browseNeeds({ resourceType, includeFulfilled: false });
}

/**
 * Get a specific need by ID
 */
export function getNeed(needId: string): Need | undefined {
  return db.listNeeds().find(need => need.id === needId);
}

/**
 * Render the browse needs view
 */
export function renderBrowseNeeds(): string {
  const activeNeeds = getActiveNeeds();
  const urgentNeeds = getUrgentNeeds();

  const urgentSection = urgentNeeds.length > 0 ? `
    <div class="urgent-needs-section">
      <h3>🚨 Urgent Community Needs</h3>
      <p class="section-description">These needs require immediate attention from the community.</p>
      <div class="needs-grid">
        ${urgentNeeds.map(need => renderNeedCard(need, true)).join('')}
      </div>
    </div>
    <hr style="margin: 2rem 0; border: 1px solid var(--secondary-green);">
  ` : '';

  const otherNeeds = activeNeeds.filter(need => need.urgency !== 'urgent');

  return `
    <div class="browse-needs-container">
      <h2>Browse Community Needs</h2>
      <p class="page-description">
        See what your community members need and offer your help.
        Every response builds mutual aid and strengthens community bonds.
      </p>

      ${urgentSection}

      <div class="filter-section">
        <h4>Filter by:</h4>
        <div class="filter-buttons">
          <button class="filter-btn active" data-filter="all">All Needs (${otherNeeds.length})</button>
          <button class="filter-btn" data-filter="needed">Needed (${otherNeeds.filter(n => n.urgency === 'needed').length})</button>
          <button class="filter-btn" data-filter="helpful">Helpful (${otherNeeds.filter(n => n.urgency === 'helpful').length})</button>
          <button class="filter-btn" data-filter="casual">Casual (${otherNeeds.filter(n => n.urgency === 'casual').length})</button>
        </div>
      </div>

      <div class="needs-grid" id="needs-grid">
        ${otherNeeds.length > 0
          ? otherNeeds.map(need => renderNeedCard(need)).join('')
          : '<p class="no-needs">No active community needs at this time. Check back later!</p>'
        }
      </div>

      <div class="post-need-cta">
        <p>Don't see what you're looking for?</p>
        <button id="post-new-need" class="btn-primary">Post Your Own Need</button>
      </div>
    </div>
  `;
}

/**
 * Render a single need card
 */
function renderNeedCard(need: Need, isUrgent: boolean = false): string {
  // Validate and sanitize need ID for data attributes
  if (!validateIdentifier(need.id)) {
    console.error('Invalid need ID:', need.id);
    return '';
  }

  const timeAgo = getTimeAgo(need.createdAt);
  const urgencyEmoji = {
    'urgent': '🚨',
    'needed': '⚠️',
    'helpful': '🤝',
    'casual': '💬'
  }[need.urgency];

  const urgencyClass = `need-${need.urgency}`;
  const urgencyLabel = need.urgency.charAt(0).toUpperCase() + need.urgency.slice(1);

  const resourceTypeLabel = need.resourceType
    ? `<span class="resource-type">${sanitizeUserContent(need.resourceType)}</span>`
    : '';

  return `
    <div class="need-card ${urgencyClass} ${isUrgent ? 'urgent-highlight' : ''}" data-need-id="${need.id}" data-urgency="${need.urgency}">
      <div class="need-header">
        <div class="need-urgency">
          <span class="emoji">${urgencyEmoji}</span>
          <span class="label">${urgencyLabel}</span>
        </div>
        <span class="time">${timeAgo}</span>
      </div>

      <div class="need-body">
        <p class="need-description">"${sanitizeUserContent(need.description)}"</p>
        ${resourceTypeLabel}
      </div>

      <div class="need-actions">
        <button class="btn-respond" data-need-id="${need.id}">
          <span class="emoji">🤝</span>
          <span class="label">I Can Help</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Initialize browse needs event handlers
 */
export function initBrowseNeedsHandlers(userId: string) {
  // Filter button handlers
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const filter = target.dataset.filter;

      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      // Filter needs display
      const needCards = document.querySelectorAll('.need-card');
      needCards.forEach(card => {
        const cardElement = card as HTMLElement;
        if (filter === 'all' || cardElement.dataset.urgency === filter) {
          cardElement.style.display = 'block';
        } else {
          cardElement.style.display = 'none';
        }
      });
    });
  });

  // "I Can Help" button handlers
  document.querySelectorAll('.btn-respond').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.btn-respond') as HTMLElement;
      const needId = button?.dataset.needId;

      if (needId && validateIdentifier(needId)) {
        const need = getNeed(needId);
        if (need) {
          // Show response dialog
          showResponseDialog(needId, need, userId);
        }
      } else {
        console.error('Invalid need ID');
      }
    });
  });

  // "Post Your Own Need" button handler
  document.getElementById('post-new-need')?.addEventListener('click', () => {
    // Navigate to post need view (to be implemented in another feature)
    alert('Post a need feature coming soon! This will allow you to create a new community need request.');
  });
}

/**
 * Show response dialog
 */
function showResponseDialog(needId: string, need: Need, userId: string) {
  const dialog = document.createElement('div');
  dialog.className = 'modal-overlay';

  // Create modal content using DOM methods to prevent XSS
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  const title = document.createElement('h3');
  title.textContent = 'Respond to Need';

  const description = document.createElement('p');
  description.className = 'need-description-modal';
  description.textContent = `"${need.description}"`; // textContent auto-escapes

  const form = document.createElement('div');
  form.className = 'response-form';
  form.innerHTML = `
    <label for="response-message">How can you help?</label>
    <textarea id="response-message" rows="4" placeholder="Let them know what you can offer..."></textarea>

    <div class="modal-actions">
      <button id="send-response" class="btn-primary">Send Response</button>
      <button id="cancel-response" class="btn-secondary">Cancel</button>
    </div>
  `;

  modalContent.appendChild(title);
  modalContent.appendChild(description);
  modalContent.appendChild(form);
  dialog.appendChild(modalContent);

  document.body.appendChild(dialog);

  // Send response handler
  document.getElementById('send-response')?.addEventListener('click', async () => {
    const messageInput = document.getElementById('response-message') as HTMLTextAreaElement;
    const message = messageInput?.value.trim();

    if (!message) {
      alert('Please enter a message describing how you can help.');
      return;
    }

    try {
      // Record the response as an economic event
      await db.recordEvent({
        action: 'give',
        providerId: userId,
        receiverId: need.userId,
        resourceId: needId,
        note: message,
      });

      alert('Your response has been sent! The community member will be notified.');
      document.body.removeChild(dialog);

      // Refresh the view
      renderBrowseNeedsView();
    } catch (error) {
      console.error('Failed to send response:', error);
      alert('Failed to send response. Please try again.');
    }
  });

  // Cancel handler
  document.getElementById('cancel-response')?.addEventListener('click', () => {
    document.body.removeChild(dialog);
  });

  // Click outside to close
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog);
    }
  });
}

/**
 * Render the entire browse needs view
 */
export function renderBrowseNeedsView() {
  const container = document.getElementById('needs-view');
  if (!container) return;

  const userId = 'user-1'; // TODO: Get from auth

  container.innerHTML = renderBrowseNeeds();
  initBrowseNeedsHandlers(userId);
}

/**
 * Utility: Format time ago
 */
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
