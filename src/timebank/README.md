# Time Bank - Gift Economy Time and Skill Sharing

## Overview

The Time Bank enables community members to offer and share their skills, time, and services in a non-monetary mutual aid framework. Unlike traditional time banking that uses hour-for-hour exchange credits, this system emphasizes **gift economy principles** where people contribute what they can and receive what they need.

**Status**: Phase 3, Groups A-D - Core Features ✅ Complete

## Solarpunk Values

- **Gift Economy**: No debt tracking, no reciprocity enforcement, no hour counting
- **Community Vitality**: Track abundance and needs, not individual balances
- **Offline-First**: Works without internet connection using Automerge CRDTs
- **Privacy-Preserving**: Opt-in sharing, no surveillance
- **Accessible**: Simple interface, supports diverse abilities

## Core Principles

### Gift-Based Time Sharing (REQ-TIME-001)

People contribute according to ability and receive according to need, not transactional exchange. When you offer help, there's **no expectation of reciprocal exchange or debt**. When you receive help, there's **no tracked obligation or required payback**.

### Abundance Tracking Over Debt (REQ-TIME-002)

We track:
- ✅ Which skills are abundant vs. scarce
- ✅ Unmet needs in the community
- ✅ Participation vitality (are people connected and active?)

We **DO NOT** track:
- ❌ Who "owes" whom
- ❌ Negative "balances"
- ❌ Debt relationships

## Features Implemented

### ✅ Offer Skills/Time (REQ-TIME-003)

Community members can offer specific skills, services, and time commitments.

**Example:**
```typescript
import { createSkillOffer } from './timebank';

const skill = await createSkillOffer({
  userId: 'user-maria',
  skillName: 'Bicycle Repair',
  description: 'I can fix flat tires, adjust brakes, tune up bikes. I have tools!',
  categories: ['repair', 'transportation'],
});
```

**Captured Information:**
- Skill/service description
- Categories (community-defined taxonomy)
- Availability status
- User offering the skill

**What's NOT captured (by design):**
- Hours committed
- Exchange rates
- Debt obligations
- Mandatory reciprocity

### ✅ Browse Available Skills (REQ-TIME-003)

Community members can discover skills and services offered by others through browsing, searching, and filtering.

**Simple Browsing:**
```typescript
import { browseSkills, formatSkillsList } from './timebank';

// Browse all available skills
const result = browseSkills();
console.log(formatSkillsList(result.skills));

// Browse by category
const repairSkills = browseSkills({ category: 'repair' });

// Search for specific skills
const bikeHelp = browseSkills({ searchTerm: 'bicycle' });
```

**Advanced Browsing:**
```typescript
import {
  browseSkills,
  getCategoriesWithCounts,
  getSkillStatistics,
  formatCategoriesList,
  formatStatistics,
} from './timebank';

// View all categories with counts
const categories = getCategoriesWithCounts();
console.log(formatCategoriesList(categories));

// Get community statistics
const stats = getSkillStatistics();
console.log(formatStatistics(stats));
// Shows: total skills, categories, top categories, recently added

// Paginated browsing
const page1 = browseSkills({ limit: 10, offset: 0 });
const page2 = browseSkills({ limit: 10, offset: 10 });

// Sort skills different ways
const byName = browseSkills({ sortBy: 'name' });
const byNewest = browseSkills({ sortBy: 'newest' });
const byCategory = browseSkills({ sortBy: 'category' });
```

**Get Suggestions for a Need:**
```typescript
import { suggestSkillsForNeed } from './timebank';

// Find skills that might help with a specific need
const suggestions = suggestSkillsForNeed('need help with my bike');
// Returns skills matching "bike"
```

### Skill Taxonomy (REQ-TIME-009)

The platform maintains a **flexible, community-defined taxonomy** of skills. Categories emerge from community practice - if people start offering a new type of help, they can create new categories.

```typescript
import { getAllSkillCategories } from './timebank';

const categories = getAllSkillCategories();
// Returns: ['repair', 'cooking', 'gardening', 'education', 'technology', ...]
```

### Manage Your Offers

