const { createDOM, userEvent } = require('../test-utils');
const { FPLTeamManager, UIManager } = require('../script');
const { LocalStorageAdapter } = require('../js/storage');

describe('Week Navigation', () => {
  let fplManager;
  let uiManager;
  let storage;
  let dom;

  beforeEach(async () => {
    dom = await createDOM();
    global.document = dom.document;
    global.window = dom.window;

    uiManager = new UIManager();
    let store = {};
    storage = {
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
          players: [{ id: '1', name: 'Player 1', have: true }],
          captain: '1',
          viceCaptain: null,
          teamMembers: [{ playerId: '1' }],
          teamStats: { totalValue: 10 },
          isReadOnly: false,
        },
      },
    };
    store['fpl-team-data'] = JSON.stringify(initialData);

    fplManager = new FPLTeamManager({ ui: uiManager, storage });
    await fplManager.init(dom.window.document);
  });

  afterEach(() => {
    // Clean up JSDOM
    dom.window.close();
    // Clear mocks
    jest.restoreAllMocks();
  });

  test('should initialize with week 1 data', async () => {
    expect(await fplManager.getCurrentWeekNumber()).toBe(1);
    const players = await fplManager.getPlayers();
    expect(players[0].name).toBe('Player 1');
  });

  test('should create a new week and switch to it', async () => {
    // Test the core functionality directly
    await fplManager.createNewWeek();
    expect(await fplManager.getCurrentWeekNumber()).toBe(2);
    // New week should have a copy of the previous week's players
    const players = await fplManager.getPlayers();
    expect(players[0].name).toBe('Player 1');
  });

  test('should navigate between weeks', async () => {
    // Create week 2
    await fplManager.createNewWeek();
    expect(await fplManager.getCurrentWeekNumber()).toBe(2);

    // Navigate back to week 1
    await fplManager.prevWeek();
    expect(await fplManager.getCurrentWeekNumber()).toBe(1);
  });

  test('should handle week navigation with prev/next', async () => {
    // Create weeks 2 and 3
    await fplManager.createNewWeek();
    await fplManager.createNewWeek();
    
    expect(await fplManager.getCurrentWeekNumber()).toBe(3);

    // Go back to week 1
    await fplManager.prevWeek();
    await fplManager.prevWeek();
    expect(await fplManager.getCurrentWeekNumber()).toBe(1);

    // Go forward to week 3
    await fplManager.nextWeek();
    await fplManager.nextWeek();
    expect(await fplManager.getCurrentWeekNumber()).toBe(3);
  });

  test('should mark previous weeks as read-only', async () => {
    await fplManager.createNewWeek(); // Now on week 2
    
    const week1Data = await fplManager.getWeekSnapshot(1);
    const week2Data = await fplManager.getWeekSnapshot(2);
    expect(week1Data.isReadOnly).toBe(true);
    expect(week2Data.isReadOnly).toBe(false);
  });

  test('should maintain team state when switching between weeks', async () => {
    // In week 1, add a new player
    await fplManager.addPlayer({ name: 'Week 1 Player', have: true });
    
    await fplManager.createNewWeek();
    expect(await fplManager.getCurrentWeekNumber()).toBe(2);

    // In week 2, add another player
    await fplManager.addPlayer({ name: 'Week 2 Player', have: true });

    // Go back to week 1
    await fplManager.prevWeek();
    expect(await fplManager.getCurrentWeekNumber()).toBe(1);

    // Week 1 should have only the original player
    const week1Players = await fplManager.getPlayers();
    expect(week1Players.some(p => p.name === 'Week 1 Player')).toBe(true);
    expect(week1Players.some(p => p.name === 'Week 2 Player')).toBe(false);

    // Go back to week 2
    await fplManager.nextWeek();
    expect(await fplManager.getCurrentWeekNumber()).toBe(2);

    // Week 2 should have both players
    const week2Players = await fplManager.getPlayers();
    expect(week2Players.some(p => p.name === 'Week 1 Player')).toBe(true);
    expect(week2Players.some(p => p.name === 'Week 2 Player')).toBe(true);
  });
});
