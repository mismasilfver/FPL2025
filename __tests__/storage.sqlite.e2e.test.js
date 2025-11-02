/**
 * @jest-environment node
 */

const { startServer } = require('../server/server');
const database = require('../server/database');

const waitForEvent = (emitter, event) =>
  new Promise((resolve, reject) => {
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onEvent = (...args) => {
      cleanup();
      resolve(...args);
    };

    const cleanup = () => {
      emitter.removeListener(event, onEvent);
      emitter.removeListener('error', onError);
    };

    emitter.once(event, onEvent);
    emitter.once('error', onError);
  });

describe('SQLite storage server end-to-end', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = startServer(0, { fileName: ':memory:' });
    await waitForEvent(server, 'listening');
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    database.closeDatabase();
  });

  test('initial root payload is returned and can be updated', async () => {
    const rootResponse = await fetch(`${baseUrl}/api/storage/root`);
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

    const putResponse = await fetch(`${baseUrl}/api/storage/root`, {
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

    const confirmResponse = await fetch(`${baseUrl}/api/storage/root`);
    const confirmedRoot = await confirmResponse.json();
    expect(confirmedRoot.currentWeek).toBe(2);
    expect(Object.keys(confirmedRoot.weeks)).toContain('2');
  });

  test('week CRUD endpoints operate over HTTP', async () => {
    const postResponse = await fetch(`${baseUrl}/api/storage/weeks`, {
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

    const getResponse = await fetch(`${baseUrl}/api/storage/weeks/3`);
    expect(getResponse.status).toBe(200);
    const fetchedWeek = await getResponse.json();
    expect(fetchedWeek.players).toEqual([{ id: 'p3', price: 8.5 }]);

    const listResponse = await fetch(`${baseUrl}/api/storage/weeks`);
    const weeks = await listResponse.json();
    expect(Array.isArray(weeks)).toBe(true);
    expect(weeks.find((week) => week.weekNumber === 3)).toBeDefined();

    const deleteResponse = await fetch(`${baseUrl}/api/storage/weeks/3`, {
      method: 'DELETE'
    });
    expect(deleteResponse.status).toBe(204);

    const missingResponse = await fetch(`${baseUrl}/api/storage/weeks/3`);
    expect(missingResponse.status).toBe(404);
  });
});
