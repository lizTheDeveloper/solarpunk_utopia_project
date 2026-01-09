# Resource Sharing Module

This module implements the resource sharing features of the Solarpunk Utopia Platform, enabling community members to share physical items, post needs, and coordinate mutual aid.

## Features

### "Claimed" / "Available" Status ✅ IMPLEMENTED

**Phase 2, Group B - Item #5 (Group 80)**

Enables tracking of resource availability status in the gift economy. Resources can be marked as "Available" (ready to share) or "Claimed" (currently in use).

**Specification:** `OpenSpec/specs/platform/resource-sharing.md` (REQ-SHARE-006)

#### Features

- **Toggle availability** - Owners can mark resources as available or claimed
- **Claim resources** - Community members can claim available items with one click
- **Status badges** - Clear visual indicators (✓ Available / ○ Claimed)
- **Filter by status** - View all, available only, or claimed only
- **Event recording** - Claims and returns logged as economic events
- **Owner controls** - Dedicated UI for managing your shared resources
- **Browse view** - See only available resources from other community members

#### Usage

```typescript
import {
  markResourceClaimed,
  markResourceAvailable,
  toggleResourceAvailability,
  getAvailableResources,
  renderMyResources,
} from './resources/resource-status';

// Mark a resource as claimed
await markResourceClaimed(resourceId, 'user-2', 'Borrowing for weekend project');

// Mark a resource as available again
await markResourceAvailable(resourceId, 'user-2', 'Thanks for lending!');

// Toggle status
const newStatus = await toggleResourceAvailability(resourceId, userId);

// Get available resources
const available = getAvailableResources();

// Render UI
const html = renderMyResources(userId);
```

#### Files

- `resource-status.ts` - Core functionality
- `resource-status.test.ts` - Unit tests
- `resource-status.css` - Solarpunk styling
- `resource-status-ui.ts` - UI integration
- `resource-status-example.ts` - Example/demo

#### Testing

```bash
npm test src/resources/resource-status.test.ts
```

### Browse Community Needs ✅ IMPLEMENTED

**Phase 2, Group C - Item #2 (Group 12)**

Allows community members to browse and respond to posted needs and requests.

**Specification:** `OpenSpec/specs/platform/resource-sharing.md` (REQ-SHARE-001)

#### Features

- **Browse all active needs** - See unfulfilled community needs
- **Filter by urgency** - View urgent, needed, helpful, or casual requests
- **Filter by resource type** - Find needs by tool, skill, food, time, etc.
- **Urgency indicators** - Visual cues for urgent needs (🚨 urgent, ⚠️ needed, 🤝 helpful, 💬 casual)
- **Respond to needs** - "I Can Help" button to offer assistance
- **Smart sorting** - Needs sorted by urgency then recency
- **Responsive design** - Works on mobile and desktop

#### Usage

```typescript
import { browseNeeds, getActiveNeeds, getUrgentNeeds, renderBrowseNeedsView } from './resources';

// Programmatic API
const allNeeds = browseNeeds();
const activeNeeds = getActiveNeeds();
const urgentNeeds = getUrgentNeeds();
const toolNeeds = getNeedsByType('tool');

// Render UI
renderBrowseNeedsView(); // Renders to #needs-view container
```

#### Example Data

Use the example module to populate test data:

```typescript
import { populateExampleNeeds, initBrowseNeedsExample } from './resources';

// Initialize with example data
await initBrowseNeedsExample();

// Or just populate data
await populateExampleNeeds();
```

#### Testing

Run tests with:

```bash
npm test src/resources/browse-needs.test.ts
```

## Upcoming Features

### Post Open Requests/Needs
**Phase 2, Group C - Item #1** - Coming soon

### Respond to Needs
**Phase 2, Group C - Item #3** - Partially implemented (response dialog exists)

### Urgency Indicators
**Phase 2, Group C - Item #4** - Coming soon

### Simple Resource Listings
**Phase 2, Group B** - Coming soon

## Architecture

### Files

- `browse-needs.ts` - Core functionality
- `browse-needs.test.ts` - Unit tests
- `browse-needs.css` - Styling
- `browse-needs-example.ts` - Example data
- `index.ts` - Module exports
- `README.md` - This file

### Data Model

Uses the `Need` type from `../types/index.ts`

### Database Operations

Leverages existing database methods:
- `db.addNeed()` - Add a new need
- `db.updateNeed()` - Update a need
- `db.listNeeds()` - List all needs
- `db.recordEvent()` - Record response

## Solarpunk Values

✊ **Liberation**: No money, community autonomy, privacy-preserving
🌻 **Joy**: Easy to use, immediate benefit, warm design
🤝 **Mutual Aid**: Connects needs with offers, builds bonds

---

🌻 Built with love for a post-scarcity future ✊
