/**
 * Tool Library System
 * REQ-SHARE-002: Tools and Equipment Access
 * Phase 3, Group C: Tool Library & Equipment
 *
 * Manages community tool libraries where tools and equipment are shared among members.
 * Builds community self-sufficiency through shared access to tools.
 */

import { db } from '../core/database';
import type { Resource, ResourceType } from '../types';
import { sanitizeUserContent, sanitizeUrl, sanitizeAttribute, validateIdentifier, requireValidIdentifier } from '../utils/sanitize';

/**
 * Tool-specific metadata interface
 */
export interface ToolMetadata {
  brand?: string;
  model?: string;
  yearAcquired?: number;
  condition: 'excellent' | 'good' | 'fair' | 'needs-repair';
  requiresTraining?: boolean;
  safetyNotes?: string;
  maintenanceSchedule?: string;
  lastMaintenance?: number;
  maxBorrowDays?: number;
}

/**
 * Extended tool interface with metadata
 */
export interface Tool extends Resource {
  toolMetadata?: ToolMetadata;
}

/**
 * Categories for organizing tools
 */
export const TOOL_CATEGORIES = {
  'hand-tools': 'Hand Tools',
  'power-tools': 'Power Tools',
  'garden-tools': 'Garden & Yard Tools',
  'kitchen': 'Kitchen Equipment',
  'automotive': 'Automotive Tools',
  'electronics': 'Electronics & Tech',
  'woodworking': 'Woodworking',
  'plumbing': 'Plumbing',
  'painting': 'Painting & Finishing',
  'camping': 'Camping & Outdoor',
  'cleaning': 'Cleaning Equipment',
  'fabrication': 'Fabrication & Making',
  'measurement': 'Measuring & Testing',
  'safety': 'Safety Equipment',
  'other': 'Other Tools',
} as const;

export type ToolCategory = keyof typeof TOOL_CATEGORIES;

/**
 * Add a tool to the community tool library
 * REQ-SHARE-002: Tools and Equipment Access
 */
export async function addToolToLibrary(
  userId: string,
  toolData: {
    name: string;
    description: string;
    category: ToolCategory;
    condition: 'excellent' | 'good' | 'fair' | 'needs-repair';
    requiresTraining?: boolean;
    safetyNotes?: string;
    maxBorrowDays?: number;
    location?: string;
    photos?: string[];
    brand?: string;
    model?: string;
  }
): Promise<Tool> {
  requireValidIdentifier(userId, 'User ID');

  // Build tool metadata
  const toolMetadata: ToolMetadata = {
    condition: toolData.condition,
  };

  if (toolData.brand) toolMetadata.brand = sanitizeUserContent(toolData.brand);
  if (toolData.model) toolMetadata.model = sanitizeUserContent(toolData.model);
  if (toolData.requiresTraining !== undefined) toolMetadata.requiresTraining = toolData.requiresTraining;
  if (toolData.safetyNotes) toolMetadata.safetyNotes = sanitizeUserContent(toolData.safetyNotes);
  if (toolData.maxBorrowDays) toolMetadata.maxBorrowDays = toolData.maxBorrowDays;

  // Create the resource with tool-specific data
  const resourceData: any = {
    name: sanitizeUserContent(toolData.name),
    description: sanitizeUserContent(toolData.description),
    resourceType: 'tool' as ResourceType,
    shareMode: 'lend' as const,
    available: true,
    ownerId: userId,
    photos: toolData.photos || [],
    tags: [toolData.category, 'tool-library'],
    toolMetadata,
  };

  if (toolData.location) {
    resourceData.location = sanitizeUserContent(toolData.location);
  }

  const resource = await db.addResource(resourceData);
  return resource as Tool;
}

/**
 * Browse tools in the library
 * REQ-SHARE-002: Tools and Equipment Access
 */
export function browseToolLibrary(filters?: {
  category?: ToolCategory;
  available?: boolean;
  requiresTraining?: boolean;
  searchQuery?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'needs-repair';
}): Tool[] {
  let tools = db.listResources()
    .filter(r => r.resourceType === 'tool' && r.tags?.includes('tool-library')) as Tool[];

  if (filters?.category) {
    tools = tools.filter(t => t.tags?.includes(filters.category!));
  }

  if (filters?.available !== undefined) {
    tools = tools.filter(t => t.available === filters.available);
  }

  if (filters?.requiresTraining !== undefined) {
    tools = tools.filter(t => t.toolMetadata?.requiresTraining === filters.requiresTraining);
  }

  if (filters?.condition) {
    tools = tools.filter(t => t.toolMetadata?.condition === filters.condition);
  }

  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    tools = tools.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.toolMetadata?.brand?.toLowerCase().includes(query) ||
      t.toolMetadata?.model?.toLowerCase().includes(query) ||
      t.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Sort by availability first, then by name
  return tools.sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): Tool[] {
  return browseToolLibrary({ category });
}

/**
 * Get available tools only
 */
export function getAvailableTools(): Tool[] {
  return browseToolLibrary({ available: true });
}

/**
 * Get tools requiring training
 */
