/**
 * @file IndexedDB-backed implementation of the DatabaseAdapter contract.
 */

const DEFAULT_DB_NAME = 'contract-tests';
const DEFAULT_STORE_NAME = 'keyvalue';
const DB_VERSION = 1;

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value) => (value === undefined
    ? undefined
    : JSON.parse(JSON.stringify(value)));
}

function assertKey(key) {
  if (typeof key !== 'string' || key.length === 0) {
    throw new TypeError('Storage keys must be non-empty strings');
  }
}

function openDatabase(dbName, storeName) {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB database'));
    };

    request.onblocked = () => {
      reject(new Error('Database upgrade blocked'));
    };
  });
}

export class IndexedDBKeyValueAdapter {
  constructor(options = {}) {
    const {
      dbName = DEFAULT_DB_NAME,
      storeName = DEFAULT_STORE_NAME,
    } = options;

    this.dbName = dbName;
    this.storeName = storeName;
    this._dbPromise = openDatabase(this.dbName, this.storeName);
  }

  async _withTransaction(mode, executor) {
    const db = await this._dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);

      executor(store, resolve, reject);

      tx.oncomplete = () => resolve();
      tx.onabort = () => {
        reject(tx.error || new Error('IndexedDB transaction aborted'));
      };
      tx.onerror = () => {
        reject(tx.error || new Error('IndexedDB transaction failed'));
      };
    });
  }

  async get(key) {
    assertKey(key);
    return this._withTransaction('readonly', (store, resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async set(key, value) {
    assertKey(key);
    return this._withTransaction('readwrite', (store, resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async remove(key) {
    assertKey(key);
    return this._withTransaction('readwrite', (store, resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll() {
    return this._withTransaction('readonly', (store, resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const result = {};
        for (const record of request.result || []) {
          result[record.key] = record.value;
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    return this._withTransaction('readwrite', (store, resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async close() {
    const db = await this._dbPromise;
    db.close();
  }
}
