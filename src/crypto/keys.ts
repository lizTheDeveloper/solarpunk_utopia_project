/**
 * Core cryptography utilities for the Solarpunk Utopia Platform
 *
 * Uses @noble/ed25519 for Ed25519 signatures (pure JS, no native dependencies)
 * Follows solarpunk values: offline-first, no dependencies on corporate infrastructure
 */

import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Key pair for Ed25519 signatures
 */
export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Encrypted key storage format
 */
export interface EncryptedKey {
  ciphertext: string;
  salt: string;
  nonce: string;
  algorithm: 'xsalsa20-poly1305';
}

/**
 * Generate a new Ed25519 key pair
 *
 * @returns KeyPair with public and private keys
 */
export function generateKeyPair(): KeyPair {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);

  return {
    publicKey,
    privateKey
  };
}

/**
 * Sign a message with a private key
 *
 * @param message - Message to sign (as Uint8Array or string)
 * @param privateKey - Private key to sign with
 * @returns Signature as Uint8Array
 */
export function sign(message: Uint8Array | string, privateKey: Uint8Array): Uint8Array {
  const messageBytes = typeof message === 'string'
    ? new TextEncoder().encode(message)
    : message;

  return ed25519.sign(messageBytes, privateKey);
}

/**
 * Verify a signature against a public key
 *
 * @param signature - Signature to verify
 * @param message - Original message
 * @param publicKey - Public key to verify against
 * @returns true if signature is valid
 */
export function verify(
  signature: Uint8Array,
  message: Uint8Array | string,
  publicKey: Uint8Array
): boolean {
  const messageBytes = typeof message === 'string'
    ? new TextEncoder().encode(message)
    : message;

  try {
    return ed25519.verify(signature, messageBytes, publicKey);
  } catch {
    return false;
  }
}

/**
 * Derive an encryption key from a passphrase
 * Uses PBKDF2 with SHA-256, 100,000 iterations
 *
 * @param passphrase - User passphrase
 * @param salt - Salt for key derivation (32 bytes)
 * @returns Derived key (32 bytes)
 */
export function deriveKey(passphrase: string, salt: Uint8Array): Uint8Array {
  const passphraseBytes = new TextEncoder().encode(passphrase);
  return pbkdf2(sha256, passphraseBytes, salt, {
    c: 100000, // 100k iterations
    dkLen: 32  // 32 bytes = 256 bits
  });
}

/**
 * Encrypt data using XSalsa20-Poly1305 (authenticated encryption)
 *
 * This provides:
 * - Confidentiality: XSalsa20 stream cipher
 * - Authenticity: Poly1305 MAC
 * - Protection against tampering and forgery
 *
 * @param plaintext - Data to encrypt
 * @param key - Encryption key (32 bytes)
 * @param nonce - Nonce for encryption (24 bytes)
 * @returns Encrypted data with authentication tag
 */
function sealedEncrypt(plaintext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return nacl.secretbox(plaintext, nonce, key);
}

/**
 * Decrypt data using XSalsa20-Poly1305 (authenticated decryption)
 *
 * Verifies the authentication tag before decrypting.
 * Returns null if authentication fails (wrong key, corrupted data, or tampering).
 *
 * @param ciphertext - Encrypted data with authentication tag
 * @param key - Decryption key (32 bytes)
 * @param nonce - Nonce used for encryption (24 bytes)
 * @returns Decrypted data or null if authentication fails
 */
function sealedDecrypt(ciphertext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array | null {
  return nacl.secretbox.open(ciphertext, nonce, key);
}

/**
 * Encrypt a private key with a passphrase
 *
 * Uses PBKDF2 for key derivation and XSalsa20-Poly1305 for authenticated encryption.
 * This provides strong protection against:
 * - Brute force attacks (via PBKDF2 with 100k iterations)
 * - Tampering detection (via Poly1305 MAC)
 * - Known-plaintext attacks (via cryptographic stream cipher)
 *
 * @param privateKey - Private key to encrypt
 * @param passphrase - Passphrase for encryption
 * @returns Encrypted key data
 */
export function encryptPrivateKey(
  privateKey: Uint8Array,
  passphrase: string
): EncryptedKey {
  const salt = randomBytes(32);
  const nonce = randomBytes(24);
  const key = deriveKey(passphrase, salt);

  // Use XSalsa20-Poly1305 authenticated encryption
  const ciphertext = sealedEncrypt(privateKey, key, nonce);

  return {
    ciphertext: encodeBase64(ciphertext),
    salt: bytesToHex(salt),
    nonce: encodeBase64(nonce),
    algorithm: 'xsalsa20-poly1305'
  };
}

/**
 * Decrypt a private key with a passphrase
 *
 * Verifies the authentication tag before decrypting to ensure:
 * - The passphrase is correct
 * - The data has not been tampered with
 * - The data has not been corrupted
 *
 * @param encrypted - Encrypted key data
 * @param passphrase - Passphrase for decryption
 * @returns Decrypted private key
 * @throws Error if decryption fails (wrong passphrase or corrupted data)
 */
export function decryptPrivateKey(
  encrypted: EncryptedKey,
  passphrase: string
): Uint8Array {
  const salt = hexToBytes(encrypted.salt);
  const ciphertext = decodeBase64(encrypted.ciphertext);
  const nonce = decodeBase64(encrypted.nonce);
  const key = deriveKey(passphrase, salt);

  // Use XSalsa20-Poly1305 authenticated decryption
  const privateKey = sealedDecrypt(ciphertext, key, nonce);

  if (!privateKey) {
    throw new Error('Decryption failed - wrong passphrase or corrupted data');
  }

  return privateKey;
}

/**
 * Generate a cryptographically secure random challenge
 * Used for authentication flows
 *
 * @returns Random challenge (32 bytes, hex-encoded)
 */
export function generateChallenge(): string {
  return bytesToHex(randomBytes(32));
}

/**
 * Hash data with SHA-256
 *
 * @param data - Data to hash
 * @returns Hash as Uint8Array
 */
export function hash(data: Uint8Array | string): Uint8Array {
  const dataBytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;

  return sha256(dataBytes);
}

/**
 * Convert bytes to base58 (for DID encoding)
 *
 * @param bytes - Bytes to encode
 * @returns Base58 string
 */
export function bytesToBase58(bytes: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const base = BigInt(58);

  let num = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    num = num * BigInt(256) + BigInt(bytes[i]);
  }

  let result = '';
  while (num > 0) {
    const remainder = Number(num % base);
    result = ALPHABET[remainder] + result;
    num = num / base;
  }

  // Add leading '1's for leading zero bytes
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result = '1' + result;
  }

  return result;
}

/**
 * Convert base58 to bytes
 *
 * @param str - Base58 string
 * @returns Bytes
 */
export function base58ToBytes(str: string): Uint8Array {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const base = BigInt(58);

  let num = BigInt(0);
  for (let i = 0; i < str.length; i++) {
    const digit = ALPHABET.indexOf(str[i]);
    if (digit < 0) throw new Error('Invalid base58 character');
    num = num * base + BigInt(digit);
  }

  const bytes: number[] = [];
  while (num > 0) {
    bytes.unshift(Number(num % BigInt(256)));
    num = num / BigInt(256);
  }

  // Add leading zero bytes for leading '1's
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}
