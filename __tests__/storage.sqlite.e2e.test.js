/**
 * @jest-environment node
 */

const { createSQLiteTestServer } = require('../test-utils/create-sqlite-test-server.js');

describe('SQLite storage server end-to-end', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await createSQLiteTestServer();
    baseUrl = `${server.baseUrl}/api/storage`;
  });

  afterAll(async () => {
    if (server) {
      await server.teardown();
    }
  });

  beforeEach(async () => {
    await server.reset();
  });

  test('initial root payload is returned and can be updated', async () => {
    const rootResponse = await fetch(`${baseUrl}/root`);
    expect(rootResponse.status).toBe(200);
    const rootPayload = await rootResponse.json();

    expect(rootPayload).toMatchObject({
      version: '2.0',
      currentWeek: 1
    });

    const updatedRoot = {
      ...rootPayload,
      currentWeek: 2,
      weeks: {
        ...rootPayload.weeks,
        2: {
          weekNumber: 2,
          players: [{ id: 'p2', have: true }],
          teamStats: { totalValue: 12, totalPlayers: 1 }
        }
      }
    };

    const putResponse = await fetch(`${baseUrl}/root`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRoot)
    });

    expect(putResponse.status).toBe(200);
    const savedRoot = await putResponse.json();
    expect(savedRoot.currentWeek).toBe(2);
    expect(savedRoot.weeks['2']).toMatchObject({
      weekNumber: 2,
      teamStats: { totalValue: 12, totalPlayers: 1 }
    });

    const confirmResponse = await fetch(`${baseUrl}/root`);
    const confirmedRoot = await confirmResponse.json();
    expect(confirmedRoot.currentWeek).toBe(2);
    expect(Object.keys(confirmedRoot.weeks)).toContain('2');
  });

  test('week CRUD endpoints operate over HTTP', async () => {
    const postResponse = await fetch(`${baseUrl}/weeks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekNumber: 3,
        payload: {
          players: [{ id: 'p3', price: 8.5 }],
          teamStats: { totalValue: 8.5, totalPlayers: 1 }
        }
      })
    });

    expect(postResponse.status).toBe(201);
    const createdWeek = await postResponse.json();
    expect(createdWeek.weekNumber).toBe(3);

    const getResponse = await fetch(`${baseUrl}/weeks/3`);
    expect(getResponse.status).toBe(200);
    const fetchedWeek = await getResponse.json();
    expect(fetchedWeek.players).toEqual([{ id: 'p3', price: 8.5 }]);

    const listResponse = await fetch(`${baseUrl}/weeks`);
    const weeks = await listResponse.json();
    expect(Array.isArray(weeks)).toBe(true);
    expect(weeks.find((week) => week.weekNumber === 3)).toBeDefined();

    const deleteResponse = await fetch(`${baseUrl}/weeks/3`, {
      method: 'DELETE'
    });
    expect(deleteResponse.status).toBe(204);

    const missingResponse = await fetch(`${baseUrl}/weeks/3`);
    expect(missingResponse.status).toBe(404);
  });
});
