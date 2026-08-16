/**
 * Week Navigation E2E Tests
 * Tests week creation, navigation, and read-only mode across all storage backends
 */

import { test, expect } from '@playwright/test';
import { resetAppWithBackend } from '../helpers/storage-helpers.js';
import { addPlayer, createNewWeek, navigateToWeek, getCurrentWeekNumber, isReadOnlyMode, setCaptainStatus, togglePlayerOwned } from '../helpers/ui-helpers.js';
import { expectCurrentWeek, expectReadOnlyMode, expectEditMode, expectPlayerCount, expectPlayerExists } from '../helpers/assertions.js';
import { buildMinimalSquad, getPlayerByPosition } from '../fixtures/test-data.js';

const BACKENDS = ['localStorage', 'indexeddb', 'sqlite'];

for (const backend of BACKENDS) {
  test.describe(`Week Navigation - ${backend}`, () => {
    test.beforeEach(async ({ page }) => {
      await resetAppWithBackend(page, backend);
    });

    test('starts at week 1', async ({ page }) => {
      const weekNumber = await getCurrentWeekNumber(page);
      expect(weekNumber).toBe(1);
      await expectCurrentWeek(page, 1);
    });

    test('week 1 starts in edit mode', async ({ page }) => {
      const isReadOnly = await isReadOnlyMode(page);
      expect(isReadOnly).toBe(false);
      await expectEditMode(page);
    });

    test('can add players to week 1', async ({ page }) => {
      const player = getPlayerByPosition('forward');
      await addPlayer(page, player);
      await expectPlayerCount(page, 1);
    });

    test('can create week 2', async ({ page }) => {
      await createNewWeek(page);
      const weekNumber = await getCurrentWeekNumber(page);
      expect(weekNumber).toBe(2);
      await expectCurrentWeek(page, 2);
    });

    test('creating week 2 copies week 1 players', async ({ page }) => {
      // Add players to week 1
      const players = buildMinimalSquad();
      for (const player of players) {
        await addPlayer(page, player);
      }
      await expectPlayerCount(page, players.length);
      
      // Create week 2
      await createNewWeek(page);
      
      // Verify players were copied
      await expectPlayerCount(page, players.length);
      for (const player of players) {
        await expectPlayerExists(page, player.name);
      }
    });

    test('week 1 becomes read-only after creating week 2', async ({ page }) => {
      // Add players to week 1
      const player = getPlayerByPosition('forward');
      await addPlayer(page, player);
      
      // Create week 2
      await createNewWeek(page);
      
      // Navigate back to week 1
      await navigateToWeek(page, 1);
      
      // Verify week 1 is read-only
      const isReadOnly = await isReadOnlyMode(page);
      expect(isReadOnly).toBe(true);
      await expectReadOnlyMode(page);
    });

    test('week 2 is editable after creation', async ({ page }) => {
      // Add players to week 1
      const player = getPlayerByPosition('forward');
      await addPlayer(page, player);
      
      // Create week 2
      await createNewWeek(page);
      
      // Verify week 2 is editable
      const isReadOnly = await isReadOnlyMode(page);
      expect(isReadOnly).toBe(false);
      await expectEditMode(page);
    });

    test('modifications in week 2 do not affect week 1', async ({ page }) => {
      // Add players to week 1
      const players = buildMinimalSquad();
      for (const player of players) {
        await addPlayer(page, player);
      }
      await expectPlayerCount(page, players.length);
      
      // Create week 2
      await createNewWeek(page);
      
      // Add a new player to week 2
      const newPlayer = getPlayerByPosition('goalkeeper');
      await addPlayer(page, newPlayer);
      await expectPlayerCount(page, players.length + 1);
      
      // Navigate back to week 1
      await navigateToWeek(page, 1);
      
      // Verify week 1 still has original player count
      await expectPlayerCount(page, players.length);
    });

    test('captain selection persists per week', async ({ page }) => {
      // Add players to week 1
      const players = buildMinimalSquad();
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      // Set captain in week 1 (ensure player is in team first)
      await togglePlayerOwned(page, players[0].name);
      await setCaptainStatus(page, players[0].name, 'captain');
      
      // Create week 2
      await createNewWeek(page);
      
      // Set different captain in week 2 (ensure player is in team first)
      await togglePlayerOwned(page, players[1].name);
      await setCaptainStatus(page, players[1].name, 'captain');
      
      // Navigate back to week 1
      await navigateToWeek(page, 1);
      
      // Verify week 1 still has original captain (via captain info section)
      await expect(page.locator('#captain-info, [data-testid="captain-info"]')).toContainText(players[0].name);
    });

    test('can navigate between weeks', async ({ page }) => {
      // Add players to week 1
      const player = getPlayerByPosition('forward');
      await addPlayer(page, player);
      
      // Create week 2
      await createNewWeek(page);
      await expectCurrentWeek(page, 2);
      
      // Navigate back to week 1
      await navigateToWeek(page, 1);
      await expectCurrentWeek(page, 1);
      
      // Navigate to week 2 again
      await navigateToWeek(page, 2);
      await expectCurrentWeek(page, 2);
    });

    test('creating multiple weeks', async ({ page }) => {
      // Create week 2
      await createNewWeek(page);
      await expectCurrentWeek(page, 2);
      
      // Create week 3
      await createNewWeek(page);
      await expectCurrentWeek(page, 3);
      
      // Navigate between all weeks
      await navigateToWeek(page, 1);
      await expectCurrentWeek(page, 1);
      
      await navigateToWeek(page, 2);
      await expectCurrentWeek(page, 2);
      
      await navigateToWeek(page, 3);
      await expectCurrentWeek(page, 3);
    });

    test('week data persists after reload', async ({ page }) => {
      // Add players to week 1
      const player = getPlayerByPosition('forward');
      await addPlayer(page, player);
      
      // Create week 2
      await createNewWeek(page);
      
      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be on week 2
      await expectCurrentWeek(page, 2);
      
      // Navigate to week 1
      await navigateToWeek(page, 1);
      await expectCurrentWeek(page, 1);
      
      // Verify week 1 is read-only
      await expectReadOnlyMode(page);
    });
  });
}
