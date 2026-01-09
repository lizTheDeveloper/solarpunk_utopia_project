/**
 * Privacy controls - Opt-in everything
 *
 * Privacy by design: Maximum privacy by default
 * Users explicitly choose what to share
 *
 * Aligns with solarpunk values:
 * - No surveillance or tracking
 * - User autonomy and data sovereignty
 * - Granular control over visibility
 * - Defaults to most restrictive settings
 */

/**
 * Privacy levels for data visibility
 */
export enum PrivacyLevel {
  /** Only visible to the user */
  Private = 'private',

  /** Visible within local community only */
  Community = 'community',

  /** Visible to federated communities via ActivityPub */
  Federated = 'federated',

  /** Publicly visible (use sparingly!) */
  Public = 'public'
}

/**
 * Location precision levels
 */
export enum LocationPrecision {
  /** Exact GPS coordinates */
  Exact = 'exact',

  /** Neighborhood level (~1km radius) */
  Neighborhood = 'neighborhood',

  /** City level */
  City = 'city',

  /** Region/state level */
  Region = 'region',

  /** Completely hidden */
  Hidden = 'hidden'
}

/**
 * Profile privacy settings
 */
export interface ProfilePrivacy {
  name: PrivacyLevel;
  bio: PrivacyLevel;
  photo: PrivacyLevel;
  contact: PrivacyLevel;
}

/**
 * Location privacy settings
 */
export interface LocationPrivacy {
  precision: LocationPrecision;
  visibility: PrivacyLevel;
}

/**
 * Activity privacy settings
 */
export interface ActivityPrivacy {
  offerings: PrivacyLevel;
  requests: PrivacyLevel;
  history: PrivacyLevel;
  participation: PrivacyLevel;
}

/**
 * Reputation privacy settings
 */
export interface ReputationPrivacy {
  attestations: PrivacyLevel;
  skills: PrivacyLevel;
  receivedCount: PrivacyLevel;
}

/**
 * Complete privacy settings
 */
export interface PrivacySettings {
  profile: ProfilePrivacy;
  location: LocationPrivacy;
  activity: ActivityPrivacy;
  reputation: ReputationPrivacy;
  messaging: {
    readReceipts: boolean;
    typingIndicators: boolean;
    onlineStatus: PrivacyLevel;
  };
}

/**
 * Context for evaluating privacy (who is viewing)
 */
export interface PrivacyContext {
  /** Viewer's relationship to the user */
  relationship: 'self' | 'community' | 'federated' | 'public';

  /** Viewer's DID (if authenticated) */
  viewerDID?: string;

  /** Viewer's community ID (if same community) */
  viewerCommunity?: string;
}

/**
 * Default privacy settings - Maximum privacy by default
 */
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profile: {
    name: PrivacyLevel.Community,
    bio: PrivacyLevel.Community,
    photo: PrivacyLevel.Community,
    contact: PrivacyLevel.Private
  },
  location: {
    precision: LocationPrecision.Neighborhood,
    visibility: PrivacyLevel.Community
  },
  activity: {
    offerings: PrivacyLevel.Community,
    requests: PrivacyLevel.Community,
    history: PrivacyLevel.Private,
    participation: PrivacyLevel.Community
  },
  reputation: {
    attestations: PrivacyLevel.Community,
    skills: PrivacyLevel.Community,
    receivedCount: PrivacyLevel.Community
  },
  messaging: {
    readReceipts: false,
    typingIndicators: false,
    onlineStatus: PrivacyLevel.Community
  }
};

/**
 * Check if data should be visible given privacy settings and context
 *
 * @param privacyLevel - Privacy level of the data
 * @param context - Viewing context
 * @returns true if data should be visible
 */
export function isVisible(
  privacyLevel: PrivacyLevel,
  context: PrivacyContext
): boolean {
  // Self can always see own data
  if (context.relationship === 'self') {
    return true;
  }

  // Check privacy level against context
  switch (privacyLevel) {
    case PrivacyLevel.Private:
      return false;

    case PrivacyLevel.Community:
      return context.relationship === 'community';

    case PrivacyLevel.Federated:
      return context.relationship === 'community' || context.relationship === 'federated';

    case PrivacyLevel.Public:
      return true;

    default:
      return false;
  }
}

/**
 * Fuzzy location based on precision setting
 *
 * @param exactLocation - Exact GPS coordinates
 * @param precision - Desired precision level
 * @returns Fuzzed coordinates or location string
 */
