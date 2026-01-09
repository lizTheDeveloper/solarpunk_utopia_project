/**
 * End-to-end encryption utilities
 *
 * REQ-DEPLOY-016: End-to-End Encryption
 * The platform SHALL support end-to-end encryption for private messages
 * and sensitive community data.
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

export interface KeyPair {
  publicKey: string; // Base64 encoded
  secretKey: string; // Base64 encoded
}

export interface EncryptedMessage {
  ciphertext: string; // Base64 encoded
  nonce: string; // Base64 encoded
  senderPublicKey: string; // Base64 encoded
}

/**
 * Generate a new key pair for encryption
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();

  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Encrypt a message for a specific recipient
 * Uses NaCl's box (public-key authenticated encryption)
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderSecretKey: string
): EncryptedMessage {
  const messageUint8 = encodeUTF8(message);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const recipientPubKey = decodeBase64(recipientPublicKey);
  const senderSecKey = decodeBase64(senderSecretKey);

  const ciphertext = nacl.box(messageUint8, nonce, recipientPubKey, senderSecKey);

  // Derive sender's public key from their secret key
  const senderKeyPair = nacl.box.keyPair.fromSecretKey(senderSecKey);

  return {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
    senderPublicKey: encodeBase64(senderKeyPair.publicKey),
  };
}

/**
 * Decrypt a message from a sender
 */
export function decryptMessage(
  encrypted: EncryptedMessage,
  recipientSecretKey: string
): string | null {
  try {
    const ciphertext = decodeBase64(encrypted.ciphertext);
    const nonce = decodeBase64(encrypted.nonce);
    const senderPubKey = decodeBase64(encrypted.senderPublicKey);
    const recipientSecKey = decodeBase64(recipientSecretKey);

    const decrypted = nacl.box.open(ciphertext, nonce, senderPubKey, recipientSecKey);

    if (!decrypted) {
      return null;
    }

    return decodeUTF8(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Encrypt data with a symmetric key (for local storage)
 * Uses NaCl's secretbox (authenticated encryption)
 */
export function encryptSymmetric(data: string, key: Uint8Array): { ciphertext: string; nonce: string } {
  const dataUint8 = encodeUTF8(data);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  const ciphertext = nacl.secretbox(dataUint8, nonce, key);

  return {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt data with a symmetric key
 */
export function decryptSymmetric(ciphertext: string, nonce: string, key: Uint8Array): string | null {
  try {
    const ciphertextUint8 = decodeBase64(ciphertext);
    const nonceUint8 = decodeBase64(nonce);

    const decrypted = nacl.secretbox.open(ciphertextUint8, nonceUint8, key);

    if (!decrypted) {
      return null;
    }

    return decodeUTF8(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Generate a random symmetric key
 */
export function generateSymmetricKey(): Uint8Array {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

/**
 * Generate a key from a password (using NaCl's hash)
 * Note: This is a simple derivation. For production, use a proper KDF like scrypt or argon2
 */
export function deriveKeyFromPassword(password: string): Uint8Array {
  const passwordBytes = encodeUTF8(password);
  const hash = nacl.hash(passwordBytes);
  // Use first 32 bytes for the key
  return hash.slice(0, nacl.secretbox.keyLength);
}

/**
 * Store key pair in local storage (encrypted with password)
 */
export function storeKeyPair(keyPair: KeyPair, password: string): void {
  const key = deriveKeyFromPassword(password);
  const data = JSON.stringify(keyPair);
  const encrypted = encryptSymmetric(data, key);

  localStorage.setItem('encrypted_keypair', JSON.stringify(encrypted));
}

/**
 * Load key pair from local storage
 */
export function loadKeyPair(password: string): KeyPair | null {
  const encryptedStr = localStorage.getItem('encrypted_keypair');
  if (!encryptedStr) return null;

  try {
    const encrypted = JSON.parse(encryptedStr);
    const key = deriveKeyFromPassword(password);
    const decrypted = decryptSymmetric(encrypted.ciphertext, encrypted.nonce, key);

    if (!decrypted) return null;

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to load key pair:', error);
    return null;
  }
}
