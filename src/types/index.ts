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
 * Community metadata (singleton for the local community)
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
 * Membership models for community groups
 * REQ-GOV-001: Community Groups and Communes
 */
export type MembershipModel = 'open' | 'application' | 'invitation';

/**
 * Governance structures for community groups
 * REQ-GOV-001: Democratic governance options
 */
export type GovernanceStructure = 'consensus' | 'consent' | 'majority' | 'supermajority' | 'delegation' | 'custom';

/**
 * Community Group - a subgroup within the platform (mutual aid network, commune, etc.)
 * REQ-GOV-001: Community Groups and Communes
 * REQ-GOV-002: Community Philosophy and Values
 */
export interface CommunityGroup {
  id: string;
  name: string;
  description: string;

  // Philosophy and values
  philosophy: {
    coreValues: string[];
    decisionMaking: string;
    conflictResolution: string;
    commitmentExpectations: string;
    relationshipToNetworks: string;
    economicModel: string;
  };

  // Location
  location: {
    type: 'geographic' | 'virtual' | 'hybrid';
    description: string;
    boundaries?: any;
    coordinates?: { latitude: number; longitude: number };
  };

  // Membership
  membership: {
    model: MembershipModel;
    memberCount: number;
    memberIds: string[];
    applicationProcess: string;
    trialPeriod?: number;
  };

  // Governance
  governance: {
    structure: GovernanceStructure;
    customDescription: string;
    agreements: Array<{
      id: string;
      text: string;
      addedAt: number;
    }>;
  };

  // Metadata
  createdAt: number;
  lastModified: number;
  createdBy: string;
  version: number;

  // Status
  status: 'active' | 'inactive' | 'archived';
  visibility: 'public' | 'private' | 'unlisted';
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
  communityGroups: Record<string, CommunityGroup>;
  checkIns: Record<string, CheckIn>;
  careCircles: Record<string, CareCircle>;
  careActivities: Record<string, CareActivity>;
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
 * Care Circle Member - member of a care circle with role and availability
 * REQ-CARE-001: Care circle coordination
 */
export interface CareCircleMember {
  userId: string;
  role?: string; // e.g., "daily check-in", "grocery helper", "medical companion"
  availability?: {
    daysOfWeek?: number[]; // 0 = Sunday, 6 = Saturday
    timesOfDay?: ('morning' | 'afternoon' | 'evening' | 'night')[];
  };
  skills?: string[]; // e.g., "cooking", "transportation", "emotional support"
  joinedAt: number;
  active: boolean;
}

/**
 * Care Need - a specific need being tracked within a care circle
 * REQ-CARE-001: Track needs and how they're being met
 */
export interface CareNeed {
  id: string;
  type: string; // e.g., "daily check-in", "groceries", "transportation", "medical", "companionship"
  description?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'as-needed';
  preferredTimes?: string[];
  isMet: boolean;
  assignedTo?: string[]; // userId[]
  createdAt: number;
  updatedAt: number;
}

/**
 * Care Circle - designated contacts and coordination for ongoing support
 * REQ-CARE-001: Check-In Support for Elderly and Disabled
 * REQ-CARE-001: Care circle coordination scenario
 *
 * This is an enhanced care circle that supports:
 * - Check-in monitoring (backward compatible)
 * - Member coordination with roles and skills
 * - Need tracking and assignment
 * - Equitable distribution of care responsibilities
 */
export interface CareCircle {
  id: string;
  recipientId: string; // The person receiving care (formerly userId)
  name?: string;
  description?: string;

  // Members with enhanced details
  members: CareCircleMember[];

  // Needs tracking
  needs: CareNeed[];

  // Check-in settings (backward compatible)
  checkInEnabled?: boolean; // Opt-in to check-in monitoring
  preferredCheckInTime?: number; // Time of day (in minutes from midnight)
  checkInFrequency?: 'daily' | 'twice-daily' | 'weekly'; // How often to expect check-ins
  missedCheckInThreshold?: number; // Hours before alerting care circle
  escalationThreshold?: number; // Number of consecutive missed check-ins before escalation

  // Care circle settings
  settings: {
    communicationChannel?: string; // How the circle communicates
    privacyLevel: 'private' | 'community-visible'; // Can others see this circle exists?
    autoScheduling: boolean; // Use AI to suggest equitable scheduling
  };

  createdAt: number;
  updatedAt: number;
  active: boolean;
}

/**
 * Care Activity - log of care activities within a circle
 * REQ-CARE-001: Enable care circle communication and coordination
 */
export interface CareActivity {
  id: string;
  circleId: string;
  needId?: string;
  activityType: 'check-in' | 'visit' | 'assistance' | 'message' | 'schedule-change';
  performedBy: string; // userId
  forRecipient: string; // userId
  description?: string;
  scheduledFor?: number;
  completedAt?: number;
  notes?: string;
  createdAt: number;
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