```typescript
import {
  getMySkillOffers,
  updateSkillOffer,
  markSkillUnavailable,
  markSkillAvailable
} from './timebank';

// View your skill offers
const mySkills = getMySkillOffers('user-id');

// Update a skill
await updateSkillOffer(skillId, {
  description: 'Updated: Now offering advanced repair services!',
});

// Temporarily unavailable (vacation, busy period)
await markSkillUnavailable(skillId);

// Available again
await markSkillAvailable(skillId);
```

## API Reference

### Creating Skills

#### `createSkillOffer(options: CreateSkillOfferOptions): Promise<SkillOffer>`

Create a new skill/time offering.

**Parameters:**
- `userId` (string, required): ID of the user offering the skill
- `skillName` (string, required): Name of the skill
- `description` (string, required): Detailed description
- `categories` (string[], required): At least one category

**Returns:** The created SkillOffer object

**Throws:**
- Error if required fields missing
- Error if invalid user ID

### Browsing Skills

#### `browseSkills(options?: BrowseOptions): BrowseResult`

Browse available skills with filtering, searching, sorting, and pagination.

**Parameters:**
- `category` (string, optional): Filter by category
- `searchTerm` (string, optional): Search keyword (overrides category)
- `sortBy` ('newest' | 'oldest' | 'name' | 'category', optional): Sort order
- `limit` (number, optional): Max results to return
- `offset` (number, optional): Skip first N results (for pagination)

**Returns:** BrowseResult with skills, total, pagination info

#### `getCategoriesWithCounts(): Array<{ category: string; count: number }>`

Get all skill categories with the number of skills in each, sorted by count descending.

#### `getSkillStatistics(): SkillStatistics`

Get statistics about the community's skill offerings:
- Total skills available
- Total categories
- Top 5 categories by count
- 5 most recently added skills

#### `suggestSkillsForNeed(need: string): SkillOffer[]`

Suggest skills that might match a stated need (simple keyword matching).

### Reading Skills (Low-level)

#### `getAvailableSkills(): SkillOffer[]`

Get all currently available skill offers in the community.

#### `getSkillsByCategory(category: string): SkillOffer[]`

Get available skills filtered by category (case-insensitive).

#### `searchSkills(keyword: string): SkillOffer[]`

Search skills by keyword in name, description, or categories.

#### `getMySkillOffers(userId: string): SkillOffer[]`

Get all skill offers by a specific user.

#### `getAllSkillCategories(): string[]`

Get all unique skill categories in the community (sorted).

### Updating Skills

#### `updateSkillOffer(skillId: string, updates: Partial<CreateSkillOfferOptions>): Promise<void>`

Update an existing skill offer.

#### `markSkillUnavailable(skillId: string): Promise<void>`

Mark a skill as temporarily or permanently unavailable.

#### `markSkillAvailable(skillId: string): Promise<void>`

Mark a skill as available again.

### Formatting Functions

#### `formatSkillsList(skills: SkillOffer[]): string`

Format a list of skills for CLI display with emoji badges, categories, and metadata.

#### `formatCategoriesList(categories: Array<{ category: string; count: number }>): string`

Format category list with counts for CLI display.

#### `formatStatistics(stats: SkillStatistics): string`

Format skill statistics for CLI display showing community overview.

#### `formatSkillForDisplay(skill: SkillOffer): string`

Format a single skill offer for display with emoji badges.

## Shift Volunteering (NEW!)

Coordinate multiple volunteers for community events and ongoing needs.

**REQ-TIME-017: Group Coordination**
**REQ-TIME-005: Collective Time Projects**

### Features

#### Create One-Time Volunteer Shifts

Organize volunteers for specific events like garden workdays, food distribution, repair cafes, or cleanup days.

```typescript
import { createVolunteerShift } from './timebank';

const shift = await createVolunteerShift({
  organizerId: 'user-maria',
  title: 'Community Garden Workday',
  description: 'Help us prepare the garden for spring planting!',
  category: 'gardening',
  shiftDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // Next Saturday
  shiftTime: { startTime: '09:00', endTime: '12:00' },
  estimatedDuration: 180,
  location: {
    name: 'Main Street Community Garden',
    address: '123 Main St',
  },
  volunteersNeeded: 12,
  whatToBring: ['Gloves', 'Water bottle', 'Sun hat'],
  preparationNotes: 'Wear clothes that can get dirty',
  accessibilityInfo: 'Wheelchair accessible paths available',
});
```

