/**
 * Tool Library System
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-014: Multi-Party Resource Sharing (Community Tool Library)
 *
 * Enables community members to share tools, equipment, and machinery with:
 * - Usage instructions and safety requirements
 * - Condition tracking and maintenance
 * - Collective ownership support
 * - Integration with booking/scheduling (future)
 *
 * This is the foundational tool library system. Equipment booking and pickup
 * coordination will be added in subsequent features.
 */

import { db } from '../core/database';
import type { Resource } from '../types';
import { sanitizeUserContent, requireValidIdentifier, validateIdentifier } from '../utils/sanitize';

/**
 * Tool library specific data for creating tool resources
 */
interface ToolLibraryData {
  usageInstructions?: string;
  safetyRequirements?: string[];
  requiredSkills?: string[];
  capacitySpecs?: string;
  maintenanceNotes?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'needs-repair';
  lastMaintenanceDate?: number;
  isCollectivelyOwned?: boolean;
}

/**
 * Add a tool to the community tool library
 * REQ-SHARE-002: Tools and Equipment Access
 *
 * @param userId - User adding the tool (owner)
 * @param name - Tool name
 * @param description - Tool description
 * @param toolData - Tool-specific data (safety, instructions, etc.)
 * @param options - Additional options (location, photos, tags)
 */
export async function addToolToLibrary(
  userId: string,
  name: string,
  description: string,
  toolData?: ToolLibraryData,
  options?: {
    location?: string;
    photos?: string[];
    tags?: string[];
  }
): Promise<Resource> {
  requireValidIdentifier(userId, 'User ID');

  // Build the tool library metadata (avoiding undefined for Automerge compatibility)
  const toolLibrary: NonNullable<Resource['toolLibrary']> = {};

  if (toolData?.usageInstructions) {
    toolLibrary.usageInstructions = sanitizeUserContent(toolData.usageInstructions);
  }
  if (toolData?.safetyRequirements && toolData.safetyRequirements.length > 0) {
    toolLibrary.safetyRequirements = toolData.safetyRequirements.map(req => sanitizeUserContent(req));
  }
  if (toolData?.requiredSkills && toolData.requiredSkills.length > 0) {
    toolLibrary.requiredSkills = toolData.requiredSkills.map(skill => sanitizeUserContent(skill));
  }
  if (toolData?.capacitySpecs) {
    toolLibrary.capacitySpecs = sanitizeUserContent(toolData.capacitySpecs);
  }
  if (toolData?.maintenanceNotes) {
    toolLibrary.maintenanceNotes = sanitizeUserContent(toolData.maintenanceNotes);
  }
  if (toolData?.condition) {
    toolLibrary.condition = toolData.condition;
  }
  if (toolData?.lastMaintenanceDate !== undefined) {
    toolLibrary.lastMaintenanceDate = toolData.lastMaintenanceDate;
  }
  if (toolData?.isCollectivelyOwned !== undefined) {
    toolLibrary.isCollectivelyOwned = toolData.isCollectivelyOwned;
  }

  // Build resource object (avoiding undefined for Automerge compatibility)
  const resourceData: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'> = {
    name: sanitizeUserContent(name),
    description: sanitizeUserContent(description),
    resourceType: 'tool' as const,
    shareMode: 'share' as const, // Tools are shared, not given away
    available: true,
    ownerId: userId,
    photos: options?.photos || [],
    tags: (options?.tags || []).map(tag => sanitizeUserContent(tag)),
  };

  // Add tool library metadata if any fields were set
  if (Object.keys(toolLibrary).length > 0) {
    resourceData.toolLibrary = toolLibrary;
  }

  // Only include location if provided
  if (options?.location) {
    resourceData.location = sanitizeUserContent(options.location);
  }

  const resource = await db.addResource(resourceData);

  return resource;
}

/**
 * Browse tools in the community tool library
 * REQ-SHARE-002: Tools and Equipment Access
 *
 * @param filters - Optional filters for browsing
 */
export function browseToolLibrary(filters?: {
  searchQuery?: string;
  requiredSkills?: string[];
  condition?: 'excellent' | 'good' | 'fair' | 'needs-repair';
  collectivelyOwnedOnly?: boolean;
  availableOnly?: boolean;
}): Resource[] {
  // Get all tool resources
  let tools = db.listResources().filter(r => r.resourceType === 'tool');

  // Filter by availability
  if (filters?.availableOnly !== false) {
    tools = tools.filter(t => t.available);
  }

  // Filter by search query
  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    tools = tools.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      t.toolLibrary?.usageInstructions?.toLowerCase().includes(query)
    );
  }

  // Filter by condition
  if (filters?.condition) {
    tools = tools.filter(t => t.toolLibrary?.condition === filters.condition);
  }

  // Filter by collectively owned
  if (filters?.collectivelyOwnedOnly) {
    tools = tools.filter(t => t.toolLibrary?.isCollectivelyOwned === true);
  }

  // Filter by required skills (only show tools user can use)
  if (filters?.requiredSkills !== undefined) {
    const userSkills = filters.requiredSkills.map(s => s.toLowerCase());
    tools = tools.filter(t => {
      if (!t.toolLibrary?.requiredSkills || t.toolLibrary.requiredSkills.length === 0) {
        // No required skills means anyone can use it
        return true;
      }
      // If user has no skills, they can't use tools with skill requirements
      if (userSkills.length === 0) {
        return false;
      }
      // Check if user has all required skills
      return t.toolLibrary.requiredSkills.every(reqSkill =>
        userSkills.includes(reqSkill.toLowerCase())
      );
    });
  }

  // Sort by most recently added
  return tools.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get a specific tool by ID
 * REQ-SHARE-002: Tools and Equipment Access
 */
