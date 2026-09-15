/**
 * FPL SYNC and multi-team E2E tests
 * Verifies FPL ID saving, SYNC point updates, and team switching isolation.
 */

import { test, expect } from '@playwright/test';
import { clearStorage, waitForStorageReady } from '../helpers/storage-helpers.js';
import { openAdvancedPanel } from '../helpers/ui-helpers.js';

const STORAGE_KEY = 'fpl-team-data';
// The client fetches this via the app's own server-side proxy (server/routes/fpl.js)
// rather than fantasy.premierleague.com directly, to avoid a CORS block in real browsers.
const FPL_BOOTSTRAP_URL = '**/api/fpl/bootstrap-static';

function createPlayer(id, name, fplId, overrides = {}) {
  return {
    id,
    name,
    fplId,
    position: 'midfield',
    team: 'Arsenal',
    price: 5.0,
    have: true,
    status: '',
    notes: '',
    eventPoints: 0,
    totalPoints: 0,
    form: 0,
    availability: 'unknown',
    ...overrides,
  };
}

function createWeek(players, overrides = {}) {
  return {
    weekNumber: 1,
    players,
    captain: null,
    viceCaptain: null,
    teamMembers: players.filter((p) => p.have).map((p) => ({ addedAt: 1, playerId: p.id })),
    teamStats: { totalValue: players.filter((p) => p.have).reduce((s, p) => s + p.price, 0), playerCount: players.filter((p) => p.have).length, updatedDate: new Date().toISOString() },
    totalTeamCost: players.filter((p) => p.have).reduce((s, p) => s + p.price, 0),
    isReadOnly: false,
    notes: '',
    ...overrides,
  };
}

function createTeam(id, name, players) {
  return {
    id,
    name,
    type: id === 'default' ? 'primary' : 'whatif',
    fplEntryId: null,
    currentWeek: 1,
    weeks: { 1: createWeek(players) },
    totalPoints: 0,
    gameweekPoints: {},
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

async function seedRoot(page, root) {
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: root });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await waitForStorageReady(page);
}

function bootstrapFixture(elements) {
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
    events: [
      { id: 1, is_current: false, is_next: false },
      { id: 5, is_current: true, is_next: false },
    ],
  };
}

function createFplElement(id, name, elementType, team, nowCost, overrides = {}) {
  return {
    id,
    web_name: name,
    first_name: 'FPL',
    second_name: name,
    element_type: elementType,
    team,
    now_cost: nowCost,
    total_points: id * 10,
    event_points: id,
    form: '5.0',
    status: 'a',
    chance_of_playing_next_round: null,
    ...overrides,
  };
}

function createEntryPicksFixture(elements, { captainId, viceCaptainId }) {
  return {
    picks: elements.map((el, index) => ({
      element: el.id,
      position: index + 1,
      is_captain: el.id === captainId,
      is_vice_captain: el.id === viceCaptainId,
      multiplier: el.id === captainId ? 2 : 1,
    })),
  };
}

function buildImportSquad() {
  const elements = [];
  for (let i = 1; i <= 2; i++) {
    elements.push(createFplElement(i, `Keeper ${i}`, 1, 1, 50));
  }
  for (let i = 3; i <= 7; i++) {
    elements.push(createFplElement(i, `Defender ${i}`, 2, i % 2 === 0 ? 1 : 2, 55));
  }
  for (let i = 8; i <= 12; i++) {
    elements.push(createFplElement(i, `Midfielder ${i}`, 3, i % 2 === 0 ? 2 : 1, 85));
  }
  for (let i = 13; i <= 15; i++) {
    elements.push(createFplElement(i, `Forward ${i}`, 4, i % 2 === 0 ? 2 : 1, 105));
  }
  return elements;
}

