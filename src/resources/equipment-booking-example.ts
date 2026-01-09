/**
 * Equipment Booking System - Usage Examples
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-012: Resource Availability Calendars
 *
 * Demonstrates how to use the equipment booking system
 */

import { db } from '../core/database';
import { addToolToLibrary } from './tool-library';
import {
  createBooking,
  updateBooking,
  cancelBooking,
  markBookingActive,
  completeBooking,
  getResourceAvailability,
  findOptimalBookingTimes,
  getUpcomingBookings,
  getBookingsForMyResources,
} from './equipment-booking';
import {
  renderAvailabilityCalendar,
  renderBookingForm,
  renderMyBookingsDashboard,
  renderOwnerBookingsDashboard,
} from './equipment-booking-ui';

/**
 * Example: Community member books a tool
 */
export async function exampleBookTool() {
  console.log('=== Example: Booking a Tool ===\n');

  // Initialize database
  await db.init();

  // Alice adds a power drill to the tool library
  console.log('1. Alice adds her power drill to the community tool library');
  const drill = await addToolToLibrary('alice', {
    name: 'DeWalt Cordless Drill',
    description: '20V MAX cordless drill with battery and charger',
    category: 'power-tools',
    condition: 'excellent',
    maxBorrowDays: 3,
    safetyNotes: 'Wear safety glasses when drilling',
    location: '123 Oak Street',
  });
  console.log(`   ✓ Added: ${drill.name} (${drill.id})\n`);

  // Bob wants to borrow the drill
  console.log('2. Bob wants to borrow the drill to build shelves');
  const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
  const twoDaysFromNow = tomorrow + (24 * 60 * 60 * 1000);

  const booking = await createBooking('bob', drill.id, tomorrow, twoDaysFromNow, {
    purpose: 'Building shelves in garage',
    pickupLocation: "Alice's place",
    notes: 'Will pick up around 9am',
  });

  if (booking.success) {
    console.log(`   ✓ Booking created: ${booking.booking?.id}`);
    console.log(`   Status: ${booking.booking?.status}`);
    console.log(`   Purpose: ${booking.booking?.purpose}\n`);
  }

  // View Bob's upcoming bookings
  console.log('3. Bob checks his upcoming bookings');
  const bobsUpcoming = getUpcomingBookings('bob');
  console.log(`   Bob has ${bobsUpcoming.length} upcoming booking(s)\n`);

  // Alice sees booking requests for her tools
  console.log('4. Alice checks booking requests for her tools');
  const aliceBookings = getBookingsForMyResources('alice');
  console.log(`   Alice has ${aliceBookings.length} booking request(s)`);
  aliceBookings.forEach(b => {
    const resource = b.resource;
    console.log(`   - ${resource?.name}: ${b.booking.status} by ${b.booking.userId}`);
  });
  console.log();

  // Pickup day arrives - Alice marks it as picked up
  console.log('5. Pickup day arrives - Alice confirms Bob picked up the drill');
  const activeResult = await markBookingActive(booking.booking!.id, 'alice');
  if (activeResult.success) {
    console.log('   ✓ Drill marked as picked up\n');
  }

  // Bob returns the drill
  console.log('6. Bob returns the drill in good condition');
  const completeResult = await completeBooking(booking.booking!.id, 'alice', {
    condition: 'excellent',
    notes: 'Tool returned in perfect condition',
  });
  if (completeResult.success) {
    console.log('   ✓ Drill returned and booking completed\n');
  }

  console.log('=== Example Complete ===\n');
}

/**
 * Example: Viewing availability calendar
 */
