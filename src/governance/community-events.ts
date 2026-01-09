/**
 * Community Events - Event listing and coordination
 *
 * REQ-GOV-019: Community Bulletin Board
 * Implements community event creation, listing, RSVPs, and coordination
 *
 * Following solarpunk values:
 * - No tracking or surveillance
 * - Offline-first
 * - Privacy-preserving
 * - Accessibility-first design
 * - Community gathering and celebration
 */

import type { CommunityEvent, CommunityEventType, CommunityEventRSVP, EventRSVPStatus, CommunityEventComment } from '../types';
import { LocalDatabase } from '../core/database';
import { sanitizeUserContent } from '../utils/sanitize';

export interface EventInput {
  title: string;
  description: string;
  eventType: CommunityEventType;
  startTime: number;
  endTime?: number;
  isAllDay?: boolean;
  location?: {
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    isVirtual?: boolean;
    virtualLink?: string;
  };
  communityGroupId?: string;
  maxAttendees?: number;
  bringItems?: string[];
  needsVolunteers?: boolean;
  volunteerRoles?: string[];
  coordinationNotes?: string;
  accessibilityInfo?: string;
  visibility?: 'public' | 'community' | 'private';
}

export interface EventCreateOptions {
  organizerId: string;
  publishImmediately?: boolean;
}

/**
 * Community Events Manager
 *
 * Provides functionality for creating, listing, and coordinating
 * community events. Supports RSVPs, comments, and volunteer coordination
 * in the spirit of mutual aid and community gathering.
 */
export class CommunityEventsManager {
  constructor(private db: LocalDatabase) {}

  /**
   * Create a new community event
   *
   * REQ-GOV-019: Community Bulletin Board
   * "When a member wants to organize a potluck"
   */
  async createEvent(input: EventInput, options: EventCreateOptions): Promise<CommunityEvent> {
    // Validate required fields
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Event title is required');
    }
    if (!input.description || input.description.trim().length === 0) {
      throw new Error('Event description is required');
    }
    if (!input.startTime || input.startTime <= 0) {
      throw new Error('Event start time is required');
    }

    // Sanitize text inputs
    const sanitizedTitle = sanitizeUserContent(input.title);
    const sanitizedDescription = sanitizeUserContent(input.description);
    const sanitizedCoordinationNotes = input.coordinationNotes
      ? sanitizeUserContent(input.coordinationNotes)
      : undefined;
    const sanitizedAccessibilityInfo = input.accessibilityInfo
      ? sanitizeUserContent(input.accessibilityInfo)
      : undefined;

    // Sanitize location if provided
    const sanitizedLocation = input.location ? {
      ...input.location,
      name: sanitizeUserContent(input.location.name),
      address: input.location.address ? sanitizeUserContent(input.location.address) : undefined,
    } : undefined;

    // Sanitize bring items and volunteer roles
    const sanitizedBringItems = input.bringItems?.map(item => sanitizeUserContent(item));
    const sanitizedVolunteerRoles = input.volunteerRoles?.map(role => sanitizeUserContent(role));

    const event = await this.db.addCommunityEvent({
      title: sanitizedTitle,
      description: sanitizedDescription,
      eventType: input.eventType,
      startTime: input.startTime,
      endTime: input.endTime,
      isAllDay: input.isAllDay,
      location: sanitizedLocation,
      organizerId: options.organizerId,
      communityGroupId: input.communityGroupId,
      maxAttendees: input.maxAttendees,
      bringItems: sanitizedBringItems,
      needsVolunteers: input.needsVolunteers,
      volunteerRoles: sanitizedVolunteerRoles,
      coordinationNotes: sanitizedCoordinationNotes,
      accessibilityInfo: sanitizedAccessibilityInfo,
      visibility: input.visibility || 'community',
      status: options.publishImmediately ? 'published' : 'draft',
      rsvps: [],
      comments: [],
    });

