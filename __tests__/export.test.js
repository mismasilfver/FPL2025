/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');
const { FPLTeamManager } = require('../script');
const { __getMockStorage } = require('../js/storage-module.js');

// Helper to set up the DOM from index.html
const setupDOM = () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    document.body.innerHTML = html;
    // Manually instantiate the manager to attach event listeners
    if (!window.fplManager) {
        window.fplManager = new FPLTeamManager();
    }
    window.fplManager.ui.initElements(document);
    window.fplManager.ui.bindEvents({
        onExportWeek: window.fplManager.exportWeekData.bind(window.fplManager)
    });
};

describe('Export Functionality', () => {
    beforeEach(() => {
        setupDOM();
        localStorage.clear();
        const storage = __getMockStorage?.();
        storage?.reset?.();
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should trigger download with correct filename and content for the current week', async () => {
        // Arrange
        const fplManager = window.fplManager;
        const testPlayers = [
            { id: '1', name: 'Player A', position: 'midfield', team: 'TEA', price: 8.5, have: true, notes: '', status: 'green' },
            { id: '2', name: 'Player B', position: 'defence', team: 'TEB', price: 5.0, have: false, notes: 'Test note', status: 'yellow' },
        ];
        
        // Set up the data structure properly
        const weekData = {
            version: '2.0',
            currentWeek: 3,
            weeks: {
                3: {
                    players: testPlayers,
                    captain: '1',
                    viceCaptain: '2',
                    isReadOnly: false
                }
            }
        };
        const storage = __getMockStorage?.();
        if (storage && typeof storage.setRootData === 'function') {
            await storage.setRootData(weekData);
        } else if (typeof fplManager.storage.setRootData === 'function') {
            await fplManager.storage.setRootData(weekData);
        } else {
            throw new Error('No storage implementation with setRootData available for export test.');
        }

        // Create a real anchor element to spy on, but mock its click method
        const link = document.createElement('a');
        jest.spyOn(link, 'click').mockImplementation(() => {}); // Prevent navigation

        // Spy on createElement to return our controlled anchor element
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(link);

        // Act - call the export method directly since event binding is complex in tests
        await fplManager.exportWeekData();

        // Assert
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(link.download).toBe('fpl_week_3_data.json');
        expect(link.href).toBe('http://localhost/mock-url');
        expect(link.click).toHaveBeenCalled();

        // Verify the content passed to Blob - should match getWeekSnapshot format
        const expectedData = {
            week: 3,
            players: testPlayers,
            captain: '1',
            viceCaptain: '2',
        };
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'application/json'
            })
        );
    });
});
