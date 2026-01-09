/**
 * Core type definitions for the Solarpunk Utopia Platform
 * Following Value Flows vocabulary concepts adapted for gift economy
 */

export type ResourceType =
  | 'tool'
  | 'equipment'
  | 'space'
  | 'energy'
  | 'food'
  | 'skill'
  | 'time'
  | 'robot'
  | 'fabrication'
  | 'other';

export type ShareMode = 'give' | 'lend' | 'share' | 'borrow';

export type UrgencyLevel = 'casual' | 'helpful' | 'needed' | 'urgent';

/**
 * Economic Resource - represents a resource in the community
 * Based on Value Flows EconomicResource
 */
export interface Resource {
  id: string;
  name: string;
  description: string;
  resourceType: ResourceType;
  shareMode: ShareMode;
  available: boolean;
  ownerId: string;
  location?: string;
  photos?: string[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Need or Request posted by community member
 */
export interface Need {
  id: string;
  userId: string;
  description: string;
  urgency: UrgencyLevel;
  resourceType?: ResourceType;
  fulfilled: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Skill or time offer in the time bank
 */
export interface SkillOffer {
  id: string;
  userId: string;
  skillName: string;
  description: string;
  categories: string[];
  available: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Economic Event - represents an action/exchange in the community
 * Based on Value Flows EconomicEvent
 */
export interface EconomicEvent {
  id: string;
  action: 'give' | 'transfer' | 'lend' | 'return' | 'use' | 'work' | 'emergency-alert';
  providerId: string;
  receiverId: string;
  resourceId: string;
  note?: string;
  createdAt: number;
}

/**
 * User profile in the community
 */
export interface UserProfile {
  id: string;
  did: string; // Decentralized identifier (did:key)
  displayName: string;
  bio?: string;
  location?: string;
  joinedAt: number;
  publicKey: string; // Ed25519 public key (hex-encoded) for E2E encryption
  privacySettings?: {
    profile: {
      name: 'private' | 'community' | 'federated' | 'public';
      bio: 'private' | 'community' | 'federated' | 'public';
      photo: 'private' | 'community' | 'federated' | 'public';
      contact: 'private' | 'community' | 'federated' | 'public';
    };
    location: {
      precision: 'exact' | 'neighborhood' | 'city' | 'region' | 'hidden';
      visibility: 'private' | 'community' | 'federated' | 'public';
    };
  };
}

/**
 * Community metadata
 */
export interface Community {
  id: string;
  name: string;
  description: string;
  geographicBounds?: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
  };
  createdAt: number;
  memberCount: number;
}

/**
 * Local database schema - all collections
 */
export interface DatabaseSchema {
  resources: Record<string, Resource>;
  needs: Record<string, Need>;
  skills: Record<string, SkillOffer>;
  events: Record<string, EconomicEvent>;
  users: Record<string, UserProfile>;
  community: Community;
  checkIns: Record<string, CheckIn>;
  careCircles: Record<string, CareCircle>;
  missedCheckInAlerts: Record<string, MissedCheckInAlert>;
  emergencyAlerts: Record<string, EmergencyAlert>;
}

/**
 * Sync status for offline-first operation
 */
export interface SyncStatus {
  lastSyncTime: number;
  pendingChanges: number;
  isOnline: boolean;
  connectedPeers: number;
}

/**
 * Check-in status for community care
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 */
export type CheckInStatus = 'okay' | 'need-support' | 'emergency';

/**
 * Check-in record
 */
export interface CheckIn {
  id: string;
  userId: string;
  status: CheckInStatus;
  message?: string;
  createdAt: number;
  acknowledged?: boolean;
  acknowledgedBy?: string[];
  acknowledgedAt?: number;
}

/**
 * Care Circle - designated contacts for check-in support
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 */
export interface CareCircle {
  id: string;
  userId: string; // The person being cared for
  members: string[]; // User IDs of care circle members
  checkInEnabled: boolean; // Opt-in to check-in monitoring
  preferredCheckInTime?: number; // Time of day (in minutes from midnight)
  checkInFrequency: 'daily' | 'twice-daily' | 'weekly'; // How often to expect check-ins
  missedCheckInThreshold: number; // Hours before alerting care circle
  escalationThreshold: number; // Number of consecutive missed check-ins before escalation
  createdAt: number;
  updatedAt: number;
}

/**
 * Missed Check-in Alert
 */
export interface MissedCheckInAlert {
  id: string;
  userId: string; // The person who missed check-in
  careCircleId: string;
  consecutiveMissed: number;
  lastCheckInAt?: number;
  alertSentAt: number;
  escalated: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string[];
}

/**
 * Emergency Alert - REQ-CARE-002: Emergency Alert System
 * Allows vulnerable members to quickly alert their care network
 */
export interface EmergencyAlert {
  id: string;
  userId: string; // Person triggering the emergency
  careCircleId: string;
  message?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  severity: 'urgent' | 'emergency';
  contactEmergencyServices: boolean;
  triggeredAt: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  resolution?: string;
  responses: Array<{
    responderId: string;
    timestamp: number;
    message?: string;
    eta?: number; // Estimated time of arrival in minutes
    status: 'on-way' | 'contacted' | 'arrived' | 'resolved';
  }>;
}
