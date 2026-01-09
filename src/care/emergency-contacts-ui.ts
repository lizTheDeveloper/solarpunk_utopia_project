/**
 * Emergency Contact Circles UI
 * REQ-CARE-002: Emergency Alert System
 *
 * User interface for emergency contacts and alert system
 */

import {
  triggerEmergencyAlert,
  respondToEmergencyAlert,
  getMyEmergencyAlerts,
  getEmergencyAlert,
  resolveEmergencyAlert,
  cancelEmergencyAlert,
  setupEmergencyContacts,
  addEmergencyContact,
  removeEmergencyContact,
  getEmergencyContacts,
  hasEmergencyContacts,
} from './emergency-contacts';
import { db } from '../core/database';
import { sanitizeUserContent, requireValidIdentifier } from '../utils/sanitize';
import type { EmergencyAlert } from '../types';

/**
 * Safely get identifier from data attribute
 * Returns the ID if valid, undefined if not
 */
function getSafeIdentifier(id: string | undefined): string | undefined {
  if (!id) return undefined;
  try {
    return requireValidIdentifier(id);
  } catch {
    return undefined;
  }
}

/**
 * Render emergency alert button (panic button)
 */
export function renderEmergencyAlertButton(userId: string): string {
  const hasContacts = hasEmergencyContacts(userId);

  if (!hasContacts) {
    return `
      <div class="emergency-alert-setup">
        <h4>🚨 Emergency Alert</h4>
        <p class="alert-description">
          Set up emergency contacts to enable quick alerts to your care circle
          in case of urgent need or emergency.
        </p>
        <button id="setup-emergency-contacts" class="btn-primary">
          Set up emergency contacts
        </button>
      </div>
    `;
  }

  return `
    <div class="emergency-alert-trigger">
      <h4>🚨 Emergency Alert</h4>
      <p class="alert-description">
        Press this button if you need immediate help. Your emergency contacts will be notified right away.
      </p>
      <button id="trigger-emergency-alert" class="btn-emergency btn-large">
        🚨 ALERT EMERGENCY CONTACTS
      </button>
      <button id="trigger-urgent-alert" class="btn-urgent">
        ⚠️ Send urgent help request
      </button>
    </div>
  `;
}

/**
 * Render emergency contacts management
 */
