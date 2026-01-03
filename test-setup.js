// test-setup.js
const { TextEncoder, TextDecoder } = require('util');

// Set up globals BEFORE importing JSDOM
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');

// Set up the DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

// Set up global variables
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

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

// Import the mock storage class we created
const { MockStorageService } = require('./__tests__/test-utils');

// Create a single, stateful instance that can be shared across tests
const mockStorageInstance = new MockStorageService();

// Mock the storage module to use and expose our instance while keeping helpers
jest.mock('./js/storage-module.js', () => {
  const actual = jest.requireActual('./js/storage-module.js');
  return {
    ...actual,
    createStorageService: jest.fn(() => mockStorageInstance),
    __getMockStorage: () => mockStorageInstance, // Helper to access the mock in tests
  };
});

// Helper function to create required DOM elements
function setupDOM() {
  // Create container
  let container = document.querySelector('.container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'container';
    document.body.appendChild(container);
  }

  // Always rebuild week controls to avoid stale nodes
  let weekControls = container.querySelector('.week-controls');
  if (weekControls) {
    weekControls.remove();
  }
  weekControls = document.createElement('div');
  weekControls.className = 'week-controls';
  weekControls.setAttribute('data-testid', 'week-controls');
  container.appendChild(weekControls);

  const weekIndicator = document.createElement('div');
  weekIndicator.className = 'week-indicator';
  weekIndicator.setAttribute('data-testid', 'week-indicator');
  weekControls.appendChild(weekIndicator);

  const weekLabel = document.createElement('span');
  weekLabel.id = 'week-label';
  weekLabel.setAttribute('data-testid', 'week-label');
  weekLabel.textContent = 'Week 1';
  weekIndicator.appendChild(weekLabel);

  const readOnlyBadge = document.createElement('span');
  readOnlyBadge.id = 'week-readonly-badge';
  readOnlyBadge.className = 'readonly-badge';
  readOnlyBadge.setAttribute('data-testid', 'read-only-badge');
  readOnlyBadge.style.display = 'none';
  readOnlyBadge.setAttribute('aria-hidden', 'true');
  readOnlyBadge.textContent = 'Read-only';
  weekIndicator.appendChild(document.createTextNode(' '));
  weekIndicator.appendChild(readOnlyBadge);

  const buttons = [
    { id: 'prev-week-btn', text: '◀ Previous', testId: 'prev-week-btn' },
    { id: 'next-week-btn', text: 'Next ▶', testId: 'next-week-btn' },
    { id: 'create-week-btn', text: 'Create New Week', testId: 'create-week-btn' },
    { id: 'add-player-btn', text: 'Add Player', testId: 'add-player-button' }
  ];

  buttons.forEach(({ id, text, testId }) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.setAttribute('data-testid', testId);
    btn.textContent = text;
    weekControls.appendChild(btn);
  });

  // Create players container
  if (!document.getElementById('players-container')) {
    const playersContainer = document.createElement('div');
    playersContainer.id = 'players-container';
    container.appendChild(playersContainer);

    // Create players table
    const table = document.createElement('table');
    table.id = 'players-table';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    tbody.id = 'players-tbody';
    table.appendChild(thead);
    table.appendChild(tbody);
    playersContainer.appendChild(table);
  }

  // Ensure player row template exists
  if (!document.getElementById('player-row-template')) {
    const template = document.createElement('template');
    template.id = 'player-row-template';
    template.innerHTML = `
      <tr class="player-row">
        <td class="col-name"></td>
        <td class="col-position"></td>
        <td class="col-team"></td>
        <td class="col-price"></td>
        <td class="col-status"></td>
        <td class="col-have"></td>
        <td class="col-captain"></td>
        <td class="col-vice"></td>
        <td class="col-notes"></td>
        <td class="col-actions"></td>
      </tr>
    `;
    container.appendChild(template);
  }

  // Create player form modal
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
    modalTitle.textContent = 'Add Player';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('data-testid', 'close-modal-button');
    
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    const playerForm = document.createElement('form');
    playerForm.id = 'player-form';
    playerForm.setAttribute('data-testid', 'player-form');
    
    // Add form fields
    const fields = [
      { id: 'player-name', type: 'text', label: 'Name' },
      { id: 'player-position', type: 'select', label: 'Position', options: ['GK', 'DEF', 'MID', 'FWD'] },
      { id: 'player-team', type: 'select', label: 'Team', options: ['ARS', 'AVL', 'BRE', 'BHA', 'BUR', 'CHE', 'CRY', 'EVE', 'LEI', 'LEE', 'LIV', 'MCI', 'MUN', 'NEW', 'NOR', 'SOU', 'TOT', 'WAT', 'WHU', 'WOL'] },
      { id: 'player-price', type: 'number', label: 'Price' },
      { id: 'player-status', type: 'select', label: 'Status', options: ['Available', 'Injured', 'Doubtful', 'Suspended', 'Not in squad'] },
      { id: 'player-have', type: 'checkbox', label: 'In my team' },
      { id: 'player-notes', type: 'textarea', label: 'Notes' }
    ];
    
    fields.forEach(field => {
      const div = document.createElement('div');
      div.className = 'form-group';
      
      const label = document.createElement('label');
      label.htmlFor = field.id;
      label.textContent = field.label;
      
      let input;
      if (field.type === 'select') {
        input = document.createElement('select');
        field.options.forEach(option => {
          const opt = document.createElement('option');
          opt.value = option;
          opt.textContent = option;
          input.appendChild(opt);
        });
      } else if (field.type === 'textarea') {
        input = document.createElement('textarea');
      } else {
        input = document.createElement('input');
        input.type = field.type;
      }
      
      input.id = field.id;
      input.setAttribute('data-testid', field.id);
      
      div.appendChild(label);
      div.appendChild(input);
      playerForm.appendChild(div);
    });
    
    // Add form buttons
    const formActions = document.createElement('div');
    formActions.className = 'form-actions';
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Save';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancel-btn';
    cancelBtn.textContent = 'Cancel';
    
    formActions.appendChild(submitBtn);
    formActions.appendChild(cancelBtn);
    playerForm.appendChild(formActions);
    
    // Assemble modal
    modalHeader.appendChild(closeBtn);
    modalHeader.appendChild(modalTitle);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(playerForm);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
}

// Run setup before tests
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear document body
  document.body.innerHTML = '';
  
  // Set up the DOM
  setupDOM();
});

// Make the setup function available globally for individual test files
global.setupDOM = setupDOM;
