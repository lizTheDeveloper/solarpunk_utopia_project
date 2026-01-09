/**
 * Tool Library Tests
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-014: Multi-Party Resource Sharing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../core/database';
import {
  addToolToLibrary,
  browseToolLibrary,
  getTool,
  updateToolInfo,
  reportMaintenanceNeeded,
  markMaintenanceCompleted,
  getToolsNeedingMaintenance,
  getCollectivelyOwnedTools,
  removeToolFromLibrary,
} from './tool-library';

describe('Tool Library', () => {
  beforeEach(async () => {
    await db.reset();
  });

  describe('addToolToLibrary', () => {
    it('should add a basic tool to the library', async () => {
      const tool = await addToolToLibrary(
        'user-1',
        'Cordless Drill',
        'DeWalt 20V cordless drill with battery'
      );

      expect(tool.id).toBeDefined();
      expect(tool.name).toBe('Cordless Drill');
      expect(tool.description).toBe('DeWalt 20V cordless drill with battery');
      expect(tool.resourceType).toBe('tool');
      expect(tool.shareMode).toBe('share');
      expect(tool.available).toBe(true);
      expect(tool.ownerId).toBe('user-1');
    });

    it('should add a tool with complete tool library data', async () => {
      const tool = await addToolToLibrary(
        'user-1',
        '3D Printer',
        'Prusa i3 MK3S+',
        {
          usageInstructions: 'Use PrusaSlicer to prepare models. Preheat before printing.',
          safetyRequirements: ['No loose clothing', 'Supervised use only', 'Let cool before touching'],
          requiredSkills: ['3D modeling', 'Slicer software'],
          capacitySpecs: 'Print bed: 250x210x210mm, Materials: PLA, PETG, ASA',
          maintenanceNotes: 'Monthly lubrication required',
          condition: 'excellent',
          isCollectivelyOwned: true,
        },
        {
          location: 'Community Workshop',
          photos: ['printer1.jpg', 'printer2.jpg'],
          tags: ['fabrication', '3d-printing', 'prototyping'],
        }
      );

      expect(tool.toolLibrary).toBeDefined();
      expect(tool.toolLibrary?.usageInstructions).toContain('PrusaSlicer');
      expect(tool.toolLibrary?.safetyRequirements).toHaveLength(3);
      expect(tool.toolLibrary?.requiredSkills).toContain('3D modeling');
      expect(tool.toolLibrary?.capacitySpecs).toContain('250x210x210mm');
      expect(tool.toolLibrary?.condition).toBe('excellent');
      expect(tool.toolLibrary?.isCollectivelyOwned).toBe(true);
      expect(tool.location).toBe('Community Workshop');
      expect(tool.tags).toContain('fabrication');
    });

    it('should add collectively owned tool', async () => {
      const tool = await addToolToLibrary(
        'community',
        'Laser Cutter',
        'Community laser cutter for shared use',
        {
          isCollectivelyOwned: true,
          safetyRequirements: ['Training required', 'Eye protection mandatory'],
        }
      );

      expect(tool.toolLibrary?.isCollectivelyOwned).toBe(true);
    });

    it('should sanitize user input', async () => {
      const tool = await addToolToLibrary(
        'user-1',
        '<script>alert("xss")</script>Drill',
        'Description with <b>html</b>',
        {
          usageInstructions: '<script>bad</script>Instructions',
        }
      );

      expect(tool.name).not.toContain('<script>');
      expect(tool.description).not.toContain('<b>');
      expect(tool.toolLibrary?.usageInstructions).not.toContain('<script>');
    });

    it('should reject invalid user ID', async () => {
      await expect(async () => {
        await addToolToLibrary(
          '<script>bad</script>',
          'Drill',
          'Description'
        );
      }).rejects.toThrow();
    });
  });

  describe('browseToolLibrary', () => {
    beforeEach(async () => {
      // Add some test tools
      await addToolToLibrary('user-1', 'Cordless Drill', 'DeWalt 20V drill', {
        condition: 'excellent',
        requiredSkills: [],
      });

      await addToolToLibrary('user-2', 'Table Saw', 'Professional table saw', {
        condition: 'good',
        requiredSkills: ['Woodworking', 'Power tools'],
        safetyRequirements: ['Training required'],
        isCollectivelyOwned: true,
      });

      await addToolToLibrary('user-3', 'Broken Hammer', 'Needs new handle', {
        condition: 'needs-repair',
      });

      // Mark one unavailable
      const tools = db.listResources();
      const brokenTool = tools.find(t => t.name === 'Broken Hammer');
      if (brokenTool) {
        await db.updateResource(brokenTool.id, { available: false });
      }
    });

    it('should list all available tools by default', () => {
      const tools = browseToolLibrary();
      expect(tools.length).toBe(2); // Drill and Table Saw (Broken Hammer is unavailable)
      expect(tools.every(t => t.available)).toBe(true);
    });

    it('should include unavailable tools when specified', () => {
      const tools = browseToolLibrary({ availableOnly: false });
      expect(tools.length).toBe(3);
    });

    it('should filter by search query', () => {
      const tools = browseToolLibrary({ searchQuery: 'drill' });
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe('Cordless Drill');
    });

    it('should filter by condition', () => {
      const excellentTools = browseToolLibrary({ condition: 'excellent' });
      expect(excellentTools.length).toBe(1);
      expect(excellentTools[0].name).toBe('Cordless Drill');
    });

    it('should filter by collectively owned', () => {
      const collectiveTools = browseToolLibrary({ collectivelyOwnedOnly: true });
      expect(collectiveTools.length).toBe(1);
      expect(collectiveTools[0].name).toBe('Table Saw');
    });

    it('should filter by required skills', () => {
      // User with woodworking skill should see table saw
      const toolsForSkilled = browseToolLibrary({
        requiredSkills: ['Woodworking', 'Power tools'],
      });
      expect(toolsForSkilled.some(t => t.name === 'Table Saw')).toBe(true);

      // User without skills should only see tools with no skill requirements
      const toolsForUnskilled = browseToolLibrary({
        requiredSkills: [],
      });
      expect(toolsForUnskilled.some(t => t.name === 'Table Saw')).toBe(false);
      expect(toolsForUnskilled.some(t => t.name === 'Cordless Drill')).toBe(true);
    });
  });

  describe('getTool', () => {
    it('should retrieve a tool by ID', async () => {
      const created = await addToolToLibrary('user-1', 'Drill', 'A drill');
      const retrieved = getTool(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Drill');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = getTool('nonexistent-id');
      expect(tool).toBeUndefined();
    });

    it('should return undefined for invalid ID', () => {
      const tool = getTool('<script>bad</script>');
      expect(tool).toBeUndefined();
    });

    it('should not return non-tool resources', async () => {
      // Add a non-tool resource directly
      const resource = await db.addResource({
        name: 'Food Item',
        description: 'Some food',
        resourceType: 'food',
        shareMode: 'give',
        available: true,
        ownerId: 'user-1',
        photos: [],
        tags: [],
      });

      const retrieved = getTool(resource.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('updateToolInfo', () => {
    it('should update basic tool information', async () => {
      const tool = await addToolToLibrary('user-1', 'Drill', 'Old description');

      await updateToolInfo(tool.id, {
        name: 'Updated Drill',
        description: 'New description',
        location: 'Workshop',
        tags: ['power-tools'],
      });

      const updated = getTool(tool.id);
      expect(updated?.name).toBe('Updated Drill');
      expect(updated?.description).toBe('New description');
      expect(updated?.location).toBe('Workshop');
      expect(updated?.tags).toContain('power-tools');
    });

    it('should update tool library specific fields', async () => {
      const tool = await addToolToLibrary('user-1', 'Drill', 'Description', {
        condition: 'good',
        usageInstructions: 'Old instructions',
      });

      await updateToolInfo(tool.id, {
        toolLibrary: {
          condition: 'excellent',
          usageInstructions: 'New instructions',
          safetyRequirements: ['Wear safety glasses'],
        },
      });

      const updated = getTool(tool.id);
      expect(updated?.toolLibrary?.condition).toBe('excellent');
      expect(updated?.toolLibrary?.usageInstructions).toBe('New instructions');
      expect(updated?.toolLibrary?.safetyRequirements).toContain('Wear safety glasses');
    });

    it('should reject invalid tool ID', async () => {
      await expect(async () => {
        await updateToolInfo('nonexistent', { name: 'Test' });
      }).rejects.toThrow('Tool not found');
    });
  });

  describe('reportMaintenanceNeeded', () => {
    it('should report maintenance needed and mark tool unavailable', async () => {
      const tool = await addToolToLibrary('user-1', 'Drill', 'A drill', {
        condition: 'good',
      });

      await reportMaintenanceNeeded(tool.id, 'Battery not holding charge');

      const updated = getTool(tool.id);
      expect(updated?.available).toBe(false);
      expect(updated?.toolLibrary?.condition).toBe('needs-repair');
      expect(updated?.toolLibrary?.maintenanceNotes).toContain('Battery not holding charge');
      expect(updated?.toolLibrary?.maintenanceNotes).toContain('[');
    });

    it('should append to existing maintenance notes', async () => {
      const tool = await addToolToLibrary('user-1', 'Drill', 'A drill', {
        maintenanceNotes: 'Previous maintenance note',
      });

      await reportMaintenanceNeeded(tool.id, 'New issue found');

      const updated = getTool(tool.id);
      expect(updated?.toolLibrary?.maintenanceNotes).toContain('Previous maintenance note');
      expect(updated?.toolLibrary?.maintenanceNotes).toContain('New issue found');
    });
  });

  describe('markMaintenanceCompleted', () => {
    it('should mark maintenance as completed and tool as available', async () => {
      const tool = await addToolToLibrary('user-1', 'Drill', 'A drill', {
        condition: 'needs-repair',
      });
      await db.updateResource(tool.id, { available: false });

      await markMaintenanceCompleted(tool.id, 'excellent');

      const updated = getTool(tool.id);
      expect(updated?.available).toBe(true);
      expect(updated?.toolLibrary?.condition).toBe('excellent');
      expect(updated?.toolLibrary?.lastMaintenanceDate).toBeDefined();
    });

    it('should default to good condition if not specified', async () => {
      const tool = await addToolToLibrary('user-1', 'Drill', 'A drill', {
        condition: 'needs-repair',
      });

      await markMaintenanceCompleted(tool.id);

      const updated = getTool(tool.id);
      expect(updated?.toolLibrary?.condition).toBe('good');
    });
  });

  describe('getToolsNeedingMaintenance', () => {
    it('should return only tools needing repair', async () => {
      await addToolToLibrary('user-1', 'Good Drill', 'Works fine', {
        condition: 'good',
      });

      await addToolToLibrary('user-2', 'Broken Saw', 'Needs repair', {
        condition: 'needs-repair',
      });

      await addToolToLibrary('user-3', 'Broken Hammer', 'Also broken', {
        condition: 'needs-repair',
      });

      const needingMaintenance = getToolsNeedingMaintenance();
      expect(needingMaintenance.length).toBe(2);
      expect(needingMaintenance.every(t => t.toolLibrary?.condition === 'needs-repair')).toBe(true);
    });

    it('should return empty array if no tools need maintenance', async () => {
      await addToolToLibrary('user-1', 'Drill', 'Good', { condition: 'good' });
      const needingMaintenance = getToolsNeedingMaintenance();
      expect(needingMaintenance.length).toBe(0);
    });
  });

  describe('getCollectivelyOwnedTools', () => {
    it('should return only collectively owned tools', async () => {
      await addToolToLibrary('user-1', 'Personal Drill', 'My drill', {
        isCollectivelyOwned: false,
      });

      await addToolToLibrary('community', 'Community Saw', 'Shared saw', {
        isCollectivelyOwned: true,
      });

      await addToolToLibrary('community', 'Community Printer', 'Shared printer', {
        isCollectivelyOwned: true,
      });

      const collectiveTools = getCollectivelyOwnedTools();
      expect(collectiveTools.length).toBe(2);
      expect(collectiveTools.every(t => t.toolLibrary?.isCollectivelyOwned === true)).toBe(true);
    });

    it('should return empty array if no collective tools exist', async () => {
      await addToolToLibrary('user-1', 'Drill', 'Personal');
      const collectiveTools = getCollectivelyOwnedTools();
      expect(collectiveTools.length).toBe(0);
    });
  });

  describe('removeToolFromLibrary', () => {
    it('should remove a tool from the library', async () => {
      const tool = await addToolToLibrary('user-1', 'Drill', 'Description');

      await removeToolFromLibrary(tool.id);

      const retrieved = getTool(tool.id);
      expect(retrieved).toBeUndefined();
    });

    it('should reject removing non-existent tool', async () => {
      await expect(async () => {
        await removeToolFromLibrary('nonexistent-id');
      }).rejects.toThrow('Tool not found');
    });
  });

  describe('integration scenarios', () => {
    it('should support complete tool lifecycle', async () => {
      // 1. Add tool to library
      const tool = await addToolToLibrary(
        'user-1',
        'Community Drill',
        'Shared cordless drill',
        {
          condition: 'excellent',
          isCollectivelyOwned: true,
          usageInstructions: 'Charge before use',
        }
      );

      // 2. Browse and find the tool
      const tools = browseToolLibrary({ searchQuery: 'drill' });
      expect(tools.length).toBe(1);

      // 3. Update tool info
      await updateToolInfo(tool.id, {
        toolLibrary: {
          safetyRequirements: ['Wear safety glasses'],
        },
      });

      // 4. Report maintenance needed
      await reportMaintenanceNeeded(tool.id, 'Chuck is loose');
      const needingMaintenance = getToolsNeedingMaintenance();
      expect(needingMaintenance.length).toBe(1);

      // 5. Complete maintenance
      await markMaintenanceCompleted(tool.id, 'good');
      const fixed = getTool(tool.id);
      expect(fixed?.available).toBe(true);
      expect(fixed?.toolLibrary?.lastMaintenanceDate).toBeDefined();

      // 6. Tool is available in collective tools
      const collectiveTools = getCollectivelyOwnedTools();
      expect(collectiveTools.some(t => t.id === tool.id)).toBe(true);
    });

    it('should support skill-based access control', async () => {
      // Add a tool requiring specific skills
      await addToolToLibrary('community', 'CNC Machine', 'Professional CNC', {
        requiredSkills: ['CNC programming', 'CAD/CAM'],
        safetyRequirements: ['Certified training required'],
        isCollectivelyOwned: true,
      });

      // User with skills can see it
      const toolsForSkilled = browseToolLibrary({
        requiredSkills: ['CNC programming', 'CAD/CAM', 'Other skill'],
      });
      expect(toolsForSkilled.some(t => t.name === 'CNC Machine')).toBe(true);

      // User without skills cannot see it
      const toolsForUnskilled = browseToolLibrary({
        requiredSkills: ['Woodworking'],
      });
      expect(toolsForUnskilled.some(t => t.name === 'CNC Machine')).toBe(false);
    });
  });
});
