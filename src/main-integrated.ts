/**
 * Main application entry point - INTEGRATED Phase 1
 *
 * Combines:
 * - Phase 1A: Offline-First Core (database, CRDT, encryption, export)
 * - Phase 1D: Identity Without Surveillance (DIDs, auth, privacy)
 * - Phase 1B: Mesh networking integration (ready for peer sync)
 */

import './ui/styles.css';
import { app } from './core/AppManager.js';
import { downloadJSON, downloadResourcesCSV, downloadBinary, importFromFile } from './export/export.js';
import type { Resource, Need, SkillOffer } from './types';

// Global application reference
let appState = {
  initialized: false,
  authenticated: false
};

/**
 * Initialize the application
 */
async function init() {
  console.log('🌻 Starting Solarpunk Utopia Platform...');

  try {
    // Initialize app (database, identity system)
    const state = await app.initialize();
    appState.initialized = true;

    console.log('Application state:', state);

    // Check if user needs to create/login to identity
    if (!state.identityLoaded) {
      showIdentitySetup();
    } else {
      showLoginScreen();
    }

    // Set up UI
    setupUI();

    // Update sync status
    updateSyncStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateSyncStatus);
    window.addEventListener('offline', updateSyncStatus);

    // Subscribe to database changes
    app.getDatabase().onChange(() => {
      if (appState.authenticated) {
        renderCurrentView();
      }
    });

    console.log('✓ Application ready');
  } catch (error) {
    console.error('Failed to initialize:', error);
    showError('Failed to initialize the platform. Please refresh the page.');
  }
}

/**
 * Show identity setup for new users
 */
function showIdentitySetup() {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <h2>Welcome to Solarpunk Utopia! 🌻</h2>
    <p>Create your decentralized identity to get started.</p>
    <p><small>No email, no phone number required. Your identity is controlled by you.</small></p>

    <form id="identity-setup-form">
      <div class="form-group">
        <label for="display-name">Display Name *</label>
        <input type="text" id="display-name" required placeholder="How you'd like to be known">
      </div>

      <div class="form-group">
        <label for="passphrase">Passphrase *</label>
        <input type="password" id="passphrase" required minlength="8"
               placeholder="To protect your identity (min 8 chars)">
        <small>⚠️ Keep this safe! You'll need it to access your identity.</small>
      </div>

      <div class="form-group">
        <label for="passphrase-confirm">Confirm Passphrase *</label>
        <input type="password" id="passphrase-confirm" required
               placeholder="Type it again to confirm">
      </div>

      <button type="submit" class="btn-primary">Create Identity</button>
    </form>
  `;

  document.getElementById('identity-setup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleCreateIdentity();
  });

  showModal();
}

/**
 * Handle identity creation
 */
async function handleCreateIdentity() {
  const displayName = (document.getElementById('display-name') as HTMLInputElement).value;
  const passphrase = (document.getElementById('passphrase') as HTMLInputElement).value;
  const passphraseConfirm = (document.getElementById('passphrase-confirm') as HTMLInputElement).value;

  if (passphrase !== passphraseConfirm) {
    alert('Passphrases do not match!');
    return;
  }

  try {
    const identityManager = app.getIdentityManager();
    const identity = await identityManager.createNewIdentity(displayName);
    await identityManager.saveIdentity(identity, passphrase);

    console.log('✓ Identity created:', identity.did);

    appState.authenticated = true;
    closeModal();

    // Show main app
    showMainApp();

    alert(`Identity created! Your DID: ${identity.did}\n\nKeep your passphrase safe!`);
  } catch (error) {
    console.error('Failed to create identity:', error);
    alert('Failed to create identity. Please try again.');
  }
}

/**
 * Show login screen
 */
function showLoginScreen() {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <h2>Welcome Back! 🌻</h2>
    <p>Enter your passphrase to access your identity.</p>

    <form id="login-form">
      <div class="form-group">
        <label for="login-passphrase">Passphrase *</label>
        <input type="password" id="login-passphrase" required
               placeholder="Your identity passphrase">
      </div>

      <button type="submit" class="btn-primary">Login</button>
    </form>

    <div style="margin-top: 1rem;">
      <p><small>Lost your passphrase? You'll need to create a new identity.</small></p>
    </div>
  `;

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin();
  });

  showModal();
}

