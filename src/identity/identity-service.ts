/**
 * Main Identity Service
 *
 * High-level API for identity, authentication, privacy, and reputation
 * Coordinates all identity subsystems
 *
 * This is the main entry point for other parts of the platform
 */

import { generateKeyPair, encryptPrivateKey, decryptPrivateKey, type KeyPair } from '../crypto/keys.js';
import { generateRecoveryPhrase, mnemonicToKeyPair, isValidMnemonic } from '../crypto/mnemonic.js';
import { createIdentity, publicKeyToDID, resolveDID, type DIDDocument } from './did.js';
import {
  createAuthChallenge,
  signChallenge,
  verifyAuthResponse,
  generateAuthToken,
  type AuthChallenge,
  type AuthToken
} from '../auth/authentication.js';
import {
  DEFAULT_PRIVACY_SETTINGS,
  mergeWithDefaults,
  type PrivacySettings,
  type PrivacyContext
} from '../privacy/controls.js';
import {
  createSkillAttestation,
  verifyAttestation,
  bundleAttestations,
  type Attestation,
  type AttestationBundle,
  type SkillCategory
} from '../reputation/attestations.js';
import {
  storeIdentity,
  getIdentity,
  hasIdentity,
  storePrivacySettings,
  getPrivacySettings,
  storeReceivedAttestation,
  getReceivedAttestations,
  storeIssuedAttestation,
  getIssuedAttestations,
  exportAllData,
  type StoredIdentity
} from '../storage/identity-store.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * Identity service state
 */
export class IdentityService {
  private currentDID: string | null = null;
  private currentKeyPair: KeyPair | null = null;
  private platformKeyPair: KeyPair | null = null;

  /**
   * Initialize the identity service
   */
  async initialize(): Promise<void> {
    // Check if identity exists
    if (await hasIdentity()) {
      // Load existing identity (will need passphrase to decrypt private key)
      console.log('Existing identity found');
    } else {
      console.log('No identity found - user needs to create one');
    }

    // Generate or load platform key pair for token signing
    // TODO: This should be stored securely
    this.platformKeyPair = generateKeyPair();
  }

  /**
   * Create a new identity
   *
   * @param passphrase - Passphrase to encrypt private key
   * @returns Created identity with recovery phrase
   */
  async createNewIdentity(passphrase: string): Promise<{
    did: string;
    document: DIDDocument;
    recoveryPhrase: string;
    formattedPhrase: string;
  }> {
    // Check if identity already exists
    if (await hasIdentity()) {
      throw new Error('Identity already exists. Delete existing identity first.');
    }

    // Generate key pair
    const keyPair = generateKeyPair();

    // Create DID and document
    const identity = createIdentity(keyPair);

    // Generate recovery phrase
    const { mnemonic, formatted } = generateRecoveryPhrase();

    // Encrypt private key
    const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, passphrase);

    // Store identity
    const storedIdentity: StoredIdentity = {
      did: identity.did,
      document: identity.document,
      publicKey: bytesToHex(keyPair.publicKey),
      encryptedPrivateKey,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await storeIdentity(storedIdentity);

    // Store default privacy settings
    await storePrivacySettings(DEFAULT_PRIVACY_SETTINGS);

    // Set current identity
    this.currentDID = identity.did;
    this.currentKeyPair = keyPair;

    return {
      did: identity.did,
      document: identity.document,
      recoveryPhrase: mnemonic,
      formattedPhrase: formatted
    };
  }

  /**
   * Restore identity from recovery phrase
   *
   * @param mnemonic - Recovery phrase
   * @param passphrase - Passphrase to encrypt private key
   */
  async restoreFromRecoveryPhrase(
    mnemonic: string,
    passphrase: string
  ): Promise<{ did: string; document: DIDDocument }> {
    if (!isValidMnemonic(mnemonic)) {
      throw new Error('Invalid recovery phrase');
    }

    // Derive key pair from mnemonic
    const keyPair = mnemonicToKeyPair(mnemonic);

    // Create DID and document
    const identity = createIdentity(keyPair);

    // Encrypt private key
    const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, passphrase);

