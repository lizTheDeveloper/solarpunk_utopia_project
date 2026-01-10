/**
 * Care Circle Formation
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 *
 * Scenario: Care circle coordination
 * - Coordinate a group of community members providing support
 * - Schedule check-ins, visits, and assistance
 * - Distribute care responsibilities equitably
 * - Enable care circle communication and coordination
 * - Track needs and how they're being met
 * - Respect recipient's autonomy and preferences
 */

import { db } from '../core/database';
import type { CareCircle, UserProfile } from '../types';
import { setupCareCircle, getCareCircle, disableCheckInMonitoring, enableCheckInMonitoring } from './missed-check-in-alerts';
import { sanitizeUserContent, validateIdentifier } from '../utils/sanitize';
import { v4 as uuidv4 } from 'uuid';

/**
 * Types of care responsibilities that can be scheduled
 */
export type ResponsibilityType =
  | 'visit'
  | 'check-in-call'
  | 'groceries'
  | 'meal-prep'
  | 'medication-reminder'
  | 'transportation'
  | 'housework'
  | 'companionship'
  | 'medical-appointment'
  | 'other';

/**
 * Care responsibility - a scheduled task within a care circle
 */
export interface CareResponsibility {
  id: string;
  careCircleId: string;
  type: ResponsibilityType;
  description: string;
  assignedTo?: string; // User ID of assigned member
  frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  scheduledFor?: number; // Unix timestamp for one-time tasks
  dayOfWeek?: number; // 0-6 for recurring weekly tasks
  timeOfDay?: number; // Minutes from midnight
  completed: boolean;
  completedAt?: number;
  completedBy?: string;
  notes?: string;
  createdAt: number;
}

/**
 * Care need - tracks what the care recipient needs
 */
export interface CareNeed {
  id: string;
  careCircleId: string;
  type: ResponsibilityType;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unmet' | 'in-progress' | 'met' | 'no-longer-needed';
  requestedAt: number;
  fulfilledAt?: number;
  fulfilledBy?: string[];
  notes?: string;
}

/**
 * Search for community members to add to care circle
 */
