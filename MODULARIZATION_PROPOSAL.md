# Modularization Proposal: Breaking Up the Monolith

## Current State Analysis

The Solarpunk Utopia Platform is currently organized as a single TypeScript project with the following modules:

### Existing Modules (by size/complexity)
1. **src/resources** (~36 files) - Resource sharing, needs posting/browsing, tool library
2. **src/care** (~20 files) - Check-ins, emergency contacts, care circles
3. **src/network** (~9 files) - Mesh networking, DTN, adapters
4. **src/governance** (~7 files) - Bulletin board, community events
5. **src/identity** (~5 files) - DIDs, identity management
6. **src/crypto** (~4 files) - Encryption, key management
7. **src/core** (~4 files) - Database, AppManager
8. **src/sync** - Data synchronization
9. **src/time-bank** (in progress) - Time banking, scheduling
10. **src/auth** - Authentication
11. **src/reputation** - Attestations
12. **src/privacy** - Privacy controls
13. **src/storage** - Data storage
14. **src/types** - Shared types
15. **src/utils** - Shared utilities
16. **src/ui** - Shared UI components

## Modularization Strategy

### Option 1: NPM Workspace Packages (Recommended)
Convert to a monorepo with separate NPM packages. Each package can be versioned, tested, and deployed independently.

```
solarpunk-utopia-platform/
├── packages/
│   ├── core/                     # @solarpunk/core
│   ├── resources/                # @solarpunk/resources
│   ├── care/                     # @solarpunk/care
│   ├── governance/               # @solarpunk/governance
│   ├── time-bank/                # @solarpunk/time-bank
│   ├── identity/                 # @solarpunk/identity
│   ├── network/                  # @solarpunk/network
│   ├── crypto/                   # @solarpunk/crypto
│   ├── ui/                       # @solarpunk/ui
│   └── types/                    # @solarpunk/types
├── apps/
│   ├── web/                      # Main PWA
│   └── termux/                   # Termux Android app
└── package.json                  # Workspace root
```

**Benefits:**
- **Independent versioning**: Each package can have its own version
- **Selective deployment**: Deploy only changed packages
- **Easier testing**: Test packages in isolation
- **Better boundaries**: Clear dependency graphs
- **Team scalability**: Different teams can own different packages
- **Reusability**: Packages can be used in other projects

**Implementation:**
- Use NPM workspaces (already supported by npm 7+)
- No additional tools needed (no Lerna/Turborepo required)
- Each package has its own package.json, tests, build

### Option 2: Feature-Based Module Organization
Keep single package but organize by feature domains with stricter boundaries.

```
src/
├── features/
│   ├── resources/
│   │   ├── api/              # Public API
│   │   ├── components/       # UI components
│   │   ├── hooks/            # React hooks
│   │   ├── services/         # Business logic
│   │   └── types/            # Feature types
│   ├── care/
│   ├── governance/
│   └── time-bank/
├── shared/
│   ├── core/                 # Database, AppManager
│   ├── crypto/              # Encryption
│   ├── identity/            # DIDs
│   ├── network/             # Mesh, DTN
│   └── ui/                  # Shared UI
└── infrastructure/
    ├── auth/
    ├── storage/
    └── sync/
```

**Benefits:**
- **Less complexity**: Single package.json
- **Easier refactoring**: Move files without publishing
- **Simpler builds**: One build command
- **Faster iteration**: No inter-package versioning

**Drawbacks:**
- No hard boundaries (easy to violate module isolation)
- Can't version modules independently
- Entire codebase ships together

## Recommended Module Boundaries

