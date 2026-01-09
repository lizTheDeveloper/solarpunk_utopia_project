/**
 * User-controlled reputation through peer attestations
 *
 * Reputation is built through community attestations, not centralized scores
 * Users control which attestations to share (selective disclosure)
 *
 * Based on Verifiable Credentials standard: https://www.w3.org/TR/vc-data-model/
 *
 * Aligns with solarpunk values:
 * - Peer-to-peer trust building (no central authority)
 * - User-controlled reputation (selective disclosure)
 * - Privacy-preserving (no mandatory public profiles)
 * - Anti-gamification (no scores, just community validation)
 */

import { sign, verify, type KeyPair } from '../crypto/keys.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attestation type
 */
export enum AttestationType {
  Skill = 'SkillAttestation',
  Contribution = 'ContributionAttestation',
  Trust = 'TrustAttestation',
  Participation = 'ParticipationAttestation'
}

/**
 * Skill categories
 */
export enum SkillCategory {
  Repair = 'repair',
  Teaching = 'teaching',
  Gardening = 'gardening',
  Cooking = 'cooking',
  Building = 'building',
  Caregiving = 'caregiving',
  Technical = 'technical',
  Creative = 'creative',
  Other = 'other'
}

/**
 * Credential subject (the claims being made)
 */
export interface CredentialSubject {
  id: string; // DID of the subject
  skill?: string;
  category?: SkillCategory;
  context?: string;
  contribution?: string;
  date?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Cryptographic proof
 */
export interface Proof {
  type: 'Ed25519Signature2020';
  created: string;
  verificationMethod: string;
  proofPurpose: 'assertionMethod';
  proofValue: string;
}

/**
 * Attestation (Verifiable Credential)
 */
export interface Attestation {
  '@context': string[];
  id: string;
  type: AttestationType;
  issuer: string; // DID of issuer
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  proof: Proof;
}

/**
 * Bundled attestations (for privacy-preserving disclosure)
 */
export interface AttestationBundle {
  skill: string;
  category: SkillCategory;
  count: number;
  /** Don't reveal who issued them */
  issuers?: never;
}

/**
 * Create a skill attestation
 *
 * @param issuerDID - DID of the person giving the attestation
 * @param subjectDID - DID of the person receiving the attestation
 * @param skill - Skill being attested to
 * @param category - Skill category
 * @param context - Optional context/description
 * @param issuerKeyPair - Issuer's key pair for signing
 * @returns Signed attestation
 */
export function createSkillAttestation(
  issuerDID: string,
  subjectDID: string,
  skill: string,
  category: SkillCategory,
  context: string,
  issuerKeyPair: KeyPair
): Attestation {
  const attestation: Attestation = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1'
    ],
    id: `urn:uuid:${uuidv4()}`,
    type: AttestationType.Skill,
    issuer: issuerDID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subjectDID,
      skill,
      category,
      context,
      date: new Date().toISOString()
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${issuerDID}#key-1`,
      proofPurpose: 'assertionMethod',
      proofValue: ''
    }
  };

  // Sign the attestation
  attestation.proof.proofValue = signAttestation(attestation, issuerKeyPair);

  return attestation;
}

/**
 * Sign an attestation
 *
 * @param attestation - Attestation to sign (without proof value)
 * @param keyPair - Signer's key pair
 * @returns Signature as hex string
 */
function signAttestation(attestation: Attestation, keyPair: KeyPair): string {
  // Create canonical JSON for signing (exclude proof value)
  const canonical = {
    '@context': attestation['@context'],
    id: attestation.id,
    type: attestation.type,
    issuer: attestation.issuer,
    issuanceDate: attestation.issuanceDate,
    credentialSubject: attestation.credentialSubject
  };

  const message = JSON.stringify(canonical);
  const signature = sign(message, keyPair.privateKey);

  return bytesToHex(signature);
}

/**
 * Verify an attestation signature
 *
 * @param attestation - Attestation to verify
 * @param issuerPublicKey - Public key of the issuer
 * @returns true if signature is valid
 */
