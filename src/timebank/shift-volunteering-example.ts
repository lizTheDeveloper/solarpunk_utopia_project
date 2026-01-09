/**
 * Example usage of Shift Volunteering
 * REQ-TIME-017: Group Coordination
 * REQ-TIME-005: Collective Time Projects
 *
 * This example demonstrates how to:
 * - Create volunteer shifts for community events
 * - Set up recurring shifts for ongoing needs
 * - Sign up volunteers and manage roles
 * - Track impact (not debt!) in gift economy style
 */

import { db } from '../core/database';
import {
  createVolunteerShift,
  signUpForShift,
  cancelShiftSignup,
  completeShift,
  createRecurringShift,
  browseOpenShifts,
  getMyShifts,
  getUpcomingShifts,
  formatShiftForDisplay,
  formatRecurringShiftForDisplay,
} from './shift-volunteering';
import type { RecurrencePattern, TimeRange } from '../types';

async function main() {
  // Initialize database
  await db.init();
  await db.reset();

  console.log('🌻 Shift Volunteering - Collective Action Examples\n');

  // ===== Example 1: One-Time Community Event Shift =====
  console.log('Example 1: Community Garden Workday\n');

  const nextSaturday = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const morningTime: TimeRange = { startTime: '09:00', endTime: '12:00' };

  const gardenShift = await createVolunteerShift({
    organizerId: 'maria-gardener',
    title: 'Spring Garden Workday 🌱',
    description: 'Help us prepare the community garden for spring planting! We\'ll be building new raised beds, spreading compost, and planning this season\'s crops together.',
    category: 'gardening',
    shiftDate: nextSaturday,
    shiftTime: morningTime,
    estimatedDuration: 180,
    location: {
      name: 'Main Street Community Garden',
      address: '123 Main St',
      coordinates: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
    },
    volunteersNeeded: 12,
    whatToBring: [
      'Work gloves',
      'Water bottle',
      'Sun hat',
      'Garden tools if you have them (we have extras!)',
    ],
    preparationNotes: 'Wear clothes that can get dirty. We provide gloves if needed. All skill levels welcome!',
    accessibilityInfo: 'Wheelchair accessible paths throughout the garden. Raised beds at comfortable height. Shaded seating available.',
  });

  console.log(formatShiftForDisplay(gardenShift));
  console.log('\n---\n');

  // Volunteers sign up
  await signUpForShift(gardenShift.id, 'alex-newcomer');
  await signUpForShift(gardenShift.id, 'jordan-experienced');
  await signUpForShift(gardenShift.id, 'casey-wheelchair-user');

  console.log('✅ 3 volunteers signed up!\n');

  // ===== Example 2: Role-Based Volunteering =====
  console.log('Example 2: Food Bank Distribution (Role-Based)\n');

  const afternoonTime: TimeRange = { startTime: '14:00', endTime: '18:00' };

  const foodBankShift = await createVolunteerShift({
    organizerId: 'sam-organizer',
    title: 'Weekly Food Distribution',
    description: 'Help distribute food to families in our community. We serve 80-100 families each week.',
    category: 'food-distribution',
    shiftDate: nextSaturday,
    shiftTime: afternoonTime,
    estimatedDuration: 240,
    location: {
      name: 'Community Food Bank',
      address: '456 Oak Street',
    },
    volunteersNeeded: 15,
    roles: [
      {
        name: 'Greeter',
        description: 'Welcome families, help with sign-in, answer questions',
        volunteersNeeded: 2,
      },
      {
        name: 'Food Packer',
        description: 'Pack food boxes according to family size',
        volunteersNeeded: 8,
      },
      {
        name: 'Car Loader',
        description: 'Help load food into families\' cars',
        volunteersNeeded: 4,
      },
      {
        name: 'Setup/Cleanup Crew',
        description: 'Set up before and clean up after distribution',
        volunteersNeeded: 2,
      },
    ],
    whatToBring: ['Comfortable closed-toe shoes', 'Reusable water bottle'],
    preparationNotes: 'We\'ll do a brief orientation at 1:45pm for new volunteers.',
    accessibilityInfo: 'Loading dock has ramp access. Heavy lifting is optional - plenty of roles that don\'t require it.',
    skillsNeeded: ['Friendly attitude', 'Willingness to help'],
  });

  console.log(formatShiftForDisplay(foodBankShift));
  console.log('\n---\n');

  // Sign up for specific roles
  await signUpForShift(foodBankShift.id, 'quinn-greeter', 0); // Greeter role
  await signUpForShift(foodBankShift.id, 'riley-greeter', 0); // Greeter role
  await signUpForShift(foodBankShift.id, 'taylor-packer', 1); // Food Packer role
  await signUpForShift(foodBankShift.id, 'morgan-packer', 1); // Food Packer role
  await signUpForShift(foodBankShift.id, 'drew-loader', 2); // Car Loader role

  console.log('✅ 5 volunteers signed up for specific roles!\n');

  // ===== Example 3: Recurring Shift Pattern =====
  console.log('Example 3: Recurring Repair Cafe\n');

  const repairCafeTime: TimeRange = { startTime: '10:00', endTime: '14:00' };
  const weeklyRecurrence: RecurrencePattern = {
    type: 'weekly',
    daysOfWeek: [0], // Sunday
  };

  const repairCafePattern = await createRecurringShift({
    organizerId: 'pat-fix-it',
    title: 'Community Repair Cafe',
    description: 'Fix broken items, share repair skills, and keep things out of landfills. We repair electronics, appliances, clothing, bicycles, and more.',
    category: 'repair-cafe',
    location: {
      name: 'Community Center Main Hall',
      address: '789 Elm Street',
    },
    recurrence: weeklyRecurrence,
    shiftTime: repairCafeTime,
    estimatedDuration: 240,
    volunteersNeeded: 8,
    whatToBring: ['Your own tools if you have specialty tools', 'Broken items to fix!'],
    preparationNotes: 'Experienced fixers mentor newcomers. All skill levels welcome to learn.',
    accessibilityInfo: 'Fully accessible venue. Tables at various heights available.',
    skillsNeeded: [
      'Electronics repair (optional)',
      'Sewing/clothing repair (optional)',
      'Bicycle repair (optional)',
      'General fixing enthusiasm (required!)',
    ],
  });

  console.log(formatRecurringShiftForDisplay(repairCafePattern));
  console.log('\n---\n');

  // ===== Example 4: Browse and Filter Shifts =====
  console.log('Example 4: Browse Available Shifts\n');

  const openShifts = browseOpenShifts();
  console.log(`📋 Found ${openShifts.length} open volunteer shifts:\n`);

  openShifts.forEach((shift, index) => {
    const spotsLeft = shift.volunteersNeeded - shift.volunteersSignedUp.length;
    const date = new Date(shift.shiftDate).toLocaleDateString();
    console.log(`${index + 1}. ${shift.title} - ${date} (${spotsLeft} spots left)`);
  });

  console.log('\n');

  // Filter by category
  const gardeningShifts = browseOpenShifts({ category: 'gardening' });
  console.log(`🌱 Gardening shifts: ${gardeningShifts.length}\n`);

  // ===== Example 5: View My Shifts =====
  console.log('Example 5: My Volunteer Schedule\n');

  const alexShifts = getMyShifts('alex-newcomer');
  console.log(`Alex's upcoming shifts: ${alexShifts.length}`);
  alexShifts.forEach(shift => {
    const date = new Date(shift.shiftDate).toLocaleDateString();
    console.log(`  - ${shift.title} on ${date}`);
  });

  console.log('\n');

  // ===== Example 6: Complete Shift with Impact Tracking =====
  console.log('Example 6: Complete Shift (Gift Economy - Track Impact!)\n');

  // Simulate completing the garden shift
  await completeShift(
    gardenShift.id,
    'maria-gardener',
    'What an amazing crew! Everyone worked so hard and we had a great time together. Thank you all! 💚',
    'Built 6 new raised beds, spread 2 cubic yards of compost, planted 50 tomato seedlings, and welcomed 3 new gardeners to the community. The garden is ready for spring!'
  );

  const completedShift = db.getVolunteerShift(gardenShift.id);
  console.log('✨ Shift completed!\n');
  console.log('Impact (NOT debt - this is gift economy!):\n');
  console.log(completedShift?.impactDescription);
  console.log('\nOrganizer notes:\n');
  console.log(completedShift?.completionNotes);
  console.log('\n---\n');

  // ===== Example 7: Upcoming Shifts Calendar =====
  console.log('Example 7: Upcoming Shifts (Calendar View)\n');

  const upcoming = getUpcomingShifts();
  console.log(`📅 ${upcoming.length} upcoming shifts:\n`);

  upcoming.forEach(shift => {
    const date = new Date(shift.shiftDate).toLocaleDateString();
    const time = `${shift.shiftTime.startTime}-${shift.shiftTime.endTime}`;
    const spotsLeft = shift.volunteersNeeded - shift.volunteersSignedUp.length;
    const statusEmoji = shift.status === 'open' ? '🟢' : shift.status === 'filled' ? '✅' : '🔄';

    console.log(`${statusEmoji} ${date} ${time} - ${shift.title}`);
    console.log(`   ${shift.volunteersSignedUp.length}/${shift.volunteersNeeded} volunteers (${spotsLeft} spots left)`);
    console.log('');
  });

  // ===== Gift Economy Principles =====
  console.log('🌻 Gift Economy Principles:\n');
  console.log('✓ No hour tracking - just celebration of what we built together');
  console.log('✓ No reciprocity enforcement - give what you can, when you can');
  console.log('✓ Track impact and joy, not debt and obligation');
  console.log('✓ Roles coordinate action, not hierarchy');
  console.log('✓ Accessibility-first design welcomes everyone');
  console.log('✓ Collective action creates community resilience');
  console.log('\n🚀 Many hands make light work!\n');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
