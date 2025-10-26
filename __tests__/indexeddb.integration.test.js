const { createStorageService } = require('../js/storage-module.js');
require('fake-indexeddb/auto');

describe('IndexedDB storage integration', () => {
  let service;
  let storageKey;

  beforeEach(async () => {
    storageKey = `test-${Date.now()}-${Math.random()}`;
    service = createStorageService({ backend: 'indexeddb', storageKey });
    if (typeof service.initialize === 'function') {
      await service.initialize();
    }
  });

  afterEach(async () => {
    if (service && service.db && typeof service.db.close === 'function') {
      service.db.close();
    }
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('fpl2025');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });

  test('persists and retrieves normalized root payload', async () => {
    const rootPayload = {
      version: '2.0',
      currentWeek: 2,
      weeks: {
        1: {
          players: [],
          captain: null,
          viceCaptain: null,
          teamMembers: [],
          teamStats: { totalValue: 10, playerCount: 1, updatedDate: new Date().toISOString() },
          totalTeamCost: 10,
          isReadOnly: true
        },
        2: {
          players: [{ id: 'p1', have: true, price: 10 }],
          captain: 'p1',
          viceCaptain: null,
          teamMembers: [{ playerId: 'p1', addedAt: 2 }],
          teamStats: { totalValue: 10, playerCount: 1, updatedDate: new Date().toISOString() },
          totalTeamCost: 10,
          isReadOnly: false
        }
      }
    };

    await service.setRootData(rootPayload);
    const loaded = await service.getRootData();

    expect(loaded.currentWeek).toBe(2);
    expect(loaded.version).toBe('2.0');
    expect(loaded.weeks['1']).toEqual(expect.objectContaining({
      captain: null,
      isReadOnly: true,
      totalTeamCost: 10
    }));
    expect(loaded.weeks['2']).toEqual(expect.objectContaining({
      captain: 'p1',
      isReadOnly: false,
      totalTeamCost: 10
    }));
    expect(loaded.weeks['2'].teamMembers).toEqual([
      expect.objectContaining({ playerId: 'p1', addedAt: 2 })
    ]);
  });

  test('legacy facade returns JSON string for getItem', async () => {
    await service.setRootData({
      version: '2.0',
      currentWeek: 1,
      weeks: { 1: { players: [], captain: null, viceCaptain: null, isReadOnly: false } }
    });

    const persisted = await service.getItem(storageKey);
    expect(typeof persisted).toBe('string');
    const parsed = JSON.parse(persisted);
    expect(parsed).toEqual(expect.objectContaining({ currentWeek: 1 }));
  });
});
