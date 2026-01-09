# Solarpunk Utopia Platform: Build Roadmap

**Liberation Infrastructure First**

> "We build the new world in the shell of the old—starting with the foundation of autonomy."

This roadmap is ordered according to an **anti-capitalist value chain**: prioritizing features that maximize community liberation, resilience, and mutual aid capacity—not market viability or engagement metrics.

---

## The Anti-Capitalist Value Chain

Traditional value chains optimize for profit capture. We optimize for:

- **Community Autonomy**: Freedom from surveillance, corporate infrastructure, and state control
- **Resilience for the Marginalized**: Works for unhoused, rural, disabled, and under-resourced communities
- **Trust Building**: Creates social cohesion that enables deeper cooperation
- **Mutual Aid Capacity**: Increases ability to meet each other's needs
- **Liberation**: Tools that free us, not tools that extract from us

### The Emma Goldman Test

For each feature: *"Does this increase community autonomy, or create new dependencies?"*

### Critical Insight

**Infrastructure isn't neutral.** Building on cloud-first, internet-dependent architecture creates vulnerability. Communities organizing mutual aid can be surveilled, shut down, or excluded when infrastructure fails.

**Liberation infrastructure must come first.** Everything else is built on sand without it.

---

## How to Read This Roadmap

- **Phases** = Ordered by liberation value, not technical complexity
- **Groups (A, B, C...)** = Can be built in parallel by different teams
- **Joy Rating** = How much delight this brings (more 🌻 = more joy)
- **Liberation Rating** = How much this increases community autonomy (more ✊ = more liberation)
- **No time estimates** = Build at the pace that works for your community

---

## Phase 1: Liberation Infrastructure
*The foundation of autonomy—everything else depends on this*

**Why First?** Without offline-first, mesh networking, and surveillance-resistant infrastructure, we're building liberation tools on corporate foundations. ISPs can shut us down. Governments can surveil us. Cloud providers can cut access. Marginalized communities without stable internet are excluded.

**The Test**: Can this work during a protest when cell towers are overloaded? During a disaster when power is out? For unhoused community members without wifi?

### Group A: Offline-First Core

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Local-first data storage | Medium | ✊✊✊✊✊ | 🌻🌻 | deployment-integration.md |
| Basic CRDT implementation | Medium | ✊✊✊✊✊ | 🌻 | deployment-integration.md |
| Offline mode (full read/write) | Medium | ✊✊✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Data export (user sovereignty) | Simple | ✊✊✊✊ | 🌻🌻 | core-platform.md |
| End-to-end encryption | Medium | ✊✊✊✊✊ | 🌻🌻 | deployment-integration.md |

### Group B: Mesh & Resilient Networking

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Meshtastic integration | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |
| LoRa message relay | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |
| WiFi Direct sync | Medium | ✊✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Bluetooth proximity sync | Medium | ✊✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Peer-to-peer synchronization | Medium | ✊✊✊✊✊ | 🌻🌻 | deployment-integration.md |

### Group C: Runs on Anything

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Progressive Web App shell | Medium | ✊✊✊✊ | 🌻🌻 | deployment-integration.md |
| Termux installation package | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |
| Minimal resource footprint | Complex | ✊✊✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Old phone support (Android 5+) | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻🌻 | deployment-integration.md |
| Battery optimization | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |
| Energy efficiency (solar charging) | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |

### Group D: Identity Without Surveillance

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Decentralized identifiers (DIDs) | Medium | ✊✊✊✊✊ | 🌻🌻 | deployment-integration.md |
| User-controlled reputation | Medium | ✊✊✊✊ | 🌻🌻🌻 | core-platform.md |
| Privacy controls (opt-in everything) | Simple | ✊✊✊✊✊ | 🌻🌻 | core-platform.md |
| No phone number/email required | Simple | ✊✊✊✊✊ | 🌻🌻🌻 | core-platform.md |

---

## Phase 2: Trust Building - Quick Wins
*Simple features that build social cohesion fast*

**Why Second?** Communities need quick wins that build trust before complex coordination. These are the "entry drugs" to mutual aid—easy to use, immediate benefit, creates the relationships that enable everything else.

