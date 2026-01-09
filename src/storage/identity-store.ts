/**
 * Local-first storage for identity data
 *
 * Uses IndexedDB for offline-first persistence
 * All data stored locally on device
 *
 * Aligns with solarpunk values:
 * - Data sovereignty (user owns their data)
 * - Offline-first (no cloud required)
 * - Privacy-preserving (no external servers)
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { DIDDocument } from '../identity/did.js';
import type { PrivacySettings } from '../privacy/controls.js';
import type { Attestation } from '../reputation/attestations.js';
import type { EncryptedKey } from '../crypto/keys.js';

const DB_NAME = 'solarpunk-identity';
const DB_VERSION = 1;

/**
 * Stored identity
 */
export interface StoredIdentity {
  did: string;
  document: DIDDocument;
  publicKey: string;  // hex-encoded
  encryptedPrivateKey: EncryptedKey;
  createdAt: number;
  updatedAt: number;
}

/**
 * Identity database schema
 */
interface IdentityDB {
  identity: {
    key: string; // 'current'
    value: StoredIdentity;
  };
  privacySettings: {
    key: string; // 'current'
    value: PrivacySettings;
  };
  attestationsReceived: {
    key: string; // attestation ID
    value: Attestation;
    indexes: {
      issuer: string;
      type: string;
      issuanceDate: number;
    };
  };
  attestationsIssued: {
    key: string; // attestation ID
    value: Attestation;
    indexes: {
      subject: string;
      type: string;
      issuanceDate: number;
    };
  };
  revocations: {
    key: string; // revoked attestation ID
    value: {
      attestationId: string;
      revokedAt: number;
      reason: string;
    };
  };
}

let dbInstance: IDBPDatabase<IdentityDB> | null = null;

/**
 * Initialize the identity database
 */
export async function initIdentityDB(): Promise<IDBPDatabase<IdentityDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<IdentityDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Identity store
      if (!db.objectStoreNames.contains('identity')) {
        db.createObjectStore('identity');
      }

      // Privacy settings store
      if (!db.objectStoreNames.contains('privacySettings')) {
        db.createObjectStore('privacySettings');
      }

      // Received attestations
      if (!db.objectStoreNames.contains('attestationsReceived')) {
        const receivedStore = db.createObjectStore('attestationsReceived');
        receivedStore.createIndex('issuer', 'issuer');
        receivedStore.createIndex('type', 'type');
        receivedStore.createIndex('issuanceDate', 'issuanceDate');
      }

      // Issued attestations
      if (!db.objectStoreNames.contains('attestationsIssued')) {
        const issuedStore = db.createObjectStore('attestationsIssued');
        issuedStore.createIndex('subject', 'credentialSubject.id');
        issuedStore.createIndex('type', 'type');
        issuedStore.createIndex('issuanceDate', 'issuanceDate');
      }

      // Revocations
      if (!db.objectStoreNames.contains('revocations')) {
        db.createObjectStore('revocations');
      }
    }
  });

  return dbInstance;
}

/**
 * Store identity
 */
export async function storeIdentity(identity: StoredIdentity): Promise<void> {
  const db = await initIdentityDB();
  await db.put('identity', identity, 'current');
}

/**
 * Get current identity
 */
export async function getIdentity(): Promise<StoredIdentity | undefined> {
  const db = await initIdentityDB();
  return await db.get('identity', 'current');
}

/**
 * Check if identity exists
 */
export async function hasIdentity(): Promise<boolean> {
  const identity = await getIdentity();
  return identity !== undefined;
}

/**
 * Delete identity (careful!)
 */
export async function deleteIdentity(): Promise<void> {
  const db = await initIdentityDB();
  await db.delete('identity', 'current');
}

/**
 * Store privacy settings
 */
export async function storePrivacySettings(settings: PrivacySettings): Promise<void> {
  const db = await initIdentityDB();
  await db.put('privacySettings', settings, 'current');
}

