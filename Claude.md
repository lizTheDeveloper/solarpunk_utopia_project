# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Solarpunk Utopia Platform is infrastructure for building post-scarcity communities based on mutual aid, gift economy, and resource sharing. This is a **specification-driven project** currently in the design phase—implementation has not yet begun.

## Core Philosophy

- **Non-Monetary**: No money, no crypto, no tokens. Pure gift economy and mutual aid.
- **Liberation Technology**: Tools that increase community autonomy, not dependencies.
- **Offline-First**: Must work without internet, during disasters, for marginalized communities.
- **Privacy-Preserving**: Local-first, federated, with user data sovereignty.
- **Accessible**: Designed to run on old phones via Termux.

When working on this project, always apply **The Emma Goldman Test**: *"Does this increase community autonomy, or create new dependencies?"*

## Development Approach: OpenSpec Workflow

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec/) for spec-driven development. OpenSpec is an AI-native system for managing specifications and changes.

### Key Commands

```bash
# List all specifications
npx openspec list --specs

# View a specific spec
npx openspec show spec <spec-name>

# Create a new change proposal
npx openspec change create

# List all changes (proposals)
npx openspec list

# Show a specific change
npx openspec show change <change-name>

# Validate a change
npx openspec validate <change-name>

# Archive a completed change (merges into main spec)
npx openspec archive <change-name>

# View interactive dashboard
npx openspec view
```

### OpenSpec Workflow

1. **Review Existing Specs**: Always check `OpenSpec/specs/platform/` before implementing features
2. **Create Change Proposals**: Use `openspec change create` for new features or modifications
3. **Validate Changes**: Run `openspec validate` to ensure changes follow spec conventions
4. **Implement**: Build features according to the validated spec
5. **Archive**: Use `openspec archive` to merge completed changes back into main specs

### Specification Structure

All platform specifications live in `OpenSpec/specs/platform/`:

**Core Specs:**
- `core-platform.md` - Core principles, values, and capabilities
- `resource-sharing.md` - Physical items, tools, spaces, energy, robots
- `time-bank.md` - Skill sharing, volunteer coordination, mutual aid time
- `ai-agents.md` - AI coordination, matching, fulfillment, event planning
- `ai-agent-integration.md` - Comprehensive AI/LLM agent integration strategy
- `community-governance.md` - Governance, spaces, education, cooperatives
- `deployment-integration.md` - Termux, offline, mesh, protocols, federation
- `community-care.md` - Check-ins, distributed sensing, food security, emergencies

**Extended Specs:**
- `food-agriculture.md` - Seed libraries, urban farming, food preservation
- `energy-infrastructure.md` - Renewable energy systems, alternative transportation
- `water-ecology.md` - Water commons, ecosystem restoration, circular economy
- `housing-built-environment.md` - Co-housing, natural building, public space
- `culture-technology-health.md` - Archives, maker spaces, open source tech, health systems
- `economic-solidarity.md` - Worker cooperatives, solidarity economy
- `future-experimental.md` - Future tech, drones/robots, prefigurative politics

## Key Reference Documents

- **README.md** - Full vision, values, and feature overview
- **ROADMAP.md** - Implementation roadmap ordered by anti-capitalist value chain (liberation infrastructure first)
- **AI_AGENT_STRATEGY.md** - 10 specialized AI agents and how they coordinate community life
- **ADDITIONAL_FEATURES.md** - Inspiration document for extended features
- **SPECIFICATIONS_SUMMARY.md** - Summary of all specifications

## Technical Architecture

### Planned Stack (Not Yet Implemented)

- **Data Layer**: Local-first with CRDTs, peer-to-peer sync
- **Frontend**: Progressive Web App + Termux on Android
- **Protocols**: ActivityPub federation, Meshtastic mesh, Delay Tolerant Networking (DTN)
- **AI**: Open source models, privacy-preserving, community-controlled
- **Identity**: Decentralized identifiers (DIDs), user-controlled reputation

### Build Priorities

The roadmap follows liberation-first principles:

1. **Phase 1: Liberation Infrastructure** - Offline-first, mesh networking, encryption
2. **Phase 2: Trust Building** - Simple features that create community bonds
3. **Phase 3: Mutual Aid Capacity** - Coordination tools that multiply collective capacity

Features are rated by:
- **Liberation Rating (✊)**: How much this increases community autonomy
- **Joy Rating (🌻)**: How much delight this brings to users

## Current State

This project is **in the specification phase**. There is no implementation code yet—only:
- Comprehensive specifications in `OpenSpec/specs/platform/`
- OpenSpec tooling (installed as dependency)
- Documentation describing the vision and approach

## When Implementing Features

1. **Always read the relevant spec first** - Don't propose changes to specs you haven't read
2. **Follow solarpunk values** - Community ownership, privacy, accessibility, resilience
3. **Prioritize liberation** - Offline-first, mesh networking, and autonomy over convenience
4. **Avoid over-engineering** - Build only what's needed, no premature abstractions
5. **No surveillance** - Never add tracking, analytics, or data collection
6. **No dependencies on corporate infrastructure** - No cloud services, no proprietary APIs

## What NOT to Do

- Don't add cryptocurrency, blockchain, or tokens
- Don't add user tracking, analytics, or surveillance features
- Don't optimize for "scale" or "growth" - optimize for community care
- Don't create dependencies on cloud services or corporate infrastructure
- Don't add monetization features or marketplace functionality
- Don't sacrifice privacy for convenience

## Contributing Approach

When contributing to this project:
- Review existing specs thoroughly before proposing changes
- Use OpenSpec workflow for all changes (proposal → review → implement → archive)
- Align with solarpunk values and anti-capitalist principles
- Test accessibility and offline-first functionality
- Document with liberation and mutual aid in mind

## Project Dependencies

- `@fission-ai/openspec` - Spec-driven development tooling

The OpenSpec package is a submodule/dependency that provides the specification management CLI.
