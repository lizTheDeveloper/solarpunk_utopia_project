/**
 * WiFi Direct / Local Network Adapter
 * Enables peer discovery and sync via local WiFi network
 *
 * REQ-DEPLOY-008: Peer-to-Peer Synchronization
 * Part of Phase I, Group B: WiFi Direct sync
 *
 * Note: Uses WebRTC DataChannel for P2P data transfer
 * (True WiFi Direct API not available in browsers, so we simulate with local network discovery)
 */

import type {
  NetworkAdapter,
  WiFiDirectConfig,
  MeshMessage,
  Peer,
  ConnectionStatus
} from '../../types/network.js';

/**
 * WiFi Direct adapter using WebRTC for peer connections
 */
export class WiFiDirectAdapter implements NetworkAdapter {
  type = 'wifi-direct' as const;
  status: ConnectionStatus = 'disconnected';

  private config: WiFiDirectConfig;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private discoverySocket: WebSocket | null = null;

  private messageCallback: ((message: MeshMessage, peer: Peer) => void) | null = null;
  private peerDiscoveredCallback: ((peer: Peer) => void) | null = null;
  private peerLostCallback: ((peerId: string) => void) | null = null;

  constructor(config: WiFiDirectConfig) {
    this.config = config;
  }

  /**
   * Start WiFi Direct adapter
   */
  async start(): Promise<void> {
    this.status = 'connecting';

    try {
      // In a real implementation, this would:
      // 1. Start mDNS/DNS-SD service discovery
      // 2. Advertise service on local network
      // 3. Listen for peer announcements

      // For browser context, we use WebRTC with a simple discovery mechanism
      await this.startLocalDiscovery();

      this.status = 'connected';
      console.log('WiFi Direct adapter started');
    } catch (error) {
      console.error('Failed to start WiFi Direct adapter:', error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Start local network peer discovery
   * In Termux, this would use actual mDNS/Bonjour
   * In browser, we use BroadcastChannel or a local discovery server
   */
  private async startLocalDiscovery(): Promise<void> {
    // Use BroadcastChannel for same-origin discovery
    // This works across browser tabs on the same device
    const channel = new BroadcastChannel('solarpunk-discovery');

    channel.onmessage = async (event) => {
      const { type, peerId, offer, answer, candidate } = event.data;

      switch (type) {
        case 'announce':
          // Another peer announced itself
          if (peerId !== this.getLocalPeerId()) {
            await this.handlePeerAnnouncement(peerId);
          }
          break;

        case 'offer':
          // Received WebRTC offer
          await this.handleOffer(peerId, offer);
          break;

        case 'answer':
          // Received WebRTC answer
          await this.handleAnswer(peerId, answer);
          break;

        case 'ice-candidate':
          // Received ICE candidate
          await this.handleIceCandidate(peerId, candidate);
          break;
      }
    };

    // Announce ourselves
    channel.postMessage({
      type: 'announce',
      peerId: this.getLocalPeerId()
    });

    // Store channel for cleanup
    (this as any).discoveryChannel = channel;
  }

  /**
   * Get local peer ID
   */
  private getLocalPeerId(): string {
    let peerId = localStorage.getItem('solarpunk-peer-id');
    if (!peerId) {
      peerId = crypto.randomUUID();
      localStorage.setItem('solarpunk-peer-id', peerId);
    }
    return peerId;
  }

  /**
   * Handle peer announcement
   */
  private async handlePeerAnnouncement(peerId: string): Promise<void> {
    if (this.peerConnections.has(peerId)) {
      return; // Already connected
    }

    // Create WebRTC connection and send offer
    await this.createPeerConnection(peerId, true);

    const peer: Peer = {
      id: peerId,
      transport: 'wifi-direct',
      lastSeen: Date.now()
    };

    if (this.peerDiscoveredCallback) {
      this.peerDiscoveredCallback(peer);
    }
  }

  /**
   * Create WebRTC peer connection
   */
  private async createPeerConnection(peerId: string, createOffer: boolean): Promise<void> {
    // Create RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [] // No STUN/TURN for local network
    });

    // Setup ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice-candidate',
          peerId: this.getLocalPeerId(),
          targetPeerId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Setup connection state handler
    pc.onconnectionstatechange = () => {
      console.log(`WebRTC connection state: ${pc.connectionState}`);

      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.handlePeerDisconnected(peerId);
      }
    };

    // Create data channel
    let dataChannel: RTCDataChannel;

    if (createOffer) {
      // We initiate - create data channel
      dataChannel = pc.createDataChannel('solarpunk', {
        ordered: true
      });

      this.setupDataChannel(peerId, dataChannel);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.sendSignal({
        type: 'offer',
        peerId: this.getLocalPeerId(),
        targetPeerId: peerId,
        offer: offer
      });
    } else {
      // We receive - wait for data channel
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
    }

    this.peerConnections.set(peerId, pc);
  }

