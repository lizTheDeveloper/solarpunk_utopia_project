/**
 * Network Manager - Coordinates all mesh networking transports
 * REQ-DEPLOY-008: Peer-to-Peer Synchronization
 * REQ-DEPLOY-006: Meshtastic Integration
 */

import type {
  NetworkAdapter,
  NetworkConfig,
  MeshMessage,
  Peer,
  TransportType,
  MessageType,
  ConnectionStatus
} from '../types/network.js';
import type { LocalDatabase } from '../core/database.js';
import { DTNManager } from './dtn/DTNManager.js';
import * as Automerge from '@automerge/automerge';

/**
 * Manages all network transports and coordinates peer-to-peer sync
 */
export class NetworkManager {
  private adapters: Map<TransportType, NetworkAdapter> = new Map();
  private peers: Map<string, Peer> = new Map();
  private database: LocalDatabase;
  private dtnManager: DTNManager;
  private config: NetworkConfig;
  private messageHandlers: Map<MessageType, (msg: MeshMessage, peer: Peer) => void> = new Map();

  constructor(database: LocalDatabase, config: NetworkConfig) {
    this.database = database;
    this.config = config;
    this.dtnManager = new DTNManager(this);

    // Register default message handlers
    this.registerMessageHandler('sync-request', this.handleSyncRequest.bind(this));
    this.registerMessageHandler('sync-response', this.handleSyncResponse.bind(this));
    this.registerMessageHandler('ping', this.handlePing.bind(this));
    this.registerMessageHandler('announce', this.handleAnnounce.bind(this));
  }

  /**
   * Initialize all enabled network adapters
   */
  async start(): Promise<void> {
    // Start enabled transports
    for (const transportType of this.config.enabledTransports) {
      await this.enableTransport(transportType);
    }

    // Start DTN manager if enabled
    if (this.config.dtnEnabled) {
      await this.dtnManager.start();
    }

    console.log(`NetworkManager started with transports: ${this.config.enabledTransports.join(', ')}`);
  }

  /**
   * Enable a specific transport type
   */
  async enableTransport(type: TransportType): Promise<void> {
    if (this.adapters.has(type)) {
      console.warn(`Transport ${type} already enabled`);
      return;
    }

    let adapter: NetworkAdapter;

    switch (type) {
      case 'bluetooth':
        // Import dynamically to reduce initial bundle size
        const { BluetoothAdapter } = await import('./adapters/BluetoothAdapter.js');
        adapter = new BluetoothAdapter(this.config.bluetooth!);
        break;

      case 'wifi-direct':
        const { WiFiDirectAdapter } = await import('./adapters/WiFiDirectAdapter.js');
        adapter = new WiFiDirectAdapter(this.config.wifiDirect!);
        break;

      case 'meshtastic':
        const { MeshtasticAdapter } = await import('./adapters/MeshtasticAdapter.js');
        adapter = new MeshtasticAdapter(this.config.meshtastic!);
        break;

      case 'websocket':
        // For internet connectivity (future)
        console.warn('WebSocket adapter not yet implemented');
        return;

      case 'broadcast-channel':
        // Already handled by Automerge repo for cross-tab sync
        return;

      default:
        console.warn(`Unknown transport type: ${type}`);
        return;
    }

    // Register event handlers
    adapter.onMessage((msg, peer) => this.handleMessage(msg, peer));
    adapter.onPeerDiscovered((peer) => this.handlePeerDiscovered(peer));
    adapter.onPeerLost((peerId) => this.handlePeerLost(peerId));

    // Start the adapter
    await adapter.start();

    this.adapters.set(type, adapter);
    console.log(`Enabled transport: ${type}`);
  }

  /**
   * Disable a transport
   */
  async disableTransport(type: TransportType): Promise<void> {
    const adapter = this.adapters.get(type);
    if (adapter) {
      await adapter.stop();
      this.adapters.delete(type);
      console.log(`Disabled transport: ${type}`);
    }
  }

  /**
   * Get status of all transports
   */
  getTransportStatus(): Map<TransportType, ConnectionStatus> {
    const status = new Map<TransportType, ConnectionStatus>();
    for (const [type, adapter] of this.adapters) {
      status.set(type, adapter.status);
    }
    return status;
  }

