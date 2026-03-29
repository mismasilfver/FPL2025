const LegacyCompatibilityLayer = require('../../js/services/legacy-compatibility-layer.js');

describe('LegacyCompatibilityLayer', () => {
  let layer;
  const storageKey = 'fpl-team-data';

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    layer = new LegacyCompatibilityLayer(storageKey);
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('constructor', () => {
    it('should accept a storage key', () => {
      const customLayer = new LegacyCompatibilityLayer('custom-key');
      expect(customLayer.storageKey).toBe('custom-key');
    });

    it('should use default storage key if none provided', () => {
      const defaultLayer = new LegacyCompatibilityLayer();
      expect(defaultLayer.storageKey).toBe('fpl-team-data');
    });
  });

  describe('_getRootDataSync', () => {
    it('should return default root structure when localStorage is empty', () => {
      const root = layer._getRootDataSync();
      expect(root).toEqual({
        currentWeek: 1,
        weeks: {
          1: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
        }
      });
    });

    it('should return parsed data from localStorage', () => {
      const testData = {
        currentWeek: 2,
        weeks: {
          1: { players: [{ id: 'p1', name: 'Player 1' }], captain: 'p1', viceCaptain: null, isReadOnly: true },
          2: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(testData));
      
      const root = layer._getRootDataSync();
      expect(root.currentWeek).toBe(2);
      expect(root.weeks[1].captain).toBe('p1');
    });

    it('should return default structure when localStorage data is invalid JSON', () => {
      localStorage.setItem(storageKey, 'invalid json');
      
      const root = layer._getRootDataSync();
      expect(root.currentWeek).toBe(1);
      expect(root.weeks[1].players).toEqual([]);
    });
  });

  describe('_saveRootDataSync', () => {
    it('should save data to localStorage', () => {
      const testData = {
        currentWeek: 3,
        weeks: {
          1: { players: [{ id: 'p1' }], captain: 'p1', viceCaptain: null, isReadOnly: false }
        }
      };
      
      layer._saveRootDataSync(testData);
      
      const saved = JSON.parse(localStorage.getItem(storageKey));
      expect(saved.currentWeek).toBe(3);
      expect(saved.weeks[1].captain).toBe('p1');
    });

    it('should not throw when localStorage is unavailable', () => {
      // Temporarily remove localStorage
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;
      
      expect(() => {
        layer._saveRootDataSync({ currentWeek: 1, weeks: {} });
      }).not.toThrow();
      
      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });
  });

  describe('players getter/setter', () => {
    it('should get players from current week', () => {
      const testData = {
        currentWeek: 1,
        weeks: {
          1: { players: [{ id: 'p1', name: 'Player 1' }], captain: null, viceCaptain: null, isReadOnly: false }
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(testData));
      
      expect(layer.players).toEqual([{ id: 'p1', name: 'Player 1' }]);
    });

    it('should return empty array if no players exist', () => {
      expect(layer.players).toEqual([]);
    });

    it('should set players for current week', () => {
      const testData = {
        currentWeek: 1,
        weeks: {
          1: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(testData));
      
      layer.players = [{ id: 'p2', name: 'Player 2' }];
      
      const saved = JSON.parse(localStorage.getItem(storageKey));
      expect(saved.weeks[1].players).toEqual([{ id: 'p2', name: 'Player 2' }]);
    });

    it('should create week structure if missing when setting players', () => {
      layer.players = [{ id: 'p1', name: 'Player 1' }];
      
      const saved = JSON.parse(localStorage.getItem(storageKey));
      expect(saved.weeks[1].players).toEqual([{ id: 'p1', name: 'Player 1' }]);
    });
  });

  describe('captain getter/setter', () => {
    it('should get captain from current week', () => {
      const testData = {
        currentWeek: 1,
        weeks: {
          1: { players: [], captain: 'captain-id', viceCaptain: null, isReadOnly: false }
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(testData));
      
      expect(layer.captain).toBe('captain-id');
    });

    it('should return null if no captain exists', () => {
      expect(layer.captain).toBeNull();
    });

    it('should set captain for current week', () => {
      layer.captain = 'new-captain';
      
      const saved = JSON.parse(localStorage.getItem(storageKey));
      expect(saved.weeks[1].captain).toBe('new-captain');
    });
  });

  describe('viceCaptain getter/setter', () => {
    it('should get viceCaptain from current week', () => {
      const testData = {
        currentWeek: 1,
        weeks: {
          1: { players: [], captain: null, viceCaptain: 'vice-id', isReadOnly: false }
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(testData));
      
      expect(layer.viceCaptain).toBe('vice-id');
    });

    it('should return null if no viceCaptain exists', () => {
      expect(layer.viceCaptain).toBeNull();
    });

    it('should set viceCaptain for current week', () => {
      layer.viceCaptain = 'new-vice';
      
      const saved = JSON.parse(localStorage.getItem(storageKey));
      expect(saved.weeks[1].viceCaptain).toBe('new-vice');
    });
  });

  describe('currentWeek getter/setter', () => {
    it('should get current week number', () => {
      const testData = {
        currentWeek: 5,
        weeks: { 5: { players: [], captain: null, viceCaptain: null, isReadOnly: false } }
      };
      localStorage.setItem(storageKey, JSON.stringify(testData));
      
      expect(layer.currentWeek).toBe(5);
    });

    it('should return 1 as default if no currentWeek', () => {
      expect(layer.currentWeek).toBe(1);
    });

    it('should set current week number', () => {
      layer.currentWeek = 3;
      
      const saved = JSON.parse(localStorage.getItem(storageKey));
      expect(saved.currentWeek).toBe(3);
    });
  });

  describe('loadStateFromStorage', () => {
    it('should exist as a method for backward compatibility', () => {
      expect(typeof layer.loadStateFromStorage).toBe('function');
    });

    it('should return a promise-like object for async compatibility', () => {
      // The legacy method should return something thenable for backward compat
      const result = layer.loadStateFromStorage();
      expect(result).toBeDefined();
    });
  });

  describe('_isReadOnlyCurrentWeek', () => {
    it('should return true when current week is read-only', () => {
      const testData = {
        currentWeek: 1,
        weeks: {
          1: { players: [], captain: null, viceCaptain: null, isReadOnly: true }
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(testData));
      
      expect(layer._isReadOnlyCurrentWeek()).toBe(true);
    });

    it('should return false when current week is not read-only', () => {
      const testData = {
        currentWeek: 1,
        weeks: {
          1: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(testData));
      
      expect(layer._isReadOnlyCurrentWeek()).toBe(false);
    });

    it('should return false when week does not exist', () => {
      expect(layer._isReadOnlyCurrentWeek()).toBe(false);
    });
  });
});