**The Test**: Can someone with no technical skills start using this in 5 minutes and feel helped within a day?

### Group A: Community Check-ins (Care First!) - 60% Complete

| Feature | Complexity | Liberation | Joy | Spec Reference | Status |
|---------|------------|------------|-----|----------------|--------|
| Daily check-in prompts | Simple | ✊✊✊ | 🌻🌻🌻🌻 | community-care.md | ✅ DONE |
| "I'm okay" / "Need support" buttons | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | community-care.md | ✅ DONE |
| Missed check-in alerts | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | community-care.md | ✅ DONE |
| Emergency contact circles | Simple | ✊✊✊✊✊ | 🌻🌻🌻 | community-care.md | |
| Care circle formation | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | community-care.md | |

### Group B: Simple Resource Sharing (Buy Nothing!)

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Post items to share/give | Simple | ✊✊✊ | 🌻🌻🌻🌻 | resource-sharing.md |
| Browse available items | Simple | ✊✊✊ | 🌻🌻🌻 | resource-sharing.md |
| Request items | Simple | ✊✊✊ | 🌻🌻🌻 | resource-sharing.md |
| Photo uploads for items | Simple | ✊✊ | 🌻🌻🌻 | resource-sharing.md |
| "Claimed" / "Available" status | Simple | ✊✊✊ | 🌻🌻 | resource-sharing.md |

### Group C: Open Requests & Needs

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Post open requests/needs | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | resource-sharing.md |
| Browse community needs | Simple | ✊✊✊ | 🌻🌻🌻 | resource-sharing.md |
| Respond to needs | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | resource-sharing.md |
| Urgency indicators | Simple | ✊✊✊✊ | 🌻🌻🌻 | resource-sharing.md |

### Group D: Community Basics

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Community/group creation | Simple | ✊✊✊✊ | 🌻🌻🌻 | community-governance.md |
| About pages & philosophy pages | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Community bulletin board | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Community events listing | Simple | ✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |

---

## Phase 3: Mutual Aid Coordination
*The features that make helping each other easier*

**Why Third?** Once trust is established and basic sharing works, communities can coordinate more complex mutual aid. This layer multiplies what individuals can do alone.

### Group A: Time Bank Core (Gift Economy!)

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Offer skills/time | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | time-bank.md |
| Browse available skills | Simple | ✊✊✊ | 🌻🌻🌻 | time-bank.md |
| Request help | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | time-bank.md |
| Skills categories | Simple | ✊✊ | 🌻🌻 | time-bank.md |
| Thank you / appreciation notes | Simple | ✊✊ | 🌻🌻🌻🌻🌻 | time-bank.md |

### Group B: Scheduling & Coverage

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Availability calendar | Medium | ✊✊✊ | 🌻🌻🌻 | time-bank.md |
| Schedule help sessions | Medium | ✊✊✊ | 🌻🌻🌻 | time-bank.md |
| Shift volunteering | Medium | ✊✊✊ | 🌻🌻🌻 | time-bank.md |
| Shift swapping | Medium | ✊✊✊ | 🌻🌻🌻🌻 | time-bank.md |
| Coverage finding | Medium | ✊✊✊ | 🌻🌻🌻 | time-bank.md |

### Group C: Tool Library & Equipment

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Tool library | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | resource-sharing.md |
| Equipment booking | Medium | ✊✊✊ | 🌻🌻🌻 | resource-sharing.md |
| Item pickup coordination | Medium | ✊✊✊ | 🌻🌻🌻 | resource-sharing.md |
| Usage guidelines per item | Simple | ✊✊ | 🌻🌻 | resource-sharing.md |

### Group D: Community Vitality (Not Debt!)

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Community contribution tracking | Medium | ✊✊✊ | 🌻🌻🌻 | time-bank.md |
| Gratitude wall | Simple | ✊✊ | 🌻🌻🌻🌻🌻 | time-bank.md |
| "Random acts of kindness" log | Simple | ✊✊ | 🌻🌻🌻🌻🌻 | time-bank.md |
| Burnout prevention tracking | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | time-bank.md |

