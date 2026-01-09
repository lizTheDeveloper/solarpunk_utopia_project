# Solarpunk Platform - Termux Installation

This directory contains installation scripts for running the Solarpunk Utopia Platform on Android devices via Termux.

## Why Termux?

- **Accessibility**: Run on any Android device, including old phones (Android 5+)
- **Liberation Infrastructure**: No dependency on Google Play Store
- **Offline-First**: Fully functional without constant internet
- **Low Resource**: Optimized for devices with < 2GB RAM

## Prerequisites

1. **Install Termux**
   - Download from F-Droid: https://f-droid.org/en/packages/com.termux/
   - Do NOT use Google Play version (outdated)

2. **Install Termux:API** (optional, for battery monitoring)
   - Download from F-Droid: https://f-droid.org/en/packages/com.termux.api/

3. **Requirements**
   - Android 5.0 or higher
   - ~100MB free storage
   - Internet connection for initial setup (offline after)

## Installation

1. Open Termux

2. Update packages:
   ```bash
   pkg update && pkg upgrade
   ```

3. Install git and curl:
   ```bash
   pkg install git curl
   ```

4. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/solarpunk-utopia-platform.git
   cd solarpunk-utopia-platform/platform/termux
   ```

5. Run installation script:
   ```bash
   bash install.sh
   ```

6. Follow the prompts

## Usage

After installation, you can control the platform with these commands:

```bash
# Start the platform
solarpunk start

# Stop the platform
solarpunk stop

# Restart
solarpunk restart

# Check status
solarpunk status

# View logs
solarpunk logs
```

## Access the Platform

Once started, open your browser and navigate to:

```
http://127.0.0.1:8080
```

Or use Termux's built-in browser:

```bash
termux-open-url http://127.0.0.1:8080
```

## Automatic Startup

To start the platform automatically when Termux opens:

1. Install Termux:Boot from F-Droid

2. Create boot script:
   ```bash
   mkdir -p ~/.termux/boot
   cat > ~/.termux/boot/solarpunk.sh << 'EOF'
   #!/data/data/com.termux/files/usr/bin/bash
   termux-wake-lock
   solarpunk start
   EOF
   chmod +x ~/.termux/boot/solarpunk.sh
   ```

3. Reboot device to test

## Running as Background Service

To keep the platform running even when Termux is closed:

```bash
# Install termux-services
pkg install termux-services

# Restart Termux, then enable the service
sv-enable solarpunk
```

## Battery Optimization

The platform includes automatic battery optimizations:

- **Low battery mode** activates below 20%
- Reduces background sync
- Minimizes UI animations
- Batches network operations

You can manually enable low-power mode:

```bash
LOW_POWER_MODE=1 solarpunk start
```

## Mesh Networking with Meshtastic

To enable mesh networking (requires Meshtastic device):

1. Connect Meshtastic device via Bluetooth or USB

2. Edit configuration:
   ```bash
   nano ~/solarpunk-platform/config.json
   ```

3. Enable mesh networking:
   ```json
   {
     "mesh": {
       "enabled": true,
       "meshtasticPort": "/dev/ttyUSB0"
     }
   }
   ```

4. Restart platform:
   ```bash
   solarpunk restart
   ```

## Troubleshooting

### Platform won't start

Check logs:
```bash
cat ~/solarpunk-platform/logs/startup.log
```

### Out of storage

Clear cache:
```bash
rm -rf ~/solarpunk-platform/cache/*
```

### Port already in use

Find and kill the process:
```bash
lsof -ti:8080 | xargs kill -9
```

Or change the port in config.json

### Low memory errors

1. Close other apps
2. Reduce cache size in config.json
3. Enable low-power mode

## Backup and Restore

### Backup
```bash
cd ~/solarpunk-platform
tar -czf ~/solarpunk-backup-$(date +%Y%m%d).tar.gz data/
```

### Restore
```bash
cd ~/solarpunk-platform
tar -xzf ~/solarpunk-backup-YYYYMMDD.tar.gz
```

## Updating

```bash
cd ~/solarpunk-utopia-platform
git pull
cd platform/termux
bash install.sh
```

## Uninstall

```bash
solarpunk stop
rm -rf ~/solarpunk-platform
rm ~/usr/bin/solarpunk
```

## Security Notes

- Platform runs locally (127.0.0.1) by default
- All data stored in encrypted form when possible
- Use VPN or Tor for external network access if needed
- Regular backups recommended

## Community Support

- GitHub Issues: [link]
- Matrix Chat: [link]
- Documentation: [link]

## License

This is free software for liberation, not profit.

Building the new world in the shell of the old ✊
