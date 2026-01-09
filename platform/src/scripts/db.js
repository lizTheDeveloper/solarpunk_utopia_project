/**
 * Solarpunk Platform - Local-First Database
 *
 * Offline-first database built on IndexedDB with CRDT support
 * Implements REQ-DEPLOY-010: Local-First Database
 *
 * Features:
 * - Offline-first operations
 * - CRDT-based conflict resolution
 * - Automatic sync queue
 * - Data export/import
 * - Optimized for low-resource devices
 */

(function(window) {
  'use strict';

  const DB_NAME = 'solarpunk-db';
  const DB_VERSION = 2;

  /**
   * Object stores (tables)
   */
  const STORES = {
    RESOURCES: 'resources',       // Shared items, tools, spaces
    NEEDS: 'needs',               // Community needs/requests
    OFFERS: 'offers',             // Time, skills, help offered
    EVENTS: 'events',             // Community events
    MEMBERS: 'members',           // Community members
    COMMUNITIES: 'communities',   // Community groups and communes
    CARE_CIRCLES: 'care-circles', // Care circles for vulnerable members
    CHECK_INS: 'check-ins',       // Check-in records
    SYNC_QUEUE: 'sync-queue',     // Operations to sync
    METADATA: 'metadata'          // System metadata
  };

  /**
   * Local-First Database Manager
   */
  class LocalFirstDB {
    constructor() {
      this.db = null;
      this.ready = false;
      this.nodeId = this.getOrCreateNodeId();
    }

    /**
     * Get or create unique node ID for this device
     * Used for CRDT conflict resolution
     */
    getOrCreateNodeId() {
      let nodeId = localStorage.getItem('solarpunk-node-id');
      if (!nodeId) {
        // Generate unique node ID
        nodeId = 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('solarpunk-node-id', nodeId);
      }
      return nodeId;
    }

    /**
     * Initialize database
     */
    async init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('[DB] Failed to open database:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.ready = true;
          console.log('[DB] Database initialized');
          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          console.log('[DB] Upgrading database schema...');

          // Resources (items to share/give)
          if (!db.objectStoreNames.contains(STORES.RESOURCES)) {
            const resourceStore = db.createObjectStore(STORES.RESOURCES, {
              keyPath: 'id'
            });
            resourceStore.createIndex('type', 'type', { unique: false });
            resourceStore.createIndex('status', 'status', { unique: false });
            resourceStore.createIndex('timestamp', 'timestamp', { unique: false });
            resourceStore.createIndex('lastModified', 'lastModified', { unique: false });
          }

          // Needs (community requests)
          if (!db.objectStoreNames.contains(STORES.NEEDS)) {
            const needsStore = db.createObjectStore(STORES.NEEDS, {
              keyPath: 'id'
            });
            needsStore.createIndex('urgency', 'urgency', { unique: false });
            needsStore.createIndex('status', 'status', { unique: false });
            needsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Offers (time, skills, help)
          if (!db.objectStoreNames.contains(STORES.OFFERS)) {
            const offersStore = db.createObjectStore(STORES.OFFERS, {
              keyPath: 'id'
            });
            offersStore.createIndex('category', 'category', { unique: false });
            offersStore.createIndex('status', 'status', { unique: false });
            offersStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Events
          if (!db.objectStoreNames.contains(STORES.EVENTS)) {
            const eventsStore = db.createObjectStore(STORES.EVENTS, {
              keyPath: 'id'
            });
            eventsStore.createIndex('date', 'date', { unique: false });
            eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Members
          if (!db.objectStoreNames.contains(STORES.MEMBERS)) {
            const membersStore = db.createObjectStore(STORES.MEMBERS, {
              keyPath: 'id'
            });
            membersStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Communities (groups and communes)
          if (!db.objectStoreNames.contains(STORES.COMMUNITIES)) {
            const communitiesStore = db.createObjectStore(STORES.COMMUNITIES, {
              keyPath: 'id'
            });
            communitiesStore.createIndex('name', 'name', { unique: false });
            communitiesStore.createIndex('status', 'status', { unique: false });
            communitiesStore.createIndex('visibility', 'visibility', { unique: false });
            communitiesStore.createIndex('membershipModel', 'membership.model', { unique: false });
            communitiesStore.createIndex('timestamp', 'createdAt', { unique: false });
            communitiesStore.createIndex('lastModified', 'lastModified', { unique: false });
          }

          // Care Circles
          if (!db.objectStoreNames.contains(STORES.CARE_CIRCLES)) {
            const careCirclesStore = db.createObjectStore(STORES.CARE_CIRCLES, {
              keyPath: 'id'
            });
            careCirclesStore.createIndex('recipientId', 'recipientId', { unique: false });
            careCirclesStore.createIndex('status', 'status', { unique: false });
            careCirclesStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Check-ins
          if (!db.objectStoreNames.contains(STORES.CHECK_INS)) {
            const checkInsStore = db.createObjectStore(STORES.CHECK_INS, {
              keyPath: 'id'
            });
            checkInsStore.createIndex('careCircleId', 'careCircleId', { unique: false });
            checkInsStore.createIndex('timestamp', 'timestamp', { unique: false });
            checkInsStore.createIndex('status', 'status', { unique: false });
          }

          // Sync queue for offline operations
          if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
            const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
              keyPath: 'id',
              autoIncrement: true
            });
            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
            syncStore.createIndex('status', 'status', { unique: false });
          }

          // Metadata
          if (!db.objectStoreNames.contains(STORES.METADATA)) {
            db.createObjectStore(STORES.METADATA, {
              keyPath: 'key'
            });
          }

          console.log('[DB] Database schema upgraded');
        };
      });
    }

    /**
     * Create CRDT metadata for a document
     */
    createCRDTMetadata() {
      return {
        nodeId: this.nodeId,
        timestamp: Date.now(),
        clock: Date.now(), // Logical clock (simplified)
        version: 1
      };
    }

    /**
     * Resolve conflicts using Last-Write-Wins (LWW) strategy
     * More sophisticated CRDTs can be implemented later
     */
    resolveLWW(local, remote) {
      // Compare logical clocks
      if (remote.clock > local.clock) {
        return remote;
      } else if (remote.clock < local.clock) {
        return local;
      } else {
        // Same clock - use node ID as tiebreaker
        return remote.nodeId > local.nodeId ? remote : local;
      }
    }

    /**
     * Put document with CRDT metadata
     */
    async put(storeName, doc) {
      if (!this.ready) {
        throw new Error('Database not initialized');
      }

      // Generate ID if not present
      if (!doc.id) {
        doc.id = this.generateId(storeName);
      }

      // Add CRDT metadata
      if (!doc._crdt) {
        doc._crdt = this.createCRDTMetadata();
      } else {
        // Update existing metadata
        doc._crdt.timestamp = Date.now();
        doc._crdt.clock = Date.now();
        doc._crdt.version += 1;
      }

      // Store last modified time
      doc.lastModified = Date.now();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(doc);

        request.onsuccess = () => {
          // Queue for sync
          this.queueForSync(storeName, 'put', doc);
          resolve(doc);
        };

        request.onerror = () => reject(request.error);
      });
    }

    /**
     * Get document by ID
     */
    async get(storeName, id) {
      if (!this.ready) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    /**
     * Get all documents from store
     */
    async getAll(storeName, options = {}) {
      if (!this.ready) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        // Use index if specified
        let source = store;
        if (options.index) {
          source = store.index(options.index);
        }

        const request = options.query
          ? source.getAll(options.query)
          : source.getAll();

        request.onsuccess = () => {
          let results = request.result;

          // Sort if requested
          if (options.sortBy) {
            results.sort((a, b) => {
              const aVal = a[options.sortBy];
              const bVal = b[options.sortBy];
              return options.sortOrder === 'desc'
                ? bVal - aVal
                : aVal - bVal;
            });
          }

          // Limit results
          if (options.limit) {
            results = results.slice(0, options.limit);
          }

          resolve(results);
        };

        request.onerror = () => reject(request.error);
      });
    }

    /**
     * Delete document
     */
    async delete(storeName, id) {
      if (!this.ready) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
          // Queue for sync
          this.queueForSync(storeName, 'delete', { id });
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    }

    /**
     * Query with filters
     */
    async query(storeName, filterFn) {
      const all = await this.getAll(storeName);
      return all.filter(filterFn);
    }

    /**
     * Count documents in store
     */
    async count(storeName) {
      if (!this.ready) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    /**
     * Generate unique ID for document
     */
    generateId(prefix = 'doc') {
      return `${prefix}-${this.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Queue operation for sync when online
     */
    async queueForSync(storeName, operation, data) {
      if (!this.ready) return;

      const syncOp = {
        timestamp: Date.now(),
        status: 'pending',
        store: storeName,
        operation: operation,
        data: data,
        retries: 0
      };

      try {
        const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
        const store = transaction.objectStore(STORES.SYNC_QUEUE);
        await store.add(syncOp);
        console.log('[DB] Queued for sync:', operation, storeName);
      } catch (error) {
        console.error('[DB] Failed to queue sync:', error);
      }
    }

    /**
     * Get pending sync operations
     */
    async getSyncQueue() {
      return this.getAll(STORES.SYNC_QUEUE, {
        index: 'status',
        query: 'pending',
        sortBy: 'timestamp',
        sortOrder: 'asc'
      });
    }

    /**
     * Clear sync queue (after successful sync)
     */
    async clearSyncQueue() {
      if (!this.ready) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
        const store = transaction.objectStore(STORES.SYNC_QUEUE);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[DB] Sync queue cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }

    /**
     * Export all data for backup/migration
     * REQ-DEPLOY-012: Data Portability
     */
    async exportData() {
      if (!this.ready) {
        throw new Error('Database not initialized');
      }

      const exportData = {
        version: DB_VERSION,
        nodeId: this.nodeId,
        exportTime: new Date().toISOString(),
        stores: {}
      };

      // Export each store
      for (const storeName of Object.values(STORES)) {
        if (storeName !== STORES.SYNC_QUEUE) {
          exportData.stores[storeName] = await this.getAll(storeName);
        }
      }

      return exportData;
    }

    /**
     * Import data from export
     */
    async importData(exportData) {
      if (!this.ready) {
        throw new Error('Database not initialized');
      }

      console.log('[DB] Importing data...');

      for (const [storeName, documents] of Object.entries(exportData.stores)) {
        console.log(`[DB] Importing ${documents.length} documents to ${storeName}`);

        for (const doc of documents) {
          // Resolve conflicts with existing data
          const existing = await this.get(storeName, doc.id);
          if (existing && existing._crdt) {
            // Use LWW conflict resolution
            const winner = this.resolveLWW(existing._crdt, doc._crdt);
            if (winner === existing._crdt) {
              continue; // Keep existing
            }
          }

          // Import document
          await this.put(storeName, doc);
        }
      }

      console.log('[DB] Import complete');
    }

    /**
     * Get database statistics
     */
    async getStats() {
      const stats = {
        nodeId: this.nodeId,
        stores: {}
      };

      for (const storeName of Object.values(STORES)) {
        stats.stores[storeName] = await this.count(storeName);
      }

      return stats;
    }
  }

  /**
   * Public API
   */
  window.SolarpunkDB = {
    db: new LocalFirstDB(),
    STORES,

    /**
     * Initialize database
     */
    async init() {
      return await this.db.init();
    },

    /**
     * Check if database is ready
     */
    isReady() {
      return this.db.ready;
    },

    /**
     * Resources API (items to share/give)
     */
    resources: {
      async create(resource) {
        resource.type = resource.type || 'item';
        resource.status = resource.status || 'available';
        resource.timestamp = Date.now();
        return await window.SolarpunkDB.db.put(STORES.RESOURCES, resource);
      },

      async get(id) {
        return await window.SolarpunkDB.db.get(STORES.RESOURCES, id);
      },

      async getAll(options) {
        return await window.SolarpunkDB.db.getAll(STORES.RESOURCES, {
          sortBy: 'timestamp',
          sortOrder: 'desc',
          ...options
        });
      },

      async update(id, updates) {
        const resource = await this.get(id);
        if (!resource) throw new Error('Resource not found');
        Object.assign(resource, updates);
        return await window.SolarpunkDB.db.put(STORES.RESOURCES, resource);
      },

      async delete(id) {
        return await window.SolarpunkDB.db.delete(STORES.RESOURCES, id);
      },

      async getAvailable() {
        return await window.SolarpunkDB.db.query(STORES.RESOURCES, r => r.status === 'available');
      }
    },

    /**
     * Needs API (community requests)
     */
    needs: {
      async create(need) {
        need.urgency = need.urgency || 'normal';
        need.status = need.status || 'open';
        need.timestamp = Date.now();
        return await window.SolarpunkDB.db.put(STORES.NEEDS, need);
      },

      async get(id) {
        return await window.SolarpunkDB.db.get(STORES.NEEDS, id);
      },

      async getAll(options) {
        return await window.SolarpunkDB.db.getAll(STORES.NEEDS, {
          sortBy: 'timestamp',
          sortOrder: 'desc',
          ...options
        });
      },

      async update(id, updates) {
        const need = await this.get(id);
        if (!need) throw new Error('Need not found');
        Object.assign(need, updates);
        return await window.SolarpunkDB.db.put(STORES.NEEDS, need);
      },

      async delete(id) {
        return await window.SolarpunkDB.db.delete(STORES.NEEDS, id);
      }
    },

    /**
     * Offers API (time, skills, help)
     */
    offers: {
      async create(offer) {
        offer.status = offer.status || 'active';
        offer.timestamp = Date.now();
        return await window.SolarpunkDB.db.put(STORES.OFFERS, offer);
      },

      async get(id) {
        return await window.SolarpunkDB.db.get(STORES.OFFERS, id);
      },

      async getAll(options) {
        return await window.SolarpunkDB.db.getAll(STORES.OFFERS, {
          sortBy: 'timestamp',
          sortOrder: 'desc',
          ...options
        });
      },

      async update(id, updates) {
        const offer = await this.get(id);
        if (!offer) throw new Error('Offer not found');
        Object.assign(offer, updates);
        return await window.SolarpunkDB.db.put(STORES.OFFERS, offer);
      },

      async delete(id) {
        return await window.SolarpunkDB.db.delete(STORES.OFFERS, id);
      }
    },

    /**
     * Care Circles API (coordinated care for vulnerable members)
     * Implements REQ-CARE-001: Care circle coordination
     */
    careCircles: {
      async create(careCircle) {
        careCircle.status = careCircle.status || 'active';
        careCircle.timestamp = Date.now();
        careCircle.members = careCircle.members || [];
        careCircle.preferences = careCircle.preferences || {};
        careCircle.schedule = careCircle.schedule || [];
        return await window.SolarpunkDB.db.put(STORES.CARE_CIRCLES, careCircle);
      },

      async get(id) {
        return await window.SolarpunkDB.db.get(STORES.CARE_CIRCLES, id);
      },

      async getAll(options) {
        return await window.SolarpunkDB.db.getAll(STORES.CARE_CIRCLES, {
          sortBy: 'timestamp',
          sortOrder: 'desc',
          ...options
        });
      },

      async getByRecipient(recipientId) {
        return await window.SolarpunkDB.db.query(STORES.CARE_CIRCLES,
          circle => circle.recipientId === recipientId && circle.status === 'active');
      },

      async update(id, updates) {
        const circle = await this.get(id);
        if (!circle) throw new Error('Care circle not found');
        Object.assign(circle, updates);
        return await window.SolarpunkDB.db.put(STORES.CARE_CIRCLES, circle);
      },

      async addMember(circleId, memberId, role) {
        const circle = await this.get(circleId);
        if (!circle) throw new Error('Care circle not found');

        if (!circle.members.find(m => m.id === memberId)) {
          circle.members.push({
            id: memberId,
            role: role || 'supporter',
            joinedAt: Date.now()
          });
          return await window.SolarpunkDB.db.put(STORES.CARE_CIRCLES, circle);
        }
        return circle;
      },

      async removeMember(circleId, memberId) {
        const circle = await this.get(circleId);
        if (!circle) throw new Error('Care circle not found');

        circle.members = circle.members.filter(m => m.id !== memberId);
        return await window.SolarpunkDB.db.put(STORES.CARE_CIRCLES, circle);
      },

      async addScheduledTask(circleId, task) {
        const circle = await this.get(circleId);
        if (!circle) throw new Error('Care circle not found');

        task.id = window.SolarpunkDB.db.generateId('task');
        task.createdAt = Date.now();
        task.status = task.status || 'scheduled';
        circle.schedule.push(task);

        return await window.SolarpunkDB.db.put(STORES.CARE_CIRCLES, circle);
      },

      async updateTaskStatus(circleId, taskId, status) {
        const circle = await this.get(circleId);
        if (!circle) throw new Error('Care circle not found');

        const task = circle.schedule.find(t => t.id === taskId);
        if (task) {
          task.status = status;
          task.updatedAt = Date.now();
        }

        return await window.SolarpunkDB.db.put(STORES.CARE_CIRCLES, circle);
      },

      async delete(id) {
        return await window.SolarpunkDB.db.delete(STORES.CARE_CIRCLES, id);
      }
    },

    /**
     * Check-ins API (wellness check-ins for care circles)
     */
    checkIns: {
      async create(checkIn) {
        checkIn.timestamp = Date.now();
        checkIn.status = checkIn.status || 'okay';
        return await window.SolarpunkDB.db.put(STORES.CHECK_INS, checkIn);
      },

      async get(id) {
        return await window.SolarpunkDB.db.get(STORES.CHECK_INS, id);
      },

      async getAll(options) {
        return await window.SolarpunkDB.db.getAll(STORES.CHECK_INS, {
          sortBy: 'timestamp',
          sortOrder: 'desc',
          ...options
        });
      },

      async getByCareCircle(careCircleId, options = {}) {
        const allCheckIns = await window.SolarpunkDB.db.query(STORES.CHECK_INS,
          checkIn => checkIn.careCircleId === careCircleId);

        // Sort by timestamp descending
        allCheckIns.sort((a, b) => b.timestamp - a.timestamp);

        // Apply limit if specified
        if (options.limit) {
          return allCheckIns.slice(0, options.limit);
        }

        return allCheckIns;
      },

      async getMissedCheckIns(careCircleId, expectedIntervalHours = 24) {
        const circle = await window.SolarpunkDB.careCircles.get(careCircleId);
        if (!circle) return [];

        const recentCheckIns = await this.getByCareCircle(careCircleId, { limit: 1 });
        const lastCheckIn = recentCheckIns[0];

        const now = Date.now();
        const expectedInterval = expectedIntervalHours * 60 * 60 * 1000;

        if (!lastCheckIn || (now - lastCheckIn.timestamp) > expectedInterval) {
          return [{
            careCircleId,
            recipientId: circle.recipientId,
            recipientName: circle.recipientName,
            lastCheckIn: lastCheckIn ? lastCheckIn.timestamp : null,
            hoursOverdue: lastCheckIn
              ? Math.floor((now - lastCheckIn.timestamp) / (60 * 60 * 1000))
              : null
          }];
        }

        return [];
      }
    },

    /**
     * Communities API (community groups and communes)
     * Implements REQ-GOV-001: Community Groups and Communes
     */
    communities: {
      async create(community) {
        community.createdAt = community.createdAt || Date.now();
        community.lastModified = Date.now();
        community.status = community.status || 'active';
        community.visibility = community.visibility || 'public';
        return await window.SolarpunkDB.db.put(STORES.COMMUNITIES, community);
      },

      async get(id) {
        return await window.SolarpunkDB.db.get(STORES.COMMUNITIES, id);
      },

      async getAll(options) {
        return await window.SolarpunkDB.db.getAll(STORES.COMMUNITIES, {
          sortBy: 'createdAt',
          sortOrder: 'desc',
          ...options
        });
      },

      async update(community) {
        community.lastModified = Date.now();
        return await window.SolarpunkDB.db.put(STORES.COMMUNITIES, community);
      },

      async delete(id) {
        return await window.SolarpunkDB.db.delete(STORES.COMMUNITIES, id);
      },

      async getPublic() {
        return await window.SolarpunkDB.db.query(STORES.COMMUNITIES,
          c => c.visibility === 'public' && c.status === 'active');
      },

      async searchByName(query) {
        const all = await this.getAll();
        const lowerQuery = query.toLowerCase();
        return all.filter(c =>
          c.name.toLowerCase().includes(lowerQuery) ||
          (c.description && c.description.toLowerCase().includes(lowerQuery))
        );
      }
    },

    /**
     * Export/Import API
     */
    async export() {
      return await this.db.exportData();
    },

    async import(data) {
      return await this.db.importData(data);
    },

    /**
     * Sync API
     */
    async getSyncQueue() {
      return await this.db.getSyncQueue();
    },

    async clearSyncQueue() {
      return await this.db.clearSyncQueue();
    },

    /**
     * Stats API
     */
    async getStats() {
      return await this.db.getStats();
    }
  };

  console.log('[DB] Local-first database module loaded');

})(window);
