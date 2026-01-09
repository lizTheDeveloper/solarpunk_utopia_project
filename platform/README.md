# Solarpunk Utopia Platform

**Liberation infrastructure for building post-scarcity communities**

A Progressive Web App and Termux-compatible platform for mutual aid, gift economy, and resource sharing—without money, surveillance, or corporate dependencies.

## Features (Phase I: Liberation Infrastructure)

✅ **Progressive Web App**
- Installable on any device
- Offline-first architecture
- Works without internet

✅ **Runs on Anything**
- Old Android phones (Android 5+)
- Termux installation for full control
- < 500MB RAM footprint
- Battery optimized for solar charging

✅ **Offline-First**
- Full functionality without internet
- Service worker caching
- IndexedDB local storage
- Background sync when online

✅ **Battery Efficient**
- Adaptive performance modes
- Wake lock management
- Background task throttling
- Solar charging compatible

## Quick Start

### For Web Browsers

1. Visit the platform URL
2. Install as PWA (Add to Home Screen)
3. Works offline after first load

### For Termux (Android)

See [platform/termux/README.md](./termux/README.md) for detailed instructions.

Quick install:
```bash
pkg update && pkg install git
git clone [repository-url]
cd solarpunk-utopia-platform/platform/termux
bash install.sh
```

## Development

### Prerequisites

- Node.js 12+ (for building)
- Modern browser for testing

### Setup

```bash
cd platform
npm install  # (currently no dependencies!)
```

### Development Server

Start a simple dev server:

```bash
npm run dev
```

Open http://localhost:8080

### Build for Production

```bash
npm run build:prod
```

Output goes to `platform/dist/`

### Serve Production Build

```bash
npm run serve
```

### Check Bundle Size

```bash
npm run test:size
```

Target: < 500 KB total

## Architecture

### Technology Choices

**Why PWA?**
- Cross-platform (works everywhere)
- Offline-first by design
- No app store required
- Installable and updates automatically

**Why Termux?**
- Runs on old Android devices
- No dependency on Google Play
- Full control over installation
- Can run background services

**Why No Framework?**
- Minimal bundle size
- Works on old browsers
- Battery efficient
- Fast loading on slow networks
- No build complexity

### File Structure

```
platform/
├── src/
│   ├── public/          # Static assets
│   │   ├── index.html   # Main HTML shell
│   │   ├── manifest.json # PWA manifest
│   │   └── sw.js        # Service worker
│   ├── scripts/         # JavaScript modules
│   │   ├── app.js       # Main application
│   │   └── battery-utils.js # Battery optimization
│   └── styles/          # CSS
│       └── main.css     # Main styles
├── termux/              # Termux installation
│   ├── install.sh       # Installation script
│   └── README.md        # Termux documentation
├── dist/                # Built output
├── build.js             # Build script
└── package.json         # Project metadata
```

### Browser Compatibility

Targets:
- Android 5.0+ (WebView)
- Chrome 49+
- Firefox 52+
- Safari 10+
- Edge 14+

### Performance Targets

- **First Load**: < 200 KB
- **Total Bundle**: < 500 KB
- **Memory Usage**: < 500 MB
- **Battery**: 7-day operation on solar charging
- **Lighthouse Score**: 90+

## Battery Optimization

The platform includes comprehensive battery optimization:

### Automatic Power Modes

- **Normal**: Full functionality
- **Low Power** (< 20%): Reduced animations, less frequent sync
- **Critical** (< 10%): Minimal functionality, essential only

### Features

- Battery level monitoring
- Adaptive performance
- Wake lock management
- Background task throttling
- Solar charging optimization

### Usage

```javascript
// Check battery state
const state = SolarpunkBattery.getState();
console.log(`Battery: ${state.level * 100}%`);

// Register callbacks
SolarpunkBattery.onLowPower(state => {
  console.log('Low power mode activated');
});

// Manually enable low power mode
SolarpunkBattery.enableLowPowerMode();
```

## Offline Operation

### Service Worker

Implements cache-first strategy:
1. Try cache first (fast on slow devices)
2. Fall back to network
3. Cache successful responses
4. Offline fallback for errors

### Storage

- **IndexedDB**: Structured data, offline-first
- **localStorage**: Simple key-value, fallback
- **Cache API**: Static assets via service worker

### Background Sync

Queues operations when offline, syncs when connection returns.

## Design Principles

### The Emma Goldman Test

> "Does this increase community autonomy, or create new dependencies?"

Every feature is evaluated against this question.

### Values

1. **Liberation First**: Tools that free us, not extract from us
2. **No Surveillance**: Privacy by design, not afterthought
3. **Accessible**: Works for everyone, especially marginalized communities
4. **Resilient**: Functions during disasters, protests, infrastructure failure
5. **Community Owned**: No corporate control, no monetization

### Anti-Patterns We Avoid

❌ Cloud dependencies
❌ User tracking
❌ Monetization features
❌ Cryptocurrency/blockchain
❌ Surveillance
❌ Planned obsolescence

### Patterns We Embrace

✅ Local-first
✅ Offline-first
✅ Peer-to-peer
✅ End-to-end encryption
✅ Data sovereignty
✅ Interoperability

## Roadmap

This implements **Phase I, Group C** from the main roadmap:

- [x] Progressive Web App shell
- [x] Termux installation package
- [x] Minimal resource footprint
- [x] Old phone support (Android 5+)
- [x] Battery optimization
- [x] Energy efficiency

### Next Steps

**Phase I, Group A** - Offline-First Core:
- Local-first data storage (CRDTs)
- Basic CRDT implementation
- Data export functionality
- End-to-end encryption

**Phase I, Group B** - Mesh & Resilient Networking:
- Meshtastic integration
- LoRa message relay
- WiFi Direct sync
- Bluetooth proximity sync

See [ROADMAP.md](../ROADMAP.md) for full plan.

## Testing

### Manual Testing Checklist

- [ ] Install as PWA on mobile device
- [ ] Works offline after first load
- [ ] Service worker caches assets
- [ ] Battery API integration works
- [ ] Low power mode activates
- [ ] IndexedDB stores data
- [ ] Responsive on small screens
- [ ] Accessible (screen readers, keyboard)

### Low-Resource Testing

Test on devices with:
- < 2GB RAM
- Slow CPU (old phones)
- Slow network (3G)
- Limited storage

### Battery Testing

- Monitor battery drain over 24 hours
- Test low power mode activation
- Verify wake lock releases
- Check background task throttling

## Contributing

This project uses OpenSpec for specification-driven development.

1. Review specs in `../OpenSpec/specs/platform/`
2. Propose changes via OpenSpec workflow
3. Align with solarpunk values
4. Test on low-resource devices
5. Submit pull request

## License

AGPL-3.0-or-later

This is free software for liberation, not profit.

## Support

- GitHub Issues: [link]
- Matrix Chat: [link]
- Documentation: [link]

## Philosophy

> "We are building the new world in the shell of the old."

This platform is infrastructure for liberation. It's designed to work when centralized systems fail, to be accessible to everyone regardless of resources, and to increase community autonomy rather than create new dependencies.

**Building the new world in the shell of the old** ✊

## Acknowledgments

Built on principles from:
- Solarpunk movement
- Mutual aid networks
- Gift economy traditions
- Appropriate technology
- Platform cooperativism
- Digital commons
