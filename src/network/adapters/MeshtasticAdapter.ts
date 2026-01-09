/**
 * Meshtastic Network Adapter
 * Integrates with Meshtastic LoRa mesh devices for long-range, low-power communication
 *
 * REQ-DEPLOY-006: Meshtastic Integration
 * Part of Phase I, Group B: LoRa message relay
 *
 * Meshtastic provides:
 * - Long range (up to 10km+ in ideal conditions)
 * - Low power consumption
 * - Multi-hop mesh routing
 * - Works without internet/cellular
 *
 * Connection methods:
 * - Serial (via Termux on Android)
 * - Bluetooth LE (via Web Bluetooth)
 * - WiFi (HTTP API)
 */

import type {
  NetworkAdapter,
  MeshtasticConfig,
  MeshMessage,
  Peer,
  ConnectionStatus
} from '../../types/network.js';

// Meshtastic Protocol Buffer types (simplified)
interface MeshtasticPacket {
  from: number; // Node ID
  to: number; // Destination node ID (broadcast = 0xFFFFFFFF)
  channel: number;
  payload: Uint8Array;
  hopLimit: number;
  wantAck: boolean;
}

/**
 * Meshtastic adapter for LoRa mesh networking
 */
export class MeshtasticAdapter implements NetworkAdapter {
  type = 'meshtastic' as const;
  status: ConnectionStatus = 'disconnected';

  private config: MeshtasticConfig;
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private nodeId: number = 0;
  private nodes: Map<number, Peer> = new Map();

  private messageCallback: ((message: MeshMessage, peer: Peer) => void) | null = null;
  private peerDiscoveredCallback: ((peer: Peer) => void) | null = null;
  private peerLostCallback: ((peerId: string) => void) | null = null;

  // Meshtastic service UUIDs
  private static readonly SERVICE_UUID = '6ba1b218-15a8-461f-9fa8-5dcae273eafd';
  private static readonly FROMRADIO_UUID = '2c55e69e-4993-11ed-b878-0242ac120002';
  private static readonly TORADIO_UUID = 'f75c76d2-129e-4dad-a1dd-7866124401e7';

  constructor(config: MeshtasticConfig) {
    this.config = {
      baudRate: config.baudRate || 115200,
      channel: config.channel || 0,
      region: config.region || 'US',
      ...config
    };
  }

