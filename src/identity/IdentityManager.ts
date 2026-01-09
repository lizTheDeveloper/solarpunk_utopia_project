/**
 * Identity Manager - Integrates DID system with database
 *
 * Combines:
 * - Decentralized identifiers (did:key)
 * - Key management and encryption
 * - User profiles in database
 * - Authentication
 */

import { generateKeyPair, encryptPrivateKey, decryptPrivateKey, type KeyPair } from '../crypto/keys.js';
import { createIdentity, exportIdentity, importIdentity, type DIDDocument } from './did.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type { LocalDatabase } from '../core/database.js';
import type { UserProfile } from '../types/index.js';
import { DEFAULT_PRIVACY_SETTINGS } from '../privacy/controls.js';

export interface Identity {
  did: string;
  document: DIDDocument;
  keyPair: KeyPair;
  profile: UserProfile;
}

/**
 * Manages user identity, keys, and profiles
 */
export class IdentityManager {
  private currentIdentity: Identity | null = null;
  private database: LocalDatabase;

  constructor(database: LocalDatabase) {
    this.database = database;
  }

  /**
   * Create a new identity
   */
  async createNewIdentity(displayName: string): Promise<Identity> {
    // Generate key pair
    const keyPair = generateKeyPair();

    // Create DID from public key
    const identity = createIdentity(keyPair);

    // Create user profile in database
    const profile: UserProfile = {
      id: identity.did,
      did: identity.did,
      displayName,
      joinedAt: Date.now(),
      publicKey: bytesToHex(keyPair.publicKey),
      privacySettings: DEFAULT_PRIVACY_SETTINGS
    };

    await this.database.setUserProfile(profile);

    const fullIdentity: Identity = {
      did: identity.did,
      document: identity.document,
      keyPair: identity.keyPair,
      profile
    };

    this.currentIdentity = fullIdentity;
    return fullIdentity;
  }

  /**
   * Save identity to encrypted local storage
   */
  async saveIdentity(identity: Identity, passphrase: string): Promise<void> {
    const encrypted = encryptPrivateKey(identity.keyPair.privateKey, passphrase);

    const data = {
      did: identity.did,
      document: identity.document,
      publicKey: bytesToHex(identity.keyPair.publicKey),
      encryptedPrivateKey: encrypted,
      profile: identity.profile
    };

    localStorage.setItem('identity', JSON.stringify(data));
  }

  /**
   * Load identity from encrypted local storage
   */
  async loadIdentity(passphrase: string): Promise<Identity | null> {
    const dataStr = localStorage.getItem('identity');
    if (!dataStr) return null;

    try {
      const data = JSON.parse(dataStr);

      // Decrypt private key
      const privateKey = decryptPrivateKey(data.encryptedPrivateKey, passphrase);

      const keyPair: KeyPair = {
        publicKey: hexToBytes(data.publicKey),
        privateKey
      };

      // Load profile from database
      const profile = this.database.getUserProfile(data.did);
      if (!profile) {
        throw new Error('Profile not found in database');
      }

      const identity: Identity = {
        did: data.did,
        document: data.document,
        keyPair,
        profile
      };

      this.currentIdentity = identity;
      return identity;
    } catch (error) {
      console.error('Failed to load identity:', error);
      return null;
    }
  }

  /**
   * Get current authenticated identity
   */
  getCurrentIdentity(): Identity | null {
    return this.currentIdentity;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentIdentity !== null;
  }

  /**
   * Get current user's DID
   */
  getCurrentDID(): string | null {
    return this.currentIdentity?.did || null;
  }

  /**
   * Get current user's public key
   */
  getCurrentPublicKey(): Uint8Array | null {
    return this.currentIdentity?.keyPair.publicKey || null;
  }

  /**
   * Update profile information
   */
  async updateProfile(updates: Partial<Omit<UserProfile, 'id' | 'did' | 'publicKey' | 'joinedAt'>>): Promise<void> {
    if (!this.currentIdentity) {
      throw new Error('No authenticated identity');
    }

    // Update in database
    const currentProfile = this.database.getUserProfile(this.currentIdentity.did);
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...updates
    };

    await this.database.setUserProfile(updatedProfile);

    // Update in current identity
    this.currentIdentity.profile = updatedProfile;

    // Update in localStorage
    const dataStr = localStorage.getItem('identity');
    if (dataStr) {
      const data = JSON.parse(dataStr);
      data.profile = updatedProfile;
      localStorage.setItem('identity', JSON.stringify(data));
    }
  }

  /**
   * Export identity for backup/portability
   */
  exportIdentity(): string {
    if (!this.currentIdentity) {
      throw new Error('No authenticated identity');
    }

    const exportData = {
      did: this.currentIdentity.did,
      document: this.currentIdentity.document,
      publicKey: bytesToHex(this.currentIdentity.keyPair.publicKey),
      privateKey: bytesToHex(this.currentIdentity.keyPair.privateKey),
      profile: this.currentIdentity.profile
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import identity from backup
   */
  async importIdentityData(json: string, passphrase: string): Promise<Identity> {
    const data = JSON.parse(json);

    const keyPair: KeyPair = {
      publicKey: hexToBytes(data.publicKey),
      privateKey: hexToBytes(data.privateKey)
    };

    // Save profile to database
    await this.database.setUserProfile(data.profile);

    const identity: Identity = {
      did: data.did,
      document: data.document,
      keyPair,
      profile: data.profile
    };

    // Save to encrypted storage
    await this.saveIdentity(identity, passphrase);

    this.currentIdentity = identity;
    return identity;
  }

  /**
   * Logout current identity
   */
  logout(): void {
    this.currentIdentity = null;
    // Don't delete from localStorage - just clear from memory
  }

  /**
   * Delete identity permanently
   */
  async deleteIdentity(): Promise<void> {
    if (this.currentIdentity) {
      // Remove from database
      // Note: database doesn't have delete user method yet
      // TODO: Add deleteUserProfile method to database
    }

    // Clear from localStorage
    localStorage.removeItem('identity');

    this.currentIdentity = null;
  }
}
