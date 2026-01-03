/**
 * Storage service factory supporting localStorage, IndexedDB and SQLite HTTP backends.
 */

import { StorageServiceDB } from './storage-db.js';

const DEFAULT_STORAGE_KEY = 'fpl-team-data';
const DEFAULT_SQLITE_BASE_URL = '/api/storage';

export function createDefaultRoot() {
  return {
    version: '2.0',
    currentWeek: 1,
    weeks: {
      1: {
        players: [],
        captain: null,
        viceCaptain: null,
        teamMembers: [],
        teamStats: {
          totalValue: 0,
          playerCount: 0,
          updatedDate: new Date().toISOString()
        },
        totalTeamCost: 0,
        isReadOnly: false
      }
    }
  };
}

class LocalStorageService {
  constructor({ storageKey = DEFAULT_STORAGE_KEY, storage } = {}) {
    this.storageKey = storageKey;
    this.storage = storage || (typeof window !== 'undefined' ? window.localStorage : null);

    if (!this.storage || typeof this.storage.getItem !== 'function') {
      throw new Error('LocalStorageService requires a Web Storage implementation.');
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
    if (!raw) {
      const root = createDefaultRoot();
      this.storage.setItem(this.storageKey, JSON.stringify(root));
      return root;
    }

    try {
      const parsed = JSON.parse(raw);
      return normalizeRoot(parsed);
    } catch (error) {
      console.error('[storage] Failed to parse persisted root, resetting to default.', error);
      const root = createDefaultRoot();
      this.storage.setItem(this.storageKey, JSON.stringify(root));
      return root;
    }
  }

  async setRootData(root) {
    const normalized = normalizeRoot(root);
    this.storage.setItem(this.storageKey, JSON.stringify(normalized));
    return normalized;
  }

  // Legacy helper methods retained for backward compatibility with older tests
  async _getRaw(key) {
    return this.storage.getItem(key);
  }

  async _setRaw(key, value) {
    this.storage.setItem(key, value);
  }

  async getItem(key) {
    const raw = await this._getRaw(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return raw;
    }
  }

  async setItem(key, value) {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    await this._setRaw(key, payload);
  }
}

class SQLiteStorageService {
  constructor({ baseUrl = DEFAULT_SQLITE_BASE_URL, fetchImpl, storageKey = DEFAULT_STORAGE_KEY } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl || (typeof window !== 'undefined' ? window.fetch.bind(window) : null);
    this.storageKey = storageKey;

    if (typeof this.fetch !== 'function') {
      throw new Error('SQLiteStorageService requires a fetch implementation.');
    }
  }

  async initialize() {
    await this.getRootData();
  }

  async getRootData() {
    const response = await this.fetch(`${this.baseUrl}/root`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    const data = await parseResponse(response);
    return normalizeRoot(data);
  }

  async setRootData(root) {
    const payload = normalizeRoot(root);
    const response = await this.fetch(`${this.baseUrl}/root`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    await parseResponse(response);
    return payload;
  }

  // Legacy helper methods retained for backward compatibility with older tests
  async getItem(key) {
    if (!this._matchesKey(key)) {
      console.warn(`[storage] SQLite adapter ignoring getItem for unexpected key: ${key}`);
    }
    const root = await this.getRootData();
    return root;
  }

  async setItem(key, value) {
    if (!this._matchesKey(key)) {
      console.warn(`[storage] SQLite adapter ignoring setItem for unexpected key: ${key}`);
    }
    const payload = typeof value === 'string' ? JSON.parse(value) : value;
    await this.setRootData(payload);
  }

  _matchesKey(key) {
    const expected = this.storageKey || DEFAULT_STORAGE_KEY;
    return key === expected;
  }
}

export function createStorageService(options = {}) {
  const {
    backend = 'localstorage',
    storageKey = DEFAULT_STORAGE_KEY,
    baseUrl,
    fetchImpl
  } = options;

  if (backend === 'sqlite') {
    const sqlite = new SQLiteStorageService({
      baseUrl: baseUrl || DEFAULT_SQLITE_BASE_URL,
      fetchImpl,
      storageKey
    });
    return createWithLegacyFacade(sqlite, storageKey);
  }

  if (backend === 'indexeddb') {
    const indexedDb = new StorageServiceDB({ storageKey });
    return createWithLegacyFacade(indexedDb, storageKey);
  }

  const local = new LocalStorageService({ storageKey });
  return createWithLegacyFacade(local, storageKey);
}

function normalizeRoot(root) {
  if (!root || typeof root !== 'object') {
    return createDefaultRoot();
  }

  const normalized = { ...root };
  normalized.version = normalized.version || '2.0';
  normalized.currentWeek = Number.isInteger(normalized.currentWeek) && normalized.currentWeek > 0
    ? normalized.currentWeek
    : 1;

  const weeks = normalized.weeks && typeof normalized.weeks === 'object'
    ? normalized.weeks
    : {};

  normalized.weeks = Object.entries(weeks).reduce((acc, [weekNumber, payload]) => {
    const key = String(weekNumber);
    acc[key] = normalizeWeek(payload);
    return acc;
  }, {});

  if (Object.keys(normalized.weeks).length === 0) {
    const defaults = createDefaultRoot();
    normalized.weeks = defaults.weeks;
    normalized.currentWeek = defaults.currentWeek;
  }

  return normalized;
}

function normalizeWeek(week) {
  if (!week || typeof week !== 'object') {
    return {
      players: [],
      captain: null,
      viceCaptain: null,
      teamMembers: [],
      teamStats: { totalValue: 0, playerCount: 0, updatedDate: new Date().toISOString() },
      totalTeamCost: 0,
      isReadOnly: false
    };
  }

  const normalized = { ...week };
  normalized.players = Array.isArray(normalized.players) ? normalized.players : [];
  normalized.captain = normalized.captain ?? null;
  normalized.viceCaptain = normalized.viceCaptain ?? null;
  normalized.teamMembers = Array.isArray(normalized.teamMembers) ? normalized.teamMembers : [];
  normalized.teamStats = normalized.teamStats && typeof normalized.teamStats === 'object'
    ? { ...normalized.teamStats }
    : { totalValue: 0, playerCount: 0, updatedDate: new Date().toISOString() };
  normalized.totalTeamCost = Number.isFinite(normalized.totalTeamCost)
    ? normalized.totalTeamCost
    : normalized.teamStats.totalValue || 0;
  normalized.isReadOnly = Boolean(normalized.isReadOnly);

  return normalized;
}

async function parseResponse(response) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || response.statusText || 'Request failed');
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

function createWithLegacyFacade(service, storageKey) {
  service.storageKey = storageKey;

  const originalGetItem = typeof service.getItem === 'function'
    ? service.getItem.bind(service)
    : null;
  const originalSetItem = typeof service.setItem === 'function'
    ? service.setItem.bind(service)
    : null;
  const originalGetRootData = typeof service.getRootData === 'function'
    ? service.getRootData.bind(service)
    : null;
  const originalSetRootData = typeof service.setRootData === 'function'
    ? service.setRootData.bind(service)
    : null;

  service.getItem = async function(key) {
    const result = await (originalGetItem ? originalGetItem(key) : originalGetRootData?.());

    if (typeof result === 'string' || result === null) {
      return result;
    }

    return JSON.stringify(result);
  };

  service.setItem = async function(key, value) {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;

    if (originalSetItem) {
      return originalSetItem(key, payload);
    }

    return originalSetRootData ? originalSetRootData(parsed) : undefined;
  };

  return service;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.createDefaultRoot = createDefaultRoot;
  module.exports.createStorageService = createStorageService;
}