export function fuzzyLocation(
  exactLocation: { lat: number; lng: number },
  precision: LocationPrecision
): { lat: number; lng: number } | string | null {
  switch (precision) {
    case LocationPrecision.Exact:
      return exactLocation;

    case LocationPrecision.Neighborhood:
      // Round to ~1km (0.01 degrees ≈ 1km)
      return {
        lat: Math.round(exactLocation.lat * 100) / 100,
        lng: Math.round(exactLocation.lng * 100) / 100
      };

    case LocationPrecision.City:
      // Round to ~10km (0.1 degrees)
      return {
        lat: Math.round(exactLocation.lat * 10) / 10,
        lng: Math.round(exactLocation.lng * 10) / 10
      };

    case LocationPrecision.Region:
      // Round to ~100km (1 degree)
      return {
        lat: Math.round(exactLocation.lat),
        lng: Math.round(exactLocation.lng)
      };

    case LocationPrecision.Hidden:
      return null;

    default:
      return null;
  }
}

/**
 * Generate a privacy preview showing what others see
 *
 * @param settings - User's privacy settings
 * @param context - Viewing context
 * @returns Description of what's visible
 */
export function generatePrivacyPreview(
  settings: PrivacySettings,
  context: PrivacyContext
): {
  profile: { name: boolean; bio: boolean; photo: boolean; contact: boolean };
  location: boolean;
  activity: { offerings: boolean; requests: boolean; history: boolean };
  reputation: { attestations: boolean; skills: boolean };
} {
  return {
    profile: {
      name: isVisible(settings.profile.name, context),
      bio: isVisible(settings.profile.bio, context),
      photo: isVisible(settings.profile.photo, context),
      contact: isVisible(settings.profile.contact, context)
    },
    location: isVisible(settings.location.visibility, context),
    activity: {
      offerings: isVisible(settings.activity.offerings, context),
      requests: isVisible(settings.activity.requests, context),
      history: isVisible(settings.activity.history, context)
    },
    reputation: {
      attestations: isVisible(settings.reputation.attestations, context),
      skills: isVisible(settings.reputation.skills, context)
    }
  };
}

/**
 * Filter data based on privacy settings
 *
 * @param data - Data to filter
 * @param privacyLevel - Privacy level of the data
 * @param context - Viewing context
 * @returns Data if visible, undefined otherwise
 */
export function filterByPrivacy<T>(
  data: T,
  privacyLevel: PrivacyLevel,
  context: PrivacyContext
): T | undefined {
  return isVisible(privacyLevel, context) ? data : undefined;
}

/**
 * Validate privacy settings
 *
 * @param settings - Settings to validate
 * @returns true if settings are valid
 */
export function validatePrivacySettings(settings: PrivacySettings): boolean {
  // Check that all required fields are present
  if (!settings.profile || !settings.location || !settings.activity || !settings.reputation) {
    return false;
  }

  // Validate privacy levels
  const validLevels = Object.values(PrivacyLevel);
  const profileLevels = Object.values(settings.profile);
  if (!profileLevels.every(level => validLevels.includes(level as PrivacyLevel))) {
    return false;
  }

  // Validate location precision
  const validPrecisions = Object.values(LocationPrecision);
  if (!validPrecisions.includes(settings.location.precision)) {
    return false;
  }

  return true;
}

/**
 * Merge privacy settings with defaults
 * Ensures all fields are present even if user only provides partial settings
 *
 * @param userSettings - User's partial settings
 * @returns Complete privacy settings
 */
export function mergeWithDefaults(
  userSettings: Partial<PrivacySettings>
): PrivacySettings {
  return {
    profile: {
      ...DEFAULT_PRIVACY_SETTINGS.profile,
      ...userSettings.profile
    },
    location: {
      ...DEFAULT_PRIVACY_SETTINGS.location,
      ...userSettings.location
    },
    activity: {
      ...DEFAULT_PRIVACY_SETTINGS.activity,
      ...userSettings.activity
    },
    reputation: {
      ...DEFAULT_PRIVACY_SETTINGS.reputation,
      ...userSettings.reputation
    },
    messaging: {
      ...DEFAULT_PRIVACY_SETTINGS.messaging,
      ...userSettings.messaging
    }
  };
}

/**
 * Export privacy settings to JSON
 */
export function exportPrivacySettings(settings: PrivacySettings): string {
  return JSON.stringify(settings, null, 2);
}

/**
 * Import privacy settings from JSON
 */
export function importPrivacySettings(json: string): PrivacySettings {
  const settings = JSON.parse(json) as Partial<PrivacySettings>;
  return mergeWithDefaults(settings);
}