#### Role-Based Volunteering

Organize shifts with specific roles for better coordination:

```typescript
const foodBankShift = await createVolunteerShift({
  organizerId: 'user-sam',
  title: 'Food Bank Distribution',
  description: 'Help distribute food to families',
  category: 'food-distribution',
  shiftDate: nextSaturday,
  shiftTime: { startTime: '14:00', endTime: '18:00' },
  location: { name: 'Community Food Bank' },
  volunteersNeeded: 15,
  roles: [
    { name: 'Greeter', description: 'Welcome families', volunteersNeeded: 2 },
    { name: 'Food Packer', description: 'Pack food boxes', volunteersNeeded: 8 },
    { name: 'Car Loader', description: 'Load cars', volunteersNeeded: 5 },
  ],
});

// Sign up for a specific role
await signUpForShift(foodBankShift.id, 'user-alex', 0); // Greeter role (index 0)
```

#### Recurring Shifts

Set up weekly, bi-weekly, or monthly shifts for ongoing community needs:

```typescript
import { createRecurringShift } from './timebank';

const recurringPattern = await createRecurringShift({
  organizerId: 'user-pat',
  title: 'Weekly Repair Cafe',
  description: 'Fix broken items and share repair skills',
  category: 'repair-cafe',
  location: { name: 'Community Center' },
  recurrence: {
    type: 'weekly',
    daysOfWeek: [0], // Sunday
  },
  shiftTime: { startTime: '10:00', endTime: '14:00' },
  volunteersNeeded: 8,
  skillsNeeded: ['Electronics repair', 'Sewing', 'Bicycle repair'],
});
```

#### Sign Up and Manage Volunteers

```typescript
import { signUpForShift, cancelShiftSignup, browseOpenShifts } from './timebank';

// Browse available shifts
const openShifts = browseOpenShifts({ category: 'gardening' });

// Sign up
await signUpForShift(shiftId, 'user-alex');

// Cancel if plans change
await cancelShiftSignup(shiftId, 'user-alex');

// Get my upcoming shifts
const myShifts = getMyShifts('user-alex');
```

#### Track Impact (Not Debt!)

Complete shifts with celebration and impact tracking:

```typescript
import { completeShift } from './timebank';

await completeShift(
  shiftId,
  organizerId,
  'Amazing volunteers! Great teamwork! 💚',
  'Built 6 new raised beds, spread 2 cubic yards of compost, planted 50 tomato seedlings. Garden is ready for spring!'
);
```

### API Reference - Shift Volunteering

#### `createVolunteerShift(options: CreateVolunteerShiftOptions): Promise<VolunteerShift>`

Create a one-time volunteer shift.

**Parameters:**
- `organizerId` (string, required): User creating the shift
- `title` (string, required): Shift title
- `description` (string, required): What volunteers will do
- `category` (string, required): Category (e.g., 'gardening', 'food-distribution')
- `shiftDate` (number, required): Unix timestamp for shift date
- `shiftTime` (TimeRange, required): Start and end time
- `location` (object, required): Location with name, optional address/coordinates
- `volunteersNeeded` (number, required): How many volunteers needed
- `roles` (optional): Array of role objects for role-based volunteering
- `estimatedDuration` (optional): Duration in minutes
- `communityEventId` (optional): Link to community event
- `whatToBring` (optional): Array of items to bring
- `preparationNotes` (optional): Prep instructions
- `accessibilityInfo` (optional): Accessibility details
- `skillsNeeded` (optional): Array of helpful skills

#### `signUpForShift(shiftId: string, userId: string, roleIndex?: number): Promise<void>`

Sign up for a volunteer shift, optionally for a specific role.

#### `cancelShiftSignup(shiftId: string, userId: string): Promise<void>`

Cancel your signup for a shift.

#### `completeShift(shiftId: string, organizerId: string, notes?: string, impact?: string): Promise<void>`

