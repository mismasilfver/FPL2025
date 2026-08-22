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
  await page.goto('http://localhost:3000');
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
 * Build a valid default multi-team root payload for resetting the SQLite backend.
 * Must match the shape the app itself creates (see js/storage-module.js
 * createDefaultRoot + FPLTeamManager._migrateToTeams), otherwise the server
 * persists a malformed root that leaks stale state into later tests.
 */
function buildDefaultMultiTeamRoot() {
  const defaultWeek = {
    players: [],
    captain: null,
    viceCaptain: null,
    teamMembers: [],
    teamStats: { totalValue: 0, playerCount: 0, updatedDate: new Date().toISOString() },
    totalTeamCost: 0,
    isReadOnly: false,
    notes: '',
    weekNumber: 1
  };

  return {
    version: '3.1',
    currentTeam: 'default',
    settings: { fplEntryId: null },
    teams: {
      default: {
        id: 'default',
        name: 'Primary Team',
        type: 'primary',
        fplEntryId: null,
        currentWeek: 1,
        weeks: { 1: defaultWeek },
        totalPoints: 0,
        gameweekPoints: {}
      }
    }
  };
}

/**
 * Clear all application storage data (localStorage, sessionStorage, IndexedDB,
 * and the SQLite backend if it is the currently configured backend).
 *
 * Note: this reads the backend preference from localStorage BEFORE wiping it,
 * so callers that need to switch backends must set the new preference AFTER
 * calling clearStorage (see resetAppWithBackend).
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function clearStorage(page) {
  // Capture the currently configured backend before localStorage is wiped.
  const backend = (await page.evaluate((key) => localStorage.getItem(key), STORAGE_BACKEND_KEY).catch(() => null) || '').toLowerCase();

  // Clear localStorage and sessionStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Clear IndexedDB. localStorage.clear() above does NOT touch it, and
  // browsers persist IndexedDB across pages/tests within the same run,
  // so without this step data silently accumulates across the whole suite.
  await page.evaluate(async () => {
    if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return;
    try {
      const databases = await indexedDB.databases();
      await Promise.all((databases || []).map((db) => db.name && new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(db.name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      })));
    } catch (e) {
      // Best-effort cleanup; ignore failures.
    }
  });

  // Reset SQLite backend data if it was the active backend
  if (backend === 'sqlite') {
    try {
      await page.evaluate(async (defaultRoot) => {
        await fetch('/api/storage/root', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultRoot)
        }).catch(() => {});
      }, buildDefaultMultiTeamRoot());
    } catch (e) {
      // Ignore errors
    }
  }
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
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Set the backend preference temporarily so clearStorage() knows whether
  // to reset the SQLite backend, then clear all storage (localStorage,
  // sessionStorage, IndexedDB). clearStorage() wipes localStorage, so the
  // preference must be (re-)written AFTER it, not before.
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, value);
  }, { key: STORAGE_BACKEND_KEY, value: backend });

  await clearStorage(page);

  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, value);
  }, { key: STORAGE_BACKEND_KEY, value: backend });

  // Navigate again to apply the backend with clean data
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await waitForStorageReady(page);
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
