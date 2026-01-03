/**
 * @jest-environment jsdom
 */

import {
  assertConformsToDatabaseContract,
  REQUIRED_DATABASE_METHODS,
} from '../js/adapters/database-adapter.contract.js';
import { LocalStorageKeyValueAdapter } from '../js/adapters/local-storage-adapter.js';
import { IndexedDBKeyValueAdapter } from '../js/adapters/indexeddb-adapter.js';
import { SQLiteKeyValueAdapter } from '../js/adapters/sqlite-adapter.js';
import * as sqliteDatabase from '../server/database.js';

// Contract-driven tests for any storage backend that wants to behave like a
// simple key/value database. Adapters register themselves with the
// `adaptersUnderTest` array so the shared test suite can exercise each
// implementation without duplicating expectations.

const adaptersUnderTest = [];

/**
 * Helper for registering an adapter with this shared contract suite. Adapter
 * registrations contain everything needed for the tests to operate without
 * leaking state between runs.
 *
 * @param {Object} options
 * @param {string} options.name Display name for the adapter under test
 * @param {() => (Promise<any>|any)} options.createAdapter Factory that returns a
 *        fresh adapter instance for each test
 * @param {() => (Promise<void>|void)} [options.beforeEach] Optional hook invoked
 *        before every test for adapter-specific setup
 * @param {() => (Promise<void>|void)} [options.afterEach] Optional hook invoked
 *        after every test for cleanup
 */
export function registerAdapterForContractTests(options) {
  adaptersUnderTest.push(options);
}

function deleteIndexedDBDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function createJsonResponse(data, status = 200) {
  const ok = status >= 200 && status < 300;
  const body = data === undefined ? '' : JSON.stringify(data);
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    async text() {
      return body;
    }
  };
}

function createSQLiteFetchMock() {
  return jest.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();

    if (url.endsWith('/api/storage/root')) {
      if (method === 'GET') {
        const root = sqliteDatabase.getRootData();
        return createJsonResponse(root);
      }
      if (method === 'PUT') {
        const payload = JSON.parse(options.body || '{}');
        const updated = sqliteDatabase.setRootData(payload);
        return createJsonResponse(updated);
      }
    }

    if (url.endsWith('/api/storage/weeks') && method === 'GET') {
      return createJsonResponse(sqliteDatabase.listWeeks());
    }

    if (url.match(/\/api\/storage\/weeks\/\d+$/) && method === 'GET') {
      const weekNumber = Number(url.split('/').pop());
      const week = sqliteDatabase.getWeek(weekNumber);
      if (!week) {
        return createJsonResponse({ message: 'Week not found' }, 404);
      }
      return createJsonResponse(week);
    }

    return createJsonResponse({ message: 'Not implemented in mock fetch' }, 404);
  });
}

function createSQLiteContractFetchMock(storeRef) {
  return jest.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();

    if (!url.endsWith('/api/storage/root')) {
      return createJsonResponse({ message: 'Unsupported route in contract mock' }, 404);
    }

    if (method === 'GET') {
      return createJsonResponse(storeRef.value);
    }

    if (method === 'PUT') {
      const payload = JSON.parse(options.body || '{}');
      storeRef.value = { ...payload };
      return createJsonResponse(storeRef.value);
    }

    return createJsonResponse({ message: 'Unsupported method in contract mock' }, 405);
  });
}

let sqliteContractFetchMock;
const sqliteContractStore = { value: {} };

registerAdapterForContractTests({
  name: 'SQLiteKeyValueAdapter',
  createAdapter() {
    sqliteContractStore.value = {};
    sqliteContractFetchMock = createSQLiteContractFetchMock(sqliteContractStore);
    return new SQLiteKeyValueAdapter({
      baseUrl: 'http://localhost/api/storage',
      namespace: 'contract:',
      fetchImpl: sqliteContractFetchMock
    });
  },
  afterEach() {
    sqliteContractFetchMock?.mockClear?.();
    sqliteContractFetchMock = null;
    sqliteContractStore.value = {};
  }
});

registerAdapterForContractTests({
  name: 'LocalStorageKeyValueAdapter',
  createAdapter: () => new LocalStorageKeyValueAdapter(window.localStorage, 'contract:'),
  beforeEach: () => window.localStorage.clear(),
});

let indexedDbName = null;

