/**
 * @file Storage implementations for the FPL application.
 * Provides both a LocalStorageAdapter for low-level operations and
 * a StorageService that implements the storage interface used by the application.
 */

/**
 * A generic, asynchronous storage adapter that wraps the browser's localStorage.
 * It provides a Promise-based API for getting, setting, and removing items.
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

/**
 * StorageService class that implements the storage interface used by the application.
 * Uses LocalStorageAdapter for persistence.
 */
class StorageService {
    /**
     * Creates a new StorageService instance.
     * @param {string} storageKey The key to use for storage.
     */
    constructor(storageKey = 'fpl-team-data') {
        this.storageKey = storageKey;
        this.adapter = new LocalStorageAdapter();
    }

    /**
     * Initializes the storage service.
     * @returns {Promise<void>}
     */
    async initialize() {
        // Nothing to initialize for localStorage
        return Promise.resolve();
    }

    /**
     * Gets a snapshot of a specific week's data.
     * @param {number|string} weekNumber The week number to get.
     * @returns {Promise<Object|null>} The week data or null if not found.
     */
    async getWeekSnapshot(weekNumber) {
        const rootData = await this.getRootData();
        if (!rootData || !rootData.weeks) return null;
        return rootData.weeks[weekNumber] || null;
    }

    /**
     * Saves a snapshot of a specific week's data.
     * @param {number|string} weekNumber The week number to save.
     * @param {Object} data The week data to save.
     * @returns {Promise<void>}
     */
    async saveWeekSnapshot(weekNumber, data) {
        const rootData = await this.getRootData() || { weeks: {} };
        if (!rootData.weeks) rootData.weeks = {};
        rootData.weeks[weekNumber] = data;
        return this.saveRootData(rootData);
    }

    /**
     * Gets the root data object.
     * @returns {Promise<Object|null>} The root data or null if not found.
     */
    async getRootData() {
        const data = await this.adapter.getItem(this.storageKey);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Error parsing storage data:', e);
            return null;
        }
    }

    /**
     * Saves the root data object.
     * @param {Object} data The root data to save.
     * @returns {Promise<void>}
     */
    async saveRootData(data) {
        return this.adapter.setItem(this.storageKey, JSON.stringify(data));
    }

    /**
     * Imports data from a JSON string.
     * @param {string} jsonString The JSON string to import.
     * @returns {Promise<void>}
     */
    async importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return this.saveRootData(data);
        } catch (e) {
            console.error('Error importing JSON data:', e);
            throw new Error('Invalid JSON data');
        }
    }

    /**
     * Creates a new week by copying data from the current week
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async createNewWeek() {
        try {
            const rootData = await this.getRootData() || { weeks: {}, currentWeek: 1 };
            const currentWeek = rootData.currentWeek || 1;
            const currentWeekData = rootData.weeks[currentWeek];
            
            if (!currentWeekData) {
                throw new Error('Current week data not found');
            }
            
            const nextWeek = currentWeek + 1;
            
            // Mark current week as read-only
            rootData.weeks[currentWeek] = {
                ...currentWeekData,
                isReadOnly: true
            };
            
            // Create new week with current team state
            rootData.weeks[nextWeek] = {
                players: [...currentWeekData.players],
                captain: currentWeekData.captain,
                viceCaptain: currentWeekData.viceCaptain,
                teamMembers: [...currentWeekData.teamMembers],
                teamStats: { ...currentWeekData.teamStats },
                isReadOnly: false
            };
            
            // Update current week
            rootData.currentWeek = nextWeek;
            
            // Save the updated data
            await this.saveRootData(rootData);
            return true;
        } catch (error) {
            console.error('Error creating new week:', error);
            throw error;
        }
    }
}

// Export the classes
export { LocalStorageAdapter, StorageService };
