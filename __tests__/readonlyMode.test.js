const { createDOM, userEvent } = require('../test-utils');
const { FPLTeamManager, UIManager } = require('../script');
require('@testing-library/jest-dom');

describe('Read-only mode for previous weeks', () => {
  let fplTeamManager, uiManager, storageAdapter, windowRef, documentRef;

  beforeEach(async () => {
    const { window, document } = await createDOM();
    global.window = window;
    global.document = document;
    windowRef = window;
    documentRef = document;

    uiManager = new UIManager();
    let store = {};
    storageAdapter = {
      getItem: jest.fn((key) => Promise.resolve(store[key])),
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve();
      }),
      clear: () => { store = {}; }
    };

    const initialData = {
      version: '2.0',
      currentWeek: 1,
      weeks: {
        1: {
          players: [
            { id: 'player-1', name: 'Player One', position: 'MID', team: 'T1', price: 6.0, have: true, status: 'green', notes: '' },
            { id: 'player-2', name: 'Player Two', position: 'FWD', team: 'T2', price: 7.5, have: true, status: 'yellow', notes: '' }
          ],
          teamMembers: [{ playerId: 'player-1' }, { playerId: 'player-2' }],
          captain: 'player-1',
          viceCaptain: null,
          isReadOnly: false,
        },
      },
    };
    store['fpl-team-data'] = JSON.stringify(initialData);

    fplTeamManager = new FPLTeamManager({ ui: uiManager, storage: storageAdapter });
    await fplTeamManager.init();
  });

  test('previous week shows Read-only state and disables edit controls', async () => {
    // Create a new week (week 2)
    await fplTeamManager.createNewWeek();

    // Navigate back to week 1
    await fplTeamManager.prevWeek();

    // Read-only should be set on previous week
    expect(await fplTeamManager.isWeekReadOnly(1)).toBe(true);
    expect(await fplTeamManager.getCurrentWeekNumber()).toBe(1);
    expect(await fplTeamManager.isCurrentWeekReadOnly()).toBe(true);
  });

  test('mutating actions in read-only week do nothing', async () => {
    const initialPlayers = [...await fplTeamManager.getPlayers()];
    const initialCaptain = await fplTeamManager.getCaptainId();

    // Create week 2 and go back to week 1
    await fplTeamManager.createNewWeek();
    await fplTeamManager.prevWeek();

    // Verify we're in read-only mode
    expect(await fplTeamManager.isCurrentWeekReadOnly()).toBe(true);

    // Try to add a player - should be ignored in read-only mode
    const playerCountBefore = (await fplTeamManager.getPlayers()).length;
    await fplTeamManager.addPlayer({ name: 'Test Player', position: 'forward' });
    const playerCountAfter = (await fplTeamManager.getPlayers()).length;
    expect(playerCountAfter).toBe(playerCountBefore);

    // Verify state hasn't changed
    expect(await fplTeamManager.getPlayers()).toEqual(initialPlayers);
    expect(await fplTeamManager.getCaptainId()).toBe(initialCaptain);
  });
});
