/**
 * Example usage of Schedule Help Sessions
 * REQ-TIME-016: Communication and Confirmation
 *
 * This example demonstrates:
 * - Scheduling a tutoring session between volunteer and recipient
 * - Both parties confirming the session
 * - Sending reminders (in a real app)
 * - Completing with feedback and gratitude
 */

import {
  scheduleHelpSession,
  confirmHelpSession,
  rescheduleHelpSession,
  completeHelpSession,
  expressGratitude,
  getUpcomingHelpSessions,
  formatHelpSessionForDisplay,
} from './schedule-help-sessions';

async function example() {
  console.log('🌻 Schedule Help Sessions Example - Gift Economy Time Banking\n');

  // ===== Scenario: Math Tutoring Session =====
  console.log('📚 Scenario: Scheduling a Math Tutoring Session\n');

  // 1. Schedule the session
  const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

  const session = await scheduleHelpSession({
    volunteerId: 'user-maria',
    recipientId: 'user-alex',
    skillOfferId: 'skill-math-tutoring',
    title: 'Algebra Tutoring',
    description: 'Help with quadratic equations and graphing',
    scheduledDate: tomorrow,
    scheduledTime: {
      startTime: '15:00',
      endTime: '16:00',
    },
    estimatedDuration: 60,
    location: {
      type: 'virtual',
      details: 'Zoom: https://zoom.us/j/example',
    },
    notes: 'Please have homework ready. Bring calculator.',
  });

  console.log('✅ Session scheduled:');
  console.log(formatHelpSessionForDisplay(session));
  console.log();

  // 2. Maria (volunteer) confirms
  console.log('👩‍🏫 Maria confirms she can tutor...');
  await confirmHelpSession(session.id, 'user-maria');
  console.log('✅ Volunteer confirmed\n');

  // 3. Alex (recipient) confirms
  console.log('🧑‍🎓 Alex confirms they can attend...');
  await confirmHelpSession(session.id, 'user-alex');
  console.log('✅ Recipient confirmed\n');
  console.log('🎉 Session fully confirmed! Both parties notified.\n');

  // 4. View upcoming sessions
  console.log('📅 Maria\'s upcoming help sessions:');
  const mariaSessions = getUpcomingHelpSessions('user-maria');
  mariaSessions.forEach(s => {
    console.log(formatHelpSessionForDisplay(s));
  });
  console.log();

  // 5. After the session - Maria adds feedback
  console.log('💬 After the session, Maria shares feedback...');
  await completeHelpSession(
    session.id,
    'user-maria',
    'Great session! Alex is a quick learner. We covered quadratic equations thoroughly.'
  );
  console.log('✅ Volunteer feedback recorded\n');

  // 6. Alex adds their feedback
  console.log('💬 Alex shares their experience...');
  await completeHelpSession(
    session.id,
    'user-alex',
    'Maria explained everything so clearly! I finally understand quadratics. 🙏'
  );
  console.log('✅ Recipient feedback recorded\n');

  // 7. Alex expresses gratitude (gift economy!)
  console.log('🙏 Alex expresses gratitude...');
  await expressGratitude(session.id, 'user-alex');
  console.log('✨ Gratitude expressed! This strengthens community bonds.\n');

  // ===== Scenario: Rescheduling =====
  console.log('\n🔄 Scenario: Rescheduling a Session\n');

  const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const guitarSession = await scheduleHelpSession({
    volunteerId: 'user-jordan',
    recipientId: 'user-sam',
    title: 'Guitar Lesson',
    description: 'Beginner chords and strumming patterns',
    scheduledDate: nextWeek,
    scheduledTime: {
      startTime: '18:00',
      endTime: '19:00',
    },
    location: {
      type: 'volunteer-place',
      details: '123 Harmony St, Apt 4B',
    },
  });

  console.log('🎸 Original guitar lesson scheduled:');
  console.log(formatHelpSessionForDisplay(guitarSession));
  console.log();

  console.log('⚠️ Jordan needs to reschedule...');
  const newDate = Date.now() + 8 * 24 * 60 * 60 * 1000;
  const rescheduled = await rescheduleHelpSession(
    guitarSession.id,
    newDate,
    { startTime: '17:00', endTime: '18:00' },
    'Moved to Saturday instead, one hour earlier'
  );

  console.log('✅ Session rescheduled:');
  console.log(formatHelpSessionForDisplay(rescheduled));
  console.log();

  // ===== Gift Economy Values =====
  console.log('\n🌻 Gift Economy Values in Action:\n');
  console.log('✊ No hour-for-hour tracking - just helping each other');
  console.log('🎁 No debt or obligation - voluntary giving');
  console.log('💝 Gratitude strengthens bonds - not ratings or reviews');
  console.log('🤝 Trust builds through repeated positive interactions');
  console.log('🌟 Community vitality through mutual support\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('This is how we build the new world in the shell of the old! ✨');
  console.log('═══════════════════════════════════════════════════\n');
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error);
}

export { example };
