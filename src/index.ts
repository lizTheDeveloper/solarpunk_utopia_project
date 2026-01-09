/**
 * Solarpunk Utopia Platform - Main Entry Point
 *
 * Infrastructure for building post-scarcity communities
 *
 * Phase I Complete:
 * - Group D: Identity Without Surveillance ✅
 * - Group A: Offline-First Core ✅
 * - Group B: Mesh & Resilient Networking ✅
 */

// ============================================================================
// PLATFORM SERVICE (Main API)
// ============================================================================

export {
  PlatformService,
  platformService,
  PlatformState,
  type PlatformOptions
} from './platform/platform-service.js';

// ============================================================================
// IDENTITY SYSTEM (Group D)
// ============================================================================

// Identity Service
export { IdentityService, identityService } from './identity/identity-service.js';

// DID utilities
export {
  publicKeyToDID,
  didToPublicKey,
  generateDIDDocument,
  createIdentity,
  resolveDID,
  verifyDIDOwnership,
  type DIDDocument,
  type VerificationMethod
} from './identity/did.js';

// Authentication
export {
  createAuthChallenge,
  signChallenge,
  verifyAuthResponse,
  generateAuthToken,
  verifyAuthToken,
  AuthSession,
  type AuthChallenge,
  type AuthResponse,
  type AuthToken
} from './auth/authentication.js';

// Privacy Controls
export {
  PrivacyLevel,
  LocationPrecision,
  DEFAULT_PRIVACY_SETTINGS,
  isVisible,
  fuzzyLocation,
  generatePrivacyPreview,
  filterByPrivacy,
  type PrivacySettings,
  type PrivacyContext,
  type ProfilePrivacy,
  type LocationPrivacy,
  type ActivityPrivacy,
  type ReputationPrivacy
} from './privacy/controls.js';

// Reputation & Attestations
export {
  AttestationType,
  SkillCategory,
  createSkillAttestation,
  verifyAttestation,
  bundleAttestations,
  revokeAttestation,
  type Attestation,
  type AttestationBundle,
  type CredentialSubject
} from './reputation/attestations.js';

// Cryptography
export {
  generateKeyPair,
  sign,
  verify,
  encryptPrivateKey,
  decryptPrivateKey,
  generateChallenge,
  hash,
  type KeyPair,
  type EncryptedKey
} from './crypto/keys.js';

// Mnemonic Recovery
export {
  generateMnemonicPhrase,
  isValidMnemonic,
  mnemonicToKeyPair,
  formatMnemonicForDisplay,
  generateRecoveryPhrase
} from './crypto/mnemonic.js';

// Storage
export {
  initIdentityDB,
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
  importAllData,
  type StoredIdentity
} from './storage/identity-store.js';

// ============================================================================
// DATA LAYER (Group A: Offline-First)
// ============================================================================

// CRDT Document Management
export {
  DocumentManager,
  type DocHandle
} from './data/document-manager.js';

// Data Types
export {
  createEmptyCommunityDocument,
  type CommunityDocument,
  type UserProfile,
  type ResourceOffer,
  type Request,
  type IdentityData
} from './data/types.js';

// ============================================================================
// SYNC & NETWORKING (Groups A + B)
// ============================================================================

// Sync Engine
export {
  SyncEngine,
  type SyncMessage,
  type SyncMessageType
} from './sync/sync-engine.js';

// Encryption
export {
  encryptAndSign,
  verifyAndDecrypt,
  deriveSharedKey,
  generateSessionKey,
  isSessionKeyValid,
  type EncryptedPayload,
  type SessionKey
} from './sync/encryption.js';

// Peer Management
export {
  PeerManager,
  WebRTCTransport,
  MeshtasticTransport,
  type PeerInfo,
  type Connection,
  type Transport,
  type TransportType
} from './network/peer.js';
