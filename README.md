# My Fantasy Premier League 2025/2026

A simple, responsive web application to manage your Fantasy Premier League team. Perfect for tracking players, prices, and team strategy on both desktop and mobile devices.

## Features

- **Player Management**: Add, edit, and delete players from your team
- **Required Fields**: Player name, position (Goalkeeper/Defence/Midfield/Forward), team, and price
- **Optional Fields**: Captain/Vice Captain selection and personal notes
- **Color-coded Status System**:
  - 🟡 Yellow: Maybe Good
  - 🟢 Green: Very Good
  - 🔴 Red: Sell/Don't Buy
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Storage Adapters**: Data persists between sessions using a pluggable storage layer (localStorage by default, IndexedDB or SQLite optional)
- **Position Filtering**: Filter players by position
- **Team Summary**: Track total players (0/15) and total team value
- **Data Import/Export**: Export any week to JSON and import saved snapshots to keep history portable across devices
- **Resilient Storage Selection**: Built-in health checks surface warnings and automatically fall back when a backend is unavailable

## How to Use

1. **Add Players**: Click "Add Player" to add new players to your team
2. **Edit Players**: Click "Edit" next to any player to modify their details
3. **Set Captain**: Click "C" button to set/unset captain
4. **Set Vice Captain**: Click "VC" button to set/unset vice captain
5. **Filter**: Use the position dropdown to filter by player position
6. **Delete**: Click "Delete" to remove players from your team
7. **Export**: Use the "Export Week Data" button to download the current week as JSON (disabled in read-only weeks)
8. **Import**: Choose a JSON file via the Import controls to merge an existing snapshot into the current state

## Import & Export Workflow

- **Exports** capture only the currently selected week. The download is named `fpl-data-week-<week>.json` for fast sharing.
- **Imports** accept legacy single-week payloads and modern v2 schemas. The imported week is normalized, derived fields are recomputed, and the UI refreshes automatically.
- **Validation**: Invalid JSON files surface actionable alerts in the UI so you can correct issues quickly.

## Weekly Management

Manage your team week-by-week with built-in navigation and read-only safeguards.

- **Controls**: `Prev`, `Next`, and `Create New Week` in the header with a `Week N` label.
- **Read-only Mode**: Past weeks are read-only. Editing controls are disabled and the "Read-only" badge appears.
- **Editing**: Only the current week is editable. Add/Edit/Delete, Captain/VC, and team membership toggles are disabled in read-only weeks.
- **Navigation**: `Prev` is disabled on week 1. `Next` is disabled on the last available week.
- **Create New Week**: Clones players from the current week (including captain/vice) and snapshots the team into the new week. Previous weeks are marked read-only.
  - Note: Captain and Vice-Captain selections are copied to the new week. Changing them in a later week does not alter previous weeks (historical integrity).

The default adapter writes to `localStorage` under `fpl-team-data` using a weekly schema:

```json
{
  "version": "2.0",
  "currentWeek": 2,
  "weeks": {
    "1": {
      "players": [],
      "captain": null,
      "viceCaptain": null,
      "teamMembers": [],
      "teamStats": { "totalValue": 0, "playerCount": 0, "createdDate": "..." },
      "isReadOnly": true
    },
    "2": { "players": [...], "captain": "...", "viceCaptain": "...", "teamMembers": [...], "teamStats": { ... }, "isReadOnly": false }
  }
}
```

Related tests: `__tests__/weekNavigation.test.js`, `__tests__/readonlyMode.test.js`.

## Storage Architecture

- **Adapter contract**: `js/adapters/database-adapter.contract.js` defines the required async API.
- **Local adapter**: `js/adapters/local-storage-adapter.js` wraps `window.localStorage` and satisfies the contract.
- **IndexedDB adapter**: `js/adapters/indexeddb-adapter.js` provides an IndexedDB-backed implementation.
- **SQLite adapter**: `js/adapters/sqlite-adapter.js` speaks to the local Express/SQLite API for fully offline durability.
- **Feature flag**: Toggle `window.USE_INDEXED_DB` in `index.html` to switch between adapters at runtime.
- **App initializer**: `js/app-init.js` negotiates storage availability, applies async patches, raises diagnostics, and updates the UI indicator.
- **High-level services**: `js/storage.js`, `js/storage-db.js`, and `js/storage-module.js` orchestrate week persistence on top of the adapter layer.
- **Adapter contract tests**: `__tests__/database.test.js` runs the same suite against every registered adapter, ensuring consistent behaviour across the low-level key/value layer.
- **Storage service contract tests** *(new)*: `__tests__/storage-contract.test.js` exercises the high-level storage facade (localStorage, IndexedDB, SQLite) with shared happy-path and defensive scenarios. Run with `npm test -- __tests__/storage-contract.test.js` to verify the three-backend flow end-to-end.
- **Further reading**: `docs/storage-adapters.md` provides a deeper dive into the adapter contract and how to extend it.