  /**
   * Start Meshtastic adapter
   */
  async start(): Promise<void> {
    this.status = 'connecting';

    try {
      // Check if Web Bluetooth is available
      if (navigator.bluetooth) {
        console.log('Meshtastic: Using Bluetooth connection');
        await this.connectBluetooth();
      } else if ((this as any).Serial) {
        // Serial API (available in some contexts)
        console.log('Meshtastic: Serial connection not yet implemented');
        throw new Error('Serial connection not yet implemented');
      } else {
        throw new Error('No supported connection method for Meshtastic');
      }

      this.status = 'connected';
      console.log('Meshtastic adapter connected');
    } catch (error) {
      console.error('Failed to start Meshtastic adapter:', error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Connect to Meshtastic device via Bluetooth
   */
  private async connectBluetooth(): Promise<void> {
    try {
      // Request Meshtastic device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MeshtasticAdapter.SERVICE_UUID] }],
        optionalServices: [MeshtasticAdapter.SERVICE_UUID]
      });

      if (!this.device) {
        throw new Error('No Meshtastic device selected');
      }

      // Setup disconnect handler
      this.device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnected();
      });

      // Connect to GATT server
      const server = await this.device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Get Meshtastic service
      const service = await server.getPrimaryService(MeshtasticAdapter.SERVICE_UUID);

      // Get FROMRADIO characteristic (receive messages from radio)
      const fromRadio = await service.getCharacteristic(MeshtasticAdapter.FROMRADIO_UUID);
      await fromRadio.startNotifications();
      fromRadio.addEventListener('characteristicvaluechanged', (event) => {
        this.handleFromRadio(event);
      });

      // Get TORADIO characteristic (send messages to radio)
      const toRadio = await service.getCharacteristic(MeshtasticAdapter.TORADIO_UUID);
      this.characteristic = toRadio;

      console.log(`Connected to Meshtastic device: ${this.device.name}`);

      // Request node info
      await this.requestNodeInfo();
    } catch (error) {
      console.error('Failed to connect to Meshtastic via Bluetooth:', error);
      throw error;
    }
  }

  /**
   * Request node info from device
   */
  private async requestNodeInfo(): Promise<void> {
    // Send node info request packet
    // This would use Meshtastic protocol buffers in a real implementation
    console.log('Requesting node info from Meshtastic device...');

    // For now, assign a random node ID
    this.nodeId = Math.floor(Math.random() * 0xFFFFFF);
  }

  /**
   * Handle incoming data from radio
   */
  private handleFromRadio(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;

    if (!value) return;

    try {
      const data = new Uint8Array(value.buffer);

      // Decode Meshtastic packet
      // In a real implementation, this would use Meshtastic protobuf definitions
      const packet = this.decodePacket(data);

      // Convert to MeshMessage
      const message = this.packetToMessage(packet);

      // Create/update peer
      const peer: Peer = {
        id: packet.from.toString(16),
        displayName: `Node-${packet.from.toString(16)}`,
        transport: 'meshtastic',
        lastSeen: Date.now(),
        signalStrength: undefined // TODO: Extract from packet metadata
      };

      // Update nodes map
      if (!this.nodes.has(packet.from)) {
        this.nodes.set(packet.from, peer);

        if (this.peerDiscoveredCallback) {
          this.peerDiscoveredCallback(peer);
        }
      } else {
        this.nodes.set(packet.from, peer);
      }

      // Notify message callback
      if (this.messageCallback) {
        this.messageCallback(message, peer);
      }
    } catch (error) {
      console.error('Failed to process Meshtastic packet:', error);
    }
  }

  /**
   * Decode Meshtastic packet
   * In production, this would use @buf/meshtastic_protobufs.bufbuild_es/meshtastic/mesh_pb
   */
  private decodePacket(data: Uint8Array): MeshtasticPacket {
    // Simplified decoding - in reality this would parse protobuf
    // This is a placeholder that assumes a simple format

    const dataView = new DataView(data.buffer);

    return {
      from: dataView.getUint32(0, true),
      to: dataView.getUint32(4, true),
      channel: dataView.getUint8(8),
      hopLimit: dataView.getUint8(9),
      wantAck: dataView.getUint8(10) === 1,
      payload: data.slice(11)
    };
  }

  /**
   * Encode Meshtastic packet
   */
  private encodePacket(packet: MeshtasticPacket): Uint8Array {
    // Simplified encoding - in reality this would use protobuf
    const buffer = new ArrayBuffer(11 + packet.payload.length);
    const view = new DataView(buffer);

    view.setUint32(0, packet.from, true);
    view.setUint32(4, packet.to, true);
    view.setUint8(8, packet.channel);
    view.setUint8(9, packet.hopLimit);
    view.setUint8(10, packet.wantAck ? 1 : 0);

    const result = new Uint8Array(buffer);
    result.set(packet.payload, 11);

    return result;
  }

  /**
   * Convert Meshtastic packet to MeshMessage
   */
  private packetToMessage(packet: MeshtasticPacket): MeshMessage {
    return {
      id: crypto.randomUUID(),
      type: 'data', // Could be determined from payload
      from: packet.from.toString(16),
      to: packet.to === 0xFFFFFFFF ? undefined : packet.to.toString(16),
      timestamp: Date.now(),
      ttl: packet.hopLimit,
      payload: packet.payload
    };
  }

  /**
   * Convert MeshMessage to Meshtastic packet
   */
  private messageToPacket(message: MeshMessage): MeshtasticPacket {
    const to = message.to ? parseInt(message.to, 16) : 0xFFFFFFFF;

    return {
      from: this.nodeId,
      to,
      channel: this.config.channel!,
      hopLimit: message.ttl,
      wantAck: false,
      payload: message.payload
    };
  }

  /**
   * Handle device disconnected
   */
  private handleDisconnected(): void {
    console.log('Meshtastic device disconnected');
    this.status = 'disconnected';
    this.device = null;
    this.characteristic = null;

    // Notify all peers lost
    for (const peer of this.nodes.values()) {
      if (this.peerLostCallback) {
        this.peerLostCallback(peer.id);
      }
    }

    this.nodes.clear();
  }

  /**
   * Stop Meshtastic adapter
   */
  async stop(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.device = null;
    this.characteristic = null;
    this.nodes.clear();
    this.status = 'disconnected';

    console.log('Meshtastic adapter stopped');
  }

  /**
   * Discover peers
   */
  async discoverPeers(): Promise<Peer[]> {
    // Peers are discovered passively via mesh packets
    return Array.from(this.nodes.values());
  }

  /**
   * Send message via Meshtastic
   */
  async send(message: MeshMessage, peerId?: string): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Meshtastic not connected');
    }

    // Set destination if specified
    if (peerId) {
      message.to = peerId;
    }

    // Convert to Meshtastic packet
    const packet = this.messageToPacket(message);

    // Encode packet
    const encoded = this.encodePacket(packet);

    // Send to radio
    await this.characteristic.writeValue(encoded);

    console.log(`Sent message via Meshtastic to ${peerId || 'broadcast'}`);
  }

  /**
   * Register callbacks
   */
  onMessage(callback: (message: MeshMessage, peer: Peer) => void): void {
    this.messageCallback = callback;
  }

  onPeerDiscovered(callback: (peer: Peer) => void): void {
    this.peerDiscoveredCallback = callback;
  }

  onPeerLost(callback: (peerId: string) => void): void {
    this.peerLostCallback = callback;
  }
}
