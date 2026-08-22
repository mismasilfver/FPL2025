# E2E Test Troubleshooting Guide

This guide helps you diagnose and resolve common issues when running or developing E2E tests for the FPL Team Manager application.

## Quick Diagnostic Commands

```bash
# Check if server is running
curl http://localhost:3000/health

# Check Playwright installation
npx playwright --version

# Run specific test with debug output
npx playwright test --debug

# Run tests with verbose output
DEBUG=pw:api npx playwright test
```

## Common Issues and Solutions

### 1. Server Connection Issues

**Symptoms:**
- Tests fail with "Connection refused" or "ECONNREFUSED"
- Timeout errors when accessing `http://localhost:3000`
- "webServer" fails to start

**Solutions:**
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill process using port 3000
kill -9 <PID>

# Start server manually to test
npm run start:server

# Verify server health
curl http://localhost:3000/health
```

**Prevention:**
- The Playwright config should automatically start the server
- Ensure `reuseExistingServer: true` is set in config
- Check server startup timeout (currently 120 seconds)

### 2. SQLite Backend Failures

**Symptoms:**
- Tests fail only when using SQLite backend
- Errors mentioning `/api/storage/root`
- "Network error" when accessing storage API

**Solutions:**
```bash
# Verify server is running
npm run start:server

# Check server logs for SQLite errors
# Look for database initialization issues

# Manually test API endpoint
curl -X GET http://localhost:3000/api/storage/root
curl -X PUT http://localhost:3000/api/storage/root -H "Content-Type: application/json" -d '{"players":[]}'
```

**Common SQLite Issues:**
- Database file permissions
- Missing better-sqlite3 dependency
- Database file corruption
- Server not running SQLite routes

**Fix:**
```bash
# Reinstall dependencies
npm install

# Check database file location
# Usually in project root or temp directory

# Reset database
rm -f fpl-database.db
npm run start:server
```

### 3. Timeout Issues

**Symptoms:**
- Tests fail with "Timeout 30000ms exceeded"
- Elements not found within timeout period
- Slow test execution

**Solutions:**

**Increase timeout in config:**
```javascript
// playwright.config.js
use: {
  actionTimeout: 60000,  // Increase from default 30000
  navigationTimeout: 60000,
}
```

**Add explicit waits in tests:**
```javascript
// Instead of hardcoded timeouts
await page.waitForTimeout(5000);

// Use proper wait strategies
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 });
await page.waitForLoadState('networkidle');
```

**Optimize server performance:**
- Check server logs for slow operations
- Optimize database queries
- Reduce test data size

### 4. Flaky Tests

**Symptoms:**
- Tests pass sometimes, fail other times
- Inconsistent results across runs
- Race conditions

**Solutions:**

**Add proper waiting:**
```javascript
// Wait for specific conditions
await page.waitForSelector('[data-testid="save-button"]:not([disabled])');
await page.waitForFunction(() => window.fplManager !== undefined);
```

**Use retry logic:**
```javascript
// playwright.config.js
retries: 2, // Retry failed tests twice
```

**Improve test isolation:**
```javascript
test.beforeEach(async ({ page }) => {
  // Ensure clean state
  await resetAppWithBackend(page, 'localstorage');
  await clearStorage(page);
});
```

**Check for timing issues:**
- Avoid `waitForTimeout` when possible
- Use `waitForLoadState('networkidle')` after navigation
- Wait for specific UI elements, not arbitrary time

### 5. Selector Issues

**Symptoms:**
- "Element not found" errors
- Selectors work in one test but not another
- Changes in DOM break tests

**Solutions:**

**Use data-testid attributes:**
```html
<!-- In your HTML -->
<button data-testid="add-player-button">Add Player</button>

<!-- In tests -->
await page.click('[data-testid="add-player-button"]');
```

**Use robust selectors:**
```javascript
// Bad - fragile
await page.click('div.container > button:nth-child(2)');

