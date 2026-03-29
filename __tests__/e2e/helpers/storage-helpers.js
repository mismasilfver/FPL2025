/**
 * Storage helpers for E2E tests
 * Provides utilities to switch between storage backends and manage storage state
 */

const STORAGE_BACKEND_KEY = 'fpl-storage-backend';

/**
 * Set the storage backend by manipulating localStorage
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} backend - Backend name: 'localStorage', 'indexeddb', or 'sqlite'
 */
export async function setStorageBackend(page, backend) {
  // Set the backend in localStorage using full URL navigation
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, value);
  }, { key: STORAGE_BACKEND_KEY, value: backend });
  
  // Navigate to full URL instead of reload to ensure proper origin
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');
  await waitForStorageReady(page);
}

/**
 * Get the currently configured storage backend
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<string>} Current backend name
 */
export async function getStorageBackend(page) {
  return page.evaluate(({ key }) => {
    return localStorage.getItem(key) || 'localStorage';
  }, { key: STORAGE_BACKEND_KEY });
}

/**
 * Clear all application storage data
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function clearStorage(page) {
  await page.evaluate(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Note: IndexedDB clearing would require more complex logic
    // and is handled by reloading with fresh storage backend
  });
}

/**
 * Wait for storage to be ready (app initialization complete)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Maximum wait time in milliseconds
 */
export async function waitForStorageReady(page, timeout = 5000) {
  // Wait for the app to signal it's ready
  // Look for week indicator which is always present
  await page.waitForSelector('[data-testid="week-indicator"], .week-indicator, .container', { timeout });
}

/**
 * Reset application to clean state with specified backend
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} backend - Backend to use
 */
export async function resetAppWithBackend(page, backend) {
  // First navigate to ensure we have a valid page context
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');
  
  // Now clear storage and set backend
  await clearStorage(page);
  await setStorageBackend(page, backend);
}

/**
 * Verify data persists after page reload
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Function} verifyFn - Async function that returns true if data is correct
 */
export async function verifyPersistence(page, verifyFn) {
  // Verify data exists before reload
  const beforeReload = await verifyFn();
  if (!beforeReload) {
    throw new Error('Data verification failed before reload');
  }
  
  // Reload page
  await page.reload();
  await waitForStorageReady(page);
  
  // Verify data exists after reload
  const afterReload = await verifyFn();
  if (!afterReload) {
    throw new Error('Data verification failed after reload');
  }
  
  return true;
}
