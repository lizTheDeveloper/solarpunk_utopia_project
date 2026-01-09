#!/bin/bash
# Setup script for Ubuntu 22.04 VM - Run this on the VM after creation

set -e

echo "=========================================="
echo "Solarpunk Utopia VM Setup"
echo "=========================================="
echo ""

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install essential tools
echo "Installing essential tools..."
sudo apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  ca-certificates \
  gnupg \
  lsb-release

# Install Node.js (using NodeSource repository for latest LTS)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
echo ""
echo "Verifying installations..."
node --version
npm --version
git --version

# Install Claude Code CLI
echo ""
echo "Installing Claude Code..."
sudo npm install -g @anthropic-ai/claude-code

# Verify Claude Code installation
echo ""
echo "Verifying Claude Code installation..."
claude --version

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set up GitHub SSH keys: bash 03-setup-github.sh"
echo "2. Clone your repository: bash 04-migrate-repo.sh"
echo "3. Log in to Claude Code: claude login"