---

## Phase 4: Food Security & Gardens
*Because liberation requires full bellies*

**Why Fourth?** Food security is foundational to community resilience. Hungry people can't organize. These features create tangible, daily value that keeps people engaged.

### Group A: Garden Availability (What's Ripe Now!)

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Post available harvests | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | food-agriculture.md |
| Browse what's ready | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | food-agriculture.md |
| Claim garden produce | Simple | ✊✊✊ | 🌻🌻🌻🌻 | food-agriculture.md |
| "Coming soon" predictions | Medium | ✊✊✊ | 🌻🌻🌻🌻 | food-agriculture.md |

### Group B: Food Security Network

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Community fridge locations | Simple | ✊✊✊✊✊ | 🌻🌻🌻🌻 | community-care.md |
| Food surplus alerts | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | food-agriculture.md |
| Meal train coordination | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | community-care.md |
| Gleaning and food rescue | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | food-agriculture.md |

### Group C: Seed Library

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Seed catalog | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | food-agriculture.md |
| Seed checkout | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | food-agriculture.md |
| Seed returns (with offspring!) | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | food-agriculture.md |
| Seed saving workshops | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | food-agriculture.md |

### Group D: Food Preservation & Skills

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Recipe sharing | Simple | ✊✊✊ | 🌻🌻🌻🌻🌻 | food-agriculture.md |
| Preservation work parties | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | food-agriculture.md |
| Shared cold storage | Medium | ✊✊✊✊ | 🌻🌻🌻 | food-agriculture.md |
| Composting network | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | water-ecology.md |

---

## Phase 5: Emergency Response & Care
*Mutual aid when it matters most*

**Why Fifth?** Communities that can respond to emergencies together build deep trust. This phase creates the infrastructure for crisis response that doesn't depend on state systems.

### Group A: Emergency Support

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Emergency contact lists | Simple | ✊✊✊✊✊ | 🌻🌻🌻 | community-care.md |
| Emergency alerts broadcast | Medium | ✊✊✊✊✊ | 🌻🌻🌻 | community-care.md |
| Rapid response coordination | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | community-care.md |
| Medical skills directory | Simple | ✊✊✊✊ | 🌻🌻🌻 | community-care.md |
| Mutual aid registry | Medium | ✊✊✊✊✊ | 🌻🌻🌻 | community-care.md |

### Group B: Distributed Sensing

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Temperature reporting | Simple | ✊✊✊✊ | 🌻🌻🌻 | community-care.md |
| Air quality sensing | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | community-care.md |
| Weather station mode | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | community-care.md |
| Heat/cold wave alerts | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻🌻 | community-care.md |
| Environmental event detection | Medium | ✊✊✊✊ | 🌻🌻🌻 | community-care.md |

### Group C: Peer Support

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Wellness buddy matching | Medium | ✊✊✊ | 🌻🌻🌻🌻🌻 | community-care.md |
| Peer support circles | Medium | ✊✊✊ | 🌻🌻🌻🌻🌻 | culture-technology-health.md |
| Listener matching | Medium | ✊✊✊ | 🌻🌻🌻🌻🌻 | culture-technology-health.md |
| Harm reduction resources | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | culture-technology-health.md |

---

## Phase 6: Community Spaces & Maintenance
*Making shared spaces work smoothly*

### Group A: Space Management

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Community spaces directory | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Space booking/reservation | Medium | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Space capacity & rules | Simple | ✊✊ | 🌻🌻 | community-governance.md |
| Cleanup checklists | Simple | ✊✊ | 🌻🌻 | community-governance.md |

### Group B: Maintenance System

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Maintenance ticket creation | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Ticket assignment | Medium | ✊✊✊ | 🌻🌻 | community-governance.md |
| Ticket status tracking | Simple | ✊✊✊ | 🌻🌻 | community-governance.md |
| Preventive maintenance scheduling | Medium | ✊✊✊ | 🌻🌻🌻 | community-governance.md |

### Group C: The Glorious Chore Wheel

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Chore wheel creation | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |
| Fair rotation algorithm | Medium | ✊✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Chore completion tracking | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Chore swapping | Simple | ✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |
| Accessibility accommodations | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻🌻 | community-governance.md |

