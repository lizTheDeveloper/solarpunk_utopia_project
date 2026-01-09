/**
 * Community Contribution Tracking - Community Vitality Module
 * REQ-TIME-002: Abundance Tracking Over Debt
 * REQ-TIME-019: Participation Encouragement
 * REQ-TIME-020: Skill Gap Identification
 * REQ-TIME-021: Care and Burnout Prevention
 * REQ-TIME-022: Recognition Without Hierarchy
 *
 * Tracks contributions and participation to ensure community vitality and identify needs.
 * CRITICAL: This is NOT debt tracking! This is about celebration, care, and wellbeing.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Abundance tracking - celebrate what the community HAS, not what people "owe"
 * - No reciprocity enforcement - giving creates no obligation to receive
 * - Burnout prevention - caring for volunteers ensures long-term vitality
 * - Recognition without hierarchy - no "top contributor" rankings
 * - Privacy-preserving - opt-in visibility controls
 * - Offline-first - works without internet connection
 */

import { db } from '../core/database';
import type {
  ContributionRecord,
  ParticipationVitality,
  BurnoutAssessment
} from '../types';
import { sanitizeUserContent, requireValidIdentifier } from '../utils/sanitize';

/**
 * Contribution type categories
 */
export type ContributionType =
  | 'time-offer'
  | 'skill-share'
  | 'resource-share'
  | 'emotional-support'
  | 'care'
  | 'random-kindness'
  | 'other';

/**
 * Options for recording a contribution
 */
export interface RecordContributionOptions {
  userId: string;
  contributionType: ContributionType;
  description: string;
  skillsUsed?: string[];
  timeInvested?: number; // Minutes (optional, not for accounting!)
  impactDescription?: string;
  recipientIds?: string[];
  communityGroupId?: string;
  visibility?: 'private' | 'community' | 'public';
}

/**
 * Options for querying contributions
 */
export interface QueryContributionsOptions {
  userId?: string;
  contributionType?: ContributionType;
  communityGroupId?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  visibility?: 'private' | 'community' | 'public';
}

/**
 * Options for analyzing community vitality
 */
export interface VitalityAnalysisOptions {
  communityGroupId?: string;
  periodDays?: number; // Default: 30 days
}

/**
 * Vitality insights result
 */
export interface VitalityInsights {
  period: {
    startDate: number;
    endDate: number;
  };
  metrics: {
    activeContributors: number;
    totalContributions: number;
    skillsOffered: string[];
    skillsNeeded: string[];
    averageEnergyLevel: number;
    participationTrend: 'growing' | 'stable' | 'declining';
  };
  insights: string[];
  recommendations: string[];
}

/**
 * Record a contribution someone made to the community
 * REQ-TIME-002: Track contributions to build picture of community vitality
 */
