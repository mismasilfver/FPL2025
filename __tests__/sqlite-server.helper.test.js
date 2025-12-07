/**
 * @jest-environment node
 */

const { createSQLiteTestServer } = require('../test-utils/create-sqlite-test-server.js');

describe('createSQLiteTestServer helper', () => {
  let server;

  beforeAll(async () => {
    server = await createSQLiteTestServer();
  });

  afterAll(async () => {
    if (server && typeof server.teardown === 'function') {
      await server.teardown();
    }
  });

  test('exposes baseUrl and responds to health check', async () => {
    expect(typeof server.baseUrl).toBe('string');
    expect(server.baseUrl).toMatch(/^http:\/\//);

    const health = await server.fetchJson('/health');
    expect(health).toEqual({ status: 'ok' });
  });

  test('provides default root payload via storage API', async () => {
    const root = await server.fetchJson('/api/storage/root');

    expect(root).toMatchObject({
      version: '2.0',
      currentWeek: 1,
      weeks: expect.any(Object)
    });
    expect(Object.keys(root.weeks)).toContain('1');
  });

  test('reset restores database to default state', async () => {
    const updatedRoot = {
      version: '2.0',
      currentWeek: 3,
      weeks: {
        1: {
          weekNumber: 1,
          players: [],
          teamStats: { totalValue: 0, totalPlayers: 0 }
        },
        3: {
          weekNumber: 3,
          players: [{ id: 'p3', price: 9 }],
          teamStats: { totalValue: 9, totalPlayers: 1 }
        }
      }
    };

    await server.fetchJson('/api/storage/root', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRoot)
    });

    const mutated = await server.fetchJson('/api/storage/root');
    expect(mutated.currentWeek).toBe(3);
    expect(mutated.weeks).toHaveProperty('3');

    await server.reset();

    const resetRoot = await server.fetchJson('/api/storage/root');
    expect(resetRoot.currentWeek).toBe(1);
    expect(Object.keys(resetRoot.weeks)).toEqual(['1']);
  });
});
