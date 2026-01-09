# VM Created! Quick Start Guide

Your VM is now running in Frankfurt (100% renewable energy region)!

**VM Details:**
- Name: solarpunk-dev
- Zone: europe-west3-a
- External IP: 34.159.58.243
- Internal IP: 10.156.0.4
- Machine: e2-standard-2 (2 vCPU, 8GB RAM)

## Connect to Your VM

```bash
gcloud compute ssh solarpunk-dev --zone=europe-west3-a
```

## Setup Steps (Run on the VM)

### 1. Install Dependencies & Claude Code

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential

# Install Claude Code
npm install -g @anthropic/claude-code

# Verify
node --version
claude-code --version
```

### 2. Setup GitHub SSH Key

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "solarpunk-vm" -f ~/.ssh/id_ed25519 -N ""

# Start ssh-agent and add key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Display public key
cat ~/.ssh/id_ed25519.pub
```

**Copy the output and add it to GitHub:**
- Go to: https://github.com/settings/keys
- Click "New SSH key"
- Paste the key
- Click "Add SSH key"

**Test connection:**
```bash
ssh -T git@github.com
```

### 3. Clone Repository

```bash
git clone git@github.com:lizTheDeveloper/solarpunk_utopia_project.git
cd solarpunk_utopia_project
npm install
```

### 4. Login to Claude Code

```bash
claude login
```

Follow prompts to login with your Anthropic account (no API key needed).

### 5. Start Development

```bash
claude
```

## Managing Your VM

**Stop the VM (save costs):**
```bash
gcloud compute instances stop solarpunk-dev --zone=europe-west3-a
```

**Start the VM:**
```bash
gcloud compute instances start solarpunk-dev --zone=europe-west3-a
```

**Delete the VM (when done):**
```bash
gcloud compute instances delete solarpunk-dev --zone=europe-west3-a
```

## Cost Estimate
- Running: ~$50/month
- Stopped: ~$4/month (storage only)

Welcome to your renewable-powered development environment! ✊🌻
