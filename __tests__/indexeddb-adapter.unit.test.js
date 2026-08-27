/**
 * @jest-environment jsdom
 *
 * Unit tests for IndexedDBAdapter.saveToStorage and the legacy key-value facade,
 * exercised against fake-indexeddb.
 */

const { IndexedDBAdapter } = require('../js/storage/adapters/indexeddb-adapter.js');

const createPlayer = (overrides = {}) => ({
  id: 'p1',
  name: 'Player One',
  position: 'MID',
  team: 'ARS',
  price: 8.5,
  status: 'Available',
  have: true,
  notes: '',
  ...overrides
});

describe('IndexedDBAdapter', () => {
  let adapter;
  let dbCounter = 0;

  const createAdapter = async () => {
    dbCounter += 1;
    const instance = new IndexedDBAdapter({ dbName: `fpl-adapter-unit-${Date.now()}-${dbCounter}` });
    await instance.initialized;
    return instance;
  };

  beforeEach(async () => {
    adapter = await createAdapter();
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('saveToStorage', () => {
    it('persists week data, team members and the current week', async () => {
      const players = [createPlayer(), createPlayer({ id: 'p2', price: 4, have: false })];

      await adapter.saveToStorage(1, { players, captain: 'p1', viceCaptain: 'p2' }, 1);

      const root = await adapter.loadFromStorage();
      expect(root.currentWeek).toBe(1);
      expect(root.weeks[1].players).toEqual(players);
      expect(root.weeks[1].captain).toBe('p1');
      expect(root.weeks[1].viceCaptain).toBe('p2');
      expect(root.weeks[1].isReadOnly).toBe(false);
      expect(root.weeks[1].teamMembers).toEqual([{ playerId: 'p1', addedAt: 1 }]);
      expect(root.weeks[1].totalTeamCost).toBe(8.5);
      expect(root.weeks[1].teamStats).toMatchObject({ totalValue: 8.5, playerCount: 1 });
    });

    it('coerces string week numbers to numbers', async () => {
      await adapter.saveToStorage('2', { players: [createPlayer()], captain: null, viceCaptain: null }, '2');

      const root = await adapter.loadFromStorage();
      expect(root.currentWeek).toBe(2);
      expect(root.weeks[2].weekNumber).toBe(2);
    });

    // Known defect: saveToStorage queues the member puts before the by_week cursor
    // finishes deleting the previous rows, so the freshly written members are removed
    // as well and the week ends up with no team members. This test documents the
    // expected behaviour and will start passing once the ordering is fixed.
    it.failing('replaces the previous team members of the saved week', async () => {
      await adapter.saveToStorage(
        1,
        { players: [createPlayer(), createPlayer({ id: 'p2' })], captain: null, viceCaptain: null },
        1
      );

      await adapter.saveToStorage(1, { players: [createPlayer({ id: 'p3' })], captain: null, viceCaptain: null }, 1);

      const root = await adapter.loadFromStorage();
      expect(root.weeks[1].teamMembers).toEqual([{ playerId: 'p3', addedAt: 1 }]);
    });

    it('defaults missing players to an empty week', async () => {
      await adapter.saveToStorage(1, { players: undefined, captain: undefined, viceCaptain: undefined }, 1);

      const root = await adapter.loadFromStorage();
      expect(root.weeks[1].players).toEqual([]);
      expect(root.weeks[1].teamMembers).toEqual([]);
      expect(root.weeks[1].captain).toBeNull();
      expect(root.weeks[1].viceCaptain).toBeNull();
      expect(root.weeks[1].totalTeamCost).toBe(0);
    });

    it('leaves other weeks untouched', async () => {
      await adapter.saveToStorage(1, { players: [createPlayer()], captain: 'p1', viceCaptain: null }, 1);
      await adapter.saveToStorage(2, { players: [createPlayer({ id: 'p2' })], captain: 'p2', viceCaptain: null }, 2);

      const root = await adapter.loadFromStorage();
      expect(Object.keys(root.weeks).sort()).toEqual(['1', '2']);
      expect(root.weeks[1].teamMembers).toEqual([{ playerId: 'p1', addedAt: 1 }]);
      expect(root.weeks[2].teamMembers).toEqual([{ playerId: 'p2', addedAt: 2 }]);
    });
  });

  describe('legacy key-value facade', () => {
    it('returns the serialized root for the configured storage key', async () => {
      await adapter.saveToStorage(1, { players: [createPlayer()], captain: 'p1', viceCaptain: null }, 1);

      const serialized = await adapter.getItem('fpl-team-data');
      const parsed = JSON.parse(serialized);
      expect(parsed.version).toBe('2.0');
      expect(parsed.currentWeek).toBe(1);
      expect(parsed.weeks['1'].captain).toBe('p1');
    });

    it('ignores unknown keys', async () => {
      await expect(adapter.getItem('some-other-key')).resolves.toBeNull();
      await expect(adapter.setItem('some-other-key', '{}')).resolves.toBeUndefined();
    });

    it('writes a serialized root payload through setItem', async () => {
      const payload = {
        version: '2.0',
        currentWeek: 3,
        weeks: {
          3: { weekNumber: 3, players: [createPlayer({ id: 'p9' })], captain: 'p9', viceCaptain: null }
        }
      };

      await adapter.setItem('fpl-team-data', JSON.stringify(payload));

      const root = await adapter.getRootData();
      expect(root.currentWeek).toBe(3);
      expect(root.weeks[3].captain).toBe('p9');
      expect(root.weeks[3].players).toHaveLength(1);
    });

    it('accepts an object payload in setItem', async () => {
      await adapter.setItem('fpl-team-data', { version: '2.0', currentWeek: 1, weeks: {} });

      const root = await adapter.getRootData();
      expect(root.weeks).toEqual({});
    });

    it('rejects a non-object payload', async () => {
      await expect(adapter.setItem('fpl-team-data', 'null')).rejects.toThrow(TypeError);
    });
  });

  describe('close', () => {
    it('is idempotent', async () => {
      await adapter.close();
      await expect(adapter.close()).resolves.toBeUndefined();
      expect(adapter.db).toBeNull();
    });
  });
});
