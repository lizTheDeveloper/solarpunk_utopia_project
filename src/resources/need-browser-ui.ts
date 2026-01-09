/**
 * Need Browser UI Component with Urgency Indicators
 *
 * Phase 2, Group C: Open Requests & Needs
 * Feature: Urgency indicators
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * Implements browsing community needs with clear urgency visual indicators
 *
 * Following solarpunk values:
 * - Accessible interface design
 * - Works offline
 * - No tracking or analytics
 * - Clear, empathetic communication of need urgency
 * - Mutual aid focused (not transactional)
 */

import { NeedBrowser, type NeedFilter, type NeedSearchResult } from './need-browser';
import type { Need, UrgencyLevel, ResourceType } from '../types';
import { LocalDatabase } from '../core/database';
import { sanitizeUserContent } from '../utils/sanitize';

export interface NeedBrowserUIOptions {
  containerId: string;
  showFilters?: boolean;
  onNeedClick?: (need: Need) => void;
  onRespondClick?: (need: Need) => void;
}

/**
 * UI Component for browsing community needs with urgency indicators
 */
export class NeedBrowserUI {
  private container: HTMLElement;
  private browser: NeedBrowser;
  private options: NeedBrowserUIOptions;
  private currentFilter: NeedFilter = { unfulfilledOnly: true, sortByUrgency: true };

  constructor(db: LocalDatabase, options: NeedBrowserUIOptions) {
    const container = document.getElementById(options.containerId);
    if (!container) {
      throw new Error(`Container element #${options.containerId} not found`);
    }

    this.container = container;
    this.browser = new NeedBrowser(db);
    this.options = options;
  }

  /**
   * Render the need browser interface
   */
  async render(): Promise<void> {
    this.container.innerHTML = '';
    this.container.className = 'need-browser-container';

    // Create header
    const header = document.createElement('div');
    header.className = 'need-browser-header';
    header.innerHTML = `
      <h2>Community Needs & Requests</h2>
      <p class="need-browser-description">
        See what your community needs. Every request is a chance to help and build connections.
        Urgency indicators help you understand what's most time-sensitive.
      </p>
    `;
    this.container.appendChild(header);

    // Create urgency legend
    const legend = this.createUrgencyLegend();
    this.container.appendChild(legend);

    // Create search and filter section
    if (this.options.showFilters !== false) {
      const filterSection = this.createFilterSection();
      this.container.appendChild(filterSection);
    }

    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'need-results';
    resultsContainer.className = 'need-results';
    this.container.appendChild(resultsContainer);

    // Load and display needs
    await this.refreshResults();
  }

  /**
   * Create urgency level legend to help users understand indicators
   */
  private createUrgencyLegend(): HTMLElement {
    const legend = document.createElement('div');
    legend.className = 'urgency-legend';
    legend.innerHTML = `
      <h3>Urgency Levels:</h3>
      <div class="urgency-legend-items">
        <div class="urgency-legend-item urgency-urgent">
          <span class="urgency-icon">${this.browser.getUrgencyIcon('urgent')}</span>
          <span class="urgency-label">Urgent</span>
          <span class="urgency-description">${this.browser.getUrgencyDescription('urgent')}</span>
        </div>
        <div class="urgency-legend-item urgency-needed">
          <span class="urgency-icon">${this.browser.getUrgencyIcon('needed')}</span>
          <span class="urgency-label">Needed</span>
          <span class="urgency-description">${this.browser.getUrgencyDescription('needed')}</span>
        </div>
        <div class="urgency-legend-item urgency-helpful">
          <span class="urgency-icon">${this.browser.getUrgencyIcon('helpful')}</span>
          <span class="urgency-label">Helpful</span>
          <span class="urgency-description">${this.browser.getUrgencyDescription('helpful')}</span>
        </div>
        <div class="urgency-legend-item urgency-casual">
          <span class="urgency-icon">${this.browser.getUrgencyIcon('casual')}</span>
          <span class="urgency-label">Casual</span>
          <span class="urgency-description">${this.browser.getUrgencyDescription('casual')}</span>
        </div>
      </div>
    `;
    return legend;
  }

  /**
   * Create filter and search UI
   */
  private createFilterSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'need-filters';

    // Search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'filter-group';
    searchContainer.innerHTML = `
      <label for="need-search">Search:</label>
      <input
        type="text"
        id="need-search"
        class="need-search-input"
        placeholder="Search community needs..."
        aria-label="Search for community needs"
      />
    `;
    section.appendChild(searchContainer);

    // Urgency filter
    const urgencyContainer = document.createElement('div');
    urgencyContainer.className = 'filter-group';
    urgencyContainer.innerHTML = `
      <label for="urgency-filter">Urgency:</label>
      <select id="urgency-filter" class="urgency-filter" aria-label="Filter by urgency level">
        <option value="">All Urgency Levels</option>
        <option value="urgent">🚨 Urgent</option>
        <option value="needed">⚡ Needed</option>
        <option value="helpful">🌱 Helpful</option>
        <option value="casual">💭 Casual</option>
      </select>
    `;
    section.appendChild(urgencyContainer);

