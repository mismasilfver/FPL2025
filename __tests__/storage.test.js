/**
 * @jest-environment jsdom
 */

// We need to import the classes from script.js. Since it's not a module, we'll load it via fs.
const fs = require('fs');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Mock the DOM environment
document.body.innerHTML = `
    <div id="player-modal"></div>
    <input id="player-name" />
`;

// Evaluate the script content in the global scope to make classes available
eval(scriptContent);

describe('StorageService', () => {
    const storageKey = 'fpl-team-data-test';
    let storageService;

    beforeEach(() => {
        localStorage.clear();
        storageService = new StorageService(storageKey);
    });

    afterEach(() => {
        localStorage.clear();
    });

    test('should save and load data for a specific week', () => {
        const week1Data = { 
            players: [{ id: '1', name: 'Player A' }], 
            captain: '1', 
            viceCaptain: null 
        };
        storageService.saveToStorage(1, week1Data, 1);

        const loadedData = storageService.loadFromStorage();
        expect(loadedData.players).toEqual(week1Data.players);
        expect(loadedData.captain).toBe('1');
        expect(loadedData.currentWeek).toBe(1);
    });

    test('should return the correct week count', () => {
        storageService.saveToStorage(1, { players: [] }, 1);
        storageService.saveToStorage(2, { players: [] }, 2);
        expect(storageService.getWeekCount()).toBe(2);
    });

    test('should return a snapshot for a specific week', () => {
        const week2Data = { players: [{ id: '2', name: 'Player B' }] };
        storageService.saveToStorage(1, { players: [{ id: '1' }] }, 2);
        storageService.saveToStorage(2, week2Data, 2);

        const snapshot = storageService.getWeekSnapshot(2);
        expect(snapshot.players).toEqual(week2Data.players);
    });

    test('should return default empty state if no data is in storage', () => {
        const loadedData = storageService.loadFromStorage();
        expect(loadedData).toEqual({ 
            players: [], 
            captain: null, 
            viceCaptain: null, 
            currentWeek: 1 
        });
    });

    test('should migrate old data format to new weekly format', () => {
        const oldDataKey = 'fpl-team';
        const oldData = {
            players: [{ id: '1', name: 'Old Player' }],
            captain: '1',
            viceCaptain: null
        };
        localStorage.setItem(oldDataKey, JSON.stringify(oldData));

        // The migration is called in the FPLTeamManager constructor, so we instantiate it
        // We'll need a mock StorageService for this test to work as intended.
        const serviceWithMigration = new StorageService('fpl-team-data');
        serviceWithMigration.migrateStorageIfNeeded();

        const migratedData = JSON.parse(localStorage.getItem('fpl-team-data'));
        expect(migratedData.version).toBe('2.0');
        expect(migratedData.currentWeek).toBe(1);
        expect(migratedData.weeks['1'].players).toEqual(oldData.players);
        expect(localStorage.getItem(oldDataKey)).not.toBeNull(); // We don't remove old key by default
    });
});
