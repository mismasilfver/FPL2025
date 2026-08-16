/**
 * UI helpers for E2E tests
 * Provides common UI interactions for the FPL application
 */

import { waitForStorageReady } from './storage-helpers.js';

/**
 * Add a player to the team
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} playerData - Player data to add
 * @param {string} playerData.name - Player name
 * @param {string} playerData.position - Player position (goalkeeper, defender, midfielder, forward)
 * @param {number} playerData.price - Player price
 * @param {string} [playerData.team] - Player team
 * @param {boolean} [playerData.isOwned] - Whether player is owned (default: true)
 * @param {string} [playerData.status] - Captain status (none, captain, viceCaptain)
 */
export async function addPlayer(page, playerData) {
  // Click add player button
  await page.click('[data-testid="add-player-button"], #add-player-btn');
  
  // Wait for modal to appear
  await page.waitForSelector('#player-modal, .modal', { state: 'visible' });
  
  // Fill player name
  await page.fill('[data-testid="player-name-input"], #player-name', playerData.name);
  
  // Select position
  await page.selectOption('[data-testid="player-position-select"], #player-position', playerData.position);
  
  // Fill price
  await page.fill('[data-testid="player-price-input"], #player-price', String(playerData.price));
  
  // Fill team if provided
  if (playerData.team) {
    await page.fill('[data-testid="player-team-input"], #player-team', playerData.team);
  }
  
  // Set "have" status if true (checked by default, so only uncheck if false)
  if (playerData.isOwned === false) {
    await page.uncheck('[data-testid="player-have-checkbox"], #player-have');
  }
  
  // Submit the form
  await page.click('[data-testid="save-player-button"], button[type="submit"]');
  
  // Wait for modal to close
  await page.waitForSelector('#player-modal, .modal', { state: 'hidden' }).catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * Get the count of player rows currently displayed
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<number>} Number of player rows
 */
export async function getPlayerCount(page) {
  return page.locator('#players-tbody tr.player-row, .player-row').count();
}

/**
 * Get player row by name
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Name of the player to find
 * @returns {Promise<import('@playwright/test').Locator>} Locator for the player row
 */
export async function getPlayerRow(page, playerName) {
  // Find row where first cell has exact player name
  return page.locator('#players-tbody tr.player-row', {
    has: page.locator('td:first-child, td.col-name').and(page.locator(`:text-is("${playerName}")`))
  });
}

/**
 * Delete a player by name
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Name of the player to delete
 */
export async function deletePlayer(page, playerName) {
  // Set up dialog handler to accept confirm
  page.on('dialog', async dialog => {
    if (dialog.type() === 'confirm') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
  
  const row = await getPlayerRow(page, playerName);
  const deleteBtn = row.locator('[data-action="delete"], button:has-text("Delete")').first();
  
  // Click delete (will trigger confirm dialog)
  await deleteBtn.click();
  
  // Wait for delete to process and UI to update
  await page.waitForTimeout(1000);
  
  // Reload to ensure UI reflects deletion
  await page.reload();
  await page.waitForLoadState('networkidle');
  await waitForStorageReady(page);
}

/**
 * Update player details
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Current player name
 * @param {Object} updates - Fields to update
 */
export async function updatePlayer(page, playerName, updates) {
  const row = await getPlayerRow(page, playerName);
  await row.locator('.edit-btn, button:has-text("Edit"), [data-testid="edit-player"]').click();
  
  // Wait for modal
  await page.waitForSelector('#player-modal, .modal', { state: 'visible' });
  
  // Update fields
  if (updates.name) {
    await page.fill('[data-testid="player-name-input"], #player-name', updates.name);
  }
  if (updates.price !== undefined) {
    await page.fill('[data-testid="player-price-input"], #player-price', String(updates.price));
  }
  if (updates.team) {
    await page.fill('[data-testid="player-team-input"], #player-team', updates.team);
  }
  if (updates.position) {
    await page.selectOption('[data-testid="player-position-select"], #player-position', updates.position);
  }
  
  // Submit
  await page.click('[data-testid="save-player-button"], button[type="submit"]');
  
  // Wait for modal to close
  await page.waitForSelector('#player-modal, .modal', { state: 'hidden' }).catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * Toggle player "have" status
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Player name
 */
export async function togglePlayerOwned(page, playerName) {
  const row = await getPlayerRow(page, playerName);
  // The have toggle is a + button in the col-have cell (6th column)
  await row.locator('td:nth-child(6) button, td.col-have button, button:has-text("+")').first().click();
}

/**
 * Set captain for a player
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Player name
 * @param {string} status - 'captain' or 'viceCaptain'
 */
export async function setCaptainStatus(page, playerName, status) {
  const row = await getPlayerRow(page, playerName);
  const buttonSelector = status === 'captain' 
    ? 'button:has-text("C"):not(:has-text("VC"))'
    : 'button:has-text("VC")';
  await row.locator(buttonSelector).first().click();
  await page.waitForTimeout(200);
}

/**
 * Create a new week
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function createNewWeek(page) {
  await page.click('[data-testid="create-week-btn"], #create-week-btn');
  await page.waitForTimeout(500);
}

/**
 * Navigate to a specific week
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} weekNumber - Week number to navigate to
 */
export async function navigateToWeek(page, weekNumber) {
  // Check if we need to go forward or backward
  let currentWeek = await getCurrentWeekNumber(page);
  
  while (currentWeek < weekNumber) {
    await page.click('[data-testid="next-week-btn"], #next-week-btn');
    await page.waitForTimeout(300);
    currentWeek++;
  }
  
  while (currentWeek > weekNumber) {
    await page.click('[data-testid="prev-week-btn"], #prev-week-btn');
    await page.waitForTimeout(300);
    currentWeek--;
  }
}

/**
 * Get current week number from UI
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<number>} Current week number
 */
export async function getCurrentWeekNumber(page) {
  const text = await page.locator('[data-testid="week-label"], #week-label').textContent();
  const match = text?.match(/Week (\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Check if current week is in read-only mode
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} True if read-only
 */
export async function isReadOnlyMode(page) {
  const badge = await page.locator('[data-testid="week-readonly-badge"], #week-readonly-badge').isVisible();
  return badge;
}

/**
 * Get total team cost displayed in UI
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<number>} Total cost
 */
export async function getTotalCost(page) {
  const text = await page.locator('[data-testid="total-cost"], .total-cost, .team-value').textContent();
  const match = text?.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}
