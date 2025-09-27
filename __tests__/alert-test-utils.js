/**
 * Test utilities for alert-related tests
 */

const { createDOM } = require('../test-utils');

// Mock window.alert
global.alert = jest.fn();

/**
 * Creates a test environment with DOM and basic UI elements
 */
async function createTestEnvironment() {
  // Create DOM environment
  const { window, document } = await createDOM();
  
  // Create alert container
  const alertEl = document.createElement('div');
  alertEl.className = 'app-alert';
  alertEl.setAttribute('data-testid', 'app-alert');
  alertEl.setAttribute('role', 'alert');
  alertEl.setAttribute('aria-live', 'polite');
  alertEl.style.display = 'none';
  document.body.appendChild(alertEl);

  // Create a simple UI manager
  const uiManager = {
    initElements: () => {
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
  };

  // Create a simple FPLManager mock
  const fplManager = {
    players: [],
    ui: uiManager,
    updateDisplay: jest.fn(),
    toggleHave: jest.fn()
  };

  // Return test environment
  return {
    window,
    document,
    fplManager,
    alertEl
  };
}

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

module.exports = {
  createTestEnvironment,
  mockAlert: global.alert
};

// Minimal noop test to ensure this utility file is a valid test suite
describe('alert-test-utils noop', () => {
  test('noop', () => {
    expect(true).toBe(true);
  });
});
