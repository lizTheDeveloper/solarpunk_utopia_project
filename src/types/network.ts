/**
 * Network and mesh types for peer-to-peer communication
 * Supports Bluetooth, WiFi Direct, Meshtastic, and DTN
 */

/**
 * Transport mechanisms for peer communication
 */
export type TransportType =
  | 'bluetooth' // BLE peer discovery and sync
  | 'wifi-direct' // Local network P2P
  | 'meshtastic' // LoRa mesh via Meshtastic devices
  | 'websocket' // For internet connectivity
  | 'broadcast-channel'; // Browser tab sync

/**
 * Connection status for a transport
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Peer information
 */
export interface Peer {
  id: string;
  displayName?: string;
  transport: TransportType;
  lastSeen: number;
  distance?: number; // For proximity-based transports
  signalStrength?: number; // RSSI for BLE/LoRa
}

/**
 * Message types for mesh communication
 */
export type MessageType =
  | 'sync-request' // Request data sync
  | 'sync-response' // Respond with sync data
  | 'ping' // Keep-alive
  | 'pong' // Keep-alive response
  | 'announce' // Peer announcement
  | 'data' // General data message
  | 'dtn-bundle'; // DTN bundle for store-and-forward

/**
 * Message envelope for mesh communication
 */
export interface MeshMessage {
  id: string;
  type: MessageType;
  from: string; // Peer ID
  to?: string; // Optional specific recipient
  timestamp: number;
  ttl: number; // Time to live (hops for mesh)
  payload: Uint8Array; // Encrypted payload
  signature?: Uint8Array; // Message signature for authenticity
}

/**
 * DTN Bundle for delay-tolerant networking
 */
export interface DTNBundle {
  id: string;
  source: string;
  destination?: string; // Optional, for broadcast
  created: number;
  expiresAt: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  payload: Uint8Array;
  metadata: {
    hopCount: number;
    path: string[]; // Peer IDs the bundle has traversed
  };
}

/**
 * Network adapter interface - implements a transport mechanism
 */
export interface NetworkAdapter {
  type: TransportType;
  status: ConnectionStatus;

  /**
   * Initialize and start the adapter
   */
  start(): Promise<void>;

  /**
   * Stop and cleanup the adapter
   */
  stop(): Promise<void>;

  /**
   * Discover nearby peers
   */
  discoverPeers(): Promise<Peer[]>;

  /**
   * Send message to a peer or broadcast
   */
  send(message: MeshMessage, peerId?: string): Promise<void>;

  /**
   * Register callback for received messages
   */
  onMessage(callback: (message: MeshMessage, peer: Peer) => void): void;

  /**
   * Register callback for peer discovery
   */
  onPeerDiscovered(callback: (peer: Peer) => void): void;

  /**
   * Register callback for peer disconnect
   */
  onPeerLost(callback: (peerId: string) => void): void;
}

/**
 * Meshtastic-specific configuration
 */
export interface MeshtasticConfig {
  devicePath?: string; // Serial port path (for Termux)
  baudRate?: number;
  channel?: number;
  region?: string; // Regulatory region for LoRa
}

/**
 * Bluetooth-specific configuration
 */
export interface BluetoothConfig {
  serviceUUID: string;
  characteristicUUID: string;
  scanDuration?: number; // milliseconds
}

/**
 * WiFi Direct configuration
 */
export interface WiFiDirectConfig {
  discoveryPort: number;
  transferPort: number;
  multicastGroup?: string;
}

/**
 * Network manager configuration
 */
export interface NetworkConfig {
  enabledTransports: TransportType[];
  peerId: string;
  meshtastic?: MeshtasticConfig;
  bluetooth?: BluetoothConfig;
  wifiDirect?: WiFiDirectConfig;
  dtnEnabled: boolean;
}

/**
 * Sync protocol message for CRDT synchronization
 */
export interface SyncMessage {
  documentId: string;
  changes: Uint8Array; // Automerge changes
  timestamp: number;
}