export function getTool(toolId: string): Resource | undefined {
  if (!validateIdentifier(toolId)) {
    return undefined;
  }

  const resource = db.getResource(toolId);

  if (!resource || resource.resourceType !== 'tool') {
    return undefined;
  }

  return resource;
}

/**
 * Update tool library information
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-006: Resource Lifecycle Tracking
 *
 * @param toolId - Tool resource ID
 * @param updates - Fields to update
 */
export async function updateToolInfo(
  toolId: string,
  updates: {
    name?: string;
    description?: string;
    location?: string;
    photos?: string[];
    tags?: string[];
    available?: boolean;
    toolLibrary?: Partial<ToolLibraryData>;
  }
): Promise<void> {
  requireValidIdentifier(toolId, 'Tool ID');

  const tool = getTool(toolId);
  if (!tool) {
    throw new Error('Tool not found');
  }

  const sanitizedUpdates: Partial<Resource> = {};

  // Basic fields
  if (updates.name !== undefined) {
    sanitizedUpdates.name = sanitizeUserContent(updates.name);
  }
  if (updates.description !== undefined) {
    sanitizedUpdates.description = sanitizeUserContent(updates.description);
  }
  if (updates.location !== undefined && updates.location) {
    sanitizedUpdates.location = sanitizeUserContent(updates.location);
  }
  if (updates.photos !== undefined) {
    sanitizedUpdates.photos = updates.photos;
  }
  if (updates.tags !== undefined) {
    sanitizedUpdates.tags = updates.tags.map(tag => sanitizeUserContent(tag));
  }
  if (updates.available !== undefined) {
    sanitizedUpdates.available = updates.available;
  }

  // Tool library specific updates
  if (updates.toolLibrary) {
    const existingToolLibrary = tool.toolLibrary || {};
    const updatedToolLibrary: NonNullable<Resource['toolLibrary']> = { ...existingToolLibrary };

    if (updates.toolLibrary.usageInstructions !== undefined) {
      updatedToolLibrary.usageInstructions = sanitizeUserContent(updates.toolLibrary.usageInstructions);
    }
    if (updates.toolLibrary.safetyRequirements !== undefined) {
      updatedToolLibrary.safetyRequirements = updates.toolLibrary.safetyRequirements.map(req => sanitizeUserContent(req));
    }
    if (updates.toolLibrary.requiredSkills !== undefined) {
      updatedToolLibrary.requiredSkills = updates.toolLibrary.requiredSkills.map(skill => sanitizeUserContent(skill));
    }
    if (updates.toolLibrary.capacitySpecs !== undefined) {
      updatedToolLibrary.capacitySpecs = sanitizeUserContent(updates.toolLibrary.capacitySpecs);
    }
    if (updates.toolLibrary.maintenanceNotes !== undefined) {
      updatedToolLibrary.maintenanceNotes = sanitizeUserContent(updates.toolLibrary.maintenanceNotes);
    }
    if (updates.toolLibrary.condition !== undefined) {
      updatedToolLibrary.condition = updates.toolLibrary.condition;
    }
    if (updates.toolLibrary.lastMaintenanceDate !== undefined) {
      updatedToolLibrary.lastMaintenanceDate = updates.toolLibrary.lastMaintenanceDate;
    }
    if (updates.toolLibrary.isCollectivelyOwned !== undefined) {
      updatedToolLibrary.isCollectivelyOwned = updates.toolLibrary.isCollectivelyOwned;
    }

    sanitizedUpdates.toolLibrary = updatedToolLibrary;
  }

  await db.updateResource(toolId, sanitizedUpdates);
}

/**
 * Report maintenance needed for a tool
 * REQ-SHARE-006: Resource Lifecycle Tracking
 *
 * @param toolId - Tool resource ID
 * @param maintenanceNote - Description of maintenance needed
 */
