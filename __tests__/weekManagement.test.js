const { createDOM, userEvent } = require('../test-utils');
const { FPLTeamManager, UIManager } = require('../script');
require('@testing-library/jest-dom');

describe('Week Management', () => {
  let fplTeamManager, uiManager, storageAdapter, documentRef;

  const samplePlayers = [
    { id: '1', name: 'Player 1', position: 'MID', team: 'MUN', price: 8.0, have: true, notes: '' },
    { id: '2', name: 'Player 2', position: 'DEF', team: 'LIV', price: 5.5, have: true, notes: 'Test' },
    { id: '3', name: 'Player 3', position: 'FWD', team: 'MCI', price: 11.5, have: false, notes: '' },
  ];

  beforeEach(async () => {
    const { window, document } = await createDOM();
    global.window = window;
    global.document = document;
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
          players: [...samplePlayers],
          captain: '1',
          viceCaptain: '2',
          teamMembers: [{ playerId: '1' }, { playerId: '2' }],
          teamStats: { totalValue: 13.5 },
          isReadOnly: false,
        }
      }
    };
    store['fpl-team-data'] = JSON.stringify(initialData);

    fplTeamManager = new FPLTeamManager({ ui: uiManager, storage: storageAdapter });
    await fplTeamManager.init(documentRef);
  });

  test('should initialize with week 1', async () => {
    expect(await fplTeamManager.getCurrentWeekNumber()).toBe(1);
    expect(await fplTeamManager.getWeekCount()).toBe(1);
  });

  test('should create a new week with previous week\'s team', async () => {
    await userEvent.click(documentRef.getElementById('create-week-btn'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(await fplTeamManager.getCurrentWeekNumber()).toBe(2);
    expect(await fplTeamManager.isWeekReadOnly(1)).toBe(true);
    
    const week1Data = await fplTeamManager.getWeekSnapshot(1);
    const week2Data = await fplTeamManager.getWeekSnapshot(2);
    expect(week2Data.players.length).toBe(week1Data.players.length);
    expect(week2Data.captain).toBe(week1Data.captain);
  });

  test('should navigate between weeks', async () => {
    await userEvent.click(documentRef.getElementById('create-week-btn'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(await fplTeamManager.getCurrentWeekNumber()).toBe(2);

    await userEvent.click(documentRef.getElementById('prev-week-btn'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(await fplTeamManager.getCurrentWeekNumber()).toBe(1);

    await userEvent.click(documentRef.getElementById('next-week-btn'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(await fplTeamManager.getCurrentWeekNumber()).toBe(2);
  });

  test('should not modify read-only weeks', async () => {
    const initialCaptain = await fplTeamManager.getCaptainId();
    await userEvent.click(documentRef.getElementById('create-week-btn'));
    await new Promise(resolve => setTimeout(resolve, 0));
    await userEvent.click(documentRef.getElementById('prev-week-btn'));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(await fplTeamManager.isWeekReadOnly(1)).toBe(true);

    const captainButton = documentRef.querySelector('[data-testid="make-captain-3"]');
    if (captainButton) {
        await userEvent.click(captainButton);
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    expect(await fplTeamManager.getCaptainId()).toBe(initialCaptain);
  });

  test('should calculate total cost correctly', async () => {
    const expectedCost = samplePlayers
      .filter(p => p.have)
      .reduce((sum, p) => sum + p.price, 0);
      
    expect(await fplTeamManager.calculateTotalCost()).toBe(expectedCost);
  });
});
