/**
 * @file Defines the shared contract for key-value database adapters.
 *
 * Adapters that satisfy this contract provide a minimal asynchronous API
 * for storing, retrieving, and removing values using string keys. This
 * contract is intentionally simple so that a variety of storage backends
 * (localStorage, IndexedDB, remote APIs, etc.) can be tested against exactly
 * the same behaviour driven by `__tests__/database.test.js`.
 */

/**
 * Describes the shape of the database adapter. All methods must return
 * Promises and MUST resolve (or reject) with native JavaScript values
 * (e.g. strings, numbers, booleans, objects, arrays, null).
 *
 * @typedef {Object} DatabaseAdapter
 * @property {function(string): Promise<any>} get Retrieve a value by key. Resolves with
 *           the stored value or `null` if no entry exists.
 * @property {function(string, any): Promise<void>} set Persist a value for the supplied key.
 * @property {function(string): Promise<void>} remove Remove the entry for the supplied key.
 * @property {function(): Promise<Record<string, any>>} getAll Retrieve a map of all stored
 *           key/value pairs. Implementations should never resolve with `undefined`.
 * @property {function(): Promise<void>} clear Remove every entry managed by the adapter.
 */

/**
 * Methods that every adapter must expose. Exported for convenience so tests can
 * automatically verify that the adapter instance implements the expected API
 * without duplicating the list of method names.
 *
 * @type {readonly string[]}
 */
export const REQUIRED_DATABASE_METHODS = Object.freeze([
  'get',
  'set',
  'remove',
  'getAll',
  'clear',
]);

/**
 * Performs a lightweight runtime assertion to make sure an object claims to
 * implement the database adapter contract. This helper is intentionally
 * defensive: it throws a descriptive error when a required method is missing
 * or not a function. In the test suite we can call this helper in `beforeEach`
 * to fail fast with actionable feedback when wiring new adapters.
 *
 * @param {unknown} adapter Candidate adapter instance
 * @param {string} adapterName Friendly name for error messages
 * @throws {TypeError} When the adapter does not implement the required API
 */
export function assertConformsToDatabaseContract(adapter, adapterName = 'DatabaseAdapter') {
  if (typeof adapter !== 'object' || adapter === null) {
    throw new TypeError(`${adapterName} must be an object, received ${typeof adapter}`);
  }

  for (const method of REQUIRED_DATABASE_METHODS) {
    if (typeof adapter[method] !== 'function') {
      throw new TypeError(`${adapterName} is missing required method: ${method}`);
    }
  }
}
