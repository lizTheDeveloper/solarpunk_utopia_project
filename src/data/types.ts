/**
 * Core data types for the platform
 *
 * These types represent the CRDT document schema
 */

import type { PrivacySettings } from '../privacy/controls.js';
import type { Attestation } from '../reputation/attestations.js';

/**
 * User profile information
 */
export interface UserProfile {
  name?: string;
  bio?: string;
  photo?: string;
  location?: {
    lat: number;
    lng: number;
  };
  joinedAt: number;
  lastActiveAt: number;
}

/**
 * Resource offer
 */
export interface ResourceOffer {
  id: string;
  type: 'give' | 'lend' | 'share';
  title: string;
  description: string;
  category: string;
  photos?: string[];
  location?: {
    lat: number;
    lng: number;
  };
  availability: 'available' | 'claimed' | 'completed';
  createdBy: string; // DID
  createdAt: number;
  updatedAt: number;
  claimedBy?: string; // DID
  claimedAt?: number;
}

/**
 * Request/need
 */
export interface Request {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  createdBy: string; // DID
  createdAt: number;
  updatedAt: number;
  fulfilledBy?: string; // DID
  fulfilledAt?: number;
}

/**
 * Identity data in community document
 */
export interface IdentityData {
  did: string;
  profile: UserProfile;
  privacy: PrivacySettings;
  attestationsReceived: string[]; // Attestation IDs (full attestations stored separately)
}

/**
 * Community CRDT document schema
 */
export interface CommunityDocument {
  version: number;
  communityId: string;
  communityName: string;
  createdAt: number;
  updatedAt: number;

  // Identity data per user
  identities: {
    [did: string]: IdentityData;
  };

  // Resources and offers
  resources: {
    [id: string]: ResourceOffer;
  };

  // Requests and needs
  requests: {
    [id: string]: Request;
  };

  // Community metadata
  members: {
    [did: string]: {
      joinedAt: number;
      role: 'member' | 'admin';
    };
  };
}

/**
 * Empty community document template
 */
export function createEmptyCommunityDocument(
  communityId: string,
  communityName: string
): CommunityDocument {
  const now = Date.now();

  return {
    version: 1,
    communityId,
    communityName,
    createdAt: now,
    updatedAt: now,
    identities: {},
    resources: {},
    requests: {},
    members: {}
  };
}
