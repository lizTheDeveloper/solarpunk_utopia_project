/**
 * Solarpunk Platform - Community UI Components
 *
 * UI for creating and managing communities
 * Implements REQ-GOV-001: Community Groups and Communes
 * Implements REQ-GOV-002: Community Philosophy and Values
 */

(function(window) {
  'use strict';

  /**
   * Render community creation form
   */
  function renderCommunityCreationForm() {
    return `
      <div class="community-creation-section" style="padding: 1rem; background-color: rgba(74, 157, 95, 0.1); border-radius: 4px; margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1rem;">Create a Community</h3>
        <p style="margin-bottom: 1rem; opacity: 0.8;">
          Form a neighborhood network, mutual aid group, or intentional commune.
        </p>

        <form id="create-community-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <!-- Basic Information -->
          <div>
            <label for="community-name" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Community Name *
            </label>
            <input
              type="text"
              id="community-name"
              required
              placeholder="e.g., Oakwood Mutual Aid Network"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"
            />
          </div>

          <div>
            <label for="community-description" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Description
            </label>
            <textarea
              id="community-description"
              rows="3"
              placeholder="Describe your community's purpose and what brings you together"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit; resize: vertical;"
            ></textarea>
          </div>

          <!-- Location -->
          <div>
            <label for="location-type" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Location Type
            </label>
            <select
              id="location-type"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"
            >
              <option value="geographic">Geographic (neighborhood, city, region)</option>
              <option value="virtual">Virtual (online community)</option>
              <option value="hybrid">Hybrid (both physical and virtual)</option>
            </select>
          </div>

          <div>
            <label for="location-description" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Location Description
            </label>
            <input
              type="text"
              id="location-description"
              placeholder="e.g., West Oakland, CA or Global"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"
            />
          </div>

          <!-- Membership Model -->
          <div>
            <label for="membership-model" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Membership Model
            </label>
            <select
              id="membership-model"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"
            >
              <option value="open">Open - Anyone can join</option>
              <option value="application">Application-based - Members apply to join</option>
              <option value="invitation">Invitation-only - Members must be invited</option>
            </select>
          </div>

          <!-- Governance -->
          <div>
            <label for="governance-structure" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Governance Structure
            </label>
            <select
              id="governance-structure"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"
            >
              <option value="consensus">Consensus - Full agreement required</option>
              <option value="consent">Consent-based - Sociocracy, no objections</option>
              <option value="majority">Simple Majority - 50%+ vote</option>
              <option value="supermajority">Supermajority - 2/3 or 3/4 vote</option>
              <option value="delegation">Delegate System - Elected representatives</option>
              <option value="custom">Custom - Describe below</option>
            </select>
          </div>

          <div>
            <label for="governance-description" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Governance Details (optional)
            </label>
            <textarea
              id="governance-description"
              rows="2"
              placeholder="Describe your decision-making process"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit; resize: vertical;"
            ></textarea>
          </div>

          <!-- Core Values -->
          <div>
            <label for="core-values" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Core Values (comma-separated)
            </label>
            <input
              type="text"
              id="core-values"
              placeholder="e.g., mutual aid, solidarity, anti-capitalism, ecology"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"
            />
          </div>

          <!-- Visibility -->
          <div>
            <label for="visibility" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">
              Visibility
            </label>
            <select
              id="visibility"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"
            >
              <option value="public">Public - Visible to everyone</option>
              <option value="unlisted">Unlisted - Only visible with direct link</option>
              <option value="private">Private - Only visible to members</option>
            </select>
          </div>

          <button
            type="submit"
            style="padding: 0.75rem; background-color: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 1rem;"
          >
            Create Community
          </button>
        </form>
      </div>
    `;
  }

  /**
   * Render community list
   */
  function renderCommunityList(communities) {
    if (communities.length === 0) {
      return `
        <div style="padding: 2rem; text-align: center; opacity: 0.7;">
          <p>No communities yet. Create the first one!</p>
        </div>
      `;
    }

    return `
      <div class="communities-list" style="display: flex; flex-direction: column; gap: 1rem;">
        ${communities.map(community => renderCommunityCard(community)).join('')}
      </div>
    `;
  }

  /**
   * Render single community card
   */
  function renderCommunityCard(community) {
    const membershipBadge = {
      'open': '🌐 Open',
      'application': '📝 Application',
      'invitation': '✉️ Invitation'
    }[community.membership.model] || community.membership.model;

    const governanceBadge = {
      'consensus': '🤝 Consensus',
      'consent': '✋ Consent',
      'majority': '🗳️ Majority',
      'supermajority': '📊 Supermajority',
      'delegation': '👥 Delegation',
      'custom': '⚙️ Custom'
    }[community.governance.structure] || community.governance.structure;

    return `
      <div class="community-card" style="padding: 1.5rem; background-color: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid var(--color-primary);">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <h3 style="margin: 0; font-size: 1.25rem;">${escapeHtml(community.name)}</h3>
          <div style="display: flex; gap: 0.5rem;">
            <button
              onclick="window.CommunityUI.viewCommunity('${community.id}')"
              style="padding: 0.25rem 0.75rem; background-color: rgba(74, 157, 95, 0.3); color: inherit; border: 1px solid var(--color-primary); border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
            >
              View
            </button>
            <button
              onclick="window.CommunityUI.deleteCommunity('${community.id}')"
              style="padding: 0.25rem 0.75rem; background-color: rgba(239,83,80,0.2); color: var(--color-error); border: 1px solid rgba(239,83,80,0.5); border-radius: 4px; cursor: pointer; font-size: 0.875rem;"
            >
              Delete
            </button>
          </div>
        </div>

        ${community.description ? `
          <p style="margin: 0.5rem 0; opacity: 0.9;">${escapeHtml(community.description)}</p>
        ` : ''}

        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
          <span style="padding: 0.25rem 0.75rem; background-color: rgba(74, 157, 95, 0.2); border-radius: 12px; font-size: 0.875rem;">
            ${membershipBadge}
          </span>
          <span style="padding: 0.25rem 0.75rem; background-color: rgba(124, 179, 66, 0.2); border-radius: 12px; font-size: 0.875rem;">
            ${governanceBadge}
          </span>
          ${community.location.description ? `
            <span style="padding: 0.25rem 0.75rem; background-color: rgba(255, 167, 38, 0.2); border-radius: 12px; font-size: 0.875rem;">
              📍 ${escapeHtml(community.location.description)}
            </span>
          ` : ''}
        </div>

        ${community.philosophy.coreValues.length > 0 ? `
          <div style="margin-top: 1rem;">
            <strong style="font-size: 0.875rem; opacity: 0.8;">Values:</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem;">
              ${community.philosophy.coreValues.map(value =>
                `<span style="padding: 0.125rem 0.5rem; background-color: rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.75rem;">${escapeHtml(value)}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}

        <div style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.6;">
          Created ${new Date(community.createdAt).toLocaleDateString()}
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Initialize community UI
   */
  async function init() {
    // Initialize community manager
    if (window.SolarpunkDB && window.SolarpunkDB.isReady()) {
      window.SolarpunkCommunities.init(window.SolarpunkDB);
    }
  }

  /**
   * Render communities page
   */
  async function renderCommunitiesPage() {
    const communities = await window.SolarpunkDB.listCommunityGroups();

    return `
      <div class="communities-page">
        <h2 style="margin-bottom: 1rem;">Communities</h2>

        ${renderCommunityCreationForm()}

        <div style="margin-top: 2rem;">
          <h3 style="margin-bottom: 1rem;">Your Communities</h3>
          ${renderCommunityList(communities)}
        </div>
      </div>
    `;
  }

  /**
   * Handle community creation form submission
   */
  async function handleCreateCommunity(event) {
    event.preventDefault();

    const formData = {
      name: document.getElementById('community-name').value,
      description: document.getElementById('community-description').value,
      locationType: document.getElementById('location-type').value,
      locationDescription: document.getElementById('location-description').value,
      membershipModel: document.getElementById('membership-model').value,
      governanceStructure: document.getElementById('governance-structure').value,
      governanceDescription: document.getElementById('governance-description').value,
      coreValues: document.getElementById('core-values').value
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0),
      visibility: document.getElementById('visibility').value
    };

    try {
      const manager = window.SolarpunkCommunities.manager;
      await manager.create(formData);

      // Clear form
      document.getElementById('create-community-form').reset();

      // Show success message
      alert('Community created successfully!');

      // Reload communities list
      if (window.app && window.app.renderCommunitiesSection) {
        await window.app.renderCommunitiesSection();
      }
    } catch (error) {
      console.error('[CommunityUI] Failed to create community:', error);
      alert('Failed to create community: ' + error.message);
    }
  }

  /**
   * View community details
   */
  async function viewCommunity(id) {
    const community = window.SolarpunkDB.getCommunityGroup(id);
    if (!community) {
      alert('Community not found');
      return;
    }

    const details = `
Name: ${community.name}

Description: ${community.description || 'No description'}

Location: ${community.location.description || 'Not specified'} (${community.location.type})

Membership: ${community.membership.model}
Governance: ${community.governance.structure}
${community.governance.customDescription ? '\nGovernance Details: ' + community.governance.customDescription : ''}

Core Values: ${community.philosophy.coreValues.join(', ') || 'None specified'}

Created: ${new Date(community.createdAt).toLocaleString()}
Status: ${community.status}
Visibility: ${community.visibility}
    `;

    alert(details);
  }

  /**
   * Delete community
   */
  async function deleteCommunity(id) {
    if (!confirm('Are you sure you want to delete this community? This action cannot be undone.')) {
      return;
    }

    try {
      await window.SolarpunkDB.deleteCommunityGroup(id);
      alert('Community deleted');

      // Reload communities list
      if (window.app && window.app.renderCommunitiesSection) {
        await window.app.renderCommunitiesSection();
      }
    } catch (error) {
      console.error('[CommunityUI] Failed to delete community:', error);
      alert('Failed to delete community: ' + error.message);
    }
  }

  // Export to global namespace
  window.CommunityUI = {
    init,
    renderCommunitiesPage,
    handleCreateCommunity,
    viewCommunity,
    deleteCommunity
  };

  console.log('[CommunityUI] Community UI module loaded');

})(window);
