/**
 * Bluetooth Low Energy (BLE) Network Adapter
 * Enables peer discovery and data sync via Bluetooth
 *
 * REQ-DEPLOY-008: Peer-to-Peer Synchronization
 * Part of Phase I, Group B: Bluetooth proximity sync
 */

import type {
  NetworkAdapter,
  BluetoothConfig,
  MeshMessage,
  Peer,
  ConnectionStatus
} from '../../types/network.js';

// Service UUID for Solarpunk Platform
const SOLARPUNK_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write
const RX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify

/**
 * Bluetooth LE adapter for proximity-based peer sync
 */
export class BluetoothAdapter implements NetworkAdapter {
  type = 'bluetooth' as const;
  status: ConnectionStatus = 'disconnected';

  private config: BluetoothConfig;
  private server: BluetoothRemoteGATTServer | null = null;
  private connectedDevices: Map<string, BluetoothDevice> = new Map();
  private characteristics: Map<string, BluetoothRemoteGATTCharacteristic> = new Map();

  private messageCallback: ((message: MeshMessage, peer: Peer) => void) | null = null;
  private peerDiscoveredCallback: ((peer: Peer) => void) | null = null;
  private peerLostCallback: ((peerId: string) => void) | null = null;

  constructor(config: BluetoothConfig) {
    this.config = {
      serviceUUID: config.serviceUUID || SOLARPUNK_SERVICE_UUID,
      characteristicUUID: config.characteristicUUID || RX_CHARACTERISTIC_UUID,
      scanDuration: config.scanDuration || 10000
    };
  }

  /**
   * Start Bluetooth adapter
   */
  async start(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API not available');
    }

    this.status = 'connecting';