### Group D: Fabrication Spaces

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| 3D printer queue | Medium | ✊✊✊ | 🌻🌻🌻🌻 | resource-sharing.md |
| Workshop scheduling | Medium | ✊✊✊ | 🌻🌻🌻 | resource-sharing.md |

---

## Phase 7: Democratic Governance
*Making decisions together*

**Why Seventh?** Governance systems only work when there's trust, shared resources, and common purpose. Build the community first, then formalize decision-making.

### Group A: Decision Making

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Proposals creation | Simple | ✊✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Discussion threads | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Voting (multiple methods) | Medium | ✊✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Consensus tracking | Medium | ✊✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Decision archives | Simple | ✊✊✊ | 🌻🌻 | community-governance.md |

### Group B: Conflict Resolution

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Request mediation (private) | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |
| Mediator directory | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Restorative justice frameworks | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |
| Transformative justice tools | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |

### Group C: Community Safety

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Community agreements | Simple | ✊✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Community review system (anti-cult) | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |
| Red flag detection | Medium | ✊✊✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Exit rights and support | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |

---

## Phase 8: Education & Skill Sharing
*Learning together, growing together*

### Group A: Classes & Workshops

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Post classes/workshops | Simple | ✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |
| Class registration | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Class materials sharing | Simple | ✊✊✊ | 🌻🌻🌻 | community-governance.md |
| Skill share events | Simple | ✊✊✊ | 🌻🌻🌻🌻🌻 | community-governance.md |

### Group B: Mentorship & Knowledge

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Mentorship matching | Medium | ✊✊✊ | 🌻🌻🌻🌻🌻 | culture-technology-health.md |
| Learning paths | Medium | ✊✊✊ | 🌻🌻🌻🌻 | culture-technology-health.md |
| Knowledge preservation (elder wisdom) | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | culture-technology-health.md |
| Community library | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | culture-technology-health.md |

### Group C: Cooperative Learning

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Learning circle formation | Medium | ✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |
| Cooperative childcare coordination | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | community-governance.md |
| Homeschool resource sharing | Medium | ✊✊✊ | 🌻🌻🌻🌻 | community-governance.md |

---

## Phase 9: Energy Commons
*Powering liberation with sunshine*

### Group A: Energy Sharing

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Solar panel registry | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | energy-infrastructure.md |
| Energy availability posting | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | energy-infrastructure.md |
| Energy sharing requests | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | energy-infrastructure.md |
| Battery storage tracking | Medium | ✊✊✊✊ | 🌻🌻🌻 | energy-infrastructure.md |
| Microgrid coordination | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | energy-infrastructure.md |

### Group B: Efficiency & Conservation

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Weatherization work parties | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | energy-infrastructure.md |
| Bulk efficiency purchases | Medium | ✊✊✊ | 🌻🌻🌻 | energy-infrastructure.md |
| Home energy audits | Medium | ✊✊✊ | 🌻🌻🌻 | energy-infrastructure.md |

### Group C: Transportation Alternatives

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Bike share coordination | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | energy-infrastructure.md |
| Carpool matching | Medium | ✊✊✊ | 🌻🌻🌻🌻 | energy-infrastructure.md |
| EV charging sharing | Medium | ✊✊✊ | 🌻🌻🌻🌻 | energy-infrastructure.md |
| Cargo bike lending | Simple | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | energy-infrastructure.md |

---

## Phase 10: AI Agents - Automation for Liberation
*Making coordination effortless*

**Why Tenth?** AI agents are powerful but require trust and data from earlier phases. Communities won't delegate to AI they don't trust. Build the human systems first.

### Group A: Resource Matchmaker Agent

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Natural language need expression | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agents.md |
| Auto-matching needs to resources | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agents.md |
| Cross-domain assembly | Complex | ✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Underutilization alerts | Medium | ✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |

### Group B: Time Coordinator Agent

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Complex multi-person scheduling | Complex | ✊✊✊ | 🌻🌻🌻🌻 | ai-agents.md |
| Conflict prevention | Medium | ✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Burnout detection | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agent-integration.md |
| Automatic shift coverage | Complex | ✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |

