import { parseRootPayload } from '../root-data.js';

/**
 * Shared behaviour for storage adapters.
 *
 * Provides the legacy key-value facade expressed in terms of the v2 root API
 * (`getRootData`/`setRootData`) and a no-op `close()` for backends without a
 * persistent connection. Adapters override only what differs.
 */
export class BaseStorageAdapter {
  constructor({ storageKey = 'fpl-team-data' } = {}) {
    this.storageKey = storageKey;
  }

  async getItem(key) {
    if (key !== this.storageKey) return null;
    const root = await this.getRootData();
    return JSON.stringify(root);
  }

  async setItem(key, value) {
    if (key !== this.storageKey) return undefined;
    return this.setRootData(parseRootPayload(value));
  }

  async close() {
    // Backends without a persistent connection have nothing to release.
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.BaseStorageAdapter = BaseStorageAdapter;
}
