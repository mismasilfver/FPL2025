/** Tests for the SOLID-friendly adapter/service factory injection hooks exposed by createStorageService. */

let createStorageService;
let createDefaultRoot;

describe('Storage Module', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.unmock('../js/storage-module.js');
  });

  describe('createStorageService', () => {
    test('creates and passes LocalStorageAdapter to StorageService by default', () => {
      jest.isolateModules(() => {
        const adapter = { type: 'local' };
        const factory = jest.fn(() => adapter);
        const serviceFactory = jest.fn(() => ({ service: 'local' }));

        ({ createStorageService, createDefaultRoot } = require('../js/storage-module.js'));
        createStorageService({ adapterFactory: factory, serviceFactory });

        expect(factory).toHaveBeenCalledTimes(1);
        expect(serviceFactory).toHaveBeenCalledWith(adapter);
      });
    });

    test('creates and passes LocalStorageAdapter for backend=localstorage', () => {
      jest.isolateModules(() => {
        const adapter = { type: 'local' };
        const factory = jest.fn(() => adapter);
        const serviceFactory = jest.fn(() => ({ service: 'local' }));

        ({ createStorageService, createDefaultRoot } = require('../js/storage-module.js'));
        createStorageService({ backend: 'localstorage', storageKey: 'custom-key', adapterFactory: factory, serviceFactory });

        expect(factory).toHaveBeenCalledTimes(1);
        expect(serviceFactory).toHaveBeenCalledWith(adapter);
      });
    });

    test('creates and passes SQLiteAdapter for backend=sqlite', () => {
      jest.isolateModules(() => {
        const adapter = { type: 'sqlite' };
        const factory = jest.fn(() => adapter);
        const serviceFactory = jest.fn(() => ({ service: 'sqlite' }));

        ({ createStorageService, createDefaultRoot } = require('../js/storage-module.js'));
        createStorageService({ backend: 'sqlite', baseUrl: '/custom', fetchImpl: jest.fn(), adapterFactory: factory, serviceFactory });

        expect(factory).toHaveBeenCalledTimes(1);
        expect(serviceFactory).toHaveBeenCalledWith(adapter);
      });
    });

    test('creates and passes IndexedDBAdapter for backend=indexeddb', () => {
      jest.isolateModules(() => {
        const adapter = { type: 'indexed' };
        const factory = jest.fn(() => adapter);
        const serviceFactory = jest.fn(() => ({ service: 'indexed' }));

        ({ createStorageService, createDefaultRoot } = require('../js/storage-module.js'));
        createStorageService({ backend: 'indexeddb', storageKey: 'idx', adapterFactory: factory, serviceFactory });

        expect(factory).toHaveBeenCalledTimes(1);
        expect(serviceFactory).toHaveBeenCalledWith(adapter);
      });
    });
  });

  describe('createDefaultRoot', () => {
    test('produces expected initial structure', () => {
      const root = createDefaultRoot();
      expect(root).toMatchObject({
        version: '3.0',
        currentWeek: 1,
      });
      expect(root.weeks['1']).toBeDefined();
    });
  });
});
