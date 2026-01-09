# VM Setup Instructions for Solarpunk Utopia Project

This guide will help you migrate your development environment to a Google Cloud VM running in a 100% renewable energy region (Frankfurt, Germany).

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed on your local machine
- GitHub account

## Step 1: Create the VM (Run on your local machine)

```bash
cd vm-setup
chmod +x *.sh
./01-create-vm.sh
```

This creates an **e2-standard-2** VM (2 vCPU, 8GB RAM) in **europe-west3 (Frankfurt)** - a region powered by 100% renewable energy.

**Cost estimate:** ~$50/month (can be reduced with sustained use discounts)

## Step 2: Connect to the VM

```bash
gcloud compute ssh solarpunk-dev --zone=europe-west3-a
```

## Step 3: Setup the VM (Run on the VM)

Once connected to the VM, download the setup script:

```bash
# Download the setup script
curl -o setup.sh https://raw.githubusercontent.com/lizTheDeveloper/solarpunk_utopia_project/main/vm-setup/02-setup-vm.sh

# Or if you prefer to copy it manually, create it with your editor
nano setup.sh
# (paste the contents of 02-setup-vm.sh)

# Make it executable and run it
chmod +x setup.sh
./setup.sh
```

This installs:
- Node.js 20 (LTS)
- npm
- Git
- Build tools
- Claude Code CLI

## Step 4: Setup GitHub SSH Keys (Run on the VM)

```bash
# Create the SSH key setup script
curl -o setup-github.sh https://raw.githubusercontent.com/lizTheDeveloper/solarpunk_utopia_project/main/vm-setup/03-setup-github.sh

# Or create manually
nano setup-github.sh
# (paste the contents of 03-setup-github.sh)

chmod +x setup-github.sh
./setup-github.sh
```

This will:
1. Generate an SSH key
2. Display the public key

**Important:** Copy the SSH public key and add it to GitHub:
- Go to: https://github.com/settings/keys
- Click "New SSH key"
- Paste the key
- Give it a title like "Solarpunk VM"
- Click "Add SSH key"

Test the connection:
```bash
ssh -T git@github.com
```

You should see: "Hi [username]! You've successfully authenticated..."

## Step 5: Clone the Repository (Run on the VM)

```bash
# Create the migration script
curl -o migrate-repo.sh https://raw.githubusercontent.com/lizTheDeveloper/solarpunk_utopia_project/main/vm-setup/04-migrate-repo.sh

# Or create manually
nano migrate-repo.sh
# (paste the contents of 04-migrate-repo.sh)

chmod +x migrate-repo.sh
./migrate-repo.sh
```

This will:
1. Clone the repository
2. Install npm dependencies

## Step 6: Login to Claude Code (Run on the VM)

```bash
cd ~/solarpunk_utopia_project
claude-code login
```

Follow the prompts to log in with your Anthropic account (no API key needed).

## Step 7: Start Development (Run on the VM)

```bash
claude-code
```

Welcome to your renewable-energy-powered development environment! ✊🌻

## Managing Your VM

### Stop the VM (to save costs when not in use)
```bash
# From your local machine
gcloud compute instances stop solarpunk-dev --zone=europe-west3-a
```

### Start the VM
```bash
# From your local machine
gcloud compute instances start solarpunk-dev --zone=europe-west3-a
```

### Delete the VM (when completely done)
```bash
# From your local machine
gcloud compute instances delete solarpunk-dev --zone=europe-west3-a
```

## Alternative: Manual Setup Script Transfer

If you can't download scripts directly on the VM, you can:

1. **From your local machine**, copy all scripts to the VM:
```bash
cd vm-setup
gcloud compute scp *.sh solarpunk-dev:~ --zone=europe-west3-a
```

2. **On the VM**, run the scripts:
```bash
chmod +x *.sh
./02-setup-vm.sh
./03-setup-github.sh
# (add SSH key to GitHub)
./04-migrate-repo.sh
```

## Troubleshooting

### SSH Connection Issues
If you can't connect via `gcloud compute ssh`:
- Ensure your VM is running: `gcloud compute instances list`
- Check firewall rules allow SSH (port 22)

### GitHub SSH Authentication Fails
- Verify the key was added to GitHub: https://github.com/settings/keys
- Test connection: `ssh -T git@github.com`
- Check ssh-agent is running: `eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519`

### Claude Code Installation Issues
- Ensure Node.js is installed: `node --version` (should be v20.x)
- Try reinstalling: `sudo npm install -g @anthropic/claude-code`

## Why Frankfurt?

Google Cloud's Frankfurt region (europe-west3) is powered by 100% renewable energy, aligning with the solarpunk values of this project. Other renewable regions include:
- europe-west4 (Netherlands)
- europe-north1 (Finland)

## Cost Management

To minimize costs:
1. **Stop the VM** when not in use (you're only charged for storage when stopped)
2. Use **preemptible VMs** for non-critical work (up to 80% cheaper)
3. Consider **committed use discounts** if you'll use it long-term

Storage costs when stopped: ~$4/month for 50GB disk
