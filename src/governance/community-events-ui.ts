/**
 * Community Events UI - User interface components for event listing and management
 *
 * REQ-GOV-019: Community Bulletin Board
 * Provides terminal-based UI for viewing, creating, and managing community events
 *
 * Following solarpunk values:
 * - Accessible terminal interface
 * - Clear, joyful presentation
 * - Offline-first design
 */

import type { CommunityEvent, CommunityEventType, EventRSVPStatus } from '../types';
import { CommunityEventsManager } from './community-events';
import { escapeHtml, sanitizeUserContent } from '../utils/sanitize';

/**
 * Render a single event card for display
 */
export function renderEventCard(event: CommunityEvent, manager: CommunityEventsManager): string {
  const rsvpCounts = manager.getRsvpCounts(event.id);
  const eventTypeName = manager.getEventTypeName(event.eventType);
  const timeString = manager.formatEventTime(event);
  const isNow = manager.isEventHappeningNow(event);

  const statusBadge = isNow ? ' [HAPPENING NOW]' : '';
  const capacityInfo = event.maxAttendees
    ? ` (${rsvpCounts.going}/${event.maxAttendees})`
    : ` (${rsvpCounts.going} going)`;

  let card = `
================================================================================
${escapeHtml(event.title)}${statusBadge}
--------------------------------------------------------------------------------
Type: ${eventTypeName}
When: ${timeString}`;

  if (event.location) {
    if (event.location.isVirtual) {
      card += `\nWhere: Online`;
      if (event.location.virtualLink) {
        card += ` - ${escapeHtml(event.location.virtualLink)}`;
      }
    } else {
      card += `\nWhere: ${escapeHtml(event.location.name)}`;
      if (event.location.address) {
        card += ` (${escapeHtml(event.location.address)})`;
      }
    }
  }

  card += `\n\n${escapeHtml(event.description)}`;

  if (event.accessibilityInfo) {
    card += `\n\nAccessibility: ${escapeHtml(event.accessibilityInfo)}`;
  }

  if (event.bringItems && event.bringItems.length > 0) {
    card += `\n\nBring if you can: ${event.bringItems.map(i => escapeHtml(i)).join(', ')}`;
  }

  if (event.needsVolunteers && event.volunteerRoles && event.volunteerRoles.length > 0) {
    card += `\n\nVolunteers needed for: ${event.volunteerRoles.map(r => escapeHtml(r)).join(', ')}`;
  }

  if (event.coordinationNotes) {
    card += `\n\nNotes: ${escapeHtml(event.coordinationNotes)}`;
  }

  card += `\n
RSVPs:${capacityInfo}
  Going: ${rsvpCounts.going} | Maybe: ${rsvpCounts.maybe} | Not Going: ${rsvpCounts.notGoing}
================================================================================
`;

  return card;
}

/**
 * Render a compact event list item
 */
export function renderEventListItem(event: CommunityEvent, manager: CommunityEventsManager): string {
  const eventTypeName = manager.getEventTypeName(event.eventType);
  const timeString = manager.formatEventTime(event);
  const rsvpCounts = manager.getRsvpCounts(event.id);
  const isNow = manager.isEventHappeningNow(event);

  const nowIndicator = isNow ? ' ** NOW **' : '';
  const location = event.location?.name || (event.location?.isVirtual ? 'Online' : 'TBD');

  return `[${eventTypeName}] ${escapeHtml(event.title)}${nowIndicator}
   ${timeString} @ ${escapeHtml(location)}
   ${rsvpCounts.going} going, ${rsvpCounts.maybe} maybe
`;
}

/**
 * Render a list of upcoming events
 */
export function renderUpcomingEvents(manager: CommunityEventsManager): string {
  const events = manager.getUpcomingEvents();

  if (events.length === 0) {
    return `
================================================================================
                          UPCOMING COMMUNITY EVENTS
================================================================================

No upcoming events scheduled.

Why not organize something? Potlucks, work days, skill shares, and celebrations
bring our community together. Every gathering strengthens our bonds!

================================================================================
`;
  }

  let output = `
================================================================================
                          UPCOMING COMMUNITY EVENTS
================================================================================
`;

  events.forEach((event, index) => {
    output += `\n${index + 1}. ${renderEventListItem(event, manager)}`;
  });

  output += `
================================================================================
`;

  return output;
}

/**
 * Render today's events
 */
export function renderTodaysEvents(manager: CommunityEventsManager): string {
  const events = manager.getTodaysEvents();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (events.length === 0) {
    return `
================================================================================
                          TODAY'S EVENTS - ${today}
================================================================================

No events scheduled for today.

================================================================================
`;
  }

  let output = `
================================================================================
                          TODAY'S EVENTS - ${today}
================================================================================
`;

  events.forEach((event, index) => {
    output += `\n${index + 1}. ${renderEventListItem(event, manager)}`;
  });

  output += `
================================================================================
`;

  return output;
}

