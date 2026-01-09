/**
 * CRDT Document Manager using Automerge
 *
 * Manages local-first, offline-capable documents with automatic conflict resolution
 */

import * as Automerge from '@automerge/automerge';
import { Repo } from '@automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import type { CommunityDocument } from './types.js';
import { createEmptyCommunityDocument } from './types.js';

/**
 * Document handle with Automerge
 */
export type DocHandle<T> = Automerge.Doc<T>;

/**
 * Document manager for CRDT operations
 */
export class DocumentManager {
  private repo: Repo;
  private communityDoc: Automerge.Doc<CommunityDocument> | null = null;
  private communityDocUrl: string | null = null;

  constructor() {
    // Initialize Automerge repo with IndexedDB storage
    this.repo = new Repo({
      storage: new IndexedDBStorageAdapter('solarpunk-automerge'),
      network: [new BroadcastChannelNetworkAdapter()],
      // Disable default network adapters - we'll add custom ones for mesh
      sharePolicy: async () => false
    });
  }

  /**
   * Initialize or load community document
   */
  async initializeCommunity(
    communityId: string,
    communityName: string
  ): Promise<void> {
    // Try to load existing document
    const existingUrl = await this.loadCommunityDocUrl(communityId);

    if (existingUrl) {
      // Load existing document
      const handle = this.repo.find(existingUrl);
      await handle.whenReady();
      this.communityDoc = await handle.doc() as Automerge.Doc<CommunityDocument>;
      this.communityDocUrl = existingUrl;
    } else {
      // Create new document
      const initialDoc = createEmptyCommunityDocument(communityId, communityName);
      const handle = this.repo.create<CommunityDocument>();

      handle.change((doc: any) => {
        Object.assign(doc, initialDoc);
      });

      this.communityDoc = await handle.doc() as Automerge.Doc<CommunityDocument>;
      this.communityDocUrl = handle.url;

      // Save document URL for later
      await this.saveCommunityDocUrl(communityId, handle.url);
    }
  }

  /**
   * Get current community document (read-only)
   */
  getCommunityDoc(): CommunityDocument | null {
    if (!this.communityDoc) {
      return null;
    }

    // Return plain object copy (not CRDT proxy)
    return JSON.parse(JSON.stringify(this.communityDoc));
  }

  /**
   * Update community document
   */
  updateCommunityDoc(
    updateFn: (doc: CommunityDocument) => void
  ): void {
    if (!this.communityDocUrl) {
      throw new Error('Community not initialized');
    }

    const handle = this.repo.find(this.communityDocUrl);

    handle.change((doc: any) => {
      updateFn(doc);
      doc.updatedAt = Date.now();
    });
  }

  /**
   * Add member to community
   */
  addMember(did: string): void {
    this.updateCommunityDoc((doc) => {
      if (!doc.members) {
        doc.members = {};
      }

      doc.members[did] = {
        joinedAt: Date.now(),
        role: 'member'
      };
    });
  }

  /**
   * Add or update identity data
   */
  updateIdentity(did: string, identityUpdate: Partial<CommunityDocument['identities'][string]>): void {
    this.updateCommunityDoc((doc) => {
      if (!doc.identities) {
        doc.identities = {};
      }

      if (!doc.identities[did]) {
        doc.identities[did] = {
          did,
          profile: { joinedAt: Date.now(), lastActiveAt: Date.now() },
          privacy: {} as any,
          attestationsReceived: []
        };
      }

      Object.assign(doc.identities[did], identityUpdate);
    });
  }

  /**
   * Add resource offer
   */
  addResource(resource: CommunityDocument['resources'][string]): void {
    this.updateCommunityDoc((doc) => {
      if (!doc.resources) {
        doc.resources = {};
      }

      doc.resources[resource.id] = resource;
    });
  }

  /**
   * Update resource
   */
  updateResource(id: string, updates: Partial<CommunityDocument['resources'][string]>): void {
    this.updateCommunityDoc((doc) => {
      if (doc.resources && doc.resources[id]) {
        Object.assign(doc.resources[id], updates);
        doc.resources[id].updatedAt = Date.now();
      }
    });
  }

  /**
   * Add request
   */
  addRequest(request: CommunityDocument['requests'][string]): void {
    this.updateCommunityDoc((doc) => {
      if (!doc.requests) {
        doc.requests = {};
      }

      doc.requests[request.id] = request;
    });
  }

  /**
   * Update request
   */
  updateRequest(id: string, updates: Partial<CommunityDocument['requests'][string]>): void {
    this.updateCommunityDoc((doc) => {
      if (doc.requests && doc.requests[id]) {
        Object.assign(doc.requests[id], updates);
        doc.requests[id].updatedAt = Date.now();
      }
    });
  }

  /**
   * Export document as binary (for sync)
   */
  exportBinary(): Uint8Array {
    if (!this.communityDoc) {
      throw new Error('No document to export');
    }

    return Automerge.save(this.communityDoc);
  }

  /**
   * Import document from binary (for sync)
   */
  importBinary(data: Uint8Array): void {
    const loadedDoc = Automerge.load<CommunityDocument>(data);

    if (this.communityDoc) {
      // Merge with existing document
      this.communityDoc = Automerge.merge(this.communityDoc, loadedDoc);
    } else {
      this.communityDoc = loadedDoc;
    }
  }

  /**
   * Get sync state for peer
   */
  getSyncState(peerId: string): Automerge.SyncState {
    // TODO: Load per-peer sync state from storage
    return Automerge.initSyncState();
  }

  /**
   * Generate sync message for peer
   */
  generateSyncMessage(peerId: string, syncState: Automerge.SyncState): [Automerge.SyncState, Uint8Array | null] {
    if (!this.communityDoc) {
      throw new Error('No document to sync');
    }

    return Automerge.generateSyncMessage(this.communityDoc, syncState);
  }

  /**
   * Receive sync message from peer
   */
  receiveSyncMessage(
    peerId: string,
    syncState: Automerge.SyncState,
    message: Uint8Array
  ): [Automerge.SyncState, Automerge.Doc<CommunityDocument> | null] {
    if (!this.communityDoc) {
      throw new Error('No document to sync');
    }

    const [newSyncState, newDoc] = Automerge.receiveSyncMessage(
      this.communityDoc,
      syncState,
      message
    );

    if (newDoc) {
      this.communityDoc = newDoc as Automerge.Doc<CommunityDocument>;
    }

    return [newSyncState, newDoc];
  }

  /**
   * Save community document URL to IndexedDB
   */
  private async saveCommunityDocUrl(communityId: string, url: string): Promise<void> {
    const { openDB } = await import('idb');
    const db = await openDB('solarpunk-metadata', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('community-docs')) {
          db.createObjectStore('community-docs');
        }
      }
    });

    await db.put('community-docs', url, communityId);
  }

  /**
   * Load community document URL from IndexedDB
   */
  private async loadCommunityDocUrl(communityId: string): Promise<string | undefined> {
    const { openDB } = await import('idb');
    const db = await openDB('solarpunk-metadata', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('community-docs')) {
          db.createObjectStore('community-docs');
        }
      }
    });

    return await db.get('community-docs', communityId);
  }
}
