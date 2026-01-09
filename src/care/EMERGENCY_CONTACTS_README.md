# Emergency Contact Circles

**REQ-CARE-002: Emergency Alert System**

Emergency contact circles enable vulnerable community members to quickly alert their care network in case of emergency or urgent need. This feature demonstrates community care in action—rapid response without surveillance or centralized control.

## Overview

Emergency contact circles are groups of trusted community members who can be immediately notified when someone needs help. Unlike traditional emergency services that may be inaccessible, unavailable, or inappropriate for marginalized communities, this system provides mutual aid-based emergency response.

## Key Features

- **Panic Button**: One-touch emergency alert to care circle
- **Location Sharing**: Optional GPS coordinates included in alerts
- **Response Tracking**: See who's responding and their ETA
- **Severity Levels**: "Emergency" vs "Urgent" classifications
- **Privacy-Preserving**: User-controlled, opt-in only
- **Offline-First**: Works via mesh networking during disasters
- **No Surveillance**: Local data, encrypted, community-controlled

## Implementation

### Core Files

- `emergency-contacts.ts` - Core logic for alerts and care circle management
- `emergency-contacts-ui.ts` - User interface components
- `emergency-contacts.test.ts` - Comprehensive test suite
- `emergency-contacts-example.ts` - Usage examples and demos

### Data Models

**EmergencyAlert**
```typescript
interface EmergencyAlert {
  id: string;
  userId: string; // Person triggering the emergency
  careCircleId: string;
  message?: string;
  location?: { latitude: number; longitude: number };
  severity: 'urgent' | 'emergency';
  contactEmergencyServices: boolean;
  triggeredAt: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  resolution?: string;
  responses: Array<{
    responderId: string;
    timestamp: number;
    message?: string;
    eta?: number; // minutes
    status: 'on-way' | 'contacted' | 'arrived' | 'resolved';
  }>;
}
```

## Usage

### Setup Emergency Contacts

```typescript
import { setupEmergencyContacts } from './emergency-contacts';

// Setup emergency contacts for a user
const careCircle = await setupEmergencyContacts(
  'user-id',
  ['contact-1-id', 'contact-2-id', 'contact-3-id']
);
```

### Trigger Emergency Alert

```typescript
import { triggerEmergencyAlert } from './emergency-contacts';

// Medical emergency with location
const alert = await triggerEmergencyAlert('user-id', {
  message: 'I fell and need help',
  severity: 'emergency',
  location: {
    latitude: 37.7749,
    longitude: -122.4194
  }
});

// Urgent (non-life-threatening) request
const urgentAlert = await triggerEmergencyAlert('user-id', {
  message: 'Power outage, need help with medical equipment',
  severity: 'urgent'
});
```

### Respond to Emergency Alert

```typescript
import { respondToEmergencyAlert } from './emergency-contacts';

// "I'm on my way"
await respondToEmergencyAlert(alertId, responderId, {
  status: 'on-way',
  eta: 10, // minutes
  message: 'I am 10 minutes away, hold tight!'
});

// "I've made contact"
await respondToEmergencyAlert(alertId, responderId, {
  status: 'contacted',
  message: 'I called them, they are okay'
});

// "I've arrived"
await respondToEmergencyAlert(alertId, responderId, {
  status: 'arrived',
  message: 'I am with them now, providing help'
});
```

### Check for Active Alerts

```typescript
import { getMyEmergencyAlerts } from './emergency-contacts';

// Get active alerts for care circles you're in
const alerts = getMyEmergencyAlerts('my-user-id');

alerts.forEach(alert => {
  console.log(`Emergency: ${alert.message}`);
  console.log(`Responses: ${alert.responses.length}`);
});
```

### Manage Contacts

```typescript
import {
  addEmergencyContact,
  removeEmergencyContact,
  getEmergencyContacts
} from './emergency-contacts';

// Add contact
await addEmergencyContact('user-id', 'new-contact-id');

// Remove contact
await removeEmergencyContact('user-id', 'contact-to-remove-id');

// Get all contacts
const contacts = getEmergencyContacts('user-id');
```

## Scenarios

### Scenario 1: Elderly Member Falls

**Given** Alice (80 years old) lives alone and has set up emergency contacts
**When** She falls in the bathroom and cannot get up
**Then** She presses the emergency button on her phone
**And** Bob and Charlie (her emergency contacts) receive immediate alerts with her location
**And** Bob responds "I'm on my way" with 5-minute ETA
**And** Charlie calls Alice to check on her while Bob drives over
**And** Bob arrives, helps Alice up, and marks the alert as resolved

### Scenario 2: Power Outage Affecting Medical Equipment

**Given** David uses medical equipment that requires electricity
**When** A power outage occurs
**Then** He triggers an "urgent" (not emergency) alert
**And** His care circle is notified
**And** Someone with a generator offers to help
**And** The situation is resolved without emergency services

