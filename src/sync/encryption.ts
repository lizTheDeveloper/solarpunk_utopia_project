/**
 * End-to-end encryption for sync
 *
 * Uses identity system's DID-based keys
 * Implements authenticated encryption with associated data (AEAD)
 */

import nacl from 'tweetnacl';
import { encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { randomBytes } from '@noble/hashes/utils';
import { sign, verify, type KeyPair } from '../crypto/keys.js';

/**
 * Encrypted payload structure
 */
export interface EncryptedPayload {
  version: 1;
  algorithm: 'xchacha20-poly1305';
  nonce: string; // hex
  ciphertext: string; // hex
  signature: string; // hex
  signer: string; // DID
}

/**
 * Encrypt data with symmetric key and sign with identity key
 *
 * @param plaintext - Data to encrypt
 * @param sharedKey - Symmetric key (32 bytes)
 * @param signingKey - Key pair for signing
 * @param signerDID - DID of signer
 * @returns Encrypted and signed payload
 */
export function encryptAndSign(
  plaintext: Uint8Array,
  sharedKey: Uint8Array,
  signingKey: KeyPair,
  signerDID: string
): EncryptedPayload {
  // Generate random nonce (24 bytes for XChaCha20)
  const nonce = randomBytes(24);

  // Encrypt with XChaCha20-Poly1305
  const ciphertext = nacl.secretbox(plaintext, nonce, sharedKey);

  // Create signature over ciphertext
  const toSign = new Uint8Array(nonce.length + ciphertext.length);
  toSign.set(nonce);
  toSign.set(ciphertext, nonce.length);
  const signature = sign(toSign, signingKey.privateKey);

  return {
    version: 1,
    algorithm: 'xchacha20-poly1305',
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    signature: bytesToHex(signature),
    signer: signerDID
  };
}

/**
 * Verify signature and decrypt data
 *
 * @param payload - Encrypted payload
 * @param sharedKey - Symmetric key (32 bytes)
 * @param signerPublicKey - Public key for signature verification
 * @returns Decrypted data or null if verification fails
 */
export function verifyAndDecrypt(
  payload: EncryptedPayload,
  sharedKey: Uint8Array,
  signerPublicKey: Uint8Array
): Uint8Array | null {
  if (payload.version !== 1) {
    throw new Error('Unsupported payload version');
  }

  if (payload.algorithm !== 'xchacha20-poly1305') {
    throw new Error('Unsupported algorithm');
  }

  const nonce = hexToBytes(payload.nonce);
  const ciphertext = hexToBytes(payload.ciphertext);
  const signature = hexToBytes(payload.signature);

  // Verify signature
  const toVerify = new Uint8Array(nonce.length + ciphertext.length);
  toVerify.set(nonce);
  toVerify.set(ciphertext, nonce.length);

  if (!verify(signature, toVerify, signerPublicKey)) {
    return null; // Signature verification failed
  }

  // Decrypt
  const plaintext = nacl.secretbox.open(ciphertext, nonce, sharedKey);

  return plaintext;
}

/**
 * Derive shared symmetric key from community ID and secret
 *
 * This is a simple approach - in production, use proper key exchange
 *
 * @param communityId - Community identifier
 * @param secret - Shared secret (from community setup)
 * @returns 32-byte symmetric key
 */
export function deriveSharedKey(communityId: string, secret: string): Uint8Array {
  const { pbkdf2 } = require('@noble/hashes/pbkdf2');
  const { sha256 } = require('@noble/hashes/sha256');

  const salt = encodeUTF8(communityId);
  const password = encodeUTF8(secret);

  return pbkdf2(sha256, password, salt, {
    c: 10000, // iterations
    dkLen: 32 // 32 bytes = 256 bits
  });
}

/**
 * Serialize encrypted payload to JSON
 */
export function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

/**
 * Deserialize encrypted payload from JSON
 */
export function deserializeEncryptedPayload(json: string): EncryptedPayload {
  return JSON.parse(json) as EncryptedPayload;
}

/**
 * Session key for temporary encryption during sync
 */
export interface SessionKey {
  key: Uint8Array;
  expiresAt: number;
}

/**
 * Generate ephemeral session key
 */
export function generateSessionKey(lifetimeMs: number = 3600000): SessionKey {
  return {
    key: randomBytes(32),
    expiresAt: Date.now() + lifetimeMs
  };
}

/**
 * Check if session key is still valid
 */
export function isSessionKeyValid(sessionKey: SessionKey): boolean {
  return Date.now() < sessionKey.expiresAt;
}