  /**
   * Setup data channel handlers
   */
  private setupDataChannel(peerId: string, channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.handlePeerDisconnected(peerId);
    };

    channel.onmessage = (event) => {
      this.handleDataChannelMessage(peerId, event.data);
    };

    channel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
    };

    this.dataChannels.set(peerId, channel);
  }

  /**
   * Handle WebRTC offer
   */
  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    // Create peer connection if not exists
    if (!this.peerConnections.has(peerId)) {
      await this.createPeerConnection(peerId, false);
    }

    const pc = this.peerConnections.get(peerId)!;

    await pc.setRemoteDescription(offer);

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer
    this.sendSignal({
      type: 'answer',
      peerId: this.getLocalPeerId(),
      targetPeerId: peerId,
      answer: answer
    });
  }

  /**
   * Handle WebRTC answer
   */
  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  }

  /**
   * Send signaling message
   */
  private sendSignal(message: any): void {
    const channel = (this as any).discoveryChannel as BroadcastChannel;
    if (channel) {
      channel.postMessage(message);
    }
  }

  /**
   * Handle data channel message
   */
  private handleDataChannelMessage(peerId: string, data: ArrayBuffer): void {
    try {
      const message = this.decodeMessage(new Uint8Array(data));

      const peer: Peer = {
        id: peerId,
        transport: 'wifi-direct',
        lastSeen: Date.now()
      };

      if (this.messageCallback) {
        this.messageCallback(message, peer);
      }
    } catch (error) {
      console.error('Failed to decode WiFi Direct message:', error);
    }
  }

  /**
   * Handle peer disconnected
   */
  private handlePeerDisconnected(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }

    this.dataChannels.delete(peerId);

    if (this.peerLostCallback) {
      this.peerLostCallback(peerId);
    }
  }

  /**
   * Stop WiFi Direct adapter
   */
  async stop(): Promise<void> {
    // Close all peer connections
    for (const pc of this.peerConnections.values()) {
      pc.close();
    }

    this.peerConnections.clear();
    this.dataChannels.clear();

    // Close discovery channel
    const channel = (this as any).discoveryChannel as BroadcastChannel;
    if (channel) {
      channel.close();
    }

    this.status = 'disconnected';
    console.log('WiFi Direct adapter stopped');
  }

  /**
   * Discover peers (passive in WiFi Direct)
   */
  async discoverPeers(): Promise<Peer[]> {
    // Peers are discovered passively via announcements
    return Array.from(this.peerConnections.keys()).map((id) => ({
      id,
      transport: 'wifi-direct' as const,
      lastSeen: Date.now()
    }));
  }

  /**
   * Send message to peer(s)
   */
  async send(message: MeshMessage, peerId?: string): Promise<void> {
    const encoded = this.encodeMessage(message);

    if (peerId) {
      // Send to specific peer
      const channel = this.dataChannels.get(peerId);
      if (!channel || channel.readyState !== 'open') {
        throw new Error(`No connection to peer ${peerId}`);
      }

      channel.send(encoded);
    } else {
      // Broadcast to all connected peers
      for (const [id, channel] of this.dataChannels) {
        if (channel.readyState === 'open') {
          try {
            channel.send(encoded);
          } catch (error) {
            console.error(`Failed to send to ${id}:`, error);
          }
        }
      }
    }
  }

  /**
   * Encode message
   */
  private encodeMessage(message: MeshMessage): Uint8Array {
    const json = JSON.stringify(message);
    return new TextEncoder().encode(json);
  }

  /**
   * Decode message
   */
  private decodeMessage(data: Uint8Array): MeshMessage {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json) as MeshMessage;
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
