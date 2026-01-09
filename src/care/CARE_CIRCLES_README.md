# Care Circle Formation

**Phase 2, Group A - Care Circle Formation**

**Status**: ✅ IMPLEMENTED

**Liberation Rating**: ✊✊✊✊ (High)
**Joy Rating**: 🌻🌻🌻🌻🌻 (Highest)

## Overview

Care Circles enable community members to form organized support networks for people who need ongoing assistance. This feature implements REQ-CARE-001 (Care circle coordination scenario) from the community-care specification.

## What Is a Care Circle?

A care circle is a group of community members who coordinate to provide regular support to someone who needs it. This could be:

- An elderly person living alone who needs daily check-ins
- A disabled community member who needs help with groceries and transportation
- Someone recovering from surgery who temporarily needs assistance
- A new parent who needs meal support and childcare coordination
- Anyone experiencing a life transition requiring community care

## Key Features

### 1. Circle Formation
- **Create Care Circles**: Recipients (or their advocates) can create a care circle
- **Privacy Controls**: Choose between private circles or community-visible circles
- **Auto-Scheduling**: Optional AI-assisted equitable distribution of care tasks (basic implementation now, AI enhancement in Phase 10)

### 2. Member Management
- **Add Members**: Invite community members to join the care circle
- **Roles**: Members can have specific roles (e.g., "daily check-in", "grocery helper", "medical companion")
- **Skills**: Track member skills (cooking, transportation, emotional support, etc.)
- **Availability**: Record member availability by days/times

### 3. Need Tracking
- **Define Needs**: List specific needs (daily check-in, groceries, transportation, medical, companionship)
- **Frequency**: Specify how often each need occurs (daily, weekly, biweekly, monthly, as-needed)
- **Assignment**: Assign needs to specific members
- **Status Tracking**: Mark needs as met/unmet

### 4. Activity Logging
- **Record Activities**: Log check-ins, visits, assistance provided
- **Communication**: Track care circle messages and coordination
- **Schedule Changes**: Document when scheduling adjustments are made
- **History**: View recent activities and patterns

### 5. Equitable Distribution
- **Fair Assignment**: Basic round-robin distribution of care tasks
- **Burnout Prevention**: Track who's doing what to prevent over-burdening
- **Future AI Enhancement**: Phase 10 will add AI matching based on skills, availability, and workload balance

## Philosophy

### Autonomy-Preserving
- Recipients control their care circle
- Opt-in only - no one is forced into receiving or providing care
- Recipients can add/remove members and define their own needs
- Exit anytime, deactivate circles when care is no longer needed

### Dignity-Centered
- No paternalism or infantilization
- Recipients are partners in their care, not passive subjects
- Language focuses on mutual support, not dependence
- Care is a relationship, not a transaction

### Equity-Focused
- Distributes care work fairly across members
- Prevents burnout by tracking who's doing what
- Values all forms of contribution (emotional support matters as much as task completion)
- Makes invisible care work visible and appreciated

### Community-Centered
- Builds relationships through care
- Connects isolated individuals with supportive networks
- Creates culture of mutual aid and interdependence
- Demonstrates that we take care of each other

## Technical Implementation

### Files

- `src/care/care-circles.ts` - Core logic and data operations
- `src/care/care-circles-ui.ts` - User interface components
- `src/care/care-circles.css` - Solarpunk-themed styling
- `src/types/index.ts` - TypeScript interfaces (CareCircle, CareCircleMember, CareNeed, CareActivity)
- `src/core/database.ts` - Database operations for care circles and activities

### Data Models

```typescript
interface CareCircle {
  id: string;
  recipientId: string;
  name?: string;
  description?: string;
  members: CareCircleMember[];
  needs: CareNeed[];
  settings: {
    communicationChannel?: string;
    privacyLevel: 'private' | 'community-visible';
    autoScheduling: boolean;
  };
  createdAt: number;
  updatedAt: number;
  active: boolean;
}

interface CareCircleMember {
  userId: string;
  role?: string;
  availability?: {
    daysOfWeek?: number[];
    timesOfDay?: ('morning' | 'afternoon' | 'evening' | 'night')[];
  };
  skills?: string[];
  joinedAt: number;
  active: boolean;
}

interface CareNeed {
  id: string;
  type: string;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'as-needed';
  preferredTimes?: string[];
  isMet: boolean;
  assignedTo?: string[];
  createdAt: number;
  updatedAt: number;
}

interface CareActivity {
  id: string;
  circleId: string;
  needId?: string;
  activityType: 'check-in' | 'visit' | 'assistance' | 'message' | 'schedule-change';
  performedBy: string;
  forRecipient: string;
  description?: string;
  scheduledFor?: number;
  completedAt?: number;
  notes?: string;
  createdAt: number;
}
```

### Database Operations

