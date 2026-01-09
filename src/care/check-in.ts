/**
 * Community Care Check-In System
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 * REQ-CARE-016: Community Wellbeing Check-Ins
 *
 * Simple "I'm okay" / "Need support" buttons that enable community care
 * without surveillance or obligation.
 */

import { db } from '../core/database';
import type { CheckIn, CheckInStatus, MissedCheckInAlert } from '../types';
import { clearAlertsForUser, getMyMissedCheckInAlerts, acknowledgeMissedCheckInAlert, getCareCircle } from './missed-check-in-alerts';
import { sanitizeUserContent, validateIdentifier } from '../utils/sanitize';

/**
 * Submit a check-in
 */
export async function submitCheckIn(
  userId: string,
  status: CheckInStatus,
  message?: string
): Promise<CheckIn> {
  const checkIn = await db.addCheckIn({
    userId,
    status,
    message,
    acknowledged: status === 'okay', // Auto-acknowledge "okay" status
    acknowledgedBy: status === 'okay' ? [] : undefined,
  });

  // Clear any missed check-in alerts for this user
  await clearAlertsForUser(userId);

  return checkIn;
}

/**
 * Acknowledge a support request
 */
export async function acknowledgeCheckIn(
  checkInId: string,
  acknowledgedBy: string
): Promise<void> {
  const checkIn = db.getCheckIn(checkInId);
  if (!checkIn) return;

  const acknowledgers = checkIn.acknowledgedBy || [];
  if (!acknowledgers.includes(acknowledgedBy)) {
    acknowledgers.push(acknowledgedBy);
  }

  await db.updateCheckIn(checkInId, {
    acknowledged: true,
    acknowledgedBy: acknowledgers,
    acknowledgedAt: Date.now(),
  });
}

/**
 * Get check-ins needing response from community
 */
export function getCheckInsNeedingResponse(): CheckIn[] {
  return db.getCheckInsNeedingSupport();
}

/**
 * Get recent community check-ins for awareness
 */
export function getRecentCheckIns(hours: number = 24): CheckIn[] {
  return db.getRecentCheckIns(hours);
}

/**
 * Get user's latest check-in status
 */
export function getUserLatestStatus(userId: string): CheckIn | undefined {
  return db.getLatestCheckIn(userId);
}

/**
 * Render check-in buttons
 */
