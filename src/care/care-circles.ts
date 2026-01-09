/**
 * Care Circles Module
 *
 * Phase 2, Group A: Care Circle Formation
 *
 * Implements REQ-CARE-001: Care circle coordination for vulnerable members
 *
 * This module enables community members to form care circles - groups of
 * people who provide ongoing support to a member who needs it. Care circles
 * coordinate regular check-ins, visits, assistance, and mutual support.
 *
 * Philosophy:
 * - Autonomy-preserving: Recipients control their care circle
 * - Equity-focused: Distributes care work fairly
 * - Dignified: No paternalism or surveillance
 * - Community-centered: Builds relationships through care
 *
 * Liberation Rating: ✊✊✊✊
 * Joy Rating: 🌻🌻🌻🌻🌻
 */

import { getDatabase } from '../core/database';
import type { CareCircle, CareCircleMember, CareNeed, CareActivity } from '../types';

/**
 * Create a new care circle
 */
export async function createCareCircle(
  recipientId: string,
  options: {
    name?: string;
    description?: string;
    privacyLevel?: 'private' | 'community-visible';
    autoScheduling?: boolean;
  } = {}
): Promise<CareCircle> {
  const db = await getDatabase();

  const circle: Omit<CareCircle, 'id' | 'createdAt' | 'updatedAt'> = {
    recipientId,
    name: options.name,
    description: options.description,
    members: [],
    needs: [],
    settings: {
      privacyLevel: options.privacyLevel || 'private',
      autoScheduling: options.autoScheduling !== false,
    },
    active: true,
  };

  return await db.addCareCircle(circle);
}

/**
 * Add a member to a care circle
 */
export async function addCareCircleMember(
  circleId: string,
  userId: string,
  options: {
    role?: string;
    availability?: CareCircleMember['availability'];
    skills?: string[];
  } = {}
): Promise<void> {
  const db = await getDatabase();
  const circle = db.getCareCircle(circleId);

  if (!circle) {
    throw new Error(`Care circle ${circleId} not found`);
  }

  // Check if member already exists
  const existingMember = circle.members.find(m => m.userId === userId);
  if (existingMember) {
    throw new Error('Member already in care circle');
  }

  const member: CareCircleMember = {
    userId,
    role: options.role,
    availability: options.availability,
    skills: options.skills,
    joinedAt: Date.now(),
    active: true,
  };

  circle.members.push(member);

  await db.updateCareCircle(circleId, {
    members: circle.members,
    updatedAt: Date.now(),
  });
}

/**
 * Remove a member from a care circle
 */
export async function removeCareCircleMember(
  circleId: string,
  userId: string
): Promise<void> {
  const db = await getDatabase();
  const circle = db.getCareCircle(circleId);

  if (!circle) {
    throw new Error(`Care circle ${circleId} not found`);
  }

  const updatedMembers = circle.members.filter(m => m.userId !== userId);

  await db.updateCareCircle(circleId, {
    members: updatedMembers,
    updatedAt: Date.now(),
  });
}

/**
 * Add a care need to a circle
 */
export async function addCareNeed(
  circleId: string,
  need: Omit<CareNeed, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = await getDatabase();
  const circle = db.getCareCircle(circleId);

  if (!circle) {
    throw new Error(`Care circle ${circleId} not found`);
  }

  const careNeed: CareNeed = {
    ...need,
    id: `need-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  circle.needs.push(careNeed);

  await db.updateCareCircle(circleId, {
    needs: circle.needs,
    updatedAt: Date.now(),
  });

  return careNeed.id;
}

/**
 * Update a care need (mark as met, assign helpers, etc.)
 */
export async function updateCareNeed(
  circleId: string,
  needId: string,
  updates: Partial<Omit<CareNeed, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = await getDatabase();
  const circle = db.getCareCircle(circleId);

  if (!circle) {
    throw new Error(`Care circle ${circleId} not found`);
  }

  const need = circle.needs.find(n => n.id === needId);
  if (!need) {
    throw new Error(`Care need ${needId} not found`);
  }

  Object.assign(need, updates, { updatedAt: Date.now() });

  await db.updateCareCircle(circleId, {
    needs: circle.needs,
    updatedAt: Date.now(),
  });
}

/**
 * Log a care activity
 */
export async function logCareActivity(
  activity: Omit<CareActivity, 'id' | 'createdAt'>
): Promise<string> {
  const db = await getDatabase();

  const careActivity: CareActivity = {
    ...activity,
    id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
  };

  await db.addCareActivity(careActivity);

  return careActivity.id;
}

/**
 * Get a care circle by ID
 */
export async function getCareCircle(circleId: string): Promise<CareCircle | undefined> {
  const db = await getDatabase();
  return db.getCareCircle(circleId);
}

/**
 * Get all care circles for a recipient
 */
export async function getCareCirclesForRecipient(recipientId: string): Promise<CareCircle[]> {
  const db = await getDatabase();
  const allCircles = db.listCareCircles();
  return allCircles.filter(c => c.recipientId === recipientId && c.active);
}

/**
 * Get all care circles where a user is a member
 */
export async function getCareCirclesForMember(userId: string): Promise<CareCircle[]> {
  const db = await getDatabase();
  const allCircles = db.listCareCircles();
  return allCircles.filter(c =>
    c.active && c.members.some(m => m.userId === userId && m.active)
  );
}

/**
 * Get recent care activities for a circle
 */
export async function getCareActivities(
  circleId: string,
  limit: number = 50
): Promise<CareActivity[]> {
  const db = await getDatabase();
  const allActivities = db.listCareActivities();

  return allActivities
    .filter(a => a.circleId === circleId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Get unmet needs for a care circle
 */
export async function getUnmetNeeds(circleId: string): Promise<CareNeed[]> {
  const circle = await getCareCircle(circleId);
  if (!circle) {
    return [];
  }

  return circle.needs.filter(n => !n.isMet);
}

/**
 * Suggest care responsibilities distribution (basic implementation)
 * In Phase 10, this would be enhanced with AI
 */
export async function suggestCareDistribution(
  circleId: string
): Promise<Map<string, CareNeed[]>> {
  const circle = await getCareCircle(circleId);
  if (!circle) {
    throw new Error(`Care circle ${circleId} not found`);
  }

  const unmetNeeds = circle.needs.filter(n => !n.isMet);
  const activeMembers = circle.members.filter(m => m.active);

  if (activeMembers.length === 0) {
    return new Map();
  }

  // Simple round-robin distribution
  // TODO: In Phase 10, use AI to match skills, availability, and load balance
  const distribution = new Map<string, CareNeed[]>();

  activeMembers.forEach(member => {
    distribution.set(member.userId, []);
  });

  unmetNeeds.forEach((need, index) => {
    const memberIndex = index % activeMembers.length;
    const member = activeMembers[memberIndex];
    distribution.get(member.userId)!.push(need);
  });

  return distribution;
}

/**
 * Deactivate a care circle (when care is no longer needed)
 */
export async function deactivateCareCircle(circleId: string): Promise<void> {
  const db = await getDatabase();

  await db.updateCareCircle(circleId, {
    active: false,
    updatedAt: Date.now(),
  });
}
