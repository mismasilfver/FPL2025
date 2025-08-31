const { setupDOM } = require('./test-dom');
const { FPLTeamManager, UIManager } = require('../script');

describe('Modal Creation Debug', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('modal template exists and can be built', () => {
    // Check if template exists
    const template = document.getElementById('player-modal-template');
    expect(template).not.toBeNull();
    
    // Try to build modal from template
    const frag = template.content.cloneNode(true);
    document.body.appendChild(frag);
    
    // Check if modal was created
    const modal = document.getElementById('player-modal');
    expect(modal).not.toBeNull();
    
    // Check if form elements exist
    const nameInput = document.getElementById('player-name-input');
    const positionSelect = document.getElementById('player-position-select');
    const teamInput = document.getElementById('player-team-input');
    const priceInput = document.getElementById('player-price-input');
    
    expect(nameInput).not.toBeNull();
    expect(positionSelect).not.toBeNull();
    expect(teamInput).not.toBeNull();
    expect(priceInput).not.toBeNull();
  });
  
  test('clicking add button creates modal with form elements', async () => {
    // Mock storage to prevent side-effects
    const mockStorage = {
        migrateStorageIfNeeded: jest.fn(),
        loadFromStorage: jest.fn().mockReturnValue({ players: [], captain: null, viceCaptain: null, currentWeek: 1 }),
        saveToStorage: jest.fn(),
        getWeekCount: jest.fn().mockReturnValue(1),
        getWeekSnapshot: jest.fn().mockReturnValue(null),
    };

    // Initialize manager with UI and mock storage
    const ui = new UIManager();
    const manager = new FPLTeamManager({ ui, storage: mockStorage });
    await manager.loadStateFromStorage(); // Correctly load initial state
    
    // Click add button
    const addButton = document.getElementById('add-player-btn');
    addButton.click();
    
    // Check if modal exists
    const modal = document.getElementById('player-modal');
    expect(modal).not.toBeNull();
    
    // Check if form elements exist
    const nameInput = document.getElementById('player-name-input');
    const positionSelect = document.getElementById('player-position-select');
    const teamInput = document.getElementById('player-team-input');
    const priceInput = document.getElementById('player-price-input');
    
    expect(nameInput).not.toBeNull();
    expect(positionSelect).not.toBeNull();
    expect(teamInput).not.toBeNull();
    expect(priceInput).not.toBeNull();
  });
});
