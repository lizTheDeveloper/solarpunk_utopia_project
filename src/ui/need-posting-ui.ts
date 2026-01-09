/**
 * Need Posting UI - Simple, accessible interface for posting community needs
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * Following solarpunk values:
 * - Accessibility-first design
 * - Works offline
 * - No surveillance or tracking
 * - Simple, joyful interface
 */

import { NeedPosting } from '../resources/need-posting';
import { LocalDatabase } from '../core/database';
import type { UrgencyLevel, ResourceType } from '../types';

/**
 * Simple UI for posting needs
 *
 * This creates a minimal, accessible form that works well on old phones
 * and in low-bandwidth/offline situations.
 */
export class NeedPostingUI {
  private needPosting: NeedPosting;
  private currentUserId: string;

  constructor(db: LocalDatabase, userId: string) {
    this.needPosting = new NeedPosting(db);
    this.currentUserId = userId;
  }

  /**
   * Render the need posting form
   *
   * Creates a simple, accessible HTML form for posting needs
   *
   * @param containerId - ID of the container element to render into
   */
  render(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container element '${containerId}' not found`);
      return;
    }

    container.innerHTML = `
      <div class="need-posting-form" role="form" aria-label="Post a community need">
        <h2>Share Your Need</h2>
        <p class="description">
          Let the community know what you need. This is a safe space to ask for help.
          There's no shame in having needs - we all do. 🌻
        </p>

        <form id="post-need-form">
          <div class="form-group">
            <label for="need-description">
              What do you need?
              <span class="required" aria-label="required">*</span>
            </label>
            <textarea
              id="need-description"
              name="description"
              rows="4"
              required
              aria-required="true"
              placeholder="Describe what you need... (e.g., 'Looking for a bicycle', 'Need help moving furniture', 'Could use some warm clothes')"
              maxlength="500"
            ></textarea>
            <small class="help-text">Be specific but brief (max 500 characters)</small>
          </div>

          <div class="form-group">
            <label for="need-urgency">How urgent is this?</label>
            <select id="need-urgency" name="urgency" aria-label="Select urgency level">
              <option value="casual">No rush - just putting it out there</option>
              <option value="helpful" selected>Would be helpful if available</option>
              <option value="needed">Needed soon</option>
              <option value="urgent">Urgent - needed ASAP</option>
            </select>
            <small class="help-text">Most needs are "helpful" - that's okay!</small>
          </div>

          <div class="form-group">
            <label for="need-type">What type of resource? (optional)</label>
            <select id="need-type" name="resourceType" aria-label="Select resource type">
              <option value="">Not sure / Other</option>
              <option value="tool">Tool</option>
              <option value="equipment">Equipment</option>
              <option value="space">Space</option>
              <option value="food">Food</option>
              <option value="skill">Skill / Knowledge</option>
              <option value="time">Time / Help</option>
              <option value="other">Other</option>
            </select>
            <small class="help-text">This helps others find your need</small>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" aria-label="Post your need">
              Post Need
            </button>
            <button type="button" class="btn btn-secondary" id="cancel-btn" aria-label="Cancel">
              Cancel
            </button>
          </div>

          <div id="form-status" role="status" aria-live="polite" aria-atomic="true"></div>
        </form>
      </div>
    `;

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to form elements
   */
  private attachEventListeners(): void {
    const form = document.getElementById('post-need-form') as HTMLFormElement;
    const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    // Character count for description
    const description = document.getElementById('need-description') as HTMLTextAreaElement;
    if (description) {
      description.addEventListener('input', () => this.updateCharacterCount());
    }
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const description = formData.get('description') as string;
    const urgency = (formData.get('urgency') as UrgencyLevel) || 'casual';
    const resourceType = formData.get('resourceType') as ResourceType | '';

    // Show loading state
    this.showStatus('Posting your need...', 'info');
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';
    }

    try {
      // Post the need
      const need = await this.needPosting.postNeed(
        {
          description,
          urgency,
          resourceType: resourceType || undefined,
        },
        {
          userId: this.currentUserId,
        }
      );

      // Show success message
      this.showStatus('✓ Your need has been posted to the community!', 'success');

      // Reset form
      form.reset();

      // Trigger custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('needPosted', { detail: need }));

      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Need';
      }

      // Optional: Navigate away or clear form after delay
      setTimeout(() => {
        this.clearStatus();
      }, 3000);

    } catch (error) {
      console.error('Error posting need:', error);
      this.showStatus('Error posting need. Please try again.', 'error');

      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Need';
      }
    }
  }

  /**
   * Handle cancel button
   */
  private handleCancel(): void {
    // Clear the form
    const form = document.getElementById('post-need-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }

    // Trigger custom event
    window.dispatchEvent(new CustomEvent('needPostingCancelled'));
  }

  /**
   * Update character count display
   */
  private updateCharacterCount(): void {
    const description = document.getElementById('need-description') as HTMLTextAreaElement;
    const helpText = description?.parentElement?.querySelector('.help-text');

    if (description && helpText) {
      const remaining = 500 - description.value.length;
      helpText.textContent = `${remaining} characters remaining`;

      if (remaining < 50) {
        helpText.classList.add('warning');
      } else {
        helpText.classList.remove('warning');
      }
    }
  }

  /**
   * Show status message to user
   */
  private showStatus(message: string, type: 'info' | 'success' | 'error'): void {
    const statusEl = document.getElementById('form-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status status-${type}`;
      statusEl.style.display = 'block';
    }
  }

  /**
   * Clear status message
   */
  private clearStatus(): void {
    const statusEl = document.getElementById('form-status');
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.style.display = 'none';
    }
  }
}

/**
 * Initialize need posting UI
 *
 * @param db - Database instance
 * @param userId - Current user ID
 * @param containerId - Container element ID
 */
export function initNeedPostingUI(db: LocalDatabase, userId: string, containerId: string): NeedPostingUI {
  const ui = new NeedPostingUI(db, userId);
  ui.render(containerId);
  return ui;
}
