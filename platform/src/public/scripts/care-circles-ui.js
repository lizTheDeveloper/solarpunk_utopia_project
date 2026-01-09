/**
 * Solarpunk Platform - Care Circles UI
 *
 * User interface for managing care circles
 * Provides forms and views for creating and coordinating care circles
 */

(function(window) {
  'use strict';

  /**
   * Care Circles UI Manager
   */
  class CareCirclesUI {
    constructor() {
      this.currentCircle = null;
      this.currentUser = null; // TODO: Integrate with auth system
    }

    /**
     * Render care circles dashboard
     */
    renderDashboard(container) {
      container.innerHTML = `
        <div class="care-circles-dashboard">
          <header style="margin-bottom: 2rem;">
            <h2>Care Circles</h2>
            <p style="opacity: 0.8; margin-top: 0.5rem;">
              Coordinate mutual care and support for community members
            </p>
          </header>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem;">
            <button id="create-circle-btn" class="btn-primary">
              Create Care Circle
            </button>
            <button id="view-my-circles-btn" class="btn-secondary">
              My Circles
            </button>
            <button id="view-my-tasks-btn" class="btn-secondary">
              My Tasks
            </button>
          </div>

          <div id="circles-list" style="margin-top: 2rem;">
            <p style="opacity: 0.7;">Loading care circles...</p>
          </div>
        </div>
      `;

      // Set up event listeners
      this.setupDashboardListeners(container);

      // Load circles
      this.loadCircles(container);
    }

    /**
     * Set up event listeners for dashboard
     */
    setupDashboardListeners(container) {
      const createBtn = container.querySelector('#create-circle-btn');
      const myCirclesBtn = container.querySelector('#view-my-circles-btn');
      const myTasksBtn = container.querySelector('#view-my-tasks-btn');

      if (createBtn) {
        createBtn.addEventListener('click', () => this.showCreateCircleForm(container));
      }

      if (myCirclesBtn) {
        myCirclesBtn.addEventListener('click', () => this.showMyCircles(container));
      }

      if (myTasksBtn) {
        myTasksBtn.addEventListener('click', () => this.showMyTasks(container));
      }
    }

    /**
     * Load and display all circles
     */
    async loadCircles(container) {
      const listContainer = container.querySelector('#circles-list');
      if (!listContainer) return;

      try {
        const circles = await window.SolarpunkCareCircles.getAllCircles();

        if (circles.length === 0) {
          listContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; opacity: 0.7;">
              <p>No care circles yet.</p>
              <p style="margin-top: 0.5rem;">Create one to start coordinating mutual support!</p>
            </div>
          `;
          return;
        }

        listContainer.innerHTML = `
          <h3 style="margin-bottom: 1rem;">Active Care Circles</h3>
          <div class="circles-grid">
            ${await this.renderCirclesGrid(circles)}
          </div>
        `;
      } catch (error) {
        console.error('[Care Circles UI] Failed to load circles:', error);
        listContainer.innerHTML = `
          <p style="color: var(--color-error);">Failed to load care circles</p>
        `;
      }
    }

    /**
     * Render circles as grid cards
     */
    async renderCirclesGrid(circles) {
      const cards = await Promise.all(circles.map(async (circle) => {
        const summary = await window.SolarpunkCareCircles.getCircleSummary(circle.id);
        const isOverdue = summary.stats.checkInOverdue;

        return `
          <div class="circle-card" style="
            padding: 1rem;
            background-color: rgba(255,255,255,0.05);
            border-radius: 8px;
            border-left: 4px solid ${isOverdue ? 'var(--color-error)' : 'var(--color-primary)'};
            cursor: pointer;
          " data-circle-id="${circle.id}">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
              <h4 style="margin: 0;">${this.escapeHtml(circle.name)}</h4>
              ${isOverdue ? '<span style="color: var(--color-error); font-size: 0.875rem;">⚠️ Overdue</span>' : ''}
            </div>
            <p style="opacity: 0.8; font-size: 0.875rem; margin-bottom: 0.5rem;">
              Supporting: ${this.escapeHtml(circle.recipientName)}
            </p>
            <div style="display: flex; gap: 1rem; font-size: 0.875rem; opacity: 0.7;">
              <span>${summary.stats.memberCount} members</span>
              <span>${summary.stats.pendingTasks} pending tasks</span>
            </div>
            ${summary.stats.lastCheckIn ? `
              <p style="font-size: 0.75rem; opacity: 0.6; margin-top: 0.5rem;">
                Last check-in: ${this.formatTimestamp(summary.stats.lastCheckIn.timestamp)}
              </p>
            ` : ''}
          </div>
        `;
      }));

      return cards.join('');
    }

    /**
     * Show create circle form
     */
    showCreateCircleForm(container) {
      const modal = this.createModal('Create Care Circle', `
        <form id="create-circle-form">
          <div class="form-group">
            <label for="circle-name">Circle Name</label>
            <input type="text" id="circle-name" required
              placeholder="e.g., Emma's Care Circle"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
          </div>

          <div class="form-group">
            <label for="recipient-name">Person Receiving Care</label>
            <input type="text" id="recipient-name" required
              placeholder="Their name"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
          </div>

          <div class="form-group">
            <label for="circle-description">Description (optional)</label>
            <textarea id="circle-description" rows="3"
              placeholder="What kind of support is needed?"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"></textarea>
          </div>

          <div class="form-group">
            <label for="check-in-frequency">Check-in Frequency</label>
            <select id="check-in-frequency"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
              <option value="twice-daily">Twice daily</option>
              <option value="daily" selected>Daily</option>
              <option value="twice-weekly">Twice weekly</option>
              <option value="weekly">Weekly</option>
              <option value="as-needed">As needed</option>
            </select>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button type="submit" class="btn-primary" style="flex: 1;">
              Create Circle
            </button>
            <button type="button" class="btn-secondary" id="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      `);

      document.body.appendChild(modal);

      // Set up form submission
      const form = modal.querySelector('#create-circle-form');
      const cancelBtn = modal.querySelector('#cancel-btn');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const circleData = {
          name: modal.querySelector('#circle-name').value.trim(),
          recipientName: modal.querySelector('#recipient-name').value.trim(),
          recipientId: 'user-' + Date.now(), // TODO: Link to actual user
          description: modal.querySelector('#circle-description').value.trim(),
          coordinatorId: this.currentUser?.id || 'current-user',
          members: [],
          preferences: {
            frequency: modal.querySelector('#check-in-frequency').value,
            contactMethods: ['in-person', 'phone'],
            privacy: 'circle-only'
          }
        };

        try {
          await window.SolarpunkCareCircles.createCircle(circleData);
          modal.remove();
          this.loadCircles(container);
        } catch (error) {
          console.error('[Care Circles UI] Failed to create circle:', error);
          alert('Failed to create care circle');
        }
      });

      cancelBtn.addEventListener('click', () => modal.remove());
    }

    /**
     * Show circle details
     */
    async showCircleDetails(circleId, container) {
      try {
        const summary = await window.SolarpunkCareCircles.getCircleSummary(circleId);
        const circle = summary.circle;
        const stats = summary.stats;

        const modal = this.createModal(circle.name, `
          <div class="circle-details">
            <div style="margin-bottom: 1.5rem;">
              <p><strong>Supporting:</strong> ${this.escapeHtml(circle.recipientName)}</p>
              ${circle.description ? `<p style="margin-top: 0.5rem; opacity: 0.8;">${this.escapeHtml(circle.description)}</p>` : ''}
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
              <div class="stat-box" style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 4px;">
                <div style="font-size: 1.5rem; color: var(--color-primary);">${stats.memberCount}</div>
                <div style="font-size: 0.875rem; opacity: 0.7;">Members</div>
              </div>
              <div class="stat-box" style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 4px;">
                <div style="font-size: 1.5rem; color: var(--color-accent);">${stats.pendingTasks}</div>
                <div style="font-size: 0.875rem; opacity: 0.7;">Pending Tasks</div>
              </div>
              <div class="stat-box" style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 4px;">
                <div style="font-size: 1.5rem; color: var(--color-secondary);">${stats.completedTasks}</div>
                <div style="font-size: 0.875rem; opacity: 0.7;">Completed</div>
              </div>
            </div>

            ${stats.checkInOverdue ? `
              <div style="padding: 1rem; background: rgba(239,83,80,0.2); border-radius: 4px; margin-bottom: 1.5rem;">
                ⚠️ Check-in overdue - time to reach out!
              </div>
            ` : ''}

            <div style="margin-bottom: 1.5rem;">
              <h4 style="margin-bottom: 0.5rem;">Circle Members</h4>
              ${circle.members.length > 0 ? `
                <ul style="list-style: none; padding: 0;">
                  ${circle.members.map(m => `
                    <li style="padding: 0.5rem; background: rgba(255,255,255,0.03); margin-bottom: 0.25rem; border-radius: 4px;">
                      ${this.escapeHtml(m.name)} <span style="opacity: 0.6;">- ${m.role}</span>
                    </li>
                  `).join('')}
                </ul>
              ` : '<p style="opacity: 0.7;">No members yet. Invite community members to join!</p>'}
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="add-member-btn" class="btn-primary">Add Member</button>
              <button id="create-task-btn" class="btn-primary">Create Task</button>
              <button id="record-checkin-btn" class="btn-secondary">Record Check-in</button>
              <button id="view-tasks-btn" class="btn-secondary">View Tasks</button>
              <button id="close-modal-btn" class="btn-secondary">Close</button>
            </div>
          </div>
        `);

        document.body.appendChild(modal);

        // Set up event listeners
        modal.querySelector('#add-member-btn')?.addEventListener('click', () => {
          this.showAddMemberForm(circleId, modal);
        });

        modal.querySelector('#create-task-btn')?.addEventListener('click', () => {
          this.showCreateTaskForm(circleId, modal);
        });

        modal.querySelector('#record-checkin-btn')?.addEventListener('click', () => {
          this.showRecordCheckInForm(circleId, modal);
        });

        modal.querySelector('#view-tasks-btn')?.addEventListener('click', async () => {
          await this.showCircleTasks(circleId, modal);
        });

        modal.querySelector('#close-modal-btn')?.addEventListener('click', () => {
          modal.remove();
        });

      } catch (error) {
        console.error('[Care Circles UI] Failed to load circle details:', error);
        alert('Failed to load circle details');
      }
    }

    /**
     * Show add member form
     */
    showAddMemberForm(circleId, parentModal) {
      const modal = this.createModal('Add Member to Circle', `
        <form id="add-member-form">
          <div class="form-group">
            <label for="member-name">Member Name</label>
            <input type="text" id="member-name" required
              placeholder="Community member name"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
          </div>

          <div class="form-group">
            <label for="member-role">Role</label>
            <select id="member-role"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
              <option value="supporter">Supporter</option>
              <option value="backup">Backup</option>
              <option value="coordinator">Coordinator</option>
            </select>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button type="submit" class="btn-primary" style="flex: 1;">Add Member</button>
            <button type="button" class="btn-secondary" id="cancel-add-member">Cancel</button>
          </div>
        </form>
      `);

      document.body.appendChild(modal);

      const form = modal.querySelector('#add-member-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const memberName = modal.querySelector('#member-name').value.trim();
        const memberRole = modal.querySelector('#member-role').value;
        const memberId = 'member-' + Date.now(); // TODO: Link to actual user

        try {
          await window.SolarpunkCareCircles.addMember(circleId, memberId, memberName, memberRole);
          modal.remove();
          parentModal.remove();
          // Refresh parent view
          await this.showCircleDetails(circleId, document.querySelector('.care-circles-dashboard')?.parentElement);
        } catch (error) {
          console.error('[Care Circles UI] Failed to add member:', error);
          alert('Failed to add member');
        }
      });

      modal.querySelector('#cancel-add-member').addEventListener('click', () => modal.remove());
    }

    /**
     * Show create task form
     */
    showCreateTaskForm(circleId, parentModal) {
      const modal = this.createModal('Create Care Task', `
        <form id="create-task-form">
          <div class="form-group">
            <label for="task-type">Task Type</label>
            <select id="task-type"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
              <option value="check-in">Check-in</option>
              <option value="visit">Visit</option>
              <option value="assistance">General Assistance</option>
              <option value="errand">Errand</option>
              <option value="meal">Meal Delivery</option>
              <option value="transport">Transportation</option>
            </select>
          </div>

          <div class="form-group">
            <label for="task-title">Title</label>
            <input type="text" id="task-title" required
              placeholder="e.g., Morning check-in"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
          </div>

          <div class="form-group">
            <label for="task-description">Description</label>
            <textarea id="task-description" rows="2"
              placeholder="Additional details..."
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"></textarea>
          </div>

          <div class="form-group">
            <label for="task-due">Due Date/Time (optional)</label>
            <input type="datetime-local" id="task-due"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button type="submit" class="btn-primary" style="flex: 1;">Create Task</button>
            <button type="button" class="btn-secondary" id="cancel-task">Cancel</button>
          </div>
        </form>
      `);

      document.body.appendChild(modal);

      const form = modal.querySelector('#create-task-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dueInput = modal.querySelector('#task-due').value;
        const taskData = {
          circleId,
          type: modal.querySelector('#task-type').value,
          title: modal.querySelector('#task-title').value.trim(),
          description: modal.querySelector('#task-description').value.trim(),
          dueBy: dueInput ? new Date(dueInput).getTime() : null
        };

        try {
          await window.SolarpunkCareCircles.createTask(taskData);
          modal.remove();
          parentModal.remove();
          await this.showCircleDetails(circleId, document.querySelector('.care-circles-dashboard')?.parentElement);
        } catch (error) {
          console.error('[Care Circles UI] Failed to create task:', error);
          alert('Failed to create task');
        }
      });

      modal.querySelector('#cancel-task').addEventListener('click', () => modal.remove());
    }

    /**
     * Show record check-in form
     */
    showRecordCheckInForm(circleId, parentModal) {
      const modal = this.createModal('Record Check-in', `
        <form id="record-checkin-form">
          <div class="form-group">
            <label for="checkin-status">Status</label>
            <select id="checkin-status"
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
              <option value="ok">✅ Doing well</option>
              <option value="need-support">⚠️ Could use support</option>
              <option value="emergency">🚨 Emergency</option>
              <option value="no-response">❌ No response</option>
            </select>
          </div>

          <div class="form-group">
            <label for="checkin-message">Notes (optional)</label>
            <textarea id="checkin-message" rows="3"
              placeholder="Any additional notes from the check-in..."
              style="width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"></textarea>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button type="submit" class="btn-primary" style="flex: 1;">Record Check-in</button>
            <button type="button" class="btn-secondary" id="cancel-checkin">Cancel</button>
          </div>
        </form>
      `);

      document.body.appendChild(modal);

      const form = modal.querySelector('#record-checkin-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const circle = await window.SolarpunkCareCircles.getCircle(circleId);
        const checkInData = {
          circleId,
          recipientId: circle.recipientId,
          checkerId: this.currentUser?.id || 'current-user',
          checkerName: this.currentUser?.name || 'Community Member',
          status: modal.querySelector('#checkin-status').value,
          message: modal.querySelector('#checkin-message').value.trim()
        };

        try {
          await window.SolarpunkCareCircles.recordCheckIn(checkInData);
          modal.remove();
          parentModal.remove();
          await this.showCircleDetails(circleId, document.querySelector('.care-circles-dashboard')?.parentElement);
        } catch (error) {
          console.error('[Care Circles UI] Failed to record check-in:', error);
          alert('Failed to record check-in');
        }
      });

      modal.querySelector('#cancel-checkin').addEventListener('click', () => modal.remove());
    }

    /**
     * Show circle tasks
     */
    async showCircleTasks(circleId, parentModal) {
      const tasks = await window.SolarpunkCareCircles.getTasksForCircle(circleId);

      const modal = this.createModal('Circle Tasks', `
        <div>
          ${tasks.length === 0 ? '<p style="opacity: 0.7;">No tasks yet.</p>' : `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${tasks.map(task => `
                <div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid ${this.getTaskStatusColor(task.status)};">
                  <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                      <strong>${this.escapeHtml(task.title)}</strong>
                      <span style="margin-left: 0.5rem; opacity: 0.6; font-size: 0.875rem;">${task.type}</span>
                      ${task.description ? `<p style="margin-top: 0.25rem; opacity: 0.8; font-size: 0.875rem;">${this.escapeHtml(task.description)}</p>` : ''}
                      ${task.assignedToName ? `<p style="margin-top: 0.25rem; font-size: 0.875rem; opacity: 0.6;">Assigned to: ${this.escapeHtml(task.assignedToName)}</p>` : ''}
                      ${task.dueBy ? `<p style="margin-top: 0.25rem; font-size: 0.875rem; opacity: 0.6;">Due: ${this.formatTimestamp(task.dueBy)}</p>` : ''}
                    </div>
                    ${task.status === 'pending' ? `
                      <button class="complete-task-btn" data-task-id="${task.id}" style="padding: 0.25rem 0.5rem; background: var(--color-secondary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                        Complete
                      </button>
                    ` : `
                      <span style="color: var(--color-secondary); font-size: 0.875rem;">✓ Done</span>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
          <button id="close-tasks-modal" class="btn-secondary" style="margin-top: 1rem; width: 100%;">Close</button>
        </div>
      `);

      document.body.appendChild(modal);

      // Complete task handlers
      modal.querySelectorAll('.complete-task-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const taskId = btn.dataset.taskId;
          try {
            await window.SolarpunkCareCircles.completeTask(taskId);
            modal.remove();
            await this.showCircleTasks(circleId, parentModal);
          } catch (error) {
            console.error('[Care Circles UI] Failed to complete task:', error);
            alert('Failed to complete task');
          }
        });
      });

      modal.querySelector('#close-tasks-modal').addEventListener('click', () => modal.remove());
    }

    /**
     * Create modal element
     */
    createModal(title, content) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
      `;

      modal.innerHTML = `
        <div style="
          background: var(--color-bg);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 1.5rem;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        ">
          <h3 style="margin-bottom: 1rem;">${title}</h3>
          ${content}
        </div>
      `;

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });

      return modal;
    }

    /**
     * Get task status color
     */
    getTaskStatusColor(status) {
      const colors = {
        'pending': 'var(--color-accent)',
        'in-progress': 'var(--color-primary)',
        'completed': 'var(--color-secondary)',
        'cancelled': 'rgba(255,255,255,0.3)'
      };
      return colors[status] || colors.pending;
    }

    /**
     * Format timestamp
     */
    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  /**
   * Public API
   */
  window.SolarpunkCareCirclesUI = new CareCirclesUI();

  console.log('[Care Circles UI] Module loaded');

})(window);
