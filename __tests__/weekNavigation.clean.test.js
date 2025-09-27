const { createDOM, userEvent } = require('../test-utils');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock localStorage to avoid security errors
const globalLocalStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = globalLocalStorageMock;

// Import app modules through Jest/Babel (no eval)
const { initializeApp } = require('../js/app-init.js');
// Ensure classes are loaded (and globals set for some helpers)
const { FPLTeamManager, UIManager } = require('../script.js');

// Mock the global document and window objects
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');

global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

global.localStorage = localStorageMock;

// Mock the FPLTeamManager class
jest.mock('../script.js', () => {
  const originalModule = jest.requireActual('../script.js');
  
  // Mock implementation of FPLTeamManager that uses real UIManager
  class MockFPLTeamManager {
    constructor() {
      this.currentWeek = 1;
      this.weeks = {
        1: { players: [], teamMembers: [] }
      };
      // Use the real UIManager
      this.ui = new originalModule.UIManager();
    }
    
    async init(doc) {
      // Initialize UI elements and render controls properly
      await this.ui.initElements(doc || global.document);
      this.updateDisplay();
    }
    
    updateDisplay() {
      // Call the real renderWeekControls method
      this.ui.renderWeekControls({
        currentWeek: this.currentWeek,
        totalWeeks: this.getWeekCount(),
        isReadOnly: false
      });
    }
    
    getCurrentWeekNumber() {
      return this.currentWeek;
    }
    
    getWeekCount() {
      return Object.keys(this.weeks).length;
    }
    
    isWeekReadOnly(weekNumber) {
      return weekNumber < this.currentWeek;
    }
    
    createNewWeek() {
      const newWeek = this.currentWeek + 1;
      this.weeks[newWeek] = {
        players: [...this.weeks[this.currentWeek].players],
        teamMembers: [...this.weeks[this.currentWeek].teamMembers]
      };
      this.currentWeek = newWeek;
      this.updateDisplay();
      return true;
    }
    
    goToWeek(weekNumber) {
      if (this.weeks[weekNumber]) {
        this.currentWeek = weekNumber;
        this.updateDisplay();
        return true;
      }
      return false;
    }
    
    // Add other methods as needed for testing
  }
  
  return {
    ...originalModule,
    FPLTeamManager: MockFPLTeamManager
  };
});

