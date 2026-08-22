import { FPLTeamManager } from '../script.js';
import { FplApiClient } from '../js/services/fpl-api.js';
import { WeekModel } from '../js/models/week-model.js';

const STORAGE_KEY = 'fpl-team-data';

function createUiStub() {
  return {
    initElements: jest.fn(),
    showAlert: jest.fn(),
    bindEvents: jest.fn(),
    renderPlayers: jest.fn(),
    renderSummary: jest.fn(),
    renderFplEntryId: jest.fn(),
    renderTeamSelector: jest.fn(),
    renderCaptaincyInfo: jest.fn(),
    renderWeekControls: jest.fn(),
    positionFilter: { value: 'all' },
    haveFilter: { checked: false },
  };
}

function createBootstrap(elements = []) {
  return {
    elements,
    teams: [
      { id: 1, name: 'Arsenal' },
      { id: 2, name: 'Man City' },
    ],
    element_types: [
      { id: 1, singular_name_short: 'GKP' },
      { id: 2, singular_name_short: 'DEF' },
      { id: 3, singular_name_short: 'MID' },
      { id: 4, singular_name_short: 'FWD' },
    ],
  };
}

function createPlayer(id, fplId, overrides = {}) {
  return {
    id,
    name: `Player ${id}`,
    fplId,
    position: 'midfield',
    team: 'Arsenal',
    price: 5.0,
    have: true,
    eventPoints: 0,
    totalPoints: 0,
    form: 0,
    ...overrides,
  };
}

function createRoot(teams, currentTeam = 'default') {
  return {
    version: '3.1',
    settings: { fplEntryId: null },
    currentTeam,
    teams,
  };
}

function createTeam(id, name, players, overrides = {}) {
  const defaultWeek = WeekModel.createDefault(1);
  return {
    id,
    name,
    type: id === 'default' ? 'primary' : 'whatif',
    fplEntryId: null,
    currentWeek: 1,
    weeks: { 1: { ...defaultWeek, players, captain: overrides.captain ?? null, viceCaptain: overrides.viceCaptain ?? null } },
    totalPoints: 0,
    gameweekPoints: {},
    ...overrides,
  };
}

async function createManager(root) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  const ui = createUiStub();
  const manager = new FPLTeamManager({ ui, storage: undefined });
  await manager._storageReady;
  return manager;
}

function mockFetchForBootstrap(data) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(data),
  });
}

