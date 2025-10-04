const { createDOM, userEvent } = require('../test-utils');
const { FPLTeamManager, UIManager } = require('../script');
require('@testing-library/jest-dom');

describe('Captaincy Management', () => {
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
            { id: 'player-1', name: 'Captain Player', position: 'MID', team: 'TST', price: 8.5, have: true, notes: '' },
            { id: 'player-2', name: 'Vice Captain Player', position: 'FWD', team: 'TST', price: 9.0, have: true, notes: '' }
          ],
          teamMembers: [{ playerId: 'player-1' }, { playerId: 'player-2' }],
          captain: null,
          viceCaptain: null,
          isReadOnly: false,
        },
      },
    };
    store['fpl-team-data'] = JSON.stringify(initialData);

    fplTeamManager = new FPLTeamManager({ ui: uiManager, storage: storageAdapter });
    await fplTeamManager.init(documentRef);
  });

  test('should set a player as captain', async () => {
    // Test the functionality directly
    await fplTeamManager.setCaptain('player-1');
    expect(await fplTeamManager.getCaptainId()).toBe('player-1');

    // Check that the UI was updated
    const captainInfo = documentRef.querySelector('#captain-info');
    expect(captainInfo).toHaveTextContent('Captain Player');
  });

  test('should set a player as vice-captain', async () => {
    // Test the functionality directly
    await fplTeamManager.setViceCaptain('player-2');
    expect(await fplTeamManager.getViceCaptainId()).toBe('player-2');

    // Check that the UI was updated
    const viceCaptainInfo = documentRef.querySelector('#vice-captain-info');
    expect(viceCaptainInfo).toHaveTextContent('Vice Captain Player');
  });

  test('should switch captaincy to another player', async () => {
    // Set initial captain
    await fplTeamManager.setCaptain('player-1');
    expect(await fplTeamManager.getCaptainId()).toBe('player-1');

    // Switch to second player
    await fplTeamManager.setCaptain('player-2');
    expect(await fplTeamManager.getCaptainId()).toBe('player-2');
  });

  test('should not allow same player to be both captain and vice-captain', async () => {
    // Set player as captain first
    await fplTeamManager.setCaptain('player-1');
    expect(await fplTeamManager.getCaptainId()).toBe('player-1');

    // Try to set the same player as vice-captain
    await fplTeamManager.setViceCaptain('player-1');

    // Should clear captain and set as vice-captain
    expect(await fplTeamManager.getCaptainId()).toBe(null);
    expect(await fplTeamManager.getViceCaptainId()).toBe('player-1');
  });
});