export async function exampleViewAvailability() {
  console.log('=== Example: Viewing Availability Calendar ===\n');

  await db.init();

  // Add a tool
  const chainsaw = await addToolToLibrary('user-1', {
    name: 'Gas Chainsaw',
    description: 'Professional grade chainsaw',
    category: 'power-tools',
    condition: 'good',
    requiresTraining: true,
    safetyNotes: 'Must have chainsaw safety certification',
  });

  console.log(`1. Added tool: ${chainsaw.name}\n`);

  // Create some bookings
  const today = Date.now();
  const threeDaysFromNow = today + (3 * 24 * 60 * 60 * 1000);
  const fiveDaysFromNow = today + (5 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = today + (7 * 24 * 60 * 60 * 1000);
  const tenDaysFromNow = today + (10 * 24 * 60 * 60 * 1000);

  await createBooking('user-2', chainsaw.id, threeDaysFromNow, fiveDaysFromNow);
  await createBooking('user-3', chainsaw.id, sevenDaysFromNow, tenDaysFromNow);

  console.log('2. Created bookings for days 3-5 and 7-10\n');

  // Check availability for next 14 days
  console.log('3. Checking availability for next 14 days:');
  const fourteenDaysFromNow = today + (14 * 24 * 60 * 60 * 1000);
  const availability = getResourceAvailability(chainsaw.id, today, fourteenDaysFromNow);

  availability.forEach((slot, index) => {
    const date = new Date(slot.startTime).toLocaleDateString();
    const status = slot.available ? '✓ Available' : '○ Booked';
    console.log(`   Day ${index + 1} (${date}): ${status}`);
  });

  console.log('\n=== Example Complete ===\n');
}

/**
 * Example: Finding optimal booking times for multiple tools
 */
export async function exampleFindOptimalTimes() {
  console.log('=== Example: Finding Optimal Booking Times ===\n');

  await db.init();

  // Add multiple similar tools
  console.log('1. Community has 3 power drills available');
  const drill1 = await addToolToLibrary('alice', {
    name: 'Drill 1',
    description: 'Alice\'s drill',
    category: 'power-tools',
    condition: 'good',
  });

  const drill2 = await addToolToLibrary('bob', {
    name: 'Drill 2',
    description: 'Bob\'s drill',
    category: 'power-tools',
    condition: 'good',
  });

  const drill3 = await addToolToLibrary('carol', {
    name: 'Drill 3',
    description: 'Carol\'s drill',
    category: 'power-tools',
    condition: 'excellent',
  });

  // Book some of them
  const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
  const threeDaysFromNow = tomorrow + (2 * 24 * 60 * 60 * 1000);
  const fiveDaysFromNow = tomorrow + (4 * 24 * 60 * 60 * 1000);

  await createBooking('user-1', drill1.id, tomorrow, threeDaysFromNow);
  await createBooking('user-2', drill2.id, threeDaysFromNow, fiveDaysFromNow);

  console.log('2. Some drills are already booked\n');

  // Find optimal times
  console.log('3. Finding times when at least one drill is available:');
  const sevenDaysFromNow = tomorrow + (6 * 24 * 60 * 60 * 1000);
  const duration = 2 * 24 * 60 * 60 * 1000; // 2 days

  const optimalTimes = findOptimalBookingTimes(
    [drill1.id, drill2.id, drill3.id],
    duration,
    tomorrow,
    sevenDaysFromNow
  );

  optimalTimes.forEach((slot, index) => {
    const startDate = new Date(slot.startTime).toLocaleDateString();
    const endDate = new Date(slot.endTime).toLocaleDateString();
    console.log(`   Option ${index + 1}: ${startDate} to ${endDate}`);
    console.log(`   Available tools: ${slot.availableResources.length}`);
  });

  console.log('\n=== Example Complete ===\n');
}

/**
 * Example: Handling booking conflicts
 */
export async function exampleHandleConflicts() {
  console.log('=== Example: Handling Booking Conflicts ===\n');

  await db.init();

  const tool = await addToolToLibrary('owner', {
    name: 'Expensive Equipment',
    description: 'Only one available in community',
    category: 'equipment',
    condition: 'excellent',
  });

  console.log(`1. Added tool: ${tool.name}\n`);

  // User 1 books it
  const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
  const fiveDaysFromNow = tomorrow + (4 * 24 * 60 * 60 * 1000);

  const booking1 = await createBooking('user-1', tool.id, tomorrow, fiveDaysFromNow);
  console.log('2. User 1 successfully booked days 1-5');
  console.log(`   Booking ID: ${booking1.booking?.id}\n`);

  // User 2 tries to book overlapping dates
  const threeDaysFromNow = tomorrow + (2 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = tomorrow + (6 * 24 * 60 * 60 * 1000);

  const booking2 = await createBooking('user-2', tool.id, threeDaysFromNow, sevenDaysFromNow);
  console.log('3. User 2 tries to book days 3-7 (overlaps with User 1)');

  if (!booking2.success) {
    console.log('   ✗ Booking failed due to conflict');
    console.log(`   Error: ${booking2.error}`);
    if (booking2.conflicts) {
      console.log(`   Conflicts found: ${booking2.conflicts.length}`);
      booking2.conflicts.forEach(c => {
        const start = new Date(c.overlapStart).toLocaleDateString();
        const end = new Date(c.overlapEnd).toLocaleDateString();
        console.log(`   - Overlap: ${start} to ${end}`);
      });
    }
  }

  // User 2 books after User 1's period
  console.log('\n4. User 2 books days 6-8 (no conflict)');
  const booking3 = await createBooking('user-2', tool.id, sevenDaysFromNow, sevenDaysFromNow + (2 * 24 * 60 * 60 * 1000));

  if (booking3.success) {
    console.log('   ✓ Booking successful');
    console.log(`   Booking ID: ${booking3.booking?.id}`);
  }

  console.log('\n=== Example Complete ===\n');
}

/**
 * Example: Rendering UI components
 */
export async function exampleRenderUI() {
  console.log('=== Example: Rendering UI Components ===\n');

  await db.init();

  // Add a tool
  const tool = await addToolToLibrary('alice', {
    name: 'Miter Saw',
    description: 'Compound miter saw for precise cuts',
    category: 'woodworking',
    condition: 'excellent',
  });

  // Create a booking
  const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
  const dayAfter = tomorrow + (24 * 60 * 60 * 1000);
  await createBooking('bob', tool.id, tomorrow, dayAfter, {
    purpose: 'Trim work for kitchen renovation',
  });

  console.log('1. Rendering availability calendar HTML:');
  const calendarHtml = renderAvailabilityCalendar(tool.id);
  console.log(`   Generated ${calendarHtml.length} characters of HTML\n`);

  console.log('2. Rendering booking form HTML:');
  const formHtml = renderBookingForm(tool.id);
  console.log(`   Generated ${formHtml.length} characters of HTML\n`);

  console.log('3. Rendering user bookings dashboard:');
  const dashboardHtml = renderMyBookingsDashboard('bob');
  console.log(`   Generated ${dashboardHtml.length} characters of HTML\n`);

  console.log('4. Rendering owner bookings dashboard:');
  const ownerHtml = renderOwnerBookingsDashboard('alice');
  console.log(`   Generated ${ownerHtml.length} characters of HTML\n`);

  console.log('=== Example Complete ===\n');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  await exampleBookTool();
  await exampleViewAvailability();
  await exampleFindOptimalTimes();
  await exampleHandleConflicts();
  await exampleRenderUI();
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
