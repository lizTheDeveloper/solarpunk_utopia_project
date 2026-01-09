/**
 * Secure Network Manager
 * Integrates NetworkManager with encryption, signing, and DIDs
 *
 * Integration of Phase 1, Group B (Mesh Networking) with Phase 1, Group D (Identity)
 */

import { NetworkManager } from './NetworkManager.js';
import type { NetworkConfig, MeshMessage, Peer } from '../types/network.js';
import type { LocalDatabase } from '../core/database.js';
import { encryptMessage, decryptMessage, type EncryptedMessage } from '../crypto/encryption.js';
import { sign, verify } from '../crypto/keys.js';
import { identityService, type IdentityService } from '../identity/identity-service.js';
import { publicKeyToDID } from '../identity/did.js';

/**
 * Message payload format for encrypted messages
 */
interface SecureMessagePayload {
  encrypted: EncryptedMessage;
  signature: string; // Base64 encoded
  timestamp: number;
}

/**
 * Extends NetworkManager with encryption and authentication
 */
export class SecureNetworkManager extends NetworkManager {
  private identityService: IdentityService;
  private peerPublicKeys: Map<string, string> = new Map(); // peerId -> publicKey

  constructor(
    database: LocalDatabase,
    config: NetworkConfig,
    identityService: IdentityService
  ) {
    super(database, config);
    this.identityService = identityService;

    // Override message handlers to add encryption/signing
    this.setupSecureHandlers();
  }

  /**
   * Setup secure message handlers
   */
  private setupSecureHandlers(): void {
    // Intercept sync messages
    this.registerMessageHandler('sync-request', this.handleSecureSyncRequest.bind(this));
    this.registerMessageHandler('sync-response', this.handleSecureSyncResponse.bind(this));

    // Handle peer key exchange
    this.registerMessageHandler('announce', this.handleSecureAnnounce.bind(this));
  }

  /**
   * Send encrypted and signed message
   */
  async sendSecureMessage(
    plaintext: string,
    recipientPeerId?: string
  ): Promise<void> {
    const identity = await this.identityService.getIdentity();
    if (!identity) {
      throw new Error('No identity available for secure messaging');
    }

    let encryptedPayload: SecureMessagePayload;

    if (recipientPeerId) {
      // Encrypt for specific peer
      const recipientPublicKey = this.peerPublicKeys.get(recipientPeerId);
      if (!recipientPublicKey) {
        throw new Error(`No public key for peer ${recipientPeerId}`);
      }

      const encrypted = encryptMessage(
        plaintext,
        recipientPublicKey,
        identity.keyPair.secretKey
      );

      // Sign the encrypted message
      const signature = await sign(
        JSON.stringify(encrypted),
        identity.keyPair.secretKey
      );

      encryptedPayload = {
        encrypted,
        signature,
        timestamp: Date.now()
      };
    } else {
      // For broadcast, we need a different approach
      // Option 1: Don't encrypt broadcasts (they're public anyway)
      // Option 2: Use symmetric encryption with a shared community key
      // For now, we'll not encrypt broadcasts
      throw new Error('Encrypted broadcasts not yet implemented - use plain messages for broadcasts');
    }

    // Create mesh message with encrypted payload
    const message: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'data',
      from: await this.getSecurePeerId(),
      to: recipientPeerId,
      timestamp: Date.now(),
      ttl: 5,
      payload: new TextEncoder().encode(JSON.stringify(encryptedPayload))
    };

