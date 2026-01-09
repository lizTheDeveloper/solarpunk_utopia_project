/**
 * Network module exports
 * Mesh networking implementation for Phase I, Group B
 * Integrated with Phase I, Group D (Identity & Encryption)
 */

export { NetworkManager } from './NetworkManager.js';
export { SecureNetworkManager, initializeSecureNetworking } from './SecureNetworkManager.js';
export { DTNManager } from './dtn/DTNManager.js';
export { BluetoothAdapter } from './adapters/BluetoothAdapter.js';
export { WiFiDirectAdapter } from './adapters/WiFiDirectAdapter.js';
export { MeshtasticAdapter } from './adapters/MeshtasticAdapter.js';

export type {
  NetworkConfig,
  NetworkAdapter,
  MeshMessage,
  Peer,
  DTNBundle,
  TransportType,
  ConnectionStatus,
  MessageType,
  BluetoothConfig,
  WiFiDirectConfig,
  MeshtasticConfig
} from '../types/network.js';

/**
 * Create and initialize network manager with sensible defaults
 */
import type { LocalDatabase } from '../core/database.js';
import type { NetworkConfig } from '../types/network.js';
import { NetworkManager } from './NetworkManager.js';

export async function initializeNetworking(
  database: LocalDatabase,
  options: Partial<NetworkConfig> = {}
): Promise<NetworkManager> {
  // Generate or load peer ID
  let peerId = localStorage.getItem('solarpunk-peer-id');
  if (!peerId) {
    peerId = crypto.randomUUID();
    localStorage.setItem('solarpunk-peer-id', peerId);
  }

  // Default configuration
  const config: NetworkConfig = {
    peerId,
    enabledTransports: options.enabledTransports || ['bluetooth', 'wifi-direct'],
    dtnEnabled: options.dtnEnabled !== false, // Default true
    ...options
  };

  // Create network manager
  const networkManager = new NetworkManager(database, config);

  // Start networking
  await networkManager.start();

  console.log('Networking initialized:', {
    peerId,
    transports: config.enabledTransports,
    dtn: config.dtnEnabled
  });

  return networkManager;
}

/**
 * Initialize with all available transports (prompts for permissions)
 */
export async function initializeFullMesh(database: LocalDatabase): Promise<NetworkManager> {
  return initializeNetworking(database, {
    enabledTransports: ['bluetooth', 'wifi-direct', 'meshtastic'],
    dtnEnabled: true
  });
}

/**
 * Initialize for local network only (no Bluetooth or Meshtastic permissions needed)
 */
export async function initializeLocalOnly(database: LocalDatabase): Promise<NetworkManager> {
  return initializeNetworking(database, {
    enabledTransports: ['wifi-direct', 'broadcast-channel'],
    dtnEnabled: true
  });
}

/**
 * Initialize for long-range mesh only (Meshtastic)
 */
export async function initializeLongRangeMesh(database: LocalDatabase): Promise<NetworkManager> {
  return initializeNetworking(database, {
    enabledTransports: ['meshtastic'],
    dtnEnabled: true,
    meshtastic: {
      channel: 0,
      region: 'US'
    }
  });
}
