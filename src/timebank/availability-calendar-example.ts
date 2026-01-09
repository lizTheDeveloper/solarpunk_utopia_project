/**
 * Example: Availability Calendar Usage
 * REQ-TIME-016: Communication and Confirmation
 *
 * Demonstrates how users can set their availability for offering
 * time and skills in the gift economy time bank.
 */

import {
  createAvailability,
  updateAvailability,
  getUserActiveAvailability,
  queryAvailability,
  isUserAvailable,
  formatAvailabilityForDisplay,
} from './availability-calendar';

/**
 * Example 1: User sets one-time availability
 * Sarah is free this Saturday morning to help with gardening
 */
async function example1_OneTimeAvailability() {
  const nextSaturday = getNextSaturday();

  const availability = await createAvailability({
    userId: 'sarah-123',
    skillOfferId: 'skill-gardening',
    date: nextSaturday,
    timeRanges: [
      { startTime: '09:00', endTime: '12:00' },
    ],
    location: {
      type: 'your-place',
      details: 'Can travel within 5km',
    },
    preferredActivityTypes: ['gardening', 'composting'],
    notes: 'Bringing my own tools!',
  });

  console.log('Created one-time availability:');
  console.log(formatAvailabilityForDisplay(availability));
}

/**
 * Example 2: User sets recurring weekly availability
 * Marcus offers tutoring every Tuesday and Thursday evening
 */
async function example2_RecurringAvailability() {
  const availability = await createAvailability({
    userId: 'marcus-456',
    skillOfferId: 'skill-math-tutoring',
    recurrence: {
      type: 'weekly',
      daysOfWeek: [2, 4], // Tuesday and Thursday
      endDate: Date.now() + 90 * 24 * 60 * 60 * 1000, // Next 3 months
    },
    timeRanges: [
      { startTime: '18:00', endTime: '20:00' },
    ],
    location: {
      type: 'virtual',
      details: 'Video call',
    },
    preferredActivityTypes: ['tutoring'],
    maxBookings: 2, // Can tutor 2 students at once
    notes: 'Best for middle school and high school math',
  });

  console.log('Created recurring availability:');
  console.log(formatAvailabilityForDisplay(availability));
}

/**
 * Example 3: User sets flexible multi-day availability
 * Lee is available all week for repairs
 */
async function example3_DateRangeAvailability() {
  const today = Date.now();
  const oneWeekLater = today + 7 * 24 * 60 * 60 * 1000;

  const availability = await createAvailability({
    userId: 'lee-789',
    skillOfferId: 'skill-bike-repair',
    dateRange: {
      start: today,
      end: oneWeekLater,
    },
    timeRanges: [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '17:00' },
    ],
    location: {
      type: 'flexible',
      details: 'Your place or mine, or at the community bike shop',
    },
    preferredActivityTypes: ['repairs', 'maintenance'],
    notes: 'On vacation this week, happy to help!',
  });

  console.log('Created flexible date range availability:');
  console.log(formatAvailabilityForDisplay(availability));
}

/**
 * Example 4: Coordinator searches for available helpers
 * Community organizer needs help for Saturday workday
 */
async function example4_SearchAvailability() {
  const nextSaturday = getNextSaturday();
  const startOfDay = new Date(nextSaturday);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(nextSaturday);
  endOfDay.setHours(23, 59, 59, 999);

  // Find everyone available Saturday
  const availableSlots = queryAvailability({
    startDate: startOfDay.getTime(),
    endDate: endOfDay.getTime(),
  });

  console.log(`\nFound ${availableSlots.length} people available this Saturday:`);
  availableSlots.forEach(slot => {
    console.log(formatAvailabilityForDisplay(slot));
  });

  // Find people available for gardening specifically
  const gardenHelpers = queryAvailability({
    startDate: startOfDay.getTime(),
    endDate: endOfDay.getTime(),
    activityType: 'gardening',
  });

  console.log(`\n${gardenHelpers.length} available for gardening work`);
}

/**
 * Example 5: Check if specific user is available at a time
 * Before scheduling, check if Sarah is free Saturday 10am
 */
async function example5_CheckUserAvailability() {
  const nextSaturday = getNextSaturday();

  const isAvailable = isUserAvailable(
    'sarah-123',
    nextSaturday,
    { startTime: '10:00', endTime: '11:00' }
  );

  console.log(`\nIs Sarah available Saturday at 10am? ${isAvailable ? 'Yes!' : 'No'}`);
}

/**
 * Example 6: User updates their availability
 * Marcus realizes he can't make Thursday this week
 */
async function example6_UpdateAvailability() {
  // Get Marcus's recurring availability
  const availability = getUserActiveAvailability('marcus-456');
  const recurringSlot = availability.find(slot => slot.recurrence);

  if (recurringSlot) {
    // Update to remove Thursday (only Tuesday now)
    await updateAvailability(recurringSlot.id, {
      recurrence: {
        type: 'weekly',
        daysOfWeek: [2], // Only Tuesday
        endDate: recurringSlot.recurrence?.endDate,
      },
    });

    console.log('\nUpdated availability - removed Thursday');
  }
}

/**
 * Example 7: User sets care circle availability
 * Jamie is available for their care circle member
 */
async function example7_CareCircleAvailability() {
  const availability = await createAvailability({
    userId: 'jamie-999',
    recurrence: {
      type: 'daily', // Available every day
    },
    timeRanges: [
      { startTime: '08:00', endTime: '09:00' }, // Morning check-in
      { startTime: '18:00', endTime: '19:00' }, // Evening check-in
    ],
    location: {
      type: 'your-place',
    },
    preferredActivityTypes: ['check-in', 'companionship'],
    visibility: 'care-circle', // Only visible to care circle members
    notes: 'Daily check-ins for my neighbor',
  });

  console.log('\nCreated care circle availability:');
  console.log(formatAvailabilityForDisplay(availability));
}

// Helper function to get next Saturday
function getNextSaturday(): number {
  const today = new Date();
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  nextSaturday.setHours(9, 0, 0, 0);
  return nextSaturday.getTime();
}

// Run examples
async function runExamples() {
  console.log('=== Availability Calendar Examples ===\n');

  await example1_OneTimeAvailability();
  await example2_RecurringAvailability();
  await example3_DateRangeAvailability();
  await example4_SearchAvailability();
  await example5_CheckUserAvailability();
  await example6_UpdateAvailability();
  await example7_CareCircleAvailability();

  console.log('\n=== End of Examples ===');
}

// Export for testing or demo purposes
export { runExamples };
