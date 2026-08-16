import { WeekModel } from '../../models/week-model.js';
import { ROOT_VERSION, normalizeRootMetadata, normalizeRootWeeks } from '../root-data.js';
import { BaseStorageAdapter } from './base-storage-adapter.js';

export class IndexedDBAdapter extends BaseStorageAdapter {
  constructor(options = {}) {
    const {
      dbName = 'fpl2025',
      dbVersion = 1,
      storageKey = 'fpl-team-data'
    } = options;

    super({ storageKey });
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this._seedPromise = null;
    this._resolveDbReady = null;
    this._rejectDbReady = null;
    this.dbReady = new Promise((resolve, reject) => {
      this._resolveDbReady = resolve;
      this._rejectDbReady = reject;
    });
    this.initialized = this.initDB();
  }

  /**
   * Runs a read-only IndexedDB request and resolves with its result.
   *
   * `awaitInitialized` is skipped by seeding, which runs as part of initialization
   * and would otherwise deadlock on itself.
   */
  async _readRequest(storeName, buildRequest, errorMessage, { awaitInitialized = true } = {}) {
    if (awaitInitialized) await this.initialized;
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const store = this.db.transaction(storeName, 'readonly').objectStore(storeName);
      const request = buildRequest(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(errorMessage));
    });
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('root')) {
          db.createObjectStore('root', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('weeks')) {
          db.createObjectStore('weeks', { keyPath: 'weekNumber' });
        }
        
        if (!db.objectStoreNames.contains('teamMembers')) {
          const teamMembersStore = db.createObjectStore('teamMembers', { 
            keyPath: ['weekNumber', 'playerId'] 
          });
          teamMembersStore.createIndex('by_week', 'weekNumber');
        }
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        this._resolveDbReady?.();
        this.initialize().then(resolve).catch(reject);
      };
      
      request.onerror = (event) => {
        const error = new Error(`Database error: ${event.target.errorCode}`);
        this._rejectDbReady?.(error);
        reject(error);
      };
    });
  }

  async initialize() {
    if (!this._seedPromise) {
      this._seedPromise = this._seedDatabaseIfNeeded();
    }
    return this._seedPromise;
  }

  async _seedDatabaseIfNeeded() {
    await this.dbReady;
    const rootData = await this._getStoreItem('root', 'singleton', { awaitInitialized: false });
    if (rootData) return;
    
    const tx = this.db.transaction(['root', 'weeks'], 'readwrite');
    
    tx.objectStore('root').put({
      id: 'singleton',
      version: ROOT_VERSION,
      currentWeek: 1
    });
    
    const defaultWeek = WeekModel.createDefault(1);
    tx.objectStore('weeks').put({
      weekNumber: defaultWeek.weekNumber,
      captain: defaultWeek.captain,
      viceCaptain: defaultWeek.viceCaptain,
      totalTeamCost: defaultWeek.totalTeamCost,
      teamStats: defaultWeek.teamStats,
      isReadOnly: defaultWeek.isReadOnly,
      playersJson: JSON.stringify(defaultWeek.players)
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error(`Transaction error: ${e.target.error}`));
    });
  }

  async _getStoreItem(storeName, key, options) {
    return this._readRequest(
      storeName,
      (store) => store.get(key),
      `Error getting ${key} from ${storeName}`,
      options
    );
  }

  async _getAllStoreItems(storeName, options) {
    return this._readRequest(
      storeName,
      (store) => store.getAll(),
      `Error getting all from ${storeName}`,
      options
    );
  }

  async _getByIndex(storeName, indexName, key, options) {
    return this._readRequest(
      storeName,
      (store) => store.index(indexName).getAll(key),
      `Error getting by index ${indexName} from ${storeName}`,
      options
    );
  }

  async loadFromStorage() {
    await this.initialized;
    
    const root = await this._getStoreItem('root', 'singleton') || { version: ROOT_VERSION, currentWeek: 1 };
    const weekRows = await this._getAllStoreItems('weeks');
    const weeks = {};
    
    for (const wk of weekRows) {
      const players = JSON.parse(wk.playersJson || '[]');
      
      const teamMembers = await this._getByIndex('teamMembers', 'by_week', wk.weekNumber);
      
      const weekPayload = {
        ...wk,
        players,
        teamMembers: teamMembers.map(m => ({ playerId: m.playerId, addedAt: m.addedAt }))
      };
      weeks[wk.weekNumber] = WeekModel.normalize(weekPayload, wk.weekNumber);
    }
    
    return { version: root.version, currentWeek: root.currentWeek, weeks };
  }

  async saveToStorage(weekToSave, { players, captain, viceCaptain }, currentWeek) {
    await this.initialized;
    weekToSave = Number(weekToSave);
    currentWeek = Number(currentWeek);
    
    const { teamMembers, teamStats, totalTeamCost } = WeekModel.computeTeamSnapshot(players || [], weekToSave);
    const dbTeamMembers = teamMembers.map(m => ({ ...m, weekNumber: weekToSave }));

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['root', 'weeks', 'teamMembers'], 'readwrite');
      
      tx.objectStore('weeks').put({
        weekNumber: weekToSave,
        captain: captain || null,
        viceCaptain: viceCaptain || null,
        totalTeamCost,
        teamStats,
        isReadOnly: false,
        playersJson: JSON.stringify(players || [])
      });
      
      tx.objectStore('root').put({
        id: 'singleton',
        version: ROOT_VERSION,
        currentWeek
      });
      
      const membersStore = tx.objectStore('teamMembers');
      const index = membersStore.index('by_week');
      const request = index.openCursor(IDBKeyRange.only(weekToSave));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      for (const member of dbTeamMembers) {
        membersStore.put(member);
      }
      
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error(`Transaction error: ${e.target.error}`));
    });
  }

  async getRootData() {
    const root = await this.loadFromStorage();
    if (!root || typeof root !== 'object') {
      return { version: ROOT_VERSION, currentWeek: 1, weeks: {} };
    }
    return Object.assign(root, normalizeRootMetadata(root), { weeks: root.weeks || {} });
  }

  async setRootData(root) {
    await this.initialized;

    if (!root || typeof root !== 'object') {
      throw new TypeError('Root payload must be an object for IndexedDB storage');
    }

    const normalizedRoot = {
      ...root,
      ...normalizeRootMetadata(root),
      weeks: normalizeRootWeeks(root.weeks)
    };

    return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['root', 'weeks', 'teamMembers'], 'readwrite');

        tx.objectStore('root').put({ id: 'singleton', version: normalizedRoot.version, currentWeek: normalizedRoot.currentWeek });

        const weeksStore = tx.objectStore('weeks');
        const membersStore = tx.objectStore('teamMembers');

        weeksStore.clear();
        membersStore.clear();

        for (const [weekNumber, weekData] of Object.entries(normalizedRoot.weeks)) {
            weeksStore.put({
                weekNumber: weekData.weekNumber,
                captain: weekData.captain,
                viceCaptain: weekData.viceCaptain,
                totalTeamCost: weekData.totalTeamCost,
                teamStats: weekData.teamStats,
                isReadOnly: weekData.isReadOnly,
                playersJson: JSON.stringify(weekData.players)
            });

            for (const member of weekData.teamMembers) {
                membersStore.put({ ...member, weekNumber: weekData.weekNumber });
            }
        }

        tx.oncomplete = () => resolve(normalizedRoot);
        tx.onerror = (e) => reject(new Error(`Failed to persist root payload: ${e.target.error}`));
    });
  }

  async close() {
    try {
      await this.initialized;
    } catch (e) {
      // Ignore initialization errors during close
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
