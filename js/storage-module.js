/**
 * Unified Storage Module
 * 
 * Provides a single entry point for all storage operations across
 * localStorage, IndexedDB, and SQLite HTTP backends.
 * 
 * Architecture:
 * - StorageService: Facade providing unified API
 * - Adapters: Backend-specific implementations (localStorage, IndexedDB, SQLite)
 * - Factory: Creates configured service instances
 * 
 * All adapters implement the StorageAdapterContract:
 * - getItem(key) / setItem(key, value) - legacy compatibility
 * - getRootData() / setRootData(data) - v2 API
 * - initialize() / close() - lifecycle management
 */

import StorageService from './storage/storage-service.js';
import { IndexedDBAdapter } from './storage/adapters/indexeddb-adapter.js';
import { LocalStorageAdapter } from './storage/adapters/local-storage-adapter.js';
import { SQLiteAdapter } from './storage/adapters/sqlite-adapter.js';
import { WeekModel } from './models/week-model.js';

const DEFAULT_STORAGE_KEY = 'fpl-team-data';
const DEFAULT_SQLITE_BASE_URL = '/api/storage';
const DEFAULT_DB_NAME = 'fpl2025';

const DEFAULT_ADAPTER_FACTORIES = {
  localstorage: ({ storageKey }) => new LocalStorageAdapter({ storageKey }),
  sqlite: ({ storageKey, baseUrl, fetchImpl }) =>
    new SQLiteAdapter({
      baseUrl: baseUrl || DEFAULT_SQLITE_BASE_URL,
      fetchImpl,
      storageKey,
    }),
  indexeddb: ({ storageKey, dbName }) => new IndexedDBAdapter({ storageKey, dbName }),
};

const DEFAULT_SERVICE_FACTORY = (adapter) => new StorageService(adapter);

export function createDefaultRoot() {
  return {
    version: '3.0',
    currentWeek: 1,
    weeks: {
      1: WeekModel.createDefault(1)
    }
  };
}

export function createStorageService(options = {}) {
  const {
    backend = 'localstorage',
    storageKey = DEFAULT_STORAGE_KEY,
    baseUrl,
    fetchImpl,
    dbName = DEFAULT_DB_NAME,
    adapterFactory,
    serviceFactory,
  } = options;

  const normalizedOptions = {
    backend,
    storageKey,
    baseUrl,
    fetchImpl,
    dbName,
  };

  const factory =
    typeof adapterFactory === 'function'
      ? adapterFactory
      : DEFAULT_ADAPTER_FACTORIES[backend] || DEFAULT_ADAPTER_FACTORIES.localstorage;

  const adapter = factory(normalizedOptions);

  const buildService = typeof serviceFactory === 'function' ? serviceFactory : DEFAULT_SERVICE_FACTORY;

  return buildService(adapter);
}

