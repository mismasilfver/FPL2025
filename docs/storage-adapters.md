# Storage Adapters Overview

This document summarizes the storage adapter architecture introduced for the FPL 2025 application. The goal is to provide a single abstraction for persistence, allowing multiple backends to share the same contract and test suite.

## Contract

- **Definition**: `js/adapters/database-adapter.contract.js`
- **Required methods**: `get(key)`, `set(key, value)`, `remove(key)`, `getAll()`, `clear()`
- **Purpose**: Ensure every adapter exposes a consistent, Promise-based API so higher layers (e.g., `StorageService`, `StorageServiceDB`) remain backend agnostic.
- **Runtime guard**: `assertConformsToDatabaseContract()` throws when methods are missing or not functions.

## Built-in Adapters

### LocalStorageKeyValueAdapter

- **Location**: `js/adapters/local-storage-adapter.js`
- **Backend**: `window.localStorage`
- **Serialization**: JSON (with `null` fallback for undefined values)
- **Use case**: Default adapter for quick persistence without additional APIs

### IndexedDBKeyValueAdapter

- **Location**: `js/adapters/indexeddb-adapter.js`
- **Backend**: Browser IndexedDB (with `fake-indexeddb` during tests)
- **Schema**: Single object store storing `{ key, value }` pairs
- **Extras**: Includes a lightweight `structuredClone` polyfill for environments that lack the native API
- **Use case**: Larger datasets, richer querying, or when localStorage limits are hit

## Registering Adapters in Tests

- **Shared suite**: `__tests__/database.test.js`
- **Registration helper**: `registerAdapterForContractTests({ name, createAdapter, beforeEach?, afterEach? })`
- **Cleanup**: IndexedDB registrations call `indexedDB.deleteDatabase(dbName)` after each test to avoid cross-test leakage.

Run the suite with:

```bash
npm test -- __tests__/database.test.js
```

## Switching Backends at Runtime

- **Feature flag**: `window.USE_INDEXED_DB` (see `index.html`)
- **Factory**: `js/storage-module.js:createStorageService()` chooses between `StorageService` (localStorage) and `StorageServiceDB` (IndexedDB)
- **High-level APIs**: `js/storage.js` and `js/storage-db.js` expose week-centric persistence used by `FPLTeamManager`

## Adding a New Adapter

1. Implement the contract in a new module under `js/adapters/`.
2. Register it in `__tests__/database.test.js` using `registerAdapterForContractTests()`.
3. Run the contract suite to ensure parity with existing adapters.
4. Update documentation (README, IndexedDB guide, etc.) if necessary.
5. Wire it into `createStorageService()` if it should be selectable at runtime.
