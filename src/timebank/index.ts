/**
 * Time Bank Module - Gift Economy Time and Skill Sharing
 * REQ-TIME-001 through REQ-TIME-022
 *
 * Public API for the Time Bank system
 */

export {
  createSkillOffer,
  updateSkillOffer,
  markSkillUnavailable,
  markSkillAvailable,
  deleteSkillOffer,
  getMySkillOffers,
  getSkillOffer,
  getAvailableSkills,
  getSkillsByCategory,
  searchSkills,
  getAllSkillCategories,
  formatSkillForDisplay,
} from './skill-offer';

export type {
  CreateSkillOfferOptions,
  AvailabilityPattern,
  LocationPreference,
  SkillLevel,
} from './skill-offer';

// Browse Available Skills (REQ-TIME-003)
export {
  browseSkills,
  getCategoriesWithCounts,
  getSkillStatistics,
  formatSkillsList,
  formatCategoriesList,
  formatStatistics,
  suggestSkillsForNeed,
} from './browse-skills';

export type {
  BrowseOptions,
  BrowseResult,
  SkillStatistics,
} from './browse-skills';

// Availability Calendar (REQ-TIME-016)
export {
  createAvailability,
  updateAvailability,
  deactivateAvailability,
  activateAvailability,
  deleteAvailability,
  getAvailabilitySlot,
  getUserAvailability,
  getUserActiveAvailability,
  getSkillAvailability,
  queryAvailability,
  getAvailabilityForDate,
  isUserAvailable,
  formatAvailabilityForDisplay,
} from './availability-calendar';

export type {
  CreateAvailabilityOptions,
  RecurrencePattern,
  TimeRange,
} from './availability-calendar';

// Community Contribution Tracking (REQ-TIME-002, REQ-TIME-019 to REQ-TIME-022)
export {
  recordContribution,
  getContribution,
  queryContributions,
  getUserContributions,
  celebrateContribution,
  analyzeVitality,
  checkBurnoutRisk,
  getUserStats,
  formatVitalityInsights,
  formatUserStats,
} from './contribution-tracking';

export type {
  ContributionType,
  RecordContributionOptions,
  QueryContributionsOptions,
  VitalityAnalysisOptions,
  VitalityInsights,
} from './contribution-tracking';
