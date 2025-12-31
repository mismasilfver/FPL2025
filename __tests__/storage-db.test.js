import { StorageServiceDB } from '../js/storage-db.js';

const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

const enqueue = (fn) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    setTimeout(fn, 0);
  }
};

const createRequest = (executor) => {
  const request = {};
  enqueue(() => {
    try {
      const result = executor();
      request.result = clone(result);
      request.onsuccess?.({ target: request });
    } catch (error) {
      request.error = error;
      request.onerror?.({ target: request });
    }
  });
  return request;
};

const createCursorRequest = (entries, map) => {
  const request = {};
  const cloned = entries.map(([key, value]) => [key, clone(value)]);
  let index = 0;

  const iterate = () => {
    if (index >= cloned.length) {
      request.result = null;
      request.onsuccess?.({ target: request });
      return;
    }

    const [key, value] = cloned[index++];
    const cursor = {
      value,
      delete() {
        map.delete(key);
      },
      continue() {
        enqueue(iterate);
      }
    };

    request.result = cursor;
    request.onsuccess?.({ target: request });
  };

  enqueue(iterate);
  return request;
};

const createStores = (data) => ({
  root: {
    get(key) {
      return createRequest(() => data.root.get(key));
    },
    put(record) {
      data.root.set(record.id, clone(record));
      return createRequest(() => undefined);
    },
    clear() {
      data.root.clear();
      return createRequest(() => undefined);
    }
  },
  weeks: {
    get(key) {
      return createRequest(() => data.weeks.get(key));
    },
    getAll() {
      return createRequest(() => Array.from(data.weeks.values()));
    },
    put(record) {
      data.weeks.set(record.weekNumber, clone(record));
      return createRequest(() => undefined);
    },
    clear() {
      data.weeks.clear();
      return createRequest(() => undefined);
    },
    count() {
      return createRequest(() => data.weeks.size);
    }
  },
  teamMembers: {
    put(record) {
      const key = `${record.weekNumber}:${record.playerId}`;
      data.teamMembers.set(key, clone(record));
      return createRequest(() => undefined);
    },
    clear() {
      data.teamMembers.clear();
      return createRequest(() => undefined);
    },
    index(name) {
      if (name !== 'by_week') {
        throw new Error(`Unsupported index ${name}`);
      }

      return {
        getAll(weekNumber) {
          return createRequest(() =>
            Array.from(data.teamMembers.values()).filter((member) => member.weekNumber === weekNumber)
          );
        },
        openCursor(range) {
          const weekNumber = typeof range === 'object' && range !== null && 'value' in range
            ? range.value
            : range;
          const entries = Array.from(data.teamMembers.entries()).filter(([, member]) => member.weekNumber === weekNumber);
          return createCursorRequest(entries, data.teamMembers);
        }
      };
    }
  }
});

const createFakeDb = (data) => {
  const stores = createStores(data);
  return {
    transaction(storeNames) {
      const tx = {
        objectStore(name) {
          if (!stores[name]) {
            throw new Error(`Unknown object store ${name}`);
          }
          return stores[name];
        },
        oncomplete: undefined,
        onerror: undefined
      };

      enqueue(() => tx.oncomplete?.({ target: tx }));
      return tx;
    }
  };
};

describe('StorageServiceDB initialization flow', () => {
  const originalIndexedDB = global.indexedDB;

  afterEach(() => {
    global.indexedDB = originalIndexedDB;
  });

  const makeRequest = (result) => {
    const request = {};
    queueMicrotask(() => {
      request.result = result;
      request.onsuccess?.({ target: { result } });
    });
    return request;
  };

  test('initialized resolves when IndexedDB open succeeds', async () => {
    const fakeStores = {
      root: {
        get: jest.fn(() => makeRequest(null)),
        put: jest.fn(() => makeRequest(undefined))
      },
      weeks: {
        put: jest.fn(() => makeRequest(undefined))
      }
    };

    const fakeDb = {
      objectStoreNames: { contains: () => true },
      transaction: jest.fn(() => {
        const tx = {
          objectStore: (name) => fakeStores[name],
          oncomplete: undefined,
          onerror: undefined
        };

        queueMicrotask(() => tx.oncomplete?.({ target: tx }));
        return tx;
      })
    };

    global.indexedDB = {
      open: jest.fn(() => {
        const request = {};
        queueMicrotask(() => {
          request.result = fakeDb;
          request.onsuccess?.({ target: { result: fakeDb } });
        });
        return request;
      })
    };

    const service = new StorageServiceDB();

    await expect(service.initialized).resolves.toBeUndefined();
    expect(fakeStores.root.get).toHaveBeenCalledWith('singleton');
  });

  test('initialize method resolves even when called after constructor', async () => {
    const fakeStores = {
      root: {
        get: jest.fn(() => makeRequest({ id: 'singleton' })),
        put: jest.fn(() => makeRequest(undefined))
      },
      weeks: {
        put: jest.fn(() => makeRequest(undefined))
      }
    };

    const fakeDb = {
      objectStoreNames: { contains: () => true },
      transaction: jest.fn(() => {
        const tx = {
          objectStore: (name) => fakeStores[name],
          oncomplete: undefined,
          onerror: undefined
        };

        queueMicrotask(() => tx.oncomplete?.({ target: tx }));
        return tx;
      })
    };

    global.indexedDB = {
      open: jest.fn(() => {
        const request = {};
        queueMicrotask(() => {
          request.result = fakeDb;
          request.onsuccess?.({ target: { result: fakeDb } });
        });
        return request;
      })
    };

    const service = new StorageServiceDB();
    await expect(service.initialize()).resolves.toBeUndefined();
  });
});

