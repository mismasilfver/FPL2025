const { createStorageService, createDefaultRoot } = jest.requireActual('../js/storage-module.js');
const { createSQLiteApiMock } = require('../test-utils/sqlite-api-mock.js');

describe('createStorageService', () => {
  const originalFetch = global.fetch;
  const originalLocalStorage = global.localStorage;

  const mockLocalStorage = (initial = {}) => {
    const store = new Map(Object.entries(initial));
    const local = {
      getItem: jest.fn((key) => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn((key, value) => {
        store.set(key, value);
      }),
      removeItem: jest.fn((key) => {
        store.delete(key);
      })
    };
    global.localStorage = local;
    return { store, local }; 
  };

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    jest.restoreAllMocks?.();
  });

  test('creates LocalStorageService by default', async () => {
    mockLocalStorage();

    const service = createStorageService();
    expect(service).toBeDefined();
    await service.initialize?.();

    const root = await service.getRootData();
    expect(typeof root.currentWeek).toBe('number');
    expect(root.currentWeek).toBeGreaterThan(0);
  });

  test('legacy getItem returns JSON string from underlying adapter', async () => {
    mockLocalStorage();

    const service = createStorageService();
    await service.initialize?.();

    const payload = {
      version: '2.0',
      currentWeek: 3,
      weeks: {
        1: { players: [], captain: null, viceCaptain: null, teamMembers: [], teamStats: { totalValue: 0, playerCount: 0 } },
        3: { players: [{ id: 'p3', price: 9, have: true }], captain: 'p3', viceCaptain: null, teamMembers: [{ playerId: 'p3', addedAt: 3 }], teamStats: { totalValue: 9, playerCount: 1 } }
      }
    };
    await service.setRootData(payload);

    const result = await service.getItem('fpl-team-data');
    expect(typeof result).toBe('string');
    const parsed = JSON.parse(result);
    expect(parsed).toMatchObject({ currentWeek: 3 });
    expect(parsed.weeks['3']).toMatchObject({ captain: 'p3' });
  });

  test('legacy setItem serializes payload before delegating', async () => {
    mockLocalStorage();
    const service = createStorageService();
    await service.initialize?.();

    const payload = { fizz: 'buzz' };
    await service.setItem('fpl-team-data', payload);

    const stored = await service.getItem('fpl-team-data');
    expect(typeof stored).toBe('string');
    expect(JSON.parse(stored)).toMatchObject(payload);
  });

  test('returns IndexedDB-backed service when backend=indexeddb', () => {
    const service = createStorageService({ backend: 'indexeddb', storageKey: 'idx-test' });
    expect(service).toBeDefined();
    expect(typeof service.getRootData).toBe('function');
  });

  test('returns SQLite-backed service when backend=sqlite', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const service = createStorageService({
      backend: 'sqlite',
      baseUrl: 'http://localhost/api/storage',
      fetchImpl: fetchMock
    });
    expect(service).toBeDefined();
    expect(typeof service.getRootData).toBe('function');
  });

  test('SQLite-backed service loads and persists using the HTTP mock API', async () => {
    const initialRoot = createDefaultRoot();
    const api = createSQLiteApiMock({ initialRoot });
    global.fetch = api.fetchMock;

    const service = createStorageService({
      backend: 'sqlite',
      baseUrl: 'http://localhost/api/storage',
      fetchImpl: api.fetchMock
    });

    const root = await service.getRootData();
    expect(root).toMatchObject({ currentWeek: 1, version: '2.0' });

    expect(api.fetchMock).toHaveBeenCalledWith(
      'http://localhost/api/storage/root',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json' })
      })
    );

    const updatedRoot = {
      version: '2.0',
      currentWeek: 3,
      weeks: {
        1: root.weeks['1'],
        3: {
          players: [{ id: 'p3', have: true, price: 9 }],
          captain: 'p3',
          viceCaptain: null,
          teamMembers: [{ playerId: 'p3', addedAt: 3 }],
          teamStats: { totalValue: 9, playerCount: 1 },
          totalTeamCost: 9,
          isReadOnly: false
        }
      }
    };

    await service.setRootData(updatedRoot);

    expect(api.fetchMock).toHaveBeenLastCalledWith(
      'http://localhost/api/storage/root',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json'
        })
      })
    );

    const persisted = api.getState();
    expect(persisted.currentWeek).toBe(3);
    expect(persisted.weeks['3']).toMatchObject({ captain: 'p3', totalTeamCost: 9 });

    const reloaded = await service.getRootData();
    expect(reloaded.currentWeek).toBe(3);
    expect(reloaded.weeks['3']).toMatchObject({ viceCaptain: null, totalTeamCost: 9 });
  });
});

describe('createDefaultRoot', () => {
  test('produces expected initial structure', () => {
    const root = createDefaultRoot();

    expect(root).toMatchObject({
      version: '2.0',
      currentWeek: 1
    });

    expect(root.weeks).toBeDefined();
    const week1 = root.weeks['1'];
    expect(week1).toBeDefined();
    expect(week1).toMatchObject({
      players: [],
      captain: null,
      viceCaptain: null,
      teamMembers: [],
      totalTeamCost: 0,
      isReadOnly: false
    });
    expect(week1.teamStats).toMatchObject({ totalValue: 0, playerCount: 0 });
    expect(typeof week1.teamStats.updatedDate).toBe('string');
  });
});
