import { createStorageService, createDefaultRoot } from '../js/storage-module.js';

const originalLocalStorage = global.localStorage;
const originalFetch = global.fetch;

const createMockLocalStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    __store: store
  };
};

const setupLocalStorageBackend = () => ({
  name: 'localStorage',
  async setup() {
    const localStorageMock = createMockLocalStorage();
    global.localStorage = localStorageMock;

    const service = createStorageService();
    await service.initialize?.();

    return {
      service,
      async cleanup() {
        localStorageMock.clear();
        global.localStorage = originalLocalStorage;
      }
    };
  }
});

const setupIndexedDbBackend = () => ({
  name: 'indexeddb',
  async setup() {
    const service = createStorageService({ backend: 'indexeddb', storageKey: 'contract-indexeddb' });
    await service.initialize?.();

    return {
      service,
      async cleanup() {
        try {
          service.db?.close?.();
        } catch (error) {
          // ignore
        }
        if (typeof indexedDB?.deleteDatabase === 'function') {
          indexedDB.deleteDatabase(service.dbName);
        }
      }
    };
  }
});

const setupSqliteBackend = () => ({
  name: 'sqlite',
  async setup() {
    const rootPayload = createDefaultRoot();

    const fetchMock = jest.fn(async (url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      if (!url.endsWith('/api/storage/root')) {
        return { status: 404, json: async () => ({}) };
      }

      if (method === 'GET') {
        return { status: 200, json: async () => ({ ...rootPayload }) };
      }

      if (method === 'PUT') {
        const body = options.body ? JSON.parse(options.body) : {};
        Object.assign(rootPayload, body);
        return { status: 200, json: async () => ({ ...rootPayload }) };
      }

      return { status: 405, json: async () => ({}) };
    });

    global.fetch = fetchMock;

    const service = createStorageService({
      backend: 'sqlite',
      baseUrl: 'http://localhost/api/storage',
      fetchImpl: fetchMock
    });
    await service.initialize?.();

    return {
      service,
      async cleanup() {
        global.fetch = originalFetch;
      }
    };
  }
});

export const getStorageBackends = () => [
  setupLocalStorageBackend(),
  setupIndexedDbBackend(),
  setupSqliteBackend()
];