    try {
      // Start as peripheral (server) mode if supported
      // Note: Web Bluetooth Peripheral API is limited, so we primarily act as central

      // Begin scanning for peers
      console.log('Bluetooth adapter started (central mode)');
      this.status = 'connected';

      // Note: Actual scanning happens in discoverPeers()
      // Web Bluetooth requires user gesture for requestDevice()
    } catch (error) {
      console.error('Failed to start Bluetooth adapter:', error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Stop Bluetooth adapter
   */
  async stop(): Promise<void> {
    // Disconnect all devices
    for (const [id, device] of this.connectedDevices) {
      try {
        if (device.gatt?.connected) {
          device.gatt.disconnect();
        }
      } catch (e) {
        console.error(`Error disconnecting device ${id}:`, e);
      }
    }

    this.connectedDevices.clear();
    this.characteristics.clear();
    this.status = 'disconnected';

    console.log('Bluetooth adapter stopped');
  }

  /**
   * Discover nearby Bluetooth peers
   * Note: Requires user interaction due to Web Bluetooth security
   */
  async discoverPeers(): Promise<Peer[]> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth not available');
    }

    try {
      // Request device with Solarpunk service filter
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.config.serviceUUID] }],
        optionalServices: [this.config.serviceUUID]
      });

      if (!device) {
        return [];
      }

      // Connect to device
      await this.connectToDevice(device);

      // Create peer object
      const peer: Peer = {
        id: device.id,
        displayName: device.name || 'Unknown',
        transport: 'bluetooth',
        lastSeen: Date.now()
      };

      // Notify discovery
      if (this.peerDiscoveredCallback) {
        this.peerDiscoveredCallback(peer);
      }

      return [peer];
    } catch (error) {
      // User cancelled or error occurred
      console.log('Bluetooth device discovery cancelled or failed:', error);
      return [];
    }
  }

  /**
   * Connect to a Bluetooth device
   */
  private async connectToDevice(device: BluetoothDevice): Promise<void> {
    try {
      // Setup disconnect handler
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDeviceDisconnected(device.id);
      });

      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Get Solarpunk service
      const service = await server.getPrimaryService(this.config.serviceUUID);

      // Get RX characteristic (for receiving data)
      const rxCharacteristic = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);

      // Setup notification handler
      await rxCharacteristic.startNotifications();
      rxCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        this.handleCharacteristicChanged(device.id, event);
      });

      // Get TX characteristic (for sending data)
      const txCharacteristic = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);

      // Store references
      this.connectedDevices.set(device.id, device);
      this.characteristics.set(`${device.id}-tx`, txCharacteristic);
      this.characteristics.set(`${device.id}-rx`, rxCharacteristic);

      console.log(`Connected to Bluetooth device: ${device.name} (${device.id})`);
    } catch (error) {
      console.error('Failed to connect to Bluetooth device:', error);
      throw error;
    }
  }

  /**
   * Handle characteristic value changed (received data)
   */
  private handleCharacteristicChanged(deviceId: string, event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;

    if (!value) return;

    try {
      // Decode message
      const data = new Uint8Array(value.buffer);
      const message = this.decodeMessage(data);

      // Create peer object
      const peer: Peer = {
        id: deviceId,
        transport: 'bluetooth',
        lastSeen: Date.now()
      };

      // Notify message callback
      if (this.messageCallback) {
        this.messageCallback(message, peer);
      }
    } catch (error) {
      console.error('Failed to decode Bluetooth message:', error);
    }
  }

  /**
   * Handle device disconnected
   */
  private handleDeviceDisconnected(deviceId: string): void {
    console.log(`Bluetooth device disconnected: ${deviceId}`);

    this.connectedDevices.delete(deviceId);
    this.characteristics.delete(`${deviceId}-tx`);
    this.characteristics.delete(`${deviceId}-rx`);

    if (this.peerLostCallback) {
      this.peerLostCallback(deviceId);
    }
  }

  /**
   * Send message to peer(s)
   */
  async send(message: MeshMessage, peerId?: string): Promise<void> {
    const encoded = this.encodeMessage(message);

    if (peerId) {
      // Send to specific peer
      const characteristic = this.characteristics.get(`${peerId}-tx`);
      if (!characteristic) {
        throw new Error(`No connection to peer ${peerId}`);
      }

      await this.sendChunked(characteristic, encoded);
    } else {
      // Broadcast to all connected devices
      for (const [id, _device] of this.connectedDevices) {
        const characteristic = this.characteristics.get(`${id}-tx`);
        if (characteristic) {
          try {
            await this.sendChunked(characteristic, encoded);
          } catch (error) {
            console.error(`Failed to send to ${id}:`, error);
          }
        }
      }
    }
  }

  /**
   * Send data in chunks (BLE has ~20 byte MTU limit typically)
   */
  private async sendChunked(
    characteristic: BluetoothRemoteGATTCharacteristic,
    data: Uint8Array
  ): Promise<void> {
    const CHUNK_SIZE = 20; // Conservative MTU size
    let offset = 0;

    while (offset < data.length) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE);
      await characteristic.writeValue(chunk);
      offset += CHUNK_SIZE;

      // Small delay between chunks to avoid overwhelming the connection
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Encode message to binary
   */
  private encodeMessage(message: MeshMessage): Uint8Array {
    // Simple JSON encoding for now
    // TODO: Use more efficient binary protocol (Protocol Buffers, MessagePack, etc.)
    const json = JSON.stringify(message);
    return new TextEncoder().encode(json);
  }

  /**
   * Decode binary to message
   */
  private decodeMessage(data: Uint8Array): MeshMessage {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json) as MeshMessage;
  }

  /**
   * Register message callback
   */
  onMessage(callback: (message: MeshMessage, peer: Peer) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Register peer discovered callback
   */
  onPeerDiscovered(callback: (peer: Peer) => void): void {
    this.peerDiscoveredCallback = callback;
  }

  /**
   * Register peer lost callback
   */
  onPeerLost(callback: (peerId: string) => void): void {
    this.peerLostCallback = callback;
  }
}