  /**
   * Get all discovered peers
   */
  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get count of connected peers
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Send message to specific peer or broadcast
   */
  async sendMessage(message: MeshMessage, peerId?: string): Promise<void> {
    if (peerId) {
      // Send to specific peer via their transport
      const peer = this.peers.get(peerId);
      if (!peer) {
        console.warn(`Peer ${peerId} not found`);
        return;
      }

      const adapter = this.adapters.get(peer.transport);
      if (adapter) {
        await adapter.send(message, peerId);
      }
    } else {
      // Broadcast to all transports
      for (const adapter of this.adapters.values()) {
        await adapter.send(message);
      }
    }
  }

  /**
   * Register custom message handler
   */
  registerMessageHandler(type: MessageType, handler: (msg: MeshMessage, peer: Peer) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: MeshMessage, peer: Peer): void {
    console.log(`Received ${message.type} from ${peer.id}`);

    // Update peer last seen
    peer.lastSeen = Date.now();
    this.peers.set(peer.id, peer);

    // Call registered handler
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message, peer);
    } else {
      console.warn(`No handler for message type: ${message.type}`);
    }
  }

  /**
   * Handle peer discovery
   */
  private handlePeerDiscovered(peer: Peer): void {
    console.log(`Discovered peer: ${peer.id} via ${peer.transport}`);
    this.peers.set(peer.id, peer);

    // Send announcement
    this.sendAnnouncement(peer.id);

    // Request sync
    this.requestSync(peer.id);
  }

  /**
   * Handle peer disconnect
   */
  private handlePeerLost(peerId: string): void {
    console.log(`Lost peer: ${peerId}`);
    this.peers.delete(peerId);
  }

  /**
   * Send announcement to peer
   */
  private async sendAnnouncement(peerId?: string): Promise<void> {
    const message: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'announce',
      from: this.config.peerId,
      to: peerId,
      timestamp: Date.now(),
      ttl: 3,
      payload: new TextEncoder().encode(JSON.stringify({
        displayName: 'Anonymous', // TODO: Get from user profile
        capabilities: Array.from(this.adapters.keys())
      }))
    };

    await this.sendMessage(message, peerId);
  }

  /**
   * Handle announcement from peer
   */
  private handleAnnounce(message: MeshMessage, peer: Peer): void {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.payload));
      console.log(`Peer ${peer.id} announced:`, data);
      // TODO: Update peer information
    } catch (e) {
      console.error('Failed to parse announcement:', e);
    }
  }

  /**
   * Request sync from peer
   */
  private async requestSync(peerId: string): Promise<void> {
    const message: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'sync-request',
      from: this.config.peerId,
      to: peerId,
      timestamp: Date.now(),
      ttl: 1, // Direct only
      payload: new Uint8Array() // Empty for now
    };

    await this.sendMessage(message, peerId);
  }

  /**
   * Handle sync request from peer
   */
  private async handleSyncRequest(message: MeshMessage, peer: Peer): Promise<void> {
    // Get current database state
    const binary = this.database.getBinary();

    // Send sync response with our data
    const response: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'sync-response',
      from: this.config.peerId,
      to: message.from,
      timestamp: Date.now(),
      ttl: 1,
      payload: binary
    };

    await this.sendMessage(response, message.from);
    console.log(`Sent sync response to ${message.from}`);
  }

  /**
   * Handle sync response from peer
   */
  private async handleSyncResponse(message: MeshMessage, peer: Peer): Promise<void> {
    try {
      // Merge remote data into our database
      await this.database.merge(message.payload);
      console.log(`Merged data from ${peer.id}`);
    } catch (e) {
      console.error('Failed to merge sync data:', e);
    }
  }

  /**
   * Handle ping (keep-alive)
   */
  private async handlePing(message: MeshMessage, peer: Peer): Promise<void> {
    // Send pong response
    const response: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'pong',
      from: this.config.peerId,
      to: message.from,
      timestamp: Date.now(),
      ttl: 1,
      payload: new Uint8Array()
    };

    await this.sendMessage(response, message.from);
  }

  /**
   * Get DTN manager (for store-and-forward)
   */
  getDTNManager(): DTNManager {
    return this.dtnManager;
  }

  /**
   * Stop all transports
   */
  async stop(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.stop();
    }
    this.adapters.clear();
    this.peers.clear();

    if (this.config.dtnEnabled) {
      await this.dtnManager.stop();
    }

    console.log('NetworkManager stopped');
  }
}
