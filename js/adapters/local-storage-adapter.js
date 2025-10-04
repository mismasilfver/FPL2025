/**
 * @file LocalStorage-backed implementation of the DatabaseAdapter contract.
 */

const DEFAULT_NAMESPACE = 'db:';

function serialize(value) {
  return JSON.stringify(value ?? null);
}

/**
 * Provides a Promise-based wrapper around Web Storage that satisfies the
 * DatabaseAdapter interface required by the shared contract tests.
 */
export class LocalStorageKeyValueAdapter {
  /**
   * @param {Storage} storage Web Storage implementation (defaults to window.localStorage)
   * @param {string} namespace Prefix applied to all stored keys
   */
  constructor(storage = window.localStorage, namespace = DEFAULT_NAMESPACE) {
    if (!storage || typeof storage.getItem !== 'function') {
      throw new TypeError('LocalStorageKeyValueAdapter requires a valid storage object');
    }

    this.storage = storage;
    this.namespace = namespace;
  }

  _buildKey(key) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError('Storage keys must be non-empty strings');
    }
    return `${this.namespace}${key}`;
  }

  async get(key) {
    const storageKey = this._buildKey(key);
    const rawValue = this.storage.getItem(storageKey);
    if (rawValue === null) return null;

    return JSON.parse(rawValue);
  }

  async set(key, value) {
    const storageKey = this._buildKey(key);
    this.storage.setItem(storageKey, serialize(value));
  }

  async remove(key) {
    const storageKey = this._buildKey(key);
    this.storage.removeItem(storageKey);
  }

  async getAll() {
    const result = {};
    const prefix = this.namespace;

    for (let index = 0; index < this.storage.length; index += 1) {
      const storageKey = this.storage.key(index);
      if (!storageKey || !storageKey.startsWith(prefix)) continue;

      const rawValue = this.storage.getItem(storageKey);
      result[storageKey.slice(prefix.length)] = rawValue === null ? null : JSON.parse(rawValue);
    }

    return result;
  }

  async clear() {
    const keysToRemove = [];
    const prefix = this.namespace;

    for (let index = 0; index < this.storage.length; index += 1) {
      const storageKey = this.storage.key(index);
      if (storageKey && storageKey.startsWith(prefix)) {
        keysToRemove.push(storageKey);
      }
    }

    keysToRemove.forEach((key) => this.storage.removeItem(key));
  }
}
