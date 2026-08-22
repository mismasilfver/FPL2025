/**
 * Captaincy Management E2E Tests
 * Tests captain/vice-captain selection across all storage backends
 */

import { test, expect } from '@playwright/test';
import { resetAppWithBackend } from '../helpers/storage-helpers.js';
import { addPlayer, setCaptainStatus, togglePlayerOwned } from '../helpers/ui-helpers.js';
import { expectCaptainStatus, expectErrorMessage } from '../helpers/assertions.js';
import { buildMinimalSquad } from '../fixtures/test-data.js';

const BACKENDS = ['localstorage', 'indexeddb', 'sqlite'];

for (const backend of BACKENDS) {
  test.describe(`Captaincy Management - ${backend}`, () => {
    test.beforeEach(async ({ page }) => {
      await resetAppWithBackend(page, backend);
    });

    test('can set captain on owned player', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain = players[0];
      // Ensure player is in team (have=true)
      await togglePlayerOwned(page, captain.name);
      await setCaptainStatus(page, captain.name, 'captain');
      
      // Check captain info at top of page shows the player
      await expect(page.locator('#captain-info, [data-testid="captain-info"]')).toContainText(captain.name);
    });

    test('can set vice-captain on owned player', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const viceCaptain = players[1];
      // Ensure player is in team
      await togglePlayerOwned(page, viceCaptain.name);
      await setCaptainStatus(page, viceCaptain.name, 'viceCaptain');
      
      // Check vice-captain info at top of page
      await expect(page.locator('#vice-captain-info, [data-testid="vice-captain-info"]')).toContainText(viceCaptain.name);
    });

    test('captain selection persists after reload', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain = players[0];
      // Ensure player is in team
      await togglePlayerOwned(page, captain.name);
      await setCaptainStatus(page, captain.name, 'captain');
      
      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify captain info persists
      await expect(page.locator('#captain-info, [data-testid="captain-info"]')).toContainText(captain.name);
    });

    test('vice-captain selection persists after reload', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const viceCaptain = players[1];
      // Ensure player is in team
      await togglePlayerOwned(page, viceCaptain.name);
      await setCaptainStatus(page, viceCaptain.name, 'viceCaptain');
      
      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify vice-captain info persists
      await expect(page.locator('#vice-captain-info, [data-testid="vice-captain-info"]')).toContainText(viceCaptain.name);
    });

    test('switching captain removes captain from previous player', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain1 = players[0];
      const captain2 = players[1];
      
      // Set first captain
      await togglePlayerOwned(page, captain1.name);
      await setCaptainStatus(page, captain1.name, 'captain');
      
      // Switch to second captain
      await togglePlayerOwned(page, captain2.name);
      await setCaptainStatus(page, captain2.name, 'captain');
      
      // Verify new captain in info
      await expect(page.locator('#captain-info, [data-testid="captain-info"]')).toContainText(captain2.name);
      
      // Verify old captain no longer in info
      await expect(page.locator('#captain-info, [data-testid="captain-info"]')).not.toContainText(captain1.name);
    });

    test('can have both captain and vice-captain simultaneously', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain = players[0];
      const viceCaptain = players[1];
      
      await togglePlayerOwned(page, captain.name);
      await setCaptainStatus(page, captain.name, 'captain');
      await togglePlayerOwned(page, viceCaptain.name);
      await setCaptainStatus(page, viceCaptain.name, 'viceCaptain');
      
      // Verify both in captain info
      await expect(page.locator('#captain-info, [data-testid="captain-info"]')).toContainText(captain.name);
      await expect(page.locator('#vice-captain-info, [data-testid="vice-captain-info"]')).toContainText(viceCaptain.name);
    });

    test('captain and vice-captain can be same player', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain = players[0];
      
      // Set as captain first
      await togglePlayerOwned(page, captain.name);
      await setCaptainStatus(page, captain.name, 'captain');
      
      // Set same player as vice-captain
      await setCaptainStatus(page, captain.name, 'viceCaptain');
      
      // Verify vice-captain in info
      await expect(page.locator('#vice-captain-info, [data-testid="vice-captain-info"]')).toContainText(captain.name);
    });
  });
}
