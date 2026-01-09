/**
 * Sync Engine
 *
 * Coordinates peer-to-peer synchronization with:
 * - End-to-end encryption
 * - Privacy-aware filtering
 * - DID-based authentication
 * - Multiple transports
 */

import type * as Automerge from '@automerge/automerge';
import type { DocumentManager } from '../data/document-manager.js';
import type { PeerManager, Connection, PeerInfo } from '../network/peer.js';
import type { IdentityService } from '../identity/identity-service.js';
import {
  encryptAndSign,
  verifyAndDecrypt,
  deriveSharedKey,
  type EncryptedPayload
} from './encryption.js';
import { didToPublicKey } from '../identity/did.js';
import { createAuthChallenge, signChallenge, verifyAuthResponse } from '../auth/authentication.js';
import type { PrivacyContext } from '../privacy/controls.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * Sync message types
 */
export type SyncMessageType =
  | 'auth_challenge'
  | 'auth_response'
  | 'sync_request'
  | 'sync_response'
  | 'sync_complete';

/**
 * Sync message
 */
export interface SyncMessage {
  type: SyncMessageType;
  from: string; // DID
  to?: string; // DID (optional for broadcast)
  payload: EncryptedPayload | any; // Encrypted for sync messages
  timestamp: number;
}

/**
 * Peer sync state
 */
interface PeerSyncState {
  peerId: string;
  did?: string;
  authenticated: boolean;
  automergeState: Automerge.SyncState;
  lastSyncAt: number;
}

/**
 * Sync engine
 */
export class SyncEngine {
  private peerStates: Map<string, PeerSyncState> = new Map();
  private sharedKey: Uint8Array | null = null;
  private communityId: string | null = null;

  constructor(
    private documentManager: DocumentManager,
    private peerManager: PeerManager,
    private identityService: IdentityService
  ) {}

  /**
   * Initialize sync engine
   */
  async initialize(communityId: string, communitySecret: string): Promise<void> {
    this.communityId = communityId;
    this.sharedKey = deriveSharedKey(communityId, communitySecret);
  }

  /**
   * Sync with a peer
   */
  async syncWithPeer(peerId: string): Promise<void> {
    const connection = await this.peerManager.connectToPeer(peerId);

    try {
      // 1. Authenticate peer
      const authenticated = await this.authenticatePeer(connection);

      if (!authenticated) {
        console.error('Peer authentication failed');
        return;
      }

      // 2. Get or create sync state
      let peerState = this.peerStates.get(peerId);
      if (!peerState) {
        const automerge = await import('@automerge/automerge');
        peerState = {
          peerId,
          authenticated: true,
          automergeState: automerge.initSyncState(),
          lastSyncAt: 0
        };
        this.peerStates.set(peerId, peerState);
      }

      // 3. Perform sync
      await this.performSync(connection, peerState);

      peerState.lastSyncAt = Date.now();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      // Keep connection open for future syncs
      // await connection.close();
    }
  }

  /**
   * Authenticate peer using DID challenge-response
   */
  private async authenticatePeer(connection: Connection): Promise<boolean> {
    if (!this.identityService.isUnlocked()) {
      throw new Error('Identity not unlocked');
    }

    const myDID = this.identityService.getCurrentDID();
    if (!myDID) {
      throw new Error('No DID available');
    }

    // 1. Send challenge
    const challenge = createAuthChallenge();
    const challengeMsg: SyncMessage = {
      type: 'auth_challenge',
      from: myDID,
      payload: challenge,
      timestamp: Date.now()
    };

    await connection.send(new TextEncoder().encode(JSON.stringify(challengeMsg)));

    // 2. Receive response
    const responseIter = connection.receive();
    const { value: responseData } = await responseIter.next();
    if (!responseData) {
      return false;
    }

    const responseMsg: SyncMessage = JSON.parse(new TextDecoder().decode(responseData));

    if (responseMsg.type !== 'auth_response') {
      return false;
    }

    // 3. Verify response
    const peerPublicKey = didToPublicKey(responseMsg.from);
    const valid = verifyAuthResponse(responseMsg.payload, challenge, peerPublicKey);

    if (valid) {
      // Update peer state with DID
      const peerState = this.peerStates.get(connection.peerId);
      if (peerState) {
        peerState.did = responseMsg.from;
      }
    }

    return valid;
  }