    return event;
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<EventInput>,
    userId: string
  ): Promise<void> {
    const event = this.db.getCommunityEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Only organizer can update
    if (event.organizerId !== userId) {
      throw new Error('Only the organizer can update this event');
    }

    // Sanitize any text updates
    const sanitizedUpdates: Partial<CommunityEvent> = {};

    if (updates.title !== undefined) {
      sanitizedUpdates.title = sanitizeUserContent(updates.title);
    }
    if (updates.description !== undefined) {
      sanitizedUpdates.description = sanitizeUserContent(updates.description);
    }
    if (updates.coordinationNotes !== undefined) {
      sanitizedUpdates.coordinationNotes = sanitizeUserContent(updates.coordinationNotes);
    }
    if (updates.accessibilityInfo !== undefined) {
      sanitizedUpdates.accessibilityInfo = sanitizeUserContent(updates.accessibilityInfo);
    }
    if (updates.location !== undefined) {
      sanitizedUpdates.location = {
        ...updates.location,
        name: sanitizeUserContent(updates.location.name),
        address: updates.location.address ? sanitizeUserContent(updates.location.address) : undefined,
      };
    }
    if (updates.bringItems !== undefined) {
      sanitizedUpdates.bringItems = updates.bringItems.map(item => sanitizeUserContent(item));
    }
    if (updates.volunteerRoles !== undefined) {
      sanitizedUpdates.volunteerRoles = updates.volunteerRoles.map(role => sanitizeUserContent(role));
    }

    // Copy over non-text fields directly
    if (updates.eventType !== undefined) sanitizedUpdates.eventType = updates.eventType;
    if (updates.startTime !== undefined) sanitizedUpdates.startTime = updates.startTime;
    if (updates.endTime !== undefined) sanitizedUpdates.endTime = updates.endTime;
    if (updates.isAllDay !== undefined) sanitizedUpdates.isAllDay = updates.isAllDay;
    if (updates.maxAttendees !== undefined) sanitizedUpdates.maxAttendees = updates.maxAttendees;
    if (updates.needsVolunteers !== undefined) sanitizedUpdates.needsVolunteers = updates.needsVolunteers;
    if (updates.visibility !== undefined) sanitizedUpdates.visibility = updates.visibility;

    await this.db.updateCommunityEvent(eventId, sanitizedUpdates);
  }

  /**
   * Publish a draft event
   */
  async publishEvent(eventId: string, userId: string): Promise<void> {
    const event = this.db.getCommunityEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (event.organizerId !== userId) {
      throw new Error('Only the organizer can publish this event');
    }
    if (event.status !== 'draft') {
      throw new Error('Only draft events can be published');
    }

    await this.db.updateCommunityEvent(eventId, { status: 'published' });
  }

  /**
   * Cancel an event
   */
  async cancelEvent(eventId: string, userId: string): Promise<void> {
    const event = this.db.getCommunityEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (event.organizerId !== userId) {
      throw new Error('Only the organizer can cancel this event');
    }

    await this.db.updateCommunityEvent(eventId, { status: 'cancelled' });
  }

  /**
   * Mark an event as completed
   */
  async completeEvent(eventId: string, userId: string): Promise<void> {
    const event = this.db.getCommunityEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (event.organizerId !== userId) {
      throw new Error('Only the organizer can complete this event');
    }

    await this.db.updateCommunityEvent(eventId, { status: 'completed' });
  }

  /**
   * Delete an event (only drafts)
   */
  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const event = this.db.getCommunityEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (event.organizerId !== userId) {
      throw new Error('Only the organizer can delete this event');
    }
    if (event.status !== 'draft') {
      throw new Error('Only draft events can be deleted. Cancel the event instead.');
    }

    await this.db.deleteCommunityEvent(eventId);
  }

  // ===== RSVP Operations =====

  /**
   * RSVP to an event
   *
   * REQ-GOV-019: Enable RSVPs and coordination
   */
  async rsvpToEvent(
    eventId: string,
    userId: string,
    status: EventRSVPStatus,
    options?: { note?: string; bringingItems?: string[] }
  ): Promise<void> {
    const event = this.db.getCommunityEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (event.status !== 'published') {
      throw new Error('Cannot RSVP to an unpublished event');
    }

    // Check capacity for "going" RSVPs
    if (status === 'going' && event.maxAttendees) {
      const currentGoing = event.rsvps.filter(r => r.status === 'going').length;
      const isAlreadyGoing = event.rsvps.some(r => r.userId === userId && r.status === 'going');
      if (!isAlreadyGoing && currentGoing >= event.maxAttendees) {
        throw new Error('Event has reached maximum capacity');
      }
    }

    const rsvp: CommunityEventRSVP = {
      userId,
      status,
      note: options?.note ? sanitizeUserContent(options.note) : undefined,
      bringingItems: options?.bringingItems?.map(item => sanitizeUserContent(item)),
      respondedAt: Date.now(),
    };

    await this.db.updateEventRsvp(eventId, rsvp);
  }

  /**
   * Get RSVP counts for an event
   */
  getRsvpCounts(eventId: string): { going: number; maybe: number; notGoing: number } {
    const event = this.db.getCommunityEvent(eventId);
    if (!event) {
      return { going: 0, maybe: 0, notGoing: 0 };
    }

    return {
      going: event.rsvps.filter(r => r.status === 'going').length,
      maybe: event.rsvps.filter(r => r.status === 'maybe').length,
      notGoing: event.rsvps.filter(r => r.status === 'not-going').length,
    };
  }

  /**
   * Get items being brought to an event
   */
  getItemsBeingBrought(eventId: string): { userId: string; items: string[] }[] {
    const event = this.db.getCommunityEvent(eventId);
    if (!event) {
      return [];
    }

    return event.rsvps
      .filter(r => r.bringingItems && r.bringingItems.length > 0)
      .map(r => ({ userId: r.userId, items: r.bringingItems! }));
  }

  // ===== Comment Operations =====

  /**
   * Add a comment to an event
   *
   * REQ-GOV-019: Support comment threads
   */
  async addComment(
    eventId: string,
    userId: string,
    text: string
  ): Promise<CommunityEventComment> {
    if (!text || text.trim().length === 0) {
      throw new Error('Comment text is required');
    }

    const sanitizedText = sanitizeUserContent(text);
    return await this.db.addEventComment(eventId, userId, sanitizedText);
  }

  // ===== Query Operations =====

  /**
   * Get an event by ID
   */
  getEvent(eventId: string): CommunityEvent | undefined {
    return this.db.getCommunityEvent(eventId);
  }

  /**
   * Get all events
   */
  getAllEvents(): CommunityEvent[] {
    return this.db.listCommunityEvents();
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(): CommunityEvent[] {
    return this.db.getUpcomingEvents();
  }

  /**
   * Get today's events
   */
  getTodaysEvents(): CommunityEvent[] {
    return this.db.getTodaysEvents();
  }

  /**
   * Get events for this week
   */
  getThisWeeksEvents(): CommunityEvent[] {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    return this.db.getEventsInRange(weekStart, weekEnd);
  }

  /**
   * Get events for a specific month
   */
  getMonthEvents(year: number, month: number): CommunityEvent[] {
    const monthStart = new Date(year, month, 1).getTime();
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    return this.db.getEventsInRange(monthStart, monthEnd);
  }

  /**
   * Get events organized by a user
   */
  getUserOrganizedEvents(userId: string): CommunityEvent[] {
    return this.db.getUserOrganizedEvents(userId);
  }

  /**
   * Get events a user has RSVP'd "going" to
   */
  getUserAttendingEvents(userId: string): CommunityEvent[] {
    return this.db.getUserRsvpdEvents(userId);
  }

  /**
   * Get events for a community group
   */
  getGroupEvents(groupId: string): CommunityEvent[] {
    return this.db.getCommunityGroupEvents(groupId);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: CommunityEventType): CommunityEvent[] {
    return this.db.getEventsByType(eventType);
  }

  /**
   * Get public events
   */
  getPublicEvents(): CommunityEvent[] {
    return this.db.getPublicEvents();
  }

  /**
   * Search events by title or description
   */
  searchEvents(query: string): CommunityEvent[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return [];
    }

    return this.db.listCommunityEvents()
      .filter(e =>
        e.status === 'published' &&
        (e.title.toLowerCase().includes(normalizedQuery) ||
         e.description.toLowerCase().includes(normalizedQuery))
      )
      .sort((a, b) => a.startTime - b.startTime);
  }

  // ===== Utility Methods =====

  /**
   * Get human-readable event type name
   */
  getEventTypeName(eventType: CommunityEventType): string {
    const names: Record<CommunityEventType, string> = {
      'potluck': 'Potluck',
      'workday': 'Work Day',
      'workshop': 'Workshop',
      'meeting': 'Meeting',
      'celebration': 'Celebration',
      'social': 'Social Gathering',
      'mutual-aid': 'Mutual Aid',
      'other': 'Other',
    };
    return names[eventType];
  }

  /**
   * Format event time for display
   */
  formatEventTime(event: CommunityEvent): string {
    const startDate = new Date(event.startTime);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };

    if (event.isAllDay) {
      return startDate.toLocaleDateString(undefined, options) + ' (All Day)';
    }

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
    };

    let result = startDate.toLocaleDateString(undefined, options) +
                 ' at ' + startDate.toLocaleTimeString(undefined, timeOptions);

    if (event.endTime) {
      const endDate = new Date(event.endTime);
      // If same day, just show end time
      if (startDate.toDateString() === endDate.toDateString()) {
        result += ' - ' + endDate.toLocaleTimeString(undefined, timeOptions);
      } else {
        result += ' - ' + endDate.toLocaleDateString(undefined, options) +
                  ' at ' + endDate.toLocaleTimeString(undefined, timeOptions);
      }
    }

    return result;
  }

  /**
   * Check if an event is happening now
   */
  isEventHappeningNow(event: CommunityEvent): boolean {
    const now = Date.now();
    const endTime = event.endTime || (event.startTime + 2 * 60 * 60 * 1000); // Default 2 hours
    return now >= event.startTime && now <= endTime;
  }

  /**
   * Check if user can RSVP (event is published and not full)
   */
  canUserRsvp(eventId: string, userId: string): boolean {
    const event = this.db.getCommunityEvent(eventId);
    if (!event || event.status !== 'published') {
      return false;
    }

    // Check if already RSVPd as going
    const currentRsvp = event.rsvps.find(r => r.userId === userId);
    if (currentRsvp?.status === 'going') {
      return true; // Can always change existing RSVP
    }

    // Check capacity
    if (event.maxAttendees) {
      const currentGoing = event.rsvps.filter(r => r.status === 'going').length;
      return currentGoing < event.maxAttendees;
    }

    return true;
  }

  /**
   * Get remaining capacity for an event
   */
  getRemainingCapacity(eventId: string): number | null {
    const event = this.db.getCommunityEvent(eventId);
    if (!event || !event.maxAttendees) {
      return null; // No limit
    }

    const currentGoing = event.rsvps.filter(r => r.status === 'going').length;
    return Math.max(0, event.maxAttendees - currentGoing);
  }
}