### Scenario 3: Heat Wave Check-In

**Given** Extreme heat wave warning
**When** Emily (elderly, no AC) doesn't respond to check-ins
**Then** Her care circle receives missed check-in alert
**And** They check on her proactively
**And** Find she needs help getting to a cooling center
**And** Community provides transportation

## Privacy & Autonomy

### User Control

- **Opt-in only**: Users choose to set up emergency contacts
- **User-controlled membership**: Users decide who is in their care circle
- **Cancellable**: False alarms can be cancelled by the person who triggered them
- **Flexible**: Can pause or disable at any time

### Data Privacy

- **Local-first**: All data stored locally, not in cloud
- **Encrypted**: End-to-end encryption for all alerts
- **No tracking**: System doesn't track location unless user explicitly shares it
- **Federated**: Works across federated communities without central authority

### Location Privacy

- Location sharing is **optional**
- Only shared when emergency alert is triggered
- Only visible to care circle members
- Not stored long-term
- User can choose not to share location even in emergencies

## Technical Implementation

### Database Operations

Emergency alerts are stored in the local CRDT-based database:

```typescript
// Database schema includes emergencyAlerts collection
interface DatabaseSchema {
  emergencyAlerts: Record<string, EmergencyAlert>;
  // ... other collections
}
```

### Offline & Mesh Support

Emergency alerts work offline via:

1. **Bluetooth proximity sync**: Nearby devices relay alerts
2. **WiFi Direct**: Direct device-to-device communication
3. **Meshtastic/LoRa**: Long-range mesh networking
4. **DTN (Delay Tolerant Networking)**: Store-and-forward for disconnected networks

### Integration with Check-In System

Emergency contacts can be combined with the check-in monitoring system:

```typescript
// Setup with check-in monitoring enabled
await setupEmergencyContacts('user-id', ['contact-ids'], {
  enableCheckIns: true,
  checkInFrequency: 'daily'
});
```

This provides both:
- **Proactive monitoring**: Care circle notified if check-ins are missed
- **Reactive response**: Emergency button for immediate alerts

## Testing

Run the test suite:

```bash
npm test emergency-contacts.test.ts
```

Run the example/demo:

```bash
npm run example:emergency-contacts
```

## Liberation Rating: ✊✊✊✊✊

Emergency contact circles receive maximum liberation rating because:

1. **Autonomous**: Communities can respond to emergencies without state systems
2. **Inclusive**: Works for unhoused, disabled, rural, and marginalized people
3. **Resilient**: Functions during disasters when traditional services fail
4. **Private**: No surveillance or tracking of vulnerable community members
5. **Accessible**: Simple panic button interface, works on old phones

## Joy Rating: 🌻🌻🌻

While emergency response isn't inherently joyful, this system brings:

1. **Peace of Mind**: Knowing help is a button press away
2. **Community Bonds**: Care circles strengthen relationships
3. **Empowerment**: Autonomy for elderly and disabled members
4. **Reduced Anxiety**: Don't have to worry about falling alone

## Alignment with Solarpunk Values

✓ **Mutual Aid**: Community members helping each other in crisis
✓ **Autonomy**: Self-organized emergency response
✓ **Accessibility**: Works for vulnerable and marginalized communities
✓ **Resilience**: Functions during disasters and grid failures
✓ **Privacy**: No surveillance or data extraction
✓ **Offline-First**: Mesh networking when infrastructure fails
✓ **Liberation Technology**: Increases community autonomy, not dependencies

## Future Enhancements

Potential future features (not yet implemented):

- **Integration with community responder network**: Match emergencies with trained community responders (medics, de-escalation specialists)
- **Skill-based matching**: Alert care circle members with relevant skills (medical training, mobility assistance, etc.)
- **Emergency supply coordination**: Alert when someone needs specific medical supplies or equipment
- **Community health workers integration**: Connect with community health workers for non-emergency medical support
- **Pattern detection**: AI agent identifies concerning patterns (frequent falls, medication issues) and suggests proactive interventions
- **Voice activation**: "Hey Solarpunk, I need help" for hands-free emergency alerts
- **Wearable integration**: Connect with smartwatches or medical alert devices

## Related Features

- **Check-In System** (`check-in.ts`): Daily wellness monitoring
- **Missed Check-In Alerts** (`missed-check-in-alerts.ts`): Proactive care when check-ins are missed
- **Care Circles**: Shared infrastructure for both emergency response and wellness monitoring

## Questions?

Read the specification: `OpenSpec/specs/platform/community-care.md` (REQ-CARE-002)

See examples: `emergency-contacts-example.ts`

Run tests: `emergency-contacts.test.ts`

---

**The Emma Goldman Test**: *"Does this increase community autonomy, or create new dependencies?"*

✅ **This increases autonomy.** Emergency contact circles enable communities to respond to crises without depending on state emergency services that may be inaccessible, unresponsive, or hostile to marginalized communities.
