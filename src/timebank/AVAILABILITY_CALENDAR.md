# Availability Calendar

**Phase 3, Group B: Scheduling & Coverage**
**REQ-TIME-016: Communication and Confirmation**

## Overview

The Availability Calendar enables community members to share when they're available to offer their time, skills, and support. This makes coordination easier by letting people see when helpers are available, reducing back-and-forth scheduling.

## Core Values

- **Gift Economy**: Availability is shared freely, not as a transaction
- **Flexible Coordination**: Respect boundaries while enabling connection
- **Offline-First**: Works without internet connection
- **Privacy-Preserving**: Users control who can see their availability

## Features

### 1. One-Time Availability
Set specific dates/times when you're available:
```typescript
const availability = await createAvailability({
  userId: 'sarah-123',
  date: nextSaturday,
  timeRanges: [
    { startTime: '09:00', endTime: '12:00' },
  ],
  location: { type: 'your-place' },
  notes: 'Free this Saturday morning!',
});
```

### 2. Recurring Availability
Set regular, ongoing availability:
```typescript
const availability = await createAvailability({
  userId: 'marcus-456',
  recurrence: {
    type: 'weekly',
    daysOfWeek: [2, 4], // Tuesday and Thursday
  },
  timeRanges: [
    { startTime: '18:00', endTime: '20:00' },
  ],
});
```

### 3. Date Range Availability
Available for multiple days:
```typescript
const availability = await createAvailability({
  userId: 'lee-789',
  dateRange: {
    start: today,
    end: oneWeekLater,
  },
  timeRanges: [
    { startTime: '09:00', endTime: '12:00' },
    { startTime: '14:00', endTime: '17:00' },
  ],
});
```

### 4. Query Available Times
Find when people are available:
```typescript
// Find everyone available this weekend
const slots = queryAvailability({
  startDate: saturday,
  endDate: sunday,
});

// Find people available for specific activities
const gardeners = queryAvailability({
  startDate: saturday,
  endDate: sunday,
  activityType: 'gardening',
});

// Check if specific user is available
const isAvailable = isUserAvailable(
  'sarah-123',
  saturday,
  { startTime: '10:00', endTime: '11:00' }
);
```

### 5. Link to Skills
Connect availability to specific skill offers:
```typescript
const availability = await createAvailability({
  userId: 'marcus-456',
  skillOfferId: 'skill-tutoring',
  // ... other options
});

// Find availability for a skill
const slots = getSkillAvailability('skill-tutoring');
```

### 6. Booking Capacity
Limit how many people can book the same slot:
```typescript
const availability = await createAvailability({
  userId: 'marcus-456',
  maxBookings: 2, // Can help 2 people at once
  // ... other options
});
```

### 7. Privacy Controls
Control who sees your availability:
```typescript
const availability = await createAvailability({
  userId: 'jamie-999',
  visibility: 'care-circle', // Only care circle sees this
  // ... other options
});
```

Visibility options:
- `public`: Anyone can see
- `community`: Only community members
- `care-circle`: Only care circle members

## API Reference

### Create Availability

```typescript
createAvailability(options: CreateAvailabilityOptions): Promise<AvailabilitySlot>
```

Options:
- `userId` (required): Who is available
- `date`: Specific date (one-time)
- `dateRange`: Start and end dates (multi-day)
- `recurrence`: Pattern for recurring availability
- `timeRanges` (required): Array of time slots
- `skillOfferId`: Link to specific skill
- `location`: Where you're available
- `preferredActivityTypes`: What you prefer to do
- `maxBookings`: How many people can book (default: 1)
- `notes`: Additional details
- `visibility`: Who can see this (default: 'community')

### Update Availability

```typescript
updateAvailability(slotId: string, updates: Partial<CreateAvailabilityOptions>): Promise<void>
```

### Deactivate/Activate

```typescript
deactivateAvailability(slotId: string): Promise<void>
activateAvailability(slotId: string): Promise<void>
```

### Query Functions

```typescript
// Get user's availability
getUserAvailability(userId: string): AvailabilitySlot[]
getUserActiveAvailability(userId: string): AvailabilitySlot[]

// Get skill availability
getSkillAvailability(skillOfferId: string): AvailabilitySlot[]

// Query by criteria
queryAvailability(options: {
  startDate: number;
  endDate: number;
  userId?: string;
  skillOfferId?: string;
  activityType?: string;
  location?: string;
}): AvailabilitySlot[]

// Check specific availability
isUserAvailable(
  userId: string,
  date: number,
  timeRange: TimeRange
): boolean
```

