/**
 * Equipment Booking System
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-012: Resource Availability Calendars
 * Phase 3, Group C: Tool Library & Equipment
 *
 * Enables community members to book tools and equipment for specific time periods,
 * with scheduling, capacity management, and coordination features.
 *
 * IMPORTANT SOLARPUNK VALUES:
 * - Gift economy - bookings are about coordination, not transactions
 * - Community care - prevent hoarding by supporting fair access
 * - Offline-first - works without internet connection (uses Automerge database)
 * - No surveillance - minimal data collection, maximum autonomy
 */

import { db } from '../core/database';
import type { Resource, EquipmentBooking, BookingStatus } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

/**
 * Booking conflict information
 */
export interface BookingConflict {
  conflictingBooking: EquipmentBooking;
  overlapStart: number;
  overlapEnd: number;
}

/**
 * Time slot availability information
 */
export interface TimeSlotAvailability {
  startTime: number;
  endTime: number;
  available: boolean;
  bookings: EquipmentBooking[];
}

/**
 * Create a new equipment booking
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-012: Resource Availability Calendars
 */
export async function createBooking(
  userId: string,
  resourceId: string,
  startTime: number,
  endTime: number,
  options?: {
    purpose?: string;
    pickupLocation?: string;
    notes?: string;
  }
): Promise<EquipmentBooking> {
  requireValidIdentifier(userId, 'User ID');
  requireValidIdentifier(resourceId, 'Resource ID');

  // Validate time range
  if (startTime >= endTime) {
    throw new Error('Start time must be before end time');
  }

  if (startTime < Date.now()) {
    throw new Error('Cannot book equipment in the past');
  }

  // Get the resource
  const resource = db.getResource(resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  // Check if resource is a tool or equipment
  if (resource.resourceType !== 'tool' && resource.resourceType !== 'equipment') {
    throw new Error('This resource type does not support bookings');
  }

  // Check if resource is available
  if (!resource.available) {
    throw new Error('Resource is currently unavailable');
  }

  // Cannot book your own equipment (resource owner manages their own schedule)
  if (resource.ownerId === userId) {
    throw new Error('Resource owners manage their own equipment schedule');
  }

  // Check for booking conflicts
  const conflicts = checkBookingConflicts(resourceId, startTime, endTime);
  if (conflicts.length > 0) {
    const conflictDetails = conflicts.map(c =>
      `${new Date(c.overlapStart).toLocaleString()} - ${new Date(c.overlapEnd).toLocaleString()}`
    ).join(', ');
    throw new Error(`Time slot conflicts with existing bookings: ${conflictDetails}`);
  }

  // Check tool-specific constraints (max borrow days)
  const toolLibrary = resource.toolLibrary;
  if (toolLibrary) {
    const bookingDuration = endTime - startTime;
    const maxBorrowDays = 7; // Default max borrow period
    const maxDuration = maxBorrowDays * 24 * 60 * 60 * 1000; // Convert days to ms
    if (bookingDuration > maxDuration) {
      throw new Error(`Maximum borrow period for this tool is ${maxBorrowDays} days`);
    }
  }

  // Build booking object (avoiding undefined for Automerge)
  const bookingData: Omit<EquipmentBooking, 'id' | 'createdAt' | 'updatedAt'> = {
    resourceId,
    userId,
    startTime,
    endTime,
    status: 'confirmed', // In solarpunk gift economy, bookings are confirmed by default (trust-based)
    ...(options?.purpose && { purpose: sanitizeUserContent(options.purpose) }),
    ...(options?.pickupLocation && { pickupLocation: sanitizeUserContent(options.pickupLocation) }),
    ...(options?.notes && { notes: sanitizeUserContent(options.notes) }),
  };

  try {
    // Save booking to database
    const booking = await db.addEquipmentBooking(bookingData);

    // Record economic event for the booking
    await db.recordEvent({
      action: 'lend',
      providerId: resource.ownerId,
      receiverId: userId,
      resourceId: resourceId,
      note: `Booked: ${resource.name} from ${new Date(startTime).toLocaleDateString()} to ${new Date(endTime).toLocaleDateString()}`,
    });

    return booking;
  } catch (error) {
    console.error(`Failed to create booking for resource ${resourceId}:`, error);
    throw new Error(`Could not create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check for booking conflicts in a time range
 */
export function checkBookingConflicts(
  resourceId: string,
  startTime: number,
  endTime: number,
  excludeBookingId?: string
): BookingConflict[] {
  const conflicts: BookingConflict[] = [];
  const existingBookings = getBookingsForResource(resourceId);

  for (const booking of existingBookings) {
    // Skip cancelled bookings and the booking being updated
    if (booking.status === 'cancelled' || booking.id === excludeBookingId) {
      continue;
    }

    // Check for time overlap
    const overlapStart = Math.max(startTime, booking.startTime);
    const overlapEnd = Math.min(endTime, booking.endTime);

    if (overlapStart < overlapEnd) {
      conflicts.push({
        conflictingBooking: booking,
        overlapStart,
        overlapEnd,
      });
    }
  }

  return conflicts;
}

/**
 * Get all bookings for a specific resource
 */
export function getBookingsForResource(resourceId: string): EquipmentBooking[] {
  if (!validateIdentifier(resourceId)) {
    return [];
  }
  return db.getEquipmentBookingsByResource(resourceId);
}

/**
 * Get all bookings made by a specific user
 */
export function getBookingsByUser(userId: string): EquipmentBooking[] {
  if (!validateIdentifier(userId)) {
    return [];
  }
  return db.getEquipmentBookingsByUser(userId);
}

/**
 * Get bookings for resources owned by a specific user
 */
export function getBookingsForMyResources(ownerId: string): Array<{
  booking: EquipmentBooking;
  resource: Resource | undefined;
}> {
  if (!validateIdentifier(ownerId)) {
    return [];
  }

  const myResources = db.getResourcesByOwner(ownerId);
  const myResourceIds = new Set(myResources.map(r => r.id));

  return db.listEquipmentBookings()
    .filter(b => myResourceIds.has(b.resourceId))
    .map(booking => ({
      booking,
      resource: db.getResource(booking.resourceId),
    }))
    .sort((a, b) => a.booking.startTime - b.booking.startTime);
}

/**
 * Get a single booking by ID
 */
export function getBooking(bookingId: string): EquipmentBooking | undefined {
  if (!validateIdentifier(bookingId)) {
    return undefined;
  }
  return db.getEquipmentBooking(bookingId);
}

/**
 * Update a booking
 */
export async function updateBooking(
  bookingId: string,
  userId: string,
  updates: {
    startTime?: number;
    endTime?: number;
    purpose?: string;
    pickupLocation?: string;
    notes?: string;
  }
): Promise<EquipmentBooking> {
  requireValidIdentifier(bookingId, 'Booking ID');
  requireValidIdentifier(userId, 'User ID');

  const booking = db.getEquipmentBooking(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Only the booking creator or resource owner can update
  const resource = db.getResource(booking.resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  if (booking.userId !== userId && resource.ownerId !== userId) {
    throw new Error('Not authorized to update this booking');
  }

  // Can't update cancelled or completed bookings
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    throw new Error(`Cannot update ${booking.status} bookings`);
  }

  // If updating time, check for conflicts
  const newStartTime = updates.startTime ?? booking.startTime;
  const newEndTime = updates.endTime ?? booking.endTime;

  if (newStartTime >= newEndTime) {
    throw new Error('Start time must be before end time');
  }

  if (updates.startTime || updates.endTime) {
    const conflicts = checkBookingConflicts(booking.resourceId, newStartTime, newEndTime, bookingId);
    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(c =>
        `${new Date(c.overlapStart).toLocaleString()} - ${new Date(c.overlapEnd).toLocaleString()}`
      ).join(', ');
      throw new Error(`Updated time slot conflicts with existing bookings: ${conflictDetails}`);
    }
  }

  // Build sanitized updates
  const bookingUpdates: Partial<EquipmentBooking> = {
    ...(updates.startTime !== undefined && { startTime: updates.startTime }),
    ...(updates.endTime !== undefined && { endTime: updates.endTime }),
    ...(updates.purpose !== undefined && { purpose: sanitizeUserContent(updates.purpose) }),
    ...(updates.pickupLocation !== undefined && { pickupLocation: sanitizeUserContent(updates.pickupLocation) }),
    ...(updates.notes !== undefined && { notes: sanitizeUserContent(updates.notes) }),
  };

  try {
    await db.updateEquipmentBooking(bookingId, bookingUpdates);
    const updatedBooking = db.getEquipmentBooking(bookingId);
    if (!updatedBooking) {
      throw new Error('Booking not found after update');
    }
    return updatedBooking;
  } catch (error) {
    console.error(`Failed to update booking ${bookingId}:`, error);
    throw new Error(`Could not update booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  reason?: string
): Promise<void> {
  requireValidIdentifier(bookingId, 'Booking ID');
  requireValidIdentifier(userId, 'User ID');

  const booking = db.getEquipmentBooking(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Only the booking creator or resource owner can cancel
  const resource = db.getResource(booking.resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  if (booking.userId !== userId && resource.ownerId !== userId) {
    throw new Error('Not authorized to cancel this booking');
  }

  // Build updates
  const updates: Partial<EquipmentBooking> = {
    status: 'cancelled',
  };

  if (reason) {
    const sanitizedReason = sanitizeUserContent(reason);
    updates.notes = booking.notes
      ? `${booking.notes}\nCancellation reason: ${sanitizedReason}`
      : `Cancellation reason: ${sanitizedReason}`;
  }

  try {
    await db.updateEquipmentBooking(bookingId, updates);

    // Record cancellation event
    await db.recordEvent({
      action: 'transfer', // Using transfer to indicate state change
      providerId: resource.ownerId,
      receiverId: userId,
      resourceId: booking.resourceId,
      note: `Booking cancelled: ${resource.name}${reason ? ` - ${sanitizeUserContent(reason)}` : ''}`,
    });
  } catch (error) {
    console.error(`Failed to cancel booking ${bookingId}:`, error);
    throw new Error(`Could not cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mark booking as active (pickup happened)
 */
export async function markBookingActive(
  bookingId: string,
  userId: string
): Promise<void> {
  requireValidIdentifier(bookingId, 'Booking ID');
  requireValidIdentifier(userId, 'User ID');

  const booking = db.getEquipmentBooking(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  const resource = db.getResource(booking.resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  // Only resource owner can mark as active (confirms pickup)
  if (resource.ownerId !== userId) {
    throw new Error('Only resource owner can confirm pickup');
  }

  if (booking.status !== 'confirmed' && booking.status !== 'pending') {
    throw new Error(`Cannot activate booking with status: ${booking.status}`);
  }

  try {
    // Update booking
    await db.updateEquipmentBooking(bookingId, {
      status: 'active',
    });

    // Mark resource as unavailable while in use
    await db.updateResource(booking.resourceId, {
      available: false,
    });
  } catch (error) {
    console.error(`Failed to mark booking ${bookingId} as active:`, error);
    throw new Error(`Could not activate booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mark booking as completed (item returned)
 */
export async function completeBooking(
  bookingId: string,
  userId: string,
  returnCondition?: {
    condition?: 'excellent' | 'good' | 'fair' | 'needs-repair';
    notes?: string;
  }
): Promise<void> {
  requireValidIdentifier(bookingId, 'Booking ID');
  requireValidIdentifier(userId, 'User ID');

  const booking = db.getEquipmentBooking(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  const resource = db.getResource(booking.resourceId);
  if (!resource) {
    throw new Error('Resource not found');
  }

  // Only resource owner can mark as completed (confirms return)
  if (resource.ownerId !== userId) {
    throw new Error('Only resource owner can confirm return');
  }

  if (booking.status !== 'active') {
    throw new Error(`Cannot complete booking with status: ${booking.status}`);
  }

  try {
    // Update booking
    await db.updateEquipmentBooking(bookingId, {
      status: 'completed',
    });

    // Mark resource as available again
    await db.updateResource(booking.resourceId, {
      available: true,
    });

    // Update tool condition if provided
    if (returnCondition?.condition && resource.toolLibrary) {
      await db.updateResource(booking.resourceId, {
        toolLibrary: {
          ...resource.toolLibrary,
          condition: returnCondition.condition,
        },
      });
    }

    // Record return event
    const returnNote = returnCondition?.notes
      ? `Returned: ${resource.name} - Condition: ${returnCondition.condition || 'not specified'} - ${sanitizeUserContent(returnCondition.notes)}`
      : `Returned: ${resource.name}`;

    await db.recordEvent({
      action: 'return',
      providerId: booking.userId,
      receiverId: resource.ownerId,
      resourceId: booking.resourceId,
      note: returnNote,
    });
  } catch (error) {
    console.error(`Failed to complete booking ${bookingId}:`, error);
    throw new Error(`Could not complete booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get availability calendar for a resource
 * REQ-SHARE-012: Resource Availability Calendars
 */
export function getResourceAvailability(
  resourceId: string,
  startDate: number,
  endDate: number,
  slotDuration: number = 24 * 60 * 60 * 1000 // Default: 1 day in milliseconds
): TimeSlotAvailability[] {
  if (!validateIdentifier(resourceId)) {
    return [];
  }

  const slots: TimeSlotAvailability[] = [];
  const bookings = getBookingsForResource(resourceId);

  // Generate time slots
  let currentSlotStart = startDate;
  while (currentSlotStart < endDate) {
    const currentSlotEnd = Math.min(currentSlotStart + slotDuration, endDate);

    // Find overlapping bookings for this slot
    const overlappingBookings = bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      return b.startTime < currentSlotEnd && b.endTime > currentSlotStart;
    });

    slots.push({
      startTime: currentSlotStart,
      endTime: currentSlotEnd,
      available: overlappingBookings.length === 0,
      bookings: overlappingBookings,
    });

    currentSlotStart = currentSlotEnd;
  }

  return slots;
}

/**
 * Find optimal booking times for multiple resources
 * REQ-SHARE-012: Resource Availability Calendars
 */
export function findOptimalBookingTimes(
  resourceIds: string[],
  duration: number, // in milliseconds
  startSearchDate: number,
  endSearchDate: number
): Array<{
  startTime: number;
  endTime: number;
  availableResources: string[];
}> {
  const results: Array<{
    startTime: number;
    endTime: number;
    availableResources: string[];
  }> = [];

  // Check each day in the range
  const oneDayMs = 24 * 60 * 60 * 1000;
  let currentDay = startSearchDate;

  while (currentDay < endSearchDate) {
    const slotEnd = currentDay + duration;
    if (slotEnd > endSearchDate) break;

    // Check which resources are available in this slot
    const availableResources: string[] = [];

    for (const resourceId of resourceIds) {
      const conflicts = checkBookingConflicts(resourceId, currentDay, slotEnd);
      if (conflicts.length === 0) {
        availableResources.push(resourceId);
      }
    }

    if (availableResources.length > 0) {
      results.push({
        startTime: currentDay,
        endTime: slotEnd,
        availableResources,
      });
    }

    currentDay += oneDayMs;
  }

  return results;
}

/**
 * Get upcoming bookings (next 7 days)
 */
export function getUpcomingBookings(userId: string): EquipmentBooking[] {
  const now = Date.now();
  const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);

  return getBookingsByUser(userId)
    .filter(b =>
      b.status !== 'cancelled' &&
      b.status !== 'completed' &&
      b.startTime >= now &&
      b.startTime <= sevenDaysFromNow
    );
}

/**
 * Get active bookings (currently in use)
 */
export function getActiveBookings(userId: string): EquipmentBooking[] {
  return getBookingsByUser(userId)
    .filter(b => b.status === 'active');
}

/**
 * Get past bookings (completed or cancelled)
 */
export function getPastBookings(userId: string): EquipmentBooking[] {
  return getBookingsByUser(userId)
    .filter(b =>
      b.status === 'completed' ||
      b.status === 'cancelled' ||
      (b.endTime < Date.now() && b.status !== 'active')
    );
}

/**
 * Check if a user has overdue returns
 */
export function getOverdueBookings(userId: string): EquipmentBooking[] {
  const now = Date.now();
  return getBookingsByUser(userId)
    .filter(b =>
      b.status === 'active' &&
      b.endTime < now
    );
}
