/**
 * FPL squad-rule validation E2E tests
 */

import { test, expect } from '@playwright/test';
import { resetAppWithBackend } from '../helpers/storage-helpers.js';
import { addPlayer } from '../helpers/ui-helpers.js';

test.describe('FPL Rules Validation', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppWithBackend(page, 'localstorage');
  });

  test('shows valid status for a clean squad', async ({ page }) => {
    await addPlayer(page, { name: 'Alisson Becker', position: 'goalkeeper', price: 5.5, team: 'Liverpool', isOwned: true });
    await addPlayer(page, { name: 'Trent Alexander-Arnold', position: 'defence', price: 7.5, team: 'Liverpool', isOwned: true });
    await addPlayer(page, { name: 'Mohamed Salah', position: 'midfield', price: 11.0, team: 'Liverpool', isOwned: true });
    await addPlayer(page, { name: 'Erling Haaland', position: 'forward', price: 12.5, team: 'Man City', isOwned: true });

    const status = page.locator('[data-testid="fpl-validation-status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Squad rules passed');
  });

  test('warns when budget is exceeded', async ({ page }) => {
    await addPlayer(page, { name: 'Pricey Player', position: 'midfield', price: 120.0, team: 'Arsenal', isOwned: true });

    const status = page.locator('[data-testid="fpl-validation-status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText('exceeds £100m budget');
  });

  test('warns when too many players share a position', async ({ page }) => {
    for (let i = 0; i < 6; i++) {
      await addPlayer(page, {
        name: `Defender ${i}`,
        position: 'defence',
        price: 5.0,
        team: `Team ${i}`,
        isOwned: true,
      });
    }

    const status = page.locator('[data-testid="fpl-validation-status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Too many defence players (max 5)');
  });

  test('warns when more than three players come from the same club', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await addPlayer(page, {
        name: `Liverpool Mid ${i}`,
        position: 'midfield',
        price: 5.0,
        team: 'Liverpool',
        isOwned: true,
      });
    }

    const status = page.locator('[data-testid="fpl-validation-status"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Too many Liverpool players (max 3 per club)');
  });
});