## Recurrence Patterns

### Daily
Available every day:
```typescript
recurrence: { type: 'daily' }
```

### Weekly
Available on specific days each week:
```typescript
recurrence: {
  type: 'weekly',
  daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
}
```

Days: 0=Sunday, 1=Monday, ..., 6=Saturday

### Biweekly
Available every two weeks:
```typescript
recurrence: {
  type: 'biweekly',
  daysOfWeek: [2], // Every other Tuesday
}
```

### Monthly
Available on specific day of month:
```typescript
recurrence: {
  type: 'monthly',
  dayOfMonth: 15, // 15th of each month
}
```

### End Date
All recurrence patterns can have an end date:
```typescript
recurrence: {
  type: 'weekly',
  daysOfWeek: [1],
  endDate: threeMonthsFromNow, // Stop recurring after this date
}
```

## Location Types

- `my-place`: At your location
- `your-place`: At requester's location
- `community-space`: At shared community space
- `virtual`: Online/video call
- `flexible`: Any of the above

## Time Format

Times use 24-hour format: `HH:MM`

Examples:
- Morning: `09:00`
- Afternoon: `14:30`
- Evening: `18:00`
- Night: `23:59`

## Use Cases

### 1. Community Garden Workday
Find everyone available Saturday morning:
```typescript
const helpers = queryAvailability({
  startDate: saturday,
  endDate: saturday,
  activityType: 'gardening',
});
```

### 2. Tutoring Schedule
Set regular tutoring hours:
```typescript
await createAvailability({
  userId: 'tutor-1',
  skillOfferId: 'math-tutoring',
  recurrence: { type: 'weekly', daysOfWeek: [2, 4] },
  timeRanges: [{ startTime: '16:00', endTime: '18:00' }],
  maxBookings: 3, // Can tutor 3 students
});
```

### 3. Care Circle Support
Daily check-in availability:
```typescript
await createAvailability({
  userId: 'caregiver-1',
  recurrence: { type: 'daily' },
  timeRanges: [
    { startTime: '08:00', endTime: '09:00' },
    { startTime: '20:00', endTime: '21:00' },
  ],
  visibility: 'care-circle',
  preferredActivityTypes: ['check-in', 'companionship'],
});
```

### 4. Emergency Responder
Always available for urgent needs:
```typescript
await createAvailability({
  userId: 'responder-1',
  recurrence: { type: 'daily' },
  timeRanges: [{ startTime: '00:00', endTime: '23:59' }],
  preferredActivityTypes: ['emergency-response'],
  maxBookings: 5,
  notes: 'For urgent community needs',
});
```

## Design Principles

### No Rigid Enforcement
Availability is a gift, not a contract. Users can:
- Change their minds
- Cancel or modify slots
- Set preferences without obligations

### Respect Boundaries
- Users control who sees their availability
- No pressure to be available
- Easy to mark as unavailable temporarily

### Enable Spontaneity
- Quick to add one-time availability
- Easy to update on the fly
- Support for flexible "just ask" slots

### Build Trust
- Transparency about when help is available
- Reduces uncertainty in coordination
- Makes asking for help easier

## Integration with Other Features

### Time Bank Skills
Link availability to skill offers for better matching.

### Care Circles
Private availability for care circle coordination.

### Shift Volunteering
Foundation for shift coverage and swapping (Phase 3, Group B).

### AI Coordination
Will enable AI agents to suggest optimal scheduling (Phase 10).

## Future Enhancements

These are **not** implemented yet but aligned with the roadmap:

1. **Schedule Help Sessions** (next in Phase 3, Group B)
   - Book specific time slots
   - Confirm sessions with both parties
   - Send reminders

2. **Shift Volunteering** (Phase 3, Group B)
   - Recurring volunteer shifts
   - Sign up for open shifts
   - Track shift attendance

3. **AI Matching** (Phase 10)
   - Auto-suggest best times for matches
   - Detect scheduling conflicts
   - Optimize group coordination

## Testing

Run tests:
```bash
npm test src/timebank/availability-calendar.test.ts
```

See examples:
```bash
npm run example src/timebank/availability-calendar-example.ts
```

## License

Part of the Solarpunk Utopia Platform - building liberation infrastructure for mutual aid communities.
