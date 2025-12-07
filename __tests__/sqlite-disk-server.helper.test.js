/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');

const { createSQLiteDiskTestServer } = require('../test-utils/create-sqlite-disk-test-server.js');

describe('createSQLiteDiskTestServer helper', () => {
  let server;

  beforeAll(async () => {
    server = await createSQLiteDiskTestServer();
  });

  afterAll(async () => {
    if (server) {
      await server.teardown();
    }
  });

  beforeEach(async () => {
    await server.reset();
  });

  test('exposes baseUrl and database paths on disk', () => {
    expect(typeof server.baseUrl).toBe('string');
    expect(server.baseUrl).toMatch(/^http:\/\//);

    expect(typeof server.databasePath).toBe('string');
    expect(typeof server.databaseDir).toBe('string');
    expect(server.databasePath.startsWith(server.databaseDir)).toBe(true);
    expect(fs.existsSync(server.databasePath)).toBe(true);
  });

  test('persists changes to disk and reset reinitializes defaults', async () => {
    const updatedRoot = {
      version: '2.0',
      currentWeek: 4,
      weeks: {
        1: {
          weekNumber: 1,
          players: [],
          teamStats: { totalValue: 0, totalPlayers: 0 }
        },
        4: {
          weekNumber: 4,
          players: [{ id: 'p4', price: 7.5 }],
          teamStats: { totalValue: 7.5, totalPlayers: 1 }
        }
      }
    };

    await server.fetchJson('/api/storage/root', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRoot)
    });

    const stats = fs.statSync(server.databasePath);
    expect(stats.size).toBeGreaterThan(0);

    const persisted = await server.fetchJson('/api/storage/root');
    expect(persisted.currentWeek).toBe(4);
    expect(persisted.weeks).toHaveProperty('4');

    await server.reset();

    const resetRoot = await server.fetchJson('/api/storage/root');
    expect(resetRoot.currentWeek).toBe(1);
    expect(Object.keys(resetRoot.weeks)).toEqual(['1']);
  });

  test('teardown removes the temporary database directory', async () => {
    const tempServer = await createSQLiteDiskTestServer();
    const dir = tempServer.databaseDir;

    expect(fs.existsSync(dir)).toBe(true);

    await tempServer.teardown();

    expect(fs.existsSync(dir)).toBe(false);
  });
});