export async function recordContribution(options: RecordContributionOptions): Promise<ContributionRecord> {
  // Validate required fields
  if (!options.description || options.description.trim().length === 0) {
    throw new Error('Contribution description is required');
  }

  requireValidIdentifier(options.userId, 'User ID');

  // Sanitize user-provided content
  const sanitizedDescription = sanitizeUserContent(options.description.trim());

  // Build contribution record (avoid undefined for Automerge compatibility)
  const contribution: any = {
    userId: options.userId,
    contributionType: options.contributionType,
    description: sanitizedDescription,
    visibility: options.visibility || 'community',
  };

  // Only add optional fields if they are defined (Automerge doesn't support undefined)
  if (options.skillsUsed && options.skillsUsed.length > 0) {
    contribution.skillsUsed = options.skillsUsed.map(skill => sanitizeUserContent(skill.trim()));
  }
  if (options.timeInvested !== undefined) {
    contribution.timeInvested = options.timeInvested;
  }
  if (options.impactDescription) {
    contribution.impactDescription = sanitizeUserContent(options.impactDescription.trim());
  }
  if (options.recipientIds) {
    contribution.recipientIds = options.recipientIds;
  }
  if (options.communityGroupId) {
    contribution.communityGroupId = options.communityGroupId;
  }

  // Add to database
  try {
    const savedContribution = await db.addContribution(contribution);
    return savedContribution;
  } catch (error) {
    console.error(`Failed to record contribution for user ${options.userId}:`, error);
    throw new Error(`Could not record contribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a specific contribution by ID
 */
export function getContribution(contributionId: string): ContributionRecord | null {
  requireValidIdentifier(contributionId, 'Contribution ID');

  const doc = db.getDoc();
  return doc.contributions?.[contributionId] || null;
}

/**
 * Query contributions based on filters
 * REQ-TIME-002: Show participation patterns
 */
export function queryContributions(options: QueryContributionsOptions = {}): ContributionRecord[] {
  const doc = db.getDoc();
  let contributions = Object.values(doc.contributions || {});

  // Apply filters
  if (options.userId) {
    contributions = contributions.filter(c => c.userId === options.userId);
  }

  if (options.contributionType) {
    contributions = contributions.filter(c => c.contributionType === options.contributionType);
  }

  if (options.communityGroupId) {
    contributions = contributions.filter(c => c.communityGroupId === options.communityGroupId);
  }

  if (options.startDate) {
    contributions = contributions.filter(c => c.createdAt >= options.startDate!);
  }

  if (options.endDate) {
    contributions = contributions.filter(c => c.createdAt <= options.endDate!);
  }

  if (options.visibility) {
    contributions = contributions.filter(c => c.visibility === options.visibility);
  }

  // Sort by most recent first
  contributions.sort((a, b) => b.createdAt - a.createdAt);

  // Apply limit
  if (options.limit && options.limit > 0) {
    contributions = contributions.slice(0, options.limit);
  }

  return contributions;
}

/**
 * Get contributions by a specific user
 */
export function getUserContributions(userId: string, limit?: number): ContributionRecord[] {
  requireValidIdentifier(userId, 'User ID');
  return queryContributions({ userId, limit });
}

/**
 * Celebrate a contribution (add gratitude)
 * REQ-TIME-022: Recognition Without Hierarchy
 */
export async function celebrateContribution(
  contributionId: string,
  userId: string
): Promise<void> {
  requireValidIdentifier(contributionId, 'Contribution ID');
  requireValidIdentifier(userId, 'User ID');

  const contribution = getContribution(contributionId);
  if (!contribution) {
    throw new Error('Contribution not found');
  }

  // Avoid duplicate celebrations
  if (contribution.celebratedBy?.includes(userId)) {
    return; // Already celebrated by this user
  }

  try {
    await db.celebrateContribution(contributionId, userId);
  } catch (error) {
    console.error(`Failed to celebrate contribution ${contributionId}:`, error);
    throw new Error(`Could not celebrate contribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze community vitality and generate insights
 * REQ-TIME-002: Show abundance patterns, unmet needs, and participation vitality
 * REQ-TIME-020: Skill Gap Identification
 */
export function analyzeVitality(options: VitalityAnalysisOptions = {}): VitalityInsights {
  const periodDays = options.periodDays || 30;
  const endDate = Date.now();
  const startDate = endDate - (periodDays * 24 * 60 * 60 * 1000);

  // Get contributions in the period
  const contributions = queryContributions({
    communityGroupId: options.communityGroupId,
    startDate,
    endDate,
  });

  // Get all skills and needs (from skill offers and needs)
  const doc = db.getDoc();
  const skills = Object.values(doc.skills || {}).filter(s => s.available);
  const needs = Object.values(doc.needs || {}).filter(n => !n.fulfilled);
  const burnoutAssessments = Object.values(doc.burnoutAssessments || {})
    .filter(a => a.createdAt >= startDate);

  // Calculate metrics
  const activeContributors = new Set(contributions.map(c => c.userId)).size;
  const totalContributions = contributions.length;

  // Extract skills offered vs skills needed
  const skillsOffered = Array.from(new Set(
    skills.flatMap(s => s.categories)
  ));

  const contributedSkills = Array.from(new Set(
    contributions.flatMap(c => c.skillsUsed || [])
  ));

  // Combine both sources of skills
  const allSkillsOffered = Array.from(new Set([...skillsOffered, ...contributedSkills]));

  // Skills that appear in needs but not in offers
  const skillsNeeded: string[] = [];

  // Calculate average energy level from burnout assessments
  const avgEnergy = burnoutAssessments.length > 0
    ? burnoutAssessments.reduce((sum, a) => sum + a.energyLevel, 0) / burnoutAssessments.length
    : 3; // Default to neutral

  // Determine participation trend (compare to previous period)
  const previousStartDate = startDate - (periodDays * 24 * 60 * 60 * 1000);
  const previousContributions = queryContributions({
    communityGroupId: options.communityGroupId,
    startDate: previousStartDate,
    endDate: startDate,
  });

  let participationTrend: 'growing' | 'stable' | 'declining';
  if (totalContributions > previousContributions.length * 1.1) {
    participationTrend = 'growing';
  } else if (totalContributions < previousContributions.length * 0.9) {
    participationTrend = 'declining';
  } else {
    participationTrend = 'stable';
  }

  // Generate insights
  const insights: string[] = [];
  const recommendations: string[] = [];

  if (activeContributors === 0) {
    insights.push('No contributions recorded in this period');
    recommendations.push('Encourage community members to record their contributions to build visibility');
  } else if (activeContributors < 5) {
    insights.push(`Small number of active contributors (${activeContributors})`);
    recommendations.push('Consider outreach to engage more community members');
  } else {
    insights.push(`${activeContributors} active contributors in the community`);
  }

  if (participationTrend === 'growing') {
    insights.push('Participation is growing - community energy is increasing!');
  } else if (participationTrend === 'declining') {
    insights.push('Participation is declining - community may need revitalization');
    recommendations.push('Check in with community members about barriers to participation');
  }

  if (avgEnergy < 2.5) {
    insights.push('Average energy levels are low - community may be experiencing burnout');
    recommendations.push('Encourage rest and self-care. Consider reducing commitment expectations.');
  } else if (avgEnergy > 4) {
    insights.push('Community energy is high - people are feeling engaged and energized!');
  }

  if (allSkillsOffered.length > 0) {
    insights.push(`${allSkillsOffered.length} different skills are being shared in the community`);
  }

  if (needs.length > 10) {
    insights.push(`${needs.length} unmet needs - community may need more support`);
    recommendations.push('Highlight unmet needs to recruit more skill sharing');
  }

  if (totalContributions > 0) {
    const contributionTypes = contributions.reduce((acc, c) => {
      acc[c.contributionType] = (acc[c.contributionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(contributionTypes)
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommon) {
      insights.push(`Most common contribution type: ${mostCommon[0]} (${mostCommon[1]} times)`);
    }
  }

  return {
    period: { startDate, endDate },
    metrics: {
      activeContributors,
      totalContributions,
      skillsOffered: allSkillsOffered,
      skillsNeeded,
      averageEnergyLevel: Number(avgEnergy.toFixed(1)),
      participationTrend,
    },
    insights,
    recommendations,
  };
}

/**
 * Check if a user may be at risk of burnout
 * REQ-TIME-021: Care and Burnout Prevention
 */
export function checkBurnoutRisk(userId: string, recentDays: number = 14): {
  atRisk: boolean;
  reason?: string;
  suggestion?: string;
} {
  requireValidIdentifier(userId, 'User ID');

  const cutoffDate = Date.now() - (recentDays * 24 * 60 * 60 * 1000);

  // Get recent contributions
  const recentContributions = queryContributions({
    userId,
    startDate: cutoffDate,
  });

  // Get recent burnout assessments
  const doc = db.getDoc();
  const recentAssessments = Object.values(doc.burnoutAssessments || {})
    .filter(a => a.userId === userId && a.createdAt >= cutoffDate)
    .sort((a, b) => b.createdAt - a.createdAt);

  const latestAssessment = recentAssessments[0];

  // Check for burnout indicators

  // 1. Self-reported burnout
  if (latestAssessment?.selfAssessment?.feelingOverwhelmed) {
    return {
      atRisk: true,
      reason: 'You indicated feeling overwhelmed in your recent check-in',
      suggestion: 'Consider taking a break. The community values your wellbeing more than your productivity.',
    };
  }

  if (latestAssessment?.selfAssessment?.needingBreak) {
    return {
      atRisk: true,
      reason: 'You indicated needing a break',
      suggestion: 'Please take the rest you need! Come back when you feel energized.',
    };
  }

  // 2. Low energy levels
  if (latestAssessment && latestAssessment.energyLevel <= 2) {
    return {
      atRisk: true,
      reason: 'Your recent energy level is low',
      suggestion: 'Rest is productive too. Take time to recharge.',
    };
  }

  // 3. High volume of recent contributions
  if (recentContributions.length > 15) {
    return {
      atRisk: true,
      reason: `You've made ${recentContributions.length} contributions in ${recentDays} days`,
      suggestion: 'You\'re doing amazing work! But remember to pace yourself and take breaks.',
    };
  }

  // 4. Many consecutive active days
  if (latestAssessment && latestAssessment.consecutiveActiveDays > 10) {
    return {
      atRisk: true,
      reason: `${latestAssessment.consecutiveActiveDays} consecutive days of activity`,
      suggestion: 'Consider taking a rest day. Sustainable participation is better than burning out.',
    };
  }

  return { atRisk: false };
}

/**
 * Get contribution statistics for a user
 */
export function getUserStats(userId: string): {
  totalContributions: number;
  contributionsByType: Record<ContributionType, number>;
  skillsShared: string[];
  celebrationsReceived: number;
  recentActivity: number; // Last 30 days
} {
  requireValidIdentifier(userId, 'User ID');

  const allContributions = getUserContributions(userId);
  const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentContributions = allContributions.filter(c => c.createdAt >= last30Days);

  // Count by type
  const contributionsByType = allContributions.reduce((acc, c) => {
    acc[c.contributionType] = (acc[c.contributionType] || 0) + 1;
    return acc;
  }, {} as Record<ContributionType, number>);

  // Collect all skills shared
  const skillsShared = Array.from(new Set(
    allContributions.flatMap(c => c.skillsUsed || [])
  ));

  // Count celebrations
  const celebrationsReceived = allContributions.reduce(
    (sum, c) => sum + (c.celebratedBy?.length || 0),
    0
  );

  return {
    totalContributions: allContributions.length,
    contributionsByType,
    skillsShared,
    celebrationsReceived,
    recentActivity: recentContributions.length,
  };
}

/**
 * Format vitality insights for display
 */
export function formatVitalityInsights(vitality: VitalityInsights): string {
  const { period, metrics, insights, recommendations } = vitality;

  const startDate = new Date(period.startDate).toLocaleDateString();
  const endDate = new Date(period.endDate).toLocaleDateString();

  let output = `\n=== Community Vitality Report ===\n`;
  output += `Period: ${startDate} - ${endDate}\n\n`;

  output += `📊 Metrics:\n`;
  output += `  • Active contributors: ${metrics.activeContributors}\n`;
  output += `  • Total contributions: ${metrics.totalContributions}\n`;
  output += `  • Skills being shared: ${metrics.skillsOffered.length}\n`;
  output += `  • Average energy level: ${metrics.averageEnergyLevel}/5\n`;
  output += `  • Participation trend: ${metrics.participationTrend}\n\n`;

  if (insights.length > 0) {
    output += `💡 Insights:\n`;
    insights.forEach(insight => {
      output += `  • ${insight}\n`;
    });
    output += `\n`;
  }

  if (recommendations.length > 0) {
    output += `🌻 Recommendations:\n`;
    recommendations.forEach(rec => {
      output += `  • ${rec}\n`;
    });
    output += `\n`;
  }

  return output;
}

/**
 * Format user statistics for display
 */
export function formatUserStats(userId: string, stats: ReturnType<typeof getUserStats>): string {
  let output = `\n=== Contribution Statistics ===\n\n`;

  output += `Total contributions: ${stats.totalContributions}\n`;
  output += `Recent activity (30 days): ${stats.recentActivity}\n`;
  output += `Celebrations received: ${stats.celebrationsReceived}\n\n`;

  if (Object.keys(stats.contributionsByType).length > 0) {
    output += `Contributions by type:\n`;
    Object.entries(stats.contributionsByType).forEach(([type, count]) => {
      output += `  • ${type}: ${count}\n`;
    });
    output += `\n`;
  }

  if (stats.skillsShared.length > 0) {
    output += `Skills shared: ${stats.skillsShared.join(', ')}\n`;
  }

  return output;
}
