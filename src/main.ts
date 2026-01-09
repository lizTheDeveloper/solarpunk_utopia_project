/**
 * Main application entry point
 * Solarpunk Utopia Platform - Liberation Infrastructure
 */

import './ui/styles.css';
import '../src/care/check-in.css';
import { db } from './core/database';
import { downloadJSON, downloadResourcesCSV, downloadBinary, importFromFile } from './export/export';
import type { Resource, Need, SkillOffer } from './types';
import { initializeSecureNetworking, type SecureNetworkManager } from './network';
import { renderCheckInView } from './care/check-in';

// Global network manager instance
let networkManager: SecureNetworkManager | null = null;

// Initialize the application
async function init() {
  console.log('🌻 Initializing Solarpunk Utopia Platform...');

  try {
    // Initialize local-first database
    await db.init();
    console.log('✓ Database initialized');

    // Initialize secure mesh networking
    networkManager = await initializeSecureNetworking(db, {
      enabledTransports: ['wifi-direct'], // Start with local only
      dtnEnabled: true
    });
    console.log('✓ Mesh networking initialized');

    // Set up UI
    setupUI();

    // Update sync status
    updateSyncStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateSyncStatus);
    window.addEventListener('offline', updateSyncStatus);

    // Subscribe to database changes
    db.onChange(() => {
      renderCurrentView();
    });

    console.log('✓ Application ready');
  } catch (error) {
    console.error('Failed to initialize:', error);
    alert('Failed to initialize the platform. Please refresh the page.');
  }
}

// Set up UI event listeners
function setupUI() {
  // Tab navigation
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = (tab as HTMLElement).dataset.view;
      if (view) switchView(view);
    });
  });

  // Add resource button
  document.getElementById('add-resource-btn')?.addEventListener('click', showAddResourceModal);

  // Add need button
  document.getElementById('add-need-btn')?.addEventListener('click', showAddNeedModal);

  // Add skill button
  document.getElementById('add-skill-btn')?.addEventListener('click', showAddSkillModal);

  // Export buttons
  document.getElementById('export-json-btn')?.addEventListener('click', () => downloadJSON());
  document.getElementById('export-csv-btn')?.addEventListener('click', () => downloadResourcesCSV());
  document.getElementById('export-binary-btn')?.addEventListener('click', () => downloadBinary());

  // Import file
  document.getElementById('import-file')?.addEventListener('change', handleImport);

  // Modal close
  document.querySelector('.close')?.addEventListener('click', closeModal);

  // Initial render
  renderCurrentView();
}

// Switch between views
function switchView(viewName: string) {
  // Update tabs
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', (tab as HTMLElement).dataset.view === viewName);
  });

  // Update views
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `${viewName}-view`);
  });

  // Render current view
  renderCurrentView();
}

// Render the currently active view
function renderCurrentView() {
  const activeView = document.querySelector('.view.active');
  if (!activeView) return;

  const viewId = activeView.id;

  switch (viewId) {
    case 'care-view':
      renderCheckInView();
      break;
    case 'resources-view':
      renderResources();
      break;
    case 'needs-view':
      renderNeeds();
      break;
    case 'skills-view':
      renderSkills();
      break;
    case 'community-view':
      renderCommunity();
      break;
  }
}