### Group C: Community Health Agent

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Community energy sensing | Complex | ✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Isolation detection | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agent-integration.md |
| Care anticipation | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agent-integration.md |
| Suggest community gatherings | Medium | ✊✊ | 🌻🌻🌻🌻🌻 | ai-agent-integration.md |

### Group D: Event Planner Agent (THE RAVE PLANNER!)

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Survey music preferences | Medium | ✊✊ | 🌻🌻🌻🌻🌻 | ai-agents.md |
| Find optimal party dates | Complex | ✊✊ | 🌻🌻🌻🌻🌻 | ai-agents.md |
| Coordinate supplies & setup | Complex | ✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agents.md |
| Intergenerational event design | Complex | ✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agent-integration.md |

---

## Phase 11: Delay Tolerant Networking
*For when infrastructure fails*

### Group A: DTN Core

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| DTN bundle creation | Complex | ✊✊✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Store-and-forward relay | Complex | ✊✊✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Opportunistic sync | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |
| Message priority queuing | Medium | ✊✊✊✊ | 🌻🌻🌻 | deployment-integration.md |

### Group B: Edge AI

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| On-device inference | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Tiny models for old phones | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Federated learning | Complex | ✊✊✊✊✊ | 🌻🌻🌻 | ai-agent-integration.md |
| Privacy-preserving AI | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |

---

## Phase 12: Federation & Inter-Community
*Cooperation among cooperatives*

### Group A: ActivityPub Federation

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| ActivityPub actor implementation | Complex | ✊✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Follow other communities | Medium | ✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |
| Share resources cross-community | Complex | ✊✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |
| Federated search | Complex | ✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |

### Group B: Value Flows Integration

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Value Flows vocabulary | Complex | ✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Resource flows tracking | Complex | ✊✊✊ | 🌻🌻🌻 | deployment-integration.md |
| Inter-community exchange | Complex | ✊✊✊✊ | 🌻🌻🌻🌻 | deployment-integration.md |

### Group C: Regional Networks

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Regional community directories | Medium | ✊✊✊ | 🌻🌻🌻🌻 | economic-solidarity.md |
| Cross-community events | Medium | ✊✊✊ | 🌻🌻🌻🌻🌻 | economic-solidarity.md |
| Convergence planning | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | future-experimental.md |

---

## Phase 13: Advanced AI Agents
*More automation, more liberation*

### Group A: Food Systems Agent

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Harvest prediction | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agent-integration.md |
| Pest/disease early detection | Complex | ✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Recipe suggestions for surplus | Medium | ✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agent-integration.md |
| Food security tracking | Complex | ✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |

### Group B: Energy Optimizer Agent

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Solar prediction & scheduling | Complex | ✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Load balancing suggestions | Complex | ✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Efficiency recommendations | Medium | ✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |

### Group C: Emergency Coordinator Agent

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Crisis recognition | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Resource mobilization | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |
| Vulnerability mapping | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻🌻 | ai-agent-integration.md |
| Disaster preparation prompts | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | ai-agent-integration.md |

---

## Phase 14: Advanced Community Features
*The full commune operating system*

### Group A: Housing & Space

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Co-housing matching | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | housing-built-environment.md |
| Room/house shares | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | housing-built-environment.md |
| Building work parties | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | housing-built-environment.md |
| Land trust coordination | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | housing-built-environment.md |

### Group B: Water & Ecology

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Water quality monitoring | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | water-ecology.md |
| Rainwater harvesting coordination | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | water-ecology.md |
| Watershed restoration projects | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | water-ecology.md |
| Repair café coordination | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | water-ecology.md |

### Group C: Economic Alternatives

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Worker co-op formation guide | Medium | ✊✊✊✊ | 🌻🌻🌻🌻 | economic-solidarity.md |
| Cooperative directory | Simple | ✊✊✊✊ | 🌻🌻🌻🌻 | economic-solidarity.md |
| Community land trusts | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | economic-solidarity.md |
| Solidarity economy mapping | Medium | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | economic-solidarity.md |

