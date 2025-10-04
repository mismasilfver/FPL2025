/**
 * Test helpers for alert tests
 */

const { createDOM } = require('../test-utils');

// Mock window.alert
const mockAlert = jest.fn();
const originalAlert = global.alert;

global.alert = mockAlert;

/**
 * Creates a test environment for alert tests
 */
async function setupAlertTestEnvironment() {
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

  // Create a simple FPLTeamManager mock with just what we need for alert tests
  const fplManager = {
    players: [],
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
    toggleHave: jest.fn(),
    updateDisplay: jest.fn()
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
    storageService: {
      getWeekData: jest.fn(),
      saveWeekData: jest.fn(),
      getWeekCount: jest.fn().mockResolvedValue(1),
      getAllWeekData: jest.fn()
    }
  };
}

// Cleanup after tests
afterEach(() => {
  // Restore original alert
  global.alert = originalAlert;
  mockAlert.mockClear();
});

module.exports = { setupAlertTestEnvironment, mockAlert };

// Minimal noop test to ensure this helper file is a valid test suite
describe('alert-test-helpers noop', () => {
  test('noop', () => {
    expect(true).toBe(true);
  });
});
