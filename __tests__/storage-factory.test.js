let createStorageService;

describe('Storage factory injection', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.unmock('../js/storage-module.js');
  });

  test('uses localstorage adapter by default', () => {
    jest.isolateModules(() => {
      const adapter = { backend: 'localstorage' };
      const adapterFactory = jest.fn(() => adapter);
      const serviceFactory = jest.fn(() => ({ type: 'service' }));

      ({ createStorageService } = require('../js/storage-module.js'));
      createStorageService({ adapterFactory, serviceFactory });

      expect(adapterFactory).toHaveBeenCalledWith(expect.objectContaining({ backend: 'localstorage' }));
      expect(serviceFactory).toHaveBeenCalledWith(adapter);
    });
  });

  test('passes backend-specific options to sqlite adapter', () => {
    jest.isolateModules(() => {
      const adapter = { backend: 'sqlite' };
      const adapterFactory = jest.fn(() => adapter);
      const serviceFactory = jest.fn(() => ({ type: 'service' }));

      ({ createStorageService } = require('../js/storage-module.js'));
      createStorageService({
        backend: 'sqlite',
        baseUrl: '/api/custom',
        fetchImpl: jest.fn(),
        adapterFactory,
        serviceFactory,
      });

      expect(adapterFactory).toHaveBeenCalledWith(expect.objectContaining({ backend: 'sqlite', baseUrl: '/api/custom' }));
      expect(serviceFactory).toHaveBeenCalledWith(adapter);
    });
  });

  test('uses provided storageKey for indexeddb backend', () => {
    jest.isolateModules(() => {
      const adapter = { backend: 'indexeddb' };
      const adapterFactory = jest.fn(() => adapter);
      const serviceFactory = jest.fn(() => ({ type: 'service' }));

      ({ createStorageService } = require('../js/storage-module.js'));
      createStorageService({
        backend: 'indexeddb',
        storageKey: 'custom-key',
        adapterFactory,
        serviceFactory,
      });

      expect(adapterFactory).toHaveBeenCalledWith(expect.objectContaining({ backend: 'indexeddb', storageKey: 'custom-key' }));
      expect(serviceFactory).toHaveBeenCalledWith(adapter);
    });
  });
});