export function getToolsRequiringTraining(): Tool[] {
  return browseToolLibrary({ requiresTraining: true });
}

/**
 * Update tool metadata
 */
export async function updateToolMetadata(
  toolId: string,
  metadata: Partial<ToolMetadata>
): Promise<void> {
  requireValidIdentifier(toolId, 'Tool ID');

  const tool = db.getResource(toolId) as Tool;
  if (!tool) {
    throw new Error('Tool not found');
  }

  const updatedMetadata: ToolMetadata = {
    ...tool.toolMetadata,
    ...metadata,
  } as ToolMetadata;

  await db.updateResource(toolId, {
    toolMetadata: updatedMetadata,
  } as any);
}

/**
 * Report tool maintenance needed
 */
export async function reportMaintenanceNeeded(
  toolId: string,
  reportedBy: string,
  notes: string
): Promise<void> {
  requireValidIdentifier(toolId, 'Tool ID');
  requireValidIdentifier(reportedBy, 'Reporter ID');

  const tool = db.getResource(toolId) as Tool;
  if (!tool) {
    throw new Error('Tool not found');
  }

  // Update tool condition
  await updateToolMetadata(toolId, {
    condition: 'needs-repair',
    maintenanceSchedule: sanitizeUserContent(notes),
  });

  // Mark as unavailable until repaired
  await db.updateResource(toolId, {
    available: false,
  });

  // Record maintenance event
  await db.recordEvent({
    action: 'use',
    providerId: tool.ownerId,
    receiverId: reportedBy,
    resourceId: toolId,
    note: `Maintenance needed: ${sanitizeUserContent(notes)}`,
  });
}

/**
 * Mark tool maintenance complete
 */
export async function completeMaintenanceTask(
  toolId: string,
  completedBy: string,
  notes?: string
): Promise<void> {
  requireValidIdentifier(toolId, 'Tool ID');
  requireValidIdentifier(completedBy, 'Completer ID');

  const tool = db.getResource(toolId) as Tool;
  if (!tool) {
    throw new Error('Tool not found');
  }

  // Update tool metadata
  await updateToolMetadata(toolId, {
    condition: 'good',
    lastMaintenance: Date.now(),
    maintenanceSchedule: undefined,
  });

  // Mark as available again
  await db.updateResource(toolId, {
    available: true,
  });

  // Record maintenance completion event
  const eventData: any = {
    action: 'use',
    providerId: completedBy,
    receiverId: tool.ownerId,
    resourceId: toolId,
  };

  if (notes) {
    eventData.note = `Maintenance completed: ${sanitizeUserContent(notes)}`;
  }

  await db.recordEvent(eventData);
}

/**
 * Render tool card with detailed metadata
 */
export function renderToolCard(tool: Tool, currentUserId: string): string {
  const isOwner = tool.ownerId === currentUserId;
  const metadata = tool.toolMetadata;

  const conditionBadge = metadata?.condition ? {
    'excellent': '⭐ Excellent',
    'good': '✓ Good',
    'fair': '~ Fair',
    'needs-repair': '⚠️ Needs Repair',
  }[metadata.condition] : '';

  const trainingBadge = metadata?.requiresTraining
    ? '<span class="badge badge-training">🎓 Training Required</span>'
    : '';

  const photos = tool.photos && tool.photos.length > 0
    ? `<div class="tool-photos">
        ${tool.photos.map(photo => `<img src="${sanitizeUrl(photo)}" alt="${sanitizeUserContent(tool.name)}" class="tool-photo" />`).join('')}
      </div>`
    : '';

  const brandModel = metadata?.brand || metadata?.model
    ? `<p class="tool-brand-model">
        ${metadata.brand ? sanitizeUserContent(metadata.brand) : ''}
        ${metadata.model ? sanitizeUserContent(metadata.model) : ''}
      </p>`
    : '';

  const safetyNotes = metadata?.safetyNotes
    ? `<div class="tool-safety-notes">
        <strong>⚠️ Safety Notes:</strong>
        <p>${sanitizeUserContent(metadata.safetyNotes)}</p>
      </div>`
    : '';

  const borrowPeriod = metadata?.maxBorrowDays
    ? `<p class="tool-borrow-period">Max borrow: ${metadata.maxBorrowDays} days</p>`
    : '';

  const maintenanceInfo = metadata?.maintenanceSchedule
    ? `<div class="tool-maintenance-warning">
        <strong>⚠️ Maintenance Needed:</strong>
        <p>${sanitizeUserContent(metadata.maintenanceSchedule)}</p>
      </div>`
    : '';

  const actionButtons = tool.available && !isOwner
    ? `<button class="btn-book-tool" data-tool-id="${sanitizeAttribute(tool.id)}">
        Book this Tool
      </button>`
    : !tool.available && !isOwner
    ? '<p class="tool-unavailable">Currently borrowed</p>'
    : '';

  const ownerButtons = isOwner
    ? `<div class="tool-owner-actions">
        <button class="btn-edit-tool" data-tool-id="${sanitizeAttribute(tool.id)}">Edit</button>
        <button class="btn-report-maintenance" data-tool-id="${sanitizeAttribute(tool.id)}">
          Report Maintenance
        </button>
      </div>`
    : '';

  const categoryName = tool.tags?.find(tag => TOOL_CATEGORIES[tag as ToolCategory])
    ? TOOL_CATEGORIES[tool.tags.find(tag => TOOL_CATEGORIES[tag as ToolCategory]) as ToolCategory]
    : 'Other';

  return `
    <div class="tool-card ${tool.available ? '' : 'tool-unavailable'}">
      <div class="tool-header">
        <h4 class="tool-name">${sanitizeUserContent(tool.name)}</h4>
        <div class="tool-badges">
          <span class="badge badge-condition badge-${metadata?.condition || 'unknown'}">${conditionBadge}</span>
          ${trainingBadge}
          ${tool.available ? '<span class="badge badge-available">✓ Available</span>' : '<span class="badge badge-unavailable">○ Borrowed</span>'}
        </div>
      </div>

      ${photos}

      <div class="tool-details">
        <p class="tool-category">📦 ${categoryName}</p>
        ${brandModel}
        <p class="tool-description">${sanitizeUserContent(tool.description)}</p>
        ${borrowPeriod}
        ${tool.location ? `<p class="tool-location">📍 ${sanitizeUserContent(tool.location)}</p>` : ''}
      </div>

      ${safetyNotes}
      ${maintenanceInfo}

      ${actionButtons}
      ${ownerButtons}
    </div>
  `;
}

