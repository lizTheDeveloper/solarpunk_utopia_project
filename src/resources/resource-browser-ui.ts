/**
 * Resource Browser UI Component
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * Simple, accessible UI for browsing community resources
 *
 * Follows solarpunk values:
 * - Accessible interface design
 * - Works offline
 * - No tracking or analytics
 * - Progressive enhancement
 */

import { ResourceBrowser, type ResourceFilter, type ResourceSearchResult } from './resource-browser';
import type { Resource, ResourceType, ShareMode } from '../types';
import { LocalDatabase } from '../core/database';
import { sanitizeUserContent } from '../utils/sanitize';

export interface ResourceBrowserUIOptions {
  containerId: string;
  showFilters?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  onResourceClick?: (resource: Resource) => void;
}

/**
 * UI Component for browsing resources
 */
export class ResourceBrowserUI {
  private container: HTMLElement;
  private browser: ResourceBrowser;
  private options: ResourceBrowserUIOptions;
  private currentFilter: ResourceFilter = { availableOnly: true };

  constructor(db: LocalDatabase, options: ResourceBrowserUIOptions) {
    const container = document.getElementById(options.containerId);
    if (!container) {
      throw new Error(`Container element #${options.containerId} not found`);
    }

    this.container = container;
    this.browser = new ResourceBrowser(db);
    this.options = options;

    if (options.userLocation) {
      this.currentFilter.location = options.userLocation;
    }
  }

  /**
   * Render the resource browser interface
   */
  async render(): Promise<void> {
    this.container.innerHTML = '';
    this.container.className = 'resource-browser-container';

    // Create header
    const header = document.createElement('div');
    header.className = 'resource-browser-header';
    header.innerHTML = `
      <h2>Browse Community Resources</h2>
      <p class="resource-browser-description">
        Discover items shared by your community. All resources are freely available
        through gift economy and mutual aid.
      </p>
    `;
    this.container.appendChild(header);

    // Create search and filter section
    if (this.options.showFilters !== false) {
      const filterSection = this.createFilterSection();
      this.container.appendChild(filterSection);
    }

    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'resource-results';
    resultsContainer.className = 'resource-results';
    this.container.appendChild(resultsContainer);

    // Load and display resources
    await this.refreshResults();
  }

  /**
   * Create filter and search UI
   */
  private createFilterSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'resource-filters';

    // Search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'filter-group';
    searchContainer.innerHTML = `
      <label for="resource-search">Search:</label>
      <input
        type="text"
        id="resource-search"
        class="resource-search-input"
        placeholder="Search for items..."
        aria-label="Search for resources"
      />
    `;
    section.appendChild(searchContainer);

    // Resource type filter
    const typeContainer = document.createElement('div');
    typeContainer.className = 'filter-group';
    typeContainer.innerHTML = `
      <label for="resource-type-filter">Type:</label>
      <select id="resource-type-filter" class="resource-type-filter" aria-label="Filter by resource type">
        <option value="">All Types</option>
        <option value="tool">Tools</option>
        <option value="equipment">Equipment</option>
        <option value="space">Spaces</option>
        <option value="energy">Energy</option>
        <option value="food">Food</option>
        <option value="other">Other</option>
      </select>
    `;
    section.appendChild(typeContainer);

    // Share mode filter
    const shareModeContainer = document.createElement('div');
    shareModeContainer.className = 'filter-group';
    shareModeContainer.innerHTML = `
      <label for="share-mode-filter">Share Mode:</label>
      <select id="share-mode-filter" class="share-mode-filter" aria-label="Filter by share mode">
        <option value="">All Modes</option>
        <option value="give">Give Away</option>
        <option value="lend">Lend</option>
        <option value="share">Share</option>
        <option value="borrow">Borrow</option>
      </select>
    `;
    section.appendChild(shareModeContainer);

    // Attach event listeners
    const searchInput = searchContainer.querySelector('input') as HTMLInputElement;
    const typeSelect = typeContainer.querySelector('select') as HTMLSelectElement;
    const shareModeSelect = shareModeContainer.querySelector('select') as HTMLSelectElement;