---

## Phase 15: Solidarity Networks
*Building movement power*

### Group A: Inter-Movement Solidarity

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Connection to broader movements | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | economic-solidarity.md |
| Strike support coordination | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻🌻 | economic-solidarity.md |
| Housing defense networks | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | economic-solidarity.md |
| Climate action coordination | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻🌻 | economic-solidarity.md |

### Group B: Communications Independence

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Ham radio network | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |
| Mesh WiFi networking | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |
| Sneakernet and physical data transfer | Medium | ✊✊✊✊✊ | 🌻🌻🌻 | future-experimental.md |

---

## Phase 16: Future Forward (Space Communism!)
*Building toward post-scarcity*

### Group A: Robot Sharing

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Robot registry | Medium | ✊✊✊ | 🌻🌻🌻🌻🌻 | resource-sharing.md |
| Cleaning robot scheduling | Medium | ✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |
| Delivery robot coordination | Complex | ✊✊✊ | 🌻🌻🌻🌻🌻 | future-experimental.md |

### Group B: Advanced Fabrication

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Fabrication job queue | Medium | ✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |
| Material recycling coordination | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | future-experimental.md |
| Mycelium manufacturing | Complex | ✊✊✊ | 🌻🌻🌻🌻🌻 | future-experimental.md |

### Group C: Sovereignty Systems

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Food sovereignty dashboard | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |
| Energy autonomy dashboard | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |
| Water independence metrics | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |
| Digital sovereignty tools | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻 | future-experimental.md |

### Group D: Prefigurative Politics

| Feature | Complexity | Liberation | Joy | Spec Reference |
|---------|------------|------------|-----|----------------|
| Temporary autonomous zones | Complex | ✊✊✊✊✊ | 🌻🌻🌻🌻🌻 | future-experimental.md |
| Street reclamation coordination | Medium | ✊✊✊✊✊ | 🌻🌻🌻🌻🌻 | future-experimental.md |
| Festival convergences | Complex | ✊✊✊✊ | 🌻🌻🌻🌻🌻 | future-experimental.md |

---

## Dependency Graph

```
PHASE 1: Liberation Infrastructure
    │   (offline-first, mesh, encryption, runs on anything)
    │
    ▼
PHASE 2: Trust Building ─────────────────────────────────────────┐
    │   (check-ins, simple sharing, needs posting)                │
    │                                                              │
    ▼                                                              │
PHASE 3: Mutual Aid Coordination                                  │
    │   (time bank, tool library, scheduling)                      │
    │                                                              │
    ├───────────────────────┬─────────────────┐                    │
    ▼                       ▼                 ▼                    │
PHASE 4: Food Security   PHASE 5: Emergency   PHASE 6: Spaces     │
    │                         │                   │                │
    └───────────┬─────────────┴───────────────────┘                │
                ▼                                                  │
          PHASE 7: Democratic Governance                          │
                │                                                  │
                ▼                                                  │
          PHASE 8: Education & Skills                             │
                │                                                  │
    ┌───────────┴───────────┐                                      │
    ▼                       ▼                                      │
PHASE 9: Energy        PHASE 10: AI Agents ◄───────────────────────┘
    │                       │              (needs trust + data)
    │                       │
    └───────────┬───────────┘
                ▼
        PHASE 11: DTN & Edge AI
                │
                ▼
        PHASE 12: Federation
                │
                ▼
        PHASE 13: Advanced AI
                │
        ┌───────┴───────┐
        ▼               ▼
PHASE 14: Housing   PHASE 15: Solidarity
        │               │
        └───────┬───────┘
                ▼
        PHASE 16: Future (Space Communism!)
```

---

## Quick Reference: Highest Liberation Features

These features most directly increase community autonomy:

