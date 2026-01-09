# Community Care Module

## Overview

This module implements community care features for the Solarpunk Utopia Platform, focusing on mutual aid and wellbeing without surveillance.

## Implemented Features

### "I'm Okay" / "Need Support" Buttons ✅

**Status**: IMPLEMENTED (Phase 2, Group A)
**Specification**: `OpenSpec/specs/platform/community-care.md` (REQ-CARE-001, REQ-CARE-016)
**Liberation Rating**: ✊✊✊✊ (High)
**Joy Rating**: 🌻🌻🌻🌻🌻 (Highest)

#### What It Does

Simple, dignified check-in system that allows community members to:
- Check in as "I'm okay" with one tap
- Request support when needed
- Signal emergencies to their community
- See who in the community needs help
- Respond to support requests

#### Key Features

1. **Three Check-In Levels**:
   - ✓ I'm Okay - Quick daily check-in
   - 🤝 Need Support - Request community help
   - 🚨 Emergency - Urgent assistance needed

2. **Optional Messages**: Users can add context to their check-ins

3. **Community Feed**: See recent check-ins and who needs support

4. **Privacy-Preserving**:
   - Opt-in only
   - No tracking of who doesn't check in
   - Users control what they share

5. **Offline-First**: Works without internet via mesh networking

#### User Interface

The check-in interface includes:
- Large, accessible buttons with emoji and text labels
- Color-coded status indicators (green for okay, yellow for support, red for emergency)
- Community wellbeing summary
- List of members needing support (with "I can help" buttons)
- Recent check-in status display

#### Technical Implementation

**Files**:
- `src/care/check-in.ts` - Core logic and UI rendering
- `src/care/check-in.css` - Solarpunk-themed styling
- `src/types/index.ts` - CheckIn and CheckInStatus types
- `src/core/database.ts` - Database operations for check-ins

**Data Model**:
```typescript
interface CheckIn {
  id: string;
  userId: string;
  status: 'okay' | 'need-support' | 'emergency';
  message?: string;
  createdAt: number;
  acknowledged?: boolean;
  acknowledgedBy?: string[];
  acknowledgedAt?: number;
}
```

**Database Operations**:
- `addCheckIn()` - Record a new check-in
- `updateCheckIn()` - Update check-in (e.g., mark as acknowledged)
- `listCheckIns()` - Get all check-ins
- `getRecentCheckIns(hours)` - Get check-ins from last N hours
- `getUserCheckIns(userId)` - Get user's check-in history
- `getLatestCheckIn(userId)` - Get user's most recent check-in
- `getCheckInsNeedingSupport()` - Get unacknowledged support requests

#### Philosophy

This feature embodies solarpunk values:

1. **Care Without Surveillance**: Check-ins are voluntary. No shaming for not checking in, no tracking of absences.

2. **Community Autonomy**: Community members support each other directly, without institutional mediation.

3. **Accessible Design**: Large buttons, clear labels, works offline, runs on old phones.

4. **Dignity First**: Support requests are framed positively, not as deficits.

5. **Joy in Connection**: Checking in should feel good, not like an obligation.

## Usage

### For Users

1. Navigate to the "Care" tab (first tab in navigation)
2. Click one of the check-in buttons based on how you're doing
3. Optionally add a message for support/emergency requests
4. See community wellbeing and respond to support requests

### For Developers

```typescript
import { submitCheckIn, renderCheckInView } from './care/check-in';

// Submit a check-in
await submitCheckIn('user-id', 'okay');
await submitCheckIn('user-id', 'need-support', 'Could use help with groceries');

// Render the check-in view
renderCheckInView();
```

## Future Enhancements

These features are planned for future implementation:

- **Daily check-in prompts** (REQ-CARE-001) - Already marked as DONE in roadmap
- **Missed check-in alerts** - Notify care circle if member misses check-ins
- **Emergency contact circles** - Pre-configured groups for urgent alerts
- **Care circle formation** - Organize ongoing mutual support
- **Integration with mesh networking** - Check-ins work via LoRa/Bluetooth when internet is down
- **AI care anticipation** (Phase 10) - Gentle prompts when patterns suggest someone might need support

## Testing

To test the check-in feature:

1. Start the development server
2. Navigate to the Care tab
3. Submit different types of check-ins
4. Verify they appear in the community feed
5. Test responding to support requests
6. Check that check-ins persist across page reloads (local-first)

## Accessibility

The check-in feature is designed to be accessible:
- Large, high-contrast buttons
- Clear emoji and text labels
- Keyboard navigable
- Works on low-end devices
- Minimal data usage
- Offline-first

## Privacy & Security

- All check-in data stored locally first (IndexedDB)
- Synced via encrypted mesh networking
- No central server required
- User controls their data
- Can export/delete all check-ins
- No analytics or tracking

## License

Part of the Solarpunk Utopia Platform - Liberation infrastructure for mutual aid communities.
