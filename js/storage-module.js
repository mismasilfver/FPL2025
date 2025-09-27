/**
 * Storage module that exports both storage implementations and a factory function
 */

// Import the storage implementations
import { StorageService } from './storage.js';
import { StorageServiceDB } from './storage-db.js';

// Re-export the classes
export { StorageService, StorageServiceDB };

/**
 * Creates and returns the appropriate storage service based on configuration
 * @param {Object} options Configuration options
 * @param {boolean} options.useIndexedDB Whether to use IndexedDB (true) or localStorage (false)
 * @param {string} options.storageKey The key to use for storage
 * @returns {StorageService|StorageServiceDB} The storage service instance
 */
export function createStorageService(options = {}) {
  const { useIndexedDB = false, storageKey = 'fpl-team-data' } = options;
  
  if (useIndexedDB) {
    return new StorageServiceDB(storageKey);
  } else {
    return new StorageService(storageKey);
  }
}
