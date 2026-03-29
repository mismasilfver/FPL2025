/**
 * UI helpers for E2E tests
 * Provides common UI interactions for the FPL application
 */

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
  await page.click('[data-testid="add-player-button"], #add-player-btn, button:has-text("Add Player")');
  
  // Fill player name
  await page.fill('[data-testid="player-name-input"], [name="playerName"], input[placeholder*="name"]', playerData.name);
  
  // Select position
  await page.selectOption('[data-testid="position-select"], [name="position"], select:has-option("goalkeeper")', playerData.position);
  
  // Fill price
  await page.fill('[data-testid="price-input"], [name="price"], input[type="number"]', String(playerData.price));
  
  // Fill team if provided
  if (playerData.team) {
    await page.fill('[data-testid="team-input"], [name="team"]', playerData.team);
  }
  
  // Set owned status if false
  if (playerData.isOwned === false) {
    await page.uncheck('[data-testid="have-checkbox"], [name="have"], input[type="checkbox"]');
  }
  
  // Submit the form
  await page.click('[data-testid="submit-player"], [type="submit"], button:has-text("Save")');
  
  // Wait for modal to close or success indicator
  await page.waitForTimeout(300);
}

/**
 * Get the count of player rows currently displayed
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<number>} Number of player rows
 */
export async function getPlayerCount(page) {
  return page.locator('.player-row, [data-testid="player-row"], tr.player').count();
}

/**
 * Get player row by name
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Name of the player to find
 * @returns {Promise<import('@playwright/test').Locator>} Locator for the player row
 */
export async function getPlayerRow(page, playerName) {
  return page.locator('.player-row, [data-testid="player-row"]', { hasText: playerName });
}

/**
 * Delete a player by name
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Name of the player to delete
 */
export async function deletePlayer(page, playerName) {
  const row = await getPlayerRow(page, playerName);
  await row.locator('[data-testid="delete-player"], button:has-text("Delete"), .delete-btn').click();
  
  // Confirm deletion if confirmation dialog appears
  const confirmButton = page.locator('[data-testid="confirm-delete"], button:has-text("Confirm"), .confirm-btn');
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }
  
  await page.waitForTimeout(300);
}

/**
 * Update player details
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Current player name
 * @param {Object} updates - Fields to update
 */
export async function updatePlayer(page, playerName, updates) {
  const row = await getPlayerRow(page, playerName);
  await row.locator('[data-testid="edit-player"], button:has-text("Edit"), .edit-btn').click();
  
  // Update fields
  if (updates.name) {
    await page.fill('[data-testid="player-name-input"], [name="playerName"]', updates.name);
  }
  if (updates.price !== undefined) {
    await page.fill('[data-testid="price-input"], [name="price"]', String(updates.price));
  }
  if (updates.team) {
    await page.fill('[data-testid="team-input"], [name="team"]', updates.team);
  }
  if (updates.position) {
    await page.selectOption('[data-testid="position-select"], [name="position"]', updates.position);
  }
  
  // Submit
  await page.click('[data-testid="submit-player"], [type="submit"], button:has-text("Save")');
  await page.waitForTimeout(300);
}

/**
 * Toggle player "have" status
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} playerName - Player name
 */
export async function togglePlayerOwned(page, playerName) {
  const row = await getPlayerRow(page, playerName);
  await row.locator('[data-testid="have-checkbox"], input[type="checkbox"]').click();
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
    ? '[data-testid="set-captain"], button:has-text("C")'
    : '[data-testid="set-vice"], button:has-text("VC")';
  await row.locator(buttonSelector).click();
}

/**
 * Create a new week
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function createNewWeek(page) {
  await page.click('[data-testid="create-week"], button:has-text("New Week"), #create-week-btn');
  await page.waitForTimeout(500);
}

/**
 * Navigate to a specific week
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} weekNumber - Week number to navigate to
 */
export async function navigateToWeek(page, weekNumber) {
  await page.click(`[data-testid="week-${weekNumber}"], button:has-text("Week ${weekNumber}"), .week-tab:nth-child(${weekNumber})`);
  await page.waitForTimeout(300);
}

/**
 * Get current week number from UI
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<number>} Current week number
 */
export async function getCurrentWeekNumber(page) {
  const text = await page.locator('[data-testid="current-week"], .current-week-indicator').textContent();
  const match = text?.match(/Week (\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Check if current week is in read-only mode
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} True if read-only
 */
export async function isReadOnlyMode(page) {
  const indicator = await page.locator('[data-testid="readonly-indicator"], .readonly-badge, .read-only').isVisible().catch(() => false);
  const addButtonDisabled = await page.locator('[data-testid="add-player-button"]').isDisabled().catch(() => false);
  return indicator || addButtonDisabled;
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