    // Resource type filter
    const typeContainer = document.createElement('div');
    typeContainer.className = 'filter-group';
    typeContainer.innerHTML = `
      <label for="need-type-filter">Type:</label>
      <select id="need-type-filter" class="need-type-filter" aria-label="Filter by resource type">
        <option value="">All Types</option>
        <option value="tool">Tools</option>
        <option value="equipment">Equipment</option>
        <option value="space">Spaces</option>
        <option value="energy">Energy</option>
        <option value="food">Food</option>
        <option value="skill">Skills</option>
        <option value="time">Time/Help</option>
        <option value="other">Other</option>
      </select>
    `;
    section.appendChild(typeContainer);

    // Show fulfilled toggle
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'filter-group';
    toggleContainer.innerHTML = `
      <label>
        <input
          type="checkbox"
          id="show-fulfilled-toggle"
          class="show-fulfilled-toggle"
          aria-label="Show fulfilled needs"
        />
        Show fulfilled needs
      </label>
    `;
    section.appendChild(toggleContainer);

    // Attach event listeners
    const searchInput = searchContainer.querySelector('input') as HTMLInputElement;
    const urgencySelect = urgencyContainer.querySelector('select') as HTMLSelectElement;
    const typeSelect = typeContainer.querySelector('select') as HTMLSelectElement;
    const fulfilledToggle = toggleContainer.querySelector('input') as HTMLInputElement;

