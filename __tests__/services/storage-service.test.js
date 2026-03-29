const StorageService = require('../../js/storage/storage-service.js');

describe('StorageService', () => {
  let mockAdapter;
  let service;

  beforeEach(() => {
    mockAdapter = {
      getRootData: jest.fn().mockResolvedValue({ version: '2.0', currentWeek: 1 }),
      setRootData: jest.fn().mockResolvedValue(undefined),
      getItem: jest.fn().mockResolvedValue('test-value'),
      setItem: jest.fn().mockResolvedValue(undefined),
      initialize: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      storageKey: 'test-key'
    };
    service = new StorageService(mockAdapter);
  });

  describe('constructor', () => {
    it('should throw if adapter is not provided', () => {
      expect(() => new StorageService()).toThrow('StorageService requires an adapter.');
    });

    it('should accept a valid adapter', () => {
      expect(() => new StorageService(mockAdapter)).not.toThrow();
    });

    it('should expose the adapter', () => {
      expect(service.adapter).toBe(mockAdapter);
    });
  });

  describe('getRootData', () => {
    it('should delegate to adapter.getRootData', async () => {
      const result = await service.getRootData();
      expect(mockAdapter.getRootData).toHaveBeenCalled();
      expect(result).toEqual({ version: '2.0', currentWeek: 1 });
    });
  });

  describe('setRootData', () => {
    it('should delegate to adapter.setRootData', async () => {
      const testData = { version: '2.0', currentWeek: 2 };
      await service.setRootData(testData);
      expect(mockAdapter.setRootData).toHaveBeenCalledWith(testData);
    });
  });

  describe('getItem', () => {
    it('should delegate to adapter.getItem', async () => {
      const result = await service.getItem('my-key');
      expect(mockAdapter.getItem).toHaveBeenCalledWith('my-key');
      expect(result).toBe('test-value');
    });
  });

  describe('setItem', () => {
    it('should delegate to adapter.setItem', async () => {
      await service.setItem('my-key', 'my-value');
      expect(mockAdapter.setItem).toHaveBeenCalledWith('my-key', 'my-value');
    });
  });

  describe('initialize', () => {
    it('should delegate to adapter.initialize if available', async () => {
      await service.initialize();
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('should not throw if adapter.initialize is not available', async () => {
      delete mockAdapter.initialize;
      await expect(service.initialize()).resolves.toBeUndefined();
    });
  });

  describe('close', () => {
    it('should delegate to adapter.close if available', async () => {
      await service.close();
      expect(mockAdapter.close).toHaveBeenCalled();
    });

    it('should not throw if adapter.close is not available', async () => {
      delete mockAdapter.close;
      await expect(service.close()).resolves.toBeUndefined();
    });
  });
});
