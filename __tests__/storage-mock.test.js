/**
 * @jest-environment jsdom
 */

// Mock the StorageService
class MockStorageService {
  constructor() {
    this.storage = new Map();
    this.currentWeek = 1;
  }

  async saveData(week, data) {
    this.storage.set(`week-${week}`, JSON.stringify(data));
    return true;
  }

  async loadData(week) {
    const data = this.storage.get(`week-${week}`);
    return data ? JSON.parse(data) : null;
  }

  async migrateOldData(oldData) {
    if (!oldData) return false;
    
    const week1Data = {
      players: oldData.players || [],
      captain: oldData.captain || null,
      viceCaptain: oldData.viceCaptain || null,
      week: 1
    };
    
    await this.saveData(1, week1Data);
    return true;
  }
}

describe('Storage Service', () => {
  let storageService;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="player-modal"></div>
      <input id="player-name" />
    `;
    
    // Initialize storage service
    storageService = new MockStorageService();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('should save and load data for a specific week', async () => {
    const week1Data = { 
      players: [{ id: '1', name: 'Player A' }], 
      captain: '1', 
      viceCaptain: null,
      week: 1
    };

    // Save data for week 1
    await storageService.saveData(1, week1Data);
    
    // Load data for week 1
    const loadedData = await storageService.loadData(1);
    
    expect(loadedData).toEqual(week1Data);
  });

  test('should migrate old data format to new weekly format', async () => {
    const oldData = {
      players: [{ id: '1', name: 'Old Player' }],
      captain: '1',
      viceCaptain: null
    };

    // Migrate old data
    const result = await storageService.migrateOldData(oldData);
    
    expect(result).toBe(true);
    
    // Check if data was migrated correctly
    const week1Data = await storageService.loadData(1);
    expect(week1Data.players).toEqual(oldData.players);
    expect(week1Data.captain).toBe(oldData.captain);
    expect(week1Data.week).toBe(1);
  });
});
