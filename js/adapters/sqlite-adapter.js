/**
 * @file SQLite-backed implementation of the DatabaseAdapter contract.
 * Bridges the browser frontend with the Express SQLite API hosted locally.
 */

const DEFAULT_BASE_URL = '/api/storage';
const DEFAULT_NAMESPACE = 'db:';

function buildUrl(baseUrl, path) {
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
  }
  return `${baseUrl.replace(/\/$/, '')}/${path}`;
}

function assertValidKey(key) {
  if (typeof key !== 'string' || key.length === 0) {
    throw new TypeError('Storage keys must be non-empty strings');
  }
}

async function handleResponse(response) {
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }

  if (!response.ok) {
    const message = data?.message || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

export class SQLiteKeyValueAdapter {
  constructor({ baseUrl = DEFAULT_BASE_URL, namespace = DEFAULT_NAMESPACE, fetchImpl } = {}) {
    this.baseUrl = baseUrl;
    this.namespace = namespace;
    this.fetch = fetchImpl || (typeof window !== 'undefined' ? window.fetch.bind(window) : null);

    if (typeof this.fetch !== 'function') {
      throw new Error('SQLiteKeyValueAdapter requires a fetch implementation');
    }
  }

  _buildKey(key) {
    assertValidKey(key);
    return `${this.namespace}${key}`;
  }

  async get(key) {
    const storageKey = this._buildKey(key);
    const url = buildUrl(this.baseUrl, `root`);
    const root = await this._getRoot(url);
    return root?.[storageKey] ?? null;
  }

  async set(key, value) {
    const storageKey = this._buildKey(key);
    const url = buildUrl(this.baseUrl, `root`);
    const root = await this._getRoot(url);
    const next = { ...root, [storageKey]: value };
    await this._putRoot(url, next);
  }

  async remove(key) {
    const storageKey = this._buildKey(key);
    const url = buildUrl(this.baseUrl, `root`);
    const root = await this._getRoot(url);
    if (!root || !(storageKey in root)) return;
    const next = { ...root };
    delete next[storageKey];
    await this._putRoot(url, next);
  }

  async getAll() {
    const url = buildUrl(this.baseUrl, `root`);
    const root = await this._getRoot(url);
    if (!root) return {};

    const entries = Object.entries(root)
      .filter(([key]) => key.startsWith(this.namespace))
      .map(([key, value]) => [key.slice(this.namespace.length), value]);

    return Object.fromEntries(entries);
  }

  async clear() {
    const url = buildUrl(this.baseUrl, `root`);
    const root = await this._getRoot(url);
    if (!root) return;

    const filtered = Object.fromEntries(
      Object.entries(root).filter(([key]) => !key.startsWith(this.namespace))
    );

    await this._putRoot(url, filtered);
  }

  async _getRoot(url) {
    try {
      const response = await this.fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await handleResponse(response);
      return data?.payload ?? data;
    } catch (error) {
      console.error('[sqlite-adapter] Failed to GET root:', error);
      throw error;
    }
  }

  async _putRoot(url, payload) {
    try {
      const response = await this.fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      await handleResponse(response);
    } catch (error) {
      console.error('[sqlite-adapter] Failed to PUT root:', error);
      throw error;
    }
  }
}
