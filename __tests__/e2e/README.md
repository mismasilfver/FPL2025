# E2E Test Documentation

This document provides comprehensive documentation for the End-to-End (E2E) test suite for the FPL Team Manager application using Playwright.

## Overview

The E2E test suite validates complete user workflows across all three storage backends (localStorage, IndexedDB, SQLite) using real browsers. These tests ensure the application works correctly from a user's perspective and that data persists appropriately.

## Test Structure

```
__tests__/e2e/
├── workflows/
│   ├── infrastructure.spec.js      # Setup and infrastructure validation
│   ├── player-lifecycle.spec.js    # Player CRUD operations
│   ├── captaincy.spec.js           # Captain/vice-captain management
│   ├── week-navigation.spec.js     # Week creation and navigation
│   └── cross-backend.spec.js       # Cross-backend data integrity
├── fixtures/
│   └── test-data.js                # Test data factories
├── helpers/
│   ├── storage-helpers.js          # Storage backend switching utilities
│   ├── ui-helpers.js               # Common UI interaction helpers
│   └── assertions.js               # Custom assertion helpers
└── README.md                       # This documentation
```

## Test Workflows

### 1. Infrastructure Tests (`infrastructure.spec.js`)
Validates that the E2E test infrastructure is working correctly:
- Page loads successfully
- Storage backend switching works for all three backends
- Storage clearing functionality
- Helper functions work as expected

### 2. Player Lifecycle Tests (`player-lifecycle.spec.js`)
Tests core player management operations across all backends:
- Adding single and multiple players
- Updating player details
- Toggling player owned status
- Deleting players
- Data persistence after page reload
- Sequential operations

### 3. Captaincy Tests (`captaincy.spec.js`)
Tests captain and vice-captain selection across all backends:
- Setting captain on owned players
- Setting vice-captain on owned players
- Captain/vice-captain persistence after reload
- Switching captain between players
- Having both captain and vice-captain simultaneously
- Same player as both captain and vice-captain