// Good - stable
await page.click('[data-testid="save-button"]');

// Good - text-based with role
await page.click('button:has-text("Save")');
```

**Debug selectors:**
```bash
# Run in UI mode to inspect selectors
npx playwright test --ui

# Use Playwright codegen to generate selectors
npx playwright codegen http://localhost:3000
```

### 6. Storage Backend Switching Issues

**Symptoms:**
- Backend switching doesn't work
- Data doesn't persist after switch
- Tests fail on specific backends

**Solutions:**

**Verify localStorage is working:**
```javascript
// In browser console
localStorage.setItem('test', 'value');
console.log(localStorage.getItem('test')); // Should return 'value'
```

**Check IndexedDB:**
```javascript
// In browser console
const request = indexedDB.open('fpl-db', 1);
request.onsuccess = () => console.log('IndexedDB working');
```

**Verify SQLite server routes:**
```bash
# Test API endpoints
curl http://localhost:3000/api/storage/root
curl -X PUT http://localhost:3000/api/storage/root -H "Content-Type: application/json" -d '{"players":[]}'
```

**Check helper functions:**
```javascript
// Ensure storage-helpers.js functions are working
await resetAppWithBackend(page, 'localstorage');
const backend = await getStorageBackend(page);
console.log('Current backend:', backend); // Should be 'localstorage'
```

### 7. Browser/Environment Issues

**Symptoms:**
- Tests work locally but fail in CI
- Different behavior across browsers
- Display/DPI issues in headless mode

**Solutions:**

**Check browser installation:**
```bash
# Install Playwright browsers
npx playwright install chromium

# Install all browsers
npx playwright install
```

**Run headed for debugging:**
```bash
npx playwright test --headed
```

**Check CI environment:**
```yaml
# In CI config
- name: Install browsers
  run: npx playwright install --with-deps

- name: Install system dependencies
  run: npx playwright install-deps
```

**Handle different screen sizes:**
```javascript
// Set viewport in test
await page.setViewportSize({ width: 1280, height: 720 });
```

### 8. Data Persistence Issues

**Symptoms:**
- Data disappears after page reload
- Tests fail on persistence checks
- Inconsistent storage behavior

**Solutions:**

**Verify storage backend is set:**
```javascript
const backend = await getStorageBackend(page);
console.log('Backend:', backend); // Should not be null/undefined
```

**Check storage is actually being written:**
```javascript
// After adding data
await page.evaluate(() => {
  console.log('localStorage:', JSON.stringify(localStorage));
  console.log('Players:', localStorage.getItem('fpl-team-data'));
});
```

**Wait for storage operations:**
```javascript
// After operations that save data
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Small buffer for async storage
```

**Check for storage quota issues:**
```javascript
// localStorage quota (usually 5MB)
// IndexedDB quota (usually much larger)
// SQLite (limited by disk space)
```

### 9. Import/Export Test Failures

**Symptoms:**
- Import/export tests fail
- File upload/download issues
- JSON parsing errors

**Solutions:**

**Test file handling:**
```javascript
// Use proper file input handling
await page.setInputFiles('[type="file"]', './test-data.json');

// Verify file was uploaded
const files = await page.inputFiles('[type="file"]');
console.log('Uploaded files:', files);
```

**Check JSON format:**
```javascript
// Verify test data is valid JSON
const data = require('./fixtures/test-data.json');
JSON.stringify(data); // Should not throw
```

**Handle download dialogs:**
```javascript
// Handle download events
const downloadPromise = page.waitForEvent('download');
await page.click('[data-testid="export-button"]');
const download = await downloadPromise;
console.log('Downloaded:', download.suggestedFilename());
```

### 10. Performance Issues

**Symptoms:**
- Tests run very slowly
- Browser becomes unresponsive
- Memory usage grows during tests

**Solutions:**

**Optimize test data:**
```javascript
// Use minimal test data
const player = getPlayerByPosition('forward'); // Instead of full squad