/**
 * Render events calendar view for a week
 */
export function renderWeekView(manager: CommunityEventsManager): string {
  const events = manager.getThisWeeksEvents();
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let output = `
================================================================================
                          THIS WEEK'S EVENTS
================================================================================
`;

  // Group events by day
  const eventsByDay: Map<string, CommunityEvent[]> = new Map();

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dayKey = day.toDateString();
    eventsByDay.set(dayKey, []);
  }

  events.forEach(event => {
    const eventDay = new Date(event.startTime).toDateString();
    const dayEvents = eventsByDay.get(eventDay);
    if (dayEvents) {
      dayEvents.push(event);
    }
  });

  eventsByDay.forEach((dayEvents, dayKey) => {
    const dayDate = new Date(dayKey);
    const isToday = dayDate.toDateString() === now.toDateString();
    const dayName = dayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    output += `\n${isToday ? '>>> ' : '    '}${dayName}${isToday ? ' (TODAY)' : ''}\n`;

    if (dayEvents.length === 0) {
      output += '        No events\n';
    } else {
      dayEvents.forEach(event => {
        const time = new Date(event.startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        const rsvpCounts = manager.getRsvpCounts(event.id);
        output += `        ${time} - ${escapeHtml(event.title)} (${rsvpCounts.going} going)\n`;
      });
    }
  });

  output += `
================================================================================
`;

  return output;
}

/**
 * Render event details with full information
 */
export function renderEventDetails(event: CommunityEvent, manager: CommunityEventsManager): string {
  const card = renderEventCard(event, manager);

  // Add items being brought
  const itemsBrought = manager.getItemsBeingBrought(event.id);

  let output = card;

  if (itemsBrought.length > 0) {
    output += `\nItems being brought:\n`;
    itemsBrought.forEach(({ items }) => {
      output += `  - ${items.map(i => escapeHtml(i)).join(', ')}\n`;
    });
  }

  // Add comments
  if (event.comments && event.comments.length > 0) {
    output += `\nDiscussion (${event.comments.length} comments):\n`;
    output += '--------------------------------------------------------------------------------\n';
    event.comments.forEach(comment => {
      const time = new Date(comment.createdAt).toLocaleString();
      output += `[${time}] ${escapeHtml(comment.text)}\n\n`;
    });
  }

  return output;
}

/**
 * Render RSVP form / options
 */
export function renderRsvpOptions(event: CommunityEvent, userId: string, manager: CommunityEventsManager): string {
  const currentRsvp = event.rsvps.find(r => r.userId === userId);
  const remaining = manager.getRemainingCapacity(event.id);
  const canRsvp = manager.canUserRsvp(event.id, userId);

  let output = `
--------------------------------------------------------------------------------
                                   RSVP
--------------------------------------------------------------------------------
`;

  if (currentRsvp) {
    output += `Your current RSVP: ${currentRsvp.status.toUpperCase()}\n`;
    if (currentRsvp.note) {
      output += `Your note: ${escapeHtml(currentRsvp.note)}\n`;
    }
    if (currentRsvp.bringingItems && currentRsvp.bringingItems.length > 0) {
      output += `Bringing: ${currentRsvp.bringingItems.map(i => escapeHtml(i)).join(', ')}\n`;
    }
    output += '\n';
  }

  if (!canRsvp && !currentRsvp) {
    output += `This event is at capacity. You can still mark "Maybe" or "Not Going".\n`;
  }

  if (remaining !== null) {
    output += `Spots remaining: ${remaining}\n`;
  }

  output += `
Options:
  [1] Going
  [2] Maybe
  [3] Not Going

`;

  return output;
}

/**
 * Render event creation form template
 */
export function renderEventCreationForm(): string {
  return `
================================================================================
                          CREATE A NEW EVENT
================================================================================

Event Types:
  [1] Potluck - Community meals and food sharing
  [2] Work Day - Garden work, maintenance, cleanup
  [3] Workshop - Learning events and skill shares
  [4] Meeting - Community decision-making and planning
  [5] Celebration - Birthdays, harvests, holidays
  [6] Social - Casual gatherings and games
  [7] Mutual Aid - Collective support events
  [8] Other

Required Information:
  - Title: What's this event called?
  - Description: What will happen at this event?
  - Date & Time: When does it start?
  - Location: Where will it be held? (Or is it virtual?)

Optional Information:
  - End Time: When does it end?
  - Max Attendees: Is there a capacity limit?
  - Items to Bring: What should people bring?
  - Volunteer Roles: What help do you need?
  - Accessibility Info: How is this event accessible?
  - Coordination Notes: Any other details?

================================================================================
`;
}

