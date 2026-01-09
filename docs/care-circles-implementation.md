# Care Circle Formation - Implementation Documentation

## Overview

This document describes the implementation of the **Care Circle Formation** feature for the Solarpunk Utopia Platform, completing Phase 2, Group A of the roadmap.

## Feature Summary

Care Circle Formation enables communities to coordinate mutual care and support for vulnerable members including elderly, disabled, recovering, or anyone needing temporary or ongoing support.

## Specification Reference

Implements **REQ-CARE-001: Care circle coordination** from `community-care.md`

## Architecture

### Core Components

#### 1. Care Circles Module (`care-circles.js`)

The core data layer that manages:
- Care circle creation and management
- Member coordination
- Task scheduling and assignment
- Check-in tracking
- Responsibility distribution

**Key Classes:**
- `CareCircleManager` - Main business logic
- Database stores: `care-circles`, `care-tasks`, `check-ins`

**Key Features:**
- Create care circles with customizable preferences
- Add/remove members with roles (supporter, backup, coordinator)
- Create and assign care tasks (check-ins, visits, errands, meals, transport)
- Record check-ins with status tracking
- Automatic overdue detection
- Equitable responsibility distribution (round-robin)
- Full CRDT support for offline-first operation

#### 2. Care Circles UI Module (`care-circles-ui.js`)

The presentation layer providing:
- Dashboard view of all care circles
- Circle creation forms
- Circle detail views with stats
- Task management interface
- Check-in recording interface
- Member management forms

**Key Classes:**
- `CareCirclesUI` - Manages all UI rendering and interactions

### Data Model

#### Care Circle
```javascript
{
  id: string,
  name: string,
  recipientId: string,
  recipientName: string,
  description: string,
  coordinatorId: string,
  members: [
    {
      id: string,
      name: string,
      role: 'supporter' | 'backup' | 'coordinator',
      joinedAt: timestamp,
      availability: array,
      preferences: object
    }
  ],
  preferences: {
    contactMethods: array,
    bestTimes: array,
    frequency: 'twice-daily' | 'daily' | 'twice-weekly' | 'weekly' | 'as-needed',
    privacy: 'circle-only' | 'community-visible'
  },
  schedule: {
    checkInTime: string,
    rotationPattern: 'equitable' | 'volunteer-based'
  },
  status: 'active' | 'paused' | 'completed',
  createdAt: timestamp,
  lastModified: timestamp,
  _crdt: object
}
```

#### Care Task
```javascript
{
  id: string,
  circleId: string,
  type: 'check-in' | 'visit' | 'assistance' | 'errand' | 'meal' | 'transport',
  title: string,
  description: string,
  assignedTo: string,
  assignedToName: string,
  scheduledFor: timestamp,
  dueBy: timestamp,
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled',
  priority: 'urgent' | 'high' | 'normal' | 'low',
  recurring: 'daily' | 'weekly' | 'monthly' | null,
  completedAt: timestamp,
  notes: array,
  createdAt: timestamp,
  lastModified: timestamp,
  _crdt: object
}
```

#### Check-in
```javascript
{
  id: string,
  circleId: string,
  recipientId: string,
  checkerId: string,
  checkerName: string,
  status: 'ok' | 'need-support' | 'emergency' | 'no-response',
  message: string,
  location: object,
  followUpNeeded: boolean,
  timestamp: timestamp,
  _crdt: object
}
```

## Solarpunk Values Implementation

### 1. Privacy & Autonomy ✊✊✊✊✊
- All participation is opt-in
- Recipient controls circle preferences
- Privacy settings (circle-only vs community-visible)
- User data sovereignty through local-first storage
- No tracking beyond what's necessary for care coordination

### 2. Offline-First ✊✊✊✊✊
- Full CRDT support for conflict resolution
- All operations work offline
- Sync queue for when connection returns
- Local IndexedDB storage

### 3. Accessibility ✊✊✊✊
- Simple, clear interfaces
- Works on old phones
- Low memory footprint
- Battery-optimized

### 4. No Surveillance 🌻🌻🌻🌻🌻
- No analytics
- No tracking cookies
- No third-party services
- Community data stays with the community

### 5. Community Care 🌻🌻🌻🌻🌻
- Focuses on mutual aid and support
- Celebrates reciprocity without obligation
- Prevents burnout through equitable distribution
- Respects dignity of both caregivers and recipients

## API Reference

### Public API Methods

#### Circle Management
```javascript
// Create a new care circle
await SolarpunkCareCircles.createCircle(circleData)

// Get circle by ID
await SolarpunkCareCircles.getCircle(circleId)

// Get all circles
await SolarpunkCareCircles.getAllCircles(options)

// Get circles for a member
await SolarpunkCareCircles.getCirclesForMember(memberId)

// Update circle
await SolarpunkCareCircles.updateCircle(circleId, updates)

// Add member to circle
await SolarpunkCareCircles.addMember(circleId, memberId, memberName, role)

// Remove member from circle
await SolarpunkCareCircles.removeMember(circleId, memberId)

// Delete circle
await SolarpunkCareCircles.deleteCircle(circleId)
```

