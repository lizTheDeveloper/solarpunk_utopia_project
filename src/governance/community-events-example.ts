/**
 * Community Events Example
 *
 * REQ-GOV-019: Community Bulletin Board - Community events listing
 *
 * This example demonstrates how to use the Community Events feature
 * to create, list, RSVP to, and manage community events.
 */

import { LocalDatabase } from '../core/database';
import { CommunityEventsManager } from './community-events';
import {
  renderUpcomingEvents,
  renderTodaysEvents,
  renderWeekView,
  renderEventDetails,
  renderEventCard,
  renderRsvpOptions,
  renderEventCreationForm,
  renderMyOrganizedEvents,
  renderMyAttendingEvents,
  renderEventsByType,
  renderSearchResults,
} from './community-events-ui';

/**
 * Example: Creating and managing community events
 */
async function communityEventsExample(): Promise<void> {
  // Initialize database
  const db = new LocalDatabase('community-events-example');
  await db.init();

  // Create events manager
  const eventsManager = new CommunityEventsManager(db);

  console.log('=== Community Events Example ===\n');

  // Example user IDs
  const organizer1 = 'user-maya';
  const organizer2 = 'user-sam';
  const attendee1 = 'user-alex';
  const attendee2 = 'user-jordan';
  const attendee3 = 'user-riley';

  // ===== Creating Events =====
  console.log('--- Creating Events ---\n');

  // Create a potluck event
  const potluck = await eventsManager.createEvent({
    title: 'Monthly Community Potluck',
    description: 'Join us for our monthly potluck dinner! Bring a dish to share and your appetite. This is a great opportunity to meet neighbors and share food together.',
    eventType: 'potluck',
    startTime: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
    endTime: Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000, // 3 hours long
    location: {
      name: 'Community Center',
      address: '123 Solidarity Street',
    },
    bringItems: ['A dish to share (feeds 4-6)', 'Your own plate and utensils (zero waste!)'],
    accessibilityInfo: 'Wheelchair accessible. ASL interpreter available upon request.',
    visibility: 'public',
  }, { organizerId: organizer1, publishImmediately: true });

  console.log(`Created potluck: "${potluck.title}"`);

  // Create a garden work day
  const workday = await eventsManager.createEvent({
    title: 'Spring Garden Prep Day',
    description: 'Help us prepare the community garden for spring planting! We will be turning soil, building new raised beds, and setting up the irrigation system.',
    eventType: 'workday',
    startTime: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
    endTime: Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000, // 4 hours
    location: {
      name: 'Community Garden',
      address: '456 Green Lane',
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    },
    needsVolunteers: true,
    volunteerRoles: ['Soil turning (bring a shovel)', 'Bed construction (carpentry skills helpful)', 'Irrigation setup', 'Snack providers'],
    bringItems: ['Gardening gloves', 'Sunscreen', 'Water bottle'],
    maxAttendees: 30,
    coordinationNotes: 'Tools provided, but bring your own if you have them. Wear clothes that can get dirty!',
    visibility: 'community',
  }, { organizerId: organizer2, publishImmediately: true });

  console.log(`Created work day: "${workday.title}"`);

  // Create a skill share workshop
  const workshop = await eventsManager.createEvent({
    title: 'Fermentation Workshop: Sauerkraut & Kimchi',
    description: 'Learn to make your own fermented vegetables! We will cover basic fermentation science, food safety, and hands-on kraut-making. Take home a jar to ferment!',
    eventType: 'workshop',
    startTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week from now
    endTime: Date.now() + 7 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000, // 2.5 hours
    location: {
      name: 'Maya\'s Kitchen',
      address: '789 Mutual Aid Ave',
    },
    maxAttendees: 12,
    bringItems: ['A quart-size mason jar', 'Apron'],
    accessibilityInfo: 'Limited mobility access - contact organizer to discuss accommodations',
    visibility: 'community',
  }, { organizerId: organizer1, publishImmediately: true });

  console.log(`Created workshop: "${workshop.title}"`);

  // Create a virtual meeting
  const meeting = await eventsManager.createEvent({
    title: 'Community Budget Planning Meeting',
    description: 'Quarterly meeting to discuss community fund allocation. All members encouraged to attend and participate in consensus decision-making.',
    eventType: 'meeting',
    startTime: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days from now
    endTime: Date.now() + 10 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000, // 1.5 hours
    location: {
      name: 'Community Center + Online',
      isVirtual: true,
      virtualLink: 'https://meet.jit.si/SolarpunkCommunity',
      address: '123 Solidarity Street (hybrid)',
    },
    visibility: 'community',
  }, { organizerId: organizer2, publishImmediately: true });

  console.log(`Created meeting: "${meeting.title}"`);

  // Create a draft event (not published yet)
  const draftEvent = await eventsManager.createEvent({
    title: 'Summer Solstice Celebration',
    description: 'A celebration of the longest day of the year! Details TBD.',
    eventType: 'celebration',
    startTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    isAllDay: true,
    visibility: 'public',
  }, { organizerId: organizer1, publishImmediately: false });

  console.log(`Created draft event: "${draftEvent.title}" (not yet published)`);

  // ===== RSVPing to Events =====
  console.log('\n--- RSVPing to Events ---\n');

  // RSVP to potluck
  await eventsManager.rsvpToEvent(potluck.id, attendee1, 'going', {
    note: 'I\'ll bring my famous veggie lasagna!',
    bringingItems: ['Veggie lasagna'],
  });
  console.log('Alex RSVPd going to potluck');

  await eventsManager.rsvpToEvent(potluck.id, attendee2, 'going', {
    bringingItems: ['Garden salad', 'Homemade bread'],
  });
  console.log('Jordan RSVPd going to potluck');

  await eventsManager.rsvpToEvent(potluck.id, attendee3, 'maybe', {
    note: 'Depends on my work schedule',
  });
  console.log('Riley RSVPd maybe to potluck');

  // RSVP to work day
  await eventsManager.rsvpToEvent(workday.id, attendee1, 'going', {
    note: 'I have carpentry experience!',
  });
  await eventsManager.rsvpToEvent(workday.id, attendee2, 'going');
  console.log('Alex and Jordan RSVPd going to work day');

  // RSVP to workshop
  await eventsManager.rsvpToEvent(workshop.id, attendee3, 'going', {
    note: 'So excited to learn fermentation!',
  });
  console.log('Riley RSVPd going to workshop');

  // ===== Adding Comments =====
  console.log('\n--- Adding Comments ---\n');

  await eventsManager.addComment(potluck.id, attendee1, 'Can\'t wait! Should we coordinate who brings what type of dish?');
  await eventsManager.addComment(potluck.id, organizer1, 'Great idea! Let\'s use the RSVP notes to say what you\'re bringing.');
  await eventsManager.addComment(potluck.id, attendee2, 'I updated my RSVP with what I\'m bringing!');
  console.log('Added comments to potluck event');

  // ===== Displaying Events =====
  console.log('\n--- Displaying Events ---\n');

  // Show upcoming events
  console.log(renderUpcomingEvents(eventsManager));

  // Show week view
  console.log(renderWeekView(eventsManager));

  // Show single event details
  const potluckEvent = eventsManager.getEvent(potluck.id);
  if (potluckEvent) {
    console.log('\n--- Event Details ---');
    console.log(renderEventDetails(potluckEvent, eventsManager));
  }

  // Show RSVP options for a user
  if (potluckEvent) {
    console.log('\n--- RSVP Options for New User ---');
    console.log(renderRsvpOptions(potluckEvent, 'new-user', eventsManager));
  }

  // ===== User-Specific Views =====
  console.log('\n--- User Views ---\n');

  // Events Maya is organizing
  console.log(renderMyOrganizedEvents(organizer1, eventsManager));

  // Events Alex is attending
  console.log(renderMyAttendingEvents(attendee1, eventsManager));

  // ===== Filtering Events =====
  console.log('\n--- Filtering Events ---\n');

  // Events by type
  console.log(renderEventsByType('workshop', eventsManager));

  // Search events
  console.log(renderSearchResults('garden', eventsManager));

  // ===== Event Management =====
  console.log('\n--- Event Management ---\n');

  // Publish the draft event
  await eventsManager.publishEvent(draftEvent.id, organizer1);
  console.log(`Published: "${draftEvent.title}"`);

  // Update an event
  await eventsManager.updateEvent(potluck.id, {
    coordinationNotes: 'UPDATE: We now have enough main dishes! Please bring desserts or sides if you can.',
  }, organizer1);
  console.log('Updated potluck coordination notes');

  // ===== Utility Functions =====
  console.log('\n--- Utility Functions ---\n');

  // Get RSVP counts
  const counts = eventsManager.getRsvpCounts(potluck.id);
  console.log(`Potluck RSVPs - Going: ${counts.going}, Maybe: ${counts.maybe}, Not Going: ${counts.notGoing}`);

  // Get items being brought
  const items = eventsManager.getItemsBeingBrought(potluck.id);
  console.log('Items being brought to potluck:');
  items.forEach(({ items }) => {
    console.log(`  - ${items.join(', ')}`);
  });

  // Check remaining capacity
  const remaining = eventsManager.getRemainingCapacity(workshop.id);
  console.log(`\nWorkshop spots remaining: ${remaining}`);

  // Show event creation form template
  console.log('\n--- Event Creation Form ---');
  console.log(renderEventCreationForm());

  // Cleanup
  await db.close();

  console.log('\n=== Example Complete ===');
  console.log('The community events feature supports:');
  console.log('  - Creating events with full details (location, time, accessibility, etc.)');
  console.log('  - RSVPing with notes and items to bring');
  console.log('  - Comments and discussion on events');
  console.log('  - Various views: upcoming, today, week, by type, search');
  console.log('  - Event lifecycle: draft, publish, cancel, complete');
  console.log('  - Capacity limits and volunteer coordination');
}

// Run example if this file is executed directly
communityEventsExample().catch(console.error);
