/**
 * Care Circles Usage Examples
 *
 * This file demonstrates how to use the Care Circles feature
 * for coordinating ongoing community support.
 */

import {
  createCareCircle,
  addCareCircleMember,
  addCareNeed,
  updateCareNeed,
  logCareActivity,
  getCareCircle,
  getCareCirclesForRecipient,
  getCareCirclesForMember,
  getCareActivities,
  getUnmetNeeds,
  suggestCareDistribution,
  deactivateCareCircle,
} from './care-circles';

/**
 * Example 1: Creating a care circle for an elderly community member
 */
export async function example1_ElderlySupport() {
  console.log('📝 Example 1: Care circle for elderly community member\n');

  // Maria is an elderly community member who lives alone
  const mariaUserId = 'user-maria-123';

  // Create a care circle for Maria
  const circle = await createCareCircle(mariaUserId, {
    name: 'Support Circle for Maria',
    description: 'Daily check-ins and assistance for Maria, who lives alone',
    privacyLevel: 'community-visible',
    autoScheduling: true,
  });

  console.log('✅ Care circle created:', circle.name);
  console.log('   Circle ID:', circle.id);

  // Add care circle members
  await addCareCircleMember(circle.id, 'user-john-456', {
    role: 'Daily morning check-in',
    skills: ['conversation', 'emotional support'],
    availability: {
      daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
      timesOfDay: ['morning'],
    },
  });

  await addCareCircleMember(circle.id, 'user-sarah-789', {
    role: 'Grocery helper',
    skills: ['shopping', 'transportation'],
    availability: {
      daysOfWeek: [6], // Saturday
      timesOfDay: ['morning', 'afternoon'],
    },
  });

  await addCareCircleMember(circle.id, 'user-alex-101', {
    role: 'Medical companion',
    skills: ['medical appointments', 'transportation', 'note-taking'],
    availability: {
      daysOfWeek: [1, 3], // Monday, Wednesday
      timesOfDay: ['morning', 'afternoon'],
    },
  });

  console.log('✅ Added 3 members to the circle\n');

  // Define care needs
  const checkInNeedId = await addCareNeed(circle.id, {
    type: 'daily check-in',
    description: 'Morning phone call to ensure Maria is doing well',
    frequency: 'daily',
    isMet: false,
  });

  const groceryNeedId = await addCareNeed(circle.id, {
    type: 'groceries',
    description: 'Weekly grocery shopping and delivery',
    frequency: 'weekly',
    preferredTimes: ['Saturday morning'],
    isMet: false,
  });

  await addCareNeed(circle.id, {
    type: 'transportation',
    description: 'Doctor appointments and errands',
    frequency: 'as-needed',
    isMet: false,
  });

  console.log('✅ Added 3 care needs\n');

  // Get suggested distribution
  const distribution = await suggestCareDistribution(circle.id);
  console.log('📊 Suggested care distribution:');
  distribution.forEach((needs, memberId) => {
    console.log(`   ${memberId}: ${needs.length} needs assigned`);
  });

  console.log('\n');
}

/**
 * Example 2: Logging care activities
 */
export async function example2_LoggingActivities() {
  console.log('📝 Example 2: Logging care activities\n');

  // Assume circle exists
  const circleId = 'circle-example-123';
  const mariaUserId = 'user-maria-123';
  const johnUserId = 'user-john-456';

  // John completes a daily check-in
  await logCareActivity({
    circleId,
    activityType: 'check-in',
    performedBy: johnUserId,
    forRecipient: mariaUserId,
    description: 'Called Maria at 9 AM. She slept well and is in good spirits today.',
    completedAt: Date.now(),
  });

  console.log('✅ Logged check-in activity');

  // Sarah completes grocery shopping
  await logCareActivity({
    circleId,
    activityType: 'assistance',
    performedBy: 'user-sarah-789',
    forRecipient: mariaUserId,
    description: 'Picked up groceries from the co-op and delivered to Maria',
    completedAt: Date.now(),
    notes: 'Maria mentioned she needs more fresh vegetables next week',
  });

  console.log('✅ Logged grocery assistance');

  // View recent activities
  const activities = await getCareActivities(circleId, 10);
  console.log(`\n📅 Recent activities (${activities.length} total):`);
  activities.forEach(activity => {
    console.log(`   - ${activity.activityType}: ${activity.description}`);
  });

  console.log('\n');
}

