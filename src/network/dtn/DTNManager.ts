/**
 * Delay Tolerant Networking Manager
 * REQ-DEPLOY-007: DTN for disrupted network environments
 *
 * Implements store-and-forward messaging for intermittent connectivity
 */

import type { DTNBundle, MeshMessage, Peer } from '../../types/network.js';
import type { NetworkManager } from '../NetworkManager.js';
import { openDB, type IDBPDatabase } from 'idb';

const DTN_DB_NAME = 'solarpunk-dtn';
const DTN_DB_VERSION = 1;
const BUNDLE_STORE = 'bundles';

/**
 * DTN Manager handles bundle storage and forwarding
 */
export class DTNManager {
  private db: IDBPDatabase | null = null;
  private networkManager: NetworkManager;
  private forwardingInterval: number | null = null;
  private bundles: Map<string, DTNBundle> = new Map();

  constructor(networkManager: NetworkManager) {
    this.networkManager = networkManager;
  }

  /**
   * Initialize DTN storage
   */
  async start(): Promise<void> {
    this.db = await openDB(DTN_DB_NAME, DTN_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(BUNDLE_STORE)) {
          const store = db.createObjectStore(BUNDLE_STORE, { keyPath: 'id' });
          store.createIndex('expiresAt', 'expiresAt');
          store.createIndex('priority', 'priority');
        }
      }
    });

    // Load existing bundles
    await this.loadBundles();

    // Start periodic forwarding
    this.forwardingInterval = window.setInterval(() => {
      this.forwardBundles();
    }, 30000); // Every 30 seconds

    // Clean expired bundles
    this.cleanExpiredBundles();

    console.log('DTN Manager started');
  }

  /**
   * Load bundles from IndexedDB
   */
  private async loadBundles(): Promise<void> {
    if (!this.db) return;

    const allBundles = await this.db.getAll(BUNDLE_STORE);
    for (const bundle of allBundles) {
      this.bundles.set(bundle.id, bundle);
    }

    console.log(`Loaded ${this.bundles.size} DTN bundles`);
  }

  /**
   * Create and store a new DTN bundle
   */
  async createBundle(
    destination: string | undefined,
    payload: Uint8Array,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    ttl: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
  ): Promise<DTNBundle> {
    const bundle: DTNBundle = {
      id: crypto.randomUUID(),
      source: 'self', // TODO: Use actual peer ID
      destination,
      created: Date.now(),
      expiresAt: Date.now() + ttl,
      priority,
      payload,
      metadata: {
        hopCount: 0,
        path: []
      }
    };

    // Store bundle
    await this.storeBundle(bundle);

    // Attempt immediate forwarding
    await this.forwardBundle(bundle);

    return bundle;
  }

  /**
   * Store bundle in IndexedDB and memory
   */
  private async storeBundle(bundle: DTNBundle): Promise<void> {
    this.bundles.set(bundle.id, bundle);

    if (this.db) {
      await this.db.put(BUNDLE_STORE, bundle);
    }
  }

  /**
   * Receive bundle from another peer
   */
  async receiveBundle(bundle: DTNBundle, fromPeer: string): Promise<void> {
    // Check if bundle already exists (loop prevention)
    if (this.bundles.has(bundle.id)) {
      console.log(`Bundle ${bundle.id} already received, ignoring`);
      return;
    }

    // Check if expired
    if (bundle.expiresAt < Date.now()) {
      console.log(`Bundle ${bundle.id} expired, discarding`);
      return;
    }

    // Update metadata
    bundle.metadata.hopCount++;
    bundle.metadata.path.push(fromPeer);

    // Store bundle
    await this.storeBundle(bundle);

    console.log(`Received bundle ${bundle.id} from ${fromPeer}`);

    // Check if bundle is for us
    if (!bundle.destination || bundle.destination === 'self') {
      // Process bundle (unwrap payload)
      await this.processBundle(bundle);
    } else {
      // Forward to destination
      await this.forwardBundle(bundle);
    }
  }

  /**
   * Process bundle addressed to us
   */
  private async processBundle(bundle: DTNBundle): Promise<void> {
    console.log(`Processing bundle ${bundle.id}`);

    try {
      // Decode as MeshMessage
      const data = JSON.parse(new TextDecoder().decode(bundle.payload));
      console.log('Bundle contents:', data);

      // TODO: Handle bundle contents (e.g., sync data, messages)

      // Remove bundle after processing
      await this.removeBundle(bundle.id);
    } catch (e) {
      console.error('Failed to process bundle:', e);
    }
  }

  /**
   * Forward a single bundle to available peers
   */
  private async forwardBundle(bundle: DTNBundle): Promise<void> {
    const peers = this.networkManager.getPeers();

    if (peers.length === 0) {
      console.log('No peers available for bundle forwarding');
      return;
    }

    // Filter peers that haven't seen this bundle
    const eligiblePeers = peers.filter(
      (peer) => !bundle.metadata.path.includes(peer.id)
    );

    if (eligiblePeers.length === 0) {
      console.log(`Bundle ${bundle.id} already forwarded to all known peers`);
      return;
    }

    // Create DTN bundle message
    const message: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'dtn-bundle',
      from: 'self',
      timestamp: Date.now(),
      ttl: 10,
      payload: new TextEncoder().encode(JSON.stringify(bundle))
    };

    // Forward to eligible peers (or select subset based on priority/routing)
    for (const peer of eligiblePeers) {
      try {
        await this.networkManager.sendMessage(message, peer.id);
        console.log(`Forwarded bundle ${bundle.id} to ${peer.id}`);
      } catch (e) {
        console.error(`Failed to forward bundle to ${peer.id}:`, e);
      }
    }
  }

  /**
   * Forward all pending bundles to available peers
   */
  private async forwardBundles(): Promise<void> {
    const peers = this.networkManager.getPeers();

    if (peers.length === 0) {
      return;
    }

    // Sort bundles by priority
    const sortedBundles = Array.from(this.bundles.values()).sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const bundle of sortedBundles) {
      await this.forwardBundle(bundle);
    }
  }

  /**
   * Remove expired bundles
   */
  private async cleanExpiredBundles(): Promise<void> {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, bundle] of this.bundles) {
      if (bundle.expiresAt < now) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      await this.removeBundle(id);
    }

    if (expired.length > 0) {
      console.log(`Cleaned ${expired.length} expired bundles`);
    }

    // Schedule next cleanup
    setTimeout(() => this.cleanExpiredBundles(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Remove bundle from storage
   */
  private async removeBundle(id: string): Promise<void> {
    this.bundles.delete(id);

    if (this.db) {
      await this.db.delete(BUNDLE_STORE, id);
    }
  }

  /**
   * Get all bundles
   */
  getBundles(): DTNBundle[] {
    return Array.from(this.bundles.values());
  }

  /**
   * Get bundle count by priority
   */
  getBundleStats(): Record<string, number> {
    const stats = { critical: 0, high: 0, normal: 0, low: 0, total: 0 };

    for (const bundle of this.bundles.values()) {
      stats[bundle.priority]++;
      stats.total++;
    }

    return stats;
  }

  /**
   * Stop DTN manager
   */
  async stop(): Promise<void> {
    if (this.forwardingInterval) {
      clearInterval(this.forwardingInterval);
      this.forwardingInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.bundles.clear();
    console.log('DTN Manager stopped');
  }
}
