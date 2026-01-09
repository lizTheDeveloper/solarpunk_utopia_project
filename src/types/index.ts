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

  // Tool Library specific fields (REQ-SHARE-002)
  toolLibrary?: {
    usageInstructions?: string;
    safetyRequirements?: string[];
    requiredSkills?: string[];
    capacitySpecs?: string; // e.g., "Print bed: 220x220x250mm, PLA/PETG"
    maintenanceNotes?: string;
    condition?: 'excellent' | 'good' | 'fair' | 'needs-repair';
    lastMaintenanceDate?: number;
    isCollectivelyOwned?: boolean; // REQ-SHARE-007
  };
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
 * Time range for availability slots
 */
export interface TimeRange {
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
}

/**
 * Recurrence pattern for recurring availability
 */
export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  daysOfWeek?: number[]; // 0 = Sunday, 6 = Saturday (for weekly/biweekly)
  dayOfMonth?: number; // 1-31 (for monthly)
  endDate?: number; // When to stop recurring (optional, ongoing if not set)
}

/**
 * Availability Slot - scheduled time when a user is available
 * REQ-TIME-016: Communication and Confirmation
 */
export interface AvailabilitySlot {
  id: string;
  userId: string;
  skillOfferId?: string; // Optional: link to specific skill offer

  // Date/time
  date?: number; // Unix timestamp for one-time availability
  dateRange?: { start: number; end: number }; // For multi-day availability
  timeRanges: TimeRange[]; // Time slots within the day(s)

  // Recurrence
  recurrence?: RecurrencePattern;

  // Context
  location?: {
    type: 'my-place' | 'your-place' | 'community-space' | 'virtual' | 'flexible';
    details?: string;
  };

  // Preferences
  preferredActivityTypes: string[]; // e.g., ["tutoring", "repairs"]
  maxBookings: number; // Limit bookings per slot
  currentBookings: number; // Current number of bookings
  notes?: string; // Additional info

  // Visibility
  visibility: 'public' | 'community' | 'care-circle';

  // Status
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Session Status - lifecycle of a help session
 * REQ-TIME-016: Communication and Confirmation
 */
export type HelpSessionStatus =
  | 'proposed'      // Initial match proposed by system or user
  | 'pending'       // Awaiting confirmation from both parties
  | 'confirmed'     // Both parties confirmed
  | 'in-progress'   // Session is happening now
  | 'completed'     // Session finished successfully
  | 'cancelled'     // Session cancelled by either party
  | 'no-show';      // Someone didn't show up

/**
 * Help Session - scheduled interaction between volunteer and recipient
 * REQ-TIME-016: Communication and Confirmation
 *
 * Coordinates tutoring, skill sharing, repairs, or any time-based help
 * between community members in a gift economy framework.
 */
export interface HelpSession {
  id: string;

  // Participants
  volunteerId: string;           // Person offering help
  recipientId: string;           // Person receiving help

  // What help is being provided
  skillOfferId?: string;         // Optional: link to skill offer
  title: string;                 // e.g., "Math tutoring", "Bike repair"
  description?: string;          // Details about what will be covered

  // When
  scheduledDate: number;         // Unix timestamp for session date
  scheduledTime: TimeRange;      // Time window for the session
  estimatedDuration?: number;    // Expected duration in minutes

  // Where
  location: {
    type: 'volunteer-place' | 'recipient-place' | 'community-space' | 'virtual' | 'flexible';
    details?: string;            // Address, room name, video link, etc.
  };

  // Status and confirmation
  status: HelpSessionStatus;
  volunteerConfirmed: boolean;
  recipientConfirmed: boolean;

  // Coordination
  notes?: string;                // Session-specific notes (materials needed, etc.)
  reminders?: {
    volunteer: boolean;          // Reminder sent to volunteer
    recipient: boolean;          // Reminder sent to recipient
    lastReminderSent?: number;   // Timestamp of last reminder
  };

  // Follow-up (gift economy - gratitude, not ratings!)
  completionNotes?: {
    volunteerFeedback?: string;  // How did it go for the volunteer?
    recipientFeedback?: string;  // How did it go for the recipient?
    gratitudeExpressed?: boolean; // Did recipient express thanks?
  };

  // Rescheduling
  rescheduledFrom?: string;      // ID of previous session if this is a reschedule
  rescheduledTo?: string;        // ID of new session if this was rescheduled

