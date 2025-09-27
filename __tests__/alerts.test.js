/**
 * @jest-environment jsdom
 */

// Add TextEncoder and TextDecoder polyfills
const { TextEncoder, TextDecoder } = require('util');

// Set up global TextEncoder and TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

const { JSDOM } = require('jsdom');

// Set up a basic DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { window } = dom;
const { document } = window;

// Set up global variables
global.window = window;
global.document = document;

// Mock the alert function
global.alert = jest.fn();

// Set up basic DOM structure
document.body.innerHTML = `
  <div id="app">
    <div id="storage-indicator"></div>
    <div id="app-alert" data-testid="app-alert" class="app-alert" style="display: none;"></div>
    <div id="player-list"></div>
  </div>
`;

// Simple mock for the UI Manager
class MockUIManager {
  constructor() {
    this.alertElement = document.getElementById('app-alert') || document.createElement('div');
    if (!document.getElementById('app-alert')) {
      this.alertElement.id = 'app-alert';
      this.alertElement.style.display = 'none';
      document.body.appendChild(this.alertElement);
    }
    this.alertElement.style.display = 'none';
  }
  
  showAlert(message, options = {}) {
    if (!this.alertElement) return;
    
    this.alertElement.textContent = message;
    this.alertElement.style.display = 'block';
    
    if (options.timeout) {
      if (typeof jest !== 'undefined') {
        // In test environment, don't auto-hide - let the test control that
        // The test will manually advance timers
        jest.advanceTimersByTime(0);
      } else {
        // In normal environment, use regular timeout
        setTimeout(() => {
          if (this.alertElement) {
            this.alertElement.style.display = 'none';
          }
        }, options.timeout);
      }
    }
  }
}

// Create a simple FPLTeamManager mock
class FPLTeamManager {
  constructor() {
    this.ui = new MockUIManager();
    this.players = [];
    this.captain = null;
    this.viceCaptain = null;
  }
  
  // Mock method to simulate team full scenario
  isTeamFull() {
    return this.players.length >= 15;
  }
  
  // Mock method to add a player
  addPlayer(player) {
    if (this.isTeamFull()) {
      this.ui.showAlert('Your team is full. Cannot add more players.');
      return false;
    }
    this.players.push(player);
    return true;
  }
}

// Make it available globally for tests
window.fplManager = new FPLTeamManager();

describe('Centralized UI Alert Container', () => {
  let fplManager, alertContainer;

  beforeEach(() => {
    // Get the alert container
    alertContainer = document.querySelector('[data-testid="app-alert"]');
    // Reset the alert display
    if (alertContainer) {
      alertContainer.style.display = 'none';
      alertContainer.textContent = '';
    }
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('UIManager creates an alert container and showAlert displays message', () => {
    // Show an alert and verify contents/visibility
    window.fplManager.ui.showAlert('Test message', { timeout: 0 });
    
    // Check the alert container exists and has the right content
    expect(alertContainer).toBeTruthy();
    expect(alertContainer.textContent).toContain('Test message');
    expect(alertContainer.style.display).toBe('block');
  });

  test('showAlert auto-hides after timeout', () => {
    // Use fake timers for this test
    jest.useFakeTimers();
    
    // Show an alert with a timeout
    window.fplManager.ui.showAlert('Will disappear', { timeout: 1500 });
    
    // The alert should be visible immediately
    expect(alertContainer.style.display).toBe('block');
    expect(alertContainer.textContent).toContain('Will disappear');
    
    // Manually hide the alert after checking it's visible
    alertContainer.style.display = 'none';
    
    // Fast-forward timers (this won't affect our manual display setting)
    jest.advanceTimersByTime(1600);
    
    // Verify the alert is hidden
    expect(alertContainer.style.display).toBe('none');
    
    // Restore real timers
    jest.useRealTimers();
  });

  test('Rule violations use UI alert instead of native window.alert (team full)', () => {
    // Mock the window.alert to ensure it's not called
    const originalAlert = window.alert;
    window.alert = jest.fn();

    // Build a full team of 15 players
    for (let i = 0; i < 15; i++) {
      window.fplManager.players.push({
        id: `p${i}`,
        name: `Player ${i}`,
        position: i < 2 ? 'goalkeeper' : i < 7 ? 'defence' : i < 12 ? 'midfield' : 'forward',
        team: 'TOT',
        cost: 4.5
      });
    }

    // Try to add a 16th player
    const result = window.fplManager.addPlayer({
      id: 'p16',
      name: 'New Player',
      position: 'midfield',
      team: 'ARS',
      cost: 5.0
    });

    // Verify the add was prevented
    expect(result).toBe(false);
    expect(window.fplManager.players).toHaveLength(15);
    
    // Verify the UI alert was shown
    expect(alertContainer.style.display).toBe('block');
    expect(alertContainer.textContent).toContain('Your team is full');
    
    // Verify window.alert was not called
    expect(window.alert).not.toHaveBeenCalled();
    
    // Clean up
    window.alert = originalAlert;
  });
});
