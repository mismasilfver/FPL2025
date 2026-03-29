/**
 * Custom assertions for E2E tests
 * Provides domain-specific assertions for FPL application testing
 */

import { expect } from '@playwright/test';

/**
 * Assert that a player exists in the list
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Player name to look for
 */
export async function expectPlayerExists(page, playerName) {
  const row = page.locator('.player-row, [data-testid="player-row"]', { hasText: playerName });
  await expect(row).toBeVisible();
}

/**
 * Assert that a player does not exist in the list
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Player name to check
 */
export async function expectPlayerNotExists(page, playerName) {
  const row = page.locator('.player-row, [data-testid="player-row"]', { hasText: playerName });
  await expect(row).not.toBeVisible();
}

/**
 * Assert player count matches expected value
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} expectedCount - Expected number of players
 */
export async function expectPlayerCount(page, expectedCount) {
  const rows = page.locator('#players-tbody tr.player-row');
  await expect(rows).toHaveCount(expectedCount);
}

/**
 * Assert player has specific captain status
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Player name
 * @param {string} status - Expected status: 'captain', 'viceCaptain', or 'none'
 */
export async function expectCaptainStatus(page, playerName, status) {
  const row = page.locator('.player-row, [data-testid="player-row"]', { hasText: playerName });
  
  if (status === 'captain') {
    await expect(row.locator('.captain-badge, [data-testid="captain-badge"]')).toBeVisible();
  } else if (status === 'viceCaptain') {
    await expect(row.locator('.vice-badge, [data-testid="vice-badge"]')).toBeVisible();
  } else {
    await expect(row.locator('.captain-badge, .vice-badge, [data-testid="captain-badge"], [data-testid="vice-badge"]')).not.toBeVisible();
  }
}

/**
 * Assert current week matches expected
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} expectedWeek - Expected week number
 */
export async function expectCurrentWeek(page, expectedWeek) {
  const indicator = page.locator('[data-testid="current-week"], .current-week-indicator');
  await expect(indicator).toContainText(`Week ${expectedWeek}`);
}

/**
 * Assert read-only mode is active
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function expectReadOnlyMode(page) {
  const indicator = page.locator('[data-testid="readonly-indicator"], .readonly-badge, .read-only');
  await expect(indicator).toBeVisible();
}

/**
 * Assert read-only mode is not active (edit mode)
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function expectEditMode(page) {
  const indicator = page.locator('[data-testid="readonly-indicator"], .readonly-badge, .read-only');
  await expect(indicator).not.toBeVisible();
}

/**
 * Assert storage backend is active
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} expectedBackend - Expected backend name
 */
export async function expectStorageBackend(page, expectedBackend) {
  const indicator = page.locator('[data-testid="storage-backend"], .storage-indicator');
  await expect(indicator).toContainText(expectedBackend);
}

/**
 * Assert total cost is within expected range
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} expectedCost - Expected total cost
 * @param {number} tolerance - Acceptable difference (default: 0.01)
 */
export async function expectTotalCost(page, expectedCost, tolerance = 0.01) {
  const text = await page.locator('[data-testid="total-cost"], .total-cost, .team-value').textContent();
  const match = text?.match(/[\d.]+/);
  const actualCost = match ? parseFloat(match[0]) : 0;
  expect(Math.abs(actualCost - expectedCost)).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that a toast/notification appears with expected text
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} expectedText - Text to look for in notification
 * @param {number} timeout - Timeout in milliseconds
 */
export async function expectNotification(page, expectedText, timeout = 5000) {
  const toast = page.locator('.toast, .notification, [role="alert"]', { hasText: expectedText });
  await expect(toast).toBeVisible({ timeout });
}

/**
 * Assert error message is displayed
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} expectedText - Expected error message
 */
export async function expectErrorMessage(page, expectedText) {
  const error = page.locator('.error, .error-message, [role="alert"]', { hasText: expectedText });
  await expect(error).toBeVisible();
}