Mark shift as completed with celebration and impact tracking.

#### `createRecurringShift(options: CreateRecurringShiftOptions): Promise<RecurringShiftPattern>`

Create a recurring shift pattern (weekly, bi-weekly, monthly).

#### `browseOpenShifts(options?: { category?: string; startDate?: number; endDate?: number }): VolunteerShift[]`

Browse available shifts with optional filtering.

#### `getMyShifts(userId: string): VolunteerShift[]`

Get shifts you've signed up for.

#### `getUpcomingVolunteerShifts(userId?: string): VolunteerShift[]`

Get upcoming shifts (optionally filtered by user).

### Gift Economy Principles - Shifts

- ✅ **No hour tracking** - Track impact and celebration, not debt
- ✅ **Flexible commitment** - Sign up for what you can, when you can
- ✅ **Role coordination** - Roles help organize, not create hierarchy
- ✅ **Accessibility-first** - Welcome everyone with accommodations
- ✅ **Impact celebration** - Celebrate what we built together
- ✅ **Collective action** - Many hands make light work!

## Appreciation Notes (NEW!)

Express gratitude and appreciation after time bank activities.

**REQ-TIME-018: Experience Sharing**
**REQ-TIME-022: Recognition Without Hierarchy**

### Features

#### Express Appreciation After Help Sessions

Both volunteers and recipients can write appreciation notes after completing a help session:

```typescript
import { expressAppreciation } from './timebank';

// Recipient thanks volunteer
await expressAppreciation({
  sessionId: 'session-123',
  fromUserId: 'recipient-id',
  message: 'Thank you for the patient tutoring! I finally understand quadratic equations.',
  isPublic: true,
  tags: ['patient', 'clear-explanation']
});

// Volunteer can also express appreciation
await expressAppreciation({
  sessionId: 'session-123',
  fromUserId: 'volunteer-id',
  message: 'It was a joy teaching someone so engaged!',
  isPublic: true,
  tags: ['engaged', 'thoughtful']
});
```

#### Appreciate Skill Offers

Thank someone for offering their time, even before a session:

```typescript
import { expressAppreciationForSkillOffer } from './timebank';

await expressAppreciationForSkillOffer(
  'skill-offer-id',
  'user-id',
  'Thank you for offering tutoring! Having this available means so much.',
  {
    isPublic: true,
    tags: ['generous', 'community-spirit']
  }
);
```

#### View Appreciation

```typescript
import {
  getAppreciationForSession,
  getAppreciationForUser,
  getRecentAppreciation,
  formatAppreciationList
} from './timebank';

// Get appreciation for a specific session
const sessionNotes = getAppreciationForSession('session-id');

// Get appreciation for a user
const userNotes = getAppreciationForUser('user-id', {
  limit: 10,
  includePrivate: false
});

// Get recent community appreciation
const recent = getRecentAppreciation({
  days: 7,
  limit: 20,
  publicOnly: true
});

// Format for display
console.log(formatAppreciationList(sessionNotes, 'Session Appreciation'));
```

#### Non-Competitive Statistics

```typescript
import { getAppreciationStats, formatAppreciationStats } from './timebank';

// User stats (for awareness, not ranking)
const userStats = getAppreciationStats('user-id');
console.log(formatAppreciationStats(userStats, 'Maria'));

// Community stats
const communityStats = getAppreciationStats();
console.log(formatAppreciationStats(communityStats));
```

### Gift Economy Principles - Appreciation

- ✅ **Gratitude, not ratings** - No scores, rankings, or evaluations
- ✅ **Bidirectional** - Both volunteers and recipients can express appreciation
- ✅ **Optional & joyful** - Never mandatory or coercive
- ✅ **Connection-focused** - Builds relationships, not transactions
- ✅ **Privacy-controlled** - Users choose public or private
- ✅ **Offline-first** - Works without internet connection

### Documentation

See `APPRECIATION_NOTES.md` for comprehensive documentation including:
- API reference
- Usage examples
- Privacy controls
- Integration with other features
- Philosophy and anti-patterns

