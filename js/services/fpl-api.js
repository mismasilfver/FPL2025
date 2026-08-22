// Requests go through this app's own server-side proxy (see
// server/routes/fpl.js) rather than fantasy.premierleague.com directly.
// The FPL API does not send Access-Control-Allow-Origin headers, so a
// direct browser fetch from the app's origin is blocked by CORS.
const FPL_BOOTSTRAP_URL = '/api/fpl/bootstrap-static';

function getEntryPicksUrl(entryId, gameweek) {
  return `/api/fpl/entry/${entryId}/event/${gameweek}/picks`;
}

/**
 * Client for the Fantasy Premier League public API.
 */
export class FplApiClient {
  constructor({ fetchImpl } = {}) {
    this._fetchImpl = fetchImpl;
  }

  _getFetch() {
    if (this._fetchImpl) {
      return this._fetchImpl;
    }
    if (typeof fetch !== 'undefined') {
      return fetch;
    }
    return null;
  }

  /**
   * Fetch the FPL bootstrap-static data.
   * Contains players, teams, element types, and events.
   * @returns {Promise<object>} Raw FPL bootstrap data
   */
  async fetchBootstrap() {
    return this._getJson(FPL_BOOTSTRAP_URL, 'Failed to fetch FPL bootstrap data');
  }

  /**
   * Fetch picks for a specific entry and gameweek.
   * @param {number|string} entryId - FPL manager/entry ID
   * @param {number} gameweek - Gameweek number
   * @returns {Promise<object>} Picks data including entry_history and picks
   */
  async fetchEntryPicks(entryId, gameweek) {
    const url = getEntryPicksUrl(entryId, gameweek);
    return this._getJson(url, 'Failed to fetch FPL entry picks');
  }

  async _getJson(url, errorMessage) {
    const fetchToUse = this._getFetch();
    if (!fetchToUse) {
      throw new Error('Fetch implementation not available');
    }

    let response;
    try {
      response = await fetchToUse(url);
    } catch (error) {
      throw error;
    }

    if (!response.ok) {
      throw new Error(`${errorMessage}: ${response.status} ${response.statusText}`.trim());
    }

    return response.json();
  }
}

/**
 * Map an FPL element type id to the app's position string.
 * @param {number} elementTypeId
 * @returns {string}
 */
export function mapFplPosition(elementTypeId) {
  switch (elementTypeId) {
    case 1:
      return 'goalkeeper';
    case 2:
      return 'defence';
    case 3:
      return 'midfield';
    case 4:
      return 'forward';
    default:
      throw new Error(`Unknown FPL element type: ${elementTypeId}`);
  }
}

/**
 * Map an FPL team id to the team name.
 * @param {number} teamId
 * @param {Array<object>} teams - List of FPL teams
 * @returns {string}
 */
export function mapFplTeam(teamId, teams) {
  const team = Array.isArray(teams) ? teams.find((t) => t.id === teamId) : null;
  return team ? team.name : 'Unknown';
}

/**
 * Map FPL player availability status to a human-readable string.
 * @param {string} status
 * @param {number|null} chanceOfPlaying
 * @returns {string}
 */
function mapAvailability(status, chanceOfPlaying) {
  if (chanceOfPlaying !== null && chanceOfPlaying !== undefined && chanceOfPlaying < 100) {
    return 'doubt';
  }
  switch (status) {
    case 'a':
      return 'available';
    case 'd':
      return 'doubt';
    case 'i':
      return 'injured';
    case 's':
      return 'suspended';
    case 'u':
      return 'unavailable';
    default:
      return 'unknown';
  }
}

/**
 * Normalize an FPL player element to the application's player shape.
 * @param {object} element - Raw FPL player element
 * @param {Array<object>} teams - FPL teams list
 * @param {Array<object>} [elementTypes] - FPL element types (optional, for future use)
 * @returns {object} Normalized player
 */
export function normalizePlayer(element, teams, elementTypes = []) {
  if (!element || typeof element !== 'object') {
    throw new Error('Invalid FPL player element');
  }

  const nowCostTenths = Number(element.now_cost) || 0;

  return {
    fplId: String(element.id),
    name: element.web_name || `${element.first_name || ''} ${element.second_name || ''}`.trim(),
    firstName: element.first_name || '',
    lastName: element.second_name || '',
    position: mapFplPosition(element.element_type),
    team: mapFplTeam(element.team, teams),
    price: nowCostTenths / 10,
    nowCostTenths,
    totalPoints: Number(element.total_points) || 0,
    eventPoints: Number(element.event_points) || 0,
    form: Number(element.form) || 0,
    status: element.status || 'u',
    availability: mapAvailability(element.status, element.chance_of_playing_next_round),
    news: element.news || '',
  };
}

/**
 * Determine the current gameweek from FPL bootstrap data.
 * @param {object} bootstrap - Raw FPL bootstrap data (with an `events` array)
 * @returns {number} The current gameweek id, falling back sensibly if none is marked current
 */
export function getCurrentGameweek(bootstrap) {
  const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
  if (events.length === 0) return 1;

  const current = events.find((event) => event.is_current);
  if (current) return current.id;

  const next = events.find((event) => event.is_next);
  if (next) return next.id;

  return events[events.length - 1].id;
}

export default FplApiClient;