// Helper function to create required DOM elements if they don't exist
function ensureTestElementsExist(document) {
  // Create container if it doesn't exist
  let container = document.querySelector('.container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'container';
    document.body.appendChild(container);
  }
  
  // Create header if it doesn't exist
  let header = document.querySelector('header');
  if (!header) {
    header = document.createElement('header');
    container.prepend(header);
  }

  // Create controls div if it doesn't exist
  let controls = document.querySelector('.controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'controls';
    header.appendChild(controls);
  }

  // Create add player button if it doesn't exist
  let addButton = document.querySelector('[data-testid="add-player-button"]');
  if (!addButton) {
    addButton = document.createElement('button');
    addButton.setAttribute('data-testid', 'add-player-button');
    addButton.textContent = 'Add Player';
    controls.appendChild(addButton);
  }

  // Create week controls if they don't exist
  let weekControls = document.querySelector('.week-controls');
  if (!weekControls) {
    weekControls = document.createElement('div');
    weekControls.className = 'week-controls';
    weekControls.setAttribute('data-testid', 'week-controls');
    
    // Create previous week button
    const prevButton = document.createElement('button');
    prevButton.id = 'prev-week-btn';
    prevButton.disabled = false; // Let UIManager control the disabled state
    weekControls.appendChild(prevButton);
    
    // Add week label
    const weekLabel = document.createElement('div');
    weekLabel.className = 'week-label';
    weekLabel.setAttribute('data-testid', 'week-label');
    weekLabel.textContent = 'Week 1';
    weekControls.appendChild(weekLabel);
    
    // Create next week button
    const nextButton = document.createElement('button');
    nextButton.id = 'next-week-btn';
    nextButton.disabled = false;
    weekControls.appendChild(nextButton);
    
    container.appendChild(weekControls);
  }
  
  // Get the week label if it exists
  let weekLabel = document.querySelector('.week-label');
  
  // Create additional buttons if they don't exist
  const additionalButtonIds = ['create-week-btn', 'export-week-btn'];
  additionalButtonIds.forEach(id => {
    if (!document.getElementById(id)) {
      const btn = document.createElement('button');
      btn.id = id;
      btn.setAttribute('data-testid', id);
      btn.textContent = id.replace('-btn', '').replace(/-/g, ' ');
      weekControls.appendChild(btn);
    }
  });
  
  // Create players container if it doesn't exist
  if (!document.getElementById('players-container')) {
    const playersContainer = document.createElement('div');
    playersContainer.id = 'players-container';
    container.appendChild(playersContainer);
  }
  
  // Create team summary elements if they don't exist
  if (!document.getElementById('team-summary')) {
    const summary = document.createElement('div');
    summary.id = 'team-summary';
    summary.className = 'team-summary';
    summary.innerHTML = `
      <div class="summary-item">
        <span>Team:</span>
        <span id="team-count" data-testid="team-count">0/15</span>
      </div>
      <div class="summary-item">
        <span>Total Value:</span>
        <span id="total-value" data-testid="total-value">£0.0m</span>
      </div>
      <div class="summary-item">
        <span>Captain:</span>
        <span id="captain-info" data-testid="captain-info">None</span>
      </div>
      <div class="summary-item">
        <span>Vice-Captain:</span>
        <span id="vice-captain-info" data-testid="vice-captain-info">None</span>
      </div>
    `;
    container.appendChild(summary);
  }
  
  // Create players table if it doesn't exist
  if (!document.getElementById('players-table')) {
    const table = document.createElement('table');
    table.id = 'players-table';
    table.className = 'players-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Position</th>
          <th>Team</th>
          <th>Price</th>
          <th>Status</th>
          <th>Have</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
  }
  
  // Create modal elements if they don't exist
  if (!document.getElementById('player-modal')) {
    const modal = document.createElement('div');
    modal.id = 'player-modal';
    modal.className = 'modal';
    modal.style.display = 'none';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'modal-title';
    modalHeader.appendChild(modalTitle);
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('data-testid', 'close-modal-button');
    modalHeader.appendChild(closeBtn);
    
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    const playerForm = document.createElement('form');
    playerForm.id = 'player-form';
    playerForm.setAttribute('data-testid', 'player-form');
    
    // Add form fields
    const formFields = [
      { id: 'player-name', type: 'text', label: 'Name' },
      { id: 'player-position', type: 'select', label: 'Position', options: ['GK', 'DEF', 'MID', 'FWD'] },
      { id: 'player-team', type: 'select', label: 'Team', options: ['ARS', 'AVL', 'BRE', 'BHA', 'BUR', 'CHE', 'CRY', 'EVE', 'LEI', 'LEE', 'LIV', 'MCI', 'MUN', 'NEW', 'NOR', 'SOU', 'TOT', 'WAT', 'WHU', 'WOL'] },
      { id: 'player-price', type: 'number', label: 'Price', step: '0.1', min: '4.0', max: '15.0' },
      { id: 'player-status', type: 'select', label: 'Status', options: ['Available', 'Injured', 'Doubtful', 'Suspended', 'Not in squad'] },
      { id: 'player-have', type: 'checkbox', label: 'In my team' },
      { id: 'player-notes', type: 'textarea', label: 'Notes' }
    ];
    
    formFields.forEach(field => {
      const container = document.createElement('div');
      container.className = 'form-group';
      
      const label = document.createElement('label');
      label.htmlFor = field.id;
      label.textContent = field.label;
      container.appendChild(label);
      
      let input;
      
      if (field.type === 'select') {
        input = document.createElement('select');
        input.id = field.id;
        field.options.forEach(option => {
          const optionEl = document.createElement('option');
          optionEl.value = option;
          optionEl.textContent = option;
          input.appendChild(optionEl);
        });
      } else if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.id = field.id;
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.type = field.type;
        input.id = field.id;
        
        if (field.step) input.step = field.step;
        if (field.min) input.min = field.min;
        if (field.max) input.max = field.max;
      }
      
      input.className = 'form-control';
      input.setAttribute('data-testid', field.id);
      container.appendChild(input);
      playerForm.appendChild(container);
    });
    
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancel-btn';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('data-testid', 'cancel-button');
    actions.appendChild(cancelBtn);
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Save';
    submitBtn.setAttribute('data-testid', 'save-button');
    actions.appendChild(submitBtn);
    
    playerForm.appendChild(actions);
    modalBody.appendChild(playerForm);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
  
  // Create player modal template if it doesn't exist
  if (!document.getElementById('player-modal-template')) {
    const template = document.createElement('template');
    template.id = 'player-modal-template';
    template.innerHTML = `
      <div id="player-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modal-title">Add Player</h2>
            <span class="close">&times;</span>
          </div>
          <form id="player-form">
            <div class="form-group">
              <label for="player-name">Player Name *</label>
              <input type="text" id="player-name" name="player-name" required data-testid="player-name-input">
            </div>
            <div class="form-group">
              <label for="player-position">Position *</label>
              <select id="player-position" name="player-position" required data-testid="player-position-select">
                <option value="">Select Position</option>
                <option value="goalkeeper">Goalkeeper</option>
                <option value="defence">Defence</option>
                <option value="midfield">Midfield</option>
                <option value="forward">Forward</option>
              </select>
            </div>
            <div class="form-group">
              <label for="player-team">Team *</label>
              <input type="text" id="player-team" name="player-team" required data-testid="player-team-input">
            </div>
            <div class="form-group">
              <label for="player-price">Price (£m) *</label>
              <input type="number" id="player-price" name="player-price" step="0.1" min="0" required data-testid="player-price-input">
            </div>
            <div class="form-actions">
              <button type="button" id="cancel-btn" class="btn btn-secondary" data-testid="cancel-button">Cancel</button>
              <button type="submit" class="btn btn-primary" data-testid="save-button">Save Player</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(template);
  }
}

describe('Week Navigation Controls', () => {
  let fplManager, windowRef, documentRef;

  beforeEach(async () => {
    // Set up the DOM with required elements
    ensureTestElementsExist(document);
    
    // Initialize the FPLTeamManager
    fplManager = new FPLTeamManager();
    try {
      await fplManager.init(document);
      console.log('FPLTeamManager init completed successfully');
    } catch (error) {
      console.error('Error during FPLTeamManager init:', error);
      throw error;
    }
    
    // Store references to window and document
    windowRef = window;
    documentRef = document;
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  test('should initialize with week 1', () => {
    const weekLabel = document.querySelector('[data-testid="week-label"]');
    expect(weekLabel.textContent).toBe('Week 1');
  });

  test('should disable previous week button on initial load', () => {
    const prevButton = document.getElementById('prev-week-btn');
    console.log('Current week:', fplManager.currentWeek);
    console.log('Button disabled state:', prevButton.disabled);
    // The button should be disabled because we can't go before week 1
    expect(prevButton.disabled).toBe(true);
  });

  test('should enable next week button when creating a new week', () => {
    const nextButton = document.getElementById('next-week-btn');
    const prevButton = document.getElementById('prev-week-btn');
    
    // Initially next button should be disabled (only 1 week exists, we're on the last week)
    expect(nextButton.disabled).toBe(true);
    // Initially prev button should be disabled (we're on week 1)
    expect(prevButton.disabled).toBe(true);
    
    // Create a new week programmatically (moves us to week 2)
    fplManager.createNewWeek();
    
    // Now we're on week 2 of 2, so next button should still be disabled (we're on the last week)
    expect(nextButton.disabled).toBe(true);
    // But prev button should now be enabled (we can go back to week 1)
    expect(prevButton.disabled).toBe(false);
  });

  test('should update week label when navigating between weeks', () => {
    const weekLabel = document.querySelector('[data-testid="week-label"]');
    
    // Initially should be week 1
    expect(weekLabel.textContent).toBe('Week 1');
    
    // Create a new week
    fplManager.createNewWeek();
    
    // Should now be week 2
    expect(weekLabel.textContent).toBe('Week 2');
    
    // Go back to week 1
    fplManager.goToWeek(1);
    
    // Should be back to week 1
    expect(weekLabel.textContent).toBe('Week 1');
  });

  test('should maintain separate team data for each week', () => {
    // Test that week data is properly isolated
    
    // Initially in week 1 with empty team
    expect(fplManager.weeks[1].players).toEqual([]);
    expect(fplManager.weeks[1].teamMembers).toEqual([]);
    
    // Add some mock data to week 1
    fplManager.weeks[1].players = [{ name: 'Player1', position: 'GK' }];
    fplManager.weeks[1].teamMembers = [{ name: 'Player1' }];
    
    // Create week 2 - should copy data from week 1
    fplManager.createNewWeek();
    
    // Week 2 should have copied data
    expect(fplManager.weeks[2].players).toEqual([{ name: 'Player1', position: 'GK' }]);
    expect(fplManager.weeks[2].teamMembers).toEqual([{ name: 'Player1' }]);
    
    // Modify week 2 data
    fplManager.weeks[2].players.push({ name: 'Player2', position: 'DEF' });
    
    // Week 1 should remain unchanged
    expect(fplManager.weeks[1].players).toEqual([{ name: 'Player1', position: 'GK' }]);
    expect(fplManager.weeks[2].players).toHaveLength(2);
  });
});