/**
 * Handle login
 */
async function handleLogin() {
  const passphrase = (document.getElementById('login-passphrase') as HTMLInputElement).value;

  try {
    const identityManager = app.getIdentityManager();
    const identity = await identityManager.loadIdentity(passphrase);

    if (!identity) {
      alert('Failed to load identity. Check your passphrase.');
      return;
    }

    console.log('✓ Logged in as:', identity.did);

    appState.authenticated = true;
    closeModal();

    // Show main app
    showMainApp();
  } catch (error) {
    console.error('Login failed:', error);
    alert('Failed to login. Check your passphrase.');
  }
}

/**
 * Show main application interface
 */
function showMainApp() {
  document.getElementById('app')?.classList.remove('hidden');
  renderCurrentView();

  // Update user info in header
  const identity = app.getIdentityManager().getCurrentIdentity();
  if (identity) {
    updateUserDisplay(identity.profile.displayName, identity.did);
  }
}

/**
 * Update user display in header
 */
function updateUserDisplay(displayName: string, did: string) {
  const syncStatus = document.querySelector('.sync-status');
  if (syncStatus) {
    syncStatus.innerHTML = `
      <span style="margin-right: 1rem;">${escapeHtml(displayName)}</span>
      <span id="sync-indicator" class="offline">●</span>
      <span id="sync-text">Offline</span>
    `;
  }
  updateSyncStatus();
}

/**
 * Set up UI event listeners
 */
function setupUI() {
  // Tab navigation
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = (tab as HTMLElement).dataset.view;
      if (view && appState.authenticated) switchView(view);
    });
  });

  // Add resource button
  document.getElementById('add-resource-btn')?.addEventListener('click', () => {
    if (appState.authenticated) showAddResourceModal();
  });

  // Add need button
  document.getElementById('add-need-btn')?.addEventListener('click', () => {
    if (appState.authenticated) showAddNeedModal();
  });

  // Add skill button
  document.getElementById('add-skill-btn')?.addEventListener('click', () => {
    if (appState.authenticated) showAddSkillModal();
  });

  // Export buttons
  document.getElementById('export-json-btn')?.addEventListener('click', () => downloadJSON());
  document.getElementById('export-csv-btn')?.addEventListener('click', () => downloadResourcesCSV());
  document.getElementById('export-binary-btn')?.addEventListener('click', () => downloadBinary());

  // Export identity button
  document.getElementById('export-identity-btn')?.addEventListener('click', exportIdentity);

  // Import file
  document.getElementById('import-file')?.addEventListener('change', handleImport);

  // Modal close
  document.querySelector('.close')?.addEventListener('click', closeModal);
}

/**
 * Export identity for backup
 */