### Switching storage backends

- **In-app toggle**: Use the storage dropdown in the header to choose between **localStorage**, **IndexedDB**, or **SQLite**. The preference is stored in `localStorage` (`fpl-storage-backend`) and the app reloads automatically.
- **Command-line toggle**: Run `npm run use:localstorage`, `npm run use:indexeddb`, or `npm run use:sqlite` to change the default backend written to `storage-config.js`. This is useful for automated environments or CI.
- **Health check & fallback**: Selecting SQLite triggers a `/api/storage/root` health check. Failures disable the option, display a warning, persist a safe fallback, and keep localStorage active.
- **Testing tip**: Before running integration tests that exercise IndexedDB behaviour, set `window.USE_INDEXED_DB = true` or run `npm run use:indexeddb`. For SQLite flows, start the Express server (`npm run start:server`) so `/api/storage/*` routes are available.

## Running Locally

To run this project on your local machine:

1.  **Clone the repository or download the files.**
2.  **Navigate to the project directory** in your terminal.
3.  **Start a simple web server.** If you have Python 3 installed, you can use its built-in HTTP server:
    ```bash
    python3 -m http.server 8080
    ```
4.  **Open your browser** and go to `http://localhost:8080`.

Alternatively, you can simply open the `index.html` file directly in your web browser for localStorage/IndexedDB experiments. To exercise the SQLite backend you must run the API server first:

```bash
npm install
npm run start:server     # production-like server
# or npm run dev:server  # nodemon watch mode for local iteration
# In another terminal serve the front-end (e.g. python3 -m http.server)
```

## Testing

This project includes a comprehensive test suite to ensure functionality works correctly.

### Prerequisites