/**
 * Render tool library grid view organized by category
 */
export function renderToolLibrary(currentUserId: string): string {
  const allTools = browseToolLibrary();

  if (allTools.length === 0) {
    return `
      <div class="tool-library-empty">
        <h2>🔧 Community Tool Library</h2>
        <p>No tools in the library yet. Be the first to share a tool!</p>
        <button id="btn-add-tool" class="btn-primary">Add a Tool</button>
      </div>
    `;
  }

  const availableCount = allTools.filter(t => t.available).length;
  const borrowedCount = allTools.filter(t => !t.available).length;

  const categorizedTools: { [key: string]: Tool[] } = {};

  allTools.forEach(tool => {
    const category = tool.tags?.find(tag => TOOL_CATEGORIES[tag as ToolCategory]) || 'other';
    if (!categorizedTools[category]) {
      categorizedTools[category] = [];
    }
    categorizedTools[category].push(tool);
  });

  const categoryGrids = Object.entries(categorizedTools)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, tools]) => `
      <div class="tool-category-section">
        <h3 class="tool-category-heading">
          ${TOOL_CATEGORIES[category as ToolCategory] || 'Other'}
          <span class="tool-count">(${tools.length})</span>
        </h3>
        <div class="tool-grid">
          ${tools.map(tool => renderToolCard(tool, currentUserId)).join('')}
        </div>
      </div>
    `).join('');

  return `
    <div class="tool-library-container">
      <div class="tool-library-header">
        <h2>🔧 Community Tool Library</h2>
        <button id="btn-add-tool" class="btn-primary">Add a Tool</button>
      </div>

      <div class="tool-library-stats">
        <div class="stat">
          <span class="stat-value">${allTools.length}</span>
          <span class="stat-label">Total Tools</span>
        </div>
        <div class="stat">
          <span class="stat-value">${availableCount}</span>
          <span class="stat-label">Available</span>
        </div>
        <div class="stat">
          <span class="stat-value">${borrowedCount}</span>
          <span class="stat-label">Borrowed</span>
        </div>
      </div>

      <div class="tool-library-filters">
        <button class="btn-filter active" data-filter="all">All</button>
        <button class="btn-filter" data-filter="available">Available Only</button>
        <button class="btn-filter" data-filter="needs-training">Training Required</button>
      </div>

      <div class="tool-library-grid">
        ${categoryGrids}
      </div>
    </div>
  `;
}

/**
 * Get maintenance tasks (tools needing repair)
 */
export function getMaintenanceTasks(): Tool[] {
  return browseToolLibrary({ condition: 'needs-repair' });
}

/**
 * Render maintenance dashboard
 */
export function renderMaintenanceDashboard(currentUserId: string): string {
  const tasksNeeded = getMaintenanceTasks();

  if (tasksNeeded.length === 0) {
    return `
      <div class="maintenance-dashboard">
        <h3>🔧 Tool Maintenance</h3>
        <p class="maintenance-all-good">All tools are in good condition! ✓</p>
      </div>
    `;
  }

  const taskCards = tasksNeeded.map(tool => `
    <div class="maintenance-task-card">
      <h4>${sanitizeUserContent(tool.name)}</h4>
      <p class="maintenance-notes">${sanitizeUserContent(tool.toolMetadata?.maintenanceSchedule || 'Needs attention')}</p>
      <button class="btn-complete-maintenance" data-tool-id="${sanitizeAttribute(tool.id)}">
        Mark as Fixed
      </button>
    </div>
  `).join('');

  return `
    <div class="maintenance-dashboard">
      <h3>🔧 Tool Maintenance (${tasksNeeded.length})</h3>
      <div class="maintenance-tasks">
        ${taskCards}
      </div>
    </div>
  `;
}
