/**
 * Local-first database implementation using Automerge (CRDT) and IndexedDB
 *
 * REQ-DEPLOY-010: Local-First Database
 * REQ-DEPLOY-005: Offline-First Architecture
 */

import * as Automerge from '@automerge/automerge';
import { openDB, type IDBPDatabase } from 'idb';
import type { DatabaseSchema, Resource, Need, SkillOffer, EconomicEvent, UserProfile, Community, SyncStatus, CheckIn, CheckInStatus, CareCircle, MissedCheckInAlert, EmergencyAlert } from '../types';

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
    } else {
      // Create new document with initial schema
      this.doc = Automerge.from<DatabaseSchema>({
        resources: {},
        needs: {},
        skills: {},
        events: {},
        users: {},
        community: {
          id: crypto.randomUUID(),
          name: 'My Community',
          description: 'A solarpunk mutual aid community',
          createdAt: Date.now(),
          memberCount: 0,
        },
        checkIns: {},
        careCircles: {},
        missedCheckInAlerts: {},
        emergencyAlerts: {},
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

  // ===== Need Operations =====

  async addNeed(need: Omit<Need, 'id' | 'createdAt' | 'updatedAt'>): Promise<Need> {
    const newNeed: Need = {
      ...need,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.update((doc) => {
      doc.needs[newNeed.id] = newNeed;
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

  // ===== Community Operations =====

  async updateCommunity(updates: Partial<Community>): Promise<void> {
    await this.update((doc) => {
      Object.assign(doc.community, updates);
    });
  }

  getCommunity(): Community {
    return this.getDoc().community;
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
              // For arrays, clear and push items to avoid reference errors
              (doc.checkIns[id] as any)[key].length = 0;
              value.forEach((item: any) => (doc.checkIns[id] as any)[key].push(item));
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
              // For arrays, clear and push items to avoid reference errors
              (doc.missedCheckInAlerts[id] as any)[key].length = 0;
              value.forEach((item: any) => (doc.missedCheckInAlerts[id] as any)[key].push(item));
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