- `createCareCircle()` - Create a new care circle
- `addCareCircleMember()` - Add a member to a circle
- `removeCareCircleMember()` - Remove a member
- `addCareNeed()` - Add a need to track
- `updateCareNeed()` - Update need status or assignment
- `logCareActivity()` - Record a care activity
- `getCareCircle()` - Get circle by ID
- `getCareCirclesForRecipient()` - Get all circles for a recipient
- `getCareCirclesForMember()` - Get all circles where user is a member
- `getCareActivities()` - Get recent activities for a circle
- `getUnmetNeeds()` - Get unmet needs for a circle
- `suggestCareDistribution()` - Suggest equitable distribution of needs
- `deactivateCareCircle()` - Deactivate a circle when no longer needed

## User Interface

### Main View

The care circles view shows:

- **Your Care Circles**: Circles where you are the recipient
- **Circles You Support**: Circles where you are a member
- **Create Circle Button**: Easy circle creation

### Circle Details Modal

For each circle:

- **Members List**: All active members with roles and skills
- **Needs List**: All tracked needs with status (met/unmet)
- **Recent Activity**: Log of recent check-ins, visits, and assistance
- **Add Member/Need Buttons**: Easy management

### Forms

- **Create Circle Form**: Name, description, privacy settings
- **Add Member Form**: User ID, role, skills
- **Add Need Form**: Type, description, frequency

## Usage Examples

### For Recipients

```typescript
// Create a care circle
const circle = await createCareCircle('user-123', {
  name: 'Support for Maria',
  description: 'Helping Maria recover from surgery',
  privacyLevel: 'private',
  autoScheduling: true,
});

// Add members
await addCareCircleMember(circle.id, 'user-456', {
  role: 'Daily check-in',
  skills: ['emotional support', 'conversation'],
});

// Define needs
await addCareNeed(circle.id, {
  type: 'groceries',
  description: 'Weekly grocery shopping',
  frequency: 'weekly',
  isMet: false,
});
```

### For Care Circle Members

```typescript
// View my care circles
const myCircles = await getCareCirclesForMember('user-456');

// Log an activity
await logCareActivity({
  circleId: 'circle-789',
  activityType: 'check-in',
  performedBy: 'user-456',
  forRecipient: 'user-123',
  description: 'Called Maria, she's doing well today',
  completedAt: Date.now(),
});

// Mark a need as met
await updateCareNeed('circle-789', 'need-101', { isMet: true });
```

## Future Enhancements

### Phase 10: AI Enhancement

- **Smart Matching**: AI matches care needs with member skills and availability
- **Burnout Detection**: AI detects when members are over-extended and suggests rebalancing
- **Care Anticipation**: Gentle prompts based on patterns (e.g., "Maria usually needs help on Thursdays")
- **Relationship Building**: AI suggests activities that build deeper connections within circles

### Integration with Other Features

- **Check-In Integration**: Missed check-ins automatically alert care circle
- **Time Bank Integration**: Track care contributions (without creating obligation)
- **Emergency Alerts**: Emergency button instantly notifies entire care circle
- **Mesh Networking**: Care circles work offline via mesh when internet is down

## Accessibility

- Large, accessible UI with clear labels
- Keyboard navigable
- Works on low-end devices
- Minimal data usage
- Offline-first with local storage

## Privacy & Security

- All care circle data stored locally first (IndexedDB with Automerge CRDTs)
- Synced via encrypted mesh networking (no central server)
- User controls their data
- Can export/delete all circle data
- Privacy settings per circle (private vs. community-visible)
- No analytics or tracking
- No surveillance of who doesn't participate

## Testing

To test care circles:

1. Start the development server
2. Navigate to Care Circles view
3. Create a care circle
4. Add members and needs
5. Log activities
6. Verify data persists across page reloads (local-first)
7. Test with multiple users to verify coordination

## Alignment with Solarpunk Values

### ✊ Liberation Infrastructure

- **Offline-First**: Works without internet via mesh networking
- **No Corporate Dependencies**: No cloud services, no APIs, fully local
- **Privacy-Preserving**: No surveillance, no tracking, user data sovereignty
- **Accessible**: Runs on old phones, low bandwidth, works for everyone

### 🌻 Joy and Care

- **Builds Community**: Creates relationships through mutual support
- **Reduces Isolation**: Connects people who need care with willing caregivers
- **Celebrates Care Work**: Makes invisible labor visible and valued
- **Sustainable**: Prevents burnout through equitable distribution

### 🤝 Mutual Aid

- **Non-Transactional**: Care given freely, not as debt or obligation
- **Reciprocity Without Accounting**: Time bank integration optional, not required
- **Community Autonomy**: Communities organize care without state/market intervention
- **Dignity-Centered**: Recipients are empowered, not dependent

## Integration Points

- **Emergency Contacts** (already implemented): Care circles use emergency contact system
- **Check-Ins** (already implemented): Care circles can enable automated check-in monitoring
- **Missed Check-In Alerts** (already implemented): Alerts automatically notify care circle members
- **Time Bank** (Phase 3): Optional integration to track mutual aid contributions
- **AI Agents** (Phase 10): Enhanced matching and burnout prevention

## License

Part of the Solarpunk Utopia Platform - Liberation infrastructure for mutual aid communities.

---

🌻 **Building the world we want to see** ✊