export function renderCheckInButtons(userId: string): string {
  const latestCheckIn = getUserLatestStatus(userId);
  const checkInToday = latestCheckIn &&
    (Date.now() - latestCheckIn.createdAt) < (24 * 60 * 60 * 1000);

  let statusMessage = '';
  if (checkInToday) {
    const timeAgo = getTimeAgo(latestCheckIn.createdAt);
    const statusEmoji = {
      'okay': '✓',
      'need-support': '⚠️',
      'emergency': '🚨'
    }[latestCheckIn.status];

    statusMessage = `
      <div class="check-in-status">
        <p>Your last check-in (${timeAgo}): ${statusEmoji} ${latestCheckIn.status}</p>
        ${latestCheckIn.message ? `<p class="check-in-message">"${sanitizeUserContent(latestCheckIn.message)}"</p>` : ''}
      </div>
    `;
  }

  return `
    <div class="check-in-container">
      <h3>Daily Check-In</h3>
      <p class="check-in-description">
        Let your community know how you're doing today.
        No pressure, no obligation—just care.
      </p>

      ${statusMessage}

      <div class="check-in-buttons">
        <button id="check-in-okay" class="btn-check-in btn-okay">
          <span class="emoji">✓</span>
          <span class="label">I'm Okay</span>
        </button>

        <button id="check-in-support" class="btn-check-in btn-support">
          <span class="emoji">🤝</span>
          <span class="label">Need Support</span>
        </button>

        <button id="check-in-emergency" class="btn-check-in btn-emergency">
          <span class="emoji">🚨</span>
          <span class="label">Emergency</span>
        </button>
      </div>

      <div id="check-in-message-container" class="check-in-message-container" style="display: none;">
        <label for="check-in-message">Optional message:</label>
        <textarea id="check-in-message" rows="3" placeholder="Want to share more? (optional)"></textarea>
        <div class="check-in-message-actions">
          <button id="check-in-submit" class="btn-primary">Submit</button>
          <button id="check-in-cancel" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render community check-ins feed
 */
export function renderCheckInsFeed(): string {
  const checkInsNeedingSupport = getCheckInsNeedingResponse();
  const recentCheckIns = getRecentCheckIns(24);

  const supportSection = checkInsNeedingSupport.length > 0 ? `
    <div class="support-needed-section">
      <h4>🤝 Community Members Needing Support</h4>
      ${checkInsNeedingSupport.map(checkIn => {
        const timeAgo = getTimeAgo(checkIn.createdAt);
        const isEmergency = checkIn.status === 'emergency';

        return `
          <div class="check-in-card ${isEmergency ? 'emergency' : 'support'}">
            <div class="check-in-header">
              <span class="emoji">${isEmergency ? '🚨' : '⚠️'}</span>
              <span class="status">${isEmergency ? 'EMERGENCY' : 'Needs Support'}</span>
              <span class="time">${timeAgo}</span>
            </div>
            ${checkIn.message ? `<p class="message">"${sanitizeUserContent(checkIn.message)}"</p>` : ''}
            <button class="btn-respond" data-check-in-id="${validateIdentifier(checkIn.id)}">
              I can help
            </button>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const okayCount = recentCheckIns.filter(c => c.status === 'okay').length;
  const recentActivity = `
    <div class="community-wellbeing">
      <h4>🌻 Community Wellbeing (Last 24 Hours)</h4>
      <p>${okayCount} community members checked in as okay</p>
      ${checkInsNeedingSupport.length > 0 ?
        `<p>${checkInsNeedingSupport.length} members need support</p>` :
        `<p>Everyone who checked in is doing well ✓</p>`
      }
    </div>
  `;

  return `
    <div class="check-ins-feed">
      ${supportSection}
      ${recentActivity}
    </div>
  `;
}

/**
 * Initialize check-in UI event handlers
 */
export function initCheckInHandlers(userId: string) {
  let selectedStatus: CheckInStatus | null = null;

  // Button click handlers
  document.getElementById('check-in-okay')?.addEventListener('click', () => {
    selectedStatus = 'okay';
    // "I'm okay" doesn't need a message, submit immediately
    submitCheckInForm(userId, selectedStatus);
  });

  document.getElementById('check-in-support')?.addEventListener('click', () => {
    selectedStatus = 'need-support';
    showMessageInput();
  });

  document.getElementById('check-in-emergency')?.addEventListener('click', () => {
    selectedStatus = 'emergency';
    showMessageInput();
  });

  // Message form handlers
  document.getElementById('check-in-submit')?.addEventListener('click', () => {
    if (selectedStatus) {
      submitCheckInForm(userId, selectedStatus);
    }
  });

  document.getElementById('check-in-cancel')?.addEventListener('click', () => {
    hideMessageInput();
    selectedStatus = null;
  });

  // Response handlers for support requests
  document.querySelectorAll('.btn-respond').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const checkInId = validateIdentifier((e.target as HTMLElement).dataset.checkInId);
      if (checkInId) {
        acknowledgeCheckIn(checkInId, userId).then(() => {
          alert('Thank you for reaching out to help!');
          // Refresh the view
          renderCheckInView();
        });
      }
    });
  });
}

/**
 * Show message input form
 */
function showMessageInput() {
  const container = document.getElementById('check-in-message-container');
  if (container) {
    container.style.display = 'block';
  }
}

/**
 * Hide message input form
 */
function hideMessageInput() {
  const container = document.getElementById('check-in-message-container');
  const messageInput = document.getElementById('check-in-message') as HTMLTextAreaElement;

  if (container) {
    container.style.display = 'none';
  }
  if (messageInput) {
    messageInput.value = '';
  }
}

/**
 * Submit check-in form
 */
async function submitCheckInForm(userId: string, status: CheckInStatus) {
  const messageInput = document.getElementById('check-in-message') as HTMLTextAreaElement;
  const message = messageInput?.value.trim() || undefined;

  try {
    await submitCheckIn(userId, status, message);

    // Show success feedback
    const feedback = status === 'okay'
      ? 'Thank you for checking in!'
      : 'Your message has been shared with the community. Help is on the way.';

    alert(feedback);

    // Reset form
    hideMessageInput();
    if (messageInput) {
      messageInput.value = '';
    }

    // Refresh the view
    renderCheckInView();
  } catch (error) {
    console.error('Failed to submit check-in:', error);
    alert('Failed to submit check-in. Please try again.');
  }
}

/**
 * Render the entire check-in view
 */
function renderCheckInView() {
  const container = document.getElementById('care-view');
  if (!container) return;

  const userId = 'user-1'; // TODO: Get from auth

  // Render missed check-in alerts at the top if any exist
  const alertsHtml = renderMissedCheckInAlerts(userId);

  container.innerHTML = `
    ${alertsHtml ? `${alertsHtml}<hr style="margin: 2rem 0; border: 1px solid var(--secondary-green);">` : ''}
    ${renderCheckInButtons(userId)}
    <hr style="margin: 2rem 0; border: 1px solid var(--secondary-green);">
    ${renderCareCircleStatus(userId)}
    <hr style="margin: 2rem 0; border: 1px solid var(--secondary-green);">
    ${renderCheckInsFeed()}
  `;

  initCheckInHandlers(userId);
  initMissedCheckInAlertHandlers(userId);
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

/**
 * Render missed check-in alerts for care circle members
 */
export function renderMissedCheckInAlerts(userId: string): string {
  const alerts = getMyMissedCheckInAlerts(userId);

  if (alerts.length === 0) {
    return '';
  }

  return `
    <div class="missed-check-in-alerts">
      <h3>⚠️ Missed Check-In Alerts</h3>
      <p class="alert-description">
        Members of your care circles have missed their check-ins.
      </p>

      <div class="alerts-list">
        ${alerts.map(alert => renderMissedCheckInAlert(alert)).join('')}
      </div>
    </div>
  `;
}

/**
 * Render a single missed check-in alert
 */
function renderMissedCheckInAlert(alert: MissedCheckInAlert): string {
  const careCircle = db.getCareCircle(alert.careCircleId);
  const user = db.getUserProfile(alert.userId);
  const userName = user?.displayName || 'Community member';

  const urgencyClass = alert.escalated ? 'alert-escalated' : 'alert-warning';
  const urgencyLabel = alert.escalated ? '🚨 ESCALATED' : '⚠️ Needs Check';

  const lastCheckInText = alert.lastCheckInAt
    ? `Last check-in: ${getTimeAgo(alert.lastCheckInAt)}`
    : 'No check-ins recorded';

  const consecutiveText = alert.consecutiveMissed > 1
    ? `(${alert.consecutiveMissed} consecutive missed check-ins)`
    : '';

  return `
    <div class="missed-check-in-alert ${urgencyClass}">
      <div class="alert-header">
        <span class="alert-status">${urgencyLabel}</span>
        <span class="alert-time">${getTimeAgo(alert.alertSentAt)}</span>
      </div>

      <div class="alert-body">
        <p class="alert-user">
          <strong>${sanitizeUserContent(userName)}</strong> has missed their check-in
          ${consecutiveText}
        </p>
        <p class="alert-last-checkin">${lastCheckInText}</p>

        ${alert.escalated ? `
          <p class="alert-escalation-notice">
            <strong>Multiple check-ins missed.</strong> Please check on this community member as soon as possible.
          </p>
        ` : ''}
      </div>

      <div class="alert-actions">
        <button class="btn-alert-respond" data-alert-id="${validateIdentifier(alert.id)}">
          I'm checking on them
        </button>
        <button class="btn-alert-contacted" data-alert-id="${validateIdentifier(alert.id)}">
          I've made contact
        </button>
      </div>
    </div>
  `;
}

/**
 * Initialize alert event handlers
 */
export function initMissedCheckInAlertHandlers(userId: string) {
  // "I'm checking on them" buttons
  document.querySelectorAll('.btn-alert-respond').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const alertId = validateIdentifier((e.target as HTMLElement).dataset.alertId);
      if (alertId) {
        try {
          await acknowledgeMissedCheckInAlert(alertId, userId);
          alert('Thank you for checking on them! Stay safe.');
          renderCheckInView();
        } catch (error) {
          console.error('Failed to acknowledge alert:', error);
          alert('Failed to acknowledge alert. Please try again.');
        }
      }
    });
  });

  // "I've made contact" buttons
  document.querySelectorAll('.btn-alert-contacted').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const alertId = validateIdentifier((e.target as HTMLElement).dataset.alertId);
      if (alertId) {
        try {
          await acknowledgeMissedCheckInAlert(alertId, userId);
          alert('Thank you for reaching out! The alert has been cleared.');
          renderCheckInView();
        } catch (error) {
          console.error('Failed to acknowledge alert:', error);
          alert('Failed to acknowledge alert. Please try again.');
        }
      }
    });
  });
}

/**
 * Render care circle status for the current user
 */
export function renderCareCircleStatus(userId: string): string {
  const careCircle = getCareCircle(userId);

  if (!careCircle) {
    return `
      <div class="care-circle-status">
        <h4>Care Circle</h4>
        <p class="care-circle-none">
          You don't have a care circle set up yet.
          Care circles enable check-in monitoring for your wellbeing.
        </p>
        <button id="setup-care-circle" class="btn-secondary">
          Set up care circle
        </button>
      </div>
    `;
  }

  const memberCount = careCircle.members.length;
  const frequencyText = {
    'daily': 'Daily',
    'twice-daily': 'Twice daily',
    'weekly': 'Weekly',
  }[careCircle.checkInFrequency];

  const statusEmoji = careCircle.checkInEnabled ? '✓' : '○';
  const statusText = careCircle.checkInEnabled ? 'Active' : 'Paused';

  return `
    <div class="care-circle-status">
      <h4>Your Care Circle</h4>
      <div class="care-circle-info">
        <p>
          <strong>Status:</strong> ${statusEmoji} ${statusText}<br>
          <strong>Members:</strong> ${memberCount} people in your care circle<br>
          <strong>Check-in frequency:</strong> ${frequencyText}
        </p>
        ${careCircle.checkInEnabled ? `
          <p class="care-circle-enabled">
            Your care circle will be notified if you miss a check-in.
          </p>
        ` : `
          <p class="care-circle-disabled">
            Check-in monitoring is currently paused.
          </p>
        `}
      </div>
      <div class="care-circle-actions">
        ${careCircle.checkInEnabled
          ? '<button id="pause-monitoring" class="btn-secondary">Pause monitoring</button>'
          : '<button id="resume-monitoring" class="btn-primary">Resume monitoring</button>'
        }
        <button id="manage-care-circle" class="btn-secondary">Manage care circle</button>
      </div>
    </div>
  `;
}

export { renderCheckInView };
