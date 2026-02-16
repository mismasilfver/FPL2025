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
}

export default StorageService;