See `appreciation-notes-example.ts` for detailed examples including:
- Expressing appreciation after help sessions
- Appreciating skill offers
- Viewing and filtering notes
- Statistics and analytics
- Private vs public notes

## Security Features

- **Input Sanitization**: All user content is sanitized to prevent XSS attacks
- **ID Validation**: User and skill IDs are validated before use
- **No Injection**: Safe against script injection and HTML injection

## Testing

Comprehensive test suite covering:
- ✅ Creating skill offers with valid data
- ✅ Input validation and error handling
- ✅ XSS prevention through sanitization
- ✅ Updating skills
- ✅ Availability management
- ✅ Searching and filtering
- ✅ Category taxonomy
- ✅ Browsing with pagination and sorting
- ✅ Category statistics
- ✅ Community statistics
- ✅ Gift economy principles (no debt tracking)
- ✅ Edge cases and security

Run tests:
```bash
npm test src/timebank/skill-offer.test.ts
npm test src/timebank/browse-skills.test.ts
```

## Examples

**Skill Offerings:**
See `skill-offer-example.ts` for detailed usage examples including:
- Offering bicycle repair skills
- Offering multiple skills
- Managing your skill offers
- Accessibility-aware offerings
- Identifying skill gaps

**Browsing Skills:**
See `browse-skills-example.ts` for detailed usage examples including:
- Browsing all available skills
- Filtering by category
- Searching for specific skills
- Viewing community statistics
- Pagination for large communities
- Different sort orders
- Getting suggestions for needs
- Gift economy principles in action
- Real-world use cases

## Data Storage

Skills are stored in the local Automerge CRDT database, which means:
- **Offline-first**: Works without internet
- **Conflict-free sync**: Multiple peers can edit simultaneously
- **Persistent**: Survives app restarts
- **Mesh-compatible**: Can sync peer-to-peer

## Phase 3 Implementation Status

### ✅ Group A: Time Bank Core (Complete)

- ✅ **Offer skills/time** (REQ-TIME-003)
- ✅ **Browse available skills** (REQ-TIME-004)
- ✅ **Request help** (REQ-TIME-006, REQ-TIME-008)
- ✅ **Schedule help sessions** (REQ-TIME-016)
- ✅ **Skills categories** (REQ-TIME-009)
- ✅ **Thank you / appreciation notes** (REQ-TIME-018, REQ-TIME-022)

### ✅ Group B: Scheduling & Coverage (In Progress)

- ✅ **Availability Calendar** (REQ-TIME-016): Specify when you're available with recurring patterns
- ✅ **Shift volunteering** (REQ-TIME-017, REQ-TIME-005): Coordinate volunteers for community events and ongoing needs
- ⏸️ Shift swapping (planned)
- ⏸️ Coverage finding (planned)

### ✅ Group C: Tool Library & Equipment (Complete)

- ✅ **Tool library** (REQ-SHARE-002)
- ✅ **Equipment booking** (REQ-SHARE-012)
- ⏸️ Item pickup coordination (planned)
- ⏸️ Usage guidelines per item (planned)

### ✅ Group D: Community Vitality (Complete)

- ✅ **Community contribution tracking** (REQ-TIME-002, REQ-TIME-019)
- ✅ **Gratitude wall** (REQ-TIME-022)
- ✅ **"Random acts of kindness" log** (integrated into contribution tracking)
- ✅ **Burnout prevention tracking** (REQ-TIME-021)

## Future Enhancements (Later Phases)

These features are planned but not yet in scope:

- **AI-Powered Matching** (Phase 10): Automatic matching of needs to skills
- **Skill Levels & Learning** (REQ-TIME-010): Mentorship pathways
- **Preference Learning** (REQ-TIME-013): System learns your preferences

## Philosophy

> "In a post-scarcity utopia, people contribute according to ability and receive according to need, not transactional exchange."

This system builds community bonds while meeting real needs through cooperation. It celebrates abundance, identifies gaps, and encourages participation - all without creating obligation or tracking debt.

The gratitude wall and appreciation notes aren't frivolous - they create the emotional bonds that make mutual aid sustainable.

---

🌻 **The future is solarpunk** ✨

**Liberation infrastructure for the new world in the shell of the old.** ✊