    // Debounced search
    let searchTimeout: number;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(() => {
        this.currentFilter.searchQuery = searchInput.value || undefined;
        this.refreshResults();
      }, 300);
    });

    urgencySelect.addEventListener('change', () => {
      this.currentFilter.urgency = urgencySelect.value as UrgencyLevel || undefined;
      this.refreshResults();
    });

    typeSelect.addEventListener('change', () => {
      this.currentFilter.resourceType = typeSelect.value as ResourceType || undefined;
      this.refreshResults();
    });

    fulfilledToggle.addEventListener('change', () => {
      this.currentFilter.unfulfilledOnly = !fulfilledToggle.checked;
      this.refreshResults();
    });

    return section;
  }

  /**
   * Refresh the results display
   */
  private async refreshResults(): Promise<void> {
    const resultsContainer = document.getElementById('need-results');
    if (!resultsContainer) return;

    // Show loading state
    resultsContainer.innerHTML = '<div class="loading">Loading community needs...</div>';

    try {
      // Get filtered results
      const results = await this.browser.browseNeeds(this.currentFilter);

      // Clear loading state
      resultsContainer.innerHTML = '';

      if (results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="no-results">
            <p>No community needs found matching your filters.</p>
            <p>Try adjusting your filters or check back later!</p>
          </div>
        `;
        return;
      }

      // Display count
      const countElement = document.createElement('div');
      countElement.className = 'results-count';
      countElement.textContent = `${results.length} need${results.length !== 1 ? 's' : ''} found`;
      resultsContainer.appendChild(countElement);

      // Create need cards
      const grid = document.createElement('div');
      grid.className = 'need-grid';

      for (const result of results) {
        const card = this.createNeedCard(result);
        grid.appendChild(card);
      }

      resultsContainer.appendChild(grid);

    } catch (error) {
      resultsContainer.innerHTML = `
        <div class="error">
          <p>Error loading community needs. Please try again.</p>
        </div>
      `;
      console.error('Error loading needs:', error);
    }
  }

  /**
   * Create a need card element with urgency indicator
   */
  private createNeedCard(result: NeedSearchResult): HTMLElement {
    const { need } = result;

    const card = document.createElement('div');
    card.className = `need-card ${this.browser.getUrgencyColorClass(need.urgency)}`;
    card.setAttribute('data-need-id', need.id);

    // Urgency badge with icon and label
    const urgencyIcon = this.browser.getUrgencyIcon(need.urgency);
    const urgencyLabel = this.formatUrgencyLabel(need.urgency);

    // Fulfilled status
    const statusClass = need.fulfilled ? 'fulfilled' : 'active';
    const statusText = need.fulfilled ? 'Fulfilled' : 'Active';

    // Resource type badge (if specified)
    const resourceTypeBadge = need.resourceType
      ? `<span class="need-resource-type">${this.formatResourceType(need.resourceType)}</span>`
      : '';

    // Time posted
    const timePosted = this.formatTimePosted(need.createdAt);

    card.innerHTML = `
      <div class="need-card-header">
        <div class="need-urgency-badge ${this.browser.getUrgencyColorClass(need.urgency)}">
          <span class="urgency-icon" aria-hidden="true">${urgencyIcon}</span>
          <span class="urgency-label">${urgencyLabel}</span>
        </div>
        <span class="need-status need-status-${statusClass}">${statusText}</span>
      </div>
      <div class="need-meta">
        ${resourceTypeBadge}
        <span class="need-time-posted">${timePosted}</span>
      </div>
      <p class="need-description">${sanitizeHtml(need.description)}</p>
      <div class="need-footer">
        ${!need.fulfilled ? `
          <button class="need-respond-btn" data-need-id="${need.id}" aria-label="Respond to this need">
            I Can Help
          </button>
        ` : ''}
        <button class="need-view-btn" data-need-id="${need.id}" aria-label="View details for this need">
          View Details
        </button>
      </div>
    `;

    // Attach click handlers
    const respondBtn = card.querySelector('.need-respond-btn') as HTMLButtonElement | null;
    const viewBtn = card.querySelector('.need-view-btn') as HTMLButtonElement;

    if (respondBtn) {
      respondBtn.addEventListener('click', () => {
        if (this.options.onRespondClick) {
          this.options.onRespondClick(need);
        } else {
          this.showRespondModal(need);
        }
      });
    }

    viewBtn.addEventListener('click', () => {
      if (this.options.onNeedClick) {
        this.options.onNeedClick(need);
      } else {
        this.showNeedDetails(need);
      }
    });

    return card;
  }

  /**
   * Show detailed view of a need
   */
  private showNeedDetails(need: Need): void {
    const modal = document.createElement('div');
    modal.className = 'need-modal';

    const urgencyIcon = this.browser.getUrgencyIcon(need.urgency);
    const urgencyLabel = this.formatUrgencyLabel(need.urgency);
    const urgencyDescription = this.browser.getUrgencyDescription(need.urgency);

    modal.innerHTML = `
      <div class="need-modal-content">
        <div class="need-modal-header">
          <h2>Community Need Details</h2>
          <button class="need-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="need-modal-body">
          <div class="need-urgency-display ${this.browser.getUrgencyColorClass(need.urgency)}">
            <span class="urgency-icon">${urgencyIcon}</span>
            <div class="urgency-info">
              <strong>${urgencyLabel}</strong>
              <p>${urgencyDescription}</p>
            </div>
          </div>
          <p><strong>Status:</strong> ${need.fulfilled ? 'Fulfilled' : 'Active'}</p>
          ${need.resourceType ? `<p><strong>Type:</strong> ${this.formatResourceType(need.resourceType)}</p>` : ''}
          <p><strong>Posted:</strong> ${this.formatTimePosted(need.createdAt)}</p>
          <p><strong>Description:</strong></p>
          <p class="need-detail-description">${sanitizeHtml(need.description)}</p>
          ${!need.fulfilled ? `
            <div class="need-modal-actions">
              <button class="need-respond-modal-btn" data-need-id="${need.id}">
                I Can Help
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button handler
    const closeBtn = modal.querySelector('.need-modal-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Respond button handler
    const respondBtn = modal.querySelector('.need-respond-modal-btn') as HTMLButtonElement | null;
    if (respondBtn) {
      respondBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        if (this.options.onRespondClick) {
          this.options.onRespondClick(need);
        } else {
          this.showRespondModal(need);
        }
      });
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * Show modal for responding to a need
   */
  private showRespondModal(need: Need): void {
    const modal = document.createElement('div');
    modal.className = 'need-respond-modal';
    modal.innerHTML = `
      <div class="need-respond-modal-content">
        <div class="need-respond-modal-header">
          <h2>Respond to Community Need</h2>
          <button class="need-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="need-respond-modal-body">
          <p><strong>Need:</strong> ${sanitizeHtml(need.description)}</p>
          <p>This feature will connect you with the person who posted this need.</p>
          <p><em>Connection and coordination features coming soon!</em></p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button handler
    const closeBtn = modal.querySelector('.need-modal-close') as HTMLButtonElement;
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
   * Format urgency level for display
   */
  private formatUrgencyLabel(urgency: UrgencyLevel): string {
    const labels: Record<UrgencyLevel, string> = {
      'casual': 'Casual',
      'helpful': 'Helpful',
      'needed': 'Needed',
      'urgent': 'Urgent'
    };
    return labels[urgency] || urgency;
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
   * Format time posted in a human-readable way
   */
  private formatTimePosted(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }

  /**
   * Update filter and refresh results
   */
  async updateFilter(filter: Partial<NeedFilter>): Promise<void> {
    this.currentFilter = { ...this.currentFilter, ...filter };
    await this.refreshResults();
  }

  /**
   * Reset all filters
   */
  async resetFilters(): Promise<void> {
    this.currentFilter = { unfulfilledOnly: true, sortByUrgency: true };
    await this.refreshResults();
  }

  /**
   * Show only high-priority needs (urgent + needed)
   */
  async showHighPriorityOnly(): Promise<void> {
    // This will be handled by manually setting multiple urgency filters
    // For now, we filter to just show urgent
    this.currentFilter = {
      unfulfilledOnly: true,
      sortByUrgency: true,
      urgency: 'urgent'
    };
    await this.refreshResults();
  }
}
