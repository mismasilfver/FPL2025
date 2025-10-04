/**
 * @jest-environment jsdom
 */

import {
  assertConformsToDatabaseContract,
  REQUIRED_DATABASE_METHODS,
} from '../js/adapters/database-adapter.contract.js';

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
