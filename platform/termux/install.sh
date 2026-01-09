#!/data/data/com.termux/files/usr/bin/bash
#
# Solarpunk Utopia Platform - Termux Installation Script
#
# This script installs the Solarpunk Platform on Android devices via Termux
# Designed for devices with limited resources (Android 5+, < 2GB RAM)
#
# Usage:
#   bash install.sh
#
# Requirements:
#   - Termux app installed
#   - Internet connection for initial setup (optional after install)
#   - ~100MB free storage

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════╗"
echo "║   Solarpunk Utopia Platform - Termux Setup   ║"
echo "║   Liberation Infrastructure for Mutual Aid    ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    echo -e "${RED}Error: This script must be run in Termux${NC}"
    echo "Install Termux from F-Droid: https://f-droid.org/en/packages/com.termux/"
    exit 1
fi

echo -e "${BLUE}[1/7] Checking system requirements...${NC}"

# Check available storage
available_storage=$(df -h "$HOME" | tail -1 | awk '{print $4}')
echo "Available storage: $available_storage"

# Check available memory
if command -v free &> /dev/null; then
    total_mem=$(free -m | grep Mem | awk '{print $2}')
    echo "Total memory: ${total_mem}MB"

    if [ "$total_mem" -lt 1024 ]; then
        echo -e "${YELLOW}Warning: Low memory detected. Platform will run in low-resource mode.${NC}"
    fi
fi

echo -e "${BLUE}[2/7] Updating package repositories...${NC}"
pkg update -y

echo -e "${BLUE}[3/7] Installing required packages...${NC}"
# Install minimal dependencies
pkg install -y \
    nodejs \
    python \
    termux-api \
    termux-services \
    openssl

echo -e "${BLUE}[4/7] Setting up platform directories...${NC}"
# Create platform directory structure
PLATFORM_DIR="$HOME/solarpunk-platform"
mkdir -p "$PLATFORM_DIR"/{data,logs,cache,backups}

# Set up data directory with appropriate permissions
chmod 700 "$PLATFORM_DIR/data"

echo -e "${BLUE}[5/7] Installing platform files...${NC}"
# Copy platform files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -r "$SCRIPT_DIR/../src/public/"* "$PLATFORM_DIR/"

# Create configuration file
cat > "$PLATFORM_DIR/config.json" << EOF
{
  "version": "0.1.0",
  "mode": "termux",
  "dataDir": "$PLATFORM_DIR/data",
  "logsDir": "$PLATFORM_DIR/logs",
  "cacheDir": "$PLATFORM_DIR/cache",
  "backupsDir": "$PLATFORM_DIR/backups",
  "server": {
    "port": 8080,
    "host": "127.0.0.1"
  },
  "offline": {
    "enabled": true,
    "syncOnConnect": true
  },
  "battery": {
    "lowPowerThreshold": 20,
    "enableOptimizations": true
  },
  "storage": {
    "maxCacheSizeMB": 50,
    "maxDataSizeMB": 200
  },
  "mesh": {
    "enabled": false,
    "meshtasticPort": null
  }
}
EOF

echo -e "${BLUE}[6/7] Setting up web server...${NC}"
# Create simple Node.js server for local hosting
cat > "$PLATFORM_DIR/server.js" << 'SERVERJS'
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const PORT = config.server.port;
const HOST = config.server.host;

// MIME types for proper content serving
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Serve index.html for root
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  // Check if file exists
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      // File not found
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('404 Not Found\n');
      return;
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('500 Internal Server Error\n');
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      // Cache control for better offline support
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Solarpunk Platform running at http://${HOST}:${PORT}/`);
  console.log('Press Ctrl+C to stop');
});
SERVERJS

echo -e "${BLUE}[7/7] Creating startup scripts...${NC}"

# Create startup script
cat > "$PLATFORM_DIR/start.sh" << 'STARTSH'
#!/data/data/com.termux/files/usr/bin/bash

# Start Solarpunk Platform
PLATFORM_DIR="$HOME/solarpunk-platform"
cd "$PLATFORM_DIR"

# Log startup
echo "$(date): Starting Solarpunk Platform" >> logs/startup.log

# Check battery level and enable low-power mode if needed
if command -v termux-battery-status &> /dev/null; then
    battery_level=$(termux-battery-status | grep -oP '"percentage":\s*\K\d+')
    if [ "$battery_level" -lt 20 ]; then
        echo "Low battery detected ($battery_level%). Enabling power-saving mode."
        export LOW_POWER_MODE=1
    fi
fi

# Start server
echo "Starting web server on http://127.0.0.1:8080"
node server.js
STARTSH

chmod +x "$PLATFORM_DIR/start.sh"

# Create stop script
cat > "$PLATFORM_DIR/stop.sh" << 'STOPSH'
#!/data/data/com.termux/files/usr/bin/bash

# Stop Solarpunk Platform
pkill -f "node server.js"
echo "Solarpunk Platform stopped"
STOPSH

chmod +x "$PLATFORM_DIR/stop.sh"

# Create shortcut script for easy access
cat > "$HOME/../usr/bin/solarpunk" << SHORTCUT
#!/data/data/com.termux/files/usr/bin/bash

case "\$1" in
    start)
        cd "$PLATFORM_DIR" && ./start.sh
        ;;
    stop)
        "$PLATFORM_DIR/stop.sh"
        ;;
    restart)
        "$PLATFORM_DIR/stop.sh"
        sleep 2
        cd "$PLATFORM_DIR" && ./start.sh
        ;;
    status)
        if pgrep -f "node server.js" > /dev/null; then
            echo "Solarpunk Platform is running"
            echo "Access at: http://127.0.0.1:8080"
        else
            echo "Solarpunk Platform is not running"
        fi
        ;;
    logs)
        tail -f "$PLATFORM_DIR/logs/startup.log"
        ;;
    *)
        echo "Usage: solarpunk {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
SHORTCUT

chmod +x "$HOME/../usr/bin/solarpunk"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "Platform installed to: ${BLUE}$PLATFORM_DIR${NC}"
echo ""
echo "To start the platform:"
echo -e "  ${YELLOW}solarpunk start${NC}"
echo ""
echo "Then open in your browser:"
echo -e "  ${YELLOW}http://127.0.0.1:8080${NC}"
echo ""
echo "Other commands:"
echo -e "  ${YELLOW}solarpunk stop${NC}      - Stop the platform"
echo -e "  ${YELLOW}solarpunk restart${NC}   - Restart the platform"
echo -e "  ${YELLOW}solarpunk status${NC}    - Check if running"
echo -e "  ${YELLOW}solarpunk logs${NC}      - View logs"
echo ""
echo -e "${GREEN}Building the new world in the shell of the old ✊${NC}"
echo ""

# Offer to start now
read -p "Start the platform now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$PLATFORM_DIR"
    ./start.sh
fi