  /**
   * Perform Automerge sync
   */
  private async performSync(connection: Connection, peerState: PeerSyncState): Promise<void> {
    if (!this.sharedKey) {
      throw new Error('Shared key not initialized');
    }

    const myDID = this.identityService.getCurrentDID();
    if (!myDID) {
      throw new Error('No DID available');
    }

    // Generate sync message
    const [newSyncState, syncMsg] = this.documentManager.generateSyncMessage(
      connection.peerId,
      peerState.automergeState
    );

    if (syncMsg) {
      // Encrypt and sign
      const myKeyPair = (this.identityService as any).currentKeyPair;
      if (!myKeyPair) {
        throw new Error('Key pair not available');
      }

      const encryptedPayload = encryptAndSign(syncMsg, this.sharedKey, myKeyPair, myDID);

      const message: SyncMessage = {
        type: 'sync_request',
        from: myDID,
        to: peerState.did,
        payload: encryptedPayload,
        timestamp: Date.now()
      };

      await connection.send(new TextEncoder().encode(JSON.stringify(message)));

      // Update sync state
      peerState.automergeState = newSyncState;
    }

    // Receive peer's sync message
    const responseIter = connection.receive();
    const { value: responseData } = await responseIter.next();
    if (responseData) {
      const responseMsg: SyncMessage = JSON.parse(new TextDecoder().decode(responseData));

      if (responseMsg.type === 'sync_response' && peerState.did) {
        // Decrypt and verify
        const peerPublicKey = didToPublicKey(peerState.did);
        const decrypted = verifyAndDecrypt(
          responseMsg.payload,
          this.sharedKey,
          peerPublicKey
        );

        if (decrypted) {
          // Apply sync message
          const [newSyncState2, updatedDoc] = this.documentManager.receiveSyncMessage(
            connection.peerId,
            peerState.automergeState,
            decrypted
          );

          peerState.automergeState = newSyncState2;
        }
      }
    }
  }

  /**
   * Start listening for sync requests
   */
  async startListening(): Promise<void> {
    for await (const connection of this.peerManager.listenForConnections()) {
      // Handle connection in background
      this.handleIncomingConnection(connection).catch(console.error);
    }
  }

  /**
   * Handle incoming connection
   */
  private async handleIncomingConnection(connection: Connection): Promise<void> {
    // Authenticate peer
    const authenticated = await this.authenticatePeer(connection);

    if (!authenticated) {
      await connection.close();
      return;
    }

    // Handle sync messages
    for await (const data of connection.receive()) {
      const message: SyncMessage = JSON.parse(new TextDecoder().decode(data));
      await this.handleSyncMessage(connection, message);
    }
  }

  /**
   * Handle sync message
   */
  private async handleSyncMessage(connection: Connection, message: SyncMessage): Promise<void> {
    if (!this.sharedKey) {
      return;
    }

    if (message.type === 'sync_request') {
      // Decrypt and process
      const peerPublicKey = didToPublicKey(message.from);
      const decrypted = verifyAndDecrypt(message.payload, this.sharedKey, peerPublicKey);

      if (decrypted) {
        const peerState = this.peerStates.get(connection.peerId);
        if (!peerState) {
          return;
        }

        // Apply sync message and generate response
        const [newSyncState, updatedDoc] = this.documentManager.receiveSyncMessage(
          connection.peerId,
          peerState.automergeState,
          decrypted
        );

        peerState.automergeState = newSyncState;

        // Generate response
        const [responseSyncState, responseMsg] = this.documentManager.generateSyncMessage(
          connection.peerId,
          peerState.automergeState
        );

        if (responseMsg) {
          const myDID = this.identityService.getCurrentDID();
          const myKeyPair = (this.identityService as any).currentKeyPair;

          if (myDID && myKeyPair) {
            const encryptedPayload = encryptAndSign(
              responseMsg,
              this.sharedKey,
              myKeyPair,
              myDID
            );

            const response: SyncMessage = {
              type: 'sync_response',
              from: myDID,
              to: message.from,
              payload: encryptedPayload,
              timestamp: Date.now()
            };

            await connection.send(new TextEncoder().encode(JSON.stringify(response)));
            peerState.automergeState = responseSyncState;
          }
        }
      }
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    connectedPeers: number;
    lastSyncTimes: Map<string, number>;
  } {
    const lastSyncTimes = new Map<string, number>();

    for (const [peerId, state] of this.peerStates.entries()) {
      lastSyncTimes.set(peerId, state.lastSyncAt);
    }

    return {
      connectedPeers: this.peerManager.getActiveConnectionCount(),
      lastSyncTimes
    };
  }
}