export function renderEmergencyContactsManagement(userId: string): string {
  const contactIds = getEmergencyContacts(userId);
  const hasContacts = contactIds.length > 0;

  const contactsList = hasContacts ? `
    <div class="emergency-contacts-list">
      <h5>Your Emergency Contacts (${contactIds.length})</h5>
      <ul class="contacts-list">
        ${contactIds.map(contactId => {
          const user = db.getUserProfile(contactId);
          const displayName = user?.displayName || 'Unknown User';
          return `
            <li class="contact-item">
              <span class="contact-name">${sanitizeUserContent(displayName)}</span>
              <button class="btn-remove-contact" data-contact-id="${contactId}">
                Remove
              </button>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  ` : `
    <p class="no-contacts">No emergency contacts set up yet.</p>
  `;

  return `
    <div class="emergency-contacts-management">
      <h4>Emergency Contacts</h4>
      <p class="contacts-description">
        These people will be immediately notified if you trigger an emergency alert.
        Choose trusted community members who can respond quickly.
      </p>

      ${contactsList}

      <div class="add-contact-section">
        <h5>Add Emergency Contact</h5>
        <div class="add-contact-form">
          <input
            type="text"
            id="new-contact-id"
            placeholder="Enter user ID"
            class="input-field"
          />
          <button id="add-emergency-contact" class="btn-secondary">
            Add Contact
          </button>
        </div>
      </div>

      ${hasContacts ? `
        <div class="contacts-actions">
          <button id="view-emergency-history" class="btn-secondary">
            View Alert History
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render active emergency alerts for care circle member
 */
export function renderEmergencyAlerts(memberId: string): string {
  const alerts = getMyEmergencyAlerts(memberId);

  if (alerts.length === 0) {
    return '';
  }

  return `
    <div class="emergency-alerts-section">
      <h3>🚨 Active Emergency Alerts</h3>
      <p class="alerts-description">
        Members of your care circles need immediate help.
      </p>

      <div class="emergency-alerts-list">
        ${alerts.map(alert => renderEmergencyAlertCard(alert)).join('')}
      </div>
    </div>
  `;
}

/**
 * Render a single emergency alert card
 */
function renderEmergencyAlertCard(alert: EmergencyAlert): string {
  const user = db.getUserProfile(alert.userId);
  const userName = user?.displayName || 'Community member';
  const timeAgo = getTimeAgo(alert.triggeredAt);

  const severityClass = alert.severity === 'emergency' ? 'alert-emergency' : 'alert-urgent';
  const severityLabel = alert.severity === 'emergency' ? '🚨 EMERGENCY' : '⚠️ URGENT';

  const locationInfo = alert.location ? `
    <div class="alert-location">
      <strong>Location:</strong>
      <a href="https://www.openstreetmap.org/?mlat=${alert.location.latitude}&mlon=${alert.location.longitude}&zoom=16"
         target="_blank"
         rel="noopener noreferrer">
        View on map (${alert.location.latitude.toFixed(5)}, ${alert.location.longitude.toFixed(5)})
      </a>
    </div>
  ` : '';

  const responses = alert.responses || [];
  const responsesInfo = responses.length > 0 ? `
    <div class="alert-responses">
      <strong>Responses (${responses.length}):</strong>
      <ul class="responses-list">
        ${responses.map(response => {
          const responder = db.getUserProfile(response.responderId);
          const responderName = responder?.displayName || 'Someone';
          const responseTime = getTimeAgo(response.timestamp);
          const statusEmoji = {
            'on-way': '🏃',
            'contacted': '📞',
            'arrived': '✓',
            'resolved': '✅'
          }[response.status];

          return `
            <li class="response-item">
              ${statusEmoji} <strong>${sanitizeUserContent(responderName)}</strong>
              ${response.status === 'on-way' ? 'is on the way' :
                response.status === 'contacted' ? 'made contact' :
                response.status === 'arrived' ? 'has arrived' : 'resolved the situation'}
              ${response.eta ? ` (ETA: ${response.eta} min)` : ''}
              <span class="response-time">${responseTime}</span>
              ${response.message ? `<p class="response-message">"${sanitizeUserContent(response.message)}"</p>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  ` : '';

  return `
    <div class="emergency-alert-card ${severityClass}">
      <div class="alert-header">
        <span class="alert-severity">${severityLabel}</span>
        <span class="alert-time">${timeAgo}</span>
      </div>

      <div class="alert-body">
        <p class="alert-user">
          <strong>${sanitizeUserContent(userName)}</strong> needs immediate help
        </p>

        ${alert.message ? `
          <p class="alert-message">"${sanitizeUserContent(alert.message)}"</p>
        ` : ''}

        ${locationInfo}

        ${alert.contactEmergencyServices ? `
          <p class="alert-emergency-services">
            ⚕️ <strong>Emergency services requested</strong>
          </p>
        ` : ''}

        ${responsesInfo}
      </div>

      <div class="alert-actions">
        <button class="btn-respond-onway" data-alert-id="${alert.id}">
          🏃 I'm on my way
        </button>
        <button class="btn-respond-contacted" data-alert-id="${alert.id}">
          📞 I've made contact
        </button>
        <button class="btn-respond-arrived" data-alert-id="${alert.id}">
          ✓ I've arrived
        </button>
      </div>
    </div>
  `;
}

/**
 * Initialize emergency alert UI handlers
 */
export function initEmergencyAlertHandlers(userId: string) {
  // Setup emergency contacts button
  document.getElementById('setup-emergency-contacts')?.addEventListener('click', async () => {
    const contactInput = prompt('Enter emergency contact user IDs (comma-separated):');
    if (!contactInput) return;

    const contactIds = contactInput.split(',').map(id => id.trim()).filter(id => id);

    if (contactIds.length === 0) {
      alert('Please enter at least one contact ID');
      return;
    }

    try {
      await setupEmergencyContacts(userId, contactIds);
      alert('Emergency contacts set up successfully!');
      renderEmergencyCareView(userId);
    } catch (error) {
      console.error('Failed to setup emergency contacts:', error);
      alert('Failed to setup emergency contacts. Please try again.');
    }
  });

  // Trigger emergency alert button
  document.getElementById('trigger-emergency-alert')?.addEventListener('click', async () => {
    const confirmed = confirm(
      '🚨 EMERGENCY ALERT\n\n' +
      'This will immediately notify all your emergency contacts.\n\n' +
      'Are you sure you need emergency help?'
    );

    if (!confirmed) return;

    const message = prompt('Optional: Describe the emergency (or press Cancel to skip)');

    try {
      // Try to get location if available
      let location: { latitude: number; longitude: number } | undefined;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (geoError) {
          console.warn('Could not get location:', geoError);
        }
      }

      await triggerEmergencyAlert(userId, {
        message: message || undefined,
        location,
        severity: 'emergency',
        contactEmergencyServices: false,
      });

      alert(
        '🚨 Emergency alert sent!\n\n' +
        'Your emergency contacts have been notified.\n' +
        'Help is on the way.'
      );

      renderEmergencyCareView(userId);
    } catch (error) {
      console.error('Failed to trigger emergency alert:', error);
      alert('Failed to send emergency alert. Please try again or call emergency services directly.');
    }
  });

  // Trigger urgent alert button
  document.getElementById('trigger-urgent-alert')?.addEventListener('click', async () => {
    const message = prompt('Describe what you need help with:');
    if (!message) return;

    try {
      await triggerEmergencyAlert(userId, {
        message,
        severity: 'urgent',
      });

      alert('Urgent help request sent to your emergency contacts!');
      renderEmergencyCareView(userId);
    } catch (error) {
      console.error('Failed to send urgent alert:', error);
      alert('Failed to send urgent alert. Please try again.');
    }
  });

  // Add emergency contact button
  document.getElementById('add-emergency-contact')?.addEventListener('click', async () => {
    const input = document.getElementById('new-contact-id') as HTMLInputElement;
    const contactId = input?.value.trim();

    if (!contactId) {
      alert('Please enter a user ID');
      return;
    }

    try {
      await addEmergencyContact(userId, contactId);
      alert('Emergency contact added successfully!');
      input.value = '';
      renderEmergencyCareView(userId);
    } catch (error) {
      console.error('Failed to add emergency contact:', error);
      alert(error instanceof Error ? error.message : 'Failed to add emergency contact');
    }
  });

  // Remove emergency contact buttons
  document.querySelectorAll('.btn-remove-contact').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const contactId = getSafeIdentifier((e.target as HTMLElement).dataset.contactId);
      if (!contactId) return;

      const user = db.getUserProfile(contactId);
      const displayName = user?.displayName || 'this person';

      const confirmed = confirm(`Remove ${displayName} from your emergency contacts?`);
      if (!confirmed) return;

      try {
        await removeEmergencyContact(userId, contactId);
        alert('Emergency contact removed');
        renderEmergencyCareView(userId);
      } catch (error) {
        console.error('Failed to remove emergency contact:', error);
        alert(error instanceof Error ? error.message : 'Failed to remove emergency contact');
      }
    });
  });

  // Response buttons for emergency alerts
  document.querySelectorAll('.btn-respond-onway').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const alertId = getSafeIdentifier((e.target as HTMLElement).dataset.alertId);
      if (!alertId) return;

      const eta = prompt('How many minutes until you arrive? (optional)');
      const etaNumber = eta ? parseInt(eta, 10) : undefined;

      try {
        await respondToEmergencyAlert(alertId, userId, {
          status: 'on-way',
          eta: etaNumber,
          message: 'I am on my way to help',
        });
        alert('Response sent! Stay safe.');
        renderEmergencyCareView(userId);
      } catch (error) {
        console.error('Failed to respond to alert:', error);
        alert(error instanceof Error ? error.message : 'Failed to respond to alert');
      }
    });
  });

  document.querySelectorAll('.btn-respond-contacted').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const alertId = getSafeIdentifier((e.target as HTMLElement).dataset.alertId);
      if (!alertId) return;

      const message = prompt('Optional: Add a note about the contact');

      try {
        await respondToEmergencyAlert(alertId, userId, {
          status: 'contacted',
          message: message || 'I have made contact',
        });
        alert('Response recorded. Thank you for reaching out!');
        renderEmergencyCareView(userId);
      } catch (error) {
        console.error('Failed to respond to alert:', error);
        alert(error instanceof Error ? error.message : 'Failed to respond to alert');
      }
    });
  });

  document.querySelectorAll('.btn-respond-arrived').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const alertId = getSafeIdentifier((e.target as HTMLElement).dataset.alertId);
      if (!alertId) return;

      try {
        await respondToEmergencyAlert(alertId, userId, {
          status: 'arrived',
          message: 'I have arrived and am providing help',
        });
        alert('Alert will be marked as handled. Thank you for helping!');
        renderEmergencyCareView(userId);
      } catch (error) {
        console.error('Failed to respond to alert:', error);
        alert(error instanceof Error ? error.message : 'Failed to respond to alert');
      }
    });
  });
}

/**
 * Render the entire emergency care view
 */
function renderEmergencyCareView(userId: string) {
  const container = document.getElementById('emergency-care-view');
  if (!container) return;

  const alertsHtml = renderEmergencyAlerts(userId);

  container.innerHTML = `
    ${alertsHtml ? `${alertsHtml}<hr style="margin: 2rem 0; border: 1px solid var(--warning-red);">` : ''}
    ${renderEmergencyAlertButton(userId)}
    <hr style="margin: 2rem 0; border: 1px solid var(--secondary-green);">
    ${renderEmergencyContactsManagement(userId)}
  `;

  initEmergencyAlertHandlers(userId);
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

export { renderEmergencyCareView };
