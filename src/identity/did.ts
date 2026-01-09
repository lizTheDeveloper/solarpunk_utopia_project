/**
 * Decentralized Identifier (DID) implementation using did:key method
 *
 * did:key is perfect for solarpunk values:
 * - No blockchain or ledger required (offline-first)
 * - Self-sovereign (user owns their identity)
 * - Privacy-preserving (no public transaction history)
 * - Portable (works across communities)
 *
 * Spec: https://w3c-ccg.github.io/did-method-key/
 */

import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { bytesToBase58, base58ToBytes } from '../crypto/keys.js';
import type { KeyPair } from '../crypto/keys.js';

/**
 * DID Document structure
 */
export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  capabilityDelegation?: string[];
  capabilityInvocation?: string[];
}

/**
 * Verification method for DID document
 */
export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
}

/**
 * Multicodec prefix for Ed25519 public keys
 * 0xed (237 in decimal)
 */
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);

/**
 * Generate a did:key identifier from an Ed25519 public key
 *
 * Format: did:key:z<base58btc-encoded-multicodec-public-key>
 *
 * @param publicKey - Ed25519 public key (32 bytes)
 * @returns DID string (e.g., "did:key:z6MkhaX...")
 */
export function publicKeyToDID(publicKey: Uint8Array): string {
  // Prepend multicodec prefix for Ed25519
  const multicodecKey = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKey.length);
  multicodecKey.set(ED25519_MULTICODEC_PREFIX);
  multicodecKey.set(publicKey, ED25519_MULTICODEC_PREFIX.length);

  // Encode with base58btc (starts with 'z')
  const encoded = 'z' + bytesToBase58(multicodecKey);

  return `did:key:${encoded}`;
}

/**
 * Extract public key from a did:key identifier
 *
 * @param did - DID string (e.g., "did:key:z6MkhaX...")
 * @returns Ed25519 public key (32 bytes)
 * @throws Error if DID format is invalid
 */
export function didToPublicKey(did: string): Uint8Array {
  if (!did.startsWith('did:key:z')) {
    throw new Error('Invalid did:key format');
  }

  // Remove 'did:key:z' prefix
  const encoded = did.substring(9);

  // Decode from base58btc
  const multicodecKey = base58ToBytes(encoded);

  // Verify multicodec prefix
  if (multicodecKey[0] !== ED25519_MULTICODEC_PREFIX[0] ||
      multicodecKey[1] !== ED25519_MULTICODEC_PREFIX[1]) {
    throw new Error('Invalid multicodec prefix (expected Ed25519)');
  }

  // Extract public key (remove 2-byte prefix)
  return multicodecKey.slice(2);
}

/**
 * Generate a DID document from a public key
 *
 * @param publicKey - Ed25519 public key
 * @returns DID document
 */
export function generateDIDDocument(publicKey: Uint8Array): DIDDocument {
  const did = publicKeyToDID(publicKey);

  // Multibase encoding (base58btc) for public key
  const multicodecKey = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKey.length);
  multicodecKey.set(ED25519_MULTICODEC_PREFIX);
  multicodecKey.set(publicKey, ED25519_MULTICODEC_PREFIX.length);
  const publicKeyMultibase = 'z' + bytesToBase58(multicodecKey);

  const verificationMethodId = `${did}#${publicKeyMultibase}`;

  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1'
    ],
    id: did,
    verificationMethod: [{
      id: verificationMethodId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase
    }],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId],
    capabilityDelegation: [verificationMethodId],
    capabilityInvocation: [verificationMethodId]
  };
}

/**
 * Create a complete identity from a key pair
 *
 * @param keyPair - Ed25519 key pair
 * @returns Identity with DID and document
 */
export function createIdentity(keyPair: KeyPair): {
  did: string;
  document: DIDDocument;
  keyPair: KeyPair;
} {
  const did = publicKeyToDID(keyPair.publicKey);
  const document = generateDIDDocument(keyPair.publicKey);

  return {
    did,
    document,
    keyPair
  };
}

/**
 * Resolve a DID to its document
 * For did:key, the document is derived from the DID itself (no network lookup needed)
 *
 * @param did - DID to resolve
 * @returns DID document
 */
export function resolveDID(did: string): DIDDocument {
  const publicKey = didToPublicKey(did);
  return generateDIDDocument(publicKey);
}

/**
 * Verify that a DID matches a public key
 *
 * @param did - DID to verify
 * @param publicKey - Public key to check
 * @returns true if DID corresponds to the public key
 */
export function verifyDIDOwnership(did: string, publicKey: Uint8Array): boolean {
  try {
    const derivedDID = publicKeyToDID(publicKey);
    return did === derivedDID;
  } catch {
    return false;
  }
}

/**
 * Export identity to portable format
 *
 * @param identity - Identity to export
 * @returns JSON-serializable identity data
 */
export function exportIdentity(identity: {
  did: string;
  document: DIDDocument;
  keyPair: KeyPair;
}): {
  did: string;
  document: DIDDocument;
  publicKey: string;
  privateKey: string;
} {
  return {
    did: identity.did,
    document: identity.document,
    publicKey: bytesToHex(identity.keyPair.publicKey),
    privateKey: bytesToHex(identity.keyPair.privateKey)
  };
}

/**
 * Import identity from portable format
 *
 * @param data - Exported identity data
 * @returns Identity
 */
export function importIdentity(data: {
  did: string;
  document: DIDDocument;
  publicKey: string;
  privateKey: string;
}): {
  did: string;
  document: DIDDocument;
  keyPair: KeyPair;
} {
  const keyPair = {
    publicKey: hexToBytes(data.publicKey),
    privateKey: hexToBytes(data.privateKey)
  };

  // Verify that the DID matches the public key
  if (!verifyDIDOwnership(data.did, keyPair.publicKey)) {
    throw new Error('DID does not match public key');
  }

  return {
    did: data.did,
    document: data.document,
    keyPair
  };
}