/**
 * Example 3: Managing care needs
 */
export async function example3_ManagingNeeds() {
  console.log('📝 Example 3: Managing care needs\n');

  const circleId = 'circle-example-123';

  // Get unmet needs
  const unmetNeeds = await getUnmetNeeds(circleId);
  console.log(`📋 Unmet needs: ${unmetNeeds.length}`);

  unmetNeeds.forEach(need => {
    console.log(`   - ${need.type}: ${need.description}`);
  });

  // Mark a need as met
  if (unmetNeeds.length > 0) {
    const firstNeed = unmetNeeds[0];
    await updateCareNeed(circleId, firstNeed.id, {
      isMet: true,
      assignedTo: ['user-john-456'],
    });

    console.log(`\n✅ Marked "${firstNeed.type}" as met`);
  }

  console.log('\n');
}

/**
 * Example 4: Viewing care circles as a member
 */
export async function example4_MemberView() {
  console.log('📝 Example 4: Viewing care circles as a member\n');

  const sarahUserId = 'user-sarah-789';

  // Get all circles where Sarah is a member
  const circles = await getCareCirclesForMember(sarahUserId);

  console.log(`👥 Sarah is a member of ${circles.length} care circle(s):`);

  for (const circle of circles) {
    console.log(`\n   Circle: ${circle.name || 'Unnamed Circle'}`);
    console.log(`   Recipient: ${circle.recipientId}`);
    console.log(`   Members: ${circle.members.length}`);

    // Find Sarah's role
    const sarahMember = circle.members.find(m => m.userId === sarahUserId);
    if (sarahMember && sarahMember.role) {
      console.log(`   Your role: ${sarahMember.role}`);
    }

    // Show unmet needs
    const unmetNeeds = circle.needs.filter(n => !n.isMet);
    console.log(`   Unmet needs: ${unmetNeeds.length}`);
  }

  console.log('\n');
}

/**
 * Example 5: Recovery journey with gradual independence
 */
export async function example5_RecoveryJourney() {
  console.log('📝 Example 5: Recovery journey with gradual independence\n');

  // Jamie is recovering from surgery and needs temporary support
  const jamieUserId = 'user-jamie-202';

  // Week 1: Create intensive support circle
  const circle = await createCareCircle(jamieUserId, {
    name: 'Recovery Support for Jamie',
    description: 'Post-surgery recovery care',
    privacyLevel: 'private',
  });

  console.log('Week 1: Created recovery circle');

  // Add initial needs (high frequency)
  await addCareNeed(circle.id, {
    type: 'daily check-in',
    description: 'Twice-daily check-ins',
    frequency: 'daily',
    isMet: false,
  });

  await addCareNeed(circle.id, {
    type: 'meal support',
    description: 'Meal delivery',
    frequency: 'daily',
    isMet: false,
  });

  console.log('Added intensive care needs\n');

  // Week 3: Jamie is improving, reduce frequency
  console.log('Week 3: Adjusting care needs as Jamie improves');

  const updatedCircle = await getCareCircle(circle.id);
  if (updatedCircle) {
    // Update check-in frequency
    const checkInNeed = updatedCircle.needs.find(n => n.type === 'daily check-in');
    if (checkInNeed) {
      await updateCareNeed(circle.id, checkInNeed.id, {
        frequency: 'weekly',
        description: 'Weekly check-in (recovering well!)',
      });
    }

    // Meal support no longer needed
    const mealNeed = updatedCircle.needs.find(n => n.type === 'meal support');
    if (mealNeed) {
      await updateCareNeed(circle.id, mealNeed.id, {
        isMet: true,
      });
    }
  }

  console.log('Reduced check-in frequency');
  console.log('Marked meal support as met\n');

  // Week 6: Full recovery, deactivate circle
  console.log('Week 6: Jamie has fully recovered!');
  await deactivateCareCircle(circle.id);
  console.log('✅ Care circle deactivated (but history preserved)');
  console.log('🎉 Celebrating recovery milestone!\n');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await example1_ElderlySupport();
    await example2_LoggingActivities();
    await example3_ManagingNeeds();
    await example4_MemberView();
    await example5_RecoveryJourney();

    console.log('✨ All examples completed successfully!\n');
    console.log('🌻 Care circles enable dignified, community-centered mutual aid.');
    console.log('✊ Liberation through interdependence, not independence.\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Uncomment to run examples:
// runAllExamples();
