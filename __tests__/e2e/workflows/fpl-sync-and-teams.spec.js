/**
 * FPL SYNC and multi-team E2E tests
 * Verifies FPL ID saving, SYNC point updates, and team switching isolation.
 */

import { test, expect } from '@playwright/test';
import { resetAppWithBackend, waitForStorageReady } from '../helpers/storage-helpers.js';

const STORAGE_KEY = 'fpl-team-data';
const FPL_BOOTSTRAP_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';

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
  };
}

test.describe('FPL sync and multi-team workflows', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppWithBackend(page, 'localstorage');
  });

  test('saves FPL entry ID and persists it across reloads', async ({ page }) => {
    await page.fill('[data-testid="fpl-entry-id"]', '12345');
    await page.click('[data-testid="save-fpl-id-btn"]');

    await expect(page.locator('[role="alert"]')).toContainText('FPL entry ID saved: 12345');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForStorageReady(page);

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

    await page.route(FPL_BOOTSTRAP_URL, async (route) => {
      const body = bootstrapFixture([
        { id: 1, web_name: 'Raya', first_name: 'David', second_name: 'Raya', element_type: 1, team: 1, now_cost: 60, total_points: 162, event_points: 6, form: '2.0', status: 'a', chance_of_playing_next_round: null },
        { id: 2, web_name: 'Haaland', first_name: 'Erling', second_name: 'Haaland', element_type: 4, team: 2, now_cost: 125, total_points: 210, event_points: 13, form: '8.5', status: 'a', chance_of_playing_next_round: null },
      ]);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.click('[data-testid="sync-btn"]');

    await expect(page.locator('[role="alert"]')).toContainText('Sync complete');
    await expect(page.locator('#total-points-display')).toContainText('Total Points: 19');
    await expect(page.locator('#gw-points-display')).toContainText('GW Points: 19');

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

    await page.route(FPL_BOOTSTRAP_URL, async (route) => {
      const body = bootstrapFixture([
        { id: 1, web_name: 'Raya', first_name: 'David', second_name: 'Raya', element_type: 1, team: 1, now_cost: 60, total_points: 162, event_points: 6, form: '2.0', status: 'a', chance_of_playing_next_round: null },
        { id: 2, web_name: 'Haaland', first_name: 'Erling', second_name: 'Haaland', element_type: 4, team: 2, now_cost: 125, total_points: 210, event_points: 13, form: '8.5', status: 'a', chance_of_playing_next_round: null },
      ]);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.click('[data-testid="sync-btn"]');

    await expect(page.locator('[role="alert"]')).toContainText('Sync complete');
    await expect(page.locator('#gw-points-display')).toContainText('GW Points: 25');
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
});