| Feature | Phase | Liberation |
|---------|-------|------------|
| Offline-first architecture | 1 | ✊✊✊✊✊ |
| Meshtastic mesh networking | 1 | ✊✊✊✊✊ |
| End-to-end encryption | 1 | ✊✊✊✊✊ |
| Runs on old phones | 1 | ✊✊✊✊✊ |
| Decentralized identity | 1 | ✊✊✊✊✊ |
| Emergency alerts (offline) | 5 | ✊✊✊✊✊ |
| Mutual aid registry | 5 | ✊✊✊✊✊ |
| DTN store-and-forward | 11 | ✊✊✊✊✊ |
| Privacy-preserving AI | 11 | ✊✊✊✊✊ |
| Community land trusts | 14 | ✊✊✊✊✊ |
| Sovereignty dashboards | 16 | ✊✊✊✊✊ |

---

## Quick Reference: Highest Joy Features

These features will make people actually want to use this platform:

| Feature | Phase | Joy |
|---------|-------|-----|
| "I'm okay / Need support" buttons | 2 | 🌻🌻🌻🌻🌻 |
| Respond to community needs | 2 | 🌻🌻🌻🌻🌻 |
| Thank you / appreciation notes | 3 | 🌻🌻🌻🌻🌻 |
| Gratitude wall | 3 | 🌻🌻🌻🌻🌻 |
| Random acts of kindness log | 3 | 🌻🌻🌻🌻🌻 |
| Garden harvest listings | 4 | 🌻🌻🌻🌻🌻 |
| Seed returns with offspring | 4 | 🌻🌻🌻🌻🌻 |
| Meal train coordination | 4 | 🌻🌻🌻🌻🌻 |
| Care circle formation | 2 | 🌻🌻🌻🌻🌻 |
| Wellness buddy matching | 5 | 🌻🌻🌻🌻🌻 |
| THE RAVE PLANNER | 10 | 🌻🌻🌻🌻🌻 |

---

## Quick Reference: Simplest Quick Wins

Start here for immediate impact with minimal complexity:

| Feature | Phase | Notes |
|---------|-------|-------|
| "I'm okay" check-in buttons | 2 | Works on mesh/SMS |
| Post items to share | 2 | Spreadsheet-level simple |
| Post open requests/needs | 2 | Immediate community benefit |
| Emergency contact circles | 2 | Critical for vulnerable folks |
| Offer skills/time | 3 | Foundation of gift economy |
| Gratitude wall | 3 | Builds community feeling |
| Post available harvests | 4 | Tangible daily value |
| Seed catalog | 4 | Low-tech, high-impact |
| Community fridge locations | 4 | Direct mutual aid |

---

## Suggested Agent Team Assignments

**Team Alpha**: Liberation Infrastructure (Phase 1)
- Offline-first, CRDTs, encryption, mesh networking

**Team Beta**: Trust Building (Phase 2)
- Check-ins, care circles, simple sharing

**Team Gamma**: Mutual Aid Core (Phase 3)
- Time bank, tool library, scheduling

**Team Delta**: Food Security (Phase 4)
- Gardens, seeds, food networks

**Team Epsilon**: Emergency & Care (Phase 5)
- Rapid response, sensing, peer support

**Team Zeta**: Operations (Phase 6)
- Spaces, maintenance, chore wheel

**Team Eta**: Governance (Phase 7)
- Decision-making, conflict resolution

**Team Theta**: AI Agents (Phases 10, 13)
- Matching, coordination, automation

**Team Iota**: Networking (Phases 11, 12)
- DTN, federation, edge computing

**Team Kappa**: Solidarity (Phases 14, 15, 16)
- Housing, movements, future features

---

## Final Notes

**Liberation infrastructure first.** Without the ability to operate offline, on mesh networks, on old phones, without surveillance—we're just building another app that can be shut down, surveilled, or made inaccessible.

**Trust before automation.** AI agents are powerful, but communities need to build trust through simpler systems first. Don't automate what people don't yet understand.

**Joy is strategic.** The gratitude wall and rave planner aren't frivolous—they create the emotional bonds that make mutual aid sustainable.

**Start with the marginalized.** If it doesn't work for unhoused folks, disabled folks, rural folks, folks without stable internet—it doesn't work.

**Iterate with community.** Build, deploy, learn, improve. The communities using this should shape its evolution.

---

🌻 **The future is solarpunk** ✨

**Liberation infrastructure for the new world in the shell of the old.** ✊