test.describe('FPL sync and multi-team workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await clearStorage(page);
    await page.evaluate(() => localStorage.setItem('fpl-storage-backend', 'localstorage'));
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await waitForStorageReady(page);
  });

  test('saves FPL entry ID and persists it across reloads', async ({ page }) => {
    await openAdvancedPanel(page);
    await page.fill('[data-testid="fpl-entry-id"]', '12345');
    await page.click('[data-testid="save-fpl-id-btn"]');

    await expect(page.locator('[role="alert"]')).toContainText('FPL entry ID saved: 12345');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForStorageReady(page);
    await openAdvancedPanel(page);

    await expect(page.locator('[data-testid="fpl-entry-id"]')).toHaveValue('12345');
  });

  test('SYNC updates player points from the FPL bootstrap', async ({ page }) => {
    const root = createRoot({
      default: createTeam('default', 'Primary', [
        createPlayer('p1', 'Raya', '1', { position: 'goalkeeper' }),
        createPlayer('p2', 'Haaland', '2', { position: 'forward' }),
      ]),
    });
    await seedRoot(page, root);
    await openAdvancedPanel(page);

    await page.route(FPL_BOOTSTRAP_URL, async (route) => {
      const body = bootstrapFixture([
        { id: 1, web_name: 'Raya', first_name: 'David', second_name: 'Raya', element_type: 1, team: 1, now_cost: 60, total_points: 162, event_points: 6, form: '2.0', status: 'a', chance_of_playing_next_round: null },
        { id: 2, web_name: 'Haaland', first_name: 'Erling', second_name: 'Haaland', element_type: 4, team: 2, now_cost: 125, total_points: 210, event_points: 13, form: '8.5', status: 'a', chance_of_playing_next_round: null },
      ]);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.click('[data-testid="sync-btn"]');

    await expect(page.locator('[role="alert"]')).toContainText('Sync complete');
    await expect(page.locator('#total-points-display')).toHaveText('19');
    await expect(page.locator('#gw-points-display')).toHaveText('19');

    const rayaRow = page.locator('#players-tbody tr.player-row', { hasText: 'Raya' });
    await expect(rayaRow.locator('.col-total-points')).toHaveText('162');
    await expect(rayaRow.locator('.col-gw-points')).toHaveText('6');

    const haalandRow = page.locator('#players-tbody tr.player-row', { hasText: 'Haaland' });
    await expect(haalandRow.locator('.col-total-points')).toHaveText('210');
    await expect(haalandRow.locator('.col-gw-points')).toHaveText('13');
  });

  test('doubles captain points after SYNC', async ({ page }) => {
    const team = createTeam('default', 'Primary', [
      createPlayer('p1', 'Raya', '1', { position: 'goalkeeper' }),
      createPlayer('p2', 'Haaland', '2', { position: 'forward' }),
    ]);
    team.weeks[1].captain = 'p1';
    const root = createRoot({ default: team });
    await seedRoot(page, root);
    await openAdvancedPanel(page);

    await page.route(FPL_BOOTSTRAP_URL, async (route) => {
      const body = bootstrapFixture([
        { id: 1, web_name: 'Raya', first_name: 'David', second_name: 'Raya', element_type: 1, team: 1, now_cost: 60, total_points: 162, event_points: 6, form: '2.0', status: 'a', chance_of_playing_next_round: null },
        { id: 2, web_name: 'Haaland', first_name: 'Erling', second_name: 'Haaland', element_type: 4, team: 2, now_cost: 125, total_points: 210, event_points: 13, form: '8.5', status: 'a', chance_of_playing_next_round: null },
      ]);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.click('[data-testid="sync-btn"]');

    await expect(page.locator('[role="alert"]')).toContainText('Sync complete');
    await expect(page.locator('#gw-points-display')).toHaveText('25');
  });

  test('switches between teams without mixing players', async ({ page }) => {
    const root = createRoot({
      default: createTeam('default', 'Primary', [createPlayer('p1', 'Raya', '1')]),
      other: createTeam('other', 'Wildcard', [createPlayer('p2', 'Haaland', '2')]),
    });
    await seedRoot(page, root);

    await expect(page.locator('#players-tbody')).toContainText('Raya');
    await expect(page.locator('#players-tbody')).not.toContainText('Haaland');

    await page.selectOption('[data-testid="team-select"]', 'other');

    await expect(page.locator('#players-tbody')).toContainText('Haaland');
    await expect(page.locator('#players-tbody')).not.toContainText('Raya');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForStorageReady(page);

    await expect(page.locator('[data-testid="team-select"]')).toHaveValue('other');
    await expect(page.locator('#players-tbody')).toContainText('Haaland');
  });

  test('creates a new what-if team via the UI', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('Wildcard');
    });

    await page.click('[data-testid="add-team-btn"]');

    const teamSelect = page.locator('[data-testid="team-select"]');
    await expect(teamSelect).toContainText('Wildcard');
    await expect(teamSelect).toHaveValue('wildcard');
  });

  test('imports a real FPL squad into the primary team', async ({ page }) => {
    const root = createRoot({
      default: createTeam('default', 'Primary', [
        createPlayer('old-1', 'Old Player', '999', { position: 'midfield' }),
      ]),
    });
    await seedRoot(page, root);
    await openAdvancedPanel(page);

    await page.fill('[data-testid="fpl-entry-id"]', '12345');
    await page.click('[data-testid="save-fpl-id-btn"]');

    const squad = buildImportSquad();
    const captainId = 10;
    const viceCaptainId = 11;

    await page.route('**/api/fpl/bootstrap-static', async (route) => {
      const body = bootstrapFixture(squad);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.route('**/api/fpl/entry/*/event/*/picks', async (route) => {
      const body = createEntryPicksFixture(squad, { captainId, viceCaptainId });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.click('[data-testid="import-fpl-squad-btn"]');

    await expect(page.locator('[role="alert"]')).toContainText('Imported 15 players from your FPL squad');
    await expect(page.locator('#team-count')).toHaveText('15 / 15');
    await expect(page.locator('#players-tbody')).not.toContainText('Old Player');
    await expect(page.locator('#players-tbody')).toContainText('Keeper 1');
    await expect(page.locator('#players-tbody')).toContainText('Forward 15');
    await expect(page.locator('[data-testid="captain-info"]')).toContainText('Midfielder 10');
    await expect(page.locator('[data-testid="vice-captain-info"]')).toContainText('Midfielder 11');
  });

  test('warns before importing when no FPL entry ID is set', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await clearStorage(page);
    await page.evaluate(() => localStorage.setItem('fpl-storage-backend', 'localstorage'));
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await waitForStorageReady(page);
    await openAdvancedPanel(page);

    await page.click('[data-testid="import-fpl-squad-btn"]');

    await expect(page.locator('[role="alert"]')).toContainText('Set your FPL entry ID first, then import.');
  });
});