/**
 * Get privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings | undefined> {
  const db = await initIdentityDB();
  return await db.get('privacySettings', 'current');
}

/**
 * Store received attestation
 */
export async function storeReceivedAttestation(attestation: Attestation): Promise<void> {
  const db = await initIdentityDB();
  await db.put('attestationsReceived', attestation, attestation.id);
}

/**
 * Get all received attestations
 */
export async function getReceivedAttestations(): Promise<Attestation[]> {
  const db = await initIdentityDB();
  return await db.getAll('attestationsReceived');
}

/**
 * Get received attestations by type
 */
export async function getReceivedAttestationsByType(type: string): Promise<Attestation[]> {
  const db = await initIdentityDB();
  return await db.getAllFromIndex('attestationsReceived', 'type', type);
}

/**
 * Get received attestations from specific issuer
 */
export async function getReceivedAttestationsFromIssuer(issuerDID: string): Promise<Attestation[]> {
  const db = await initIdentityDB();
  return await db.getAllFromIndex('attestationsReceived', 'issuer', issuerDID);
}

/**
 * Delete received attestation
 */
export async function deleteReceivedAttestation(attestationId: string): Promise<void> {
  const db = await initIdentityDB();
  await db.delete('attestationsReceived', attestationId);
}

/**
 * Store issued attestation
 */
export async function storeIssuedAttestation(attestation: Attestation): Promise<void> {
  const db = await initIdentityDB();
  await db.put('attestationsIssued', attestation, attestation.id);
}

/**
 * Get all issued attestations
 */
export async function getIssuedAttestations(): Promise<Attestation[]> {
  const db = await initIdentityDB();
  return await db.getAll('attestationsIssued');
}

/**
 * Get issued attestations for specific subject
 */
export async function getIssuedAttestationsForSubject(subjectDID: string): Promise<Attestation[]> {
  const db = await initIdentityDB();
  const all = await db.getAll('attestationsIssued');
  return all.filter(a => a.credentialSubject.id === subjectDID);
}

/**
 * Store revocation
 */
export async function storeRevocation(
  attestationId: string,
  reason: string
): Promise<void> {
  const db = await initIdentityDB();
  await db.put('revocations', {
    attestationId,
    revokedAt: Date.now(),
    reason
  }, attestationId);
}

/**
 * Check if attestation is revoked
 */
export async function isRevoked(attestationId: string): Promise<boolean> {
  const db = await initIdentityDB();
  const revocation = await db.get('revocations', attestationId);
  return revocation !== undefined;
}

/**
 * Export all identity data
 */
export async function exportAllData(): Promise<{
  identity: StoredIdentity | undefined;
  privacySettings: PrivacySettings | undefined;
  attestationsReceived: Attestation[];
  attestationsIssued: Attestation[];
}> {
  return {
    identity: await getIdentity(),
    privacySettings: await getPrivacySettings(),
    attestationsReceived: await getReceivedAttestations(),
    attestationsIssued: await getIssuedAttestations()
  };
}

/**
 * Import identity data
 */
export async function importAllData(data: {
  identity?: StoredIdentity;
  privacySettings?: PrivacySettings;
  attestationsReceived?: Attestation[];
  attestationsIssued?: Attestation[];
}): Promise<void> {
  if (data.identity) {
    await storeIdentity(data.identity);
  }

  if (data.privacySettings) {
    await storePrivacySettings(data.privacySettings);
  }

  if (data.attestationsReceived) {
    for (const attestation of data.attestationsReceived) {
      await storeReceivedAttestation(attestation);
    }
  }

  if (data.attestationsIssued) {
    for (const attestation of data.attestationsIssued) {
      await storeIssuedAttestation(attestation);
    }
  }
}

/**
 * Clear all identity data (use with caution!)
 */
export async function clearAllData(): Promise<void> {
  const db = await initIdentityDB();
  const stores = ['identity', 'privacySettings', 'attestationsReceived', 'attestationsIssued', 'revocations'];

  for (const store of stores) {
    await db.clear(store as any);
  }
}
