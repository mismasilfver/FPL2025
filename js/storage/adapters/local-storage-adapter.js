import { createDefaultRoot } from '../root-data.js';
import { BaseStorageAdapter } from './base-storage-adapter.js';

export class LocalStorageAdapter extends BaseStorageAdapter {
  constructor({ storageKey = 'fpl-team-data', storage } = {}) {
    super({ storageKey });
    this.storage = storage || (typeof window !== 'undefined' ? window.localStorage : null);

    if (!this.storage || typeof this.storage.getItem !== 'function') {
      throw new Error('LocalStorageAdapter requires a Web Storage implementation.');
    }
  }

  async initialize() {
    const existing = this.storage.getItem(this.storageKey);
    if (!existing) {
      this.storage.setItem(this.storageKey, JSON.stringify(createDefaultRoot()));
    }
  }

  async getRootData() {
    const raw = this.storage.getItem(this.storageKey);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (error) {
        // Corrupted payload: fall through and reset to defaults.
      }
    }
    return this._resetToDefaultRoot();
  }

  _resetToDefaultRoot() {
    const root = createDefaultRoot();
    this.storage.setItem(this.storageKey, JSON.stringify(root));
    return root;
  }

  async setRootData(root) {
    if (!root || typeof root !== 'object') {
      throw new TypeError('Root payload must be an object for LocalStorage storage');
    }
    this.storage.setItem(this.storageKey, JSON.stringify(root));
    return root;
  }

  async getItem(key) {
    if (key !== this.storageKey) return null;
    return this.storage.getItem(key);
  }

  async setItem(key, value) {
    if (key !== this.storageKey) return;
    const toStore = typeof value === 'string' ? value : JSON.stringify(value);
    this.storage.setItem(key, toStore);
  }
}
