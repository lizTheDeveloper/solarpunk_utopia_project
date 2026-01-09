/**
 * Solarpunk Platform - Community Management
 *
 * Implements REQ-GOV-001: Community Groups and Communes
 * Implements REQ-GOV-002: Community Philosophy and Values
 *
 * Features:
 * - Create and manage community groups
 * - Define community values and philosophy
 * - Membership models (open, application-based, invitation)
 * - Governance structures
 * - Community agreements
 */

(function(window) {
  'use strict';

  /**
   * Community membership models
   */
  const MEMBERSHIP_MODELS = {
    OPEN: 'open',                    // Anyone can join
    APPLICATION: 'application',      // Members must apply and be approved
    INVITATION: 'invitation'         // Members must be invited
  };

  /**
   * Governance structures
   */
  const GOVERNANCE_TYPES = {
    CONSENSUS: 'consensus',          // Full consensus decision-making
    CONSENT: 'consent',              // Consent-based (sociocracy)
    MAJORITY: 'majority',            // Simple majority voting
    SUPERMAJORITY: 'supermajority',  // 2/3 or 3/4 majority
    DELEGATION: 'delegation',        // Delegate system
    CUSTOM: 'custom'                 // Custom governance model
  };

  /**
   * Sanitize string input
   */
  function sanitizeString(input, maxLength = 10000) {
    if (typeof input !== 'string') return '';
    let sanitized = input.replace(/\0/g, '').trim();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
  }

  /**
   * Sanitize array of strings
   */
  function sanitizeStringArray(input, maxArrayLength = 100, maxValueLength = 200) {
    if (!Array.isArray(input)) return [];
    return input
      .map(v => sanitizeString(v, maxValueLength))
      .filter(v => v.length > 0)
      .slice(0, maxArrayLength);
  }

  /**
   * Community Manager
   */
  class CommunityManager {
    constructor(db) {
      this.db = db;
    }

    /**
     * Create a new community
     */
    async create(communityData) {
      if (!this.db) {
        throw new Error('Database not ready');
      }

      // Sanitize and validate required fields
      const name = sanitizeString(communityData.name || '', 200);
      if (!name) {
        throw new Error('Community name is required');
      }

      // Sanitize all inputs
      const description = sanitizeString(communityData.description || '', 5000);
      const locationDescription = sanitizeString(communityData.locationDescription || '', 500);
      const governanceDescription = sanitizeString(communityData.governanceDescription || '', 2000);
      const applicationProcess = sanitizeString(communityData.applicationProcess || '', 2000);
      const coreValues = sanitizeStringArray(communityData.coreValues || [], 50, 100);

      // Create community object
      const community = {
        name,
        description,

        // Philosophy and values
        philosophy: {
          coreValues,
          decisionMaking: sanitizeString(communityData.decisionMaking || '', 2000),
          conflictResolution: sanitizeString(communityData.conflictResolution || '', 2000),
          commitmentExpectations: sanitizeString(communityData.commitmentExpectations || '', 2000),
          relationshipToNetworks: sanitizeString(communityData.relationshipToNetworks || '', 2000),
          economicModel: sanitizeString(communityData.economicModel || '', 2000)
        },

        // Location
        location: {
          type: communityData.locationType || 'geographic',
          description: locationDescription,
          boundaries: communityData.boundaries || undefined,
          coordinates: communityData.coordinates || undefined
        },

        // Membership
        membership: {
          model: communityData.membershipModel || MEMBERSHIP_MODELS.OPEN,
          memberCount: 1,
          memberIds: [],
          applicationProcess,
          trialPeriod: communityData.trialPeriod || undefined
        },

        // Governance
        governance: {
          structure: communityData.governanceStructure || GOVERNANCE_TYPES.CONSENSUS,
          customDescription: governanceDescription,
          agreements: []
        },

        // Metadata - will be set by database
        createdBy: this.db.nodeId || 'unknown',

        // Status
        status: 'active',
        visibility: communityData.visibility || 'public'
      };

      // Store in database using the proper method
      return await this.db.addCommunityGroup(community);
    }

    /**
     * Get community by ID
     */
    async getById(id) {
      if (!this.db) {
        throw new Error('Database not ready');
      }

      return this.db.getCommunityGroup(id);
    }

    /**
     * Get all communities
     */
    async getAll() {
      if (!this.db) {
        throw new Error('Database not ready');
      }

      return this.db.listCommunityGroups();
    }

    /**
     * Update community
     */
    async update(id, updates) {
      if (!this.db) {
        throw new Error('Database not ready');
      }

      const community = await this.getById(id);
      if (!community) {
        throw new Error('Community not found');
      }

      // Sanitize updates if they contain user input
      const sanitizedUpdates = {};
      if (updates.name) sanitizedUpdates.name = sanitizeString(updates.name, 200);
      if (updates.description) sanitizedUpdates.description = sanitizeString(updates.description, 5000);
      if (updates.philosophy) sanitizedUpdates.philosophy = updates.philosophy;
      if (updates.location) sanitizedUpdates.location = updates.location;
      if (updates.membership) sanitizedUpdates.membership = updates.membership;
      if (updates.governance) sanitizedUpdates.governance = updates.governance;
      if (updates.status) sanitizedUpdates.status = updates.status;
      if (updates.visibility) sanitizedUpdates.visibility = updates.visibility;

      return await this.db.updateCommunityGroup(id, sanitizedUpdates);
    }

    /**
     * Delete community
     */
    async delete(id) {
      if (!this.db) {
        throw new Error('Database not ready');
      }

      return await this.db.deleteCommunityGroup(id);
    }

    /**
     * Update community philosophy
     */
    async updatePhilosophy(id, philosophyData) {
      const community = await this.getById(id);
      if (!community) {
        throw new Error('Community not found');
      }

      return await this.update(id, {
        philosophy: {
          ...community.philosophy,
          ...philosophyData
        }
      });
    }

    /**
     * Update community governance
     */
    async updateGovernance(id, governanceData) {
      const community = await this.getById(id);
      if (!community) {
        throw new Error('Community not found');
      }

      return await this.update(id, {
        governance: {
          ...community.governance,
          ...governanceData
        }
      });
    }

    /**
     * Add community agreement
     */
    async addAgreement(id, agreement) {
      const community = await this.getById(id);
      if (!community) {
        throw new Error('Community not found');
      }

      const sanitizedAgreement = sanitizeString(agreement, 5000);
      if (!sanitizedAgreement) {
        throw new Error('Agreement text is required');
      }

      const agreements = [...community.governance.agreements, {
        id: 'agreement-' + Date.now(),
        text: sanitizedAgreement,
        addedAt: Date.now()
      }];

      return await this.update(id, {
        governance: {
          ...community.governance,
          agreements
        }
      });
    }

    /**
     * Search communities by values
     */
    async searchByValues(searchValues) {
      const allCommunities = await this.getAll();

      return allCommunities.filter(community => {
        // Check if any search values match community values
        const communityValues = community.philosophy.coreValues || [];
        return searchValues.some(searchValue =>
          communityValues.some(value =>
            value.toLowerCase().includes(searchValue.toLowerCase())
          )
        );
      });
    }

    /**
     * Get communities by membership model
     */
    async getByMembershipModel(model) {
      const allCommunities = await this.getAll();
      return allCommunities.filter(c => c.membership.model === model);
    }

    /**
     * Get public communities
     */
    async getPublicCommunities() {
      const allCommunities = await this.getAll();
      return allCommunities.filter(c => c.visibility === 'public' && c.status === 'active');
    }
  }

  // Export to global namespace
  window.SolarpunkCommunities = {
    CommunityManager,
    MEMBERSHIP_MODELS,
    GOVERNANCE_TYPES,
    manager: null, // Will be initialized with DB instance

    /**
     * Initialize community manager
     */
    init(db) {
      this.manager = new CommunityManager(db);
      console.log('[Communities] Community manager initialized');
      return this.manager;
    }
  };

})(window);