  // Metadata
  createdAt: number;
  updatedAt: number;
  cancelledAt?: number;
  cancelledBy?: string;          // userId who cancelled
  cancellationReason?: string;
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
 * Booking status lifecycle for equipment bookings
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-012: Resource Availability Calendars
 */
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

/**
 * Equipment Booking - scheduled reservation of tools/equipment
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-012: Resource Availability Calendars
 */
export interface EquipmentBooking {
  id: string;
  resourceId: string;
  userId: string;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  status: BookingStatus;
  purpose?: string; // Optional description of what they'll use it for
  pickupLocation?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Local database schema - all collections
 */
export interface DatabaseSchema {
  resources: Record<string, Resource>;
  needs: Record<string, Need>;
  skills: Record<string, SkillOffer>;
  availabilitySlots: Record<string, AvailabilitySlot>;
  helpSessions: Record<string, HelpSession>;
  equipmentBookings: Record<string, EquipmentBooking>;
  events: Record<string, EconomicEvent>;
  users: Record<string, UserProfile>;
  community: Community;
  communityGroups: Record<string, CommunityGroup>;
  checkIns: Record<string, CheckIn>;
  careCircles: Record<string, CareCircle>;
  careActivities: Record<string, CareActivity>;
  missedCheckInAlerts: Record<string, MissedCheckInAlert>;
  emergencyAlerts: Record<string, EmergencyAlert>;
  bulletinPosts: Record<string, BulletinPost>;
  communityEvents: Record<string, CommunityEvent>;
  contributions: Record<string, ContributionRecord>;
  gratitude: Record<string, GratitudeExpression>;
  randomKindness: Record<string, RandomKindness>;
  burnoutAssessments: Record<string, BurnoutAssessment>;
  participationVitality: Record<string, ParticipationVitality>;
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
 * Bulletin Post Type - different kinds of community announcements
 * REQ-GOV-019: Community Bulletin Board
 */
export type BulletinPostType = 'announcement' | 'event' | 'celebration' | 'discussion' | 'request' | 'other';

/**
 * Bulletin Post Status
 * REQ-GOV-019: Community Bulletin Board
 */
export type BulletinPostStatus = 'active' | 'archived' | 'cancelled';

/**
 * RSVP Response for event-type posts
 * REQ-GOV-019: Enable RSVPs and coordination
 */
export type RSVPResponse = 'going' | 'maybe' | 'not-going';

/**
 * Comment on a bulletin post
 * REQ-GOV-019: Support comment threads
 */
export interface BulletinComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  parentCommentId?: string; // For threaded replies
}

/**
 * RSVP for an event-type bulletin post
 * REQ-GOV-019: Enable RSVPs and coordination
 */
export interface BulletinRSVP {
  userId: string;
  response: RSVPResponse;
  note?: string; // Optional note (e.g., "I can bring food")
  createdAt: number;
  updatedAt?: number;
}

/**
 * Bulletin Post - community announcement, event, or celebration
 * REQ-GOV-019: Community Bulletin Board
 *
 * Supports:
 * - Announcements (general info)
 * - Events (with RSVPs and scheduling)
 * - Celebrations (sharing joy)
 * - Discussions (open-ended topics)
 * - Requests (informal coordination)
 */
export interface BulletinPost {
  id: string;
  communityGroupId?: string; // Optional: post to specific community group
  userId: string; // Who posted
  title: string;
  content: string;
  postType: BulletinPostType;
  status: BulletinPostStatus;

  // Event-specific fields (optional, used for event type)
  eventDetails?: {
    startTime: number; // Unix timestamp
    endTime?: number; // Unix timestamp
    location?: string;
    isRecurring?: boolean;
    recurrencePattern?: string; // e.g., "weekly", "monthly"
  };

  // RSVPs for events
  rsvps: BulletinRSVP[];

  // Comments on the post
  comments: BulletinComment[];

  // Interested users (for reminders)
  interestedUsers: string[];

  // Tags for categorization
  tags?: string[];

  // Metadata
  createdAt: number;
  updatedAt: number;
  pinnedUntil?: number; // If pinned, when to unpin
}

/**
 * Community Event types
 * REQ-GOV-019: Community Bulletin Board - Community events listing
 */
export type CommunityEventType =
  | 'potluck'         // Community meals
  | 'workday'         // Garden work, maintenance, cleanup
  | 'workshop'        // Learning events, skill shares
  | 'meeting'         // Decision-making, planning
  | 'celebration'     // Birthdays, harvests, holidays
  | 'social'          // Casual gatherings, games
  | 'mutual-aid'      // Collective support events
  | 'other';

export type EventRSVPStatus = 'going' | 'maybe' | 'not-going';

/**
 * RSVP for a community event
 * REQ-GOV-019: Enable RSVPs and coordination
 */
export interface CommunityEventRSVP {
  userId: string;
  status: EventRSVPStatus;
  note?: string;          // e.g., "I can bring a dish"
  bringingItems?: string[]; // e.g., ["salad", "drinks"]
  respondedAt: number;
}

/**
 * Comment on a community event
 * REQ-GOV-019: Support comment threads
 */
export interface CommunityEventComment {
  id: string;
  userId: string;
  text: string;
  createdAt: number;
}

/**
 * Community Event
 * REQ-GOV-019: Community Bulletin Board - Community events listing
 *
 * Supports:
 * - Event creation and details
 * - RSVPs and coordination
 * - Location (physical or virtual)
 * - Items to bring
 * - Volunteer coordination
 * - Comments and discussion
 */
export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  eventType: CommunityEventType;

  // Timing
  startTime: number;      // Unix timestamp
  endTime?: number;       // Optional end time
  isAllDay?: boolean;     // All-day event flag

