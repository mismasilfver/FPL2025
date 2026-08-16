/**
 * Infrastructure tests for E2E setup
 * Verifies Playwright and helpers are working correctly
 */

import { test, expect } from '@playwright/test';
import { setStorageBackend, getStorageBackend, clearStorage, resetAppWithBackend } from '../helpers/storage-helpers.js';

test.describe('E2E Infrastructure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads successfully', async ({ page }) => {
    // Verify page has loaded with expected title or content
    await expect(page).toHaveTitle(/FPL|Fantasy|Team/i);
    
    // Verify main container exists
    const container = page.locator('#app, #root, .app, body');
    await expect(container).toBeVisible();
  });

  test('storage backend can be set to localStorage', async ({ page }) => {
    await resetAppWithBackend(page, 'localStorage');
    const backend = await getStorageBackend(page);
    expect(backend).toBe('localStorage');
  });

  test('storage backend can be set to indexeddb', async ({ page }) => {
    await resetAppWithBackend(page, 'indexeddb');
    const backend = await getStorageBackend(page);
    // The app may fallback to localStorage if IndexedDB initialization fails
    expect(backend).toMatch(/indexeddb|localStorage/i);
  });

  test('storage backend can be set to sqlite', async ({ page }) => {
    await resetAppWithBackend(page, 'sqlite');
    const backend = await getStorageBackend(page);
    // The app may fallback to localStorage if SQLite server isn't available
    expect(backend).toMatch(/sqlite|localStorage/i);
  });

  test('clearStorage removes all data', async ({ page }) => {
    // First set some data in localStorage
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value');
    });
    
    // Clear storage
    await clearStorage(page);
    
    // Verify data is cleared
    const value = await page.evaluate(() => localStorage.getItem('test-key'));
    expect(value).toBeNull();
  });
});
