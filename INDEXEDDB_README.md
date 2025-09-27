# IndexedDB Storage Implementation

This document describes the IndexedDB storage implementation for the Fantasy Premier League application.

## Overview

The application now supports two storage backends:
1. **localStorage** (original implementation)
2. **IndexedDB** (new implementation)

A feature flag (`window.USE_INDEXED_DB`) controls which storage backend is used.

## Feature Flag

The feature flag is defined in `index.html`:

```javascript
// Feature flag for IndexedDB storage
window.USE_INDEXED_DB = false; // Set to true to use IndexedDB
```

Set this to `true` to use IndexedDB or `false` to use localStorage.

## Storage Architecture

### Storage Factory

The `createStorageService` factory function in `js/storage-module.js` creates the appropriate storage service based on the feature flag:

```javascript
import { StorageService } from './storage.js';
import { StorageServiceDB } from './storage-db.js';

export function createStorageService(options = {}) {
  const { useIndexedDB = false, storageKey = 'fpl-team-data' } = options;
  
  if (useIndexedDB) {
    return new StorageServiceDB(storageKey);
  } else {
    return new StorageService(storageKey);
  }
}
```

### Storage Service Interface

Both storage implementations provide the same interface:

- `initialize()`: Set up the storage
- `getWeekSnapshot(weekNumber)`: Get data for a specific week
- `saveWeekSnapshot(weekNumber, data)`: Save data for a specific week
- `getRootData()`: Get root data (version, currentWeek)
- `saveRootData(data)`: Save root data
- `importFromJSON(jsonString)`: Import data from JSON

### IndexedDB Implementation

The IndexedDB implementation (`StorageServiceDB`) in `js/storage-db.js` uses the following structure:

- Database name: `fpl-team-data`
- Object stores:
  - `root`: Stores root data (version, currentWeek)
  - `weeks`: Stores week data (players, captain, viceCaptain, teamMembers, etc.)

All methods return Promises to handle the asynchronous nature of IndexedDB.

## Async Support

To support the asynchronous nature of IndexedDB, the following changes were made:

1. **Async Helpers**: The `js/async-helpers.js` module provides utilities to make methods async-compatible.
2. **FPL Async Patch**: The `js/fpl-async-patch.js` module patches FPLTeamManager methods to be async-compatible.
3. **App Initialization**: The `js/app-init.js` module initializes the app with the appropriate storage backend.

## JSON Import/Export

The application now supports importing and exporting data in JSON format:

- **Export**: The "Export Week Data" button exports the current week's data to a JSON file.
- **Import**: The "Import JSON" button imports data from a JSON file into the current storage backend.

The import/export functionality is implemented in `js/import-export.js`.

## Testing

The IndexedDB implementation is tested using the `fake-indexeddb` package, which provides an in-memory implementation of IndexedDB for testing.

The Jest setup in `jest.setup.js` includes:

```javascript
// Setup fake-indexeddb for testing
require('fake-indexeddb/auto');
```

## Usage

1. Set the feature flag in `index.html`:
   ```javascript
   window.USE_INDEXED_DB = true; // Use IndexedDB
   ```

2. The application will automatically use the appropriate storage backend.

3. The storage type is displayed in the UI header.

4. Use the Import/Export buttons to transfer data between storage backends or for backup/restore.