  // Location
  location?: {
    name: string;         // e.g., "Community Garden"
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    isVirtual?: boolean;
    virtualLink?: string;
  };

  // Organizer and association
  organizerId: string;
  communityGroupId?: string;

  // RSVPs
  rsvps: CommunityEventRSVP[];
  maxAttendees?: number;

  // Coordination
  bringItems?: string[];  // Suggested items to bring
  needsVolunteers?: boolean;
  volunteerRoles?: string[];
  coordinationNotes?: string;

  // Accessibility
  accessibilityInfo?: string;

  // Comments
  comments: CommunityEventComment[];

  // Reminders
  reminderSent?: boolean;

  // Metadata
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  visibility: 'public' | 'community' | 'private';
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

/**
 * Community Vitality Tracking
 * REQ-TIME-019 to REQ-TIME-022: Community vitality, gratitude, and burnout prevention
 *
 * CRITICAL: This is NOT debt tracking! This is about celebration, care, and wellbeing.
 * We track abundance and vitality, NOT reciprocity or obligation.
 */

/**
 * Contribution Record - tracks a contribution someone made to the community
 * REQ-TIME-019: Participation Encouragement
 * REQ-TIME-002: Abundance Tracking Over Debt
 *
 * This tracks what people GIVE to build a picture of community vitality,
 * NOT to enforce reciprocity or create debt relationships.
 */
export interface ContributionRecord {
  id: string;
  userId: string;
  contributionType: 'time-offer' | 'skill-share' | 'resource-share' | 'emotional-support' | 'care' | 'random-kindness' | 'other';
  description: string;
  skillsUsed?: string[]; // Skills demonstrated/shared
  timeInvested?: number; // Minutes (optional, not for accounting!)
  impactDescription?: string; // How this helped the community
  recipientIds?: string[]; // Who benefited (optional)
  communityGroupId?: string;
  celebratedBy?: string[]; // Who expressed gratitude
  createdAt: number;
  visibility: 'private' | 'community' | 'public'; // Privacy control
}

/**
 * Gratitude Expression - someone expressing thanks and appreciation
 * REQ-TIME-022: Recognition Without Hierarchy
 * REQ-TIME-018: Experience Sharing
 *
 * Building connection through gratitude, NOT creating obligation
 */
export interface GratitudeExpression {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  relatedContributionId?: string; // Optional link to specific contribution
  relatedEventId?: string; // Optional link to economic event
  tags?: string[]; // e.g., "kindness", "support", "joy"
  isPublic: boolean; // Can this appear on the gratitude wall?
  createdAt: number;
}

/**
 * Random Act of Kindness - spontaneous, untracked giving
 * REQ-TIME-001: Gift-Based Time Sharing
 *
 * Celebrating generosity without expectation of return
 */
export interface RandomKindness {
  id: string;
  performedBy?: string; // Optional - can be anonymous!
  description: string;
  category?: 'help' | 'gift' | 'care' | 'repair' | 'create' | 'teach' | 'other';
  photos?: string[];
  reactions: Array<{
    userId: string;
    emoji: string; // e.g., "❤️", "🌻", "✨"
    timestamp: number;
  }>;
  createdAt: number;
  isAnonymous: boolean;
}

/**
 * Burnout Assessment - tracking wellbeing, NOT productivity
 * REQ-TIME-021: Care and Burnout Prevention
 *
 * Gentle check-ins to prevent overcommitment and ensure sustainable participation
 */
export interface BurnoutAssessment {
  id: string;
  userId: string;
  energyLevel: 1 | 2 | 3 | 4 | 5; // 1 = depleted, 5 = energized
  recentCommitmentCount: number; // How many things they signed up for recently
  consecutiveActiveDays: number; // Days in a row with activity
  lastRestDay?: number; // When they last took a break
  selfAssessment?: {
    feelingOverwhelmed: boolean;
    enjoyingParticipation: boolean;
    needingBreak: boolean;
    notes?: string;
  };
  systemSuggestion?: string; // Gentle encouragement (e.g., "Consider taking tomorrow off!")
  acknowledged: boolean;
  createdAt: number;
}

/**
 * Participation Vitality - community-level health metrics
 * REQ-TIME-002: Abundance Tracking Over Debt
 * REQ-TIME-020: Skill Gap Identification
 *
 * Track what the community has (abundance) and needs (gaps), NOT individual balances
 */
export interface ParticipationVitality {
  id: string;
  communityGroupId?: string;
  period: {
    startDate: number;
    endDate: number;
  };
  metrics: {
    activeContributors: number; // How many people contributed
    skillsOffered: string[]; // What skills are available
    skillsNeeded: string[]; // What skills are scarce
    unmetNeeds: number; // How many needs went unfulfilled
    gratitudeExpressed: number; // How much appreciation is flowing
    averageEnergyLevel: number; // Community wellbeing
    peopleResting: number; // How many taking healthy breaks
  };
  insights: string[]; // Human-readable insights (e.g., "Need more gardeners")
  generatedAt: number;
}
