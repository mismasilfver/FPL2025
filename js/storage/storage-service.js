class StorageService {
  constructor(adapter) {
    if (!adapter) {
      throw new Error('StorageService requires an adapter.');
    }
    this.adapter = adapter;
  }

  async getRootData() {
    return this.adapter.getRootData();
  }

  async setRootData(data) {
    return this.adapter.setRootData(data);
  }

  async getItem(key) {
    return this.adapter.getItem(key);
  }

  async setItem(key, value) {
    return this.adapter.setItem(key, value);
  }

  async initialize() {
    if (typeof this.adapter.initialize === 'function') {
      return this.adapter.initialize();
    }
  }

  async close() {
    if (typeof this.adapter.close === 'function') {
      return this.adapter.close();
    }
  }
}

export default StorageService;

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}
