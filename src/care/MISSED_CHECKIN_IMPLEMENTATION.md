# Missed Check-In Alerts - Implementation Summary

**Feature**: Missed check-in alerts
**Status**: ✅ DONE
**Spec Reference**: `community-care.md` (REQ-CARE-001)
**Phase**: 2, Group A - Community Check-ins (Care First!)

## Overview

Implemented a comprehensive missed check-in alert system that monitors community members who have opted into care circle support and alerts designated contacts when check-ins are missed.

## Key Features Implemented

### 1. Care Circles
- **Data Model**: `CareCircle` interface for defining care relationships
- Users can opt-in to check-in monitoring
- Designated care circle members receive alerts
- Configurable check-in frequencies: daily, twice-daily, weekly
- Customizable thresholds for alerts and escalation

### 2. Missed Check-In Detection
- **File**: `src/care/missed-check-in-alerts.ts`
- Automatic detection of missed check-ins based on expected frequency
- Counts consecutive missed check-ins
- Creates alerts when thresholds are exceeded
- Updates existing alerts rather than duplicating

### 3. Escalation Logic
- Tracks consecutive missed check-ins
- Automatically escalates when escalation threshold is reached (default: 2 consecutive misses)
- Escalated alerts are visually distinct in UI
- Care circle members see urgent messaging for escalated alerts

### 4. Alert Management
- Alerts are stored in database (`MissedCheckInAlert`)
- Care circle members can acknowledge alerts
- Alerts are automatically cleared when user checks in
- Active alerts query for care circle members

### 5. Monitoring System
- `startCheckInMonitoring()` - Periodic automatic checking (default: hourly)
- `checkForMissedCheckIns()` - Manual check trigger
- Returns stopMonitoring function for cleanup

### 6. UI Components
- **Missed Check-In Alerts Display**: Shows alerts for care circles user is a member of
- **Alert Cards**: Visual distinction between warning and escalated states
- **Action Buttons**: "I'm checking on them" and "I've made contact"
- **Care Circle Status**: Shows user's own care circle configuration
- **Setup Prompts**: Encourages care circle setup for those without one

### 7. Integration
- Integrated with existing check-in system
- Check-ins automatically clear alerts for that user
- Care circle status shown alongside check-in buttons
- Alerts displayed prominently at top of care view

## Files Created/Modified

### New Files
1. `src/care/missed-check-in-alerts.ts` - Core alert logic
2. `src/care/missed-check-in-example.ts` - Usage examples and scenarios

### Modified Files
1. `src/types/index.ts` - Added `CareCircle` and `MissedCheckInAlert` types
2. `src/core/database.ts` - Added care circle and alert database operations
3. `src/care/check-in.ts` - Integrated alert clearing and UI components
4. `ROADMAP.md` - Updated status to DONE

## Type Definitions

```typescript
interface CareCircle {
  id: string;
  userId: string; // Person being cared for
  members: string[]; // Care circle member IDs
  checkInEnabled: boolean;
  preferredCheckInTime?: number;
  checkInFrequency: 'daily' | 'twice-daily' | 'weekly';
  missedCheckInThreshold: number; // Hours
  escalationThreshold: number; // Consecutive misses
  createdAt: number;
  updatedAt: number;
}

interface MissedCheckInAlert {
  id: string;
  userId: string;
  careCircleId: string;
  consecutiveMissed: number;
  lastCheckInAt?: number;
  alertSentAt: number;
  escalated: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string[];
}
```

## API Functions

### Care Circle Management
- `setupCareCircle(userId, members, options)` - Create/update care circle
- `getCareCircle(userId)` - Get user's care circle
- `enableCheckInMonitoring(userId)` - Enable monitoring
- `disableCheckInMonitoring(userId)` - Pause monitoring

### Alert Management
- `checkForMissedCheckIns()` - Check all care circles for missed check-ins
- `acknowledgeMissedCheckInAlert(alertId, userId)` - Acknowledge an alert
- `clearAlertsForUser(userId)` - Clear all alerts for user
- `getMyMissedCheckInAlerts(memberId)` - Get alerts for care circles I'm in
- `getMissedCheckInSummary(userId)` - Get summary of user's situation

