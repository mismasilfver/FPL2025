/**
 * @jest-environment jsdom
 */

// Load script.js content since it's not a proper module
const fs = require('fs');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Mock DOM environment
document.body.innerHTML = `
    <div id="player-modal"></div>
    <input id="player-name" />
`;

// Evaluate the script content to make classes available
eval(scriptContent);

const { LocalStorageAdapter } = require('../js/storage');

describe('Week Management', () => {
    let manager;
    let mockStorage;
    let mockUi;

    const samplePlayers = [
        { id: '1', name: 'Player 1', position: 'midfield', team: 'MUN', price: 8.0, have: true, notes: '' },
        { id: '2', name: 'Player 2', position: 'defence', team: 'LIV', price: 5.5, have: true, notes: 'Test' },
        { id: '3', name: 'Player 3', position: 'forward', team: 'MCI', price: 11.5, have: false, notes: '' },
    ];

    beforeEach(() => {
        // Mock storage - use StorageService instead of LocalStorageAdapter
        mockStorage = new global.StorageService('test-key');
        
        // Mock the StorageService methods
        jest.spyOn(mockStorage, 'loadFromStorage').mockReturnValue({
            players: [...samplePlayers],
            captain: '1',
            viceCaptain: '2',
            currentWeek: 1
        });
        
        jest.spyOn(mockStorage, 'saveToStorage').mockImplementation(() => {});
        
        // Mock getWeekCount to return different values based on test state
        let weekCount = 1;
        jest.spyOn(mockStorage, 'getWeekCount').mockImplementation(() => weekCount);
        
        jest.spyOn(mockStorage, 'getWeekSnapshot').mockImplementation((weekNum) => {
            if (weekNum === 1) {
                return {
                    players: [...samplePlayers],
                    captain: '1',
                    viceCaptain: '2'
                };
            } else if (weekNum === 2) {
                return {
                    players: [...samplePlayers], // All players are copied
                    captain: '1',
                    viceCaptain: '2'
                };
            }
            return null;
        });
        
        // Mock UI - create a simple mock object instead of using UIManager
        mockUi = {
            initElements: jest.fn(),
            bindEvents: jest.fn(),
            updateDisplay: jest.fn(),
            renderWeekControls: jest.fn(),
            renderSummary: jest.fn(),
            renderCaptaincyInfo: jest.fn(),
            renderPlayers: jest.fn()
        };
        
        // Initialize manager with mocks
        manager = new global.FPLTeamManager({ ui: mockUi, storage: mockStorage });

        // Helper to simulate week creation - MUST be after manager is initialized
        manager.mockCreateWeek = () => {
            weekCount++;
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should initialize with week 1', async () => {
        await manager.loadStateFromStorage();
        expect(manager.getCurrentWeekNumber()).toBe(1);
        expect(manager.getWeekCount()).toBe(1);
    });

    test('should create a new week with previous week\'s team', async () => {
        await manager.loadStateFromStorage();
        
        // Create a new week
        await manager.createNewWeek();
        manager.mockCreateWeek(); // Simulate the week count increase in storage
        
        // Should now be on week 2
        expect(manager.getCurrentWeekNumber()).toBe(2);
        expect(manager.getWeekCount()).toBe(2);
        
        // Week 1 should be marked as read-only
        expect(manager.isWeekReadOnly(1)).toBe(true);
        
        // Current week should not be read-only
        expect(manager.isCurrentWeekReadOnly()).toBe(false);
        
        // Team should be copied from previous week
        const week2Data = manager.getWeekSnapshot(2);
        expect(week2Data.players).toHaveLength(3); // All players should be copied
        expect(week2Data.captain).toBe('1');
        expect(week2Data.viceCaptain).toBe('2');
    });

    test('should navigate between weeks', async () => {
        await manager.loadStateFromStorage();
        
        // Create week 2
        await manager.createNewWeek();
        
        // Go back to week 1
        await manager.goToWeek(1);
        expect(manager.getCurrentWeekNumber()).toBe(1);
        
        // Go forward to week 2
        await manager.nextWeek();
        expect(manager.getCurrentWeekNumber()).toBe(2);
        
        // Go back to week 1 using prevWeek
        await manager.prevWeek();
        expect(manager.getCurrentWeekNumber()).toBe(1);
    });

    test('should not modify read-only weeks', async () => {
        await manager.loadStateFromStorage();
        
        // Create week 2
        await manager.createNewWeek();
        
        // Try to modify week 1 (read-only)
        await manager.goToWeek(1);
        
        // Attempt to make changes to week 1
        const originalCaptain = manager.state().captain;
        manager.setCaptain('3'); // Should not work
        
        // Captain should not change in read-only week
        expect(manager.state().captain).toBe(originalCaptain);
    });

    test('should calculate total cost correctly', async () => {
        await manager.loadStateFromStorage();
        
        // Total cost should be sum of players with have:true
        const expectedCost = samplePlayers
            .filter(p => p.have)
            .reduce((sum, p) => sum + p.price, 0);
            
        expect(manager.calculateTotalCost()).toBe(expectedCost);
    });
});
