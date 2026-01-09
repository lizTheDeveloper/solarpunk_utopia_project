/**
 * Care Circles UI Module
 *
 * User interface for creating and managing care circles
 *
 * This provides the visual interface for care circle formation,
 * member management, need tracking, and activity coordination.
 */

import {
  createCareCircle,
  addCareCircleMember,
  removeCareCircleMember,
  addCareNeed,
  updateCareNeed,
  logCareActivity,
  getCareCircle,
  getCareCirclesForRecipient,
  getCareCirclesForMember,
  getCareActivities,
  getUnmetNeeds,
  suggestCareDistribution,
  deactivateCareCircle,
  CareCircle,
  CareNeed,
  CareActivity,
  CareCircleMember,
} from './care-circles';

/**
 * Render the care circles main view
 */
export async function renderCareCirclesView(userId: string): Promise<void> {
  const container = document.getElementById('care-circles-container');
  if (!container) {
    console.error('Care circles container not found');
    return;
  }

  // Get all circles where user is recipient or member
  const recipientCircles = await getCareCirclesForRecipient(userId);
  const memberCircles = await getCareCirclesForMember(userId);

  container.innerHTML = `
    <div class="care-circles-view">
      <div class="care-circles-header">
        <h1>🤝 Care Circles</h1>
        <p class="care-circles-subtitle">
          Coordinating mutual support and community care
        </p>
      </div>

      ${recipientCircles.length === 0 && memberCircles.length === 0 ? `
        <div class="care-circles-empty">
          <div class="empty-state">
            <div class="empty-icon">🌻</div>
            <h2>No Care Circles Yet</h2>
            <p>Care circles help coordinate ongoing support for community members.</p>
            <button class="btn-primary" onclick="window.careCircles.showCreateForm('${userId}')">
              Create a Care Circle
            </button>
          </div>
        </div>
      ` : ''}

      ${recipientCircles.length > 0 ? `
        <div class="care-circles-section">
          <h2>Your Care Circles</h2>
          <p class="section-description">
            Care circles supporting you
          </p>
          <div class="care-circles-list">
            ${recipientCircles.map(circle => renderCareCircleCard(circle, 'recipient')).join('')}
          </div>
        </div>
      ` : ''}

      ${memberCircles.length > 0 ? `
        <div class="care-circles-section">
          <h2>Circles You Support</h2>
          <p class="section-description">
            People you're helping through care circles
          </p>
          <div class="care-circles-list">
            ${memberCircles.map(circle => renderCareCircleCard(circle, 'member')).join('')}
          </div>
        </div>
      ` : ''}

      ${recipientCircles.length > 0 || memberCircles.length > 0 ? `
        <div class="care-circles-actions">
          <button class="btn-secondary" onclick="window.careCircles.showCreateForm('${userId}')">
            + Create Another Care Circle
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render a care circle card
 */
function renderCareCircleCard(circle: CareCircle, role: 'recipient' | 'member'): string {
  const unmetNeeds = circle.needs.filter(n => !n.isMet);
  const activeMemberCount = circle.members.filter(m => m.active).length;

  return `
    <div class="care-circle-card" data-circle-id="${circle.id}">
      <div class="care-circle-card-header">
        <h3>${circle.name || 'Care Circle'}</h3>
        <span class="care-circle-role-badge ${role}">
          ${role === 'recipient' ? '✨ Receiving Care' : '🤝 Providing Care'}
        </span>
      </div>

      ${circle.description ? `
        <p class="care-circle-description">${escapeHtml(circle.description)}</p>
      ` : ''}

      <div class="care-circle-stats">
        <div class="stat">
          <span class="stat-value">${activeMemberCount}</span>
          <span class="stat-label">Members</span>
        </div>
        <div class="stat">
          <span class="stat-value">${circle.needs.length}</span>
          <span class="stat-label">Needs</span>
        </div>
        <div class="stat">
          <span class="stat-value">${unmetNeeds.length}</span>
          <span class="stat-label">Unmet</span>
        </div>
      </div>

      <div class="care-circle-actions">
        <button
          class="btn-primary"
          onclick="window.careCircles.showCircleDetails('${circle.id}')"
        >
          View Details
        </button>
      </div>
    </div>
  `;
}

/**
 * Show care circle details
 */
export async function showCircleDetails(circleId: string): Promise<void> {
  const circle = await getCareCircle(circleId);
  if (!circle) {
    alert('Care circle not found');
    return;
  }

  const activities = await getCareActivities(circleId, 20);
  const unmetNeeds = await getUnmetNeeds(circleId);

  const modal = document.createElement('div');
  modal.className = 'care-circle-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal-content care-circle-details">
      <div class="modal-header">
        <h2>${circle.name || 'Care Circle'}</h2>
        <button class="modal-close" onclick="this.closest('.care-circle-modal').remove()">✕</button>
      </div>

      <div class="modal-body">
        <div class="care-circle-section">
          <h3>👥 Members (${circle.members.filter(m => m.active).length})</h3>
          <div class="care-members-list">
            ${circle.members
              .filter(m => m.active)
              .map(member => `
                <div class="care-member">
                  <div class="member-info">
                    <span class="member-id">User ${member.userId.substring(0, 8)}</span>
                    ${member.role ? `<span class="member-role">${escapeHtml(member.role)}</span>` : ''}
                  </div>
                  ${member.skills && member.skills.length > 0 ? `
                    <div class="member-skills">
                      ${member.skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
          </div>
          <button
            class="btn-secondary"
            onclick="window.careCircles.showAddMemberForm('${circle.id}')"
          >
            + Add Member
          </button>
        </div>

        <div class="care-circle-section">
          <h3>📋 Needs</h3>
          ${circle.needs.length === 0 ? `
            <p class="empty-message">No needs defined yet</p>
          ` : `
            <div class="care-needs-list">
              ${circle.needs.map(need => renderNeedItem(need, circle.id)).join('')}
            </div>
          `}
          <button
            class="btn-secondary"
            onclick="window.careCircles.showAddNeedForm('${circle.id}')"
          >
            + Add Need
          </button>
        </div>

        ${activities.length > 0 ? `
          <div class="care-circle-section">
            <h3>📅 Recent Activity</h3>
            <div class="care-activities-list">
              ${activities.slice(0, 10).map(renderActivityItem).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.care-circle-modal').remove()">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * Render a need item
 */
function renderNeedItem(need: CareNeed, circleId: string): string {
  return `
    <div class="care-need-item ${need.isMet ? 'met' : 'unmet'}">
      <div class="need-header">
        <span class="need-type">${escapeHtml(need.type)}</span>
        <span class="need-status ${need.isMet ? 'met' : 'unmet'}">
          ${need.isMet ? '✓ Met' : '○ Unmet'}
        </span>
      </div>
      ${need.description ? `
        <p class="need-description">${escapeHtml(need.description)}</p>
      ` : ''}
      ${need.frequency ? `
        <span class="need-frequency">${need.frequency}</span>
      ` : ''}
      ${need.assignedTo && need.assignedTo.length > 0 ? `
        <div class="need-assigned">
          Assigned to: ${need.assignedTo.map(id => `User ${id.substring(0, 8)}`).join(', ')}
        </div>
      ` : ''}
      ${!need.isMet ? `
        <button
          class="btn-small"
          onclick="window.careCircles.markNeedMet('${circleId}', '${need.id}')"
        >
          Mark as Met
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Render an activity item
 */
function renderActivityItem(activity: CareActivity): string {
  const timeAgo = getTimeAgo(activity.createdAt);
  return `
    <div class="care-activity-item">
      <div class="activity-icon">${getActivityIcon(activity.activityType)}</div>
      <div class="activity-details">
        <div class="activity-type">${activity.activityType.replace('-', ' ')}</div>
        ${activity.description ? `
          <div class="activity-description">${escapeHtml(activity.description)}</div>
        ` : ''}
        <div class="activity-time">${timeAgo}</div>
      </div>
    </div>
  `;
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    'check-in': '✓',
    'visit': '👋',
    'assistance': '🤝',
    'message': '💬',
    'schedule-change': '📅',
  };
  return icons[type] || '·';
}

/**
 * Show create care circle form
 */
export function showCreateForm(recipientId: string): void {
  const modal = document.createElement('div');
  modal.className = 'care-circle-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create Care Circle</h2>
        <button class="modal-close" onclick="this.closest('.care-circle-modal').remove()">✕</button>
      </div>

      <form id="create-care-circle-form" class="care-form">
        <div class="form-group">
          <label for="circle-name">Circle Name (optional)</label>
          <input
            type="text"
            id="circle-name"
            name="name"
            placeholder="e.g., Support for Maria"
          />
        </div>

        <div class="form-group">
          <label for="circle-description">Description (optional)</label>
          <textarea
            id="circle-description"
            name="description"
            rows="3"
            placeholder="What kind of support is needed?"
          ></textarea>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" name="autoScheduling" checked />
            Enable automatic scheduling suggestions
          </label>
        </div>

        <div class="form-group">
          <label for="privacy-level">Privacy</label>
          <select id="privacy-level" name="privacyLevel">
            <option value="private">Private (only members can see)</option>
            <option value="community-visible">Community Visible</option>
          </select>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="this.closest('.care-circle-modal').remove()">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Create Circle
          </button>
        </div>
      </form>
    </div>
  `;

  const form = modal.querySelector('#create-care-circle-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    try {
      const circle = await createCareCircle(recipientId, {
        name: formData.get('name') as string || undefined,
        description: formData.get('description') as string || undefined,
        autoScheduling: formData.get('autoScheduling') === 'on',
        privacyLevel: formData.get('privacyLevel') as 'private' | 'community-visible',
      });

      modal.remove();
      alert('Care circle created successfully!');
      await renderCareCirclesView(recipientId);
    } catch (error) {
      console.error('Error creating care circle:', error);
      alert('Failed to create care circle. Please try again.');
    }
  });

  document.body.appendChild(modal);
}

/**
 * Show add member form
 */
export function showAddMemberForm(circleId: string): void {
  const modal = document.createElement('div');
  modal.className = 'care-circle-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Member to Care Circle</h2>
        <button class="modal-close" onclick="this.closest('.care-circle-modal').remove()">✕</button>
      </div>

      <form id="add-member-form" class="care-form">
        <div class="form-group">
          <label for="member-id">Member User ID</label>
          <input
            type="text"
            id="member-id"
            name="userId"
            required
            placeholder="user-12345..."
          />
        </div>

        <div class="form-group">
          <label for="member-role">Role (optional)</label>
          <input
            type="text"
            id="member-role"
            name="role"
            placeholder="e.g., Daily check-in, Grocery helper"
          />
        </div>

        <div class="form-group">
          <label for="member-skills">Skills (comma-separated, optional)</label>
          <input
            type="text"
            id="member-skills"
            name="skills"
            placeholder="e.g., cooking, transportation, emotional support"
          />
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="this.closest('.care-circle-modal').remove()">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Add Member
          </button>
        </div>
      </form>
    </div>
  `;

  const form = modal.querySelector('#add-member-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    try {
      const skillsStr = formData.get('skills') as string;
      const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;

      await addCareCircleMember(circleId, formData.get('userId') as string, {
        role: formData.get('role') as string || undefined,
        skills,
      });

      modal.remove();
      alert('Member added successfully!');
      await showCircleDetails(circleId);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member. ' + (error as Error).message);
    }
  });

  document.body.appendChild(modal);
}

/**
 * Show add need form
 */
export function showAddNeedForm(circleId: string): void {
  const modal = document.createElement('div');
  modal.className = 'care-circle-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Care Need</h2>
        <button class="modal-close" onclick="this.closest('.care-circle-modal').remove()">✕</button>
      </div>

      <form id="add-need-form" class="care-form">
        <div class="form-group">
          <label for="need-type">Type of Need</label>
          <input
            type="text"
            id="need-type"
            name="type"
            required
            placeholder="e.g., daily check-in, groceries, transportation"
          />
        </div>

        <div class="form-group">
          <label for="need-description">Description (optional)</label>
          <textarea
            id="need-description"
            name="description"
            rows="3"
            placeholder="Additional details about this need"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="need-frequency">Frequency</label>
          <select id="need-frequency" name="frequency">
            <option value="">Select frequency...</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="as-needed">As Needed</option>
          </select>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="this.closest('.care-circle-modal').remove()">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Add Need
          </button>
        </div>
      </form>
    </div>
  `;

  const form = modal.querySelector('#add-need-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    try {
      await addCareNeed(circleId, {
        type: formData.get('type') as string,
        description: formData.get('description') as string || undefined,
        frequency: (formData.get('frequency') as any) || undefined,
        isMet: false,
      });

      modal.remove();
      alert('Need added successfully!');
      await showCircleDetails(circleId);
    } catch (error) {
      console.error('Error adding need:', error);
      alert('Failed to add need. Please try again.');
    }
  });

  document.body.appendChild(modal);
}

/**
 * Mark a need as met
 */
export async function markNeedMet(circleId: string, needId: string): Promise<void> {
  try {
    await updateCareNeed(circleId, needId, { isMet: true });
    await showCircleDetails(circleId);
  } catch (error) {
    console.error('Error updating need:', error);
    alert('Failed to update need. Please try again.');
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

// Export functions to window for onclick handlers
(window as any).careCircles = {
  showCreateForm,
  showAddMemberForm,
  showAddNeedForm,
  showCircleDetails,
  markNeedMet,
  renderCareCirclesView,
};
