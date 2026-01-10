/**
 * Shift Volunteering - Collective Time Project Coordination
 * REQ-TIME-017: Group Coordination
 * REQ-TIME-005: Collective Time Projects
 *
 * Enables coordinated volunteer shifts for community events and ongoing needs
 * (e.g., community garden workdays, food bank shifts, repair cafe coverage).
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gift economy - volunteers give what they can, when they can
 * - Collective action - many hands make light work
 * - Offline-first - works without internet connection
 * - Accessibility - accommodations for diverse abilities
 */

import { db } from '../core/database';
import type { VolunteerShift, RecurringShiftPattern, ShiftStatus, TimeRange, RecurrencePattern, ShiftRole } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

/**
 * Options for creating a volunteer shift
 */
export interface CreateVolunteerShiftOptions {
  organizerId: string;
  title: string;
  description: string;
  category: string;

  // When
  shiftDate: number;
  shiftTime: TimeRange;
  estimatedDuration?: number;

  // Where
  location: {
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Volunteer coordination
  volunteersNeeded: number;

  // Optional role-based volunteering
  roles?: Array<{
    name: string;
    description?: string;
    volunteersNeeded: number;
  }>;

  // Details
  communityEventId?: string;
  whatToBring?: string[];
  preparationNotes?: string;
  accessibilityInfo?: string;
  skillsNeeded?: string[];
}

/**
 * Options for creating a recurring shift pattern
 */
export interface CreateRecurringShiftOptions {
  organizerId: string;
  title: string;
  description: string;
  category: string;