### Core Infrastructure (Small, Stable)
**@solarpunk/core** - ~500 LOC
- Database abstraction (Automerge)
- AppManager
- Core types
- **Dependencies**: @automerge/*, idb

**@solarpunk/types** - ~300 LOC
- Shared TypeScript types
- Network types
- Data models
- **Dependencies**: None (pure types)

**@solarpunk/crypto** - ~600 LOC
- Encryption/decryption
- Key generation
- Mnemonic phrases
- **Dependencies**: @noble/*, tweetnacl

**@solarpunk/identity** - ~800 LOC
- DID management
- Identity verification
- Reputation system
- **Dependencies**: did-resolver, @solarpunk/crypto

### Feature Modules (Medium, Active Development)
**@solarpunk/resources** - ~3000 LOC
- Resource posting/browsing
- Needs system
- Tool library
- Equipment booking
- Photo uploads
- **Dependencies**: @solarpunk/core, @solarpunk/types, @solarpunk/ui

**@solarpunk/care** - ~2000 LOC
- Check-ins
- Emergency contacts
- Care circles
- Missed check-in alerts
- **Dependencies**: @solarpunk/core, @solarpunk/types, @solarpunk/ui

**@solarpunk/governance** - ~1500 LOC
- Bulletin boards
- Community events
- Group management
- **Dependencies**: @solarpunk/core, @solarpunk/types, @solarpunk/ui

**@solarpunk/time-bank** - ~2000 LOC (in progress)
- Skills offering/browsing
- Help requests
- Scheduling
- Shift management
- **Dependencies**: @solarpunk/core, @solarpunk/types, @solarpunk/ui

### Infrastructure Modules (Medium, Critical)
**@solarpunk/network** - ~1200 LOC
- Mesh networking (Meshtastic)
- DTN (Delay Tolerant Networking)
- Network adapters
- P2P sync
- **Dependencies**: @solarpunk/core

**@solarpunk/ui** - ~800 LOC
- Shared UI components
- Styling utilities
- Form components
- **Dependencies**: @solarpunk/types

## Migration Path

### Phase 1: Prepare for Separation (1-2 days)
1. Audit all imports/exports
2. Identify circular dependencies
3. Create dependency graph
4. Document public APIs for each module

### Phase 2: Create Workspace Structure (1 day)
1. Create packages/ directory
2. Set up NPM workspaces in root package.json
3. Create individual package.json for each module
4. Update tsconfig.json for project references

### Phase 3: Move Code (2-3 days)
1. Start with leaf nodes (no dependencies): types, crypto
2. Move to core infrastructure: core, identity
3. Move to feature modules: resources, care, governance
4. Move to network modules
5. Update all import paths

### Phase 4: Configure Builds (1 day)
1. Set up TypeScript project references
2. Configure build order
3. Update test configuration
4. Verify all tests pass

### Phase 5: Update CI/CD (1 day)
1. Update build scripts
2. Add per-package testing
3. Configure selective deployment
4. Update documentation

## Dependency Rules

### Strict Dependency Hierarchy
```
Layer 0 (No dependencies):
  - @solarpunk/types

Layer 1 (Types only):
  - @solarpunk/crypto

Layer 2 (Core infrastructure):
  - @solarpunk/core
  - @solarpunk/identity
  - @solarpunk/network

Layer 3 (Shared UI):
  - @solarpunk/ui

Layer 4 (Features):
  - @solarpunk/resources
  - @solarpunk/care
  - @solarpunk/governance
  - @solarpunk/time-bank

Layer 5 (Applications):
  - web (PWA)
  - termux (Android)
```

**Rules:**
- Lower layers cannot depend on higher layers
- Features cannot depend on other features (use core for communication)
- No circular dependencies
- All dependencies must be explicit in package.json

## Size Constraints

### Target Module Sizes
- **Micro modules** (<500 LOC): types, utilities
- **Small modules** (500-1500 LOC): crypto, identity, ui, network
- **Medium modules** (1500-3000 LOC): resources, care, governance, time-bank
- **Large modules** (3000-5000 LOC): core (if combined with database)

### When to Split Further
Split a module when:
- **Size**: Exceeds 5000 LOC
- **Complexity**: More than 50 files
- **Teams**: Multiple teams working on same module
- **Deployment**: Parts need different deployment schedules
- **Reusability**: Subsection useful in other projects

### Example: Further splitting @solarpunk/resources
```
@solarpunk/resources-core       (~1000 LOC)
  - Resource models
  - Basic CRUD operations

@solarpunk/resources-needs      (~800 LOC)
  - Needs posting
  - Needs browsing
  - Urgency indicators

@solarpunk/resources-tools      (~800 LOC)
  - Tool library
  - Equipment booking
  - Pickup coordination

@solarpunk/resources-ui         (~400 LOC)
  - Resource UI components
  - Photo upload UI
```

## Benefits of Modularization

### Development
- **Faster builds**: Only rebuild changed packages
- **Better testing**: Test in isolation
- **Clear ownership**: Teams own specific packages
- **Easier onboarding**: New devs start with one module

### Deployment
- **Selective updates**: Deploy only what changed
- **Progressive rollout**: Roll out features gradually
- **A/B testing**: Test different versions
- **Rollback**: Roll back individual features

### Architecture
- **Enforced boundaries**: Can't accidentally create coupling
- **Dependency clarity**: See what depends on what
- **Easier refactoring**: Changes contained to package
- **Code reuse**: Other projects can use packages

### Offline-First & Mesh Networks
- **Selective sync**: Sync only needed modules
- **Bandwidth efficiency**: Load modules on-demand
- **Storage optimization**: Cache only used features
- **Graceful degradation**: Core works without all features

## Anti-Patterns to Avoid

### 1. Too Many Packages
- Don't create package for every file
- Start with 8-12 packages, not 50
- Merge small related packages

### 2. Shared Utilities Package
- Don't create @solarpunk/utils catch-all
- Utilities belong in the module that uses them
- Extract only truly shared code

### 3. Premature Splitting
- Don't split before you have code
- Wait until module is 2000+ LOC
- Start monolithic, split when needed

### 4. Circular Dependencies
- Never allow package A → B → A
- Use events/observers for communication
- Introduce facade/mediator if needed

### 5. Tight Coupling
- Packages shouldn't know internals of others
- Only depend on public APIs
- Use dependency injection

## Implementation Checklist

- [ ] Document all current inter-module dependencies
- [ ] Create dependency graph visualization
- [ ] Identify and break circular dependencies
- [ ] Define public API for each module
- [ ] Create packages/ directory structure
- [ ] Set up NPM workspaces
- [ ] Create individual package.json files
- [ ] Move types package (no dependencies)
- [ ] Move crypto package
- [ ] Move core package
- [ ] Move identity package
- [ ] Move UI package
- [ ] Move feature packages (resources, care, governance, time-bank)
- [ ] Move network package
- [ ] Update all import paths
- [ ] Configure TypeScript project references
- [ ] Update build scripts
- [ ] Verify all tests pass
- [ ] Update CI/CD pipeline
- [ ] Update documentation
- [ ] Test builds of individual packages
- [ ] Test integration between packages

## Recommended Next Steps

1. **Start with analysis** (this document ✓)
2. **Create dependency graph**: Map all current imports
3. **Pilot with one module**: Extract @solarpunk/types first
4. **Iterate**: Extract one module per day
5. **Monitor**: Track build times, test times
6. **Optimize**: Adjust boundaries based on learnings

## Tools & Configuration

### NPM Workspaces
```json
{
  "name": "solarpunk-utopia-platform",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

### TypeScript Project References
```json
{
  "references": [
    { "path": "./packages/types" },
    { "path": "./packages/core" },
    { "path": "./packages/resources" }
  ]
}
```

### Dependency Visualization
- Use `npx madge --image graph.svg src/` to visualize dependencies
- Use `npm ls --all` to see package dependency tree

## Questions to Consider

1. **How often do modules change together?** If always, keep together
2. **Do different teams work on different areas?** Split by team ownership
3. **Are there natural boundaries?** Feature modules vs infrastructure
4. **What parts might be reused?** Crypto, identity, network are candidates
5. **What has different deployment needs?** UI vs backend logic
6. **What causes most merge conflicts?** May indicate need to split

## Conclusion

**Recommendation**: Proceed with **Option 1: NPM Workspace Packages**

Start with 8-10 packages organized by:
- Core infrastructure (types, crypto, core, identity, network)
- Feature domains (resources, care, governance, time-bank)
- Shared UI

This gives us modularity benefits without over-complicating the architecture. Each package stays under 3000 LOC, making them manageable and understandable.

The migration can happen incrementally over 1-2 weeks without disrupting ongoing Phase 3 development.
