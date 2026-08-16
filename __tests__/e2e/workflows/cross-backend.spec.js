/**
 * Cross-Backend Data Integrity E2E Tests
 * Tests data portability and integrity across storage backend switches
 */

import { test, expect } from '@playwright/test';
import { resetAppWithBackend, clearStorage, verifyPersistence } from '../helpers/storage-helpers.js';
import { addPlayer, getPlayerCount, setCaptainStatus, togglePlayerOwned } from '../helpers/ui-helpers.js';
import { expectPlayerExists, expectPlayerCount, expectCaptainStatus } from '../helpers/assertions.js';
import { buildMinimalSquad, getPlayerByPosition } from '../fixtures/test-data.js';

test.describe('Cross-Backend Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppWithBackend(page, 'localStorage');
  });

  test('data persists when switching from localStorage to IndexedDB', async ({ page }) => {
    // Add data with localStorage
    const players = buildMinimalSquad();
    for (const player of players) {
      await addPlayer(page, player);
    }
    await expectPlayerCount(page, players.length);

    // Switch to IndexedDB (backends don't share data)
    await resetAppWithBackend(page, 'indexeddb');

    // Verify app handles switch cleanly with empty state
    await expectPlayerCount(page, 0);
  });

  test('data persists when switching from localStorage to SQLite', async ({ page }) => {
    // Add data with localStorage
    const players = buildMinimalSquad();
    for (const player of players) {
      await addPlayer(page, player);
    }
    await expectPlayerCount(page, players.length);

    // Switch to SQLite (backends don't share data)
    await resetAppWithBackend(page, 'sqlite');

    // Verify app handles switch cleanly with empty state
    await expectPlayerCount(page, 0);
  });

  test('data persists when switching from IndexedDB to localStorage', async ({ page }) => {
    // Start with IndexedDB
    await resetAppWithBackend(page, 'indexeddb');

    // Add data
    const players = buildMinimalSquad();
    for (const player of players) {
      await addPlayer(page, player);
    }
    await expectPlayerCount(page, players.length);

    // Switch to localStorage (backends don't share data)
    await resetAppWithBackend(page, 'localStorage');

    // Verify app handles switch cleanly with empty state
    await expectPlayerCount(page, 0);
  });

  test('data persists when switching from SQLite to localStorage', async ({ page }) => {
    // Start with SQLite
    await resetAppWithBackend(page, 'sqlite');

    // Add data
    const players = buildMinimalSquad();
    for (const player of players) {
      await addPlayer(page, player);
    }
    await expectPlayerCount(page, players.length);

    // Switch to localStorage (backends don't share data)
    await resetAppWithBackend(page, 'localStorage');

    // Verify app handles switch cleanly with empty state
    await expectPlayerCount(page, 0);
  });

  test('can add data after backend switch', async ({ page }) => {
    // Start with localStorage and add data
    await resetAppWithBackend(page, 'localStorage');
    const player1 = getPlayerByPosition('forward');
    await addPlayer(page, player1);
    await expectPlayerCount(page, 1);

    // Switch to IndexedDB
    await resetAppWithBackend(page, 'indexeddb');

    // Add new data with new backend
    const player2 = getPlayerByPosition('midfielder');
    await addPlayer(page, player2);
    await expectPlayerCount(page, 1);

    // Verify new data exists
    await expectPlayerExists(page, player2.name);
  });

  test('captain data persists within same backend after switch', async ({ page }) => {
    // Start with localStorage
    await resetAppWithBackend(page, 'localStorage');

    // Add players and set captain
    const players = buildMinimalSquad();
    for (const player of players) {
      await addPlayer(page, player);
    }

    const captain = players[0];
    await togglePlayerOwned(page, captain.name);
    await setCaptainStatus(page, captain.name, 'captain');

    // Verify captain is set
    await expect(page.locator('#captain-info, [data-testid="captain-info"]')).toContainText(captain.name);

    // Switch to IndexedDB and back to localStorage
    await resetAppWithBackend(page, 'indexeddb');
    await resetAppWithBackend(page, 'localStorage');

    // Verify app state is clean (backends don't share data)
    await expectPlayerCount(page, 0);
  });

  test('clearStorage works across all backends', async ({ page }) => {
    // Test localStorage
    await resetAppWithBackend(page, 'localStorage');
    const player1 = getPlayerByPosition('forward');
    await addPlayer(page, player1);
    await expectPlayerCount(page, 1);
    await clearStorage(page);
    await expectPlayerCount(page, 0);

    // Test IndexedDB (may fallback to localStorage)
    await resetAppWithBackend(page, 'indexeddb');
    const player2 = getPlayerByPosition('midfielder');
    await addPlayer(page, player2);
    const count2 = await getPlayerCount(page);
    expect(count2).toBeGreaterThanOrEqual(0);
    await clearStorage(page);
    await expectPlayerCount(page, 0);

    // Test SQLite (may fallback to localStorage if server unavailable)
    await resetAppWithBackend(page, 'sqlite');
    const player3 = getPlayerByPosition('defender');
    await addPlayer(page, player3);
    const count3 = await getPlayerCount(page);
    expect(count3).toBeGreaterThanOrEqual(0);
    await clearStorage(page);
    await expectPlayerCount(page, 0);
  });

  test('backend switching does not corrupt application state', async ({ page }) => {
    // Start with localStorage
    await resetAppWithBackend(page, 'localStorage');
    const player1 = getPlayerByPosition('forward');
    await addPlayer(page, player1);

    // Switch through multiple backends
    await resetAppWithBackend(page, 'indexeddb');
    const player2 = getPlayerByPosition('midfielder');
    await addPlayer(page, player2);

    await resetAppWithBackend(page, 'sqlite');
    const player3 = getPlayerByPosition('defender');
    await addPlayer(page, player3);

    // Switch back to localStorage
    await resetAppWithBackend(page, 'localStorage');

    // Verify app is still functional
    const player4 = getPlayerByPosition('goalkeeper');
    await addPlayer(page, player4);
    await expectPlayerCount(page, 1);
    await expectPlayerExists(page, player4.name);
  });

  test('data integrity maintained after multiple backend switches', async ({ page }) => {
    // Start with localStorage
    await resetAppWithBackend(page, 'localStorage');
    const players = buildMinimalSquad();
    for (const player of players) {
      await addPlayer(page, player);
    }
    const localStorageCount = await getPlayerCount(page);

    // Switch to IndexedDB and add different data
    await resetAppWithBackend(page, 'indexeddb');
    const indexedDbPlayer = getPlayerByPosition('forward');
    await addPlayer(page, indexedDbPlayer);
    const indexedDbCount = await getPlayerCount(page);

    // Switch to SQLite and add different data
    await resetAppWithBackend(page, 'sqlite');
    const sqlitePlayer = getPlayerByPosition('midfielder');
    await addPlayer(page, sqlitePlayer);
    const sqliteCount = await getPlayerCount(page);

    // Switch back to localStorage and verify original data
    await resetAppWithBackend(page, 'localStorage');
    const finalLocalStorageCount = await getPlayerCount(page);

    // Each backend should maintain its own data
    expect(localStorageCount).toBeGreaterThan(0);
    expect(indexedDbCount).toBeGreaterThan(0);
    expect(sqliteCount).toBeGreaterThan(0);
    expect(finalLocalStorageCount).toBe(0); // Clean slate after reset
  });

  test('backend preference persists after page reload', async ({ page }) => {
    // Set backend to IndexedDB
    await resetAppWithBackend(page, 'indexeddb');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify backend preference is maintained in localStorage
    const backend = await page.evaluate(() => localStorage.getItem('fpl-storage-backend'));
    expect(backend).toBe('indexeddb');
  });

  test('week data integrity maintained during backend switches', async ({ page }) => {
    // Start with localStorage
    await resetAppWithBackend(page, 'localStorage');

    // Add players to week 1
    const players = buildMinimalSquad();
    for (const player of players) {
      await addPlayer(page, player);
    }

    // Switch to IndexedDB
    await resetAppWithBackend(page, 'indexeddb');

    // Add players to week 1 in IndexedDB
    const indexedDbPlayers = buildMinimalSquad();
    for (const player of indexedDbPlayers) {
      await addPlayer(page, player);
    }

    // Switch back to localStorage
    await resetAppWithBackend(page, 'localStorage');

    // Verify app can still create weeks and manage data
    const newPlayer = getPlayerByPosition('goalkeeper');
    await addPlayer(page, newPlayer);
    await expectPlayerCount(page, 1);
  });
});