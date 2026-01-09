/**
 * Availability Calendar - Time Bank Scheduling System
 * REQ-TIME-016: Communication and Confirmation
 *
 * Enables community members to set and manage their availability for
 * offering time and skills, making coordination and scheduling easier.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gift economy - availability shared freely, not transactionally
 * - Flexible coordination - respect boundaries while enabling connection
 * - Offline-first - works without internet connection
 * - Privacy-preserving - users control visibility of their availability
 */

import { db } from '../core/database';
import type { AvailabilitySlot } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

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
 * Time range within a day
 */
export interface TimeRange {
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
}

/**
 * Options for creating an availability slot
 */
export interface CreateAvailabilityOptions {
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
  preferredActivityTypes?: string[]; // e.g., ["tutoring", "repairs"]
  maxBookings?: number; // Limit bookings per slot (default: 1)
  notes?: string; // Additional info (e.g., "Prefer morning sessions")

  // Visibility
  visibility?: 'public' | 'community' | 'care-circle'; // Who can see this availability
}

/**
 * Create a new availability slot
 */
export async function createAvailability(options: CreateAvailabilityOptions): Promise<AvailabilitySlot> {
  // Validate required fields
  requireValidIdentifier(options.userId, 'User ID');

  if (!options.timeRanges || options.timeRanges.length === 0) {
    throw new Error('At least one time range is required');
  }

  // Validate time ranges
  for (const timeRange of options.timeRanges) {
    if (!isValidTimeFormat(timeRange.startTime) || !isValidTimeFormat(timeRange.endTime)) {
      throw new Error('Time must be in HH:MM format (24-hour)');
    }
  }

  // Validate date or recurrence is provided
  if (!options.date && !options.dateRange && !options.recurrence) {
    throw new Error('Either date, dateRange, or recurrence must be specified');
  }

  // Build availability slot object (avoid undefined for Automerge compatibility)
  // Use a mutable object structure to build the slot before passing to database
  const slotData: Record<string, unknown> = {
    userId: options.userId,
    timeRanges: options.timeRanges,
    preferredActivityTypes: options.preferredActivityTypes || [],
    maxBookings: options.maxBookings || 1,
    currentBookings: 0,
    visibility: options.visibility || 'community',
    active: true,
  };

  // Only add optional fields if they are defined (Automerge doesn't support undefined)
  if (options.skillOfferId) {
    slotData.skillOfferId = options.skillOfferId;
  }
  if (options.date !== undefined) {
    slotData.date = options.date;
  }
  if (options.dateRange) {
    slotData.dateRange = options.dateRange;
  }
  if (options.recurrence) {
    slotData.recurrence = options.recurrence;
  }
  if (options.location) {
    slotData.location = options.location;
  }
  if (options.notes) {
    slotData.notes = sanitizeUserContent(options.notes.trim());
  }

  const availabilitySlot = slotData as Omit<AvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>;

  // Add to database
  try {
    const savedSlot = await db.addAvailabilitySlot(availabilitySlot);
    return savedSlot;
  } catch (error) {
    console.error(`Failed to create availability slot for user ${options.userId}:`, error);
    throw new Error(`Could not create availability slot: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update an existing availability slot
 */
export async function updateAvailability(
  slotId: string,
  updates: Partial<CreateAvailabilityOptions>
): Promise<void> {
  requireValidIdentifier(slotId, 'Slot ID');

  // Get existing slot to verify it exists
  const existingSlot = getAvailabilitySlot(slotId);
  if (!existingSlot) {
    throw new Error('Availability slot not found');
  }

  // Build sanitized updates
  const sanitizedUpdates: Partial<AvailabilitySlot> = {};

  if (updates.timeRanges !== undefined) {
    // Validate time ranges
    for (const timeRange of updates.timeRanges) {
      if (!isValidTimeFormat(timeRange.startTime) || !isValidTimeFormat(timeRange.endTime)) {
        throw new Error('Time must be in HH:MM format (24-hour)');
      }
    }
    sanitizedUpdates.timeRanges = updates.timeRanges;
  }

  if (updates.date !== undefined) {
    sanitizedUpdates.date = updates.date;
  }

  if (updates.dateRange !== undefined) {
    sanitizedUpdates.dateRange = updates.dateRange;
  }

  if (updates.recurrence !== undefined) {
    sanitizedUpdates.recurrence = updates.recurrence;
  }

  if (updates.location !== undefined) {
    sanitizedUpdates.location = updates.location;
  }

  if (updates.preferredActivityTypes !== undefined) {
    sanitizedUpdates.preferredActivityTypes = updates.preferredActivityTypes;
  }

  if (updates.maxBookings !== undefined) {
    sanitizedUpdates.maxBookings = updates.maxBookings;
  }

  if (updates.notes !== undefined) {
    sanitizedUpdates.notes = sanitizeUserContent(updates.notes.trim());
  }

  if (updates.visibility !== undefined) {
    sanitizedUpdates.visibility = updates.visibility;
  }

  try {
    await db.updateAvailabilitySlot(slotId, sanitizedUpdates);
  } catch (error) {
    console.error(`Failed to update availability slot ${slotId}:`, error);
    throw new Error(`Could not update availability slot: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deactivate an availability slot (mark as inactive)
 */
export async function deactivateAvailability(slotId: string): Promise<void> {
  requireValidIdentifier(slotId, 'Slot ID');
  try {
    await db.updateAvailabilitySlot(slotId, { active: false });
  } catch (error) {
    console.error(`Failed to deactivate availability slot ${slotId}:`, error);
    throw new Error(`Could not deactivate availability slot: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reactivate an availability slot
 */
export async function activateAvailability(slotId: string): Promise<void> {
  requireValidIdentifier(slotId, 'Slot ID');
  try {
    await db.updateAvailabilitySlot(slotId, { active: true });
  } catch (error) {
    console.error(`Failed to activate availability slot ${slotId}:`, error);
    throw new Error(`Could not activate availability slot: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete an availability slot
 */
export async function deleteAvailability(slotId: string): Promise<void> {
  requireValidIdentifier(slotId, 'Slot ID');

  // For now, we'll deactivate since there may not be a delete method yet
  await deactivateAvailability(slotId);
}

/**
 * Get a specific availability slot by ID
 */
export function getAvailabilitySlot(slotId: string): AvailabilitySlot | undefined {
  if (!validateIdentifier(slotId)) {
    return undefined;
  }

  const allSlots = db.listAvailabilitySlots();
  return allSlots.find(slot => slot.id === slotId);
}

/**
 * Get all availability slots for a specific user
 */
export function getUserAvailability(userId: string): AvailabilitySlot[] {
  if (!validateIdentifier(userId)) {
    return [];
  }

  const allSlots = db.listAvailabilitySlots();
  return allSlots.filter(slot => slot.userId === userId);
}

/**
 * Get all active availability slots for a specific user
 */
export function getUserActiveAvailability(userId: string): AvailabilitySlot[] {
  return getUserAvailability(userId).filter(slot => slot.active);
}

/**
 * Get availability slots linked to a specific skill offer
 */
export function getSkillAvailability(skillOfferId: string): AvailabilitySlot[] {
  if (!validateIdentifier(skillOfferId)) {
    return [];
  }

  const allSlots = db.listAvailabilitySlots();
  return allSlots.filter(slot =>
    slot.skillOfferId === skillOfferId && slot.active
  );
}

/**
 * Query availability slots within a date range
 * REQ-TIME-016: Enable scheduling and coordination
 */
export function queryAvailability(options: {
  startDate: number;
  endDate: number;
  userId?: string;
  skillOfferId?: string;
  activityType?: string;
  location?: string;
}): AvailabilitySlot[] {
  let slots = db.listAvailabilitySlots().filter(slot => slot.active);

  // Filter by user if specified
  if (options.userId) {
    slots = slots.filter(slot => slot.userId === options.userId);
  }

  // Filter by skill if specified
  if (options.skillOfferId) {
    slots = slots.filter(slot => slot.skillOfferId === options.skillOfferId);
  }

  // Filter by activity type if specified
  if (options.activityType) {
    slots = slots.filter(slot =>
      slot.preferredActivityTypes.length === 0 || // No preference = accepts all
      slot.preferredActivityTypes.includes(options.activityType)
    );
  }

  // Filter by location type if specified
  if (options.location) {
    slots = slots.filter(slot =>
      !slot.location ||
      slot.location.type === 'flexible' ||
      slot.location.type === options.location
    );
  }

  // Filter by date range
  slots = slots.filter(slot => {
    // Check one-time availability
    if (slot.date) {
      return slot.date >= options.startDate && slot.date <= options.endDate;
    }

    // Check date range availability
    if (slot.dateRange) {
      return (
        slot.dateRange.start <= options.endDate &&
        slot.dateRange.end >= options.startDate
      );
    }

    // Check recurring availability
    if (slot.recurrence) {
      // If recurrence has an end date, check it
      if (slot.recurrence.endDate && slot.recurrence.endDate < options.startDate) {
        return false;
      }
      // For simplicity, include all active recurring slots that might match
      // A more sophisticated check would calculate specific occurrences
      return true;
    }

    return false;
  });

  // Filter by booking capacity
  slots = slots.filter(slot => slot.currentBookings < slot.maxBookings);

  return slots;
}

/**
 * Get all available slots for a specific date
 * Returns slots that occur on this date (one-time, date ranges, or recurring)
 */
export function getAvailabilityForDate(date: number): AvailabilitySlot[] {
  const startOfDay = getStartOfDay(date);
  const endOfDay = getEndOfDay(date);

  return queryAvailability({
    startDate: startOfDay,
    endDate: endOfDay,
  });
}

/**
 * Check if a user is available during a specific time window
 */
export function isUserAvailable(
  userId: string,
  date: number,
  timeRange: TimeRange
): boolean {
  const availability = getUserActiveAvailability(userId);

  for (const slot of availability) {
    // Check if slot applies to this date
    const matchesDate = (
      (slot.date && isSameDay(slot.date, date)) ||
      (slot.dateRange && date >= slot.dateRange.start && date <= slot.dateRange.end) ||
      (slot.recurrence && matchesRecurrence(slot.recurrence, date))
    );

    if (!matchesDate) continue;

    // Check if any time range overlaps
    for (const slotTime of slot.timeRanges) {
      if (timeRangesOverlap(slotTime, timeRange)) {
        // Check if slot has capacity
        if (slot.currentBookings < slot.maxBookings) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Format availability slot for display
 */
export function formatAvailabilityForDisplay(slot: AvailabilitySlot): string {
  const timeRangesStr = slot.timeRanges
    .map(tr => `${tr.startTime}-${tr.endTime}`)
    .join(', ');

  let dateStr = '';
  if (slot.date) {
    dateStr = new Date(slot.date).toLocaleDateString();
  } else if (slot.dateRange) {
    dateStr = `${new Date(slot.dateRange.start).toLocaleDateString()} - ${new Date(slot.dateRange.end).toLocaleDateString()}`;
  } else if (slot.recurrence) {
    dateStr = formatRecurrence(slot.recurrence);
  }

  const locationStr = slot.location ? `📍 ${slot.location.type}` : '';
  const notesStr = slot.notes ? `\n💬 ${slot.notes}` : '';
  const capacityStr = `${slot.currentBookings}/${slot.maxBookings} booked`;

  return `
📅 ${dateStr}
⏰ ${timeRangesStr}
${locationStr}
${capacityStr}${notesStr}
  `.trim();
}

// ===== Helper Functions =====

/**
 * Validate time format (HH:MM in 24-hour format)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Get start of day timestamp (00:00:00)
 */
function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Get end of day timestamp (23:59:59)
 */
function getEndOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/**
 * Check if two timestamps are on the same day
 */
function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date matches a recurrence pattern
 */
function matchesRecurrence(recurrence: RecurrencePattern, date: number): boolean {
  const d = new Date(date);

  // Check if past end date
  if (recurrence.endDate && date > recurrence.endDate) {
    return false;
  }

  switch (recurrence.type) {
    case 'daily':
      return true;

    case 'weekly':
      if (!recurrence.daysOfWeek) return false;
      return recurrence.daysOfWeek.includes(d.getDay());

    case 'biweekly':
      // Simplified: just check day of week (would need start date for proper biweekly)
      if (!recurrence.daysOfWeek) return false;
      return recurrence.daysOfWeek.includes(d.getDay());

    case 'monthly':
      if (!recurrence.dayOfMonth) return false;
      return d.getDate() === recurrence.dayOfMonth;

    default:
      return false;
  }
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(range1: TimeRange, range2: TimeRange): boolean {
  const start1 = timeToMinutes(range1.startTime);
  const end1 = timeToMinutes(range1.endTime);
  const start2 = timeToMinutes(range2.startTime);
  const end2 = timeToMinutes(range2.endTime);

  return start1 < end2 && start2 < end1;
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format recurrence pattern for display
 */
function formatRecurrence(recurrence: RecurrencePattern): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  switch (recurrence.type) {
    case 'daily':
      return 'Daily';

    case 'weekly':
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        const days = recurrence.daysOfWeek.map(d => dayNames[d]).join(', ');
        return `Weekly: ${days}`;
      }
      return 'Weekly';

    case 'biweekly':
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        const days = recurrence.daysOfWeek.map(d => dayNames[d]).join(', ');
        return `Every 2 weeks: ${days}`;
      }
      return 'Every 2 weeks';

    case 'monthly':
      if (recurrence.dayOfMonth) {
        return `Monthly on day ${recurrence.dayOfMonth}`;
      }
      return 'Monthly';

    default:
      return 'Recurring';
  }
}
