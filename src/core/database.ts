/**
 * Local-first database implementation using Automerge (CRDT) and IndexedDB
 *
 * REQ-DEPLOY-010: Local-First Database
 * REQ-DEPLOY-005: Offline-First Architecture
 */

import * as Automerge from '@automerge/automerge';
import { openDB, type IDBPDatabase } from 'idb';
import type { DatabaseSchema, Resource, Need, SkillOffer, AvailabilitySlot, EconomicEvent, UserProfile, Community, CommunityGroup, SyncStatus, CheckIn, CheckInStatus, CareCircle, CareActivity, MissedCheckInAlert, EmergencyAlert, BulletinPost, BulletinComment, BulletinRSVP, RSVPResponse, CommunityEvent, CommunityEventRSVP, EventRSVPStatus, CommunityEventComment, CommunityEventType, ContributionRecord, BurnoutAssessment } from '../types';

const DB_NAME = 'solarpunk-utopia';
const DB_VERSION = 1;
const DOC_STORE = 'documents';
const BINARY_STORE = 'automerge-binary';

type AutomergeDoc = Automerge.Doc<DatabaseSchema>;

/**
 * Local-first database manager
 * Uses Automerge CRDTs for conflict-free synchronization
 */
export class LocalDatabase {
  private db: IDBPDatabase | null = null;
  private doc: AutomergeDoc | null = null;
  private listeners: Set<(doc: AutomergeDoc) => void> = new Set();
  private dbName: string;