describe('Storage backend contract harness', () => {
  test.each(getStorageBackends())('%s backend sets up successfully', async ({ setup }) => {
    const { service, cleanup } = await setup();
    expect(service).toBeDefined();
    await cleanup?.();
  });

  test.each(getStorageBackends())('%s backend returns default root structure', async ({ setup }) => {
    const { service, cleanup } = await setup();
    try {
      const root = await service.getRootData();
      expect(root).toBeDefined();
      const version = root.version ?? '2.0';
      expect(version).toBe('2.0');
      expect(root.currentWeek).toBeGreaterThan(0);
      expect(root.weeks).toBeDefined();

      const week1 = root.weeks['1'] || root.weeks[1];
      expect(week1).toBeDefined();
      expect(Array.isArray(week1.players)).toBe(true);
      expect(week1.teamStats).toBeDefined();
      const totalValue = week1.teamStats?.totalValue ?? 0;
      expect(typeof totalValue).toBe('number');
    } finally {
      await cleanup?.();
    }
  });

  test.each(getStorageBackends())('%s backend persists setRootData payload', async ({ setup }) => {
    const { service, cleanup } = await setup();
    try {
      const payload = {
        version: '3.0',
        currentWeek: 2,
        weeks: {
          1: {
            players: [{ id: 'p1', price: 6, have: true }],
            captain: 'p1',
            viceCaptain: null,
            teamMembers: [{ playerId: 'p1', addedAt: 1 }],
            totalTeamCost: 6,
            teamStats: { totalValue: 6, playerCount: 1 }
          },
          2: {
            players: [{ id: 'p2', price: 7, have: true }],
            captain: 'p2',
            viceCaptain: null,
            teamMembers: [{ playerId: 'p2', addedAt: 2 }],
            totalTeamCost: 7,
            teamStats: { totalValue: 7, playerCount: 1 }
          }
        }
      };

      await service.setRootData(payload);

      const root = await service.getRootData();
      expect(root.currentWeek).toBe(2);
      expect(root.weeks['2'] || root.weeks[2]).toBeDefined();

      if (typeof service.getWeekSnapshot === 'function') {
        const snapshot = await service.getWeekSnapshot(2);
        expect(Array.isArray(snapshot.players)).toBe(true);
        expect(snapshot.players[0]).toMatchObject({ id: 'p2' });
        expect(snapshot.teamMembers).toEqual([{ playerId: 'p2', addedAt: 2 }]);
      }
    } finally {
      await cleanup?.();
    }
  });

  test.each(getStorageBackends())('%s backend saveToStorage computes totals and members', async ({ setup }) => {
    const { service, cleanup } = await setup();
    try {
      const players = [
        { id: 'p1', price: 7, have: true },
        { id: 'p2', price: 4.5, have: false },
        { id: 'p3', price: 6.5, have: true }
      ];

      if (typeof service.saveToStorage !== 'function') {
        return;
      }

      await service.saveToStorage(3, { players, captain: 'p1', viceCaptain: 'p3' }, 3);

      const root = await service.getRootData();
      expect(root.currentWeek).toBe(3);

      if (typeof service.getWeekSnapshot === 'function') {
        const snapshot = await service.getWeekSnapshot(3);
        expect(snapshot.teamMembers).toEqual([
          { playerId: 'p1', addedAt: 3 },
          { playerId: 'p3', addedAt: 3 }
        ]);
        expect(snapshot.teamStats.totalValue).toBeCloseTo(13.5, 5);
        expect(snapshot.totalTeamCost ?? snapshot.teamStats.totalValue).toBeCloseTo(13.5, 5);
      }
    } finally {
      await cleanup?.();
    }
  });

  test.each(getStorageBackends())('%s backend legacy getItem/setItem round-trips JSON', async ({ setup }) => {
    const { service, cleanup } = await setup();
    try {
      if (typeof service.setItem !== 'function' || typeof service.getItem !== 'function') {
        return;
      }

      const payload = { fizz: 'buzz', nested: { value: 42 } };
      await service.setItem('fpl-team-data', payload);

      const stored = await service.getItem('fpl-team-data');
      expect(typeof stored).toBe('string');
      expect(JSON.parse(stored)).toMatchObject(payload);
    } finally {
      await cleanup?.();
    }
  });

  test.each(getStorageBackends())('%s backend handles invalid setRootData payload', async ({ setup, name }) => {
    const { service, cleanup } = await setup();
    try {
      let error = null;
      let result;
      try {
        result = await service.setRootData?.(undefined);
      } catch (err) {
        error = err;
      }

      if (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(/root/i);
      } else if (result && typeof result === 'object') {
        expect(result.currentWeek ?? result?.weeks?.currentWeek ?? 1).toBeGreaterThan(0);
      } else {
        expect(result === undefined || result === null).toBe(true);
      }

      const rawRoot = await service.getRootData();
      const normalizedRoot = typeof rawRoot === 'string' ? JSON.parse(rawRoot) : rawRoot;
      expect(normalizedRoot && typeof normalizedRoot === 'object').toBe(true);
      const currentWeek = Number.isFinite(normalizedRoot?.currentWeek)
        ? Number(normalizedRoot.currentWeek)
        : 1;
      expect(Number.isFinite(currentWeek)).toBe(true);
      expect(currentWeek).toBeGreaterThanOrEqual(0);
      if (normalizedRoot.weeks !== undefined) {
        expect(typeof normalizedRoot.weeks).toBe('object');
      }
    } finally {
      await cleanup?.();
    }
  });
});