    // Debounced search
    let searchTimeout: number;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(() => {
        this.currentFilter.searchQuery = searchInput.value || undefined;
        this.refreshResults();
      }, 300);
    });

    typeSelect.addEventListener('change', () => {
      this.currentFilter.resourceType = typeSelect.value as ResourceType || undefined;
      this.refreshResults();
    });

    shareModeSelect.addEventListener('change', () => {
      this.currentFilter.shareMode = shareModeSelect.value as ShareMode || undefined;
      this.refreshResults();
    });

    return section;
  }

  /**
   * Refresh the results display
   */
  private async refreshResults(): Promise<void> {
    const resultsContainer = document.getElementById('resource-results');
    if (!resultsContainer) return;

    // Show loading state
    resultsContainer.innerHTML = '<div class="loading">Loading resources...</div>';

    try {
      // Get filtered results
      const results = await this.browser.browseResources(this.currentFilter);

      // Clear loading state
      resultsContainer.innerHTML = '';

      if (results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="no-results">
            <p>No resources found matching your filters.</p>
            <p>Try adjusting your search or browse all available items.</p>
          </div>
        `;
        return;
      }

      // Display count
      const countElement = document.createElement('div');
      countElement.className = 'results-count';
      countElement.textContent = `${results.length} resource${results.length !== 1 ? 's' : ''} found`;
      resultsContainer.appendChild(countElement);

      // Create resource cards
      const grid = document.createElement('div');
      grid.className = 'resource-grid';

      for (const result of results) {
        const card = this.createResourceCard(result);
        grid.appendChild(card);
      }

      resultsContainer.appendChild(grid);

    } catch (error) {
      resultsContainer.innerHTML = `
        <div class="error">
          <p>Error loading resources. Please try again.</p>
        </div>
      `;
      console.error('Error loading resources:', error);
    }
  }

  /**
   * Create a resource card element
   */
  private createResourceCard(result: ResourceSearchResult): HTMLElement {
    const { resource, distance } = result;

    const card = document.createElement('div');
    card.className = 'resource-card';
    card.setAttribute('data-resource-id', resource.id);

    // Resource status badge
    const statusClass = resource.available ? 'available' : 'unavailable';
    const statusText = resource.available ? 'Available' : 'Unavailable';

    // Distance display
    const distanceHtml = distance !== undefined
      ? `<div class="resource-distance">${this.browser.formatDistance(distance)} away</div>`
      : '';

    // Share mode badge
    const shareModeText = this.formatShareMode(resource.shareMode);

    card.innerHTML = `
      <div class="resource-card-header">
        <h3 class="resource-name">${sanitizeUserContent(resource.name)}</h3>
        <span class="resource-status resource-status-${statusClass}">${statusText}</span>
      </div>
      <div class="resource-meta">
        <span class="resource-type">${this.formatResourceType(resource.resourceType)}</span>
        <span class="resource-share-mode">${shareModeText}</span>
      </div>
      <p class="resource-description">${sanitizeUserContent(resource.description)}</p>
      ${distanceHtml}
      ${resource.tags && resource.tags.length > 0 ? `
        <div class="resource-tags">
          ${resource.tags.map(tag => `<span class="resource-tag">${sanitizeUserContent(tag)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="resource-footer">
        <button class="resource-view-btn" data-resource-id="${resource.id}" aria-label="View details for ${sanitizeUserContent(resource.name)}">
          View Details
        </button>
      </div>
    `;

    // Attach click handler
    const viewBtn = card.querySelector('.resource-view-btn') as HTMLButtonElement;
    viewBtn.addEventListener('click', () => {
      if (this.options.onResourceClick) {
        this.options.onResourceClick(resource);
      } else {
        this.showResourceDetails(resource);
      }
    });

    return card;
  }

  /**
   * Show detailed view of a resource
   */
  private showResourceDetails(resource: Resource): void {
    // Simple modal display
    const modal = document.createElement('div');
    modal.className = 'resource-modal';
    modal.innerHTML = `
      <div class="resource-modal-content">
        <div class="resource-modal-header">
          <h2>${sanitizeUserContent(resource.name)}</h2>
          <button class="resource-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="resource-modal-body">
          <p><strong>Type:</strong> ${this.formatResourceType(resource.resourceType)}</p>
          <p><strong>Share Mode:</strong> ${this.formatShareMode(resource.shareMode)}</p>
          <p><strong>Status:</strong> ${resource.available ? 'Available' : 'Not Available'}</p>
          ${resource.location ? `<p><strong>Location:</strong> ${sanitizeUserContent(resource.location)}</p>` : ''}
          <p><strong>Description:</strong></p>
          <p>${sanitizeUserContent(resource.description)}</p>
          ${resource.tags && resource.tags.length > 0 ? `
            <div class="resource-tags">
              ${resource.tags.map(tag => `<span class="resource-tag">${sanitizeUserContent(tag)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button handler
    const closeBtn = modal.querySelector('.resource-modal-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * Format resource type for display
   */
  private formatResourceType(type: ResourceType): string {
    const typeMap: Record<ResourceType, string> = {
      tool: 'Tool',
      equipment: 'Equipment',
      space: 'Space',
      energy: 'Energy',
      food: 'Food',
      skill: 'Skill',
      time: 'Time',
      robot: 'Robot',
      fabrication: 'Fabrication',
      other: 'Other'
    };
    return typeMap[type] || type;
  }

  /**
   * Format share mode for display
   */
  private formatShareMode(mode: ShareMode): string {
    const modeMap: Record<ShareMode, string> = {
      give: 'Give Away',
      lend: 'Lend',
      share: 'Share',
      borrow: 'Borrow'
    };
    return modeMap[mode] || mode;
  }

  /**
   * Update filter and refresh results
   */
  async updateFilter(filter: Partial<ResourceFilter>): Promise<void> {
    this.currentFilter = { ...this.currentFilter, ...filter };
    await this.refreshResults();
  }

  /**
   * Reset all filters
   */
  async resetFilters(): Promise<void> {
    this.currentFilter = { availableOnly: true };
    if (this.options.userLocation) {
      this.currentFilter.location = this.options.userLocation;
    }
    await this.refreshResults();
  }
}