export function searchCommunityMembers(query: string): UserProfile[] {
  const allUsers = db.listUsers();
  const lowerQuery = query.toLowerCase();

  return allUsers.filter(user =>
    user.displayName.toLowerCase().includes(lowerQuery) ||
    user.bio?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get user profile by ID
 */
export function getUserProfile(userId: string): UserProfile | undefined {
  return db.getUserProfile(userId);
}

/**
 * Create a new care circle
 */
export async function createCareCircle(
  userId: string,
  memberIds: string[],
  options: {
    checkInEnabled?: boolean;
    preferredCheckInTime?: number;
    checkInFrequency?: 'daily' | 'twice-daily' | 'weekly';
    missedCheckInThreshold?: number;
    escalationThreshold?: number;
  } = {}
): Promise<CareCircle> {
  // Validate that members exist
  for (const memberId of memberIds) {
    const member = db.getUserProfile(memberId);
    if (!member) {
      throw new Error(`User ${memberId} not found`);
    }
  }

  // Create care circle using the existing setup function
  return await setupCareCircle(userId, memberIds, options);
}

/**
 * Add a member to an existing care circle
 */
export async function addCareCircleMember(
  userId: string,
  newMemberId: string
): Promise<void> {
  const careCircle = getCareCircle(userId);

  if (!careCircle) {
    throw new Error('No care circle found. Please create a care circle first.');
  }

  const member = db.getUserProfile(newMemberId);
  if (!member) {
    throw new Error(`User ${newMemberId} not found`);
  }

  if (careCircle.members.includes(newMemberId)) {
    throw new Error('This person is already in your care circle');
  }

  const updatedMembers = [...careCircle.members, newMemberId];
  await db.updateCareCircle(careCircle.id, {
    members: updatedMembers,
  });
}

/**
 * Remove a member from care circle
 */
export async function removeCareCircleMember(
  userId: string,
  memberId: string
): Promise<void> {
  const careCircle = getCareCircle(userId);

  if (!careCircle) {
    throw new Error('No care circle found');
  }

  if (!careCircle.members.includes(memberId)) {
    throw new Error('This person is not in your care circle');
  }

  const updatedMembers = careCircle.members.filter(id => id !== memberId);

  if (updatedMembers.length === 0) {
    throw new Error('Cannot remove last member. Care circle must have at least one member.');
  }

  await db.updateCareCircle(careCircle.id, {
    members: updatedMembers,
  });
}

/**
 * Update care circle settings
 */
export async function updateCareCircleSettings(
  userId: string,
  settings: {
    checkInFrequency?: 'daily' | 'twice-daily' | 'weekly';
    preferredCheckInTime?: number;
    missedCheckInThreshold?: number;
    escalationThreshold?: number;
  }
): Promise<void> {
  const careCircle = getCareCircle(userId);

  if (!careCircle) {
    throw new Error('No care circle found');
  }

  await db.updateCareCircle(careCircle.id, settings);
}

/**
 * Toggle check-in monitoring on/off
 */
export async function toggleCheckInMonitoring(userId: string): Promise<boolean> {
  const careCircle = getCareCircle(userId);

  if (!careCircle) {
    throw new Error('No care circle found');
  }

  if (careCircle.checkInEnabled) {
    await disableCheckInMonitoring(userId);
    return false;
  } else {
    await enableCheckInMonitoring(userId);
    return true;
  }
}

/**
 * Delete a care circle
 */
export async function deleteCareCircle(userId: string): Promise<void> {
  const careCircle = getCareCircle(userId);

  if (!careCircle) {
    throw new Error('No care circle found');
  }

  await db.deleteCareCircle(careCircle.id);
}

/**
 * Get care circles where user is a member (providing care to others)
 */
export function getCareCirclesAsMember(memberId: string): CareCircle[] {
  return db.listCareCircles().filter(circle =>
    circle.members.includes(memberId)
  );
}

/**
 * Render care circle formation UI
 */
export function renderCareCircleFormation(userId: string): string {
  const existingCircle = getCareCircle(userId);

  if (existingCircle) {
    return renderManageCareCircle(userId, existingCircle);
  }

  return renderCreateCareCircle(userId);
}

/**
 * Render create care circle form
 */
function renderCreateCareCircle(userId: string): string {
  return `
    <div class="care-circle-formation">
      <h3>🤝 Create Your Care Circle</h3>

      <div class="care-circle-description">
        <p>
          A care circle is a group of trusted community members who will:
        </p>
        <ul>
          <li>Receive check-in alerts if you miss your daily check-ins</li>
          <li>Coordinate support when you need help</li>
          <li>Provide visits, assistance, and companionship</li>
          <li>Respond to emergency alerts</li>
        </ul>
        <p class="care-circle-privacy">
          <strong>You're in control:</strong> You choose who's in your circle,
          when to enable monitoring, and can pause or change it anytime.
        </p>
      </div>

      <form id="create-care-circle-form">
        <div class="form-section">
          <h4>Select Care Circle Members</h4>
          <p class="form-help">Choose trusted community members who can check on you.</p>

          <div class="member-search">
            <input
              type="text"
              id="member-search-input"
              placeholder="Search community members..."
              autocomplete="off"
            />
            <div id="member-search-results" class="search-results"></div>
          </div>

          <div id="selected-members" class="selected-members">
            <p class="no-members-selected">No members selected yet</p>
          </div>
        </div>

        <div class="form-section">
          <h4>Check-In Settings</h4>

          <div class="form-field">
            <label>
              <input type="checkbox" id="enable-checkins" checked />
              Enable check-in monitoring
            </label>
            <p class="form-help">Your care circle will be alerted if you miss check-ins</p>
          </div>

          <div class="form-field" id="checkin-settings">
            <label for="checkin-frequency">Check-in frequency:</label>
            <select id="checkin-frequency">
              <option value="daily" selected>Daily</option>
              <option value="twice-daily">Twice daily</option>
              <option value="weekly">Weekly</option>
            </select>

            <label for="preferred-time">Preferred check-in time (optional):</label>
            <input
              type="time"
              id="preferred-time"
              placeholder="e.g., 09:00"
            />
            <p class="form-help">When you usually check in (helps with alert timing)</p>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" id="create-circle-btn" class="btn-primary" disabled>
            Create Care Circle
          </button>
          <button type="button" id="cancel-create-btn" class="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Render manage care circle UI
 */
function renderManageCareCircle(userId: string, careCircle: CareCircle): string {
  const members = careCircle.members
    .map(memberId => db.getUserProfile(memberId))
    .filter(m => m !== undefined) as UserProfile[];

  const frequencyText = {
    'daily': 'Daily',
    'twice-daily': 'Twice daily',
    'weekly': 'Weekly',
  }[careCircle.checkInFrequency];

  const preferredTimeText = careCircle.preferredCheckInTime !== undefined
    ? formatTime(careCircle.preferredCheckInTime)
    : 'Not set';

  return `
    <div class="care-circle-management">
      <h3>🤝 Manage Your Care Circle</h3>

      <div class="care-circle-status">
        <div class="status-badge ${careCircle.checkInEnabled ? 'active' : 'paused'}">
          ${careCircle.checkInEnabled ? '✓ Active' : '○ Paused'}
        </div>
        <p>
          <strong>${members.length}</strong> ${members.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      <div class="care-circle-settings-summary">
        <h4>Settings</h4>
        <ul>
          <li><strong>Check-in frequency:</strong> ${frequencyText}</li>
          <li><strong>Preferred time:</strong> ${preferredTimeText}</li>
          <li><strong>Alert threshold:</strong> ${careCircle.missedCheckInThreshold} hours</li>
          <li><strong>Escalation:</strong> After ${careCircle.escalationThreshold} missed check-ins</li>
        </ul>
        <button id="edit-settings-btn" class="btn-secondary">Edit Settings</button>
      </div>

      <div class="care-circle-members">
        <h4>Care Circle Members</h4>
        <div class="members-list">
          ${members.map(member => `
            <div class="member-card" data-user-id="${validateIdentifier(member.id)}">
              <div class="member-info">
                <strong>${sanitizeUserContent(member.displayName)}</strong>
                ${member.bio ? `<p class="member-bio">${sanitizeUserContent(member.bio)}</p>` : ''}
              </div>
              <button
                class="btn-remove-member"
                data-member-id="${validateIdentifier(member.id)}"
                ${members.length === 1 ? 'disabled title="Cannot remove last member"' : ''}
              >
                Remove
              </button>
            </div>
          `).join('')}
        </div>
        <button id="add-member-btn" class="btn-secondary">Add Member</button>
      </div>

      <div class="care-circle-actions">
        <button
          id="toggle-monitoring-btn"
          class="btn-secondary"
        >
          ${careCircle.checkInEnabled ? 'Pause Monitoring' : 'Resume Monitoring'}
        </button>
        <button id="delete-circle-btn" class="btn-danger">Delete Care Circle</button>
      </div>
    </div>
  `;
}

/**
 * Initialize care circle formation event handlers
 */
export function initCareCircleFormationHandlers(userId: string) {
  const existingCircle = getCareCircle(userId);

  if (existingCircle) {
    initManagementHandlers(userId, existingCircle);
  } else {
    initCreationHandlers(userId);
  }
}

/**
 * Initialize creation form handlers
 */
function initCreationHandlers(userId: string) {
  const selectedMemberIds = new Set<string>();
  const form = document.getElementById('create-care-circle-form') as HTMLFormElement;
  const searchInput = document.getElementById('member-search-input') as HTMLInputElement;
  const searchResults = document.getElementById('member-search-results') as HTMLElement;
  const selectedMembersDiv = document.getElementById('selected-members') as HTMLElement;
  const createBtn = document.getElementById('create-circle-btn') as HTMLButtonElement;
  const enableCheckinsCheckbox = document.getElementById('enable-checkins') as HTMLInputElement;
  const checkinSettings = document.getElementById('checkin-settings') as HTMLElement;

  // Member search
  let searchTimeout: NodeJS.Timeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = (e.target as HTMLInputElement).value.trim();

    if (query.length < 2) {
      searchResults.innerHTML = '';
      return;
    }

    searchTimeout = setTimeout(() => {
      const results = searchCommunityMembers(query)
        .filter(user => user.id !== userId) // Don't include self
        .filter(user => !selectedMemberIds.has(user.id)) // Don't show already selected
        .slice(0, 10); // Limit results

      if (results.length === 0) {
        searchResults.innerHTML = '<p class="no-results">No members found</p>';
        return;
      }

      searchResults.innerHTML = results.map(user => `
        <div class="search-result" data-user-id="${validateIdentifier(user.id)}">
          <div class="user-info">
            <strong>${sanitizeUserContent(user.displayName)}</strong>
            ${user.bio ? `<p class="user-bio">${sanitizeUserContent(user.bio)}</p>` : ''}
          </div>
          <button class="btn-add-member" data-user-id="${validateIdentifier(user.id)}">Add</button>
        </div>
      `).join('');

      // Add click handlers to add buttons
      searchResults.querySelectorAll('.btn-add-member').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const memberId = validateIdentifier((e.target as HTMLElement).dataset.userId);
          if (memberId) {
            addMemberToSelection(memberId);
          }
        });
      });
    }, 300);
  });

  // Add member to selection
  function addMemberToSelection(memberId: string) {
    selectedMemberIds.add(memberId);
    searchInput.value = '';
    searchResults.innerHTML = '';
    updateSelectedMembersDisplay();
    updateCreateButtonState();
  }

  // Remove member from selection
  function removeMemberFromSelection(memberId: string) {
    selectedMemberIds.delete(memberId);
    updateSelectedMembersDisplay();
    updateCreateButtonState();
  }

  // Update selected members display
  function updateSelectedMembersDisplay() {
    if (selectedMemberIds.size === 0) {
      selectedMembersDiv.innerHTML = '<p class="no-members-selected">No members selected yet</p>';
      return;
    }

    const members = Array.from(selectedMemberIds)
      .map(id => db.getUserProfile(id))
      .filter(m => m !== undefined) as UserProfile[];

    selectedMembersDiv.innerHTML = members.map(member => `
      <div class="selected-member">
        <span>${sanitizeUserContent(member.displayName)}</span>
        <button class="btn-remove" data-member-id="${validateIdentifier(member.id)}">×</button>
      </div>
    `).join('');

    // Add remove handlers
    selectedMembersDiv.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const memberId = validateIdentifier((e.target as HTMLElement).dataset.memberId);
        if (memberId) {
          removeMemberFromSelection(memberId);
        }
      });
    });
  }

  // Update create button state
  function updateCreateButtonState() {
    createBtn.disabled = selectedMemberIds.size === 0;
  }

  // Toggle check-in settings visibility
  enableCheckinsCheckbox?.addEventListener('change', (e) => {
    const enabled = (e.target as HTMLInputElement).checked;
    if (checkinSettings) {
      checkinSettings.style.display = enabled ? 'block' : 'none';
    }
  });

  // Form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const memberIds = Array.from(selectedMemberIds);
    const checkInEnabled = enableCheckinsCheckbox.checked;
    const checkInFrequency = (document.getElementById('checkin-frequency') as HTMLSelectElement).value as 'daily' | 'twice-daily' | 'weekly';
    const preferredTimeInput = (document.getElementById('preferred-time') as HTMLInputElement).value;

    let preferredCheckInTime: number | undefined;
    if (preferredTimeInput) {
      const [hours, minutes] = preferredTimeInput.split(':').map(Number);
      preferredCheckInTime = hours * 60 + minutes;
    }

    try {
      await createCareCircle(userId, memberIds, {
        checkInEnabled,
        checkInFrequency,
        preferredCheckInTime,
      });

      alert('Care circle created successfully!');

      // Reload the view
      renderCareCircleView(userId);
    } catch (error) {
      console.error('Failed to create care circle:', error);
      alert(`Failed to create care circle: ${(error as Error).message}`);
    }
  });

  // Cancel button
  document.getElementById('cancel-create-btn')?.addEventListener('click', () => {
    // Navigate back or close modal
    renderCareCircleView(userId);
  });
}

/**
 * Initialize management handlers
 */
function initManagementHandlers(userId: string, careCircle: CareCircle) {
  // Toggle monitoring
  document.getElementById('toggle-monitoring-btn')?.addEventListener('click', async () => {
    try {
      const newState = await toggleCheckInMonitoring(userId);
      alert(newState ? 'Check-in monitoring enabled' : 'Check-in monitoring paused');
      renderCareCircleView(userId);
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
      alert('Failed to toggle monitoring. Please try again.');
    }
  });

  // Remove member
  document.querySelectorAll('.btn-remove-member').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const memberId = validateIdentifier((e.target as HTMLElement).dataset.memberId);
      if (!memberId) return;

      const member = db.getUserProfile(memberId);
      const confirmRemove = confirm(
        `Remove ${member?.displayName || 'this member'} from your care circle?`
      );

      if (confirmRemove) {
        try {
          await removeCareCircleMember(userId, memberId);
          alert('Member removed from care circle');
          renderCareCircleView(userId);
        } catch (error) {
          console.error('Failed to remove member:', error);
          alert(`Failed to remove member: ${(error as Error).message}`);
        }
      }
    });
  });

  // Add member
  document.getElementById('add-member-btn')?.addEventListener('click', () => {
    renderAddMemberModal(userId);
  });

  // Edit settings
  document.getElementById('edit-settings-btn')?.addEventListener('click', () => {
    renderEditSettingsModal(userId, careCircle);
  });

  // Delete circle
  document.getElementById('delete-circle-btn')?.addEventListener('click', async () => {
    const confirmDelete = confirm(
      'Are you sure you want to delete your care circle? This cannot be undone.'
    );

    if (confirmDelete) {
      try {
        await deleteCareCircle(userId);
        alert('Care circle deleted');
        renderCareCircleView(userId);
      } catch (error) {
        console.error('Failed to delete care circle:', error);
        alert('Failed to delete care circle. Please try again.');
      }
    }
  });
}

/**
 * Render add member modal (simplified version)
 */
function renderAddMemberModal(userId: string) {
  // For now, just show a simple prompt
  // In a real implementation, this would be a proper modal with search
  const memberId = prompt('Enter member ID to add:');
  if (memberId) {
    addCareCircleMember(userId, memberId.trim())
      .then(() => {
        alert('Member added to care circle');
        renderCareCircleView(userId);
      })
      .catch(error => {
        alert(`Failed to add member: ${error.message}`);
      });
  }
}

/**
 * Render edit settings modal (simplified version)
 */
function renderEditSettingsModal(userId: string, careCircle: CareCircle) {
  // For now, just show simple prompts
  // In a real implementation, this would be a proper modal with form
  const frequency = prompt(
    'Check-in frequency (daily, twice-daily, or weekly):',
    careCircle.checkInFrequency
  );

  if (frequency && ['daily', 'twice-daily', 'weekly'].includes(frequency)) {
    updateCareCircleSettings(userId, {
      checkInFrequency: frequency as 'daily' | 'twice-daily' | 'weekly',
    })
      .then(() => {
        alert('Settings updated');
        renderCareCircleView(userId);
      })
      .catch(error => {
        alert(`Failed to update settings: ${error.message}`);
      });
  }
}

/**
 * Render the care circle view
 */
function renderCareCircleView(userId: string) {
  const container = document.getElementById('care-circle-view');
  if (!container) return;

  container.innerHTML = renderCareCircleFormation(userId);
  initCareCircleFormationHandlers(userId);
}

/**
 * Format time in minutes from midnight to HH:MM
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export { renderCareCircleView };

// ========== Responsibility and Need Management ==========

/**
 * Add a care responsibility to the circle
 */
export async function addCareResponsibility(
  careCircleId: string,
  responsibility: {
    type: ResponsibilityType;
    description: string;
    assignedTo?: string;
    frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
    scheduledFor?: number;
    dayOfWeek?: number;
    timeOfDay?: number;
  }
): Promise<CareResponsibility> {
  const circle = db.getCareCircle(careCircleId);
  if (!circle) {
    throw new Error('Care circle not found');
  }

  // Validate assigned member
  if (responsibility.assignedTo && !circle.members.includes(responsibility.assignedTo)) {
    throw new Error('Cannot assign responsibility to non-member');
  }

  const respData: CareResponsibility = {
    id: `resp-${uuidv4()}`,
    careCircleId,
    type: responsibility.type,
    description: responsibility.description,
    assignedTo: responsibility.assignedTo,
    frequency: responsibility.frequency,
    scheduledFor: responsibility.scheduledFor,
    dayOfWeek: responsibility.dayOfWeek,
    timeOfDay: responsibility.timeOfDay,
    completed: false,
    createdAt: Date.now(),
  };

  await db.update((doc) => {
    if (!doc.careResponsibilities) {
      doc.careResponsibilities = {};
    }
    doc.careResponsibilities[respData.id] = respData;
  });

  // Log the event
  await db.recordEvent({
    action: 'care-responsibility-added',
    providerId: responsibility.assignedTo || 'system',
    receiverId: circle.userId,
    resourceId: careCircleId,
    note: `Care responsibility added: ${responsibility.type}`,
  });

  return respData;
}

/**
 * Complete a care responsibility
 */
export async function completeCareResponsibility(
  responsibilityId: string,
  completedBy: string,
  notes?: string
): Promise<void> {
  await db.update((doc) => {
    const resp = doc.careResponsibilities?.[responsibilityId];
    if (!resp) {
      throw new Error('Care responsibility not found');
    }

    resp.completed = true;
    resp.completedAt = Date.now();
    resp.completedBy = completedBy;
    if (notes) {
      resp.notes = notes;
    }
  });

  // Log the event
  await db.recordEvent({
    action: 'care-responsibility-completed',
    providerId: completedBy,
    receiverId: 'system',
    resourceId: responsibilityId,
    note: notes || 'Care responsibility completed',
  });
}

/**
 * Add a care need to the circle
 */
export async function addCareNeed(
  careCircleId: string,
  need: {
    type: ResponsibilityType;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }
): Promise<CareNeed> {
  const circle = db.getCareCircle(careCircleId);
  if (!circle) {
    throw new Error('Care circle not found');
  }

  const needData: CareNeed = {
    id: `need-${uuidv4()}`,
    careCircleId,
    type: need.type,
    description: need.description,
    priority: need.priority ?? 'medium',
    status: 'unmet',
    requestedAt: Date.now(),
  };

  await db.update((doc) => {
    if (!doc.careNeeds) {
      doc.careNeeds = {};
    }
    doc.careNeeds[needData.id] = needData;
  });

  // Log the event
  await db.recordEvent({
    action: 'care-need-added',
    providerId: circle.userId,
    receiverId: 'system',
    resourceId: careCircleId,
    note: `Care need added: ${need.type} (${need.priority})`,
  });

  return needData;
}

/**
 * Update a care need status
 */
export async function updateCareNeedStatus(
  needId: string,
  status: 'unmet' | 'in-progress' | 'met' | 'no-longer-needed',
  fulfilledBy?: string[],
  notes?: string
): Promise<void> {
  await db.update((doc) => {
    const need = doc.careNeeds?.[needId];
    if (!need) {
      throw new Error('Care need not found');
    }

    need.status = status;
    if (status === 'met') {
      need.fulfilledAt = Date.now();
    }
    if (fulfilledBy) {
      need.fulfilledBy = fulfilledBy;
    }
    if (notes) {
      need.notes = notes;
    }
  });
}

/**
 * Get all responsibilities for a care circle
 */
export function getCareResponsibilities(careCircleId: string): CareResponsibility[] {
  const state = db.getState();
  return Object.values(state.careResponsibilities || {})
    .filter((r: any) => r.careCircleId === careCircleId) as CareResponsibility[];
}

/**
 * Get pending (incomplete) responsibilities for a care circle
 */
export function getPendingResponsibilities(careCircleId: string): CareResponsibility[] {
  return getCareResponsibilities(careCircleId).filter(r => !r.completed);
}

/**
 * Get responsibilities assigned to a specific member
 */
export function getMemberResponsibilities(
  careCircleId: string,
  memberId: string
): CareResponsibility[] {
  return getCareResponsibilities(careCircleId)
    .filter(r => r.assignedTo === memberId && !r.completed);
}

/**
 * Get all care needs for a care circle
 */
export function getCareNeeds(careCircleId: string): CareNeed[] {
  const state = db.getState();
  return Object.values(state.careNeeds || {})
    .filter((n: any) => n.careCircleId === careCircleId) as CareNeed[];
}

/**
 * Get unmet needs for a care circle
 */
export function getUnmetNeeds(careCircleId: string): CareNeed[] {
  return getCareNeeds(careCircleId).filter(n => n.status === 'unmet');
}

/**
 * Suggest equitable distribution of responsibilities
 * Analyzes member workload and suggests assignments for unassigned tasks
 */
export function suggestResponsibilityDistribution(
  careCircleId: string
): Array<{ responsibilityId: string; suggestedMemberId: string; reason: string }> {
  const circle = db.getCareCircle(careCircleId);
  if (!circle) {
    return [];
  }

  const responsibilities = getCareResponsibilities(careCircleId);
  const unassigned = responsibilities.filter(r => !r.assignedTo && !r.completed);

  if (unassigned.length === 0) {
    return [];
  }

  // Calculate current workload per member
  const workload = new Map<string, number>();
  circle.members.forEach(id => workload.set(id, 0));

  responsibilities.forEach(r => {
    if (r.assignedTo && !r.completed) {
      workload.set(r.assignedTo, (workload.get(r.assignedTo) || 0) + 1);
    }
  });

  // Suggest assignments based on least busy members
  const suggestions: Array<{ responsibilityId: string; suggestedMemberId: string; reason: string }> = [];

  unassigned.forEach(resp => {
    // Find the least busy member
    const leastBusy = Array.from(workload.entries())
      .sort((a, b) => a[1] - b[1])[0];

    if (leastBusy) {
      suggestions.push({
        responsibilityId: resp.id,
        suggestedMemberId: leastBusy[0],
        reason: `Least busy member (${leastBusy[1]} current responsibilities)`,
      });

      // Update workload for next iteration
      workload.set(leastBusy[0], leastBusy[1] + 1);
    }
  });

  return suggestions;
}

/**
 * Assign a responsibility to a member
 */
export async function assignResponsibility(
  responsibilityId: string,
  memberId: string
): Promise<void> {
  await db.update((doc) => {
    const resp = doc.careResponsibilities?.[responsibilityId];
    if (!resp) {
      throw new Error('Care responsibility not found');
    }

    const circle = db.getCareCircle(resp.careCircleId);
    if (!circle || !circle.members.includes(memberId)) {
      throw new Error('Member not found in care circle');
    }

    resp.assignedTo = memberId;
  });

  // Log the event
  await db.recordEvent({
    action: 'care-responsibility-assigned',
    providerId: memberId,
    receiverId: 'system',
    resourceId: responsibilityId,
    note: 'Responsibility assigned to member',
  });
}

/**
 * Get care circle statistics - useful for monitoring equity and health
 */
export function getCareCircleStats(careCircleId: string): {
  totalMembers: number;
  totalResponsibilities: number;
  completedResponsibilities: number;
  pendingResponsibilities: number;
  unmetNeeds: number;
  memberWorkload: Array<{ userId: string; assignedCount: number; completedCount: number }>;
} {
  const circle = db.getCareCircle(careCircleId);
  if (!circle) {
    throw new Error('Care circle not found');
  }

  const responsibilities = getCareResponsibilities(careCircleId);
  const needs = getCareNeeds(careCircleId);

  const memberWorkload = circle.members.map(userId => ({
    userId,
    assignedCount: responsibilities.filter(r => r.assignedTo === userId && !r.completed).length,
    completedCount: responsibilities.filter(r => r.completedBy === userId).length,
  }));

  return {
    totalMembers: circle.members.length,
    totalResponsibilities: responsibilities.length,
    completedResponsibilities: responsibilities.filter(r => r.completed).length,
    pendingResponsibilities: responsibilities.filter(r => !r.completed).length,
    unmetNeeds: needs.filter(n => n.status === 'unmet').length,
    memberWorkload,
  };
}
