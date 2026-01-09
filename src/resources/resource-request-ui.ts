/**
 * UI Components for Requesting Items
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 *
 * Simple UI for browsing and requesting community resources
 */

import { sanitizeUserContent, sanitizeUrl, sanitizeAttribute } from '../utils/sanitize';
import type { Resource, EconomicEvent, UserProfile } from '../types';

/**
 * Render a resource card for browsing
 */
export function renderResourceCard(resource: Resource): string {
  const shareModeBadge = {
    'give': '<span class="badge badge-give">🎁 Free</span>',
    'lend': '<span class="badge badge-lend">📦 Borrow</span>',
    'share': '<span class="badge badge-share">🤝 Share</span>',
    'borrow': '<span class="badge badge-borrow">🔄 Looking to borrow</span>',
  }[resource.shareMode] || '';

  const photos = resource.photos && resource.photos.length > 0
    ? `<div class="resource-photos">
        <img src="${sanitizeUrl(resource.photos[0])}" alt="${sanitizeUserContent(resource.name)}" />
      </div>`
    : '';

  const tags = resource.tags && resource.tags.length > 0
    ? `<div class="resource-tags">
        ${resource.tags.map(tag => `<span class="tag">#${sanitizeUserContent(tag)}</span>`).join('')}
      </div>`
    : '';

  const location = resource.location
    ? `<div class="resource-location">📍 ${sanitizeUserContent(resource.location)}</div>`
    : '';

  return `
    <div class="resource-card" data-resource-id="${sanitizeAttribute(resource.id)}">
      ${photos}
      <div class="resource-header">
        <h3 class="resource-name">${sanitizeUserContent(resource.name)}</h3>
        ${shareModeBadge}
      </div>
      <p class="resource-description">${sanitizeUserContent(resource.description)}</p>
      ${location}
      ${tags}
      <div class="resource-actions">
        <button class="btn btn-primary request-item-btn" data-resource-id="${sanitizeAttribute(resource.id)}">
          Request Item
        </button>
      </div>
    </div>
  `;
}

/**
 * Render browse items page
 */
export function renderBrowseItemsPage(
  resources: Resource[],
  filters?: {
    resourceType?: string;
    shareMode?: string;
    searchQuery?: string;
  }
): string {
  const filterForm = `
    <div class="browse-filters">
      <h2>🌻 Browse Community Resources</h2>
      <form class="filter-form">
        <input
          type="text"
          name="search"
          placeholder="Search items..."
          value="${sanitizeAttribute(filters?.searchQuery || '')}"
          class="search-input"
        />

        <select name="resourceType" class="filter-select">
          <option value="">All Types</option>
          <option value="tool" ${filters?.resourceType === 'tool' ? 'selected' : ''}>Tools</option>
          <option value="equipment" ${filters?.resourceType === 'equipment' ? 'selected' : ''}>Equipment</option>
          <option value="space" ${filters?.resourceType === 'space' ? 'selected' : ''}>Spaces</option>
          <option value="food" ${filters?.resourceType === 'food' ? 'selected' : ''}>Food</option>
          <option value="other" ${filters?.resourceType === 'other' ? 'selected' : ''}>Other</option>
        </select>

        <select name="shareMode" class="filter-select">
          <option value="">All Modes</option>
          <option value="give" ${filters?.shareMode === 'give' ? 'selected' : ''}>🎁 Free/Give</option>
          <option value="lend" ${filters?.shareMode === 'lend' ? 'selected' : ''}>📦 Lend/Borrow</option>
          <option value="share" ${filters?.shareMode === 'share' ? 'selected' : ''}>🤝 Share</option>
        </select>

        <button type="submit" class="btn btn-secondary">Apply Filters</button>
      </form>
    </div>
  `;

  const resourcesList = resources.length > 0
    ? `<div class="resources-grid">
        ${resources.map(r => renderResourceCard(r)).join('')}
      </div>`
    : `<div class="no-resources">
        <p>No items found. Be the first to share something! 🌻</p>
      </div>`;

  return `
    <div class="browse-items-page">
      ${filterForm}
      ${resourcesList}
    </div>
  `;
}

/**
 * Render request dialog/modal
 */
export function renderRequestDialog(resource: Resource): string {
  return `
    <div class="modal request-modal" id="request-modal-${sanitizeAttribute(resource.id)}">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Request: ${sanitizeUserContent(resource.name)}</h3>
          <button class="modal-close" data-dismiss="modal">&times;</button>
        </div>

        <div class="modal-body">
          <p><strong>Description:</strong> ${sanitizeUserContent(resource.description)}</p>
          ${resource.location ? `<p><strong>Location:</strong> ${sanitizeUserContent(resource.location)}</p>` : ''}

          <form class="request-form" data-resource-id="${sanitizeAttribute(resource.id)}">
            <label for="request-message">
              Message to owner (optional):
            </label>
            <textarea
              id="request-message"
              name="message"
              rows="4"
              placeholder="Let them know why you need it or when you'd like to pick it up..."
              class="request-message-input"
            ></textarea>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                Send Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render my requests page
 */
export function renderMyRequestsPage(
  requests: Array<{
    request: EconomicEvent;
    resource: Resource | undefined;
  }>
): string {
  if (requests.length === 0) {
    return `
      <div class="my-requests-page">
        <h2>My Requests</h2>
        <div class="no-requests">
          <p>You haven't requested any items yet.</p>
          <a href="/browse" class="btn btn-primary">Browse Items</a>
        </div>
      </div>
    `;
  }

  const requestsList = requests.map(({ request, resource }) => {
    const resourceInfo = resource
      ? `<h3>${sanitizeUserContent(resource.name)}</h3>
         <p>${sanitizeUserContent(resource.description)}</p>
         <p class="resource-status ${resource.available ? 'available' : 'claimed'}">
           ${resource.available ? '✓ Still available' : '✗ No longer available'}
         </p>`
      : `<h3>Item no longer listed</h3>`;

    const timestamp = new Date(request.createdAt).toLocaleDateString();

    return `
      <div class="request-item">
        ${resourceInfo}
        <p class="request-note">${sanitizeUserContent(request.note || '')}</p>
        <p class="request-date">Requested on ${timestamp}</p>
      </div>
    `;
  }).join('');

  return `
    <div class="my-requests-page">
      <h2>My Requests</h2>
      <div class="requests-list">
        ${requestsList}
      </div>
    </div>
  `;
}

/**
 * Render incoming requests for my items
 */
export function renderIncomingRequestsPage(
  requests: Array<{
    request: EconomicEvent;
    resource: Resource | undefined;
    requesterProfile?: UserProfile;
  }>
): string {
  if (requests.length === 0) {
    return `
      <div class="incoming-requests-page">
        <h2>Requests for My Items</h2>
        <div class="no-requests">
          <p>No one has requested your items yet.</p>
        </div>
      </div>
    `;
  }

  const requestsList = requests.map(({ request, resource, requesterProfile }) => {
    const resourceInfo = resource
      ? `<h3>${sanitizeUserContent(resource.name)}</h3>
         <p>${sanitizeUserContent(resource.description)}</p>`
      : `<h3>Item no longer listed</h3>`;

    const requesterName = requesterProfile?.displayName || 'Community member';
    const timestamp = new Date(request.createdAt).toLocaleDateString();

    return `
      <div class="incoming-request-item">
        ${resourceInfo}
        <p class="requester">
          <strong>From:</strong> ${sanitizeUserContent(requesterName)}
        </p>
        <p class="request-note">${sanitizeUserContent(request.note || '')}</p>
        <p class="request-date">Requested on ${timestamp}</p>
        ${resource?.available ? `
          <div class="request-actions">
            <button
              class="btn btn-primary mark-claimed-btn"
              data-resource-id="${sanitizeAttribute(resource.id)}"
              data-requester-id="${sanitizeAttribute(request.receiverId)}"
            >
              Mark as Claimed
            </button>
          </div>
        ` : `<p class="already-claimed">Already claimed</p>`}
      </div>
    `;
  }).join('');

  return `
    <div class="incoming-requests-page">
      <h2>Requests for My Items</h2>
      <div class="requests-list">
        ${requestsList}
      </div>
    </div>
  `;
}
