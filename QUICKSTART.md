# Quick Start Guide 🌻

Get the Solarpunk Utopia Platform running in 5 minutes!

---

## Prerequisites

- Node.js 18+ installed
- Modern web browser (Chrome, Firefox, Edge, Safari)

---

## Installation

```bash
# Clone or navigate to project directory
cd solarpunk_utopia_project

# Install dependencies (if not already done)
npm install
```

---

## Running the Platform

```bash
# Start development server
npm run dev
```

Open your browser to: **http://localhost:3000/**

---

## First Time Setup

### 1. Create Your Identity

When you open the app for the first time, you'll see the identity setup screen.

**Fill in:**
- **Display Name**: How you want to be known (e.g., "Alice")
- **Passphrase**: To protect your identity (min 8 characters)
- **Confirm Passphrase**: Type it again

Click **"Create Identity"**

⚠️ **Important**: Your passphrase is the only way to access your identity. Keep it safe!

### 2. Your DID is Created

The app generates a decentralized identifier (DID) for you:
- Format: `did:key:z6Mkh...`
- No email or phone required
- You control it completely
- Portable across communities

### 3. Start Using!

You're now ready to:
- Add resources to share
- Post needs
- Offer skills
- Export your data

---

## Key Features

### Add a Resource

1. Click **"Resources"** tab
2. Click **"+ Add Resource"**
3. Fill in:
   - Name (e.g., "Garden Shovel")
   - Description
   - Type (tool, equipment, space, etc.)
   - Share mode (give, lend, or share)
   - Location (optional)
4. Click **"Add Resource"**

### Post a Need

1. Click **"Needs"** tab
2. Click **"+ Post Need"**
3. Describe what you need
4. Set urgency level
5. Click **"Post Need"**

### Offer a Skill

1. Click **"Skills"** tab
2. Click **"+ Offer Skill"**
3. Name your skill
4. Describe it
5. Add categories (comma-separated)
6. Click **"Offer Skill"**

---

## Testing Offline Mode

### How to Test

1. Open DevTools (Press F12)
2. Go to **Network** tab
3. Check **"Offline"** checkbox
4. Use the app normally
5. All features still work!

### What Happens

- All data stored locally (IndexedDB)
- No degradation of functionality
- Changes sync when you go back online

---

## Exporting Your Data

### Why Export?

- Backup your identity
- Move to a new device
- Share with another community
- Data sovereignty!

### How to Export

1. Go to **"Community"** tab
2. Under "Data Sovereignty":
   - **Export as JSON** - All data, human-readable
   - **Export Resources CSV** - Spreadsheet format
   - **Download Backup** - Full binary backup
3. Under "Your Identity":
   - **Export Identity** - Your identity for backup

⚠️ **Keep identity exports secure** - they contain your private key!

---

## Importing Data

### Import Community Data

1. Go to **"Community"** tab
2. Click **"Import Data"** button
3. Select a JSON or binary backup file
4. Data is restored!

### Import Identity

(Feature available in Identity menu)

1. Have your identity export JSON file
2. Import it with your passphrase
3. All your profile data restored

---

## Peer Synchronization

### Cross-Tab Sync (Built-in)

1. Open the app in two browser tabs
2. Add data in one tab
3. It appears in the other tab instantly!
4. Uses BroadcastChannel API

### Bluetooth Sync (Experimental)

1. Go to **"Community"** tab
2. Click **"Discover Peers (Bluetooth)"**
3. Grant Bluetooth permission
4. Nearby devices with the app will appear
5. Data syncs automatically!

**Note**: Bluetooth Web API support varies by browser/platform

---

## Project Structure

```
/
├── src/
│   ├── core/           ← Database and app management
│   ├── identity/       ← DID and identity
│   ├── auth/           ← Authentication
│   ├── privacy/        ← Privacy controls
│   ├── crypto/         ← Encryption
│   ├── network/        ← Mesh networking
│   ├── export/         ← Data export/import
│   ├── types/          ← TypeScript types
│   └── ui/             ← Styles
│
├── public/             ← Static assets
├── index.html          ← Application shell
└── vite.config.ts      ← Build config
```

---

## Common Commands

```bash
# Development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview

# TypeScript check
npx tsc --noEmit
```

---

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
npm run dev -- --port 3001
```

### Database Errors

1. Open DevTools (F12)
2. Go to **Application** > **Storage**
3. Click **"Clear storage"**
4. Refresh page

### Identity Lost

If you lost your passphrase:
- No recovery possible (by design)
- Create a new identity
- This ensures security and sovereignty

### Sync Not Working

- Check that devices are on same network
- Verify Bluetooth/WiFi permissions
- Check browser console for errors

---

## Development

### Making Changes

1. Edit files in `src/`
2. Save
3. Browser auto-refreshes (hot reload)

### Adding Features

See **DEVELOPER_GUIDE.md** for:
- Code structure
- Database operations
- Adding new types
- Best practices

---

## Documentation

- **INTEGRATION_COMPLETE.md** - What's been built
- **PHASE_1_INTEGRATION.md** - Technical details
- **DEVELOPER_GUIDE.md** - Development workflow
- **README.md** - Project vision
- **ROADMAP.md** - Future features

---

## Key Concepts

### Offline-First

Everything works without internet:
- Read and write data
- Full functionality
- No "degraded mode"

### Local-First

Data lives on your device:
- Fast operations
- Privacy by design
- You own it

### CRDTs (Conflict-Free Replicated Data Types)

Magic synchronization:
- Multiple people edit
- No conflicts
- Automatic merging
- Eventual consistency

### Decentralized Identity (DID)

Your identity, your control:
- No central authority
- Cryptographic proofs
- Portable everywhere
- No phone/email needed

---

## Philosophy

**Solarpunk Values**:
- Community over profit
- Privacy by default
- User sovereignty
- Offline resilience
- Accessible to all
- Liberation, not extraction

**The Emma Goldman Test**:
> "Does this increase community autonomy, or create new dependencies?"

Every feature is designed to **increase autonomy**.

---

## Getting Help

### Check Documentation

- Read **DEVELOPER_GUIDE.md**
- Check **ROADMAP.md** for features
- See **PHASE_1_INTEGRATION.md** for technical details

### Browser Console

Press F12 and check Console tab for:
- Initialization logs
- Error messages
- Debug information

### Known Limitations

- Bluetooth Web API: Limited browser support
- WiFi Direct: Not yet standardized
- Meshtastic: Requires hardware device

---

## What's Next?

You're now running Phase 1 (complete):
- ✓ Offline-first database
- ✓ Decentralized identity
- ✓ Privacy controls
- ✓ Mesh networking foundation

**Coming Soon** (Phase 2):
- Community check-ins
- Care circles
- Resource matching
- Gratitude wall

See **ROADMAP.md** for the full plan!

---

## 🌻 You're Ready!

The platform is now running on your machine:
- **Completely offline-capable**
- **Privacy-preserving**
- **User-controlled**
- **Ready for community building**

**Start sharing resources, posting needs, and building mutual aid!**

---

**We are building the new world in the shell of the old.** ✊