describe('SYNC flow integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('updates player points and metadata from the FPL bootstrap', async () => {
    const players = [createPlayer('p1', '1'), createPlayer('p2', '2', { have: false })];
    const root = createRoot({ default: createTeam('default', 'Primary', players) });
    const manager = await createManager(root);

    const bootstrap = createBootstrap([
      { id: 1, web_name: 'Raya', first_name: 'David', second_name: 'Raya', element_type: 1, team: 1, now_cost: 60, total_points: 162, event_points: 6, form: '2.0', status: 'a', chance_of_playing_next_round: null },
      { id: 2, web_name: 'Haaland', first_name: 'Erling', second_name: 'Haaland', element_type: 4, team: 2, now_cost: 125, total_points: 210, event_points: 13, form: '8.5', status: 'a', chance_of_playing_next_round: null },
    ]);

    manager.fplApiClient = new FplApiClient({ fetchImpl: mockFetchForBootstrap(bootstrap) });

    await manager.syncFromFpl();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const activeWeek = stored.teams.default.weeks[1];
    const updatedP1 = activeWeek.players.find((p) => p.id === 'p1');
    const updatedP2 = activeWeek.players.find((p) => p.id === 'p2');

    expect(updatedP1.eventPoints).toBe(6);
    expect(updatedP1.totalPoints).toBe(162);
    expect(updatedP1.price).toBe(6.0);
    expect(updatedP1.form).toBe(2.0);
    expect(updatedP2.eventPoints).toBe(13);
    expect(updatedP2.totalPoints).toBe(210);
    expect(updatedP2.price).toBe(12.5);

    expect(stored.teams.default.gameweekPoints[1]).toBe(6);
    expect(stored.teams.default.totalPoints).toBe(6);
  });

  it('doubles captain points when the captain played', async () => {
    const players = [
      createPlayer('cap', '10', { eventPoints: 5 }),
      createPlayer('other', '11', { eventPoints: 3 }),
    ];
    const team = createTeam('default', 'Primary', players);
    team.weeks[1].captain = 'cap';
    const root = createRoot({ default: team });
    const manager = await createManager(root);

    const bootstrap = createBootstrap([
      { id: 10, web_name: 'Cap', element_type: 3, team: 1, now_cost: 80, total_points: 50, event_points: 5, form: '1.0', status: 'a', chance_of_playing_next_round: null },
      { id: 11, web_name: 'Other', element_type: 3, team: 1, now_cost: 70, total_points: 30, event_points: 3, form: '1.0', status: 'a', chance_of_playing_next_round: null },
    ]);
    manager.fplApiClient = new FplApiClient({ fetchImpl: mockFetchForBootstrap(bootstrap) });

    await manager.syncFromFpl();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.teams.default.gameweekPoints[1]).toBe(13);
  });

  it('doubles vice-captain points when the captain is not in the team', async () => {
    const players = [
      createPlayer('vice', '20', { eventPoints: 8 }),
      createPlayer('other', '21', { eventPoints: 2 }),
    ];
    const team = createTeam('default', 'Primary', players);
    team.weeks[1].captain = 'missing';
    team.weeks[1].viceCaptain = 'vice';
    const root = createRoot({ default: team });
    const manager = await createManager(root);

    const bootstrap = createBootstrap([
      { id: 20, web_name: 'Vice', element_type: 3, team: 1, now_cost: 90, total_points: 80, event_points: 8, form: '2.0', status: 'a', chance_of_playing_next_round: null },
      { id: 21, web_name: 'Other', element_type: 3, team: 1, now_cost: 60, total_points: 20, event_points: 2, form: '1.0', status: 'a', chance_of_playing_next_round: null },
    ]);
    manager.fplApiClient = new FplApiClient({ fetchImpl: mockFetchForBootstrap(bootstrap) });

    await manager.syncFromFpl();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.teams.default.gameweekPoints[1]).toBe(18);
  });

  it('only updates the active team when multiple teams exist', async () => {
    const activePlayers = [createPlayer('p1', '1', { eventPoints: 0 })];
    const otherPlayers = [createPlayer('p1', '1', { eventPoints: 0 })];

    const root = createRoot({
      default: createTeam('default', 'Primary', activePlayers),
      other: createTeam('other', 'Other', otherPlayers),
    }, 'default');

    const manager = await createManager(root);

    const bootstrap = createBootstrap([
      { id: 1, web_name: 'Saka', first_name: 'Bukayo', second_name: 'Saka', element_type: 3, team: 1, now_cost: 100, total_points: 100, event_points: 10, form: '5.0', status: 'a', chance_of_playing_next_round: null },
    ]);
    manager.fplApiClient = new FplApiClient({ fetchImpl: mockFetchForBootstrap(bootstrap) });

    await manager.syncFromFpl();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.teams.default.weeks[1].players[0].eventPoints).toBe(10);
    expect(stored.teams.default.gameweekPoints[1]).toBe(10);
    expect(stored.teams.other.weeks[1].players[0].eventPoints).toBe(0);
    expect(stored.teams.other.gameweekPoints[1]).toBeUndefined();
  });

  it('shows an alert when the FPL fetch fails', async () => {
    const players = [createPlayer('p1', '1')];
    const root = createRoot({ default: createTeam('default', 'Primary', players) });
    const manager = await createManager(root);

    const failingFetch = jest.fn().mockRejectedValue(new Error('Network error'));
    manager.fplApiClient = new FplApiClient({ fetchImpl: failingFetch });

    await manager.syncFromFpl();

    expect(manager.ui.showAlert).toHaveBeenLastCalledWith(expect.stringContaining('SYNC failed'));
    expect(manager.ui.showAlert).toHaveBeenLastCalledWith(expect.stringContaining('Network error'));
  });
});