- **Node.js** (version 14 or higher) must be installed on your system
- You can download Node.js from [nodejs.org](https://nodejs.org/)

### Running Tests

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

2. **Run the test suite**:
   ```bash
   npm test
   ```

### Test Coverage

The test suite includes:
- **Player Management Tests**: Adding, editing, and deleting players
- **Form Validation Tests**: Required field validation and error handling
- **Captaincy Tests**: Setting and switching captain/vice-captain roles
- **UI Interaction Tests**: Button clicks and form submissions
- **Storage Contract Tests**: `__tests__/database.test.js` verifies that every storage adapter (localStorage, IndexedDB, SQLite) adheres to the shared database contract. Run with `npm test -- __tests__/database.test.js` for a focused check.
- **Storage Service Contract Tests** *(new)*: `__tests__/storage-contract.test.js` validates the factory-created storage services across all backends, including legacy helpers and defensive failure paths. Run with `npm test -- __tests__/storage-contract.test.js`.
- **SQLite End-to-End Tests**: `__tests__/storage.sqlite.e2e.test.js` spins up the Express server in-memory and exercises the HTTP API. Run with `npm test -- __tests__/storage.sqlite.e2e.test.js`.
- **App Initialization Tests**: `__tests__/app-init.test.js` verifies storage selection UI, IndexedDB fallback timing, and SQLite health checks.

All tests use Jest with JSDOM for DOM simulation and comprehensive coverage of user interactions.

## Deployment to GitHub Pages

1. Create a new repository on GitHub
2. Upload these files: `index.html`, `styles.css`, `script.js`, and `README.md`
3. Go to repository Settings → Pages
4. Select "Deploy from a branch" and choose "main" branch
5. Your app will be available at `https://yourusername.github.io/repository-name`

## Files Structure

- `index.html` - Main HTML structure
- `styles.css` - Responsive CSS styling
- `script.js` - JavaScript functionality and data management
- `README.md` - This documentation
- `__tests__/` - Test files for Jest
- `test-utils.js` - Testing utilities and helpers
- `package.json` - Node.js dependencies and scripts
- `babel.config.js` - Babel configuration for testing

## Browser Compatibility

Works on all modern browsers including:
- Chrome/Edge (Desktop & Mobile)
- Safari (Desktop & Mobile)
- Firefox (Desktop & Mobile)

## Data Storage

- **Default**: Browser `localStorage` (via `LocalStorageKeyValueAdapter`).
- **IndexedDB option**: Enable `window.USE_INDEXED_DB = true` to use `IndexedDBKeyValueAdapter` for larger datasets and richer querying.
- **Extensibility**: Additional adapters can be created by implementing the contract defined in `js/adapters/database-adapter.contract.js` and registering them in `__tests__/database.test.js` to gain test coverage.

## Future roadmap ideas
- proper database to allow at minimum local persistent storage
- enable local server accessible from internet 
- utilize online hosted database to allow multidevice usage
- authentication to protect data to myself only


## Potential implementation of database and authentication (online)
- use firebase or supabase for database or SQLite for fully offline db
- use firebase or supabase authentication for authentication

## Lessons learned about using agentic AI (Windsurf)
- good tests are important (duh)
- refactoring is important (duh)
- but what is more important as the driver of the AI is to know good test coverage before refactoring is important
- due to undeterministic nature of these models (Claude 4, Gemini 2.5 Pro, GPT-5 low reasoning), even with "knowing" what model is good for what kind of issue, it is not possible to predict the outcome.

---

**Note**: This is an MVP (Minimum Viable Product) version. All player and team data must be entered manually.

### Recent changes (storage + testing)

- Added SQLite HTTP API mock for TDD: `test-utils/sqlite-api-mock.js` used by `__tests__/storage-module.test.js` to validate GET/PUT flows without a real server.
- Created real server harness helpers:
  - In-memory DB: `test-utils/create-sqlite-test-server.js`
  - Disk-backed DB (temp dir): `test-utils/create-sqlite-disk-test-server.js`
- New integration tests using the helpers:
  - Helper coverage: `__tests__/sqlite-server.helper.test.js`, `__tests__/sqlite-disk-server.helper.test.js`
  - Storage service E2E: `__tests__/sqlite-storage.service.e2e.test.js`
  - Server HTTP API E2E (refactored to helper): `__tests__/storage.sqlite.e2e.test.js`
- Factory improvements: `createStorageService` now forwards `baseUrl`, `fetchImpl`, and `storageKey` to `SQLiteStorageService`.
- Added npm scripts: `test:all`, `test:fast`, `test:storage`, `test:ui`, `test:storage:int`.
- Cleaned up temporary debug logs in tests and services.
- Import/export flow now ships in `js/app-init.js` and `js/import-export.js`, allowing users to move weekly snapshots between environments.
- Storage dropdown layering ensures the menu renders above controls, and SQLite availability is surfaced with inline warnings plus automatic fallback and preference persistence.
- Diagnostics: initialization attempts, fallbacks, and errors are captured via `window.fplInitDiagnostics` for easier troubleshooting in tests and during manual runs.
- Strengthened `__tests__/app-init.test.js` to assert the new UI layers, health checks, and fallback behaviour end-to-end.

### Test filtering presets

```bash
npm run test:all            # run everything
npm run test:fast           # run with workers for speed
npm run test:storage        # local + IndexedDB + SQLite mock
npm run test:ui             # DOM + modal subset
npm run test:storage:int    # SQLite integration (server-based)
```

### Additional coverage notes

- SQLite End-to-End: `__tests__/storage.sqlite.e2e.test.js` uses the new helper to spin up the Express server and exercises the HTTP API.
- SQLite Helper Tests: `__tests__/sqlite-server.helper.test.js` (in-memory) and `__tests__/sqlite-disk-server.helper.test.js` (disk-backed) validate the server harness utilities.
- SQLite Storage Service E2E: `__tests__/sqlite-storage.service.e2e.test.js` runs `SQLiteStorageService` against the real HTTP server via the helper, including error-path coverage.

### Additional files

- `test-utils/` – Testing utilities and helpers:
  - `sqlite-api-mock.js` — mock for `/api/storage/root` used in unit tests
  - `create-sqlite-test-server.js` — in-memory server harness for E2E
  - `create-sqlite-disk-test-server.js` — disk-backed server harness for E2E
- `server/` – Express + SQLite API (storage routes and database module)
