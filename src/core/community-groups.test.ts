/**
 * Tests for Community Groups (Phase 2, Group D)
 * REQ-GOV-001: Community Groups and Communes
 * REQ-GOV-002: Community Philosophy and Values
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalDatabase } from './database';
import type { CommunityGroup } from '../types';

describe('Community Groups', () => {
  let db: LocalDatabase;

  beforeEach(async () => {
    // Use a unique database name for each test
    db = new LocalDatabase(`test-db-${Date.now()}`);
    await db.init();
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Community Group Creation', () => {
    it('should create a community group with minimal data', async () => {
      const group = await db.addCommunityGroup({
        name: 'Test Mutual Aid Network',
        description: 'A test community',
        philosophy: {
          coreValues: ['mutual aid', 'solidarity'],
          decisionMaking: 'consensus',
          conflictResolution: '',
          commitmentExpectations: '',
          relationshipToNetworks: '',
          economicModel: ''
        },
        location: {
          type: 'geographic',
          description: 'Oakland, CA'
        },
        membership: {
          model: 'open',
          memberCount: 1,
          memberIds: [],
          applicationProcess: ''
        },
        governance: {
          structure: 'consensus',
          customDescription: '',
          agreements: []
        },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      expect(group).toBeDefined();
      expect(group.id).toBeDefined();
      expect(group.name).toBe('Test Mutual Aid Network');
      expect(group.version).toBe(1);
      expect(group.createdAt).toBeDefined();
      expect(group.lastModified).toBeDefined();
    });

    it('should create a community group with full philosophy', async () => {
      const group = await db.addCommunityGroup({
        name: 'Intentional Commune',
        description: 'A cooperative living community',
        philosophy: {
          coreValues: ['anti-capitalism', 'ecology', 'consensus', 'solidarity'],
          decisionMaking: 'We use full consensus for all major decisions',
          conflictResolution: 'Restorative justice circles',
          commitmentExpectations: 'Weekly participation in community work',
          relationshipToNetworks: 'Part of the regional solidarity network',
          economicModel: 'Gift economy and time bank'
        },
        location: {
          type: 'geographic',
          description: 'Rural Vermont',
          coordinates: { latitude: 44.5588, longitude: -72.5778 }
        },
        membership: {
          model: 'application',
          memberCount: 1,
          memberIds: [],
          applicationProcess: 'Submit application, attend 3 meetings, trial period'
        },
        governance: {
          structure: 'consensus',
          customDescription: 'Modified consensus with blocking only for principles',
          agreements: []
        },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      expect(group.philosophy.coreValues).toHaveLength(4);
      expect(group.philosophy.coreValues).toContain('anti-capitalism');
      expect(group.philosophy.decisionMaking).toContain('consensus');
      expect(group.location.coordinates?.latitude).toBe(44.5588);
    });

    it('should support different membership models', async () => {
      const openGroup = await db.addCommunityGroup({
        name: 'Open Network',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'majority', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      const applicationGroup = await db.addCommunityGroup({
        name: 'Application Network',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'application', memberCount: 1, memberIds: [], applicationProcess: 'Submit form' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      const inviteGroup = await db.addCommunityGroup({
        name: 'Invitation Network',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'invitation', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      expect(openGroup.membership.model).toBe('open');
      expect(applicationGroup.membership.model).toBe('application');
      expect(inviteGroup.membership.model).toBe('invitation');
    });

    it('should support different governance structures', async () => {
      const structures: Array<'consensus' | 'consent' | 'majority' | 'supermajority' | 'delegation' | 'custom'> =
        ['consensus', 'consent', 'majority', 'supermajority', 'delegation', 'custom'];

      for (const structure of structures) {
        const group = await db.addCommunityGroup({
          name: `${structure} Group`,
          description: '',
          philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
          location: { type: 'virtual', description: '' },
          membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
          governance: { structure, customDescription: '', agreements: [] },
          createdBy: 'test-user',
          status: 'active',
          visibility: 'public'
        });

        expect(group.governance.structure).toBe(structure);
      }
    });

    it('should support different location types', async () => {
      const geographic = await db.addCommunityGroup({
        name: 'Geographic Group',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'geographic', description: 'Oakland' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      const virtual = await db.addCommunityGroup({
        name: 'Virtual Group',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: 'Online' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      const hybrid = await db.addCommunityGroup({
        name: 'Hybrid Group',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'hybrid', description: 'Both' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      expect(geographic.location.type).toBe('geographic');
      expect(virtual.location.type).toBe('virtual');
      expect(hybrid.location.type).toBe('hybrid');
    });
  });

  describe('Community Group Retrieval', () => {
    it('should retrieve a community group by ID', async () => {
      const created = await db.addCommunityGroup({
        name: 'Test Group',
        description: 'Test',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      const retrieved = db.getCommunityGroup(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Group');
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = db.getCommunityGroup('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should list all community groups', async () => {
      await db.addCommunityGroup({
        name: 'Group 1',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      await db.addCommunityGroup({
        name: 'Group 2',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      const groups = db.listCommunityGroups();
      expect(groups).toHaveLength(2);
      expect(groups.map(g => g.name)).toContain('Group 1');
      expect(groups.map(g => g.name)).toContain('Group 2');
    });

    it('should filter active community groups', async () => {
      await db.addCommunityGroup({
        name: 'Active Group',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      await db.addCommunityGroup({
        name: 'Inactive Group',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'inactive',
        visibility: 'public'
      });

      const activeGroups = db.getActiveCommunityGroups();
      expect(activeGroups).toHaveLength(1);
      expect(activeGroups[0].name).toBe('Active Group');
    });

    it('should filter public community groups', async () => {
      await db.addCommunityGroup({
        name: 'Public Group',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      await db.addCommunityGroup({
        name: 'Private Group',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: '' },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'private'
      });

      const publicGroups = db.getPublicCommunityGroups();
      expect(publicGroups).toHaveLength(1);
      expect(publicGroups[0].name).toBe('Public Group');
    });
  });

  describe('Community Group Updates', () => {
    it('should update community group fields', async () => {
      const group = await db.addCommunityGroup({
        name: 'Original Name',
        description: 'Original description',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      await db.updateCommunityGroup(group.id, {
        name: 'Updated Name',
        description: 'Updated description'
      });

      const updated = db.getCommunityGroup(group.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.version).toBe(2);
      expect(updated?.lastModified).toBeGreaterThan(group.lastModified);
    });

    it('should update philosophy values', async () => {
      const group = await db.addCommunityGroup({
        name: 'Test Group',
        description: '',
        philosophy: {
          coreValues: ['mutual aid'],
          decisionMaking: 'consensus',
          conflictResolution: '',
          commitmentExpectations: '',
          relationshipToNetworks: '',
          economicModel: ''
        },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      await db.updateCommunityGroup(group.id, {
        philosophy: {
          coreValues: ['mutual aid', 'solidarity', 'ecology'],
          decisionMaking: 'Modified consensus',
          conflictResolution: 'Restorative justice',
          commitmentExpectations: 'Weekly meetings',
          relationshipToNetworks: 'Regional network',
          economicModel: 'Gift economy'
        }
      });

      const updated = db.getCommunityGroup(group.id);
      expect(updated?.philosophy.coreValues).toHaveLength(3);
      expect(updated?.philosophy.coreValues).toContain('ecology');
      expect(updated?.philosophy.decisionMaking).toBe('Modified consensus');
    });

    it('should increment version on update', async () => {
      const group = await db.addCommunityGroup({
        name: 'Test Group',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      expect(group.version).toBe(1);

      await db.updateCommunityGroup(group.id, { name: 'Update 1' });
      let updated = db.getCommunityGroup(group.id);
      expect(updated?.version).toBe(2);

      await db.updateCommunityGroup(group.id, { name: 'Update 2' });
      updated = db.getCommunityGroup(group.id);
      expect(updated?.version).toBe(3);
    });
  });

  describe('Community Group Deletion', () => {
    it('should delete a community group', async () => {
      const group = await db.addCommunityGroup({
        name: 'To Delete',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      await db.deleteCommunityGroup(group.id);

      const retrieved = db.getCommunityGroup(group.id);
      expect(retrieved).toBeUndefined();
    });

    it('should not affect other groups when deleting one', async () => {
      const group1 = await db.addCommunityGroup({
        name: 'Group 1',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      const group2 = await db.addCommunityGroup({
        name: 'Group 2',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      await db.deleteCommunityGroup(group1.id);

      expect(db.getCommunityGroup(group1.id)).toBeUndefined();
      expect(db.getCommunityGroup(group2.id)).toBeDefined();
      expect(db.listCommunityGroups()).toHaveLength(1);
    });
  });

  describe('Solarpunk Values Compliance', () => {
    it('should not track user activity beyond what is necessary', async () => {
      const group = await db.addCommunityGroup({
        name: 'Privacy Test',
        description: '',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'virtual', description: '' },
        membership: { model: 'open', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      // Verify no tracking fields exist
      expect(group).not.toHaveProperty('views');
      expect(group).not.toHaveProperty('analytics');
      expect(group).not.toHaveProperty('tracking');
      expect(group).not.toHaveProperty('metrics');
    });

    it('should support private visibility for communities', async () => {
      const privateGroup = await db.addCommunityGroup({
        name: 'Private Group',
        description: 'Secret commune',
        philosophy: { coreValues: [], decisionMaking: '', conflictResolution: '', commitmentExpectations: '', relationshipToNetworks: '', economicModel: '' },
        location: { type: 'geographic', description: 'Hidden location' },
        membership: { model: 'invitation', memberCount: 1, memberIds: [], applicationProcess: '' },
        governance: { structure: 'consensus', customDescription: '', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'private'
      });

      expect(privateGroup.visibility).toBe('private');

      // Private groups should not appear in public listings
      const publicGroups = db.getPublicCommunityGroups();
      expect(publicGroups.find(g => g.id === privateGroup.id)).toBeUndefined();
    });

    it('should support anti-capitalist values in philosophy', async () => {
      const group = await db.addCommunityGroup({
        name: 'Radical Commune',
        description: 'Living the revolution',
        philosophy: {
          coreValues: ['anti-capitalism', 'mutual aid', 'solidarity', 'ecology', 'feminism'],
          decisionMaking: 'Consensus democracy',
          conflictResolution: 'Transformative justice',
          commitmentExpectations: 'Active participation in collective liberation',
          relationshipToNetworks: 'Part of anti-capitalist solidarity economy',
          economicModel: 'Gift economy, no money'
        },
        location: { type: 'geographic', description: 'Liberated zone' },
        membership: { model: 'application', memberCount: 1, memberIds: [], applicationProcess: 'Alignment with values required' },
        governance: { structure: 'consensus', customDescription: 'Modified consensus with attention to power dynamics', agreements: [] },
        createdBy: 'test-user',
        status: 'active',
        visibility: 'public'
      });

      expect(group.philosophy.coreValues).toContain('anti-capitalism');
      expect(group.philosophy.economicModel).toContain('no money');
    });
  });
});
