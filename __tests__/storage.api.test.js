/**
 * @jest-environment node
 */

const request = require('supertest');

const { app } = require('../server/server');
const database = require('../server/database');

const {
  configureDatabase,
  initializeSchema,
  closeDatabase,
  createDefaultWeek,
  saveWeek,
  getWeek
} = database;

describe('Storage API happy path scenarios', () => {
  beforeEach(() => {
    configureDatabase({ fileName: ':memory:' });
    initializeSchema({ fileName: ':memory:' });
  });

  afterEach(() => {
    closeDatabase();
  });

  test('GET /api/storage/root returns default structure', async () => {
    const response = await request(app).get('/api/storage/root');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      version: '2.0',
      currentWeek: 1
    });

    const firstWeek = response.body.weeks['1'] || response.body.weeks[1];
    expect(firstWeek).toMatchObject({
      weekNumber: 1,
      players: [],
      teamStats: {
        totalValue: 0,
        totalPlayers: 0
      }
    });
  });

  test('PUT /api/storage/root persists and normalizes payload', async () => {
    const payload = {
      version: '2.0',
      currentWeek: 3,
      weeks: {
        1: createDefaultWeek(1),
        '2': {
          weekNumber: 2,
          players: [{ id: 'p2' }],
          teamMembers: [{ playerId: 'p2', addedAt: 1 }],
          teamStats: { totalValue: 12.5, totalPlayers: 2 }
        }
      }
    };

    const putResponse = await request(app)
      .put('/api/storage/root')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(putResponse.status).toBe(200);
    expect(putResponse.body.currentWeek).toBe(3);
    expect(putResponse.body.weeks['2'].teamStats.totalValue).toBe(12.5);

    const getResponse = await request(app).get('/api/storage/root');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.currentWeek).toBe(3);
    expect(getResponse.body.weeks['2'].teamMembers).toHaveLength(1);
  });

  test('GET /api/storage/weeks lists snapshots in order', async () => {
    saveWeek(2, {
      ...createDefaultWeek(2),
      teamStats: { totalValue: 14, totalPlayers: 2 }
    });

    const response = await request(app).get('/api/storage/weeks');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
    expect(response.body[0]).toHaveProperty('weekNumber');
  });

  test('GET /api/storage/weeks/:weekNumber returns a single week', async () => {
    saveWeek(2, {
      ...createDefaultWeek(2),
      players: [{ id: 'p2' }]
    });

    const response = await request(app).get('/api/storage/weeks/2');

    expect(response.status).toBe(200);
    expect(response.body.weekNumber).toBe(2);
    expect(response.body.players).toEqual([{ id: 'p2' }]);
  });

  test('POST /api/storage/weeks creates a new week', async () => {
    const response = await request(app)
      .post('/api/storage/weeks')
      .send({
        weekNumber: 4,
        payload: {
          players: [{ id: 'p4' }],
          teamStats: { totalValue: 15, totalPlayers: 2 }
        }
      })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body.weekNumber).toBe(4);

    const stored = getWeek(4);
    expect(stored.teamStats.totalValue).toBe(15);
  });

  test('PUT /api/storage/weeks/:weekNumber updates an existing week', async () => {
    saveWeek(4, {
      ...createDefaultWeek(4),
      players: [{ id: 'p4' }]
    });

    const updateResponse = await request(app)
      .put('/api/storage/weeks/4')
      .send({
        players: [{ id: 'p4', position: 'midfield' }],
        teamStats: { totalValue: 16, totalPlayers: 2 }
      })
      .set('Content-Type', 'application/json');

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.teamStats.totalValue).toBe(16);

    const stored = getWeek(4);
    expect(stored.players[0]).toMatchObject({ id: 'p4', position: 'midfield' });
  });

  test('DELETE /api/storage/weeks/:weekNumber removes a week', async () => {
    saveWeek(5, {
      ...createDefaultWeek(5),
      players: [{ id: 'p5' }]
    });

    const deleteResponse = await request(app).delete('/api/storage/weeks/5');
    expect(deleteResponse.status).toBe(204);

    const fetchResponse = await request(app).get('/api/storage/weeks/5');
    expect(fetchResponse.status).toBe(404);
  });

  test('PUT /api/storage/root rejects non-object payloads', async () => {
    const response = await request(app)
      .put('/api/storage/root')
      .send(['not', 'an', 'object'])
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/plain object/i);
  });

  test('GET /api/storage/weeks/:weekNumber rejects invalid week numbers', async () => {
    const response = await request(app).get('/api/storage/weeks/abc');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/positive integer/i);
  });

  test('POST /api/storage/weeks requires valid weekNumber', async () => {
    const missingResponse = await request(app)
      .post('/api/storage/weeks')
      .send({})
      .set('Content-Type', 'application/json');

    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body.message).toMatch(/positive integer/i);

    const invalidResponse = await request(app)
      .post('/api/storage/weeks')
      .send({ weekNumber: 0 })
      .set('Content-Type', 'application/json');

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.message).toMatch(/positive integer/i);
  });

  test('DELETE /api/storage/weeks/:weekNumber returns 404 when missing', async () => {
    const response = await request(app).delete('/api/storage/weeks/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/Week not found/);
  });

  test('GET /api/storage/root responds with 500 on internal error', async () => {
    const spy = jest.spyOn(database, 'getRootData').mockImplementation(() => {
      throw new Error('boom');
    });

    const response = await request(app).get('/api/storage/root');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(response.body.details).toBe('boom');

    spy.mockRestore();
  });
});