/**
 * Render events organized by a user
 */
export function renderMyOrganizedEvents(userId: string, manager: CommunityEventsManager): string {
  const events = manager.getUserOrganizedEvents(userId);

  if (events.length === 0) {
    return `
================================================================================
                          EVENTS YOU'RE ORGANIZING
================================================================================

You haven't organized any events yet.

Organizing an event is a wonderful way to bring the community together!
Consider hosting a potluck, skill share, or work day.

================================================================================
`;
  }

  let output = `
================================================================================
                          EVENTS YOU'RE ORGANIZING
================================================================================
`;

  const drafts = events.filter(e => e.status === 'draft');
  const published = events.filter(e => e.status === 'published');
  const completed = events.filter(e => e.status === 'completed');
  const cancelled = events.filter(e => e.status === 'cancelled');

  if (drafts.length > 0) {
    output += '\nDRAFTS (not yet published):\n';
    drafts.forEach((event, index) => {
      output += `  ${index + 1}. ${escapeHtml(event.title)}\n`;
    });
  }

  if (published.length > 0) {
    output += '\nPUBLISHED:\n';
    published.forEach((event, index) => {
      const rsvpCounts = manager.getRsvpCounts(event.id);
      output += `  ${index + 1}. ${renderEventListItem(event, manager)}`;
    });
  }

  if (completed.length > 0) {
    output += '\nCOMPLETED:\n';
    completed.forEach((event, index) => {
      output += `  ${index + 1}. ${escapeHtml(event.title)}\n`;
    });
  }

  if (cancelled.length > 0) {
    output += '\nCANCELLED:\n';
    cancelled.forEach((event, index) => {
      output += `  ${index + 1}. ${escapeHtml(event.title)}\n`;
    });
  }

  output += `
================================================================================
`;

  return output;
}

/**
 * Render events user is attending
 */
export function renderMyAttendingEvents(userId: string, manager: CommunityEventsManager): string {
  const events = manager.getUserAttendingEvents(userId);

  if (events.length === 0) {
    return `
================================================================================
                          EVENTS YOU'RE ATTENDING
================================================================================

You haven't RSVP'd to any events yet.

Check out the upcoming events and find something that interests you!

================================================================================
`;
  }

  let output = `
================================================================================
                          EVENTS YOU'RE ATTENDING
================================================================================
`;

  events.forEach((event, index) => {
    output += `\n${index + 1}. ${renderEventListItem(event, manager)}`;
  });

  output += `
================================================================================
`;

  return output;
}

/**
 * Render events by type
 */
export function renderEventsByType(eventType: CommunityEventType, manager: CommunityEventsManager): string {
  const events = manager.getEventsByType(eventType);
  const typeName = manager.getEventTypeName(eventType);

  if (events.length === 0) {
    return `
================================================================================
                          ${typeName.toUpperCase()} EVENTS
================================================================================

No ${typeName.toLowerCase()} events scheduled.

================================================================================
`;
  }

  let output = `
================================================================================
                          ${typeName.toUpperCase()} EVENTS
================================================================================
`;

  events.forEach((event, index) => {
    output += `\n${index + 1}. ${renderEventListItem(event, manager)}`;
  });

  output += `
================================================================================
`;

  return output;
}

/**
 * Render search results
 */
export function renderSearchResults(query: string, manager: CommunityEventsManager): string {
  const events = manager.searchEvents(query);

  if (events.length === 0) {
    return `
================================================================================
                          SEARCH RESULTS
================================================================================

No events found matching "${escapeHtml(query)}".

Try different keywords or browse upcoming events.

================================================================================
`;
  }

  let output = `
================================================================================
                          SEARCH RESULTS
================================================================================
Found ${events.length} event(s) matching "${escapeHtml(query)}":
`;

  events.forEach((event, index) => {
    output += `\n${index + 1}. ${renderEventListItem(event, manager)}`;
  });

  output += `
================================================================================
`;

  return output;
}

/**
 * Render community group events
 */
export function renderGroupEvents(groupId: string, groupName: string, manager: CommunityEventsManager): string {
  const events = manager.getGroupEvents(groupId);

  if (events.length === 0) {
    return `
================================================================================
                          ${escapeHtml(groupName).toUpperCase()} EVENTS
================================================================================

No events scheduled for this group.

================================================================================
`;
  }

  let output = `
================================================================================
                          ${escapeHtml(groupName).toUpperCase()} EVENTS
================================================================================
`;

  events.forEach((event, index) => {
    output += `\n${index + 1}. ${renderEventListItem(event, manager)}`;
  });

  output += `
================================================================================
`;

  return output;
}
