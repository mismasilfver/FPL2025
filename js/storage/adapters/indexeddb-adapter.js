import { WeekModel } from '../../models/week-model.js';

export class IndexedDBAdapter {
  constructor(options = {}) {
    const {
      dbName = 'fpl2025',
      dbVersion = 1,
      storageKey = 'fpl-team-data'
    } = options;

    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.storageKey = storageKey;
    this._seedPromise = null;
    this._resolveDbReady = null;
    this._rejectDbReady = null;
    this.dbReady = new Promise((resolve, reject) => {
      this._resolveDbReady = resolve;
      this._rejectDbReady = reject;
    });
    this.initialized = this.initDB();
  }

  async _getStoreItemDirect(storeName, key) {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Error getting ${key} from ${storeName}`));
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
    const rootData = await this._getStoreItemDirect('root', 'singleton');
    if (rootData) return;
    
    const tx = this.db.transaction(['root', 'weeks'], 'readwrite');
    
    tx.objectStore('root').put({
      id: 'singleton',
      version: '3.0',
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

  async _getStoreItem(storeName, key) {
    await this.initialized;
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Error getting ${key} from ${storeName}`));
    });
  }

  async _getAllStoreItems(storeName) {
    await this.initialized;
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Error getting all from ${storeName}`));
    });
  }

  async _getByIndex(storeName, indexName, key) {
    await this.initialized;
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Error getting by index ${indexName} from ${storeName}`));
    });
  }

  async loadFromStorage() {
    await this.initialized;

    const root = await this._getStoreItem('root', 'singleton') || { version: '3.0', currentWeek: 1 };

    // Multi-team (or any future) roots are persisted as a full JSON blob on the
    // root record. If present, it is the source of truth and takes precedence
    // over the legacy per-week object stores.
    if (root.dataJson) {
      const parsed = JSON.parse(root.dataJson);
      return parsed;
    }

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
        version: '3.0',
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
      return { version: '3.0', currentWeek: 1, weeks: {} };
    }

    // Multi-team roots (or any shape beyond the legacy single-team fields)
    // are returned as-is; they were persisted verbatim as a JSON blob.
    if (root.teams) {
      return root;
    }

    root.weeks = root.weeks || {};
    root.currentWeek = Number.isInteger(root.currentWeek) && root.currentWeek > 0
      ? root.currentWeek
      : 1;
    root.version = root.version || '3.0';
    return root;
  }

  async setRootData(root) {
    await this.initialized;

    if (!root || typeof root !== 'object') {
      throw new TypeError('Root payload must be an object for IndexedDB storage');
    }

    const normalizedRoot = { ...root };
    normalizedRoot.version = root.version || '3.0';
    normalizedRoot.currentWeek = Number.isInteger(root.currentWeek) && root.currentWeek > 0 ? root.currentWeek : 1;
    normalizedRoot.weeks = Object.entries(root.weeks || {}).reduce((acc, [key, value]) => {
        const weekNumber = Number(key);
        if (Number.isInteger(weekNumber) && weekNumber > 0) {
            acc[weekNumber] = WeekModel.normalize(value, weekNumber);
        }
        return acc;
    }, {});

    return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['root', 'weeks', 'teamMembers'], 'readwrite');

        // Persist the full payload verbatim so any fields beyond the legacy
        // single-team schema (e.g. multi-team `teams`/`currentTeam`/`settings`)
        // survive the round trip. The legacy per-week stores are still kept
        // in sync below for backward compatibility with older data/queries.
        tx.objectStore('root').put({
            id: 'singleton',
            version: normalizedRoot.version,
            currentWeek: normalizedRoot.currentWeek,
            dataJson: JSON.stringify(root)
        });

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

        tx.oncomplete = () => resolve(root);
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

  // Legacy KV facade support
  async getItem(key) {
    if (key !== this.storageKey) return null;
    const root = await this.getRootData();
    return JSON.stringify(root);
  }

  async setItem(key, value) {
    if (key !== this.storageKey) return;
    const payload = typeof value === 'string' ? JSON.parse(value) : value;
    return this.setRootData(payload);
  }
}
