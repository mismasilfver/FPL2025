/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');
const { FPLTeamManager } = require('../script');

// Helper to set up the DOM from index.html
const setupDOM = () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    document.body.innerHTML = html;
    // Manually instantiate the manager to attach event listeners
    window.fplManager = new FPLTeamManager();
};

describe('Export Functionality', () => {
    beforeEach(() => {
        setupDOM();
        localStorage.clear();
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should trigger download with correct filename and content for the current week', () => {
        // Arrange
        const fplManager = window.fplManager;
        const testPlayers = [
            { id: '1', name: 'Player A', position: 'midfield', team: 'TEA', price: 8.5, have: true, notes: '', status: 'green' },
            { id: '2', name: 'Player B', position: 'defence', team: 'TEB', price: 5.0, have: false, notes: 'Test note', status: 'yellow' },
        ];
        fplManager.players = testPlayers;
        fplManager.currentWeek = 3;
        fplManager.captain = '1';
        fplManager.viceCaptain = '2';

        // Create a real anchor element to spy on, but mock its click method
        const link = document.createElement('a');
        jest.spyOn(link, 'click').mockImplementation(() => {}); // Prevent navigation

        // Spy on createElement to return our controlled anchor element
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(link);

        // Act
        const exportButton = document.getElementById('export-week-btn');
        exportButton.click();

        // Assert
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(link.download).toBe('fpl_week_3_data.json');
        expect(link.href).toBe('http://localhost/mock-url');
        expect(link.click).toHaveBeenCalled();

        // Verify the content passed to Blob
        const expectedData = {
            week: 3,
            players: testPlayers,
            captain: '1',
            viceCaptain: '2',
        };
        const blob = new Blob([JSON.stringify(expectedData, null, 2)], { type: 'application/json' });
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    });
});
