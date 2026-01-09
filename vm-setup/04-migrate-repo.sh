#!/bin/bash
# Clone and setup the Solarpunk Utopia repository

set -e

REPO_URL="git@github.com:lizTheDeveloper/solarpunk_utopia_project.git"
REPO_DIR="$HOME/solarpunk_utopia_project"

echo "=========================================="
echo "Repository Migration"
echo "=========================================="
echo ""

# Test GitHub SSH connection first
echo "Testing GitHub SSH connection..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
  echo "✓ GitHub SSH connection successful"
else
  echo "✗ GitHub SSH connection failed"
  echo ""
  echo "Please ensure you've added your SSH key to GitHub:"
  echo "1. Run: cat ~/.ssh/id_ed25519.pub"
  echo "2. Copy the output"
  echo "3. Add it at: https://github.com/settings/keys"
  exit 1
fi

echo ""
echo "Cloning repository..."
git clone $REPO_URL $REPO_DIR

echo ""
echo "Installing project dependencies..."
cd $REPO_DIR
npm install

echo ""
echo "=========================================="
echo "Migration complete!"
echo "=========================================="
echo ""
echo "Repository location: $REPO_DIR"
echo ""
echo "Next steps:"
echo "1. cd $REPO_DIR"
echo "2. Log in to Claude Code: claude-code login"
echo "3. Start Claude Code: claude-code"
echo ""
echo "Your solarpunk revolution can now continue from the VM! ✊🌻"