// Render resources list
function renderResources() {
  const container = document.getElementById('resources-list');
  if (!container) return;

  const resources = db.listResources();

  if (resources.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No resources yet!</p>
        <p>Be the first to share something with your community.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = resources
    .map(
      (resource) => `
    <div class="item-card">
      <h3>${escapeHtml(resource.name)}</h3>
      <p>${escapeHtml(resource.description)}</p>
      <div class="item-meta">
        <span class="badge">${resource.resourceType}</span>
        <span class="badge">${resource.shareMode}</span>
        <span>${resource.available ? '✓ Available' : '✗ Not Available'}</span>
        ${resource.location ? `<span>📍 ${escapeHtml(resource.location)}</span>` : ''}
      </div>
    </div>
  `
    )
    .join('');
}

// Render needs list
function renderNeeds() {
  const container = document.getElementById('needs-list');
  if (!container) return;

  const needs = db.listNeeds();

  if (needs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No needs posted yet!</p>
        <p>Post a need and let your community help.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = needs
    .map(
      (need) => `
    <div class="item-card">
      <p><strong>${escapeHtml(need.description)}</strong></p>
      <div class="item-meta">
        <span class="badge">${need.urgency}</span>
        ${need.resourceType ? `<span class="badge">${need.resourceType}</span>` : ''}
        <span>${need.fulfilled ? '✓ Fulfilled' : '⏳ Open'}</span>
      </div>
    </div>
  `
    )
    .join('');
}

// Render skills list
function renderSkills() {
  const container = document.getElementById('skills-list');
  if (!container) return;

  const skills = db.listSkills();

  if (skills.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No skills offered yet!</p>
        <p>Share your skills and help your community.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = skills
    .map(
      (skill) => `
    <div class="item-card">
      <h3>${escapeHtml(skill.skillName)}</h3>
      <p>${escapeHtml(skill.description)}</p>
      <div class="item-meta">
        ${skill.categories.map((cat) => `<span class="badge">${escapeHtml(cat)}</span>`).join('')}
        <span>${skill.available ? '✓ Available' : '✗ Not Available'}</span>
      </div>
    </div>
  `
    )
    .join('');
}

// Render community info
function renderCommunity() {
  const container = document.getElementById('community-info');
  if (!container) return;

  const community = db.getCommunity();
  const syncStatus = db.getSyncStatus();

  // Get network status
  const networkStatus = networkManager ? {
    peerCount: networkManager.getPeerCount(),
    trustedPeerCount: networkManager.getTrustedPeers().length,
    transports: Array.from(networkManager.getTransportStatus().entries()),
    dtnBundles: networkManager.getDTNManager().getBundleStats()
  } : null;

  container.innerHTML = `
    <h3>${escapeHtml(community.name)}</h3>
    <p>${escapeHtml(community.description)}</p>
    <p><strong>Members:</strong> ${community.memberCount}</p>
    <p><strong>Created:</strong> ${new Date(community.createdAt).toLocaleDateString()}</p>

    <hr style="margin: 1rem 0; border: 1px solid var(--secondary-green);">

    <h4>Sync Status</h4>
    <p><strong>Online:</strong> ${syncStatus.isOnline ? 'Yes' : 'No'}</p>
    <p><strong>Connected Peers:</strong> ${syncStatus.connectedPeers}</p>
    <p><strong>Pending Changes:</strong> ${syncStatus.pendingChanges}</p>

    ${networkStatus ? `
      <hr style="margin: 1rem 0; border: 1px solid var(--secondary-green);">

      <h4>🌐 Mesh Network Status</h4>
      <p><strong>Connected Peers:</strong> ${networkStatus.peerCount}</p>
      <p><strong>Trusted Peers:</strong> ${networkStatus.trustedPeerCount}</p>

      <p><strong>Active Transports:</strong></p>
      <ul style="margin: 0.5rem 0;">
        ${networkStatus.transports.map(([type, status]) =>
          `<li>${type}: <span style="color: ${status === 'connected' ? 'green' : 'orange'}">${status}</span></li>`
        ).join('')}
      </ul>

      <p><strong>DTN Bundles:</strong></p>
      <ul style="margin: 0.5rem 0;">
        <li>Total: ${networkStatus.dtnBundles.total}</li>
        <li>Critical: ${networkStatus.dtnBundles.critical}</li>
        <li>High: ${networkStatus.dtnBundles.high}</li>
        <li>Normal: ${networkStatus.dtnBundles.normal}</li>
      </ul>

      <button id="discover-peers-btn" class="btn-primary" style="margin-top: 1rem;">
        Discover Peers (Bluetooth)
      </button>
    ` : ''}
  `;

  // Add event listener for discover button
  document.getElementById('discover-peers-btn')?.addEventListener('click', async () => {
    if (networkManager) {
      try {
        // Enable Bluetooth if not already enabled
        await networkManager.enableTransport('bluetooth');
        alert('Bluetooth discovery started. Grant permission when prompted.');
      } catch (error) {
        console.error('Failed to start Bluetooth discovery:', error);
        alert('Failed to start Bluetooth discovery. Check console for details.');
      }
    }
  });
}

// Update sync status indicator
function updateSyncStatus() {
  const indicator = document.getElementById('sync-indicator');
  const text = document.getElementById('sync-text');

  if (!indicator || !text) return;

  if (navigator.onLine) {
    indicator.className = 'online';
    text.textContent = 'Online';
  } else {
    indicator.className = 'offline';
    text.textContent = 'Offline';
  }
}

// Show add resource modal
function showAddResourceModal() {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <h2>Add Resource</h2>
    <form id="add-resource-form">
      <div class="form-group">
        <label for="resource-name">Name *</label>
        <input type="text" id="resource-name" required>
      </div>
      <div class="form-group">
        <label for="resource-description">Description *</label>
        <textarea id="resource-description" required></textarea>
      </div>
      <div class="form-group">
        <label for="resource-type">Type *</label>
        <select id="resource-type" required>
          <option value="tool">Tool</option>
          <option value="equipment">Equipment</option>
          <option value="space">Space</option>
          <option value="energy">Energy</option>
          <option value="food">Food</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="resource-mode">Share Mode *</label>
        <select id="resource-mode" required>
          <option value="give">Give (gift)</option>
          <option value="lend">Lend (return expected)</option>
          <option value="share">Share (joint access)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="resource-location">Location (optional)</label>
        <input type="text" id="resource-location">
      </div>
      <button type="submit" class="btn-primary">Add Resource</button>
    </form>
  `;

  document.getElementById('add-resource-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddResource();
  });

  showModal();
}

// Handle add resource form submission
async function handleAddResource() {
  const name = (document.getElementById('resource-name') as HTMLInputElement).value;
  const description = (document.getElementById('resource-description') as HTMLTextAreaElement).value;
  const resourceType = (document.getElementById('resource-type') as HTMLSelectElement).value as any;
  const shareMode = (document.getElementById('resource-mode') as HTMLSelectElement).value as any;
  const location = (document.getElementById('resource-location') as HTMLInputElement).value;

  await db.addResource({
    name,
    description,
    resourceType,
    shareMode,
    available: true,
    ownerId: 'user-1', // TODO: Real user ID from authentication
    location: location || undefined,
  });

  closeModal();
  renderResources();
}

// Show add need modal
function showAddNeedModal() {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <h2>Post a Need</h2>
    <form id="add-need-form">
      <div class="form-group">
        <label for="need-description">What do you need? *</label>
        <textarea id="need-description" required></textarea>
      </div>
      <div class="form-group">
        <label for="need-urgency">Urgency *</label>
        <select id="need-urgency" required>
          <option value="casual">Casual</option>
          <option value="helpful">Helpful</option>
          <option value="needed">Needed</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <button type="submit" class="btn-primary">Post Need</button>
    </form>
  `;

  document.getElementById('add-need-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddNeed();
  });

  showModal();
}

// Handle add need form submission
async function handleAddNeed() {
  const description = (document.getElementById('need-description') as HTMLTextAreaElement).value;
  const urgency = (document.getElementById('need-urgency') as HTMLSelectElement).value as any;

  await db.addNeed({
    userId: 'user-1', // TODO: Real user ID
    description,
    urgency,
    fulfilled: false,
  });

  closeModal();
  renderNeeds();
}

// Show add skill modal
function showAddSkillModal() {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <h2>Offer a Skill</h2>
    <form id="add-skill-form">
      <div class="form-group">
        <label for="skill-name">Skill Name *</label>
        <input type="text" id="skill-name" required>
      </div>
      <div class="form-group">
        <label for="skill-description">Description *</label>
        <textarea id="skill-description" required></textarea>
      </div>
      <div class="form-group">
        <label for="skill-categories">Categories (comma-separated)</label>
        <input type="text" id="skill-categories" placeholder="e.g., cooking, repair, teaching">
      </div>
      <button type="submit" class="btn-primary">Offer Skill</button>
    </form>
  `;

  document.getElementById('add-skill-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddSkill();
  });

  showModal();
}

// Handle add skill form submission
async function handleAddSkill() {
  const skillName = (document.getElementById('skill-name') as HTMLInputElement).value;
  const description = (document.getElementById('skill-description') as HTMLTextAreaElement).value;
  const categoriesInput = (document.getElementById('skill-categories') as HTMLInputElement).value;
  const categories = categoriesInput.split(',').map((c) => c.trim()).filter((c) => c);

  await db.addSkill({
    userId: 'user-1', // TODO: Real user ID
    skillName,
    description,
    categories,
    available: true,
  });

  closeModal();
  renderSkills();
}

// Modal helpers
function showModal() {
  document.getElementById('modal')?.classList.add('active');
}

function closeModal() {
  document.getElementById('modal')?.classList.remove('active');
}

// Handle file import
async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  try {
    await importFromFile(file);
    alert('Data imported successfully!');
    renderCurrentView();
  } catch (error) {
    console.error('Import error:', error);
    alert('Failed to import data. Please check the file format.');
  }

  // Reset input
  input.value = '';
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on page load
init();
