/**
 * Application Manager - Coordinates all platform systems
 *
 * Integrates:
 * - Local-first database (Phase 1A)
 * - Identity management with DIDs (Phase 1D)
 * - Network manager for peer sync (Phase 1B)
 * - Privacy controls (Phase 1D)
 */

import { db, LocalDatabase } from './database.js';
import { IdentityManager } from '../identity/IdentityManager.js';
import { NetworkManager } from '../network/NetworkManager.js';
import type { NetworkConfig } from '../types/network.js';
import type { SyncStatus } from '../types/index.js';

/**
 * Application initialization state
 */
export interface AppState {
  databaseReady: boolean;
  identityLoaded: boolean;
  networkEnabled: boolean;
  isOffline: boolean;
}

/**
 * Central application manager
 */
export class AppManager {
  private database: LocalDatabase;
  private identityManager: IdentityManager;
  private networkManager: NetworkManager | null = null;
  private state: AppState = {
    databaseReady: false,
    identityLoaded: false,
    networkEnabled: false,
    isOffline: !navigator.onLine
  };

  constructor() {
    this.database = db;
    this.identityManager = new IdentityManager(this.database);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<AppState> {
    console.log('🌻 Initializing Solarpunk Utopia Platform...');

    // Initialize database
    await this.database.init();
    this.state.databaseReady = true;
    console.log('✓ Database ready');

    // Try to load existing identity
    // If no identity, app will prompt user to create one
    const savedIdentity = localStorage.getItem('identity');
    if (savedIdentity) {
      this.state.identityLoaded = true;
      console.log('✓ Identity found (login required)');
    } else {
      console.log('○ No identity found (new user)');
    }

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnlineStatus.bind(this));
    window.addEventListener('offline', this.handleOnlineStatus.bind(this));

    console.log('✓ Application initialized');
    return this.state;
  }

  /**
   * Get current application state
   */
  getState(): AppState {
    return { ...this.state };
  }

  /**
   * Get identity manager
   */
  getIdentityManager(): IdentityManager {
    return this.identityManager;
  }

  /**
   * Get database instance
   */
  getDatabase(): LocalDatabase {
    return this.database;
  }

  /**
   * Get network manager (if enabled)
   */
  getNetworkManager(): NetworkManager | null {
    return this.networkManager;
  }

  /**
   * Enable networking (Phase 1B features)
   */
  async enableNetworking(config?: Partial<NetworkConfig>): Promise<void> {
    if (this.networkManager) {
      console.warn('Network already enabled');
      return;
    }

    const identity = this.identityManager.getCurrentIdentity();
    if (!identity) {
      throw new Error('Cannot enable networking without authenticated identity');
    }

    // Default network configuration
    const networkConfig: NetworkConfig = {
      enabledTransports: ['broadcast-channel'], // Start with cross-tab sync
      peerId: identity.did,
      dtnEnabled: false,
      ...config
    };

    this.networkManager = new NetworkManager(this.database, networkConfig);
    await this.networkManager.start();

    this.state.networkEnabled = true;
    console.log('✓ Networking enabled');
  }

  /**
   * Disable networking
   */
  async disableNetworking(): Promise<void> {
    if (this.networkManager) {
      await this.networkManager.stop();
      this.networkManager = null;
      this.state.networkEnabled = false;
      console.log('✓ Networking disabled');
    }
  }

  /**
   * Get comprehensive sync status
   */
  getSyncStatus(): SyncStatus {
    const baseSyncStatus = this.database.getSyncStatus();

    if (this.networkManager) {
      return {
        ...baseSyncStatus,
        connectedPeers: this.networkManager.getPeerCount()
      };
    }

    return baseSyncStatus;
  }

  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatus(): void {
    const wasOffline = this.state.isOffline;
    this.state.isOffline = !navigator.onLine;

    if (wasOffline && !this.state.isOffline) {
      console.log('🌐 Back online');
      // TODO: Trigger sync if network is enabled
    } else if (!wasOffline && this.state.isOffline) {
      console.log('📡 Gone offline');
    }
  }

  /**
   * Shutdown application gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down application...');

    if (this.networkManager) {
      await this.networkManager.stop();
    }

    await this.database.close();

    console.log('Application shut down');
  }
}

// Singleton instance
export const app = new AppManager();
