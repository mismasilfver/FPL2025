/**
 * Factory for creating storage service instances
 * Supports both localStorage and IndexedDB implementations
 */

// Import storage implementations
import { StorageService } from './storage.js';
import { StorageServiceDB } from './storage-db.js';

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
    return new StorageServiceDB();
  } else {
    return new StorageService(storageKey);
  }
}