### 4. Week Navigation Tests (`week-navigation.spec.js`)
Tests weekly team management across all backends:
- Starting at week 1
- Week 1 edit mode
- Creating new weeks
- Week data copying
- Read-only mode for past weeks
- Week isolation (modifications don't affect other weeks)
- Captain selection persistence per week
- Navigation between weeks
- Multiple week creation
- Week data persistence after reload

### 5. Cross-Backend Tests (`cross-backend.spec.js`)
Tests data integrity and portability across backend switches:
- Data persistence when switching backends
- Adding data after backend switches
- Captain data within same backend
- Storage clearing across all backends
- Application state corruption prevention
- Data integrity after multiple switches
- Backend preference persistence
- Week data integrity during switches

## Running Tests

### Prerequisites

1. **Start the development server** (for SQLite backend tests):
   ```bash
   npm run start:server
   ```
   The Playwright config is set to automatically start the server, but you can also run it manually.

2. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

### Basic Commands

```bash
# Run all E2E tests
npx playwright test

# Run specific workflow test
npx playwright test __tests__/e2e/workflows/player-lifecycle.spec.js

# Run with UI mode for debugging
npx playwright test --ui

# Run with headed mode (visible browser)
npx playwright test --headed

# Run specific backend (via environment variable)
BACKEND=indexeddb npx playwright test

# Run specific test file
npx playwright test player-lifecycle

# Run tests in debug mode
npx playwright test --debug
```

### NPM Scripts

The following npm scripts are available in `package.json`:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific workflow
npm run test:e2e -- player-lifecycle
```

## Test Data

Test data is managed through factories in `fixtures/test-data.js`:

### Available Helpers

- `getPlayerByPosition(position)` - Get a single player by position
- `buildMinimalSquad()` - Build a minimal squad with players from all positions
- `buildFullSquad()` - Build a complete 15-player FPL squad

### Positions

- `goalkeeper`
- `defender` 
- `midfielder`
- `forward`

## Helper Functions

### Storage Helpers (`storage-helpers.js`)

- `setStorageBackend(page, backend)` - Switch storage backend
- `getStorageBackend(page)` - Get current backend
- `clearStorage(page)` - Clear all application data
- `waitForStorageReady(page, timeout)` - Wait for app initialization
- `resetAppWithBackend(page, backend)` - Reset app with specific backend
- `verifyPersistence(page, verifyFn)` - Verify data persists after reload

### UI Helpers (`ui-helpers.js`)

- `addPlayer(page, playerData)` - Add a player to the team
- `getPlayerCount(page)` - Get current player count
- `getPlayerRow(page, playerName)` - Get player row locator
- `deletePlayer(page, playerName)` - Delete a player
- `updatePlayer(page, playerName, updates)` - Update player details
- `togglePlayerOwned(page, playerName)` - Toggle player owned status
- `setCaptainStatus(page, playerName, status)` - Set captain/vice-captain
- `createNewWeek(page)` - Create a new week
- `navigateToWeek(page, weekNumber)` - Navigate to specific week
- `getCurrentWeekNumber(page)` - Get current week number
- `isReadOnlyMode(page)` - Check if current week is read-only
- `getTotalCost(page)` - Get total team cost

### Assertion Helpers (`assertions.js`)

- `expectPlayerExists(page, playerName)` - Assert player exists in UI
- `expectPlayerNotExists(page, playerName)` - Assert player doesn't exist
- `expectPlayerCount(page, count)` - Assert specific player count
- `expectCaptainStatus(page, playerName, status)` - Assert captain status
- `expectCurrentWeek(page, weekNumber)` - Assert current week
- `expectReadOnlyMode(page)` - Assert week is read-only
- `expectEditMode(page)` - Assert week is editable
- `expectErrorMessage(page, message)` - Assert error message is shown

## Configuration

Playwright configuration is in `playwright.config.js`:

- **Base URL**: `http://localhost:3000`
- **Test Directory**: `./__tests__/e2e`
- **Browsers**: Chromium (Firefox can be enabled)
- **Screenshots**: Taken only on failure
- **Trace**: Collected on first retry
- **Server**: Automatically starts Express server on port 3000

## Test Patterns

### Backend Testing Pattern

Most tests run across all three backends using this pattern:

```javascript
const BACKENDS = ['localStorage', 'indexeddb', 'sqlite'];

for (const backend of BACKENDS) {
  test.describe(`Feature Name - ${backend}`, () => {
    test.beforeEach(async ({ page }) => {
      await resetAppWithBackend(page, backend);
    });

    test('test description', async ({ page }) => {
      // Test implementation
    });
  });
}
```

### Persistence Testing Pattern

To verify data persists after page reload:

```javascript
test('data persists after reload', async ({ page }) => {
  // Setup data
  await addPlayer(page, playerData);
  
  // Reload
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Verify data still exists
  await expectPlayerExists(page, playerData.name);
});
```

### Week Navigation Pattern

For week-related tests:

```javascript
test('week isolation test', async ({ page }) => {
  // Setup week 1
  await addPlayer(page, player1);
  
  // Create week 2
  await createNewWeek(page);
  
  // Modify week 2
  await addPlayer(page, player2);
  
  // Navigate back to week 1
  await navigateToWeek(page, 1);
  
  // Verify week 1 unchanged
  await expectPlayerCount(page, 1);
});
```

## Storage Backend Behavior

### localStorage
- Default browser storage
- Data persists across sessions
- Limited to ~5MB
- Synchronous API

### IndexedDB
- Larger storage capacity
- Asynchronous API
- Better performance for large datasets
- More complex querying capabilities

### SQLite
- Server-based storage via Express API
- Most robust for production
- Requires server to be running
- Full SQL capabilities

**Important**: Each backend maintains separate data. Switching backends does not migrate data between them.

## Debugging

### Visual Debugging

Run tests in UI mode to see what's happening:
```bash
npx playwright test --ui
```

### Step-by-Step Debugging

Run in debug mode to step through tests:
```bash
npx playwright test --debug
```

### Headed Mode

Run with visible browser:
```bash
npx playwright test --headed
```

### Screenshots and Traces

On test failure, Playwright automatically:
- Takes a screenshot
- Records a trace

View traces:
```bash
npx playwright show-trace trace.zip
```

## Best Practices

1. **Use helper functions**: Always use the provided helpers instead of raw Playwright commands
2. **Wait for stability**: Use `waitForLoadState('networkidle')` after navigation
3. **Clean state**: Use `resetAppWithBackend` in beforeEach for clean test state
4. **Test isolation**: Each test should be independent and not rely on other tests
5. **Assert functionality**: Focus on user-visible behavior, not implementation details
6. **Cross-backend testing**: Test critical workflows across all backends
7. **Persistence testing**: Verify data persists after page reloads
8. **Error handling**: Test error cases and edge conditions

## Common Issues and Solutions

### Server Not Starting
- Ensure port 3000 is available
- Check that Node.js dependencies are installed
- Verify server.js exists and is valid

### SQLite Tests Failing
- Ensure Express server is running
- Check `/api/storage/root` endpoint is accessible
- Verify SQLite database permissions

### Timeout Issues
- Increase timeout in Playwright config
- Check for slow network conditions
- Verify server performance

### Flaky Tests
- Use proper waiting strategies
- Avoid hardcoded timing
- Ensure proper cleanup between tests

## Test Coverage

The current E2E test suite covers:

- ✅ Infrastructure and setup validation
- ✅ Player CRUD operations (3 backends × ~8 tests = 24 scenarios)
- ✅ Captaincy management (3 backends × ~7 tests = 21 scenarios)  
- ✅ Week navigation and management (3 backends × ~10 tests = 30 scenarios)
- ✅ Cross-backend data integrity (~11 scenarios)

**Total**: ~86 test scenarios across all backends

## Future Enhancements

Potential areas for additional E2E testing:

- Import/export functionality testing
- Error boundary and error handling testing
- Performance testing (load times, responsiveness)
- Accessibility testing (ARIA labels, keyboard navigation)
- Visual regression testing
- Mobile responsiveness testing
- Authentication flows (when implemented)

## Maintenance

When adding new features:

1. Add corresponding E2E tests in the appropriate workflow file
2. Update helper functions if new UI interactions are needed
3. Add test data factories if new data structures are required
4. Update this documentation with new test patterns
5. Run full test suite to ensure no regressions

## Continuous Integration

The E2E tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm install

- name: Start server
  run: npm run start:server &

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v2
  with:
    name: playwright-report
    path: playwright-report/
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [FPL Application README](../../../README.md)
- [Storage Adapters Documentation](../../../docs/storage-adapters.md)