  constructor(dbName: string = DB_NAME) {
    this.dbName = dbName;
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    // Open IndexedDB for persistent storage
    this.db = await openDB(this.dbName, DB_VERSION, {
      upgrade(db) {
        // Store for JSON documents (metadata, config)
        if (!db.objectStoreNames.contains(DOC_STORE)) {
          db.createObjectStore(DOC_STORE);
        }
        // Store for Automerge binary data
        if (!db.objectStoreNames.contains(BINARY_STORE)) {
          db.createObjectStore(BINARY_STORE);
        }
      },
    });

    // Load or create Automerge document
    const savedBinary = await this.db.get(BINARY_STORE, 'main');

    if (savedBinary) {
      // Restore existing document
      this.doc = Automerge.load<DatabaseSchema>(savedBinary);

      // Migrate: Add checkIns if it doesn't exist
      if (!this.doc.checkIns) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.checkIns = {};
        });
        await this.save();
      }

      // Migrate: Add careCircles if it doesn't exist
      if (!this.doc.careCircles) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.careCircles = {};
        });
        await this.save();
      }

      // Migrate: Add missedCheckInAlerts if it doesn't exist
      if (!this.doc.missedCheckInAlerts) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.missedCheckInAlerts = {};
        });
        await this.save();
      }

      // Migrate: Add emergencyAlerts if it doesn't exist
      if (!this.doc.emergencyAlerts) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.emergencyAlerts = {};
        });
        await this.save();
      }

      // Migrate: Add careActivities if it doesn't exist
      if (!this.doc.careActivities) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.careActivities = {};
        });
        await this.save();
      }

      // Migrate: Add communityGroups if it doesn't exist
      if (!this.doc.communityGroups) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.communityGroups = {};
        });
        await this.save();
      }

      // Migrate: Add bulletinPosts if it doesn't exist
      if (!this.doc.bulletinPosts) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.bulletinPosts = {};
        });
        await this.save();
      }

      // Migrate: Add communityEvents if it doesn't exist
      if (!this.doc.communityEvents) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.communityEvents = {};
        });
        await this.save();
      }

      // Migrate: Add availabilitySlots if it doesn't exist
      if (!this.doc.availabilitySlots) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.availabilitySlots = {};
        });
        await this.save();
      }

      // Migrate: Add contributions if it doesn't exist
      if (!this.doc.contributions) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.contributions = {};
        });
        await this.save();
      }

      // Migrate: Add gratitude if it doesn't exist
      if (!this.doc.gratitude) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.gratitude = {};
        });
        await this.save();
      }

      // Migrate: Add randomKindness if it doesn't exist
      if (!this.doc.randomKindness) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.randomKindness = {};
        });
        await this.save();
      }

      // Migrate: Add burnoutAssessments if it doesn't exist
      if (!this.doc.burnoutAssessments) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.burnoutAssessments = {};
        });
        await this.save();
      }

      // Migrate: Add participationVitality if it doesn't exist
      if (!this.doc.participationVitality) {
        this.doc = Automerge.change(this.doc, (doc) => {
          doc.participationVitality = {};
        });
        await this.save();
      }
    } else {
      // Create new document with initial schema
      this.doc = Automerge.from<DatabaseSchema>({
        resources: {},
        needs: {},
        skills: {},
        availabilitySlots: {},
        events: {},
        users: {},
        community: {
          id: crypto.randomUUID(),
          name: 'My Community',
          description: 'A solarpunk mutual aid community',
          createdAt: Date.now(),
          memberCount: 0,
        },
        communityGroups: {},
        checkIns: {},
        careCircles: {},
        careActivities: {},
        missedCheckInAlerts: {},
        emergencyAlerts: {},
        bulletinPosts: {},
        communityEvents: {},
        contributions: {},
        gratitude: {},
        randomKindness: {},
        burnoutAssessments: {},
        participationVitality: {},
      });
      await this.save();
    }
  }

  /**
   * Save current state to IndexedDB
   */
  private async save(): Promise<void> {
    if (!this.db || !this.doc) return;

    const binary = Automerge.save(this.doc);
    await this.db.put(BINARY_STORE, binary, 'main');
  }

  /**
   * Update document and notify listeners
   */
  private async update(changeFn: (doc: AutomergeDoc) => void): Promise<void> {
    if (!this.doc) throw new Error('Database not initialized');

    this.doc = Automerge.change(this.doc, changeFn);
    await this.save();

    // Notify all listeners
    for (const listener of this.listeners) {
      listener(this.doc);
    }
  }

  /**
   * Subscribe to database changes
   */
  onChange(listener: (doc: AutomergeDoc) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current document state
   */
  getDoc(): AutomergeDoc {
    if (!this.doc) throw new Error('Database not initialized');
    return this.doc;
  }

  // ===== Resource Operations =====

  async addResource(resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Promise<Resource> {
    const newResource: Resource = {
      ...resource,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.update((doc) => {
      doc.resources[newResource.id] = newResource;
    });

    return newResource;
  }

  async updateResource(id: string, updates: Partial<Resource>): Promise<void> {
    await this.update((doc) => {
      if (doc.resources[id]) {
        Object.assign(doc.resources[id], updates, { updatedAt: Date.now() });
      }
    });
  }

  async deleteResource(id: string): Promise<void> {
    await this.update((doc) => {
      delete doc.resources[id];
    });
  }

  getResource(id: string): Resource | undefined {
    return this.getDoc().resources[id];
  }

  listResources(): Resource[] {
    return Object.values(this.getDoc().resources);
  }

  getAvailableResources(): Resource[] {
    return this.listResources().filter(r => r.available);
  }

  getResourcesByOwner(ownerId: string): Resource[] {
    return this.listResources().filter(r => r.ownerId === ownerId);
  }

  // ===== Need Operations =====

  async addNeed(need: Omit<Need, 'id' | 'createdAt' | 'updatedAt'>): Promise<Need> {
    const newNeed: Need = {
      ...need,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Automerge doesn't support undefined values, so remove undefined fields
    // or set them to null
    const cleanNeed = { ...newNeed };
    if (cleanNeed.resourceType === undefined) {
      delete (cleanNeed as any).resourceType;
    }

    await this.update((doc) => {
      doc.needs[newNeed.id] = cleanNeed as any;
    });

    return newNeed;
  }

  async updateNeed(id: string, updates: Partial<Need>): Promise<void> {
    await this.update((doc) => {
      if (doc.needs[id]) {
        Object.assign(doc.needs[id], updates, { updatedAt: Date.now() });
      }
    });
  }

  async deleteNeed(id: string): Promise<void> {
    await this.update((doc) => {
      delete doc.needs[id];
    });
  }

  listNeeds(): Need[] {
    return Object.values(this.getDoc().needs);
  }

  // ===== Skill Operations =====

  async addSkill(skill: Omit<SkillOffer, 'id' | 'createdAt' | 'updatedAt'>): Promise<SkillOffer> {
    const newSkill: SkillOffer = {
      ...skill,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.update((doc) => {
      doc.skills[newSkill.id] = newSkill;
    });

    return newSkill;
  }

  async updateSkill(id: string, updates: Partial<SkillOffer>): Promise<void> {
    await this.update((doc) => {
      if (doc.skills[id]) {
        Object.assign(doc.skills[id], updates, { updatedAt: Date.now() });
      }
    });
  }

  listSkills(): SkillOffer[] {
    return Object.values(this.getDoc().skills);
  }

  // ===== Availability Slot Operations =====

  async addAvailabilitySlot(slot: Omit<AvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<AvailabilitySlot> {
    const newSlot: AvailabilitySlot = {
      ...slot,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.update((doc) => {
      doc.availabilitySlots[newSlot.id] = newSlot;
    });

    return newSlot;
  }

  async updateAvailabilitySlot(id: string, updates: Partial<AvailabilitySlot>): Promise<void> {
    await this.update((doc) => {
      if (doc.availabilitySlots[id]) {
        Object.assign(doc.availabilitySlots[id], updates, { updatedAt: Date.now() });
      }
    });
  }

  listAvailabilitySlots(): AvailabilitySlot[] {
    return Object.values(this.getDoc().availabilitySlots);
  }

  // ===== Event Operations =====

  async recordEvent(event: Omit<EconomicEvent, 'id' | 'createdAt'>): Promise<EconomicEvent> {
    const newEvent: EconomicEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    await this.update((doc) => {
      doc.events[newEvent.id] = newEvent;
    });

    return newEvent;
  }

  listEvents(): EconomicEvent[] {
    return Object.values(this.getDoc().events);
  }

  // ===== User Operations =====

  async setUserProfile(profile: UserProfile): Promise<void> {
    await this.update((doc) => {
      doc.users[profile.id] = profile;
    });
  }

  getUserProfile(id: string): UserProfile | undefined {
    return this.getDoc().users[id];
  }

  listUsers(): UserProfile[] {
    return Object.values(this.getDoc().users);
  }

  // ===== Community Operations =====

  async updateCommunity(updates: Partial<Community>): Promise<void> {
    await this.update((doc) => {
      Object.assign(doc.community, updates);
    });
  }

  getCommunity(): Community {
    return this.getDoc().community;
  }

  // ===== Community Group Operations =====
  // REQ-GOV-001: Community Groups and Communes
  // REQ-GOV-002: Community Philosophy and Values

  async addCommunityGroup(group: Omit<CommunityGroup, 'id' | 'createdAt' | 'lastModified' | 'version'>): Promise<CommunityGroup> {
    const newGroup: CommunityGroup = {
      ...group,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: 1,
    };

    await this.update((doc) => {
      doc.communityGroups[newGroup.id] = newGroup;
    });

    return newGroup;
  }

  async updateCommunityGroup(id: string, updates: Partial<CommunityGroup>): Promise<void> {
    await this.update((doc) => {
      if (doc.communityGroups[id]) {
        Object.assign(doc.communityGroups[id], updates, {
          lastModified: Date.now(),
          version: doc.communityGroups[id].version + 1
        });
      }
    });
  }

  async deleteCommunityGroup(id: string): Promise<void> {
    await this.update((doc) => {
      delete doc.communityGroups[id];
    });
  }

  getCommunityGroup(id: string): CommunityGroup | undefined {
    return this.getDoc().communityGroups[id];
  }

  listCommunityGroups(): CommunityGroup[] {
    return Object.values(this.getDoc().communityGroups);
  }

  getActiveCommunityGroups(): CommunityGroup[] {
    return this.listCommunityGroups().filter(g => g.status === 'active');
  }

  getPublicCommunityGroups(): CommunityGroup[] {
    return this.listCommunityGroups().filter(g =>
      g.visibility === 'public' && g.status === 'active'
    );
  }

  // ===== Check-In Operations =====
  // REQ-CARE-001: Check-In Support for Elderly and Disabled

  async addCheckIn(checkIn: Omit<CheckIn, 'id' | 'createdAt'>): Promise<CheckIn> {
    const newCheckIn: CheckIn = {
      ...checkIn,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    // Remove undefined values for Automerge compatibility
    await this.update((doc) => {
      const checkInData: any = { ...newCheckIn };
      // Remove undefined fields
      Object.keys(checkInData).forEach(key => {
        if (checkInData[key] === undefined) {
          delete checkInData[key];
        }
      });
      doc.checkIns[newCheckIn.id] = checkInData;
    });

    return newCheckIn;
  }

  async updateCheckIn(id: string, updates: Partial<CheckIn>): Promise<void> {
    await this.update((doc) => {
      if (doc.checkIns[id]) {
        // Manually assign each property to avoid Automerge reference errors
        Object.keys(updates).forEach(key => {
          const value = (updates as any)[key];
          if (value !== undefined) {
            if (Array.isArray(value)) {
              // For arrays, check if it exists first
              const existingArray = (doc.checkIns[id] as any)[key];
              if (existingArray && Array.isArray(existingArray)) {
                // Pop all items then push new ones (Automerge doesn't support .length = 0)
                while (existingArray.length > 0) {
                  existingArray.pop();
                }
                value.forEach((item: any) => existingArray.push(item));
              } else {
                // Initialize new array
                (doc.checkIns[id] as any)[key] = value;
              }
            } else {
              (doc.checkIns[id] as any)[key] = value;
            }
          }
        });
      }
    });
  }

  listCheckIns(): CheckIn[] {
    return Object.values(this.getDoc().checkIns);
  }

  getCheckIn(id: string): CheckIn | undefined {
    return this.getDoc().checkIns[id];
  }

  /**
   * Get recent check-ins (last 24 hours by default)
   */
  getRecentCheckIns(hoursAgo: number = 24): CheckIn[] {
    const cutoffTime = Date.now() - (hoursAgo * 60 * 60 * 1000);
    return this.listCheckIns().filter(c => c.createdAt >= cutoffTime);
  }

  /**
   * Get check-ins by user
   */
  getUserCheckIns(userId: string): CheckIn[] {
    return this.listCheckIns().filter(c => c.userId === userId);
  }

  /**
   * Get latest check-in for a user
   */
  getLatestCheckIn(userId: string): CheckIn | undefined {
    const userCheckIns = this.getUserCheckIns(userId);
    if (userCheckIns.length === 0) return undefined;
    return userCheckIns.sort((a, b) => b.createdAt - a.createdAt)[0];
  }

  /**
   * Get all check-ins needing support
   */
  getCheckInsNeedingSupport(): CheckIn[] {
    return this.listCheckIns().filter(c =>
      (c.status === 'need-support' || c.status === 'emergency') && !c.acknowledged
    );
  }

  // ===== Care Circle Operations =====
  // REQ-CARE-001: Check-In Support for Elderly and Disabled

  async addCareCircle(careCircle: Omit<CareCircle, 'id' | 'createdAt' | 'updatedAt'>): Promise<CareCircle> {
    const newCareCircle: CareCircle = {
      ...careCircle,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.update((doc) => {
      doc.careCircles[newCareCircle.id] = newCareCircle;
    });

    return newCareCircle;
  }

  async updateCareCircle(id: string, updates: Partial<CareCircle>): Promise<void> {
    await this.update((doc) => {
      if (doc.careCircles[id]) {
        Object.assign(doc.careCircles[id], updates, { updatedAt: Date.now() });
      }
    });
  }

  async deleteCareCircle(id: string): Promise<void> {
    await this.update((doc) => {
      delete doc.careCircles[id];
    });
  }

  getCareCircle(id: string): CareCircle | undefined {
    return this.getDoc().careCircles[id];
  }

  listCareCircles(): CareCircle[] {
    return Object.values(this.getDoc().careCircles);
  }

  /**
   * Get care circle for a specific user
   */
  getUserCareCircle(userId: string): CareCircle | undefined {
    return this.listCareCircles().find(cc => cc.userId === userId);
  }

  /**
   * Get care circles where user is a member
   */
  getCareCirclesForMember(memberId: string): CareCircle[] {
    return this.listCareCircles().filter(cc => cc.members.includes(memberId));
  }

  // ===== Care Activity Operations =====

  async addCareActivity(activity: Omit<CareActivity, 'id' | 'createdAt'>): Promise<CareActivity> {
    const newActivity: CareActivity = {
      ...activity,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    // Remove undefined values for Automerge compatibility
    await this.update((doc) => {
      const activityData: any = { ...newActivity };
      Object.keys(activityData).forEach(key => {
        if (activityData[key] === undefined) {
          delete activityData[key];
        }
      });
      doc.careActivities[newActivity.id] = activityData;
    });

    return newActivity;
  }

  listCareActivities(): CareActivity[] {
    return Object.values(this.getDoc().careActivities);
  }

  getCareActivity(id: string): CareActivity | undefined {
    return this.getDoc().careActivities[id];
  }

  // ===== Missed Check-In Alert Operations =====

  async addMissedCheckInAlert(alert: Omit<MissedCheckInAlert, 'id'>): Promise<MissedCheckInAlert> {
    const newAlert: MissedCheckInAlert = {
      ...alert,
      id: crypto.randomUUID(),
    };

    // Remove undefined values for Automerge compatibility
    await this.update((doc) => {
      const alertData: any = { ...newAlert };
      // Remove undefined fields
      Object.keys(alertData).forEach(key => {
        if (alertData[key] === undefined) {
          delete alertData[key];
        }
      });
      doc.missedCheckInAlerts[newAlert.id] = alertData;
    });

    return newAlert;
  }

  async updateMissedCheckInAlert(id: string, updates: Partial<MissedCheckInAlert>): Promise<void> {
    await this.update((doc) => {
      if (doc.missedCheckInAlerts[id]) {
        // Manually assign each property to avoid Automerge reference errors
        Object.keys(updates).forEach(key => {
          const value = (updates as any)[key];
          if (value !== undefined) {
            if (Array.isArray(value)) {
              // For arrays, check if it exists first
              const existingArray = (doc.missedCheckInAlerts[id] as any)[key];
              if (existingArray && Array.isArray(existingArray)) {
                // Pop all items then push new ones (Automerge doesn't support .length = 0)
                while (existingArray.length > 0) {
                  existingArray.pop();
                }
                value.forEach((item: any) => existingArray.push(item));
              } else {
                // Initialize new array
                (doc.missedCheckInAlerts[id] as any)[key] = value;
              }
            } else {
              (doc.missedCheckInAlerts[id] as any)[key] = value;
            }
          }
        });
      }
    });
  }

  listMissedCheckInAlerts(): MissedCheckInAlert[] {
    return Object.values(this.getDoc().missedCheckInAlerts);
  }

  getMissedCheckInAlert(id: string): MissedCheckInAlert | undefined {
    return this.getDoc().missedCheckInAlerts[id];
  }

  /**
   * Get active alerts for care circles the user is a member of
   */
  getAlertsForCareCircleMember(memberId: string): MissedCheckInAlert[] {
    const careCircles = this.getCareCirclesForMember(memberId);
    const careCircleIds = new Set(careCircles.map(cc => cc.id));

    return this.listMissedCheckInAlerts().filter(alert =>
      careCircleIds.has(alert.careCircleId) && !alert.acknowledged
    );
  }

  /**
   * Get all unacknowledged alerts
   */
  getActiveAlerts(): MissedCheckInAlert[] {
    return this.listMissedCheckInAlerts().filter(alert => !alert.acknowledged);
  }

  // ===== Emergency Alert Operations =====
  // REQ-CARE-002: Emergency Alert System

  async addEmergencyAlert(alert: Omit<EmergencyAlert, 'id'>): Promise<EmergencyAlert> {
    const newAlert: EmergencyAlert = {
      ...alert,
      id: crypto.randomUUID(),
    };

    await this.update((doc) => {
      doc.emergencyAlerts[newAlert.id] = newAlert;
    });

    return newAlert;
  }

  async updateEmergencyAlert(id: string, updates: Partial<EmergencyAlert>): Promise<void> {
    await this.update((doc) => {
      if (doc.emergencyAlerts[id]) {
        Object.assign(doc.emergencyAlerts[id], updates);
      }
    });
  }

  getEmergencyAlert(id: string): EmergencyAlert | undefined {
    return this.getDoc().emergencyAlerts[id];
  }

  listEmergencyAlerts(): EmergencyAlert[] {
    return Object.values(this.getDoc().emergencyAlerts);
  }

  /**
   * Get active (unresolved) emergency alerts
   */
  getActiveEmergencyAlerts(): EmergencyAlert[] {
    return this.listEmergencyAlerts().filter(alert => !alert.resolved);
  }

  /**
   * Get emergency alerts for care circles the user is a member of
   */
  getEmergencyAlertsForMember(memberId: string): EmergencyAlert[] {
    const careCircles = this.getCareCirclesForMember(memberId);
    const careCircleIds = new Set(careCircles.map(cc => cc.id));

    return this.listEmergencyAlerts().filter(alert =>
      careCircleIds.has(alert.careCircleId) && !alert.resolved
    );
  }

  /**
   * Get emergency alert history for a user
   */
  getUserEmergencyAlerts(userId: string): EmergencyAlert[] {
    return this.listEmergencyAlerts().filter(alert => alert.userId === userId);
  }

  // ===== Bulletin Board Operations =====
  // REQ-GOV-019: Community Bulletin Board

  async addBulletinPost(post: Omit<BulletinPost, 'id' | 'createdAt' | 'updatedAt' | 'rsvps' | 'comments' | 'interestedUsers'>): Promise<BulletinPost> {
    const newPost: BulletinPost = {
      ...post,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      rsvps: [],
      comments: [],
      interestedUsers: [],
    };

    await this.update((doc) => {
      doc.bulletinPosts[newPost.id] = newPost;
    });

    return newPost;
  }

  async updateBulletinPost(id: string, updates: Partial<BulletinPost>): Promise<void> {
    await this.update((doc) => {
      if (doc.bulletinPosts[id]) {
        Object.assign(doc.bulletinPosts[id], updates, { updatedAt: Date.now() });
      }
    });
  }

  async deleteBulletinPost(id: string): Promise<void> {
    await this.update((doc) => {
      delete doc.bulletinPosts[id];
    });
  }

  getBulletinPost(id: string): BulletinPost | undefined {
    return this.getDoc().bulletinPosts[id];
  }

  listBulletinPosts(): BulletinPost[] {
    return Object.values(this.getDoc().bulletinPosts);
  }

  /**
   * Get active bulletin posts (not archived or cancelled)
   */
  getActiveBulletinPosts(): BulletinPost[] {
    return this.listBulletinPosts().filter(p => p.status === 'active');
  }

  /**
   * Get bulletin posts for a specific community group
   */
  getBulletinPostsByGroup(communityGroupId: string): BulletinPost[] {
    return this.listBulletinPosts().filter(p => p.communityGroupId === communityGroupId);
  }

  /**
   * Get pinned bulletin posts
   */
  getPinnedBulletinPosts(): BulletinPost[] {
    const now = Date.now();
    return this.listBulletinPosts().filter(p =>
      p.status === 'active' && p.pinnedUntil && p.pinnedUntil > now
    );
  }

  /**
   * Add a comment to a bulletin post
   */
  async addBulletinComment(postId: string, comment: Omit<BulletinComment, 'id' | 'postId' | 'createdAt'>): Promise<BulletinComment> {
    const newComment: BulletinComment = {
      ...comment,
      id: crypto.randomUUID(),
      postId,
      createdAt: Date.now(),
    };

    await this.update((doc) => {
      if (doc.bulletinPosts[postId]) {
        doc.bulletinPosts[postId].comments.push(newComment as any);
        doc.bulletinPosts[postId].updatedAt = Date.now();
      }
    });

    return newComment;
  }

  /**
   * Add or update an RSVP on a bulletin post
   */
  async setBulletinRSVP(postId: string, userId: string, response: RSVPResponse, note?: string): Promise<void> {
    await this.update((doc) => {
      if (doc.bulletinPosts[postId]) {
        const existingIndex = doc.bulletinPosts[postId].rsvps.findIndex(
          (r: BulletinRSVP) => r.userId === userId
        );

        const rsvp: BulletinRSVP = {
          userId,
          response,
          note,
          createdAt: Date.now(),
        };

        if (existingIndex >= 0) {
          // Update existing RSVP
          rsvp.updatedAt = Date.now();
          Object.assign(doc.bulletinPosts[postId].rsvps[existingIndex], rsvp);
        } else {
          // Add new RSVP
          doc.bulletinPosts[postId].rsvps.push(rsvp as any);
        }
        doc.bulletinPosts[postId].updatedAt = Date.now();
      }
    });
  }

  /**
   * Mark a user as interested in a bulletin post (for reminders)
   */
  async markInterested(postId: string, userId: string): Promise<void> {
    await this.update((doc) => {
      if (doc.bulletinPosts[postId]) {
        if (!doc.bulletinPosts[postId].interestedUsers.includes(userId)) {
          doc.bulletinPosts[postId].interestedUsers.push(userId);
          doc.bulletinPosts[postId].updatedAt = Date.now();
        }
      }
    });
  }

  /**
   * Remove interest from a bulletin post
   */
  async removeInterest(postId: string, userId: string): Promise<void> {
    await this.update((doc) => {
      if (doc.bulletinPosts[postId]) {
        const index = doc.bulletinPosts[postId].interestedUsers.indexOf(userId);
        if (index >= 0) {
          doc.bulletinPosts[postId].interestedUsers.splice(index, 1);
          doc.bulletinPosts[postId].updatedAt = Date.now();
        }
      }
    });
  }

  /**
   * Get upcoming event bulletin posts
   */
  getUpcomingEventPosts(): BulletinPost[] {
    const now = Date.now();
    return this.listBulletinPosts().filter(p =>
      p.status === 'active' &&
      p.postType === 'event' &&
      p.eventDetails?.startTime &&
      p.eventDetails.startTime > now
    ).sort((a, b) => (a.eventDetails?.startTime || 0) - (b.eventDetails?.startTime || 0));
  }

  // ===== Community Event Operations =====
  // REQ-GOV-019: Community Bulletin Board - Community events listing

  async addCommunityEvent(event: Omit<CommunityEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommunityEvent> {
    const newEvent: CommunityEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Remove undefined values for Automerge compatibility
    await this.update((doc) => {
      const eventData: Record<string, unknown> = { ...newEvent };
      Object.keys(eventData).forEach(key => {
        if (eventData[key] === undefined) {
          delete eventData[key];
        }
      });
      doc.communityEvents[newEvent.id] = eventData as CommunityEvent;
    });

    return newEvent;
  }

  async updateCommunityEvent(id: string, updates: Partial<CommunityEvent>): Promise<void> {
    await this.update((doc) => {
      if (doc.communityEvents[id]) {
        Object.assign(doc.communityEvents[id], updates, { updatedAt: Date.now() });
      }
    });
  }

  async deleteCommunityEvent(id: string): Promise<void> {
    await this.update((doc) => {
      delete doc.communityEvents[id];
    });
  }

  getCommunityEvent(id: string): CommunityEvent | undefined {
    return this.getDoc().communityEvents[id];
  }

  listCommunityEvents(): CommunityEvent[] {
    return Object.values(this.getDoc().communityEvents);
  }

  /**
   * Get upcoming events (events that haven't started yet)
   */
  getUpcomingEvents(): CommunityEvent[] {
    const now = Date.now();
    return this.listCommunityEvents()
      .filter(e => e.status === 'published' && e.startTime > now)
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get events happening today
   */
  getTodaysEvents(): CommunityEvent[] {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    return this.listCommunityEvents()
      .filter(e => e.status === 'published' && e.startTime >= todayStart && e.startTime < todayEnd)
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get events within a date range
   */
  getEventsInRange(startDate: number, endDate: number): CommunityEvent[] {
    return this.listCommunityEvents()
      .filter(e => e.status === 'published' && e.startTime >= startDate && e.startTime <= endDate)
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get events organized by a specific user
   */
  getUserOrganizedEvents(userId: string): CommunityEvent[] {
    return this.listCommunityEvents().filter(e => e.organizerId === userId);
  }

  /**
   * Get events for a specific community group
   */
  getCommunityGroupEvents(groupId: string): CommunityEvent[] {
    return this.listCommunityEvents()
      .filter(e => e.communityGroupId === groupId && e.status === 'published')
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get events a user has RSVP'd to
   */
  getUserRsvpdEvents(userId: string): CommunityEvent[] {
    return this.listCommunityEvents()
      .filter(e => e.rsvps.some(r => r.userId === userId && r.status === 'going'))
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Add or update RSVP for an event
   */
  async updateEventRsvp(eventId: string, rsvp: CommunityEventRSVP): Promise<void> {
    await this.update((doc) => {
      const event = doc.communityEvents[eventId];
      if (event) {
        const existingIndex = event.rsvps.findIndex(r => r.userId === rsvp.userId);
        if (existingIndex >= 0) {
          // Update existing RSVP
          Object.assign(event.rsvps[existingIndex], rsvp, { respondedAt: Date.now() });
        } else {
          // Add new RSVP
          event.rsvps.push({ ...rsvp, respondedAt: Date.now() });
        }
        event.updatedAt = Date.now();
      }
    });
  }

  /**
   * Add a comment to an event
   */
  async addEventComment(eventId: string, userId: string, text: string): Promise<CommunityEventComment> {
    const comment: CommunityEventComment = {
      id: crypto.randomUUID(),
      userId,
      text,
      createdAt: Date.now(),
    };

    await this.update((doc) => {
      const event = doc.communityEvents[eventId];
      if (event) {
        event.comments.push(comment);
        event.updatedAt = Date.now();
      }
    });

    return comment;
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: CommunityEventType): CommunityEvent[] {
    return this.listCommunityEvents()
      .filter(e => e.eventType === eventType && e.status === 'published')
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get public events (visible to everyone)
   */
  getPublicEvents(): CommunityEvent[] {
    return this.listCommunityEvents()
      .filter(e => e.visibility === 'public' && e.status === 'published')
      .sort((a, b) => a.startTime - b.startTime);
  }

  // ===== Contribution Tracking Operations =====
  // REQ-TIME-002, REQ-TIME-019, REQ-TIME-020, REQ-TIME-021, REQ-TIME-022

  /**
   * Record a contribution to the community
   */
  async addContribution(contribution: Omit<ContributionRecord, 'id' | 'createdAt' | 'celebratedBy'>): Promise<ContributionRecord> {
    const newContribution: ContributionRecord = {
      ...contribution,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      celebratedBy: [],
      visibility: contribution.visibility || 'community',
    };

    await this.update((doc) => {
      doc.contributions[newContribution.id] = newContribution;
    });

    return newContribution;
  }

  /**
   * Celebrate a contribution (add gratitude/recognition)
   */
  async celebrateContribution(contributionId: string, userId: string): Promise<void> {
    await this.update((doc) => {
      const contribution = doc.contributions[contributionId];
      if (contribution && contribution.celebratedBy) {
        if (!contribution.celebratedBy.includes(userId)) {
          contribution.celebratedBy.push(userId);
        }
      }
    });
  }

  /**
   * List all contributions
   */
  listContributions(): ContributionRecord[] {
    return Object.values(this.getDoc().contributions || {});
  }

  /**
   * Add a burnout assessment
   */
  async addBurnoutAssessment(assessment: Omit<BurnoutAssessment, 'id' | 'createdAt'>): Promise<BurnoutAssessment> {
    const newAssessment: BurnoutAssessment = {
      ...assessment,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    await this.update((doc) => {
      doc.burnoutAssessments[newAssessment.id] = newAssessment;
    });

    return newAssessment;
  }

  /**
   * Update a burnout assessment
   */
  async updateBurnoutAssessment(id: string, updates: Partial<BurnoutAssessment>): Promise<void> {
    await this.update((doc) => {
      if (doc.burnoutAssessments[id]) {
        Object.assign(doc.burnoutAssessments[id], updates);
      }
    });
  }

  /**
   * List all burnout assessments
   */
  listBurnoutAssessments(): BurnoutAssessment[] {
    return Object.values(this.getDoc().burnoutAssessments || {});
  }

  // ===== Sync Operations =====

  /**
   * Get binary representation for sync
   */
  getBinary(): Uint8Array {
    if (!this.doc) throw new Error('Database not initialized');
    return Automerge.save(this.doc);
  }

  /**
   * Merge changes from another peer
   * Automerge automatically resolves conflicts
   */
  async merge(remoteBinary: Uint8Array): Promise<void> {
    if (!this.doc) throw new Error('Database not initialized');

    const remoteDoc = Automerge.load<DatabaseSchema>(remoteBinary);
    this.doc = Automerge.merge(this.doc, remoteDoc);

    await this.save();

    // Notify listeners
    for (const listener of this.listeners) {
      listener(this.doc);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      lastSyncTime: 0, // TODO: Track actual sync times
      pendingChanges: 0, // TODO: Track pending changes
      isOnline: navigator.onLine,
      connectedPeers: 0, // TODO: Track peer connections
    };
  }

  /**
   * Reset database - clear all data (for testing)
   * Creates a fresh empty document while preserving the database connection
   */
  async reset(): Promise<void> {
    if (!this.db) {
      await this.init();
      return;
    }

    // Create fresh Automerge document with empty collections
    this.doc = Automerge.from<DatabaseSchema>({
      resources: {},
      needs: {},
      skills: {},
      availabilitySlots: {},
      contributions: {},
      events: {},
      users: {},
      community: {
        id: 'local-community',
        name: 'Local Community',
        description: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: {
          visibility: 'private',
          allowPublicJoin: false,
          requireApproval: true,
        },
        members: [],
      },
      checkIns: {},
      careCircles: {},
      careActivities: {},
      missedCheckInAlerts: {},
      emergencyAlerts: {},
      bulletinPosts: {},
      communityEvents: {},
      gratitude: {},
      randomKindness: {},
      burnoutAssessments: {},
      participationVitality: {},
    });
    await this.save();

    // Notify listeners of the reset
    for (const listener of this.listeners) {
      listener(this.doc);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.doc = null;
    this.listeners.clear();
  }
}

// Singleton instance
export const db = new LocalDatabase();
