/**
 * Test helpers for FPL application
 */

const { createDOM } = require('./test-utils');

// Mock window.alert to track calls
const originalAlert = window.alert;
const mockAlert = jest.fn();
window.alert = mockAlert;

/**
 * Creates a test environment with properly initialized FPLTeamManager
 */
async function setupTestEnvironment() {
  // Create DOM environment
  const { window, document } = await createDOM();
  
  // Reset mock alert
  mockAlert.mockClear();
  
  // Create alert container
  const alertEl = document.createElement('div');
  alertEl.className = 'app-alert';
  alertEl.setAttribute('data-testid', 'app-alert');
  alertEl.setAttribute('role', 'alert');
  alertEl.setAttribute('aria-live', 'polite');
  alertEl.style.display = 'none';
  document.body.appendChild(alertEl);

  // In-memory storage service for tests
  const memory = {
    currentWeek: 1,
    weeks: {
      1: { players: [], captain: null, viceCaptain: null, teamMembers: [] }
    }
  };

  const storageService = {
    getWeekData: jest.fn(async (week) => {
      return memory.weeks[week] || null;
    }),
    saveWeekData: jest.fn(async (week, data) => {
      memory.weeks[week] = { ...data };
      return true;
    }),
    getWeekSnapshot: jest.fn(async (week) => {
      const wk = memory.weeks[week];
      return wk ? JSON.parse(JSON.stringify(wk)) : null;
    }),
    getWeekCount: jest.fn().mockResolvedValue(1),
    getAllWeekData: jest.fn(async () => JSON.parse(JSON.stringify(memory.weeks)))
  };

  // Create a FPLTeamManager-style mock sufficient for captaincy and alerts
  const fplManager = {
    players: [],
    captain: null,
    viceCaptain: null,
    currentWeek: 1,
    ui: {
      initElements: () => {
        // Ensure alert container exists
        if (!document.querySelector('[data-testid="app-alert"]')) {
          document.body.appendChild(alertEl);
        }
      },
      showAlert: (message, options = {}) => {
        alertEl.textContent = message;
        alertEl.style.display = 'block';
        if (options.timeout) {
          setTimeout(() => {
            alertEl.style.display = 'none';
          }, options.timeout);
        }
      },
      updateDisplay: jest.fn(),
      updateWeekControls: jest.fn()
    },
    async loadStateFromStorage() {
      const data = await storageService.getWeekData(this.currentWeek);
      this.players = data?.players || [];
      this.captain = data?.captain || null;
      this.viceCaptain = data?.viceCaptain || null;
    },
    async updateDisplay() {
      this.ui.updateDisplay && this.ui.updateDisplay();
    },
    async getWeekSnapshot(week) {
      return storageService.getWeekSnapshot(week);
    },
    toggleHave: jest.fn(),
  };

  // Add mock implementation for toggleHave to test team full scenario
  fplManager.toggleHave.mockImplementation((playerId) => {
    const player = fplManager.players.find(p => p.id === playerId);
    if (player) {
      // Check if team is full (15 players)
      const teamCount = fplManager.players.filter(p => p.have).length;
      if (!player.have && teamCount >= 15) {
        fplManager.ui.showAlert('You can only have 15 players in your team');
        return false;
      }
      player.have = !player.have;
      return true;
    }
    return false;
  });

  // Return test environment
  return {
    window: {
      ...window,
      alert: mockAlert
    },
    document,
    fplManager,
    storageService
  };
}

/**
 * Creates the player modal template required by UIManager
 */
function createPlayerModalTemplate(document) {
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
            <div class="form-group">
              <label for="player-status">Status</label>
              <select id="player-status" name="player-status" data-testid="player-status-select">
                <option value="">No Status</option>
                <option value="yellow">Maybe Good (Yellow)</option>
                <option value="green">Very Good (Green)</option>
                <option value="red">Sell/Don't Buy (Red)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="player-have">
                <input type="checkbox" id="player-have" name="player-have" data-testid="player-have-checkbox"> In My Team
              </label>
            </div>
            <div class="form-group">
              <label for="player-notes">Notes</label>
              <textarea id="player-notes" name="player-notes" rows="3" data-testid="player-notes-textarea"></textarea>
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

/**
 * Creates essential DOM elements required by most tests
 */
function createEssentialTestElements(document) {
  // Create container
  let container = document.querySelector('.container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'container';
    document.body.appendChild(container);
  }

  // Create players table
  if (!document.getElementById('players-table')) {
    const table = document.createElement('table');
    table.id = 'players-table';
    const tbody = document.createElement('tbody');
    tbody.id = 'players-tbody';
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // Create week controls
  if (!document.querySelector('.week-controls')) {
    const weekControls = document.createElement('div');
    weekControls.className = 'week-controls';
    weekControls.setAttribute('data-testid', 'week-controls');
    
    const prevBtn = document.createElement('button');
    prevBtn.id = 'prev-week-btn';
    prevBtn.setAttribute('data-testid', 'prev-week-btn');
    weekControls.appendChild(prevBtn);
    
    const weekLabel = document.createElement('span');
    weekLabel.id = 'week-label';
    weekLabel.setAttribute('data-testid', 'week-label');
    weekLabel.textContent = 'Week 1';
    weekControls.appendChild(weekLabel);
    
    const nextBtn = document.createElement('button');
    nextBtn.id = 'next-week-btn';
    nextBtn.setAttribute('data-testid', 'next-week-btn');
    weekControls.appendChild(nextBtn);
    
    container.appendChild(weekControls);
  }

  // Create add player button
  if (!document.querySelector('[data-testid="add-player-button"]')) {
    const addBtn = document.createElement('button');
    addBtn.setAttribute('data-testid', 'add-player-button');
    addBtn.textContent = 'Add Player';
    container.appendChild(addBtn);
  }

  // Create week readonly badge
  if (!document.getElementById('week-readonly-badge')) {
    const badge = document.createElement('span');
    badge.id = 'week-readonly-badge';
    badge.setAttribute('data-testid', 'week-readonly-badge');
    badge.style.display = 'none';
    container.appendChild(badge);
  }

  // Create modal template
  createPlayerModalTemplate(document);
}

// Cleanup after tests
afterEach(() => {
  // Restore original alert
  window.alert = originalAlert;
});

module.exports = { setupTestEnvironment, createPlayerModalTemplate, createEssentialTestElements };
