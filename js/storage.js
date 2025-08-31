/**
 * @file A generic, asynchronous storage adapter that wraps the browser's localStorage.
 * It provides a Promise-based API for getting, setting, and removing items,
 * making it a flexible component for handling data persistence.
 */

class LocalStorageAdapter {
    /**
     * Retrieves an item from localStorage asynchronously.
     * @param {string} key The key of the item to retrieve.
     * @returns {Promise<string|null>} A promise that resolves with the item's value, or null if not found.
     */
    getItem(key) {
        return Promise.resolve(localStorage.getItem(key));
    }

    /**
     * Saves an item to localStorage asynchronously.
     * @param {string} key The key to save the item under.
     * @param {string} value The value to save.
     * @returns {Promise<void>} A promise that resolves when the item is saved.
     */
    setItem(key, value) {
        return Promise.resolve(localStorage.setItem(key, value));
    }

    /**
     * Removes an item from localStorage asynchronously.
     * @param {string} key The key of the item to remove.
     * @returns {Promise<void>} A promise that resolves when the item is removed.
     */
    removeItem(key) {
        return Promise.resolve(localStorage.removeItem(key));
    }
}

// Export the class for use in Node.js environments (e.g., Jest tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocalStorageAdapter };
}
