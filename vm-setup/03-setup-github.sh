#!/bin/bash
# Setup GitHub SSH keys on the VM

set -e

echo "=========================================="
echo "GitHub SSH Key Setup"
echo "=========================================="
echo ""

# Generate SSH key
echo "Generating SSH key for GitHub..."
ssh-keygen -t ed25519 -C "solarpunk-vm-$(hostname)" -f ~/.ssh/id_ed25519 -N ""

# Start ssh-agent
echo ""
echo "Starting ssh-agent..."
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Display the public key
echo ""
echo "=========================================="
echo "Your SSH public key:"
echo "=========================================="
cat ~/.ssh/id_ed25519.pub
echo ""
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy the SSH key above"
echo "2. Go to GitHub: https://github.com/settings/keys"
echo "3. Click 'New SSH key'"
echo "4. Paste the key and give it a title (e.g., 'Solarpunk VM')"
echo "5. Click 'Add SSH key'"
echo ""
echo "After adding the key to GitHub, test the connection:"
echo "  ssh -T git@github.com"
echo ""
echo "You should see a message like:"
echo "  'Hi username! You've successfully authenticated...'"
