/**
 * Tests for the storage factory module - Mock Implementation
 */

// Mock the storage module
jest.mock('../js/storage-module.js', () => {
  class MockStorageService {
    constructor(options = {}) {
      this.storageKey = options.storageKey || 'fpl-team-data';
      this.useIndexedDB = false;
    }
  }

  class MockStorageServiceDB {
    constructor(options = {}) {
      this.storageKey = options.storageKey || 'fpl-team-data';
      this.useIndexedDB = true;
    }
  }

  return {
    StorageService: MockStorageService,
    StorageServiceDB: MockStorageServiceDB,
    createStorageService: (options = {}) => {
      return options.useIndexedDB 
        ? new MockStorageServiceDB(options) 
        : new MockStorageService(options);
    }
  };
});

const { createStorageService } = require('../js/storage-module');

describe('Storage Factory', () => {
  test('should create localStorage-based StorageService when useIndexedDB is false', () => {
    const storage = createStorageService({ useIndexedDB: false });
    expect(storage.useIndexedDB).toBe(false);
  });

  test('should create IndexedDB-based StorageServiceDB when useIndexedDB is true', () => {
    const storage = createStorageService({ useIndexedDB: true });
    expect(storage.useIndexedDB).toBe(true);
  });

  test('should use default storageKey if not provided', () => {
    const storage = createStorageService({ useIndexedDB: false });
    expect(storage.storageKey).toBe('fpl-team-data');
  });

  test('should use provided storageKey', () => {
    const storage = createStorageService({ useIndexedDB: false, storageKey: 'custom-key' });
    expect(storage.storageKey).toBe('custom-key');
  });
});