export function verifyAttestation(
  attestation: Attestation,
  issuerPublicKey: Uint8Array
): boolean {
  // Recreate canonical JSON
  const canonical = {
    '@context': attestation['@context'],
    id: attestation.id,
    type: attestation.type,
    issuer: attestation.issuer,
    issuanceDate: attestation.issuanceDate,
    credentialSubject: attestation.credentialSubject
  };

  const message = JSON.stringify(canonical);

  try {
    const signature = hexToBytes(attestation.proof.proofValue);
    return verify(signature, message, issuerPublicKey);
  } catch {
    return false;
  }
}

/**
 * Check if an attestation has expired
 *
 * @param attestation - Attestation to check
 * @returns true if expired
 */
export function isExpired(attestation: Attestation): boolean {
  if (!attestation.expirationDate) {
    return false;
  }

  const now = new Date();
  const expiration = new Date(attestation.expirationDate);

  return now > expiration;
}

/**
 * Bundle attestations for privacy-preserving disclosure
 * Groups attestations by skill without revealing who issued them
 *
 * @param attestations - List of attestations
 * @returns Bundled attestations grouped by skill
 */
export function bundleAttestations(attestations: Attestation[]): AttestationBundle[] {
  const bundles = new Map<string, AttestationBundle>();

  for (const attestation of attestations) {
    if (attestation.type !== AttestationType.Skill) {
      continue;
    }

    const skill = attestation.credentialSubject.skill;
    const category = attestation.credentialSubject.category;

    if (!skill || !category) {
      continue;
    }

    const key = `${category}:${skill}`;
    const existing = bundles.get(key);

    if (existing) {
      existing.count++;
    } else {
      bundles.set(key, {
        skill,
        category: category as SkillCategory,
        count: 1
      });
    }
  }

  return Array.from(bundles.values());
}

/**
 * Filter attestations by category
 *
 * @param attestations - List of attestations
 * @param category - Category to filter by
 * @returns Filtered attestations
 */
export function filterByCategory(
  attestations: Attestation[],
  category: SkillCategory
): Attestation[] {
  return attestations.filter(
    a => a.type === AttestationType.Skill &&
         a.credentialSubject.category === category
  );
}

/**
 * Get unique skills from attestations
 *
 * @param attestations - List of attestations
 * @returns List of unique skills
 */
export function getUniqueSkills(attestations: Attestation[]): string[] {
  const skills = new Set<string>();

  for (const attestation of attestations) {
    if (attestation.type === AttestationType.Skill && attestation.credentialSubject.skill) {
      skills.add(attestation.credentialSubject.skill);
    }
  }

  return Array.from(skills);
}

/**
 * Revoke an attestation (by issuer)
 *
 * Creates a revocation credential that invalidates the original
 *
 * @param attestationId - ID of attestation to revoke
 * @param issuerDID - DID of issuer (must match original issuer)
 * @param reason - Reason for revocation
 * @param issuerKeyPair - Issuer's key pair
 * @returns Revocation credential
 */
export function revokeAttestation(
  attestationId: string,
  issuerDID: string,
  reason: string,
  issuerKeyPair: KeyPair
): Attestation {
  const revocation: Attestation = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1'
    ],
    id: `urn:uuid:${uuidv4()}`,
    type: AttestationType.Trust, // Use Trust type for revocations
    issuer: issuerDID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: attestationId,
      revoked: true,
      reason
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${issuerDID}#key-1`,
      proofPurpose: 'assertionMethod',
      proofValue: ''
    }
  };

  revocation.proof.proofValue = signAttestation(revocation, issuerKeyPair);

  return revocation;
}

/**
 * Export attestations to JSON
 *
 * @param attestations - Attestations to export
 * @returns JSON string
 */
export function exportAttestations(attestations: Attestation[]): string {
  return JSON.stringify(attestations, null, 2);
}

/**
 * Import attestations from JSON
 *
 * @param json - JSON string
 * @returns Parsed attestations
 */
export function importAttestations(json: string): Attestation[] {
  return JSON.parse(json) as Attestation[];
}
