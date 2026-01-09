/**
 * Solarpunk Platform - Care Circle Formation
 *
 * Implements REQ-CARE-001: Care circle coordination
 *
 * Features:
 * - Create and manage care circles for vulnerable community members
 * - Coordinate support responsibilities among circle members
 * - Schedule check-ins, visits, and assistance
 * - Track needs and how they're being met
 * - Respect recipient autonomy and preferences
 */

(function(window) {
  'use strict';

  const CARE_CIRCLES_STORE = 'care-circles';
  const CARE_MEMBERS_STORE = 'care-members';
  const CARE_TASKS_STORE = 'care-tasks';
  const CHECK_INS_STORE = 'check-ins';

  /**
   * Care Circle Manager
   * Coordinates mutual care and support for community members
   */
  class CareCircleManager {
    constructor(db) {
      this.db = db;
    }

    /**
     * Create a new care circle
     * @param {Object} circleData - Circle configuration
     * @returns {Promise<Object>} Created circle
     */
    async createCircle(circleData) {
      const circle = {
        id: this.db.generateId('circle'),
        name: circleData.name || 'Care Circle',
        recipientId: circleData.recipientId, // Person receiving care
        recipientName: circleData.recipientName,
        description: circleData.description || '',
        coordinatorId: circleData.coordinatorId, // Optional coordinator
        members: circleData.members || [], // Array of member IDs
        preferences: circleData.preferences || {
          contactMethods: [], // phone, video, in-person
          bestTimes: [], // preferred times for contact
          frequency: 'daily', // daily, weekly, as-needed
          privacy: 'circle-only' // circle-only, community-visible
        },
        schedule: circleData.schedule || {
          checkInTime: '09:00', // Default morning check-in
          rotationPattern: 'equitable' // equitable, volunteer-based
        },
        status: 'active',
        createdAt: Date.now(),
        lastModified: Date.now(),
        _crdt: this.db.createCRDTMetadata()
      };

      return await this.db.put(CARE_CIRCLES_STORE, circle);
    }

    /**
     * Get a care circle by ID
     */
    async getCircle(circleId) {
      return await this.db.get(CARE_CIRCLES_STORE, circleId);
    }

    /**
     * Get all care circles
     */
    async getAllCircles(options = {}) {
      return await this.db.getAll(CARE_CIRCLES_STORE, {
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...options
      });
    }

    /**
     * Get circles where a member is participating
     */
    async getCirclesForMember(memberId) {
      const allCircles = await this.getAllCircles();
      return allCircles.filter(circle =>
        circle.recipientId === memberId ||
        circle.members.includes(memberId) ||
        circle.coordinatorId === memberId
      );
    }

    /**
     * Update care circle
     */
    async updateCircle(circleId, updates) {
      const circle = await this.getCircle(circleId);
      if (!circle) throw new Error('Circle not found');

      Object.assign(circle, updates);
      circle.lastModified = Date.now();

      return await this.db.put(CARE_CIRCLES_STORE, circle);
    }

    /**
     * Add member to care circle
     */
    async addMember(circleId, memberId, memberName, role = 'supporter') {
      const circle = await this.getCircle(circleId);
      if (!circle) throw new Error('Circle not found');

      // Check if member already exists
      if (circle.members.some(m => m.id === memberId)) {
        throw new Error('Member already in circle');
      }

      circle.members.push({
        id: memberId,
        name: memberName,
        role: role, // supporter, backup, coordinator
        joinedAt: Date.now(),
        availability: [],
        preferences: {}
      });

      circle.lastModified = Date.now();
      return await this.db.put(CARE_CIRCLES_STORE, circle);
    }

    /**
     * Remove member from care circle
     */
    async removeMember(circleId, memberId) {
      const circle = await this.getCircle(circleId);
      if (!circle) throw new Error('Circle not found');

      circle.members = circle.members.filter(m => m.id !== memberId);
      circle.lastModified = Date.now();

      return await this.db.put(CARE_CIRCLES_STORE, circle);
    }

    /**
     * Create a care task (check-in, visit, assistance)
     */
    async createTask(taskData) {
      const task = {
        id: this.db.generateId('task'),
        circleId: taskData.circleId,
        type: taskData.type, // check-in, visit, assistance, errand, meal, transport
        title: taskData.title,
        description: taskData.description || '',
        assignedTo: taskData.assignedTo || null, // Member ID
        assignedToName: taskData.assignedToName || '',
        scheduledFor: taskData.scheduledFor || null, // timestamp
        dueBy: taskData.dueBy || null,
        status: 'pending', // pending, in-progress, completed, cancelled
        priority: taskData.priority || 'normal', // urgent, high, normal, low
        recurring: taskData.recurring || null, // daily, weekly, monthly
        completedAt: null,
        notes: [],
        createdAt: Date.now(),
        lastModified: Date.now(),
        _crdt: this.db.createCRDTMetadata()
      };

      return await this.db.put(CARE_TASKS_STORE, task);
    }

    /**
     * Get tasks for a circle
     */
    async getTasksForCircle(circleId, statusFilter = null) {
      const allTasks = await this.db.getAll(CARE_TASKS_STORE);
      let tasks = allTasks.filter(task => task.circleId === circleId);

      if (statusFilter) {
        tasks = tasks.filter(task => task.status === statusFilter);
      }

      // Sort by due date, then priority
      tasks.sort((a, b) => {
        if (a.dueBy && b.dueBy) return a.dueBy - b.dueBy;
        if (a.dueBy) return -1;
        if (b.dueBy) return 1;
        return 0;
      });

      return tasks;
    }

    /**
     * Get tasks assigned to a member
     */
    async getTasksForMember(memberId, statusFilter = null) {
      const allTasks = await this.db.getAll(CARE_TASKS_STORE);
      let tasks = allTasks.filter(task => task.assignedTo === memberId);

      if (statusFilter) {
        tasks = tasks.filter(task => task.status === statusFilter);
      }

      return tasks;
    }

    /**
     * Complete a task
     */
    async completeTask(taskId, notes = '') {
      const task = await this.db.get(CARE_TASKS_STORE, taskId);
      if (!task) throw new Error('Task not found');

      task.status = 'completed';
      task.completedAt = Date.now();
      task.lastModified = Date.now();

      if (notes) {
        task.notes.push({
          text: notes,
          timestamp: Date.now()
        });
      }

      return await this.db.put(CARE_TASKS_STORE, task);
    }

    /**
     * Record a check-in
     */
    async recordCheckIn(checkInData) {
      const checkIn = {
        id: this.db.generateId('checkin'),
        circleId: checkInData.circleId,
        recipientId: checkInData.recipientId,
        checkerId: checkInData.checkerId || null, // Who did the check-in
        checkerName: checkInData.checkerName || '',
        status: checkInData.status, // ok, need-support, emergency, no-response
        message: checkInData.message || '',
        location: checkInData.location || null,
        followUpNeeded: checkInData.followUpNeeded || false,
        timestamp: Date.now(),
        _crdt: this.db.createCRDTMetadata()
      };

      return await this.db.put(CHECK_INS_STORE, checkIn);
    }

    /**
     * Get recent check-ins for a circle
     */
    async getRecentCheckIns(circleId, limit = 10) {
      const allCheckIns = await this.db.getAll(CHECK_INS_STORE);
      const circleCheckIns = allCheckIns
        .filter(c => c.circleId === circleId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return circleCheckIns;
    }

    /**
     * Get latest check-in for a circle
     */
    async getLatestCheckIn(circleId) {
      const checkIns = await this.getRecentCheckIns(circleId, 1);
      return checkIns[0] || null;
    }

    /**
     * Check if check-in is overdue
     */
    async isCheckInOverdue(circleId) {
      const circle = await this.getCircle(circleId);
      if (!circle) return false;

      const latestCheckIn = await this.getLatestCheckIn(circleId);
      if (!latestCheckIn) return true; // No check-ins yet

      const frequencyHours = {
        'twice-daily': 12,
        'daily': 24,
        'twice-weekly': 84, // 3.5 days
        'weekly': 168,
        'as-needed': null
      };

      const hours = frequencyHours[circle.preferences.frequency];
      if (!hours) return false; // As-needed doesn't have overdue

      const hoursSinceCheckIn = (Date.now() - latestCheckIn.timestamp) / (1000 * 60 * 60);
      return hoursSinceCheckIn > hours;
    }

    /**
     * Distribute care responsibilities equitably
     * Simple round-robin distribution for now
     */
    async distributeResponsibilities(circleId) {
      const circle = await this.getCircle(circleId);
      if (!circle) throw new Error('Circle not found');

      const tasks = await this.getTasksForCircle(circleId, 'pending');
      const unassignedTasks = tasks.filter(t => !t.assignedTo);

      if (unassignedTasks.length === 0) {
        return { assigned: 0, message: 'No unassigned tasks' };
      }

      // Get available members
      const availableMembers = circle.members.filter(m => m.role === 'supporter' || m.role === 'backup');

      if (availableMembers.length === 0) {
        return { assigned: 0, message: 'No available members to assign tasks' };
      }

      // Simple round-robin assignment
      let memberIndex = 0;
      let assignedCount = 0;

      for (const task of unassignedTasks) {
        const member = availableMembers[memberIndex % availableMembers.length];
        task.assignedTo = member.id;
        task.assignedToName = member.name;
        task.lastModified = Date.now();

        await this.db.put(CARE_TASKS_STORE, task);
        assignedCount++;
        memberIndex++;
      }

      return {
        assigned: assignedCount,
        message: `Assigned ${assignedCount} tasks to ${availableMembers.length} members`
      };
    }

    /**
     * Generate care circle summary
     */
    async getCircleSummary(circleId) {
      const circle = await this.getCircle(circleId);
      if (!circle) throw new Error('Circle not found');

      const tasks = await this.getTasksForCircle(circleId);
      const checkIns = await this.getRecentCheckIns(circleId, 7);
      const latestCheckIn = checkIns[0] || null;
      const isOverdue = await this.isCheckInOverdue(circleId);

      return {
        circle,
        stats: {
          memberCount: circle.members.length,
          pendingTasks: tasks.filter(t => t.status === 'pending').length,
          completedTasks: tasks.filter(t => t.status === 'completed').length,
          recentCheckIns: checkIns.length,
          lastCheckIn: latestCheckIn,
          checkInOverdue: isOverdue
        }
      };
    }

    /**
     * Delete a care circle
     */
    async deleteCircle(circleId) {
      // Delete associated tasks and check-ins
      const tasks = await this.getTasksForCircle(circleId);
      for (const task of tasks) {
        await this.db.delete(CARE_TASKS_STORE, task.id);
      }

      const checkIns = await this.getRecentCheckIns(circleId, 1000);
      for (const checkIn of checkIns) {
        await this.db.delete(CHECK_INS_STORE, checkIn.id);
      }

      // Delete circle
      return await this.db.delete(CARE_CIRCLES_STORE, circleId);
    }
  }

  /**
   * Initialize care circles store in database
   */
  async function initCareCirclesStores(db) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(db.dbName, db.version + 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      request.onupgradeneeded = (event) => {
        const idb = event.target.result;

        // Care circles store
        if (!idb.objectStoreNames.contains(CARE_CIRCLES_STORE)) {
          const circlesStore = idb.createObjectStore(CARE_CIRCLES_STORE, {
            keyPath: 'id'
          });
          circlesStore.createIndex('status', 'status', { unique: false });
          circlesStore.createIndex('recipientId', 'recipientId', { unique: false });
          circlesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Care tasks store
        if (!idb.objectStoreNames.contains(CARE_TASKS_STORE)) {
          const tasksStore = idb.createObjectStore(CARE_TASKS_STORE, {
            keyPath: 'id'
          });
          tasksStore.createIndex('circleId', 'circleId', { unique: false });
          tasksStore.createIndex('assignedTo', 'assignedTo', { unique: false });
          tasksStore.createIndex('status', 'status', { unique: false });
          tasksStore.createIndex('scheduledFor', 'scheduledFor', { unique: false });
        }

        // Check-ins store
        if (!idb.objectStoreNames.contains(CHECK_INS_STORE)) {
          const checkInsStore = idb.createObjectStore(CHECK_INS_STORE, {
            keyPath: 'id'
          });
          checkInsStore.createIndex('circleId', 'circleId', { unique: false });
          checkInsStore.createIndex('recipientId', 'recipientId', { unique: false });
          checkInsStore.createIndex('timestamp', 'timestamp', { unique: false });
          checkInsStore.createIndex('status', 'status', { unique: false });
        }

        console.log('[Care Circles] Database stores created');
      };
    });
  }

  /**
   * Public API
   */
  window.SolarpunkCareCircles = {
    manager: null,

    /**
     * Initialize care circles module
     */
    async init(db) {
      if (!db || !db.ready) {
        throw new Error('Database must be initialized first');
      }

      // Ensure stores exist
      await initCareCirclesStores(db);

      // Create manager
      this.manager = new CareCircleManager(db);

      console.log('[Care Circles] Module initialized');
      return this.manager;
    },

    /**
     * Create a new care circle
     */
    async createCircle(circleData) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.createCircle(circleData);
    },

    /**
     * Get circle by ID
     */
    async getCircle(circleId) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.getCircle(circleId);
    },

    /**
     * Get all circles
     */
    async getAllCircles(options) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.getAllCircles(options);
    },

    /**
     * Get circles for a member
     */
    async getCirclesForMember(memberId) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.getCirclesForMember(memberId);
    },

    /**
     * Update circle
     */
    async updateCircle(circleId, updates) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.updateCircle(circleId, updates);
    },

    /**
     * Add member to circle
     */
    async addMember(circleId, memberId, memberName, role) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.addMember(circleId, memberId, memberName, role);
    },

    /**
     * Remove member from circle
     */
    async removeMember(circleId, memberId) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.removeMember(circleId, memberId);
    },

    /**
     * Create a care task
     */
    async createTask(taskData) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.createTask(taskData);
    },

    /**
     * Get tasks for circle
     */
    async getTasksForCircle(circleId, statusFilter) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.getTasksForCircle(circleId, statusFilter);
    },

    /**
     * Get tasks for member
     */
    async getTasksForMember(memberId, statusFilter) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.getTasksForMember(memberId, statusFilter);
    },

    /**
     * Complete a task
     */
    async completeTask(taskId, notes) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.completeTask(taskId, notes);
    },

    /**
     * Record check-in
     */
    async recordCheckIn(checkInData) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.recordCheckIn(checkInData);
    },

    /**
     * Get recent check-ins
     */
    async getRecentCheckIns(circleId, limit) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.getRecentCheckIns(circleId, limit);
    },

    /**
     * Get circle summary
     */
    async getCircleSummary(circleId) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.getCircleSummary(circleId);
    },

    /**
     * Distribute responsibilities
     */
    async distributeResponsibilities(circleId) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.distributeResponsibilities(circleId);
    },

    /**
     * Check if check-in is overdue
     */
    async isCheckInOverdue(circleId) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.isCheckInOverdue(circleId);
    },

    /**
     * Delete circle
     */
    async deleteCircle(circleId) {
      if (!this.manager) throw new Error('Care circles not initialized');
      return await this.manager.deleteCircle(circleId);
    }
  };

  console.log('[Care Circles] Module loaded');

})(window);
