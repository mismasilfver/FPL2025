/**
 * @jest-environment node
 */

const request = require('supertest');

const { app } = require('../server/server');

describe('FPL proxy API', () => {
  const originalFetch = global.fetch;

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
