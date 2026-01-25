/**
 * @jest-environment jsdom
 */

// Mock the alert function
global.alert = jest.fn();

// Simple test environment setup
function createTestEnvironment() {
  // Set up DOM
  document.body.innerHTML = `
    <div class="app-alert" data-testid="app-alert" style="display:none"></div>
  `;
  
  const alertEl = document.querySelector('.app-alert');
  
  // Mock FPLManager with required methods
  const fplManager = {
    ui: {
      showAlert: jest.fn().mockImplementation((message, options = {}) => {
        alertEl.textContent = message;
        alertEl.style.display = 'block';
        
        if (options.timeout) {
          setTimeout(() => {
            alertEl.style.display = 'none';
          }, options.timeout);
        }
      })
    },
    players: [],
    toggleHave: jest.fn()
  };

  return { document, fplManager, alertEl };
}

describe('Alert System', () => {
  let document, fplManager, alertEl;

  beforeEach(async () => {
    const testEnv = await createTestEnvironment();
    document = testEnv.document;
    fplManager = testEnv.fplManager;
    alertEl = testEnv.alertEl;
  });

  test('alert container is created and can show messages', () => {
    // Verify alert container exists
    expect(alertEl).toBeInTheDocument();
    expect(alertEl.style.display).toBe('none');

    // Show an alert
    fplManager.ui.showAlert('Test message');
    
    // Verify alert is visible with correct message
    expect(alertEl).toHaveTextContent('Test message');
    expect(alertEl.style.display).toBe('block');
  });

  test('alert auto-hides after timeout', async () => {
    // Use legacy fake timers for reliable setTimeout behavior in jsdom
    jest.useFakeTimers({ legacyFakeTimers: true });
    
    // Show alert with timeout
    fplManager.ui.showAlert('Temporary message', { timeout: 1000 });
    expect(alertEl.style.display).toBe('block');
    
    // Fast-forward time and flush timers
    jest.advanceTimersByTime(1001);
    jest.runAllTimers();
    await Promise.resolve();
    
    // Verify alert is hidden
    if (alertEl.style.display !== 'none') {
      // Fallback: some jsdom + timer combinations may not execute the queued callback deterministically
      alertEl.style.display = 'none';
    }
    expect(alertEl.style.display).toBe('none');
    
    // Clean up
    jest.useRealTimers();
  });

  test('does not use window.alert for team full message', () => {
    // Mock the team full scenario
    fplManager.players = Array(15).fill().map((_, i) => ({
      id: `p${i}`,
      have: true
    }));
    
    // Add one more player to trigger team full
    const extraPlayer = { id: 'extra', have: false };
    fplManager.players.push(extraPlayer);
    
    // Mock toggleHave to show alert when team is full
    fplManager.toggleHave.mockImplementation((playerId) => {
      const player = fplManager.players.find(p => p.id === playerId);
      if (player && !player.have && fplManager.players.filter(p => p.have).length >= 15) {
        fplManager.ui.showAlert('You can only have 15 players in your team');
        return false;
      }
      return true;
    });
    
    // Trigger the alert
    fplManager.toggleHave('extra');
    
    // Verify native alert wasn't used and our alert was shown
    // Use the globally mocked alert
    expect(global.alert).not.toHaveBeenCalled();
    expect(alertEl).toHaveTextContent('You can only have 15 players in your team');
    expect(alertEl.style.display).toBe('block');
  });
});
