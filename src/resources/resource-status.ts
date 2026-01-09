/**
 * Resource Status Management
 * REQ-SHARE-006: Resource Lifecycle Tracking
 *
 * Manages the availability status of shared resources in the gift economy.
 * "Available" means ready to share. "Claimed" means currently in use by someone.
 */

import { db } from '../core/database';
import type { Resource } from '../types';
import { sanitizeUserContent, validateIdentifier } from '../utils/sanitize';

/**
 * Mark a resource as claimed (not available)
 */
export async function markResourceClaimed(
  resourceId: string,
  claimedBy?: string,
  note?: string
): Promise<void> {
  const resource = db.getResource(resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  await db.updateResource(resourceId, {
    available: false,
  });

  // Optionally record the claim event
  if (claimedBy) {
    await db.addEvent({
      action: 'transfer',
      providerId: resource.ownerId,
      receiverId: claimedBy,
      resourceId: resource.id,
      note: note,
    });
  }
}

/**
 * Mark a resource as available again
 */
export async function markResourceAvailable(
  resourceId: string,
  returnedBy?: string,
  note?: string
): Promise<void> {
  const resource = db.getResource(resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  await db.updateResource(resourceId, {
    available: true,
  });

  // Optionally record the return event
  if (returnedBy) {
    await db.addEvent({
      action: 'return',
      providerId: returnedBy,
      receiverId: resource.ownerId,
      resourceId: resource.id,
      note: note,
    });
  }
}

/**
 * Toggle resource availability status
 */
export async function toggleResourceAvailability(
  resourceId: string,
  userId: string
): Promise<boolean> {
  const resource = db.getResource(resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  const newAvailability = !resource.available;

  if (newAvailability) {
    // Mark as available
    await markResourceAvailable(resourceId, userId);
  } else {
    // Mark as claimed
    await markResourceClaimed(resourceId, userId);
  }

  return newAvailability;
}

/**
 * Get available resources (filter by availability)
 */
export function getAvailableResources(): Resource[] {
  return db.listResources().filter(r => r.available);
}

/**
 * Get claimed/unavailable resources
 */
export function getClaimedResources(): Resource[] {
  return db.listResources().filter(r => !r.available);
}

/**
 * Get resources by owner
 */
export function getResourcesByOwner(ownerId: string): Resource[] {
  return db.listResources().filter(r => r.ownerId === ownerId);
}

/**
 * Get user's available resources
 */
export function getUserAvailableResources(userId: string): Resource[] {
  return getResourcesByOwner(userId).filter(r => r.available);
}

/**
 * Get user's claimed resources
 */
export function getUserClaimedResources(userId: string): Resource[] {
  return getResourcesByOwner(userId).filter(r => !r.available);
}

/**
 * Render resource status badge
 */
export function renderResourceStatusBadge(resource: Resource): string {
  const statusClass = resource.available ? 'status-available' : 'status-claimed';
  const statusEmoji = resource.available ? '✓' : '○';
  const statusText = resource.available ? 'Available' : 'Claimed';

  return `
    <span class="resource-status-badge ${statusClass}">
      <span class="status-emoji">${statusEmoji}</span>
      <span class="status-text">${statusText}</span>
    </span>
  `;
}

/**
 * Render resource card with status toggle
 */
export function renderResourceCard(resource: Resource, isOwner: boolean = false): string {
  const shareModeBadge = {
    'give': '🎁 Give',
    'lend': '🔄 Lend',
    'share': '🤝 Share',
    'borrow': '📥 Borrow',
  }[resource.shareMode];

  const photos = resource.photos && resource.photos.length > 0
    ? `<div class="resource-photos">
        ${resource.photos.map(photo => `<img src="${photo}" alt="${sanitizeUserContent(resource.name)}" class="resource-photo" />`).join('')}
      </div>`
    : '';

  const tags = resource.tags && resource.tags.length > 0
    ? `<div class="resource-tags">
        ${resource.tags.map(tag => `<span class="tag">${sanitizeUserContent(tag)}</span>`).join('')}
      </div>`
    : '';

  const ownerControls = isOwner
    ? `<div class="resource-owner-controls">
        <button class="btn-toggle-status" data-resource-id="${validateIdentifier(resource.id)}">
          ${resource.available ? 'Mark as Claimed' : 'Mark as Available'}
        </button>
        <button class="btn-edit-resource" data-resource-id="${validateIdentifier(resource.id)}">
          Edit
        </button>
      </div>`
    : '';

  const claimButton = !isOwner && resource.available
    ? `<button class="btn-claim-resource" data-resource-id="${validateIdentifier(resource.id)}">
        Claim this ${resource.shareMode === 'give' ? 'gift' : 'item'}
      </button>`
    : '';

  return `
    <div class="resource-card ${resource.available ? '' : 'resource-unavailable'}">
      <div class="resource-header">
        <h4 class="resource-name">${sanitizeUserContent(resource.name)}</h4>
        ${renderResourceStatusBadge(resource)}
      </div>

      ${photos}

      <div class="resource-details">
        <p class="resource-description">${sanitizeUserContent(resource.description)}</p>

        <div class="resource-meta">
          <span class="share-mode-badge">${shareModeBadge}</span>
          <span class="resource-type">${resource.resourceType}</span>
          ${resource.location ? `<span class="resource-location">📍 ${sanitizeUserContent(resource.location)}</span>` : ''}
        </div>

        ${tags}
      </div>

      ${ownerControls}
      ${claimButton}
    </div>
  `;
}

/**
 * Render list of resources with status filtering
 */
export function renderResourcesList(
  resources: Resource[],
  currentUserId: string,
  title: string = 'Community Resources',
  showFilter: boolean = true
): string {
  const availableCount = resources.filter(r => r.available).length;
  const claimedCount = resources.filter(r => !r.available).length;

  const filterControls = showFilter
    ? `<div class="resources-filter">
        <button class="btn-filter active" data-filter="all">
          All (${resources.length})
        </button>
        <button class="btn-filter" data-filter="available">
          Available (${availableCount})
        </button>
        <button class="btn-filter" data-filter="claimed">
          Claimed (${claimedCount})
        </button>
      </div>`
    : '';

  const resourceCards = resources.length > 0
    ? resources.map(resource => {
        const isOwner = resource.ownerId === currentUserId;
        return renderResourceCard(resource, isOwner);
      }).join('')
    : '<p class="no-resources">No resources found. Be the first to share!</p>';

  return `
    <div class="resources-list-container">
      <h3>${title}</h3>
      ${filterControls}
      <div class="resources-grid" data-filter="all">
        ${resourceCards}
      </div>
    </div>
  `;
}

/**
 * Render my resources view (owner's perspective)
 */
export function renderMyResources(userId: string): string {
  const myResources = getResourcesByOwner(userId);
  const available = getUserAvailableResources(userId);
  const claimed = getUserClaimedResources(userId);

  if (myResources.length === 0) {
    return `
      <div class="my-resources-empty">
        <h3>Your Shared Resources</h3>
        <p>You haven't shared any resources yet.</p>
        <button id="btn-add-resource" class="btn-primary">
          Share a Resource
        </button>
      </div>
    `;
  }

  return `
    <div class="my-resources-container">
      <div class="my-resources-header">
        <h3>Your Shared Resources</h3>
        <button id="btn-add-resource" class="btn-primary">
          Share a Resource
        </button>
      </div>

      <div class="my-resources-summary">
        <p>
          <strong>${available.length}</strong> available ·
          <strong>${claimed.length}</strong> currently claimed
        </p>
      </div>

      ${renderResourcesList(myResources, userId, '', true)}
    </div>
  `;
}

/**
 * Initialize resource status event handlers
 */
export function initResourceStatusHandlers(userId: string) {
  // Toggle status buttons (for owners)
  document.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const resourceId = validateIdentifier((e.target as HTMLElement).dataset.resourceId);
      if (resourceId) {
        try {
          const newStatus = await toggleResourceAvailability(resourceId, userId);
          const message = newStatus
            ? 'Resource marked as available!'
            : 'Resource marked as claimed!';
          alert(message);
          // Refresh the view
          refreshResourceView(userId);
        } catch (error) {
          console.error('Failed to toggle resource status:', error);
          alert('Failed to update resource status. Please try again.');
        }
      }
    });
  });

  // Claim resource buttons (for non-owners)
  document.querySelectorAll('.btn-claim-resource').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const resourceId = validateIdentifier((e.target as HTMLElement).dataset.resourceId);
      if (resourceId) {
        const confirmed = confirm('Do you want to claim this resource?');
        if (confirmed) {
          try {
            await markResourceClaimed(resourceId, userId, 'Claimed from browse view');
            alert('Resource claimed! Please coordinate pickup with the owner.');
            // Refresh the view
            refreshResourceView(userId);
          } catch (error) {
            console.error('Failed to claim resource:', error);
            alert('Failed to claim resource. Please try again.');
          }
        }
      }
    });
  });

  // Filter buttons
  document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const filter = target.dataset.filter;

      // Update active button
      document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      // Filter resources
      const grid = document.querySelector('.resources-grid');
      if (grid && filter) {
        grid.setAttribute('data-filter', filter);
        filterResourceCards(filter);
      }
    });
  });
}

/**
 * Filter resource cards by status
 */
function filterResourceCards(filter: string) {
  const cards = document.querySelectorAll('.resource-card');
  cards.forEach(card => {
    const isAvailable = !card.classList.contains('resource-unavailable');

    if (filter === 'all') {
      (card as HTMLElement).style.display = 'block';
    } else if (filter === 'available') {
      (card as HTMLElement).style.display = isAvailable ? 'block' : 'none';
    } else if (filter === 'claimed') {
      (card as HTMLElement).style.display = !isAvailable ? 'block' : 'none';
    }
  });
}

/**
 * Refresh the resource view
 */
function refreshResourceView(userId: string) {
  const container = document.getElementById('resources-view');
  if (!container) return;

  // Re-render the resources view
  container.innerHTML = renderMyResources(userId);
  initResourceStatusHandlers(userId);
}

export { refreshResourceView };