const createService = (initial = {}) => {
  const data = {
    root: new Map(initial.root || [['singleton', { id: 'singleton', version: '2.0', currentWeek: 1 }]]),
    weeks: new Map(initial.weeks || [[1, {
      weekNumber: 1,
      playersJson: JSON.stringify([]),
      captain: null,
      viceCaptain: null,
      totalTeamCost: 0,
      teamStats: { totalValue: 0, playerCount: 0, updatedDate: new Date().toISOString() },
      isReadOnly: false
    }]]),
    teamMembers: new Map(initial.teamMembers || [])
  };

  const service = Object.create(StorageServiceDB.prototype);
  service.storageKey = 'fpl-team-data';
  service.dbName = 'fake-db';
  service.dbVersion = 1;
  service.db = createFakeDb(data);
  service.initialized = Promise.resolve();

  return { service, data };
};

describe('StorageServiceDB with in-memory IndexedDB fake', () => {
  const originalKeyRange = global.IDBKeyRange;

  beforeAll(() => {
    global.IDBKeyRange = {
      only(value) {
        return { value };
      }
    };
  });

  afterAll(() => {
    global.IDBKeyRange = originalKeyRange;
  });

  test('getRootData merges persisted weeks and members', async () => {
    const { service, data } = createService({
      root: [['singleton', { id: 'singleton', version: '2.0', currentWeek: 2 }]],
      weeks: [[1, {
        weekNumber: 1,
        playersJson: JSON.stringify([{ id: 'p1', price: 5, have: true }]),
        captain: 'p1',
        viceCaptain: null,
        totalTeamCost: 5,
        teamStats: { totalValue: 5, playerCount: 1 },
        isReadOnly: true
      }]],
      teamMembers: [['1:p1', { weekNumber: 1, playerId: 'p1', addedAt: 1 }]]
    });

    const root = await service.getRootData();
    expect(root).toMatchObject({ currentWeek: 2, version: '2.0' });
    expect(root.weeks['1']).toMatchObject({ captain: 'p1', totalTeamCost: 5 });
    expect(root.weeks['1'].teamMembers).toEqual([{ playerId: 'p1', addedAt: 1 }]);
  });

  test('setRootData persists weeks and team members', async () => {
    const { service, data } = createService();

    const payload = {
      version: '2.1',
      currentWeek: 3,
      weeks: {
        2: {
          players: [{ id: 'p2', price: 6, have: true }],
          captain: 'p2',
          viceCaptain: null,
          teamMembers: [{ playerId: 'p2', addedAt: 2 }],
          totalTeamCost: 6,
          teamStats: { totalValue: 6, playerCount: 1 }
        }
      }
    };

    await service.setRootData(payload);

    expect(data.root.get('singleton')).toMatchObject({ version: '2.1', currentWeek: 3 });
    expect(data.weeks.get(2)).toMatchObject({ captain: 'p2', totalTeamCost: 6 });
    expect(JSON.parse(data.weeks.get(2).playersJson)).toEqual([{ id: 'p2', price: 6, have: true }]);
    expect(Array.from(data.teamMembers.values())).toEqual([{ weekNumber: 2, playerId: 'p2', addedAt: 2 }]);
  });

  test('saveToStorage computes totals and updates root/current week', async () => {
    const { service, data } = createService();

    const players = [
      { id: 'p1', price: 7.5, have: true },
      { id: 'p2', price: 4, have: false },
      { id: 'p3', price: 6, have: true }
    ];

    await service.saveToStorage(4, { players, captain: 'p1', viceCaptain: 'p3' }, 4);

    expect(data.root.get('singleton')).toMatchObject({ currentWeek: 4 });
    const storedWeek = data.weeks.get(4);
    expect(storedWeek.totalTeamCost).toBeCloseTo(13.5, 5);
    expect(storedWeek.teamStats).toMatchObject({ totalValue: 13.5, playerCount: 2 });
    expect(JSON.parse(storedWeek.playersJson)).toHaveLength(3);

    const members = Array.from(data.teamMembers.values()).filter((member) => member.weekNumber === 4);
    expect(members).toEqual([
      { weekNumber: 4, playerId: 'p1', addedAt: 4 },
      { weekNumber: 4, playerId: 'p3', addedAt: 4 }
    ]);
  });

  test('importFromJSON replaces dataset and normalizes fields', async () => {
    const { service, data } = createService();

    const seed = {
      version: '3.0',
      currentWeek: 5,
      weeks: {
        1: {
          players: [{ id: 'p1', price: 5, have: true }],
          captain: 'p1',
          viceCaptain: null,
          teamMembers: [{ playerId: 'p1', addedAt: 1 }],
          totalTeamCost: 5,
          teamStats: { totalValue: 5, playerCount: 1 }
        },
        5: {
          players: [{ id: 'p5', price: 8, have: true }],
          captain: 'p5',
          viceCaptain: null,
          teamMembers: [],
          teamStats: { totalValue: 8, playerCount: 1 },
          isReadOnly: false
        }
      }
    };

    await service.importFromJSON(seed);

    expect(data.root.get('singleton')).toMatchObject({ version: '3.0', currentWeek: 5 });
    expect(data.weeks.get(5)).toMatchObject({ captain: 'p5', totalTeamCost: 8 });
    expect(Array.from(data.teamMembers.values())).toContainEqual({ weekNumber: 1, playerId: 'p1', addedAt: 1 });
  });
});
