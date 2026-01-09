/**
 * Authentication system without phone/email
 *
 * Uses challenge-response authentication with Ed25519 signatures
 * No passwords, no email verification, no SMS - just cryptographic proofs
 *
 * Aligns with solarpunk values:
 * - No dependency on phone providers or email services
 * - Privacy-preserving (no tracking via phone/email)
 * - Works 100% offline
 * - Accessible to those without phone/email
 */

import { sign, verify, generateChallenge, type KeyPair } from '../crypto/keys.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * Authentication challenge
 */
export interface AuthChallenge {
  challenge: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  challenge: string;
  signature: string;
  did: string;
}

/**
 * Authentication token (short-lived)
 */
export interface AuthToken {
  did: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

/**
 * Challenge expiration time (5 minutes)
 */
const CHALLENGE_EXPIRATION_MS = 5 * 60 * 1000;

/**
 * Token expiration time (24 hours)
 */
const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Generate an authentication challenge
 *
 * @returns Authentication challenge
 */
export function createAuthChallenge(): AuthChallenge {
  const now = Date.now();

  return {
    challenge: generateChallenge(),
    createdAt: now,
    expiresAt: now + CHALLENGE_EXPIRATION_MS
  };
}

/**
 * Verify that a challenge is still valid
 *
 * @param challenge - Challenge to verify
 * @returns true if challenge is valid and not expired
 */
export function isValidChallenge(challenge: AuthChallenge): boolean {
  const now = Date.now();
  return now < challenge.expiresAt;
}

/**
 * Sign an authentication challenge
 *
 * @param challenge - Challenge to sign
 * @param did - User's DID
 * @param keyPair - User's key pair
 * @returns Authentication response with signature
 */
export function signChallenge(
  challenge: AuthChallenge,
  did: string,
  keyPair: KeyPair
): AuthResponse {
  if (!isValidChallenge(challenge)) {
    throw new Error('Challenge has expired');
  }

  const signature = sign(challenge.challenge, keyPair.privateKey);

  return {
    challenge: challenge.challenge,
    signature: bytesToHex(signature),
    did
  };
}

/**
 * Verify an authentication response
 *
 * @param response - Authentication response to verify
 * @param expectedChallenge - The original challenge
 * @param publicKey - Public key to verify against
 * @returns true if response is valid
 */
export function verifyAuthResponse(
  response: AuthResponse,
  expectedChallenge: AuthChallenge,
  publicKey: Uint8Array
): boolean {
  // Check that challenge matches
  if (response.challenge !== expectedChallenge.challenge) {
    return false;
  }

  // Check that challenge hasn't expired
  if (!isValidChallenge(expectedChallenge)) {
    return false;
  }

  // Verify signature
  try {
    const signature = hexToBytes(response.signature);
    return verify(signature, response.challenge, publicKey);
  } catch {
    return false;
  }
}

/**
 * Generate an authentication token after successful challenge
 *
 * @param did - User's DID
 * @param keyPair - Platform's signing key (for token signature)
 * @returns Signed authentication token
 */
export function generateAuthToken(
  did: string,
  keyPair: KeyPair
): AuthToken {
  const now = Date.now();
  const token: AuthToken = {
    did,
    issuedAt: now,
    expiresAt: now + TOKEN_EXPIRATION_MS,
    signature: ''
  };

  // Sign token payload
  const payload = `${did}:${token.issuedAt}:${token.expiresAt}`;
  const signature = sign(payload, keyPair.privateKey);
  token.signature = bytesToHex(signature);

  return token;
}

/**
 * Verify an authentication token
 *
 * @param token - Token to verify
 * @param platformPublicKey - Platform's public key for verification
 * @returns true if token is valid and not expired
 */
export function verifyAuthToken(
  token: AuthToken,
  platformPublicKey: Uint8Array
): boolean {
  const now = Date.now();

  // Check expiration
  if (now > token.expiresAt) {
    return false;
  }

  // Verify signature
  try {
    const payload = `${token.did}:${token.issuedAt}:${token.expiresAt}`;
    const signature = hexToBytes(token.signature);
    return verify(signature, payload, platformPublicKey);
  } catch {
    return false;
  }
}

/**
 * Serialize token for storage
 *
 * @param token - Token to serialize
 * @returns JSON string
 */
export function serializeToken(token: AuthToken): string {
  return JSON.stringify(token);
}

/**
 * Deserialize token from storage
 *
 * @param data - JSON string
 * @returns Authentication token
 */
export function deserializeToken(data: string): AuthToken {
  return JSON.parse(data) as AuthToken;
}

/**
 * Session manager for authentication state
 */
export class AuthSession {
  private currentToken: AuthToken | null = null;

  /**
   * Set the current authentication token
   */
  setToken(token: AuthToken): void {
    this.currentToken = token;
  }

  /**
   * Get the current authentication token
   */
  getToken(): AuthToken | null {
    return this.currentToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(platformPublicKey: Uint8Array): boolean {
    if (!this.currentToken) {
      return false;
    }

    return verifyAuthToken(this.currentToken, platformPublicKey);
  }

  /**
   * Get authenticated DID
   */
  getDID(): string | null {
    if (!this.currentToken) {
      return null;
    }

    return this.currentToken.did;
  }

  /**
   * Clear authentication
   */
  logout(): void {
    this.currentToken = null;
  }
}
