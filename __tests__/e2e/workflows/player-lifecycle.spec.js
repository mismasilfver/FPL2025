/**
 * Player Lifecycle E2E Tests
 * Tests player CRUD operations across all storage backends
 */

import { test, expect } from '@playwright/test';
import { resetAppWithBackend } from '../helpers/storage-helpers.js';
import { addPlayer, getPlayerCount, deletePlayer, updatePlayer, togglePlayerOwned, getPlayerRow } from '../helpers/ui-helpers.js';
import { expectPlayerExists, expectPlayerCount, expectPlayerNotExists } from '../helpers/assertions.js';
import { buildMinimalSquad, getPlayerByPosition } from '../fixtures/test-data.js';

const BACKENDS = ['localstorage', 'indexeddb', 'sqlite'];

for (const backend of BACKENDS) {
  test.describe(`Player Lifecycle - ${backend}`, () => {
    test.beforeEach(async ({ page }) => {
      await resetAppWithBackend(page, backend);
    });

    test('can add a single player', async ({ page }) => {
      const player = getPlayerByPosition('forward');
      await addPlayer(page, player);
      await expectPlayerCount(page, 1);
      await expectPlayerExists(page, player.name);
    });

    test('can add players in all positions', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      await expectPlayerCount(page, players.length);
      
      for (const player of players) {
        await expectPlayerExists(page, player.name);
      }
    });

    test('can update player details', async ({ page }) => {
      const player = getPlayerByPosition('midfielder');
      await addPlayer(page, player);
      
      const updatedName = `${player.name} Jr.`;
      const updatedPrice = player.price + 0.5;
      
      await updatePlayer(page, player.name, {
        name: updatedName,
        price: updatedPrice,
      });
      
      await expectPlayerExists(page, updatedName);
      
      // Verify old name is gone
      const oldRow = await getPlayerRow(page, player.name);
      const count = await oldRow.count();
      expect(count).toBe(0);
    });

    test('can toggle player owned status', async ({ page }) => {
      const player = getPlayerByPosition('defender');
      await addPlayer(page, player);
      
      // Toggle off (unowned)
      await togglePlayerOwned(page, player.name);
      
      // Player should still exist in list
      await expectPlayerExists(page, player.name);
    });

    test('can delete a player', async ({ page }) => {
      const player = getPlayerByPosition('goalkeeper');
      await addPlayer(page, player);
      await expectPlayerCount(page, 1);
      
      await deletePlayer(page, player.name);
      await expectPlayerCount(page, 0);
      await expectPlayerNotExists(page, player.name);
    });

    test('data persists after page reload', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      await expectPlayerCount(page, players.length);
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify data persists
      await expectPlayerCount(page, players.length);
      
      for (const player of players) {
        await expectPlayerExists(page, player.name);
      }
    });

    test('can add multiple players sequentially', async ({ page }) => {
      const players = [
        getPlayerByPosition('forward'),
        getPlayerByPosition('midfielder'),
        getPlayerByPosition('defender'),
      ];
      
      for (const player of players) {
        await addPlayer(page, player);
        const currentCount = await getPlayerCount(page);
        expect(currentCount).toBeGreaterThan(0);
      }
      
      await expectPlayerCount(page, players.length);
    });

    test('deleting one player preserves others', async ({ page }) => {
      const player1 = getPlayerByPosition('forward');
      const player2 = getPlayerByPosition('midfielder');
      
      await addPlayer(page, player1);
      await addPlayer(page, player2);
      await expectPlayerCount(page, 2);
      
      await deletePlayer(page, player1.name);
      
      await expectPlayerCount(page, 1);
      await expectPlayerNotExists(page, player1.name);
      await expectPlayerExists(page, player2.name);
    });
  });
}
