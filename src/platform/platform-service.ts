/**
 * Unified Platform Service
 *
 * Main entry point that coordinates:
 * - Identity (Group D)
 * - Offline-first data (Group A)
 * - Mesh networking & sync (Group B)
 *
 * This is the "operating system" for post-scarcity communities
 */

import { identityService, type IdentityService } from '../identity/identity-service.js';
import { DocumentManager } from '../data/document-manager.js';
import { PeerManager, WebRTCTransport, MeshtasticTransport } from '../network/peer.js';
import { SyncEngine } from '../sync/sync-engine.js';
import type {
  CommunityDocument,
  UserProfile,
  ResourceOffer,
  Request
} from '../data/types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Platform initialization options
 */
export interface PlatformOptions {
  communityId: string;
  communityName: string;
  communitySecret: string; // Shared secret for encryption
}

/**
 * Platform service state
 */
export enum PlatformState {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  IdentityRequired = 'identity_required',
  Locked = 'locked',
  Ready = 'ready',
  Syncing = 'syncing'
}

/**
 * Main platform service
 */
export class PlatformService {
  private state: PlatformState = PlatformState.Uninitialized;
  private documentManager: DocumentManager;
  private peerManager: PeerManager;
  private syncEngine: SyncEngine;
  private options: PlatformOptions | null = null;

  constructor() {
    this.documentManager = new DocumentManager();
    this.peerManager = new PeerManager();
    this.syncEngine = new SyncEngine(
      this.documentManager,
      this.peerManager,
      identityService
    );

    // Register transports
    this.peerManager.registerTransport(new WebRTCTransport());
    this.peerManager.registerTransport(new MeshtasticTransport());
  }

  /**
   * Initialize the platform
   */
  async initialize(options: PlatformOptions): Promise<void> {
    this.state = PlatformState.Initializing;
    this.options = options;

    try {
      // 1. Initialize identity system
      await identityService.initialize();

      // Check if identity exists
      const hasIdentity = await identityService.hasIdentity();

      if (!hasIdentity) {
        this.state = PlatformState.IdentityRequired;
        return;
      }

      this.state = PlatformState.Locked;

      // 2. Initialize document manager
      await this.documentManager.initializeCommunity(
        options.communityId,
        options.communityName
      );

      // 3. Initialize sync engine
      await this.syncEngine.initialize(options.communityId, options.communitySecret);

      console.log('Platform initialized. Please unlock identity to continue.');
    } catch (error) {
      console.error('Platform initialization failed:', error);
      this.state = PlatformState.Uninitialized;
      throw error;
    }
  }

  /**
   * Create new identity
   */
  async createIdentity(passphrase: string): Promise<{
    did: string;
    recoveryPhrase: string;
  }> {
    if (this.state !== PlatformState.IdentityRequired) {
      throw new Error('Identity already exists');
    }

    const result = await identityService.createNewIdentity(passphrase);

    // Add self to community
    this.documentManager.addMember(result.did);
    this.documentManager.updateIdentity(result.did, {
      did: result.did,
      profile: {
        joinedAt: Date.now(),
        lastActiveAt: Date.now()
      },
      privacy: await identityService.getPrivacySettings(),
      attestationsReceived: []
    });

    this.state = PlatformState.Ready;

    return {
      did: result.did,
      recoveryPhrase: result.recoveryPhrase
    };
  }

  /**
   * Unlock identity
   */
  async unlock(passphrase: string): Promise<void> {
    if (this.state !== PlatformState.Locked) {
      throw new Error('Platform not in locked state');
    }

    await identityService.unlock(passphrase);
    this.state = PlatformState.Ready;

    // Update last active
    const did = identityService.getCurrentDID();
    if (did) {
      this.documentManager.updateIdentity(did, {
        profile: {
          lastActiveAt: Date.now()
        } as any
      });
    }

    console.log('Platform ready!');
  }

  /**
   * Lock platform
   */
  lock(): void {
    identityService.lock();
    this.state = PlatformState.Locked;
  }

  /**
   * Get current state
   */
  getState(): PlatformState {
    return this.state;
  }

  /**
   * Check if ready
   */
  isReady(): boolean {
    return this.state === PlatformState.Ready || this.state === PlatformState.Syncing;
  }

  /**
   * Get current user's DID
   */
  getCurrentDID(): string | null {
    return identityService.getCurrentDID();
  }

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<UserProfile>): void {
    this.ensureReady();

    const did = this.getCurrentDID();
    if (!did) {
      throw new Error('No DID available');
    }

    this.documentManager.updateIdentity(did, {
      profile: updates as any
    });
  }

  /**
   * Post resource offer
   */
  postResource(offer: Omit<ResourceOffer, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): ResourceOffer {
    this.ensureReady();

    const did = this.getCurrentDID();
    if (!did) {
      throw new Error('No DID available');
    }

    const resource: ResourceOffer = {
      id: uuidv4(),
      ...offer,
      createdBy: did,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.documentManager.addResource(resource);

    return resource;
  }

  /**
   * Get all resources
   */
  getResources(): ResourceOffer[] {
    this.ensureReady();

    const doc = this.documentManager.getCommunityDoc();
    if (!doc || !doc.resources) {
      return [];
    }

    return Object.values(doc.resources);
  }

  /**
   * Claim a resource
   */
  claimResource(resourceId: string): void {
    this.ensureReady();

    const did = this.getCurrentDID();
    if (!did) {
      throw new Error('No DID available');
    }

    this.documentManager.updateResource(resourceId, {
      availability: 'claimed',
      claimedBy: did,
      claimedAt: Date.now()
    });
  }

  /**
   * Post request
   */
  postRequest(request: Omit<Request, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): Request {
    this.ensureReady();

    const did = this.getCurrentDID();
    if (!did) {
      throw new Error('No DID available');
    }

    const newRequest: Request = {
      id: uuidv4(),
      ...request,
      createdBy: did,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.documentManager.addRequest(newRequest);

    return newRequest;
  }

  /**
   * Get all requests
   */
  getRequests(): Request[] {
    this.ensureReady();

    const doc = this.documentManager.getCommunityDoc();
    if (!doc || !doc.requests) {
      return [];
    }

    return Object.values(doc.requests);
  }

  /**
   * Sync with peer
   */
  async syncWithPeer(peerId: string): Promise<void> {
    this.ensureReady();

    const prevState = this.state;
    this.state = PlatformState.Syncing;

    try {
      await this.syncEngine.syncWithPeer(peerId);
    } finally {
      this.state = prevState;
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    connectedPeers: number;
    lastSyncTimes: Map<string, number>;
  } {
    return this.syncEngine.getSyncStats();
  }

  /**
   * Export all data
   */
  async exportData(): Promise<{
    identity: string;
    community: CommunityDocument | null;
  }> {
    const identityData = await identityService.exportData();
    const communityData = this.documentManager.getCommunityDoc();

    return {
      identity: identityData,
      community: communityData
    };
  }

  /**
   * Get community document (read-only)
   */
  getCommunityDoc(): CommunityDocument | null {
    return this.documentManager.getCommunityDoc();
  }

  /**
   * Ensure platform is ready
   */
  private ensureReady(): void {
    if (!this.isReady()) {
      throw new Error(`Platform not ready. Current state: ${this.state}`);
    }
  }
}

/**
 * Global platform service instance
 */
export const platformService = new PlatformService();