    // Store identity
    const storedIdentity: StoredIdentity = {
      did: identity.did,
      document: identity.document,
      publicKey: bytesToHex(keyPair.publicKey),
      encryptedPrivateKey,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await storeIdentity(storedIdentity);

    // Store default privacy settings
    await storePrivacySettings(DEFAULT_PRIVACY_SETTINGS);

    // Set current identity
    this.currentDID = identity.did;
    this.currentKeyPair = keyPair;

    return {
      did: identity.did,
      document: identity.document
    };
  }

  /**
   * Unlock identity with passphrase
   *
   * @param passphrase - Passphrase to decrypt private key
   */
  async unlock(passphrase: string): Promise<void> {
    const storedIdentity = await getIdentity();

    if (!storedIdentity) {
      throw new Error('No identity found');
    }

    try {
      const privateKey = decryptPrivateKey(storedIdentity.encryptedPrivateKey, passphrase);
      const publicKey = hexToBytes(storedIdentity.publicKey);

      this.currentDID = storedIdentity.did;
      this.currentKeyPair = { publicKey, privateKey };
    } catch (error) {
      throw new Error('Invalid passphrase');
    }
  }

  /**
   * Lock identity (clear from memory)
   */
  lock(): void {
    this.currentDID = null;
    this.currentKeyPair = null;
  }

  /**
   * Check if identity is unlocked
   */
  isUnlocked(): boolean {
    return this.currentKeyPair !== null;
  }

  /**
   * Get current DID
   */
  getCurrentDID(): string | null {
    return this.currentDID;
  }

  /**
   * Authenticate (create and sign challenge)
   */
  async authenticate(): Promise<{ challenge: AuthChallenge; token: AuthToken }> {
    if (!this.isUnlocked() || !this.currentKeyPair) {
      throw new Error('Identity not unlocked');
    }

    // Create challenge
    const challenge = createAuthChallenge();

    // Sign challenge
    const response = signChallenge(challenge, this.currentDID!, this.currentKeyPair);

    // Generate token
    const token = generateAuthToken(this.currentDID!, this.platformKeyPair!);

    return { challenge, token };
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    const mergedSettings = mergeWithDefaults(settings);
    await storePrivacySettings(mergedSettings);
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(): Promise<PrivacySettings> {
    const settings = await getPrivacySettings();
    return settings || DEFAULT_PRIVACY_SETTINGS;
  }

  /**
   * Issue an attestation to another user
   */
  async issueSkillAttestation(
    subjectDID: string,
    skill: string,
    category: SkillCategory,
    context: string
  ): Promise<Attestation> {
    if (!this.isUnlocked() || !this.currentKeyPair) {
      throw new Error('Identity not unlocked');
    }

    const attestation = createSkillAttestation(
      this.currentDID!,
      subjectDID,
      skill,
      category,
      context,
      this.currentKeyPair
    );

    // Store issued attestation
    await storeIssuedAttestation(attestation);

    return attestation;
  }

  /**
   * Accept a received attestation
   */
  async acceptAttestation(attestation: Attestation): Promise<void> {
    // Verify attestation signature
    // TODO: Look up issuer's public key from their DID
    // For now, just store it
    await storeReceivedAttestation(attestation);
  }

  /**
   * Get all received attestations
   */
  async getMyAttestations(): Promise<Attestation[]> {
    return await getReceivedAttestations();
  }

  /**
   * Get bundled attestations for privacy
   */
  async getMyAttestationBundles(): Promise<AttestationBundle[]> {
    const attestations = await getReceivedAttestations();
    return bundleAttestations(attestations);
  }

  /**
   * Get attestations I've issued to others
   */
  async getIssuedAttestations(): Promise<Attestation[]> {
    return await getIssuedAttestations();
  }

  /**
   * Export all identity data for backup
   */
  async exportData(): Promise<string> {
    const data = await exportAllData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Check if identity exists
   */
  async hasIdentity(): Promise<boolean> {
    return await hasIdentity();
  }
}

/**
 * Global identity service instance
 */
export const identityService = new IdentityService();
