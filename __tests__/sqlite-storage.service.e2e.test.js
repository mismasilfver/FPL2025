/**
 * @jest-environment node
 */

const { createSQLiteTestServer } = require('../test-utils/create-sqlite-test-server.js');
const database = require('../server/database.js');

const { createStorageService, createDefaultRoot } = jest.requireActual('../js/storage-module.js');

describe('SQLiteStorageService end-to-end (HTTP server)', () => {
  let server;
  let service;

  beforeAll(async () => {
    server = await createSQLiteTestServer();
  });

  afterAll(async () => {
    if (server) {
      await server.teardown();
    }
  });

  beforeEach(async () => {
    await server.reset();
    service = createStorageService({
      backend: 'sqlite',
      baseUrl: `${server.baseUrl}/api/storage`,
      fetchImpl: global.fetch
    });
  });

  test('loads default root and persists updates via real HTTP API', async () => {
    const root = await service.getRootData();
    expect(root).toMatchObject({ currentWeek: 1, version: '2.0' });

    const updatedRoot = {
      ...createDefaultRoot(),
      currentWeek: 2,
      weeks: {
        1: root.weeks['1'],
        2: {
          players: [{ id: 'p2', have: true, price: 11 }],
          captain: 'p2',
          viceCaptain: null,
          teamMembers: [{ playerId: 'p2', addedAt: 2 }],
          teamStats: { totalValue: 11, playerCount: 1 },
          totalTeamCost: 11,
          isReadOnly: false
        }
      }
    };

    await service.setRootData(updatedRoot);

    const persisted = await server.fetchJson('/api/storage/root');
    expect(persisted.currentWeek).toBe(2);
    expect(persisted.weeks['2']).toMatchObject({ captain: 'p2', totalTeamCost: 11 });

    const reloaded = await service.getRootData();
    expect(reloaded.currentWeek).toBe(2);
    expect(reloaded.weeks['2']).toMatchObject({ captain: 'p2', totalTeamCost: 11 });
  });

  test('surfaces server errors when persistence fails', async () => {
    const boom = new Error('database exploded');
    const spy = jest.spyOn(database, 'setRootData').mockImplementation(() => {
      throw boom;
    });

    const payload = {
      version: '2.0',
      currentWeek: 1,
      weeks: {
        1: {
          players: [],
          captain: null,
          viceCaptain: null,
          teamMembers: [],
          teamStats: { totalValue: 0, playerCount: 0 },
          totalTeamCost: 0,
          isReadOnly: false
        }
      }
    };

    await expect(service.setRootData(payload)).rejects.toMatchObject({
      message: 'Internal server error',
      status: 500,
      details: 'database exploded'
    });

    spy.mockRestore();
  });
});
