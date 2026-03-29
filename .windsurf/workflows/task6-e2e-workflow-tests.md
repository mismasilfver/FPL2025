# Task 6: E2E Workflow Testing with Playwright

## Overview
Implement comprehensive end-to-end workflow tests using Playwright to verify complete user journeys across all three storage backends: localStorage, IndexedDB, and SQLite.

## Why Playwright

- **Real Browser Testing**: Tests actual Chrome/Firefox, not JSDOM mocks
- **Visual Verification**: Can verify DOM changes, screenshots on failure
- **Multi-Backend Testing**: Switch storage backends via URL params or localStorage config
- **Already Available**: Via mcp-playwright server in this environment
- **Modern API**: More reliable than Puppeteer for complex interactions

## Critical User Workflows to Test

### Workflow 1: Player Management Lifecycle
1. Create new week
2. Add 3 players to team (different positions)
3. Update player details (price, team, status)
4. Toggle player "have" status
5. Delete a player
6. Reload page and verify persistence

### Workflow 2: Captaincy Management
1. Add multiple players
2. Set captain (verify only owned players eligible)
3. Set vice-captain
4. Attempt to set captain to unowned player (verify error)
5. Switch captain to different player
6. Reload and verify persistence

### Workflow 3: Week Navigation & History
1. Create week 1, add players, set captain
2. Create week 2 (verify copy of week 1 state)
3. Modify week 2 differently (different players/captain)
4. Navigate back to week 1
5. Verify week 1 is read-only, data unchanged
6. Navigate to week 2
7. Verify week 2 data is isolated

### Workflow 4: Cross-Backend Data Integrity
1. Save data with localStorage backend
2. Switch to IndexedDB backend
3. Verify data is accessible and consistent
4. Switch to SQLite backend
5. Verify data persists across backend switches

## Implementation Approach

### Phase-by-Phase Execution
1. **Confirm phase plan with user** before starting each phase - review the specific tasks, test cases, and expected outcomes
2. **Use TDD approach** - write failing tests first, then implement to make them pass
3. **Follow conventional commit style** - use `test(e2e)`, `feat(e2e)`, `refactor(e2e)` prefixes
4. **Create commit after each phase ends** - mark completion before moving to next phase

### Commit Message Pattern
```
test(e2e): add player lifecycle workflow tests

- Add Playwright spec for player CRUD operations
- Test across all three storage backends
- Verify persistence after page reload

feat(e2e): implement storage switching helpers

- Add setStorageBackend() helper function
- Add clearStorage() for test isolation
- Add waitForStorageReady() utility
```

## Implementation Plan (6 hours)

### Phase 1: Setup & Infrastructure (1.5 hours)

**1.1 Create test structure**
```
__tests__/e2e/
├── workflows/
│   ├── player-lifecycle.spec.js
│   ├── captaincy.spec.js
│   ├── week-navigation.spec.js
│   └── cross-backend.spec.js
├── fixtures/
│   └── test-data.js
├── helpers/
│   ├── storage-helpers.js    # Switch backends
│   ├── ui-helpers.js         # Common UI actions
│   └── assertions.js         # Custom assertions
└── playwright.config.js
```

**1.2 Create storage switching mechanism**
```javascript
// helpers/storage-helpers.js
async function setStorageBackend(page, backend) {
  // Via localStorage config or URL param
  await page.evaluate((be) => {
    localStorage.setItem('fpl-storage-backend', be);
  }, backend);
  await page.reload();
}
```

**1.3 Create common UI helpers**
```javascript
// helpers/ui-helpers.js
async function addPlayer(page, playerData) {
  await page.click('[data-testid="add-player-button"]');
  await page.fill('[name="playerName"]', playerData.name);
  await page.selectOption('[name="position"]', playerData.position);
  await page.fill('[name="price"]', String(playerData.price));
  await page.click('[type="submit"]');
}

async function getPlayerCount(page) {
  return page.locator('.player-row').count();
}
```

### Phase 2: Implement Core Workflows (2.5 hours)

**2.1 Player Lifecycle Tests**
- Test with localStorage
- Test with IndexedDB
- Test with SQLite

**2.2 Captaincy Management Tests**
- Test across all 3 backends
- Verify error handling
- Verify persistence

**2.3 Week Navigation Tests**
- Test week creation
- Test read-only enforcement
- Test data isolation

### Phase 3: Cross-Backend Tests (1 hour)

- Test data portability
- Test backend switching
- Test data integrity

### Phase 4: Documentation & Verification (1 hour)

- Document test patterns
- Create troubleshooting guide
- Run full suite: `npx playwright test`
- Verify all tests pass

## Test Configuration

### Playwright Config
```javascript
// playwright.config.js
module.exports = {
  testDir: '__tests__/e2e',
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
};
```

### Test Data Strategy
```javascript
// fixtures/test-data.js
export const testPlayers = [
  // Forwards (3)
  { name: 'Erling Haaland', position: 'forward', price: 12.5, team: 'Man City' },
  { name: 'Harry Kane', position: 'forward', price: 11.5, team: 'Bayern Munich' },
  { name: 'Ollie Watkins', position: 'forward', price: 8.5, team: 'Aston Villa' },
  
  // Midfielders (3)
  { name: 'Mohamed Salah', position: 'midfielder', price: 11.0, team: 'Liverpool' },
  { name: 'Bukayo Saka', position: 'midfielder', price: 9.5, team: 'Arsenal' },
  { name: 'Martin Odegaard', position: 'midfielder', price: 8.0, team: 'Arsenal' },
  
  // Defenders (3)
  { name: 'Trent Alexander-Arnold', position: 'defender', price: 7.5, team: 'Liverpool' },
  { name: 'William Saliba', position: 'defender', price: 6.0, team: 'Arsenal' },
  { name: 'Reece James', position: 'defender', price: 5.5, team: 'Chelsea' },
];

// Helper to build full 15-player squad
export const buildFullSquad = () => {
  const goalkeepers = [
    { name: 'Alisson', position: 'goalkeeper', price: 5.5, team: 'Liverpool' },
    { name: 'David Raya', position: 'goalkeeper', price: 5.0, team: 'Arsenal' },
  ];
  
  // Use 2 GKs, 5 DEF, 5 MID, 3 FWD = 15 players (FPL standard)
  return [
    ...goalkeepers,
    ...testPlayers.filter(p => p.position === 'defender').slice(0, 5),
    ...testPlayers.filter(p => p.position === 'midfielder').slice(0, 5),
    ...testPlayers.filter(p => p.position === 'forward').slice(0, 3),
  ];
};
```

## Running Tests

```bash
# Run all E2E tests
npx playwright test __tests__/e2e

# Run specific workflow
npx playwright test __tests__/e2e/workflows/player-lifecycle.spec.js

# Run with UI mode for debugging
npx playwright test --ui

# Run specific backend
BACKEND=indexeddb npx playwright test
```

## Success Criteria

- [ ] All 4 workflows tested across 3 backends = 12+ test scenarios
- [ ] Screenshots on failure for debugging
- [ ] Tests complete in < 2 minutes total
- [ ] No flaky tests (retry-consistent)
- [ ] Clean test exit (no hanging processes)

## Notes for Implementation

1. **Start local server** before tests: `npm run dev` or similar
2. **Clear storage** between tests to ensure isolation
3. **Use data-testid attributes** in UI for reliable selectors
4. **Wait for network idle** after storage operations
5. **Take baseline screenshots** for visual regression (optional)

## Implementation Context

**Start new context window** for implementation to keep work clean and focused.