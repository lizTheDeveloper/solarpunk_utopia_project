/**
 * Solarpunk Utopia Platform - Main Application
 *
 * Optimized for:
 * - Old Android devices (Android 5+)
 * - Low memory footprint (< 500MB RAM)
 * - Battery efficiency
 * - Offline-first operation
 */

(function() {
  'use strict';

  // Feature detection for older browsers
  const supportsLocalStorage = 'localStorage' in window;
  const supportsIndexedDB = 'indexedDB' in window;
  const supportsServiceWorker = 'serviceWorker' in navigator;

  /**
   * App state management
   * Minimal state stored in memory
   */
  const AppState = {
    isOnline: navigator.onLine,
    isInitialized: false,
    user: null,
    community: null
  };

  /**
   * Battery-aware operation
   * Adjusts behavior based on battery level
   */
  class BatteryManager {
    constructor() {
      this.battery = null;
      this.isLowBattery = false;
    }

    async init() {
      try {
        if ('getBattery' in navigator) {
          this.battery = await navigator.getBattery();
          this.updateBatteryStatus();

          // Listen for battery changes
          this.battery.addEventListener('levelchange', () => this.updateBatteryStatus());
          this.battery.addEventListener('chargingchange', () => this.updateBatteryStatus());
        }
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }

    updateBatteryStatus() {
      if (!this.battery) return;

      const level = this.battery.level;
      const charging = this.battery.charging;

      // Consider low battery if < 20% and not charging
      this.isLowBattery = level < 0.2 && !charging;

      if (this.isLowBattery) {
        console.log('[Battery] Low battery mode activated');
        this.enableLowPowerMode();
      }
    }

    enableLowPowerMode() {
      // Reduce background activity
      // Disable animations
      // Reduce sync frequency
      document.body.classList.add('low-power-mode');
    }
  }

  /**
   * Storage manager for offline-first data
   * Uses IndexedDB for structured data, localStorage as fallback
   */
  class StorageManager {
    constructor() {
      this.db = null;
      this.dbName = 'solarpunk-db';
      this.version = 1;
    }

    async init() {
      if (!supportsIndexedDB) {
        console.warn('IndexedDB not supported, using localStorage');
        return;
      }

      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          console.log('[Storage] IndexedDB initialized');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Create object stores for offline-first data
          if (!db.objectStoreNames.contains('resources')) {
            db.createObjectStore('resources', { keyPath: 'id', autoIncrement: true });
          }

          if (!db.objectStoreNames.contains('community')) {
            db.createObjectStore('community', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('sync-queue')) {
            db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
          }
        };
      });
    }

    async get(storeName, key) {
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async set(storeName, value) {
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async getAll(storeName) {
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Main application class
   */
  class SolarpunkApp {
    constructor() {
      this.batteryManager = new BatteryManager();
      this.storageManager = new StorageManager();
    }

    async init() {
      console.log('[App] Initializing Solarpunk Platform...');

      // Initialize subsystems
      await this.batteryManager.init();
      await this.storageManager.init();

      // Initialize local-first database
      if (window.SolarpunkDB) {
        try {
          await window.SolarpunkDB.init();
          console.log('[App] Database initialized');

          // Initialize care circles module
          if (window.SolarpunkCareCircles) {
            try {
              await window.SolarpunkCareCircles.init(window.SolarpunkDB.db);
              console.log('[App] Care circles initialized');
            } catch (error) {
              console.error('[App] Care circles initialization failed:', error);
            }
          }

          // Enable auto-backup (every hour)
          if (window.SolarpunkExport) {
            window.SolarpunkExport.enableAutoBackup(60);
          }
        } catch (error) {
          console.error('[App] Database initialization failed:', error);
        }
      }

      // Set up event listeners
      this.setupEventListeners();

      // Render initial UI
      this.render();

      AppState.isInitialized = true;
      console.log('[App] Initialization complete');
    }

    setupEventListeners() {
      // Network status changes
      window.addEventListener('online', () => {
        AppState.isOnline = true;
        console.log('[App] Online');
        this.handleOnline();
      });

      window.addEventListener('offline', () => {
        AppState.isOnline = false;
        console.log('[App] Offline');
        this.handleOffline();
      });

      // Visibility changes (for battery optimization)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.handleAppBackground();
        } else {
          this.handleAppForeground();
        }
      });
    }

    handleOnline() {
      // Trigger background sync
      if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((registration) => {
          return registration.sync.register('sync-community-data');
        }).catch((error) => {
          console.error('[App] Background sync registration failed:', error);
        });
      }
    }

    handleOffline() {
      // Queue operations for later sync
      console.log('[App] Queuing operations for offline sync');
    }

    handleAppBackground() {
      // Reduce resource usage when app is in background
      console.log('[App] App backgrounded - reducing resource usage');
    }

    handleAppForeground() {
      // Resume normal operation
      console.log('[App] App foregrounded - resuming normal operation');
    }

    render() {
      const appContainer = document.getElementById('app');

      // Clear loading state
      appContainer.innerHTML = '';

      // Render functional demo screen
      appContainer.innerHTML = `
        <header style="padding: 1rem; background-color: var(--color-primary); color: white;">
          <h1>Solarpunk Utopia Platform</h1>
          <p>Liberation infrastructure for mutual aid communities</p>
        </header>

        <main style="padding: 1rem; flex: 1; max-width: 800px; margin: 0 auto;">
          <section style="margin-bottom: 2rem;">
            <h2>Community Features</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
              <button id="view-care-circles-btn" style="padding: 1.5rem; background-color: rgba(74, 157, 95, 0.2); color: inherit; border: 2px solid var(--color-primary); border-radius: 8px; cursor: pointer; text-align: left;">
                <h3 style="margin-bottom: 0.5rem;">Care Circles</h3>
                <p style="font-size: 0.875rem; opacity: 0.8;">Coordinate mutual care and support for community members</p>
              </button>
            </div>
          </section>

          <section style="margin-bottom: 2rem;">
            <h2>Resource Sharing (Demo)</h2>
            <p>Share items, tools, and resources with your community. No money, just mutual aid.</p>

            <div style="margin-top: 1rem; padding: 1rem; background-color: rgba(74, 157, 95, 0.1); border-radius: 4px;">
              <h3 style="margin-bottom: 0.5rem;">Add a Resource</h3>
              <form id="add-resource-form" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <input type="text" id="resource-title" placeholder="What are you sharing?" style="padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;">
                <textarea id="resource-description" placeholder="Description (optional)" rows="2" style="padding: 0.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: inherit;"></textarea>
                <button type="submit" style="padding: 0.5rem; background-color: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
                  Share Resource
                </button>
              </form>
            </div>

            <div style="margin-top: 1.5rem;">
              <h3>Available Resources</h3>
              <div id="resources-list" style="margin-top: 0.5rem;">
                <p style="opacity: 0.7;">Loading resources...</p>
              </div>
            </div>
          </section>

          <section style="margin-bottom: 2rem;">
            <h3>System Status</h3>
            <ul style="list-style: none; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <li>
                <strong>Network:</strong>
                <span id="network-status" style="${AppState.isOnline ? 'color: var(--color-success)' : 'color: var(--color-accent)'}">${AppState.isOnline ? '● Online' : '● Offline'}</span>
              </li>
              <li>
                <strong>Database:</strong>
                <span id="db-status">Initializing...</span>
              </li>
              <li>
                <strong>Battery:</strong>
                <span id="battery-status">Checking...</span>
              </li>
              <li id="sync-status" style="display: none;">
                <strong>Sync Queue:</strong>
                <span id="sync-count">0</span> operations pending
              </li>
            </ul>

            <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button id="export-btn" style="padding: 0.5rem 1rem; background-color: rgba(255,255,255,0.1); color: inherit; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer;">
                Export Data
              </button>
              <button id="import-btn" style="padding: 0.5rem 1rem; background-color: rgba(255,255,255,0.1); color: inherit; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer;">
                Import Data
              </button>
              <button id="stats-btn" style="padding: 0.5rem 1rem; background-color: rgba(255,255,255,0.1); color: inherit; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer;">
                View Stats
              </button>
            </div>
          </section>

          <section style="margin-top: 2rem; padding: 1rem; background-color: rgba(74, 157, 95, 0.1); border-radius: 4px;">
            <h3>Implementation Status</h3>
            <p style="margin-top: 0.5rem;">
              <strong>Phase 1 - Liberation Infrastructure:</strong><br>
              ✓ Offline-first database with CRDT support<br>
              ✓ Progressive Web App (installable)<br>
              ✓ Battery optimization<br>
              ✓ Data export/import<br>
              ✓ Runs on old Android phones via Termux
            </p>
            <p style="margin-top: 1rem;">
              <strong>Phase 2 - Trust Building (In Progress):</strong><br>
              ✓ Daily check-in prompts<br>
              ✓ "I'm okay" / "Need support" buttons<br>
              ✓ Missed check-in alerts<br>
              ✓ Emergency contact circles<br>
              ✓ Care circle formation
            </p>
          </section>
        </main>

        <footer style="padding: 1rem; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          <p style="font-size: 0.875rem; opacity: 0.8;">
            Building the new world in the shell of the old ✊
          </p>
        </footer>
      `;

      // Set up form handler
      this.setupResourceForm();

      // Load and display resources
      this.loadResources();

      // Set up export/import buttons
      this.setupDataButtons();

      // Set up care circles button
      this.setupCareCirclesButton();

      // Update status displays
      this.updateStatusDisplay();
      this.updateDatabaseStatus();
      this.updateBatteryStatus();
    }

    setupCareCirclesButton() {
      const careCirclesBtn = document.getElementById('view-care-circles-btn');
      if (careCirclesBtn) {
        careCirclesBtn.addEventListener('click', () => {
          this.showCareCircles();
        });
      }
    }

    showCareCircles() {
      const appContainer = document.getElementById('app');
      const mainContent = appContainer.querySelector('main');
      if (!mainContent) return;

      // Clear main content
      mainContent.innerHTML = `
        <div style="margin-bottom: 1rem;">
          <button id="back-to-home" style="padding: 0.5rem 1rem; background-color: rgba(255,255,255,0.1); color: inherit; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer;">
            ← Back to Home
          </button>
        </div>
        <div id="care-circles-container"></div>
      `;

      // Set up back button
      const backBtn = mainContent.querySelector('#back-to-home');
      if (backBtn) {
        backBtn.addEventListener('click', () => this.render());
      }

      // Render care circles dashboard
      const container = mainContent.querySelector('#care-circles-container');
      if (container && window.SolarpunkCareCirclesUI) {
        window.SolarpunkCareCirclesUI.renderDashboard(container);

        // Set up click handlers for circles
        container.addEventListener('click', async (e) => {
          const circleCard = e.target.closest('.circle-card');
          if (circleCard) {
            const circleId = circleCard.dataset.circleId;
            await window.SolarpunkCareCirclesUI.showCircleDetails(circleId, container);
          }
        });
      }
    }

    setupResourceForm() {
      const form = document.getElementById('add-resource-form');
      if (!form) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('resource-title').value.trim();
        const description = document.getElementById('resource-description').value.trim();

        if (!title) return;

        try {
          await window.SolarpunkDB.resources.create({
            title,
            description,
            type: 'item',
            status: 'available'
          });

          // Clear form
          document.getElementById('resource-title').value = '';
          document.getElementById('resource-description').value = '';

          // Reload resources
          this.loadResources();
        } catch (error) {
          console.error('[App] Failed to create resource:', error);
          alert('Failed to add resource');
        }
      });
    }

    async loadResources() {
      const listContainer = document.getElementById('resources-list');
      if (!listContainer) return;

      try {
        const resources = await window.SolarpunkDB.resources.getAll();

        if (resources.length === 0) {
          listContainer.innerHTML = '<p style="opacity: 0.7;">No resources yet. Be the first to share!</p>';
          return;
        }

        listContainer.innerHTML = resources.map(resource => `
          <div style="padding: 1rem; margin-bottom: 0.5rem; background-color: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid var(--color-primary);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <strong>${this.escapeHtml(resource.title)}</strong>
                ${resource.description ? `<p style="margin-top: 0.25rem; opacity: 0.8;">${this.escapeHtml(resource.description)}</p>` : ''}
                <p style="margin-top: 0.25rem; font-size: 0.875rem; opacity: 0.6;">
                  ${new Date(resource.timestamp).toLocaleDateString()} • ${resource.status}
                </p>
              </div>
              <button onclick="window.app.deleteResource('${resource.id}')" style="padding: 0.25rem 0.5rem; background-color: rgba(239,83,80,0.2); color: var(--color-error); border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                Delete
              </button>
            </div>
          </div>
        `).join('');
      } catch (error) {
        console.error('[App] Failed to load resources:', error);
        listContainer.innerHTML = '<p style="color: var(--color-error);">Failed to load resources</p>';
      }
    }

    async deleteResource(id) {
      try {
        await window.SolarpunkDB.resources.delete(id);
        this.loadResources();
      } catch (error) {
        console.error('[App] Failed to delete resource:', error);
        alert('Failed to delete resource');
      }
    }

    setupDataButtons() {
      const exportBtn = document.getElementById('export-btn');
      const importBtn = document.getElementById('import-btn');
      const statsBtn = document.getElementById('stats-btn');

      if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
          const result = await window.SolarpunkExport.exportToFile();
          if (result.success) {
            alert(`Data exported: ${result.filename}`);
          } else {
            alert(`Export failed: ${result.error}`);
          }
        });
      }

      if (importBtn) {
        importBtn.addEventListener('click', () => {
          const input = window.SolarpunkExport.createImportInput((result) => {
            if (result.success) {
              alert('Data imported successfully!');
              this.loadResources();
            } else {
              alert(`Import failed: ${result.error}`);
            }
          });
          input.click();
        });
      }

      if (statsBtn) {
        statsBtn.addEventListener('click', async () => {
          const stats = await window.SolarpunkDB.getStats();
          const statsText = Object.entries(stats.stores)
            .map(([store, count]) => `${store}: ${count}`)
            .join('\n');
          alert(`Database Stats:\n\n${statsText}\n\nNode ID: ${stats.nodeId}`);
        });
      }
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    async updateDatabaseStatus() {
      const statusEl = document.getElementById('db-status');
      if (!statusEl) return;

      if (window.SolarpunkDB && window.SolarpunkDB.isReady()) {
        const stats = await window.SolarpunkDB.getStats();
        const totalDocs = Object.values(stats.stores).reduce((a, b) => a + b, 0);
        statusEl.innerHTML = `<span style="color: var(--color-success)">● Ready</span> (${totalDocs} documents)`;

        // Check sync queue
        const syncQueue = await window.SolarpunkDB.getSyncQueue();
        if (syncQueue.length > 0) {
          document.getElementById('sync-status').style.display = 'list-item';
          document.getElementById('sync-count').textContent = syncQueue.length;
        }
      } else {
        statusEl.innerHTML = '<span style="color: var(--color-error)">● Not available</span>';
      }
    }

    async updateBatteryStatus() {
      const statusEl = document.getElementById('battery-status');
      if (!statusEl) return;

      if (window.SolarpunkBattery && window.SolarpunkBattery.manager.battery) {
        const state = window.SolarpunkBattery.getState();
        const level = Math.round(state.level * 100);
        const charging = state.charging ? ' (charging)' : '';
        const mode = state.isCritical ? ' [CRITICAL]' : state.isLowPower ? ' [LOW POWER]' : '';
        statusEl.textContent = `${level}%${charging}${mode}`;
      } else {
        statusEl.textContent = 'Not available';
      }
    }

    updateStatusDisplay() {
      const networkStatus = document.getElementById('network-status');
      if (networkStatus) {
        networkStatus.textContent = AppState.isOnline ? 'Online' : 'Offline';
        networkStatus.style.color = AppState.isOnline ? 'var(--color-secondary)' : 'var(--color-accent)';
      }
    }
  }

  // Initialize app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  function initApp() {
    const app = new SolarpunkApp();
    // Export app instance globally for button handlers
    window.app = app;
    app.init().catch((error) => {
      console.error('[App] Initialization failed:', error);
    });
  }

})();
