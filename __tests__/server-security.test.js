/**
 * @jest-environment node
 */

const request = require('supertest');

const { app } = require('../server/server');
const database = require('../server/database');
const { createCorsOptions, isLoopbackOrigin } = require('../server/security');

function resolveOrigin(origin, options = createCorsOptions()) {
  return new Promise((resolve, reject) => {
    options.origin(origin, (error, allowed) => {
      if (error) reject(error);
      else resolve(allowed);
    });
  });
}

describe('CORS configuration', () => {
  test('allows requests without an Origin header', async () => {
    await expect(resolveOrigin(undefined)).resolves.toBe(true);
  });

  test('allows loopback origins on any port', async () => {
    await expect(resolveOrigin('http://localhost:5500')).resolves.toBe(true);
    await expect(resolveOrigin('http://127.0.0.1:4000')).resolves.toBe(true);
  });

  test('rejects remote origins by default', async () => {
    await expect(resolveOrigin('https://evil.example.com')).resolves.toBe(false);
    await expect(resolveOrigin('http://localhost.evil.example.com')).resolves.toBe(false);
  });

  test('allows origins listed in ALLOWED_ORIGINS', async () => {
    const options = createCorsOptions({ ALLOWED_ORIGINS: 'https://fpl.example.com/, https://other.example.com' });

    await expect(resolveOrigin('https://fpl.example.com', options)).resolves.toBe(true);
    await expect(resolveOrigin('https://other.example.com', options)).resolves.toBe(true);
    await expect(resolveOrigin('https://evil.example.com', options)).resolves.toBe(false);
  });

  test('isLoopbackOrigin ignores non-http schemes and malformed values', () => {
    expect(isLoopbackOrigin('file://localhost')).toBe(false);
    expect(isLoopbackOrigin('not-a-url')).toBe(false);
  });
});

describe('Storage API request validation', () => {
  beforeEach(() => {
    database.configureDatabase({ fileName: ':memory:' });
    database.initializeSchema({ fileName: ':memory:' });
  });

  afterEach(() => {
    database.closeDatabase();
  });

  test('rejects array payloads on PUT /api/storage/root', async () => {
    const response = await request(app)
      .put('/api/storage/root')
      .send([{ version: '2.0' }])
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/plain object/i);
  });

  test('rejects non-object week payloads', async () => {
    const putResponse = await request(app)
      .put('/api/storage/weeks/1')
      .send([{ weekNumber: 1 }])
      .set('Content-Type', 'application/json');

    expect(putResponse.status).toBe(400);
    expect(putResponse.body.message).toMatch(/plain object/i);

    const postResponse = await request(app)
      .post('/api/storage/weeks')
      .send({ weekNumber: 2, payload: 'not-a-week' })
      .set('Content-Type', 'application/json');

    expect(postResponse.status).toBe(400);
    expect(postResponse.body.message).toMatch(/plain object/i);
  });

  test('POST /api/storage/weeks still defaults a missing payload', async () => {
    const response = await request(app)
      .post('/api/storage/weeks')
      .send({ weekNumber: 4 })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ weekNumber: 4, players: [] });
  });

  test('does not expose x-powered-by header', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Storage API error responses', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    database.configureDatabase({ fileName: ':memory:' });
    database.initializeSchema({ fileName: ':memory:' });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    database.closeDatabase();
    jest.restoreAllMocks();
  });

  test('hides internal error details in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(database, 'getRootData').mockImplementation(() => {
      throw new Error('SQLITE_CANTOPEN: /secret/path/fpl_data.db');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(app).get('/api/storage/root');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });
});
