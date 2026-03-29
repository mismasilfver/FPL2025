/**
 * Captaincy Management E2E Tests
 * Tests captain/vice-captain selection across all storage backends
 */

import { test, expect } from '@playwright/test';
import { resetAppWithBackend } from '../helpers/storage-helpers.js';
import { addPlayer, setCaptainStatus } from '../helpers/ui-helpers.js';
import { expectCaptainStatus, expectErrorMessage } from '../helpers/assertions.js';
import { buildMinimalSquad } from '../fixtures/test-data.js';

const BACKENDS = ['localStorage', 'indexeddb', 'sqlite'];

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
      await setCaptainStatus(page, captain.name, 'captain');
      
      // Check for captain indicator - could be visual badge or class
      const row = page.locator('.player-row, [data-testid="player-row"]', { hasText: captain.name });
      await expect(row.locator('.captain-badge, [data-testid="captain-badge"], .is-captain')).toBeVisible();
    });

    test('can set vice-captain on owned player', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const viceCaptain = players[1];
      await setCaptainStatus(page, viceCaptain.name, 'viceCaptain');
      
      // Check for vice-captain indicator
      const row = page.locator('.player-row, [data-testid="player-row"]', { hasText: viceCaptain.name });
      await expect(row.locator('.vice-badge, [data-testid="vice-badge"], .is-vice-captain')).toBeVisible();
    });

    test('captain selection persists after reload', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain = players[0];
      await setCaptainStatus(page, captain.name, 'captain');
      
      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify captain status persists
      const row = page.locator('.player-row, [data-testid="player-row"]', { hasText: captain.name });
      await expect(row.locator('.captain-badge, [data-testid="captain-badge"], .is-captain')).toBeVisible();
    });

    test('vice-captain selection persists after reload', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const viceCaptain = players[1];
      await setCaptainStatus(page, viceCaptain.name, 'viceCaptain');
      
      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify vice-captain status persists
      const row = page.locator('.player-row, [data-testid="player-row"]', { hasText: viceCaptain.name });
      await expect(row.locator('.vice-badge, [data-testid="vice-badge"], .is-vice-captain')).toBeVisible();
    });

    test('switching captain removes captain from previous player', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain1 = players[0];
      const captain2 = players[1];
      
      // Set first captain
      await setCaptainStatus(page, captain1.name, 'captain');
      
      // Switch to second captain
      await setCaptainStatus(page, captain2.name, 'captain');
      
      // Verify new captain has badge
      const row2 = page.locator('.player-row, [data-testid="player-row"]', { hasText: captain2.name });
      await expect(row2.locator('.captain-badge, [data-testid="captain-badge"], .is-captain')).toBeVisible();
      
      // Verify old captain no longer has badge
      const row1 = page.locator('.player-row, [data-testid="player-row"]', { hasText: captain1.name });
      const hasBadge = await row1.locator('.captain-badge, [data-testid="captain-badge"], .is-captain').isVisible().catch(() => false);
      expect(hasBadge).toBe(false);
    });

    test('can have both captain and vice-captain simultaneously', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain = players[0];
      const viceCaptain = players[1];
      
      await setCaptainStatus(page, captain.name, 'captain');
      await setCaptainStatus(page, viceCaptain.name, 'viceCaptain');
      
      // Verify both have their respective badges
      const captainRow = page.locator('.player-row, [data-testid="player-row"]', { hasText: captain.name });
      await expect(captainRow.locator('.captain-badge, [data-testid="captain-badge"], .is-captain')).toBeVisible();
      
      const viceRow = page.locator('.player-row, [data-testid="player-row"]', { hasText: viceCaptain.name });
      await expect(viceRow.locator('.vice-badge, [data-testid="vice-badge"], .is-vice-captain')).toBeVisible();
    });

    test('captain and vice-captain can be same player', async ({ page }) => {
      const players = buildMinimalSquad();
      
      for (const player of players) {
        await addPlayer(page, player);
      }
      
      const captain = players[0];
      
      // Set as captain first
      await setCaptainStatus(page, captain.name, 'captain');
      
      // Set same player as vice-captain (should replace captain or show both)
      await setCaptainStatus(page, captain.name, 'viceCaptain');
      
      // Verify player exists and has at least one badge
      const row = page.locator('.player-row, [data-testid="player-row"]', { hasText: captain.name });
      const hasAnyBadge = await row.locator('.captain-badge, .vice-badge, [data-testid="captain-badge"], [data-testid="vice-badge"]').isVisible();
      expect(hasAnyBadge).toBe(true);
    });
  });
}
