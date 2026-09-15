/**
 * @jest-environment node
 */

const request = require('supertest');

const { app } = require('../server/server');
const fplRouter = require('../server/routes/fpl');

describe('FPL proxy API', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    fplRouter.clearBootstrapCache?.();
    if (fplRouter.bootstrapCache) {
      fplRouter.bootstrapCache.ttlMs = 300000;
    }
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('GET /api/fpl/bootstrap-static', () => {
    test('proxies a successful response from the FPL API', async () => {
      const mockData = { elements: [{ id: 1, web_name: 'Raya' }], teams: [], element_types: [] };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const response = await request(app).get('/api/fpl/bootstrap-static');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://fantasy.premierleague.com/api/bootstrap-static/',
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    test('forwards a non-ok status from the FPL API', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      const response = await request(app).get('/api/fpl/bootstrap-static');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({ error: expect.any(String) });
    });

    test('returns 500 when the upstream fetch throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

      const response = await request(app).get('/api/fpl/bootstrap-static');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({ error: expect.any(String) });
    });

    test('caches a successful bootstrap-static response within the TTL', async () => {
      const mockData = { elements: [{ id: 1 }], teams: [], element_types: [], events: [] };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const first = await request(app).get('/api/fpl/bootstrap-static');
      const second = await request(app).get('/api/fpl/bootstrap-static');

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body).toEqual(mockData);
      expect(second.body).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('refetches bootstrap-static after the TTL expires', async () => {
      const cachedData = { elements: [{ id: 1 }], teams: [], element_types: [], events: [] };
      const freshData = { elements: [{ id: 2 }], teams: [], element_types: [], events: [] };

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(cachedData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(freshData),
        });

      await request(app).get('/api/fpl/bootstrap-static');
      fplRouter.bootstrapCache.ttlMs = -1;

      const response = await request(app).get('/api/fpl/bootstrap-static');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(freshData);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('does not cache a failed upstream bootstrap-static response', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ elements: [] }),
        });

      const first = await request(app).get('/api/fpl/bootstrap-static');
      const second = await request(app).get('/api/fpl/bootstrap-static');

      expect(first.status).toBe(503);
      expect(second.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /api/fpl/entry/:entryId/event/:gameweek/picks', () => {
    test('proxies a successful response from the FPL API', async () => {
      const mockData = { picks: [{ element: 1, is_captain: true }] };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const response = await request(app).get('/api/fpl/entry/1865916/event/1/picks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://fantasy.premierleague.com/api/entry/1865916/event/1/picks/',
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    test('rejects non-numeric entryId/gameweek without calling upstream', async () => {
      global.fetch = jest.fn();

      const response = await request(app).get('/api/fpl/entry/abc/event/1/picks');

      expect(response.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('forwards a non-ok status from the FPL API', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      const response = await request(app).get('/api/fpl/entry/1865916/event/1/picks');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ error: expect.any(String) });
    });
  });
});