// Clean up between tests
test.afterEach(async ({ page }) => {
  await clearStorage(page);
});
```

**Reduce browser instances:**
```javascript
// playwright.config.js
workers: 1, // Run tests sequentially instead of parallel
```

**Close pages/browsers:**
```javascript
test.afterEach(async ({ page }) => {
  await page.close();
});
```

**Profile performance:**
```bash
# Run with Chrome DevTools
npx playwright test --debug --project=chromium
```

## Debugging Techniques

### 1. Interactive Debugging

```bash
# Run in debug mode with step-through
npx playwright test --debug

# Run in UI mode with time-travel debugging
npx playwright test --ui
```

### 2. Logging and Inspecting

```javascript
// Add console logging in tests
console.log('Current player count:', await getPlayerCount(page));

// Inspect page state
const html = await page.content();
console.log('Page HTML:', html);

// Evaluate JavaScript in browser context
const result = await page.evaluate(() => {
  return window.fplManager.players.length;
});
console.log('Player count in browser:', result);
```

### 3. Screenshots and Videos

```javascript
// Take manual screenshot
await page.screenshot({ path: 'debug-screenshot.png' });

// Enable video recording in config
use: {
  video: 'retain-on-failure',
}
```

### 4. Network Monitoring

```javascript
// Monitor network requests
page.on('request', request => console.log('Request:', request.url()));
page.on('response', response => console.log('Response:', response.url()));

// Wait for specific requests
await page.waitForResponse('**/api/storage/root');
```

### 5. Trace Viewing

```bash
# After test failure, view the trace
npx playwright show-trace trace.zip
```

## Getting Help

### Check Documentation
- [Playwright Documentation](https://playwright.dev/)
- [FPL E2E Test Documentation](./README.md)
- [Storage Adapters Documentation](../../../docs/storage-adapters.md)

### Community Resources
- [Playwright GitHub Issues](https://github.com/microsoft/playwright/issues)
- [Stack Overflow - Playwright Tag](https://stackoverflow.com/questions/tagged/playwright)

### Internal Resources
- Check application logs in console
- Review server logs for backend issues
- Inspect browser DevTools for client-side issues

## Maintenance Checklist

Regular maintenance to prevent issues:

- [ ] Keep Playwright updated: `npm install @playwright/test@latest`
- [ ] Keep browsers installed: `npx playwright install`
- [ ] Review and update flaky tests
- [ ] Clean up test data and temporary files
- [ ] Monitor test execution time
- [ ] Review and update selectors after UI changes
- [ ] Check for deprecated Playwright APIs
- [ ] Verify CI/CD environment configuration

## Test Environment Setup

### Local Development
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Start server (optional, Playwright config handles this)
npm run start:server

# Run tests
npx playwright test
```

### CI/CD Setup
```yaml
# Example GitHub Actions
- name: Setup Node.js
  uses: actions/setup-node@v2
  with:
    node-version: '18'

- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v2
  with:
    name: playwright-report
    path: playwright-report/
```

## Performance Optimization

### Reduce Test Execution Time

1. **Parallel test execution**: Configure appropriate number of workers
2. **Optimize test data**: Use minimal required data
3. **Reuse browser contexts**: Where appropriate
4. **Cache operations**: Avoid redundant setup
5. **Selective test runs**: Run only affected tests during development

### Memory Management

1. **Close pages after tests**: Prevent memory leaks
2. **Clean up storage**: Reset state between tests
3. **Limit test data size**: Avoid large datasets
4. **Monitor memory usage**: Identify memory leaks

## Contact and Support

If you encounter issues not covered in this guide:

1. Check the main project README for application-specific issues
2. Review Playwright documentation for framework issues
3. Check server logs for backend issues
4. Create minimal reproducible test case
5. Document environment details (OS, Node version, browser versions)