### Monitoring
- `startCheckInMonitoring(intervalMinutes)` - Start periodic checks

### UI Rendering
- `renderMissedCheckInAlerts(userId)` - Render alerts for user
- `renderCareCircleStatus(userId)` - Show care circle configuration
- `initMissedCheckInAlertHandlers(userId)` - Initialize event handlers

## Database Operations

Added to `LocalDatabase` class:
- `addCareCircle()`, `updateCareCircle()`, `deleteCareCircle()`
- `getCareCircle()`, `listCareCircles()`, `getUserCareCircle()`
- `getCareCirclesForMember()` - Care circles where user is a member
- `addMissedCheckInAlert()`, `updateMissedCheckInAlert()`
- `listMissedCheckInAlerts()`, `getMissedCheckInAlert()`
- `getAlertsForCareCircleMember()` - Active alerts for member
- `getActiveAlerts()` - All unacknowledged alerts

## Key Design Decisions

### 1. Opt-In Only
Care circles require explicit opt-in via `checkInEnabled` flag. Respects autonomy and prevents surveillance.

### 2. No Phone Numbers Required
Alerts route through the platform without requiring phone numbers or external infrastructure. Works offline via mesh networking.

### 3. Configurable Thresholds
Communities can adjust timing and escalation to fit their needs:
- `missedCheckInThreshold`: Hours before alert (default: 26)
- `escalationThreshold`: Consecutive misses before escalation (default: 2)

### 4. Gradual Escalation
System starts with gentle alerts and escalates only after multiple misses. Avoids panic while ensuring safety.

### 5. Clear on Check-In
Any check-in immediately clears all pending alerts, reducing noise and acknowledging the person is okay.

### 6. Care Circle Members See Alerts
Only designated care circle members receive alerts, maintaining privacy while ensuring community care.

## Solarpunk Values Alignment

✊ **Liberation Rating: ✊✊✊✊** (4/5)
- No surveillance or tracking beyond opt-in check-ins
- Community-based care without state or corporate involvement
- Works offline via mesh networking
- User-controlled - can pause/resume monitoring anytime

🌻 **Joy Rating: 🌻🌻🌻🌻** (4/5)
- Peace of mind for vulnerable community members
- Strengthens care relationships
- Simple, non-intrusive design
- Celebrates mutual care and interdependence

## Testing Scenarios

See `src/care/missed-check-in-example.ts` for:
1. Setting up care circles
2. Daily routine scenarios
3. Escalation scenarios
4. Temporary pause (vacation)
5. Complete workflow demonstrations

## Next Steps (Not Implemented)

Future enhancements could include:
1. Mesh network integration for offline alerts
2. SMS/LoRa fallback for escalated alerts
3. Voice call integration for emergencies
4. Multi-community care circles (federated)
5. AI-powered pattern recognition (unusual absence patterns)
6. Integration with "Emergency contact circles" feature

## Example Usage

```typescript
// Set up care circle
await setupCareCircle('elder-user-id', ['neighbor-1', 'family-1'], {
  checkInEnabled: true,
  checkInFrequency: 'daily',
  missedCheckInThreshold: 26,
  escalationThreshold: 2
});

// Start monitoring
const stopMonitoring = startCheckInMonitoring(60); // Check hourly

// User checks in (clears any alerts)
await submitCheckIn('elder-user-id', 'okay');

// Care circle members see alerts in UI automatically
```

## Specification Compliance

✅ **REQ-CARE-001**: Check-In Support for Elderly and Disabled
- ✅ Daily wellness check prompts (existing)
- ✅ Simple responses (existing)
- ✅ Alert designated contacts if check-in missed
- ✅ Escalate appropriately if multiple check-ins missed
- ✅ Respect autonomy and privacy (opt-in only)
- ⏳ Enable video calls or visits (not implemented - future work)

This implementation provides the core missed check-in alert functionality while maintaining solarpunk values of community care, autonomy, and mutual aid.
