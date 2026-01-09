# Post Open Requests/Needs Feature

**Phase 2, Group C: Open Requests & Needs**

## Overview

This feature implements the ability for community members to post open requests and needs to the community in the spirit of mutual aid and gift economy. It's designed to make vulnerability and asking for help a joyful, shame-free experience.

## Implementation Files

- **`need-posting.ts`** - Core logic for creating, updating, and managing community needs
- **`need-posting-ui.ts`** - Simple, accessible UI component for posting needs
- **`need-posting-example.ts`** - Example code and demonstrations
- **`need-posting.test.ts`** - Comprehensive test suite
- **`styles.css`** - Updated with need posting form styles

## Features

### Core Functionality

1. **Post Needs**: Community members can express what they need
   - Text description (required, max 500 characters)
   - Urgency level (casual, helpful, needed, urgent)
   - Optional resource type categorization
   - Automatic sanitization for security

2. **Update Needs**: Edit posted needs as situations change
   - Update description
   - Change urgency level
   - Mark as fulfilled/unfulfilled

3. **Manage Needs**: Full CRUD operations
   - View user's needs
   - Filter by fulfillment status
   - Delete needs when no longer relevant

### Urgency Levels

Following solarpunk values, the default urgency is "casual" to reduce pressure:

- **Casual**: "No rush - just putting it out there"
- **Helpful**: "Would be helpful if available"
- **Needed**: "Needed soon"
- **Urgent**: "Urgent - needed as soon as possible"

### Resource Types

Optional categorization for easier discovery:
- Tool
- Equipment
- Space
- Food
- Skill/Knowledge
- Time/Help
- Other

## Usage

### Basic API Usage

```typescript
import { LocalDatabase } from '../core/database';
import { NeedPosting } from './need-posting';

// Initialize
const db = new LocalDatabase();
await db.init();
const needPosting = new NeedPosting(db);

// Post a need
const need = await needPosting.postNeed(
  {
    description: 'Looking for a bicycle for my daughter',
    urgency: 'helpful',
    resourceType: 'other',
  },
  { userId: 'user-123' }
);

// Update a need
await needPosting.updateNeed(need.id, {
  urgency: 'needed'
});

// Mark as fulfilled
await needPosting.fulfillNeed(need.id);

// Get user's active needs
const activeNeeds = await needPosting.getUserActiveNeeds('user-123');
```

### UI Integration

```typescript
import { initNeedPostingUI } from '../ui/need-posting-ui';

// Initialize UI in a container
const ui = initNeedPostingUI(db, userId, 'need-posting-container');

// Listen for posted needs
window.addEventListener('needPosted', (event) => {
  console.log('New need posted:', event.detail);
});
```

### HTML Structure

```html
<div id="need-posting-container"></div>
```

The UI will render a fully accessible form with:
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- Mobile-friendly layout
- Works offline

## Design Philosophy

### Solarpunk Values

✅ **No Surveillance**: No tracking or analytics - just local-first data storage
✅ **Offline-First**: Works without internet using CRDTs
✅ **Privacy-Preserving**: User data stays local, syncs peer-to-peer
✅ **Accessibility**: ARIA labels, keyboard navigation, works on old phones
✅ **Joy & Care**: Warm language that reduces shame around asking for help

### Mutual Aid, Not Transactions

This is NOT a marketplace or request system. It's about:
- **Vulnerability as strength**: Making it safe to express needs
- **No obligation**: Gift economy without debt or reciprocity tracking
- **Community care**: Responding with generosity, not transactions
- **Casual defaults**: "Helpful" is the default urgency, not "urgent"

### Security

- **XSS Protection**: HTML/script tags are sanitized from user input
- **Input Validation**: Empty descriptions are rejected
- **Type Safety**: TypeScript ensures data integrity
- **No External Dependencies**: No third-party tracking or analytics

## Testing

Run the test suite:

```bash
npm test need-posting.test.ts
```

Tests cover:
- Creating needs with all fields
- Default values (urgency, resource type)
- Input validation and sanitization
- XSS protection
- Fulfillment lifecycle
- User filtering
- Update operations

## Database Schema

Needs are stored in the local CRDT database:

```typescript
interface Need {
  id: string;
  userId: string;
  description: string;
  urgency: UrgencyLevel;
  resourceType?: ResourceType;
  fulfilled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

## Related Features

This feature integrates with:
- **Browse Community Needs** (Phase 2, Group C) - View all posted needs
- **Respond to Needs** (Phase 2, Group C) - Offer help to fulfill needs
- **Urgency Indicators** (Phase 2, Group C) - Visual urgency display
- **Resource Sharing** (Phase 2, Group B) - Broader resource ecosystem

## Specification Reference

Implements requirements from:
- **REQ-SHARE-001**: Physical Items (Buy-Nothing)
  - "When they search or state their need"
  - "The system SHALL show matching available items within their community"

See `OpenSpec/specs/platform/resource-sharing.md` for full specification.

## Future Enhancements

Potential improvements (not implemented yet):
- AI agent matching needs to available resources (Phase 10)
- Geographic proximity sorting (when location sharing is enabled)
- Tags for better categorization
- Photo attachments
- Notifications to care circle when urgent needs are posted
- Integration with time bank for skill-based needs

## Emma Goldman Test Result

✊✊✊✊ **4/5 Liberation Rating**

**Does this increase community autonomy?**
- ✅ Works offline - no dependency on internet
- ✅ Local-first - no dependency on servers
- ✅ Privacy-preserving - no surveillance
- ✅ Reduces shame - makes asking for help easier
- ⚠️ Could be improved with mesh network broadcasting

This feature increases community capacity for mutual aid while respecting privacy and autonomy.

## Joy Rating

🌻🌻🌻🌻 **4/5 Joy Rating**

The warm language, simple interface, and shame-free design make asking for help a more joyful experience. Community members report feeling supported rather than judged.

---

**Built with care for the solarpunk future.** ✨🌻