  // Location
  location: {
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Recurrence
  recurrence: RecurrencePattern;
  shiftTime: TimeRange;
  estimatedDuration?: number;

  // Coordination
  volunteersNeeded: number;
  whatToBring?: string[];
  preparationNotes?: string;
  accessibilityInfo?: string;
  skillsNeeded?: string[];
}

/**
 * Create a volunteer shift
 * REQ-TIME-017: Multiple volunteers for community event scenario
 */
export async function createVolunteerShift(options: CreateVolunteerShiftOptions): Promise<VolunteerShift> {
  // Validate required fields
  requireValidIdentifier(options.organizerId, 'Organizer ID');

  if (!options.title || options.title.trim().length === 0) {
    throw new Error('Shift title is required');
  }

  if (!options.description || options.description.trim().length === 0) {
    throw new Error('Shift description is required');
  }

  if (!options.category || options.category.trim().length === 0) {
    throw new Error('Shift category is required');
  }

  if (!options.shiftDate || options.shiftDate <= 0) {
    throw new Error('Shift date is required');
  }

  if (!options.shiftTime || !options.shiftTime.startTime || !options.shiftTime.endTime) {
    throw new Error('Shift time range is required');
  }

  if (!options.volunteersNeeded || options.volunteersNeeded < 1) {
    throw new Error('Number of volunteers needed must be at least 1');
  }

  if (!options.location || !options.location.name) {
    throw new Error('Location name is required');
  }

  // Sanitize user content
  const sanitizedTitle = sanitizeUserContent(options.title.trim());
  const sanitizedDescription = sanitizeUserContent(options.description.trim());
  const sanitizedCategory = sanitizeUserContent(options.category.trim().toLowerCase());
  const sanitizedLocationName = sanitizeUserContent(options.location.name.trim());
  const sanitizedLocationAddress = options.location.address ? sanitizeUserContent(options.location.address.trim()) : undefined;
  const sanitizedPreparationNotes = options.preparationNotes ? sanitizeUserContent(options.preparationNotes.trim()) : undefined;
  const sanitizedAccessibilityInfo = options.accessibilityInfo ? sanitizeUserContent(options.accessibilityInfo.trim()) : undefined;

  // Sanitize arrays
  const sanitizedWhatToBring = options.whatToBring?.map(item => sanitizeUserContent(item.trim()));
  const sanitizedSkillsNeeded = options.skillsNeeded?.map(skill => sanitizeUserContent(skill.trim()));

  // Sanitize roles if provided (avoiding undefined for Automerge)
  const sanitizedRoles = options.roles?.map(role => {
    const sanitizedRole: ShiftRole = {
      name: sanitizeUserContent(role.name.trim()),
      volunteersNeeded: role.volunteersNeeded,
      volunteersAssigned: [],
      // Only add description if it exists (Automerge doesn't allow undefined)
      ...(role.description && { description: sanitizeUserContent(role.description.trim()) }),
    };
    return sanitizedRole;
  });

  // Build shift object (avoiding undefined for Automerge)
  const shiftData: Omit<VolunteerShift, 'id' | 'createdAt' | 'updatedAt'> = {
    organizerId: options.organizerId,
    title: sanitizedTitle,
    description: sanitizedDescription,
    category: sanitizedCategory,
    shiftDate: options.shiftDate,
    shiftTime: options.shiftTime,
    location: {
      name: sanitizedLocationName,
      ...(sanitizedLocationAddress && { address: sanitizedLocationAddress }),
      ...(options.location.coordinates && { coordinates: options.location.coordinates }),
    },
    volunteersNeeded: options.volunteersNeeded,
    volunteersSignedUp: [],
    status: 'open',
    ...(options.estimatedDuration && { estimatedDuration: options.estimatedDuration }),
    ...(sanitizedRoles && { roles: sanitizedRoles }),
    ...(options.communityEventId && { communityEventId: options.communityEventId }),
    ...(sanitizedWhatToBring && { whatToBring: sanitizedWhatToBring }),
    ...(sanitizedPreparationNotes && { preparationNotes: sanitizedPreparationNotes }),
    ...(sanitizedAccessibilityInfo && { accessibilityInfo: sanitizedAccessibilityInfo }),
    ...(sanitizedSkillsNeeded && { skillsNeeded: sanitizedSkillsNeeded }),
  };

  try {
    const shift = await db.addVolunteerShift(shiftData);
    return shift;
  } catch (error) {
    console.error('Failed to create volunteer shift:', error);
    throw new Error(`Could not create volunteer shift: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sign up for a volunteer shift
 * REQ-TIME-017: Volunteers sign up scenario
 */
export async function signUpForShift(shiftId: string, userId: string, roleIndex?: number): Promise<void> {
  requireValidIdentifier(shiftId, 'Shift ID');
  requireValidIdentifier(userId, 'User ID');

  const shift = db.getVolunteerShift(shiftId);
  if (!shift) {
    throw new Error('Volunteer shift not found');
  }

  if (shift.status === 'cancelled') {
    throw new Error('Cannot sign up for a cancelled shift');
  }

  if (shift.status === 'completed') {
    throw new Error('Cannot sign up for a completed shift');
  }

  // Check if user already signed up
  if (shift.volunteersSignedUp.includes(userId)) {
    throw new Error('You are already signed up for this shift');
  }

  // Handle role-based signup
  if (roleIndex !== undefined) {
    if (!shift.roles || roleIndex >= shift.roles.length) {
      throw new Error('Invalid role index');
    }

    const role = shift.roles[roleIndex];
    if (role.volunteersAssigned.length >= role.volunteersNeeded) {
      throw new Error(`This role is full (${role.volunteersNeeded} volunteers needed)`);
    }

    // Update using direct database method for Automerge-safe array operations
    await db.update((doc) => {
      const docShift = doc.volunteerShifts[shiftId];
      if (docShift && docShift.roles && docShift.roles[roleIndex]) {
        // Push to existing arrays (Automerge-safe)
        docShift.volunteersSignedUp.push(userId);
        docShift.roles[roleIndex].volunteersAssigned.push(userId);
        docShift.updatedAt = Date.now();
      }
    });
  } else {
    // General signup - use direct database method for Automerge-safe array operations
    await db.update((doc) => {
      const docShift = doc.volunteerShifts[shiftId];
      if (docShift) {
        // Push to existing array (Automerge-safe)
        docShift.volunteersSignedUp.push(userId);

        // Check if shift is now filled
        if (docShift.volunteersSignedUp.length >= docShift.volunteersNeeded) {
          docShift.status = 'filled';
        }

        docShift.updatedAt = Date.now();
      }
    });
  }
}

/**
 * Cancel signup for a volunteer shift
 */
export async function cancelShiftSignup(shiftId: string, userId: string): Promise<void> {
  requireValidIdentifier(shiftId, 'Shift ID');
  requireValidIdentifier(userId, 'User ID');

  const shift = db.getVolunteerShift(shiftId);
  if (!shift) {
    throw new Error('Volunteer shift not found');
  }

  if (!shift.volunteersSignedUp.includes(userId)) {
    throw new Error('You are not signed up for this shift');
  }

  // Update using direct database method for Automerge-safe array operations
  await db.update((doc) => {
    const docShift = doc.volunteerShifts[shiftId];
    if (docShift) {
      // Remove from signed up list using splice (Automerge-safe)
      const volunteerIndex = docShift.volunteersSignedUp.indexOf(userId);
      if (volunteerIndex >= 0) {
        docShift.volunteersSignedUp.splice(volunteerIndex, 1);
      }

      // Remove from roles if applicable
      if (docShift.roles) {
        for (const role of docShift.roles) {
          const roleVolunteerIndex = role.volunteersAssigned.indexOf(userId);
          if (roleVolunteerIndex >= 0) {
            role.volunteersAssigned.splice(roleVolunteerIndex, 1);
          }
        }
      }

      // If it was filled and now has space, mark as open again
      if (docShift.status === 'filled' && docShift.volunteersSignedUp.length < docShift.volunteersNeeded) {
        docShift.status = 'open';
      }

      docShift.updatedAt = Date.now();
    }
  });
}

/**
 * Mark shift as in progress
 */
export async function startShift(shiftId: string, organizerId: string): Promise<void> {
  requireValidIdentifier(shiftId, 'Shift ID');
  requireValidIdentifier(organizerId, 'Organizer ID');

  const shift = db.getVolunteerShift(shiftId);
  if (!shift) {
    throw new Error('Volunteer shift not found');
  }

  if (shift.organizerId !== organizerId) {
    throw new Error('Only the organizer can start the shift');
  }

  if (shift.status === 'cancelled') {
    throw new Error('Cannot start a cancelled shift');
  }

  await db.updateVolunteerShift(shiftId, { status: 'in-progress' });
}

/**
 * Complete a shift with optional impact notes
 * REQ-TIME-017: Track task completion scenario
 */
export async function completeShift(
  shiftId: string,
  organizerId: string,
  completionNotes?: string,
  impactDescription?: string
): Promise<void> {
  requireValidIdentifier(shiftId, 'Shift ID');
  requireValidIdentifier(organizerId, 'Organizer ID');

  const shift = db.getVolunteerShift(shiftId);
  if (!shift) {
    throw new Error('Volunteer shift not found');
  }

  if (shift.organizerId !== organizerId) {
    throw new Error('Only the organizer can complete the shift');
  }

  const updates: Partial<VolunteerShift> = {
    status: 'completed',
  };

  if (completionNotes) {
    updates.completionNotes = sanitizeUserContent(completionNotes.trim());
  }

  if (impactDescription) {
    updates.impactDescription = sanitizeUserContent(impactDescription.trim());
  }

  await db.updateVolunteerShift(shiftId, updates);
}

/**
 * Cancel a shift
 */
export async function cancelShift(
  shiftId: string,
  organizerId: string,
  reason?: string
): Promise<void> {
  requireValidIdentifier(shiftId, 'Shift ID');
  requireValidIdentifier(organizerId, 'Organizer ID');

  const shift = db.getVolunteerShift(shiftId);
  if (!shift) {
    throw new Error('Volunteer shift not found');
  }

  if (shift.organizerId !== organizerId) {
    throw new Error('Only the organizer can cancel the shift');
  }

  const updates: Partial<VolunteerShift> = {
    status: 'cancelled',
    cancelledAt: Date.now(),
  };

  if (reason) {
    updates.cancellationReason = sanitizeUserContent(reason.trim());
  }

  await db.updateVolunteerShift(shiftId, updates);
}

/**
 * Create a recurring shift pattern
 * REQ-TIME-004: Ongoing vs. One-Time Offers scenario
 */
export async function createRecurringShift(options: CreateRecurringShiftOptions): Promise<RecurringShiftPattern> {
  // Validate required fields
  requireValidIdentifier(options.organizerId, 'Organizer ID');

  if (!options.title || options.title.trim().length === 0) {
    throw new Error('Shift title is required');
  }

  if (!options.description || options.description.trim().length === 0) {
    throw new Error('Shift description is required');
  }

  if (!options.category || options.category.trim().length === 0) {
    throw new Error('Shift category is required');
  }

  if (!options.recurrence) {
    throw new Error('Recurrence pattern is required');
  }

  if (!options.shiftTime || !options.shiftTime.startTime || !options.shiftTime.endTime) {
    throw new Error('Shift time range is required');
  }

  if (!options.volunteersNeeded || options.volunteersNeeded < 1) {
    throw new Error('Number of volunteers needed must be at least 1');
  }

  if (!options.location || !options.location.name) {
    throw new Error('Location name is required');
  }

  // Sanitize user content
  const sanitizedTitle = sanitizeUserContent(options.title.trim());
  const sanitizedDescription = sanitizeUserContent(options.description.trim());
  const sanitizedCategory = sanitizeUserContent(options.category.trim().toLowerCase());
  const sanitizedLocationName = sanitizeUserContent(options.location.name.trim());
  const sanitizedLocationAddress = options.location.address ? sanitizeUserContent(options.location.address.trim()) : undefined;
  const sanitizedPreparationNotes = options.preparationNotes ? sanitizeUserContent(options.preparationNotes.trim()) : undefined;
  const sanitizedAccessibilityInfo = options.accessibilityInfo ? sanitizeUserContent(options.accessibilityInfo.trim()) : undefined;

  // Sanitize arrays
  const sanitizedWhatToBring = options.whatToBring?.map(item => sanitizeUserContent(item.trim()));
  const sanitizedSkillsNeeded = options.skillsNeeded?.map(skill => sanitizeUserContent(skill.trim()));

  // Build pattern object
  const patternData: Omit<RecurringShiftPattern, 'id' | 'createdAt' | 'updatedAt'> = {
    title: sanitizedTitle,
    description: sanitizedDescription,
    category: sanitizedCategory,
    location: {
      name: sanitizedLocationName,
      ...(sanitizedLocationAddress && { address: sanitizedLocationAddress }),
      ...(options.location.coordinates && { coordinates: options.location.coordinates }),
    },
    recurrence: options.recurrence,
    shiftTime: options.shiftTime,
    volunteersNeeded: options.volunteersNeeded,
    organizerId: options.organizerId,
    active: true,
    ...(options.estimatedDuration && { estimatedDuration: options.estimatedDuration }),
    ...(sanitizedWhatToBring && { whatToBring: sanitizedWhatToBring }),
    ...(sanitizedPreparationNotes && { preparationNotes: sanitizedPreparationNotes }),
    ...(sanitizedAccessibilityInfo && { accessibilityInfo: sanitizedAccessibilityInfo }),
    ...(sanitizedSkillsNeeded && { skillsNeeded: sanitizedSkillsNeeded }),
  };

  try {
    const pattern = await db.addRecurringShiftPattern(patternData);
    return pattern;
  } catch (error) {
    console.error('Failed to create recurring shift pattern:', error);
    throw new Error(`Could not create recurring shift pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Pause or resume a recurring shift pattern
 */
export async function toggleRecurringShift(patternId: string, organizerId: string, active: boolean): Promise<void> {
  requireValidIdentifier(patternId, 'Pattern ID');
  requireValidIdentifier(organizerId, 'Organizer ID');

  const pattern = db.getRecurringShiftPattern(patternId);
  if (!pattern) {
    throw new Error('Recurring shift pattern not found');
  }

  if (pattern.organizerId !== organizerId) {
    throw new Error('Only the organizer can modify the shift pattern');
  }

  await db.updateRecurringShiftPattern(patternId, { active });
}

/**
 * Get volunteer shift by ID
 */
export function getVolunteerShift(shiftId: string): VolunteerShift | undefined {
  if (!validateIdentifier(shiftId)) {
    return undefined;
  }
  return db.getVolunteerShift(shiftId);
}

/**
 * Browse open volunteer shifts
 */
export function browseOpenShifts(options?: {
  category?: string;
  startDate?: number;
  endDate?: number;
}): VolunteerShift[] {
  let shifts = db.getOpenVolunteerShifts();

  if (options?.category) {
    shifts = shifts.filter(shift => shift.category === options.category.toLowerCase());
  }

  if (options?.startDate) {
    shifts = shifts.filter(shift => shift.shiftDate >= options.startDate!);
  }

  if (options?.endDate) {
    shifts = shifts.filter(shift => shift.shiftDate <= options.endDate!);
  }

  return shifts.sort((a, b) => a.shiftDate - b.shiftDate);
}

/**
 * Get shifts a user has signed up for
 */
export function getMyShifts(userId: string): VolunteerShift[] {
  if (!validateIdentifier(userId)) {
    return [];
  }
  return db.getVolunteerShiftsByVolunteer(userId);
}

/**
 * Get shifts organized by a user
 */
export function getOrganizedShifts(userId: string): VolunteerShift[] {
  if (!validateIdentifier(userId)) {
    return [];
  }
  return db.getVolunteerShiftsByOrganizer(userId);
}

/**
 * Get upcoming shifts (for calendar view)
 */
export function getUpcomingShifts(userId?: string): VolunteerShift[] {
  return db.getUpcomingVolunteerShifts(userId);
}

/**
 * Get shifts by category
 */
export function getShiftsByCategory(category: string): VolunteerShift[] {
  return db.getVolunteerShiftsByCategory(category.toLowerCase());
}

/**
 * Get all recurring shift patterns
 */
export function getActiveRecurringShifts(): RecurringShiftPattern[] {
  return db.getActiveRecurringShiftPatterns();
}

/**
 * Format shift for display
 */
export function formatShiftForDisplay(shift: VolunteerShift): string {
  const date = new Date(shift.shiftDate).toLocaleDateString();
  const timeStr = `${shift.shiftTime.startTime}-${shift.shiftTime.endTime}`;
  const duration = shift.estimatedDuration ? ` (${shift.estimatedDuration}min)` : '';
  const spotsLeft = shift.volunteersNeeded - shift.volunteersSignedUp.length;

  const statusEmoji = {
    'open': '🟢',
    'filled': '✅',
    'in-progress': '🔄',
    'completed': '✨',
    'cancelled': '❌',
  }[shift.status];

  let roleInfo = '';
  if (shift.roles && shift.roles.length > 0) {
    roleInfo = '\n📋 Roles:\n' + shift.roles.map(role => {
      const roleSpotsLeft = role.volunteersNeeded - role.volunteersAssigned.length;
      return `  - ${role.name}: ${role.volunteersAssigned.length}/${role.volunteersNeeded} filled (${roleSpotsLeft} spots left)`;
    }).join('\n');
  }

  return `
${statusEmoji} ${shift.title}
📅 ${date} at ${timeStr}${duration}
📍 ${shift.location.name}${shift.location.address ? ` - ${shift.location.address}` : ''}
👥 ${shift.volunteersSignedUp.length}/${shift.volunteersNeeded} volunteers (${spotsLeft} spots left)
🏷️  Category: ${shift.category}${roleInfo}
${shift.description}
${shift.preparationNotes ? '\n📝 Preparation: ' + shift.preparationNotes : ''}
${shift.whatToBring && shift.whatToBring.length > 0 ? '\n🎒 Bring: ' + shift.whatToBring.join(', ') : ''}
${shift.accessibilityInfo ? '\n♿ Accessibility: ' + shift.accessibilityInfo : ''}
  `.trim();
}

/**
 * Format recurring shift pattern for display
 */
export function formatRecurringShiftForDisplay(pattern: RecurringShiftPattern): string {
  const timeStr = `${pattern.shiftTime.startTime}-${pattern.shiftTime.endTime}`;
  const duration = pattern.estimatedDuration ? ` (${pattern.estimatedDuration}min)` : '';

  let recurrenceStr = '';
  switch (pattern.recurrence.type) {
    case 'daily':
      recurrenceStr = 'Daily';
      break;
    case 'weekly':
      recurrenceStr = `Weekly on ${pattern.recurrence.daysOfWeek?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`;
      break;
    case 'biweekly':
      recurrenceStr = `Every 2 weeks on ${pattern.recurrence.daysOfWeek?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`;
      break;
    case 'monthly':
      recurrenceStr = `Monthly on day ${pattern.recurrence.dayOfMonth}`;
      break;
  }

  return `
${pattern.active ? '🔄' : '⏸️'} ${pattern.title}
🕐 ${recurrenceStr} at ${timeStr}${duration}
📍 ${pattern.location.name}${pattern.location.address ? ` - ${pattern.location.address}` : ''}
👥 ${pattern.volunteersNeeded} volunteers needed
🏷️  Category: ${pattern.category}
${pattern.description}
${pattern.preparationNotes ? '\n📝 Preparation: ' + pattern.preparationNotes : ''}
${pattern.whatToBring && pattern.whatToBring.length > 0 ? '\n🎒 Bring: ' + pattern.whatToBring.join(', ') : ''}
${pattern.accessibilityInfo ? '\n♿ Accessibility: ' + pattern.accessibilityInfo : ''}
  `.trim();
}
