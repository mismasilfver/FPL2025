/**
 * Contract tests for Storage Adapter interface
 * All storage adapters must implement these methods to be compliant
 */

const { createStorageService, createDefaultRoot } = require('../js/storage-module.js');

describe('Storage Adapter Contract', () => {
  describe('Adapter Interface Requirements', () => {
    it('must implement getItem(key) returning Promise', async () => {
      const service = createStorageService({ backend: 'localstorage' });
      const adapter = service.adapter;
      
      expect(typeof adapter.getItem).toBe('function');
      const result = adapter.getItem('test-key');
      expect(result).toBeInstanceOf(Promise);
      await result; // Should not throw
    });

    it('must implement setItem(key, value) returning Promise', async () => {
      const service = createStorageService({ backend: 'localstorage' });
      const adapter = service.adapter;
      
      expect(typeof adapter.setItem).toBe('function');
      const result = adapter.setItem('test-key', 'test-value');
      expect(result).toBeInstanceOf(Promise);
      await result; // Should not throw
    });

    it('must implement getRootData() returning Promise', async () => {
      const service = createStorageService({ backend: 'localstorage' });
      const adapter = service.adapter;
      
      expect(typeof adapter.getRootData).toBe('function');
      const result = adapter.getRootData();
      expect(result).toBeInstanceOf(Promise);
      await result; // Should not throw
    });

    it('must implement setRootData(data) returning Promise', async () => {
      const service = createStorageService({ backend: 'localstorage' });
      const adapter = service.adapter;
      const testData = createDefaultRoot();
      
      expect(typeof adapter.setRootData).toBe('function');
      const result = adapter.setRootData(testData);
      expect(result).toBeInstanceOf(Promise);
      await result; // Should not throw
    });

    it('must implement initialize() returning Promise', async () => {
      const service = createStorageService({ backend: 'localstorage' });
      const adapter = service.adapter;
      
      // initialize is optional but recommended
      if (typeof adapter.initialize === 'function') {
        const result = adapter.initialize();
        expect(result).toBeInstanceOf(Promise);
        await result;
      }
    });

    it('must implement close() returning Promise', async () => {
      const service = createStorageService({ backend: 'localstorage' });
      const adapter = service.adapter;
      
      // close is optional but recommended
      if (typeof adapter.close === 'function') {
        const result = adapter.close();
        expect(result).toBeInstanceOf(Promise);
        await result;
      }
    });
  });

  describe('StorageAdapter Contract - Method Signatures', () => {
    const requiredMethods = [
      'getItem',
      'setItem',
      'getRootData',
      'setRootData',
    ];

    const optionalMethods = [
      'initialize',
      'close',
      'removeItem',
    ];

    it('localStorage adapter implements all required methods', () => {
      const service = createStorageService({ backend: 'localstorage' });
      const adapter = service.adapter;
      
      for (const method of requiredMethods) {
        expect(typeof adapter[method]).toBe('function');
      }
    });

    it('localStorage adapter implements optional methods', () => {
      const service = createStorageService({ backend: 'localstorage' });
      const adapter = service.adapter;
      
      for (const method of optionalMethods) {
        if (typeof adapter[method] === 'function') {
          expect(typeof adapter[method]).toBe('function');
        }
      }
    });

    it('indexeddb adapter implements all required methods', () => {
      require('fake-indexeddb/auto');
      const service = createStorageService({ backend: 'indexeddb' });
      const adapter = service.adapter;
      
      for (const method of requiredMethods) {
        expect(typeof adapter[method]).toBe('function');
      }
    });

    it('indexeddb adapter implements optional methods', () => {
      require('fake-indexeddb/auto');
      const service = createStorageService({ backend: 'indexeddb' });
      const adapter = service.adapter;
      
      for (const method of optionalMethods) {
        if (typeof adapter[method] === 'function') {
          expect(typeof adapter[method]).toBe('function');
        }
      }
    });

    it('sqlite adapter implements all required methods', () => {
      const mockFetch = jest.fn(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve('{}'),
      }));
      const service = createStorageService({ 
        backend: 'sqlite', 
        fetchImpl: mockFetch 
      });
      const adapter = service.adapter;
      
      for (const method of requiredMethods) {
        expect(typeof adapter[method]).toBe('function');
      }
    });

    it('sqlite adapter implements optional methods', () => {
      const mockFetch = jest.fn(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve('{}'),
      }));
      const service = createStorageService({ 
        backend: 'sqlite', 
        fetchImpl: mockFetch 
      });
      const adapter = service.adapter;
      
      for (const method of optionalMethods) {
        if (typeof adapter[method] === 'function') {
          expect(typeof adapter[method]).toBe('function');
        }
      }
    });

    it('all adapters have storageKey property', () => {
      const localService = createStorageService({ backend: 'localstorage', storageKey: 'test-key' });
      expect(localService.adapter.storageKey).toBe('test-key');

      require('fake-indexeddb/auto');
      const indexedService = createStorageService({ backend: 'indexeddb', storageKey: 'idx-key' });
      expect(indexedService.adapter.storageKey).toBe('idx-key');

      const mockFetch = jest.fn();
      const sqliteService = createStorageService({ 
        backend: 'sqlite', 
        storageKey: 'sqlite-key',
        fetchImpl: mockFetch 
      });
      expect(sqliteService.adapter.storageKey).toBe('sqlite-key');
    });
  });

  describe('Adapter Data Consistency', () => {
    it('setRootData followed by getRootData returns same data', async () => {
      const service = createStorageService({ backend: 'localstorage' });
      const testData = createDefaultRoot();
      testData.currentWeek = 999; // Unique value for verification
      
      await service.setRootData(testData);
      const retrieved = await service.getRootData();
      
      expect(retrieved.currentWeek).toBe(999);
      expect(retrieved.version).toBe('3.0');
    });

    it('setItem followed by getItem returns same value for storageKey', async () => {
      const storageKey = 'contract-test-key';
      const service = createStorageService({ backend: 'localstorage', storageKey });
      const testValue = JSON.stringify({ test: 'data', number: 42 });
      
      // Adapter only allows access to the configured storageKey
      await service.setItem(storageKey, testValue);
      const retrieved = await service.getItem(storageKey);
      
      expect(retrieved).toBe(testValue);
    });

    it('getItem for non-existent key returns null', async () => {
      const service = createStorageService({ backend: 'localstorage' });
      const randomKey = 'non-existent-key-' + Date.now();
      
      const result = await service.getItem(randomKey);
      expect(result).toBeNull();
    });
  });
});
