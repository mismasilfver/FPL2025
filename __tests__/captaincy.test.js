import { createDOM, userEvent } from '../test-utils';
import '@testing-library/jest-dom';

describe('Captaincy Management', () => {
  let container, fplManager, document, window;
  
  beforeEach(async () => {
    // Set up the DOM and get the fplManager instance
    const dom = await createDOM();
    container = dom.document.body;
    document = dom.document;
    window = dom.window;
    fplManager = dom.fplManager;
    
    // Clear any existing data before each test
    window.localStorage.clear();
    fplManager.players = [
      {
        id: 'player-1',
        name: 'Captain Player',
        position: 'midfield',
        team: 'TST',
        price: 8.5,
        have: true,
        notes: ''
      },
      {
        id: 'player-2',
        name: 'Vice Captain Player',
        position: 'forward',
        team: 'TST',
        price: 9.0,
        have: true,
        notes: ''
      }
    ];
    fplManager.captain = null;
    fplManager.viceCaptain = null;
    await fplManager.updateDisplay();
  });

  test('should set a player as captain', async () => {
    // Click the captain button for the first player
    const captainButton = document.querySelector('[data-testid="make-captain-player-1"]');
    await userEvent.click(captainButton, window);
    
    // Check that the captain was set
    expect(fplManager.captain).toBe('player-1');
    
    // Check that the UI was updated
    const captainInfo = document.querySelector('#captain-info');
    expect(captainInfo).toHaveTextContent('Captain: Captain Player');
  });

  test('should set a player as vice-captain', async () => {
    // Click the vice-captain button for the second player
    const viceCaptainButton = document.querySelector('[data-testid="make-vice-captain-player-2"]');
    await userEvent.click(viceCaptainButton, window);
    
    // Check that the vice-captain was set
    expect(fplManager.viceCaptain).toBe('player-2');
    
    // Check that the UI was updated
    const viceCaptainInfo = document.querySelector('#vice-captain-info');
    expect(viceCaptainInfo).toHaveTextContent('Vice Captain: Vice Captain Player');
  });

  test('should switch captaincy to another player', async () => {
    // Set initial captain
    fplManager.captain = 'player-1';
    await fplManager.updateDisplay();
    
    // Click the captain button for the second player
    const captainButton = document.querySelector('[data-testid="make-captain-player-2"]');
    await userEvent.click(captainButton, window);
    
    // Check that the captain was updated
    expect(fplManager.captain).toBe('player-2');
    
    // Check that the captain badge is now shown for player-2
    const captainBadge = document.querySelector('[data-testid="captain-badge-player-2"]');
    expect(captainBadge).toBeInTheDocument();
  });

  test('should not allow same player to be both captain and vice-captain', async () => {
    // Set player as captain first
    fplManager.captain = 'player-1';
    await fplManager.updateDisplay();
    
    // Try to set the same player as vice-captain
    const viceCaptainButton = document.querySelector('[data-testid="make-vice-captain-player-1"]');
    await userEvent.click(viceCaptainButton, window);
    
    // Check that the captain was cleared and vice-captain was set instead
    expect(fplManager.captain).toBeNull();
    expect(fplManager.viceCaptain).toBe('player-1');
  });
});