registerAdapterForContractTests({
  name: 'IndexedDBKeyValueAdapter',
  async createAdapter() {
    indexedDbName = `contract-tests-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return new IndexedDBKeyValueAdapter({ dbName: indexedDbName });
  },
  afterEach: async () => {
    if (!indexedDbName) return;
    await deleteIndexedDBDatabase(indexedDbName);
    indexedDbName = null;
  },
});

/**
 * Titles for the shared contract tests. Each title maps to an implementation
 * that will be provided in subsequent steps of the TDD process.
 */
export const CONTRACT_TEST_TITLES = Object.freeze([
  'should set and get a value',
  'should return null for a non-existent key',
  'should update an existing value',
  'should remove a value',
  'should get all key-value pairs',
  'should clear the entire database',
  'should handle non-string values like objects and arrays',
]);

describe('DatabaseAdapter contract', () => {
  if (adaptersUnderTest.length === 0) {
    test.skip('No database adapters registered yet', () => {});
    return;
  }

  describe.each(adaptersUnderTest)('%s', ({
    name,
    createAdapter,
    beforeEach: beforeHook,
    afterEach: afterHook,
  }) => {
    let adapter;

    beforeEach(async () => {
      if (typeof beforeHook === 'function') {
        await beforeHook();
      }

      adapter = await createAdapter();
      assertConformsToDatabaseContract(adapter, name);
    });

    afterEach(async () => {
      if (adapter && typeof adapter.clear === 'function') {
        await adapter.clear();
      }

      if (adapter && typeof adapter.close === 'function') {
        await adapter.close();
      }

      if (typeof afterHook === 'function') {
        await afterHook();
      }
    });

    test('exposes the required database methods', () => {
      for (const method of REQUIRED_DATABASE_METHODS) {
        expect(typeof adapter[method]).toBe('function');
      }
    });

    test('should set and get a value', async () => {
      await adapter.set('foo', 'bar');
      const value = await adapter.get('foo');

      expect(value).toBe('bar');
    });

    test('should return null for a non-existent key', async () => {
      const value = await adapter.get('missing-key');

      expect(value).toBeNull();
    });

    test('should update an existing value', async () => {
      await adapter.set('counter', 1);
      await adapter.set('counter', 2);
      const value = await adapter.get('counter');

      expect(value).toBe(2);
    });

    test('should remove a value', async () => {
      await adapter.set('temp', { nested: true });
      await adapter.remove('temp');
      const value = await adapter.get('temp');

      expect(value).toBeNull();
    });

    test('should get all key-value pairs', async () => {
      await adapter.set('a', 1);
      await adapter.set('b', 2);

      const values = await adapter.getAll();

      expect(values).toEqual({ a: 1, b: 2 });
    });

    test('should clear the entire database', async () => {
      await adapter.set('a', 1);
      await adapter.set('b', 2);

      await adapter.clear();

      const values = await adapter.getAll();
      const missingA = await adapter.get('a');

      expect(values).toEqual({});
      expect(missingA).toBeNull();
    });

    test('should handle non-string values like objects and arrays', async () => {
      const payload = {
        object: { nested: { count: 3 }, active: true },
        array: [1, { foo: 'bar' }, ['deep']],
        number: 42,
        boolean: false,
        nullish: null,
      };

      await Promise.all(
        Object.entries(payload).map(([key, value]) => adapter.set(key, value))
      );

      for (const [key, expected] of Object.entries(payload)) {
        const value = await adapter.get(key);
        expect(value).toEqual(expected);
      }

      const allValues = await adapter.getAll();
      expect(allValues).toEqual(payload);
    });
  });
});

describe('SQLiteKeyValueAdapter internals', () => {
  let adapter;
  let fetchMock;

  beforeEach(() => {
    sqliteDatabase.configureDatabase({ fileName: ':memory:' });
    sqliteDatabase.initializeSchema({ fileName: ':memory:' });
    fetchMock = createSQLiteFetchMock();
    adapter = new SQLiteKeyValueAdapter({
      baseUrl: 'http://localhost/api/storage',
      fetchImpl: fetchMock
    });
  });

  afterEach(() => {
    fetchMock?.mockClear?.();
    fetchMock = null;
    adapter = null;
    sqliteDatabase.closeDatabase();
  });

  test('set/get proxies through to SQLite storage', async () => {
    await adapter.set('foo', { bar: true });
    const value = await adapter.get('foo');

    expect(value).toEqual({ bar: true });
    expect(fetchMock).toHaveBeenCalled();
  });

  test('getAll aggregates only namespaced keys', async () => {
    await adapter.set('alpha', 1);
    await adapter.set('beta', 2);

    const values = await adapter.getAll();

    expect(values).toMatchObject({ alpha: 1, beta: 2 });
    const root = sqliteDatabase.getRootData();
    expect(Object.keys(root).some((key) => key.startsWith('db:'))).toBe(true);
  });

  test('clear removes adapter namespace while preserving core root data', async () => {
    await adapter.set('alpha', 1);
    await adapter.set('beta', 2);

    await adapter.clear();

    const values = await adapter.getAll();
    expect(values).toEqual({});

    const root = sqliteDatabase.getRootData();
    expect(root).toMatchObject({ currentWeek: 1, version: '2.0' });
  });
});