export async function reportMaintenanceNeeded(
  toolId: string,
  maintenanceNote: string
): Promise<void> {
  requireValidIdentifier(toolId, 'Tool ID');

  const tool = getTool(toolId);
  if (!tool) {
    throw new Error('Tool not found');
  }

  const existingToolLibrary = tool.toolLibrary || {};
  const existingNotes = existingToolLibrary.maintenanceNotes || '';
  const timestamp = new Date().toISOString();

  const updatedNotes = existingNotes
    ? `${existingNotes}\n[${timestamp}] ${sanitizeUserContent(maintenanceNote)}`
    : `[${timestamp}] ${sanitizeUserContent(maintenanceNote)}`;

  // Build complete toolLibrary object (avoiding undefined for Automerge compatibility)
  // IMPORTANT: Create new arrays/objects to avoid Automerge proxy references
  const updatedToolLibrary: NonNullable<Resource['toolLibrary']> = {
    maintenanceNotes: updatedNotes,
    condition: 'needs-repair' as const,
  };

  // Preserve existing fields (create new arrays to avoid proxy references)
  if (existingToolLibrary.usageInstructions !== undefined) {
    updatedToolLibrary.usageInstructions = existingToolLibrary.usageInstructions;
  }
  if (existingToolLibrary.safetyRequirements !== undefined) {
    updatedToolLibrary.safetyRequirements = [...existingToolLibrary.safetyRequirements];
  }
  if (existingToolLibrary.requiredSkills !== undefined) {
    updatedToolLibrary.requiredSkills = [...existingToolLibrary.requiredSkills];
  }
  if (existingToolLibrary.capacitySpecs !== undefined) {
    updatedToolLibrary.capacitySpecs = existingToolLibrary.capacitySpecs;
  }
  if (existingToolLibrary.lastMaintenanceDate !== undefined) {
    updatedToolLibrary.lastMaintenanceDate = existingToolLibrary.lastMaintenanceDate;
  }
  if (existingToolLibrary.isCollectivelyOwned !== undefined) {
    updatedToolLibrary.isCollectivelyOwned = existingToolLibrary.isCollectivelyOwned;
  }

  await db.updateResource(toolId, {
    available: false, // Mark as unavailable when maintenance needed
    toolLibrary: updatedToolLibrary,
  });
}

/**
 * Mark tool maintenance as completed
 * REQ-SHARE-006: Resource Lifecycle Tracking
 *
 * @param toolId - Tool resource ID
 * @param condition - New condition after maintenance
 */
export async function markMaintenanceCompleted(
  toolId: string,
  condition: 'excellent' | 'good' | 'fair' = 'good'
): Promise<void> {
  requireValidIdentifier(toolId, 'Tool ID');

  const tool = getTool(toolId);
  if (!tool) {
    throw new Error('Tool not found');
  }

  const existingToolLibrary = tool.toolLibrary || {};

  // Build complete toolLibrary object (avoiding undefined for Automerge compatibility)
  // IMPORTANT: Create new arrays/objects to avoid Automerge proxy references
  const updatedToolLibrary: NonNullable<Resource['toolLibrary']> = {
    condition,
    lastMaintenanceDate: Date.now(),
  };

  // Preserve existing fields (create new arrays to avoid proxy references)
  if (existingToolLibrary.usageInstructions !== undefined) {
    updatedToolLibrary.usageInstructions = existingToolLibrary.usageInstructions;
  }
  if (existingToolLibrary.safetyRequirements !== undefined) {
    updatedToolLibrary.safetyRequirements = [...existingToolLibrary.safetyRequirements];
  }
  if (existingToolLibrary.requiredSkills !== undefined) {
    updatedToolLibrary.requiredSkills = [...existingToolLibrary.requiredSkills];
  }
  if (existingToolLibrary.capacitySpecs !== undefined) {
    updatedToolLibrary.capacitySpecs = existingToolLibrary.capacitySpecs;
  }
  if (existingToolLibrary.maintenanceNotes !== undefined) {
    updatedToolLibrary.maintenanceNotes = existingToolLibrary.maintenanceNotes;
  }
  if (existingToolLibrary.isCollectivelyOwned !== undefined) {
    updatedToolLibrary.isCollectivelyOwned = existingToolLibrary.isCollectivelyOwned;
  }

  await db.updateResource(toolId, {
    available: true, // Mark as available again
    toolLibrary: updatedToolLibrary,
  });
}

/**
 * Get tools that need maintenance
 * REQ-SHARE-006: Resource Lifecycle Tracking
 */
export function getToolsNeedingMaintenance(): Resource[] {
  return db.listResources()
    .filter(r =>
      r.resourceType === 'tool' &&
      r.toolLibrary?.condition === 'needs-repair'
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get collectively owned tools
 * REQ-SHARE-007: Collective Ownership Models
 */
export function getCollectivelyOwnedTools(): Resource[] {
  return db.listResources()
    .filter(r =>
      r.resourceType === 'tool' &&
      r.toolLibrary?.isCollectivelyOwned === true
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Remove a tool from the library
 * REQ-SHARE-002: Tools and Equipment Access
 */
export async function removeToolFromLibrary(toolId: string): Promise<void> {
  requireValidIdentifier(toolId, 'Tool ID');

  const tool = getTool(toolId);
  if (!tool) {
    throw new Error('Tool not found');
  }

  await db.deleteResource(toolId);
}
