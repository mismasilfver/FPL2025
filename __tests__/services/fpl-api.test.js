import { FplApiClient, mapFplPosition, mapFplTeam, normalizePlayer, getCurrentGameweek } from '../../js/services/fpl-api.js';

describe('FplApiClient', () => {
  let client;

  beforeEach(() => {
    client = new FplApiClient();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('fetchBootstrap', () => {
    it('should fetch and return bootstrap data', async () => {
      const mockData = { elements: [], teams: [], events: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockData),
      });

      const result = await client.fetchBootstrap();

      expect(fetch).toHaveBeenCalledWith('/api/fpl/bootstrap-static');
      expect(result).toEqual(mockData);
    });

    it('should throw an error if the fetch fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.fetchBootstrap()).rejects.toThrow('Failed to fetch FPL bootstrap data');
    });

    it('should throw an error if the network fails', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.fetchBootstrap()).rejects.toThrow('Network error');
    });
  });

  describe('fetchEntryPicks', () => {
    it('should fetch picks for a valid entry and gameweek', async () => {
      const mockData = {
        entry_history: { points: 50 },
        picks: [{ element: 1, position: 1, is_captain: true, is_vice_captain: false }],
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockData),
      });

      const result = await client.fetchEntryPicks(123, 1);

      expect(fetch).toHaveBeenCalledWith('/api/fpl/entry/123/event/1/picks');
      expect(result).toEqual(mockData);
    });

    it('should throw an error for non-ok response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(client.fetchEntryPicks(123, 1)).rejects.toThrow('Failed to fetch FPL entry picks');
    });
  });
});

describe('mapFplPosition', () => {
  it('should map FPL element type 1 to goalkeeper', () => {
    expect(mapFplPosition(1)).toBe('goalkeeper');
  });

  it('should map FPL element type 2 to defence', () => {
    expect(mapFplPosition(2)).toBe('defence');
  });

  it('should map FPL element type 3 to midfield', () => {
    expect(mapFplPosition(3)).toBe('midfield');
  });

  it('should map FPL element type 4 to forward', () => {
    expect(mapFplPosition(4)).toBe('forward');
  });

  it('should throw for unknown element type', () => {
    expect(() => mapFplPosition(99)).toThrow('Unknown FPL element type: 99');
  });
});

describe('mapFplTeam', () => {
  it('should map FPL team id to team name', () => {
    const teams = [
      { id: 1, name: 'Arsenal' },
      { id: 2, name: 'Aston Villa' },
    ];

    expect(mapFplTeam(1, teams)).toBe('Arsenal');
    expect(mapFplTeam(2, teams)).toBe('Aston Villa');
  });

  it('should return unknown string for missing team', () => {
    const teams = [{ id: 1, name: 'Arsenal' }];

    expect(mapFplTeam(99, teams)).toBe('Unknown');
  });
});

describe('normalizePlayer', () => {
  it('should normalize an FPL element to app player shape', () => {
    const element = {
      id: 1,
      web_name: 'Raya',
      first_name: 'David',
      second_name: 'Raya',
      element_type: 1,
      team: 1,
      now_cost: 60,
      total_points: 162,
      event_points: 0,
      form: '0.0',
      status: 'a',
      chance_of_playing_next_round: null,
    };
    const teams = [{ id: 1, name: 'Arsenal' }];
    const elementTypes = [
      { id: 1, singular_name_short: 'GKP' },
    ];

    const player = normalizePlayer(element, teams, elementTypes);

    expect(player).toMatchObject({
      fplId: '1',
      name: 'Raya',
      firstName: 'David',
      lastName: 'Raya',
      position: 'goalkeeper',
      team: 'Arsenal',
      price: 6.0,
      nowCostTenths: 60,
      totalPoints: 162,
      eventPoints: 0,
      form: 0,
      status: 'a',
      availability: 'available',
    });
  });

  it('should calculate price correctly for values in tenths of million', () => {
    const element = {
      id: 100,
      web_name: 'Haaland',
      element_type: 4,
      team: 2,
      now_cost: 125,
    };
    const teams = [{ id: 2, name: 'Man City' }];

    const player = normalizePlayer(element, teams, []);

    expect(player.price).toBe(12.5);
  });
});

describe('getCurrentGameweek', () => {
  it('returns the id of the event marked is_current', () => {
    const bootstrap = {
      events: [
        { id: 1, is_current: false, is_next: false, finished: true },
        { id: 2, is_current: true, is_next: false, finished: false },
        { id: 3, is_current: false, is_next: true, finished: false },
      ],
    };

    expect(getCurrentGameweek(bootstrap)).toBe(2);
  });

  it('falls back to is_next when no event is current (e.g. pre-season)', () => {
    const bootstrap = {
      events: [
        { id: 1, is_current: false, is_next: true, finished: false },
        { id: 2, is_current: false, is_next: false, finished: false },
      ],
    };

    expect(getCurrentGameweek(bootstrap)).toBe(1);
  });

  it('falls back to the last event when neither is_current nor is_next is set', () => {
    const bootstrap = {
      events: [
        { id: 1, is_current: false, is_next: false, finished: true },
        { id: 2, is_current: false, is_next: false, finished: true },
      ],
    };

    expect(getCurrentGameweek(bootstrap)).toBe(2);
  });

  it('falls back to 1 when there are no events', () => {
    expect(getCurrentGameweek({ events: [] })).toBe(1);
    expect(getCurrentGameweek({})).toBe(1);
  });
});