    await this.sendMessage(message, recipientPeerId);
  }

  /**
   * Receive and decrypt secure message
   */
  async receiveSecureMessage(message: MeshMessage): Promise<string | null> {
    const identity = await this.identityService.getIdentity();
    if (!identity) {
      throw new Error('No identity available');
    }

    try {
      // Parse encrypted payload
      const payloadStr = new TextDecoder().decode(message.payload);
      const securePayload: SecureMessagePayload = JSON.parse(payloadStr);

      // Verify signature
      const senderPublicKey = this.peerPublicKeys.get(message.from);
      if (!senderPublicKey) {
        console.warn(`No public key for sender ${message.from}`);
        return null;
      }

      const isValid = await verify(
        JSON.stringify(securePayload.encrypted),
        securePayload.signature,
        senderPublicKey
      );

      if (!isValid) {
        console.warn(`Invalid signature from ${message.from}`);
        return null;
      }

      // Decrypt message
      const decrypted = decryptMessage(
        securePayload.encrypted,
        identity.keyPair.secretKey
      );

      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return null;
    }
  }

  /**
   * Handle secure announcement (includes public key)
   */
  private async handleSecureAnnounce(message: MeshMessage, peer: Peer): Promise<void> {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.payload));

      if (data.publicKey) {
        // Store peer's public key
        this.peerPublicKeys.set(peer.id, data.publicKey);
        console.log(`Stored public key for peer ${peer.id}`);
      }

      if (data.did) {
        // Verify DID matches public key
        const expectedDID = publicKeyToDID(data.publicKey);
        if (data.did === expectedDID) {
          console.log(`Verified DID for peer ${peer.id}: ${data.did}`);
        } else {
          console.warn(`DID mismatch for peer ${peer.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to process secure announcement:', error);
    }
  }

  /**
   * Send secure announcement with public key and DID
   */
  async sendSecureAnnouncement(peerId?: string): Promise<void> {
    const identity = await this.identityService.getIdentity();
    if (!identity) {
      throw new Error('No identity available');
    }

    const message: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'announce',
      from: await this.getSecurePeerId(),
      to: peerId,
      timestamp: Date.now(),
      ttl: 3,
      payload: new TextEncoder().encode(JSON.stringify({
        publicKey: identity.keyPair.publicKey,
        did: identity.did,
        displayName: 'Anonymous', // TODO: Get from privacy settings
        capabilities: ['encryption', 'signing', 'did-auth']
      }))
    };

    await this.sendMessage(message, peerId);
  }

  /**
   * Handle secure sync request (encrypted database sync)
   */
  private async handleSecureSyncRequest(message: MeshMessage, peer: Peer): Promise<void> {
    const identity = await this.identityService.getIdentity();
    if (!identity) {
      console.warn('No identity for secure sync');
      return;
    }

    // Get database binary
    const binary = this.database.getBinary();

    // For now, sync data is not encrypted (it's already public within community)
    // In production, consider encrypting sensitive fields
    const response: MeshMessage = {
      id: crypto.randomUUID(),
      type: 'sync-response',
      from: await this.getSecurePeerId(),
      to: message.from,
      timestamp: Date.now(),
      ttl: 1,
      payload: binary
    };

    await this.sendMessage(response, message.from);
  }

  /**
   * Handle secure sync response
   */
  private async handleSecureSyncResponse(message: MeshMessage, peer: Peer): Promise<void> {
    // Verify message is from trusted peer
    if (!this.peerPublicKeys.has(peer.id)) {
      console.warn(`Ignoring sync from untrusted peer ${peer.id}`);
      return;
    }

    // Merge data (same as regular sync)
    try {
      await this.database.merge(message.payload);
      console.log(`Merged sync data from ${peer.id}`);
    } catch (error) {
      console.error('Failed to merge sync data:', error);
    }
  }

  /**
   * Get secure peer ID (DID-based)
   */
  private async getSecurePeerId(): Promise<string> {
    const identity = await this.identityService.getIdentity();
    if (identity) {
      return identity.did;
    }
    // Fallback to config peer ID
    return this.config.peerId;
  }

  /**
   * Get all trusted peers (with verified public keys)
   */
  getTrustedPeers(): Peer[] {
    return this.getPeers().filter(peer =>
      this.peerPublicKeys.has(peer.id)
    );
  }

  /**
   * Trust a peer (store their public key)
   */
  trustPeer(peerId: string, publicKey: string): void {
    this.peerPublicKeys.set(peerId, publicKey);
    console.log(`Trusted peer ${peerId}`);
  }

  /**
   * Untrust a peer (remove their public key)
   */
  untrustPeer(peerId: string): void {
    this.peerPublicKeys.delete(peerId);
    console.log(`Untrusted peer ${peerId}`);
  }
}

/**
 * Initialize secure networking with identity service
 */
export async function initializeSecureNetworking(
  database: LocalDatabase,
  options: Partial<NetworkConfig> = {}
): Promise<SecureNetworkManager> {
  // Ensure identity exists
  let identity = await identityService.getIdentity();

  if (!identity) {
    console.log('No identity found, creating new identity...');
    identity = await identityService.createIdentity();
    console.log('Created new identity:', identity.did);
  }

  // Use DID as peer ID
  const config: NetworkConfig = {
    peerId: identity.did,
    enabledTransports: options.enabledTransports || ['bluetooth', 'wifi-direct'],
    dtnEnabled: options.dtnEnabled !== false,
    ...options
  };

  // Create secure network manager
  const networkManager = new SecureNetworkManager(database, config, identityService);

  // Start networking
  await networkManager.start();

  // Send secure announcement to any discovered peers
  setTimeout(() => {
    networkManager.sendSecureAnnouncement().catch(console.error);
  }, 1000);

  console.log('Secure networking initialized:', {
    did: identity.did,
    transports: config.enabledTransports,
    dtn: config.dtnEnabled
  });

  return networkManager;
}
