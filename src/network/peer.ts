/**
 * Peer discovery and connection management
 *
 * Supports multiple transports:
 * - WebRTC (local network and internet)
 * - Bluetooth (future)
 * - Meshtastic (future)
 */

/**
 * Peer information
 */
export interface PeerInfo {
  peerId: string;
  did?: string; // DID if authenticated
  transports: TransportType[];
  lastSeen: number;
  trusted: boolean;
  communityId?: string;
}

/**
 * Transport types
 */
export type TransportType = 'webrtc' | 'bluetooth' | 'meshtastic';

/**
 * Connection interface
 */
export interface Connection {
  peerId: string;
  transport: TransportType;
  send(data: Uint8Array): Promise<void>;
  receive(): AsyncIterableIterator<Uint8Array>;
  close(): Promise<void>;
  isConnected(): boolean;
}

/**
 * Transport interface
 */
export interface Transport {
  name: TransportType;
  connect(peerId: string): Promise<Connection>;
  listen(): AsyncIterableIterator<Connection>;
  disconnect(): Promise<void>;
}

/**
 * Peer manager
 */
export class PeerManager {
  private knownPeers: Map<string, PeerInfo> = new Map();
  private activeConnections: Map<string, Connection> = new Map();
  private transports: Map<TransportType, Transport> = new Map();

  /**
   * Register a transport
   */
  registerTransport(transport: Transport): void {
    this.transports.set(transport.name, transport);
  }

  /**
   * Discover peers (placeholder - real implementation would use mDNS, BLE, etc.)
   */
  async discoverPeers(): Promise<PeerInfo[]> {
    // TODO: Implement actual peer discovery
    // - mDNS/DNS-SD for local network
    // - BLE advertisement scanning
    // - Meshtastic network query

    return Array.from(this.knownPeers.values());
  }

  /**
   * Add known peer
   */
  addKnownPeer(peer: PeerInfo): void {
    this.knownPeers.set(peer.peerId, peer);
  }

  /**
   * Get known peers
   */
  getKnownPeers(): PeerInfo[] {
    return Array.from(this.knownPeers.values());
  }

  /**
   * Connect to peer
   */
  async connectToPeer(peerId: string, transportType?: TransportType): Promise<Connection> {
    // Check if already connected
    const existing = this.activeConnections.get(peerId);
    if (existing && existing.isConnected()) {
      return existing;
    }

    const peer = this.knownPeers.get(peerId);
    if (!peer) {
      throw new Error(`Unknown peer: ${peerId}`);
    }

    // Determine transport to use
    const transport = transportType
      ? this.transports.get(transportType)
      : this.selectBestTransport(peer);

    if (!transport) {
      throw new Error('No suitable transport available');
    }

    // Connect
    const connection = await transport.connect(peerId);
    this.activeConnections.set(peerId, connection);

    // Update last seen
    peer.lastSeen = Date.now();

    return connection;
  }

  /**
   * Get active connection to peer
   */
  getConnection(peerId: string): Connection | undefined {
    return this.activeConnections.get(peerId);
  }

  /**
   * Disconnect from peer
   */
  async disconnectFromPeer(peerId: string): Promise<void> {
    const connection = this.activeConnections.get(peerId);
    if (connection) {
      await connection.close();
      this.activeConnections.delete(peerId);
    }
  }

  /**
   * Listen for incoming connections
   */
  async *listenForConnections(): AsyncIterableIterator<Connection> {
    // Listen on all registered transports
    const listeners = Array.from(this.transports.values()).map(t => t.listen());

    // Merge all connection streams
    while (true) {
      const results = await Promise.race(
        listeners.map(async (listener, idx) => {
          const result = await listener.next();
          return { idx, result };
        })
      );

      if (results.result.done) {
        break;
      }

      const connection = results.result.value;
      this.activeConnections.set(connection.peerId, connection);

      yield connection;
    }
  }

  /**
   * Select best transport for peer
   */
  private selectBestTransport(peer: PeerInfo): Transport | undefined {
    // Prefer WebRTC for bandwidth, then Bluetooth, then Meshtastic
    const preferredOrder: TransportType[] = ['webrtc', 'bluetooth', 'meshtastic'];

    for (const transportType of preferredOrder) {
      if (peer.transports.includes(transportType)) {
        const transport = this.transports.get(transportType);
        if (transport) {
          return transport;
        }
      }
    }

    return undefined;
  }

  /**
   * Get number of active connections
   */
  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Cleanup disconnected connections
   */
  cleanup(): void {
    for (const [peerId, connection] of this.activeConnections.entries()) {
      if (!connection.isConnected()) {
        this.activeConnections.delete(peerId);
      }
    }
  }
}

/**
 * WebRTC Transport (placeholder)
 */
export class WebRTCTransport implements Transport {
  name: TransportType = 'webrtc';

  async connect(peerId: string): Promise<Connection> {
    // TODO: Implement WebRTC connection using simple-peer or similar
    throw new Error('WebRTC transport not yet implemented');
  }

  async *listen(): AsyncIterableIterator<Connection> {
    // TODO: Implement WebRTC listener
    throw new Error('WebRTC transport not yet implemented');
  }

  async disconnect(): Promise<void> {
    // Cleanup
  }
}

/**
 * Meshtastic Transport (stub for future)
 */
export class MeshtasticTransport implements Transport {
  name: TransportType = 'meshtastic';

  async connect(peerId: string): Promise<Connection> {
    throw new Error('Meshtastic transport not yet implemented');
  }

  async *listen(): AsyncIterableIterator<Connection> {
    throw new Error('Meshtastic transport not yet implemented');
  }

  async disconnect(): Promise<void> {
    // Cleanup
  }
}
