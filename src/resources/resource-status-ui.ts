/**
 * Resource Status UI Integration
 * REQ-SHARE-006: Resource Lifecycle Tracking
 *
 * This module provides the UI integration for resource status management
 * within the broader Solarpunk Utopia Platform.
 */

import {
  renderMyResources,
  renderResourcesList,
  initResourceStatusHandlers,
  getAvailableResources,
} from './resource-status';
import { db } from '../core/database';

/**
 * Render the main resources view
 * Integrates with the platform's navigation system
 */
export function renderResourcesView(userId: string): string {
  return `
    <div id="resources-view" class="view-container">
      <div class="view-header">
        <h2>🎁 Community Resources</h2>
        <p class="view-description">
          Share, lend, and gift resources with your community.
          No money, no debt—just mutual aid and care.
        </p>
      </div>

      <div class="resources-tabs">
        <button class="tab-button active" data-tab="browse">
          Browse Available
        </button>
        <button class="tab-button" data-tab="my-resources">
          My Resources
        </button>
      </div>

      <div class="tab-content">
        <div id="tab-browse" class="tab-pane active">
          ${renderBrowseView(userId)}
        </div>
        <div id="tab-my-resources" class="tab-pane">
          ${renderMyResources(userId)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the browse/discover view
 */
function renderBrowseView(userId: string): string {
  const availableResources = getAvailableResources()
    .filter(r => r.ownerId !== userId); // Don't show user's own resources

  if (availableResources.length === 0) {
    return `
      <div class="browse-empty">
        <h3>No resources currently available</h3>
        <p>
          Be the first to share! Your community will appreciate
          tools, equipment, and items you're willing to lend or give.
        </p>
        <button id="btn-add-first-resource" class="btn-primary">
          Share a Resource
        </button>
      </div>
    `;
  }

  return renderResourcesList(
    availableResources,
    userId,
    'Available in Your Community',
    true
  );
}

/**
 * Initialize the resources view with all event handlers
 */
export function initResourcesView(userId: string) {
  const container = document.getElementById('app');
  if (!container) return;

  // Render the view
  container.innerHTML = renderResourcesView(userId);

  // Initialize tab switching
  initTabSwitching();

  // Initialize resource status handlers
  initResourceStatusHandlers(userId);

  // Initialize add resource button
  const addResourceBtn = document.getElementById('btn-add-resource');
  if (addResourceBtn) {
    addResourceBtn.addEventListener('click', () => {
      showAddResourceModal(userId);
    });
  }

  const addFirstResourceBtn = document.getElementById('btn-add-first-resource');
  if (addFirstResourceBtn) {
    addFirstResourceBtn.addEventListener('click', () => {
      showAddResourceModal(userId);
    });
  }
}

/**
 * Initialize tab switching functionality
 */
function initTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tabName = target.dataset.tab;

      // Update active button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');

      // Update active pane
      tabPanes.forEach(pane => pane.classList.remove('active'));
      const activePane = document.getElementById(`tab-${tabName}`);
      if (activePane) {
        activePane.classList.add('active');
      }
    });
  });
}

/**
 * Show add resource modal (simplified version)
 * In a full implementation, this would be a proper modal with form validation
 */
function showAddResourceModal(userId: string) {
  const modalHtml = `
    <div id="add-resource-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Share a Resource</h3>
          <button class="modal-close">&times;</button>
        </div>

        <form id="add-resource-form">
          <div class="form-group">
            <label for="resource-name">Resource Name *</label>
            <input
              type="text"
              id="resource-name"
              required
              placeholder="e.g., Electric Drill, Ladder, Garden Tools"
            />
          </div>

          <div class="form-group">
            <label for="resource-description">Description *</label>
            <textarea
              id="resource-description"
              required
              rows="3"
              placeholder="Describe the resource, its condition, any special instructions..."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="resource-type">Type</label>
            <select id="resource-type">
              <option value="tool">Tool</option>
              <option value="equipment">Equipment</option>
              <option value="space">Space</option>
              <option value="food">Food</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="form-group">
            <label for="share-mode">How to share</label>
            <select id="share-mode">
              <option value="lend">Lend (temporary use)</option>
              <option value="give">Give away (permanent)</option>
              <option value="share">Share (ongoing)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="resource-location">Location (optional)</label>
            <input
              type="text"
              id="resource-location"
              placeholder="e.g., Downtown co-op, North garden"
            />
          </div>

          <div class="form-group">
            <label for="resource-tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="resource-tags"
              placeholder="e.g., power-tools, DIY, woodworking"
            />
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="available-now" checked />
              Available immediately
            </label>
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-primary">
              Share Resource
            </button>
            <button type="button" class="btn-cancel">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Initialize modal handlers
  const modal = document.getElementById('add-resource-modal');
  const closeBtn = modal?.querySelector('.modal-close');
  const cancelBtn = modal?.querySelector('.btn-cancel');
  const form = document.getElementById('add-resource-form') as HTMLFormElement;

  const closeModal = () => {
    modal?.remove();
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = (document.getElementById('resource-name') as HTMLInputElement).value;
    const description = (document.getElementById('resource-description') as HTMLTextAreaElement).value;
    const resourceType = (document.getElementById('resource-type') as HTMLSelectElement).value as any;
    const shareMode = (document.getElementById('share-mode') as HTMLSelectElement).value as any;
    const location = (document.getElementById('resource-location') as HTMLInputElement).value || undefined;
    const tagsInput = (document.getElementById('resource-tags') as HTMLInputElement).value;
    const available = (document.getElementById('available-now') as HTMLInputElement).checked;

    const tags = tagsInput
      ? tagsInput.split(',').map(t => t.trim()).filter(t => t)
      : undefined;

    try {
      await db.addResource({
        name,
        description,
        resourceType,
        shareMode,
        available,
        ownerId: userId,
        location,
        tags,
      });

      alert('Resource shared successfully! 🌻');
      closeModal();

      // Refresh the view
      initResourcesView(userId);
    } catch (error) {
      console.error('Failed to add resource:', error);
      alert('Failed to share resource. Please try again.');
    }
  });
}

/**
 * Render a quick stats summary for the dashboard
 */
export function renderResourcesStats(userId: string): string {
  const allResources = db.listResources();
  const available = allResources.filter(r => r.available);
  const myResources = allResources.filter(r => r.ownerId === userId);

  return `
    <div class="resources-stats">
      <h4>Resource Sharing</h4>
      <div class="stats-grid">
        <div class="stat">
          <span class="stat-value">${available.length}</span>
          <span class="stat-label">Available Now</span>
        </div>
        <div class="stat">
          <span class="stat-value">${myResources.length}</span>
          <span class="stat-label">Your Resources</span>
        </div>
        <div class="stat">
          <span class="stat-value">${allResources.length}</span>
          <span class="stat-label">Total Shared</span>
        </div>
      </div>
    </div>
  `;
}

export { renderResourcesView, initResourcesView, renderResourcesStats };
