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
  const DB_VERSION = 1;

  /**
   * Object stores (tables)
   */
  const STORES = {
    RESOURCES: 'resources',       // Shared items, tools, spaces
    NEEDS: 'needs',               // Community needs/requests
    OFFERS: 'offers',             // Time, skills, help offered
    EVENTS: 'events',             // Community events
    MEMBERS: 'members',           // Community members
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
