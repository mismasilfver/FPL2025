/**
 * IndexedDB implementation of the StorageService interface
 * Provides the same API as the localStorage-based StorageService
 * but uses IndexedDB for storage
 */
export class StorageServiceDB {
  constructor() {
    this.dbName = 'fpl2025';
    this.dbVersion = 1;
    this.initialized = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores if they don't exist
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
        this.initialize().then(resolve).catch(reject);
      };
      
      request.onerror = (event) => {
        reject(new Error(`Database error: ${event.target.errorCode}`));
      };
    });
  }

  async initialize() {
    // Check if root exists
    const rootData = await this.getItem('root', 'singleton');
    if (rootData) return;
    
    // Initialize with empty data
    const tx = this.db.transaction(['root', 'weeks'], 'readwrite');
    
    tx.objectStore('root').put({
      id: 'singleton',
      version: '2.0',
      currentWeek: 1
    });
    
    tx.objectStore('weeks').put({
      weekNumber: 1,
      captain: null,
      viceCaptain: null,
      totalTeamCost: 0,
      teamStats: {
        totalValue: 0,
        playerCount: 0,
        createdDate: new Date().toISOString()
      },
      isReadOnly: false,
      playersJson: JSON.stringify([])
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error(`Transaction error: ${e.target.error}`));
    });
  }

  // Helper: Get a single item from a store
  async getItem(storeName, key) {
    await this.initialized;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Error getting ${key} from ${storeName}`));
    });
  }

  // Helper: Get all items from a store
  async getAllItems(storeName) {
    await this.initialized;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Error getting all from ${storeName}`));
    });
  }

  // Helper: Get items by index
  async getByIndex(storeName, indexName, key) {
    await this.initialized;
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
    
    const root = await this.getItem('root', 'singleton') || { version: '2.0', currentWeek: 1 };
    const weekRows = await this.getAllItems('weeks');
    const weeks = {};
    
    for (const wk of weekRows) {
      const players = JSON.parse(wk.playersJson || '[]');
      
      // Get team members for this week
      const teamMembers = await this.getByIndex('teamMembers', 'by_week', wk.weekNumber);
      
      weeks[wk.weekNumber] = {
        players,
        captain: wk.captain,
        viceCaptain: wk.viceCaptain,
        teamMembers: teamMembers.map(m => ({ 
          playerId: m.playerId, 
          addedAt: m.addedAt 
        })),
        totalTeamCost: wk.totalTeamCost,
        teamStats: wk.teamStats,
        isReadOnly: !!wk.isReadOnly
      };
    }
    
    return { version: root.version, currentWeek: root.currentWeek, weeks };
  }

  async saveToStorage(weekToSave, { players, captain, viceCaptain }, currentWeek) {
    await this.initialized;
    weekToSave = Number(weekToSave);
    currentWeek = Number(currentWeek);
    
    // Compute minimal teamMembers + total cost
    const teamMembers = (players || [])
      .filter(p => p.have)
      .map(p => ({ 
        weekNumber: weekToSave,
        playerId: p.id, 
        addedAt: weekToSave 
      }));
      
    const totalTeamCost = (players || [])
      .filter(p => p.have)
      .reduce((s, p) => s + (Number(p.price) || 0), 0);
      
    const teamStats = {
      totalValue: totalTeamCost,
      playerCount: teamMembers.length,
      updatedDate: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['root', 'weeks', 'teamMembers'], 'readwrite');
      
      // Update week data
      tx.objectStore('weeks').put({
        weekNumber: weekToSave,
        captain: captain || null,
        viceCaptain: viceCaptain || null,
        totalTeamCost,
        teamStats,
        isReadOnly: false,
        playersJson: JSON.stringify(players || [])
      });
      
      // Update root data
      tx.objectStore('root').put({
        id: 'singleton',
        version: '2.0',
        currentWeek
      });
      
      // Delete existing team members for this week
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
      
      // Add new team members
      for (const member of teamMembers) {
        membersStore.put(member);
      }
      
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error(`Transaction error: ${e.target.error}`));
    });
  }

  async getWeekCount() {
    await this.initialized;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('weeks', 'readonly');
      const store = tx.objectStore('weeks');
      const countRequest = store.count();
      
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(new Error('Error counting weeks'));
    });
  }

  async getWeekSnapshot(weekNumber) {
    await this.initialized;
    weekNumber = Number(weekNumber);
    
    const wk = await this.getItem('weeks', weekNumber);
    if (!wk) return { 
      players: [], 
      captain: null, 
      viceCaptain: null, 
      teamMembers: [], 
      teamStats: { totalValue: 0, playerCount: 0 } 
    };
    
    const players = JSON.parse(wk.playersJson || '[]');
    const teamMembers = await this.getByIndex('teamMembers', 'by_week', weekNumber);
    
    return {
      players,
      captain: wk.captain || null,
      viceCaptain: wk.viceCaptain || null,
      teamMembers: teamMembers.map(m => ({ 
        playerId: m.playerId, 
        addedAt: m.addedAt 
      })),
      teamStats: wk.teamStats || { 
        totalValue: 0, 
        playerCount: teamMembers.length 
      }
    };
  }

  async importFromJSON(jsonData) {
    await this.initialized;
    
    // Parse if string
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Validate structure
    if (!data || !data.weeks || typeof data.weeks !== 'object') {
      throw new Error('Invalid JSON format: missing weeks object');
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['root', 'weeks', 'teamMembers'], 'readwrite');
      
      // Clear existing data
      tx.objectStore('weeks').clear();
      tx.objectStore('teamMembers').clear();
      
      // Set root data
      tx.objectStore('root').put({ 
        id: 'singleton', 
        version: data.version || '2.0', 
        currentWeek: Number(data.currentWeek || 1) 
      });
      
      // Import weeks
      for (const key of Object.keys(data.weeks)) {
        const wNum = Number(key);
        const wk = data.weeks[key] || {};
        
        // Store week
        tx.objectStore('weeks').put({
          weekNumber: wNum,
          captain: wk.captain || null,
          viceCaptain: wk.viceCaptain || null,
          totalTeamCost: wk.totalTeamCost || (wk.teamStats?.totalValue || 0),
          teamStats: wk.teamStats || { 
            totalValue: 0, 
            playerCount: 0,
            updatedDate: new Date().toISOString()
          },
          isReadOnly: !!wk.isReadOnly,
          playersJson: JSON.stringify(wk.players || [])
        });
        
        // Store team members
        const members = Array.isArray(wk.teamMembers) ? wk.teamMembers : [];
        for (const m of members) {
          tx.objectStore('teamMembers').put({ 
            weekNumber: wNum, 
            playerId: m.playerId, 
            addedAt: Number(m.addedAt || wNum) 
          });
        }
      }
      
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(new Error(`Import failed: ${e.target.error}`));
    });
  }
}
