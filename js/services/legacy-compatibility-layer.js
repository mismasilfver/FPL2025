/**
 * LegacyCompatibilityLayer provides backward compatibility for legacy code
 * that accesses player data through synchronous getter/setters.
 * 
 * This service is deprecated and should only be used for backward compatibility.
 * New code should use the async storage service methods.
 */
export class LegacyCompatibilityLayer {
  constructor(storageKey = 'fpl-team-data') {
    this.storageKey = storageKey;
  }

  /**
   * Get root data synchronously from localStorage
   * @returns {object} Root data structure
   */
  _getRootDataSync() {
    try {
      if (typeof localStorage === 'undefined') {
        return this._createDefaultRoot();
      }
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return this._createDefaultRoot();
      }
      return JSON.parse(data);
    } catch (e) {
      return this._createDefaultRoot();
    }
  }

  /**
   * Save root data synchronously to localStorage
   * @param {object} root - Root data to save
   */
  _saveRootDataSync(root) {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(root));
    } catch (e) {
      console.warn('Failed to save data synchronously:', e);
    }
  }

  /**
   * Create default root structure
   * @returns {object} Default root structure
   */
  _createDefaultRoot() {
    return {
      currentWeek: 1,
      weeks: {
        1: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
      }
    };
  }

  /**
   * Get players from current week (legacy sync getter)
   * @returns {Array} Players in current week
   */
  get players() {
    const root = this._getRootDataSync();
    return root?.weeks?.[root.currentWeek]?.players || [];
  }

  /**
   * Set players for current week (legacy sync setter)
   * @param {Array} value - Players array
   */
  set players(value) {
    const root = this._getRootDataSync();
    if (!root.weeks[root.currentWeek]) {
      root.weeks[root.currentWeek] = { players: [], captain: null, viceCaptain: null, isReadOnly: false };
    }
    root.weeks[root.currentWeek].players = value;
    this._saveRootDataSync(root);
  }

  /**
   * Get captain from current week (legacy sync getter)
   * @returns {string|null} Captain player ID
   */
  get captain() {
    const root = this._getRootDataSync();
    return root?.weeks?.[root.currentWeek]?.captain || null;
  }

  /**
   * Set captain for current week (legacy sync setter)
   * @param {string|null} value - Captain player ID
   */
  set captain(value) {
    const root = this._getRootDataSync();
    if (!root.weeks[root.currentWeek]) {
      root.weeks[root.currentWeek] = { players: [], captain: null, viceCaptain: null, isReadOnly: false };
    }
    root.weeks[root.currentWeek].captain = value;
    this._saveRootDataSync(root);
  }

  /**
   * Get viceCaptain from current week (legacy sync getter)
   * @returns {string|null} Vice-captain player ID
   */
  get viceCaptain() {
    const root = this._getRootDataSync();
    return root?.weeks?.[root.currentWeek]?.viceCaptain || null;
  }

  /**
   * Set viceCaptain for current week (legacy sync setter)
   * @param {string|null} value - Vice-captain player ID
   */
  set viceCaptain(value) {
    const root = this._getRootDataSync();
    if (!root.weeks[root.currentWeek]) {
      root.weeks[root.currentWeek] = { players: [], captain: null, viceCaptain: null, isReadOnly: false };
    }
    root.weeks[root.currentWeek].viceCaptain = value;
    this._saveRootDataSync(root);
  }

  /**
   * Get current week number (legacy sync getter)
   * @returns {number} Current week number
   */
  get currentWeek() {
    const root = this._getRootDataSync();
    return root?.currentWeek || 1;
  }

  /**
   * Set current week number (legacy sync setter)
   * @param {number} value - Week number
   */
  set currentWeek(value) {
    const root = this._getRootDataSync();
    root.currentWeek = value;
    this._saveRootDataSync(root);
  }

  /**
   * Legacy method for backward compatibility
   * @returns {Promise} Resolves immediately for async compatibility
   */
  loadStateFromStorage() {
    // Legacy method - returns a resolved promise for async compatibility
    return Promise.resolve();
  }

  /**
   * Check if current week is read-only (legacy sync method)
   * @returns {boolean} True if current week is read-only
   */
  _isReadOnlyCurrentWeek() {
    const root = this._getRootDataSync();
    const week = root?.weeks?.[root.currentWeek];
    return !!week?.isReadOnly;
  }
}

// Export for both ESM and CommonJS
export default LegacyCompatibilityLayer;

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LegacyCompatibilityLayer;
}