#### Task Management
```javascript
// Create a care task
await SolarpunkCareCircles.createTask(taskData)

// Get tasks for circle
await SolarpunkCareCircles.getTasksForCircle(circleId, statusFilter)

// Get tasks for member
await SolarpunkCareCircles.getTasksForMember(memberId, statusFilter)

// Complete a task
await SolarpunkCareCircles.completeTask(taskId, notes)

// Distribute responsibilities equitably
await SolarpunkCareCircles.distributeResponsibilities(circleId)
```

#### Check-in Management
```javascript
// Record a check-in
await SolarpunkCareCircles.recordCheckIn(checkInData)

// Get recent check-ins
await SolarpunkCareCircles.getRecentCheckIns(circleId, limit)

// Check if check-in is overdue
await SolarpunkCareCircles.isCheckInOverdue(circleId)

// Get circle summary (stats and latest data)
await SolarpunkCareCircles.getCircleSummary(circleId)
```

### UI Methods

```javascript
// Render care circles dashboard
SolarpunkCareCirclesUI.renderDashboard(container)

// Show circle details
await SolarpunkCareCirclesUI.showCircleDetails(circleId, container)
```

## Usage Example

```javascript
// Initialize (happens automatically in app.js)
await SolarpunkCareCircles.init(SolarpunkDB.db);

// Create a care circle
const circle = await SolarpunkCareCircles.createCircle({
  name: "Emma's Care Circle",
  recipientName: "Emma Goldman",
  recipientId: "user-123",
  description: "Daily check-ins and assistance with errands",
  coordinatorId: "user-456",
  preferences: {
    frequency: 'daily',
    contactMethods: ['phone', 'in-person'],
    privacy: 'circle-only'
  }
});

// Add members
await SolarpunkCareCircles.addMember(
  circle.id,
  "user-789",
  "Peter Kropotkin",
  "supporter"
);

// Create a check-in task
await SolarpunkCareCircles.createTask({
  circleId: circle.id,
  type: 'check-in',
  title: 'Morning check-in',
  dueBy: Date.now() + 86400000, // Tomorrow
  priority: 'normal'
});

// Distribute tasks equitably among members
await SolarpunkCareCircles.distributeResponsibilities(circle.id);

// Record a check-in
await SolarpunkCareCircles.recordCheckIn({
  circleId: circle.id,
  recipientId: "user-123",
  checkerId: "user-789",
  checkerName: "Peter Kropotkin",
  status: 'ok',
  message: 'Feeling good, enjoyed breakfast together!'
});
```

## Files Modified/Created

### New Files
- `platform/src/scripts/care-circles.js` - Core care circles module
- `platform/src/scripts/care-circles-ui.js` - UI components
- `docs/care-circles-implementation.md` - This documentation

### Modified Files
- `platform/src/public/index.html` - Added care circles scripts
- `platform/src/scripts/app.js` - Integrated care circles initialization and navigation
- `ROADMAP.md` - Updated status to ✅ DONE

## Testing Recommendations

1. **Basic Circle Operations**
   - Create a care circle
   - Add members
   - View circle details
   - Delete circle

2. **Task Management**
   - Create tasks of different types
   - Assign tasks to members
   - Complete tasks
   - Test equitable distribution

3. **Check-ins**
   - Record check-ins with different statuses
   - Verify overdue detection
   - Test check-in history

4. **Offline Functionality**
   - Create circles while offline
   - Verify sync when connection returns
   - Test CRDT conflict resolution

5. **Accessibility**
   - Test on old Android devices
   - Verify low memory usage
   - Check battery impact

## Future Enhancements

### Short-term (Phase 3)
- Integration with time bank for tracking care contributions
- Automated check-in reminders
- Better scheduling interface with calendar view
- Push notifications for overdue check-ins

### Long-term (Phase 10+)
- AI-powered task assignment based on member availability
- Burnout detection and prevention
- Smart scheduling optimization
- Predictive care needs analysis

## Security & Privacy Considerations

1. **Data Privacy**
   - All care circle data stored locally
   - No external tracking
   - Opt-in participation at every level

2. **Access Control**
   - Circle members can only see their circles
   - Privacy settings respected
   - Recipient has full control

3. **No Surveillance**
   - No usage analytics
   - No behavioral tracking
   - No data mining

4. **Data Sovereignty**
   - Users can export all data
   - No vendor lock-in
   - Community owns their data

## Alignment with Solarpunk Values

✅ **Liberation**: Offline-first, mesh-ready, no dependencies on corporate infrastructure

✅ **Mutual Aid**: Centers community care and reciprocity without market logic

✅ **Accessibility**: Works on old devices, low resource usage, simple interfaces

✅ **Privacy**: Local-first, no tracking, user-controlled data

✅ **Joy**: Creates meaningful connections and celebrates care as a community value

## Notes

- This feature represents the completion of Phase 2, Group A: Community Check-ins
- The implementation prioritizes simplicity and immediate utility
- Advanced features (AI coordination, smart scheduling) deferred to later phases
- Follows the principle: "Build trust before automation"