function exportIdentity() {
  try {
    const identityManager = app.getIdentityManager();
    const json = identityManager.exportIdentity();

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `identity-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Identity exported! Keep this file safe and private.');
  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export identity.');
  }
}

// Import existing UI functions from original main.ts
// (switchView, renderCurrentView, renderResources, etc.)
// For brevity, I'll include key ones:

function switchView(viewName: string) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', (tab as HTMLElement).dataset.view === viewName);
  });

  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `${viewName}-view`);
  });

  renderCurrentView();
}

function renderCurrentView() {
  const activeView = document.querySelector('.view.active');
  if (!activeView) return;

  const viewId = activeView.id;

  switch (viewId) {
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

function renderResources() {
  const container = document.getElementById('resources-list');
  if (!container) return;

  const resources = app.getDatabase().listResources();

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

function renderNeeds() {
  const container = document.getElementById('needs-list');
  if (!container) return;

  const needs = app.getDatabase().listNeeds();

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

function renderSkills() {
  const container = document.getElementById('skills-list');
  if (!container) return;

  const skills = app.getDatabase().listSkills();

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

function renderCommunity() {
  const container = document.getElementById('community-info');
  if (!container) return;

  const community = app.getDatabase().getCommunity();
  const syncStatus = app.getSyncStatus();
  const identity = app.getIdentityManager().getCurrentIdentity();

  container.innerHTML = `
    <h3>${escapeHtml(community.name)}</h3>
    <p>${escapeHtml(community.description)}</p>
    <p><strong>Members:</strong> ${community.memberCount}</p>
    <p><strong>Created:</strong> ${new Date(community.createdAt).toLocaleDateString()}</p>

    <hr style="margin: 1rem 0; border: 1px solid var(--secondary-green);">

    <h4>Your Identity</h4>
    ${identity ? `
      <p><strong>Name:</strong> ${escapeHtml(identity.profile.displayName)}</p>
      <p><strong>DID:</strong> <code style="font-size: 0.8em; word-break: break-all;">${identity.did}</code></p>
      <button id="export-identity-btn" class="btn-secondary" style="margin-top: 0.5rem;">Export Identity</button>
    ` : '<p>Not authenticated</p>'}

    <hr style="margin: 1rem 0; border: 1px solid var(--secondary-green);">

    <h4>Sync Status</h4>
    <p><strong>Online:</strong> ${syncStatus.isOnline ? 'Yes ✓' : 'No (Offline Mode)'}</p>
    <p><strong>Connected Peers:</strong> ${syncStatus.connectedPeers}</p>
    <p><strong>Pending Changes:</strong> ${syncStatus.pendingChanges}</p>
  `;

  // Re-attach export identity button listener
  document.getElementById('export-identity-btn')?.addEventListener('click', exportIdentity);
}

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

function showAddResourceModal() {
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  const identity = app.getIdentityManager().getCurrentIdentity();
  if (!identity) return;

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

async function handleAddResource() {
  const identity = app.getIdentityManager().getCurrentIdentity();
  if (!identity) return;

  const name = (document.getElementById('resource-name') as HTMLInputElement).value;
  const description = (document.getElementById('resource-description') as HTMLTextAreaElement).value;
  const resourceType = (document.getElementById('resource-type') as HTMLSelectElement).value as any;
  const shareMode = (document.getElementById('resource-mode') as HTMLSelectElement).value as any;
  const location = (document.getElementById('resource-location') as HTMLInputElement).value;

  await app.getDatabase().addResource({
    name,
    description,
    resourceType,
    shareMode,
    available: true,
    ownerId: identity.did,
    location: location || undefined,
  });

  closeModal();
  renderResources();
}

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

async function handleAddNeed() {
  const identity = app.getIdentityManager().getCurrentIdentity();
  if (!identity) return;

  const description = (document.getElementById('need-description') as HTMLTextAreaElement).value;
  const urgency = (document.getElementById('need-urgency') as HTMLSelectElement).value as any;

  await app.getDatabase().addNeed({
    userId: identity.did,
    description,
    urgency,
    fulfilled: false,
  });

  closeModal();
  renderNeeds();
}

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

async function handleAddSkill() {
  const identity = app.getIdentityManager().getCurrentIdentity();
  if (!identity) return;

  const skillName = (document.getElementById('skill-name') as HTMLInputElement).value;
  const description = (document.getElementById('skill-description') as HTMLTextAreaElement).value;
  const categoriesInput = (document.getElementById('skill-categories') as HTMLInputElement).value;
  const categories = categoriesInput.split(',').map((c) => c.trim()).filter((c) => c);

  await app.getDatabase().addSkill({
    userId: identity.did,
    skillName,
    description,
    categories,
    available: true,
  });

  closeModal();
  renderSkills();
}

function showModal() {
  document.getElementById('modal')?.classList.add('active');
}

function closeModal() {
  document.getElementById('modal')?.classList.remove('active');
}

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

  input.value = '';
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message: string) {
  alert(message);
}

// Initialize on page load
init();
