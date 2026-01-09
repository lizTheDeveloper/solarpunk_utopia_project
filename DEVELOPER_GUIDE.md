# Developer Guide - Solarpunk Utopia Platform

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:3000/

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Development Workflow

### 1. Local Development

The dev server provides:
- Hot module replacement (instant updates)
- TypeScript type checking
- Source maps for debugging
- PWA service worker in dev mode

### 2. Testing Features

**Test Offline Mode**:
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Verify all features still work

**Test Data Persistence**:
1. Add some resources/needs/skills
2. Close browser tab
3. Reopen http://localhost:3000/
4. Verify data is still there

**Test Export/Import**:
1. Add data to the platform
2. Go to Community tab
3. Export as JSON
4. Clear browser storage (DevTools > Application > Clear storage)
5. Import the JSON file
6. Verify data is restored

### 3. Project Structure

```
src/
├── core/           # Core database and CRDT logic
│   ├── database.ts
│   └── database.test.ts
├── crypto/         # Encryption utilities
│   └── encryption.ts
├── export/         # Data export/import
│   └── export.ts
├── types/          # TypeScript type definitions
│   ├── index.ts
│   └── tweetnacl-util.d.ts
├── ui/             # User interface
│   └── styles.css
└── main.ts         # Application entry point
```

---

## Key Concepts

### Local-First Architecture

- **All data stored locally** in IndexedDB
- **No server required** for core functionality
- **Offline-first** - network is optional, not required
- **CRDTs** enable conflict-free peer synchronization

### CRDT Synchronization

```typescript
// Export current state
const binary = db.getBinary();

// Merge remote changes
await db.merge(remoteBinary);

// Changes automatically resolve conflicts
```

### Data Models

**Resource**: Physical items, tools, spaces, energy
```typescript
interface Resource {
  name: string;
  description: string;
  resourceType: 'tool' | 'equipment' | 'space' | ...;
  shareMode: 'give' | 'lend' | 'share';
  available: boolean;
  ownerId: string;
  location?: string;
}
```

**Need**: Community needs and requests
```typescript
interface Need {
  userId: string;
  description: string;
  urgency: 'casual' | 'helpful' | 'needed' | 'urgent';
  fulfilled: boolean;
}
```

**SkillOffer**: Time bank skills
```typescript
interface SkillOffer {
  userId: string;
  skillName: string;
  description: string;
  categories: string[];
  available: boolean;
}
```

---

## Working with the Database

### Basic Operations

```typescript
import { db } from './core/database';

// Initialize (do once at app startup)
await db.init();

// Add a resource
const resource = await db.addResource({
  name: 'Garden Shovel',
  description: 'Heavy-duty shovel',
  resourceType: 'tool',
  shareMode: 'lend',
  available: true,
  ownerId: 'user-123',
});

// List all resources
const resources = db.listResources();

// Update a resource
await db.updateResource(resource.id, {
  available: false,
});

// Delete a resource
await db.deleteResource(resource.id);
```

### Subscribing to Changes

```typescript
// Listen for any database changes
const unsubscribe = db.onChange((doc) => {
  console.log('Database updated:', doc);
  // Re-render UI, etc.
});

// Later: stop listening
unsubscribe();
```

### Synchronization

```typescript
// Get binary for sending to peer
const binary = db.getBinary();

// Receive and merge peer's data
await db.merge(peerBinary);

// CRDTs automatically resolve conflicts!
```

---

## Encryption Usage

### Generating Keys

```typescript
import { generateKeyPair } from './crypto/encryption';

// Generate a key pair for a user
const keyPair = generateKeyPair();
// Save keyPair.publicKey (shareable)
// Save keyPair.secretKey (private!)
```

### Encrypting Messages

```typescript
import { encryptMessage, decryptMessage } from './crypto/encryption';

// Alice encrypts for Bob
const encrypted = encryptMessage(
  "Let's coordinate garden work tomorrow!",
  bobPublicKey,
  aliceSecretKey
);

// Bob decrypts
const message = decryptMessage(
  encrypted,
  bobSecretKey
);
```

### Local Data Encryption

```typescript
import {
  encryptSymmetric,
  decryptSymmetric,
  deriveKeyFromPassword
} from './crypto/encryption';

// Encrypt sensitive local data
const key = deriveKeyFromPassword('user-password');
const { ciphertext, nonce } = encryptSymmetric('sensitive data', key);

// Decrypt
const data = decryptSymmetric(ciphertext, nonce, key);
```

---

## Adding New Features

### 1. Add Type Definitions

Edit `src/types/index.ts`:

```typescript
export interface MyNewType {
  id: string;
  // ... fields
  createdAt: number;
}

// Add to schema
export interface DatabaseSchema {
  // ... existing
  myNewThings: Record<string, MyNewType>;
}
```

### 2. Add Database Methods

Edit `src/core/database.ts`:

```typescript
async addMyNewThing(data: Omit<MyNewType, 'id' | 'createdAt'>): Promise<MyNewType> {
  const newThing: MyNewType = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  await this.update((doc) => {
    doc.myNewThings[newThing.id] = newThing;
  });

  return newThing;
}

listMyNewThings(): MyNewType[] {
  return Object.values(this.getDoc().myNewThings);
}
```

### 3. Add UI

Edit `src/main.ts` to add rendering and interaction.

### 4. Add Tests

Edit `src/core/database.test.ts`:

```typescript
describe('MyNewThing Operations', () => {
  it('should add a new thing', async () => {
    const thing = await db.addMyNewThing({
      // ... data
    });
    expect(thing.id).toBeDefined();
  });
});
```

---

## Troubleshooting

### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database not persisting
- Check browser storage quota
- Check IndexedDB in DevTools > Application > Storage
- Try different browser

### Type errors
```bash
# Rebuild TypeScript
npx tsc --noEmit
```

### PWA not working
- PWA only works in production build or HTTPS
- Use `npm run build && npm run preview` to test

---

## Best Practices

### 1. Offline-First Mindset
- Assume network is unavailable
- Never block UI on network requests
- Always work with local data first

### 2. Privacy by Design
- Encrypt sensitive data
- Minimize data collection
- Give users control

### 3. Performance
- Lazy-load features
- Minimize database reads
- Cache computed values

### 4. Accessibility
- Semantic HTML
- Keyboard navigation
- Screen reader support
- Mobile-first design

---

## Resources

**CRDT / Automerge**:
- [Automerge Docs](https://automerge.org/)
- [CRDT Explained](https://crdt.tech/)

**Progressive Web Apps**:
- [PWA Docs](https://web.dev/progressive-web-apps/)
- [Workbox](https://developers.google.com/web/tools/workbox)

**Cryptography**:
- [TweetNaCl.js](https://github.com/dchest/tweetnacl-js)
- [NaCl Crypto Primer](https://nacl.cr.yp.to/)

**Project Philosophy**:
- See `README.md` for vision and values
- See `ROADMAP.md` for development priorities
- See `OpenSpec/specs/platform/` for detailed specifications

---

## Contributing

### Before Starting
1. Read `CLAUDE.md` for project guidance
2. Review relevant specs in `OpenSpec/specs/platform/`
3. Follow the OpenSpec workflow for changes

### Development Process
1. Create a branch for your feature
2. Write tests first (TDD)
3. Implement feature
4. Ensure all tests pass
5. Update documentation
6. Submit PR with clear description

### Code Style
- Use TypeScript strict mode
- Follow existing naming conventions
- Comment complex logic
- Keep functions small and focused

---

🌻 **Happy coding! Let's build liberation infrastructure together.** ✊
