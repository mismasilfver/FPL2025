// Import test utilities and setup
const { userEvent, createDOM } = require('../test-utils');
const { FPLTeamManager, UIManager } = require('../script');

// Import test setup
require('../test-setup');

describe('Week Navigation Controls', () => {
  let fplTeamManager, windowRef;

  beforeEach(async () => {
    const { window, document } = await createDOM();
    global.window = window;
    global.document = document;
    windowRef = window;

    const uiManager = new UIManager();
    const storageAdapter = {
      getItem: jest.fn(),
      setItem: jest.fn(),
    };

    // Set up initial data
    storageAdapter.getItem.mockResolvedValue(JSON.stringify({
      version: '2.0',
      currentWeek: 1,
      weeks: {
        1: {
          players: [
            { id: '1', name: 'Player A', position: 'FWD', team: 'TEAM_A', price: 10, have: true, notes: '' },
            { id: '2', name: 'Player B', position: 'MID', team: 'TEAM_B', price: 8.5, have: true, notes: '' },
            { id: '3', name: 'Player C', position: 'DEF', team: 'TEAM_C', price: 5.5, have: false, notes: '' }
          ],
          captain: '1',
          viceCaptain: '2',
          teamMembers: [{ playerId: '1' }, { playerId: '2' }],
          teamStats: { totalValue: 18.5 },
          isReadOnly: false,
        },
      },
    }));

    fplTeamManager = new FPLTeamManager({ ui: uiManager, storage: storageAdapter });
    await fplTeamManager.init(document);
  });

  test('Switching weeks updates read-only badge and control enablement', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');
    const roBadge = document.getElementById('week-readonly-badge');
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');
    const createBtn = document.getElementById('create-week-btn');

    // Initial state: Week 1, not read-only
    expect(roBadge.style.display).toBe('none');
    expect(addButton.disabled).toBe(false);
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);

    // Create a new week
    await userEvent.click(createBtn, windowRef);
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for UI update

    // State after creating new week: Week 2, editable
    expect(await fplTeamManager.getCurrentWeekNumber()).toBe(2);
    expect(roBadge.style.display).toBe('none');
    expect(addButton.disabled).toBe(false);
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(true);

    // Navigate back to week 1
    await userEvent.click(prevBtn, windowRef);
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for UI update

    // State after navigating back: Week 1, read-only
    expect(await fplTeamManager.getCurrentWeekNumber()).toBe(1);
    expect(roBadge.style.display).not.toBe('none');
    expect(addButton.disabled).toBe(true);
  });
});
