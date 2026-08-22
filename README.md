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
- **Team Summary**: Track total players (0/15), total team value, total points, and gameweek points
- **Data Import/Export**: Export any week to JSON and import saved snapshots to keep history portable across devices
- **Resilient Storage Selection**: Built-in health checks surface warnings and automatically fall back when a backend is unavailable
- **Multi-Team Support**: Manage one primary team (linked to your real FPL account) plus any number of independent "what-if" teams, switchable from a dropdown
- **FPL API Integration**: Import your real FPL squad (including captain/vice-captain) by entry ID, and refresh player points/prices from the live FPL data with one click — see [FPL API Integration](#fpl-api-integration) below

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

Related tests: `__tests__/week-navigation.integration.test.js`, `__tests__/readonly-mode.integration.test.js`, `__tests__/e2e/workflows/week-navigation.spec.js`.

## Multi-Team Support

- **Primary team**: The one team that can be linked to a real FPL account via its entry ID.
- **What-if teams**: Click `+ Team` to create additional independent teams for experimenting with different squads. Each has its own players, weeks, captain/vice-captain, and points — switching teams via the `Team:` dropdown never mixes data between teams.
- **Managed by**: `js/services/team-service.js` (team CRUD, active-team resolution, FPL rule validation) and `js/services/team-sync-coordinator.js` (orchestrates FPL sync/import and team switching, including UI refresh and error handling).
- **Not yet implemented**: budget (£100m) and squad composition (2 GK / 5 DEF / 5 MID / 3 FWD, max 3 players per real-world club) rule validation exists in `TeamService.validateFplRules()` but is **not currently surfaced anywhere in the UI** — a what-if team can be saved in an invalid state with no warning. See [Roadmap](#future-roadmap-ideas).

## FPL API Integration

The app can talk to the public Fantasy Premier League API to pull in real data, entirely on top of the manual player-management workflow above — you can use the app fully offline/manually, or link it to a real FPL account for the primary team.

- **Save your FPL entry ID**: Enter your numeric FPL entry/manager ID (found in the URL when viewing your team on the official FPL site) in the `FPL ID` field and click `Save`.
- **Import My Squad**: Fetches your actual current squad (all 15 players) and captain/vice-captain for the current gameweek from the FPL API and **replaces** the primary team's active-week player list with it. Use this to pull your real team into the app for the first time, or to re-sync after making transfers on the official site.
- **SYNC**: Refreshes points, price, form, and availability for players **already in your list** by matching them against the live FPL bootstrap data via their FPL ID. Players added manually (without an FPL ID) are left untouched — SYNC is a metadata refresh, not a squad import (use "Import My Squad" for that).
- **Server-side proxy required**: `fantasy.premierleague.com` does not send CORS headers, so the app cannot call it directly from browser JavaScript. All FPL requests are proxied through this app's own Express server (`server/routes/fpl.js`, mounted at `/api/fpl/*`), which forwards to the real FPL API server-side and returns the JSON to the browser. This means **SYNC and Import My Squad both require the Express server to be running** (`npm run start:server`) — they will not work if you're only opening `index.html` directly in a browser.
- **Client**: `js/services/fpl-api.js` (`FplApiClient`) wraps `bootstrap-static` and `entry/{id}/event/{gw}/picks` and normalizes FPL's raw player data into the app's player shape.

### Current limitations of the FPL integration

- **Import only targets the *current* gameweek** (`getCurrentGameweek()` reads the `is_current`/`is_next` flags from FPL's bootstrap data) — there's no way to view or import a specific past gameweek's squad.
- **No transfer tracking**: importing simply replaces the squad snapshot; the app does not track transfers in/out, transfer costs (-4 point hits), or transfer history.
- **No FPL chips support** (Wildcard, Free Hit, Bench Boost, Triple Captain). The app's "what-if" teams are a different, app-specific concept and are not connected to real FPL chip usage.
- **No automatic gameweek rollover tied to FPL's calendar**: the app's week numbering (`Create New Week`) is independent of the real FPL gameweek/deadline schedule, so they can drift out of sync.
- **No budget/squad-rule validation in the UI** for what-if teams (see [Multi-Team Support](#multi-team-support) above).
- **No caching of bootstrap data**: every SYNC or Import re-fetches the full ~700-player bootstrap dataset from FPL (via the server proxy) with no local cache or ETag support.
- **Fully manual, one-shot sync**: there is no background/scheduled sync — you must click SYNC or Import My Squad yourself each time you want fresh data.
- **No live/provisional bonus points, price-change history, fixture difficulty ratings, or mini-league/rank data.**

## Storage Architecture

- **Adapter contract**: `js/storage/adapters/database-adapter.contract.js` defines the required async API (`getRootData`/`setRootData`/legacy `getItem`/`setItem`).
- **Local adapter**: `js/storage/adapters/local-storage-adapter.js` wraps `window.localStorage` and satisfies the contract.
- **IndexedDB adapter**: `js/storage/adapters/indexeddb-adapter.js` persists the full root payload (including the multi-team `teams`/`currentTeam`/`settings` shape) as a JSON blob, with legacy per-week object stores kept in sync only for backward-compatible single-team roots.
- **SQLite adapter**: `js/storage/adapters/sqlite-adapter.js` speaks to the local Express/SQLite API (`server/routes/storage.js` + `server/database.js`) for fully offline durability.
- **Backend selection**: Chosen via the storage dropdown in the header (persisted to `localStorage` under `fpl-storage-backend`) or the `npm run use:*` scripts below, resolved case-insensitively at startup by the inline bootstrap script in `index.html`.
- **App initializer**: `js/app-init.js` negotiates storage availability, applies async patches, raises diagnostics, and updates the UI indicator.
- **High-level services**: `js/storage-module.js` (backend factory + `createDefaultRoot`) and `js/storage/storage-service.js` (thin facade over whichever adapter is active) orchestrate persistence on top of the adapter layer. `js/services/migration-service.js` upgrades legacy single-week/single-team payloads to the current schema on load.
- **Adapter contract tests**: `__tests__/storage-adapter.contract.test.js` and `__tests__/database.test.js` run the same suite against every registered adapter, ensuring consistent behaviour across the low-level key/value layer.
- **Storage service contract tests**: `__tests__/storage-contract.integration.test.js` exercises the high-level storage facade (localStorage, IndexedDB, SQLite) with shared happy-path and defensive scenarios.
- **Further reading**: `docs/storage-adapters.md` provides a deeper dive into the adapter contract and how to extend it, and `__tests__/fixtures/SCHEMA.md` documents the current multi-team root schema.

### Switching storage backends

- **In-app toggle**: Use the storage dropdown in the header to choose between **localStorage**, **IndexedDB**, or **SQLite**. The preference is stored in `localStorage` (`fpl-storage-backend`) and the app reloads automatically.
- **Command-line toggle**: Run `npm run use:localstorage`, `npm run use:indexeddb`, or `npm run use:sqlite` to change the default backend written to `storage-config.js`. This is useful for automated environments or CI.
- **Health check & fallback**: Selecting SQLite triggers a `/api/storage/root` health check. Failures disable the option, display a warning, persist a safe fallback, and keep localStorage active.
- **Testing tip**: Before running integration tests that exercise IndexedDB behaviour, set `window.USE_INDEXED_DB = true` or run `npm run use:indexeddb`. For SQLite flows, start the Express server (`npm run start:server`) so `/api/storage/*` routes are available.

## Running Locally

**Recommended**: run the Express server, which serves the front-end *and* provides the `/api/storage/*` and `/api/fpl/*` routes needed for the SQLite backend and any FPL API feature (SYNC, Import My Squad):

```bash
npm install
npm run start:server     # production-like server, http://localhost:3000
# or npm run dev:server  # nodemon watch mode for local iteration
```

You can also serve the static files with any other simple web server (e.g. `python3 -m http.server 8080`, or open `index.html` directly in a browser) for localStorage/IndexedDB-only experimentation — but the SQLite storage backend and both FPL API features (SYNC, Import My Squad) require the Express server to be running, since `fantasy.premierleague.com` blocks direct browser requests via CORS and the app relies on the server-side proxy at `/api/fpl/*` (see [FPL API Integration](#fpl-api-integration)).

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

Unit/integration tests (Jest + JSDOM, ~305 tests across ~50 suites):
- **Player, Week, Captaincy Services**: `__tests__/services/player-service.test.js`, `week-service.test.js`, `captaincy-service.test.js` — pure business logic, independent of storage or DOM.
- **Team & Multi-Team Tests**: `__tests__/services/team-service.test.js` covers team CRUD, active-team resolution, FPL entry ID handling, and `validateFplRules()`.
- **FPL API Tests**: `__tests__/services/fpl-api.test.js` (bootstrap/entry-picks fetching, player normalization, current-gameweek resolution) and `__tests__/services/team-sync-coordinator.test.js` (SYNC, Import My Squad, and team-switching orchestration with mocked dependencies).
- **FPL Proxy Tests**: `__tests__/fpl-proxy.api.integration.test.js` exercises the server-side `/api/fpl/*` proxy routes (success, upstream failure, network error, invalid params) with a mocked `fetch`.
- **Points Tests**: `__tests__/services/points-service.test.js` covers gameweek/season point calculation and captain/vice-captain multipliers.
- **Storage Contract Tests**: `__tests__/database.test.js` and `__tests__/storage-adapter.contract.test.js` verify every storage adapter (localStorage, IndexedDB, SQLite) adheres to the shared contract.
- **Storage Service Contract Tests**: `__tests__/storage-contract.integration.test.js` validates the factory-created storage services across all backends, including legacy helpers and defensive failure paths.
- **IndexedDB Integration**: `__tests__/indexeddb.integration.test.js` covers multi-team root persistence and the legacy-store write-skipping optimization.
- **SQLite End-to-End Tests**: `__tests__/storage.sqlite.e2e.test.js` and `__tests__/sqlite-storage.service.e2e.test.js` spin up the Express server in-memory and exercise the HTTP API.
- **App Initialization Tests**: `__tests__/app-init.integration.test.js` verifies storage selection UI, backend fallback timing, and SQLite health checks.
- **Sync Flow Integration**: `__tests__/sync-flow.integration.test.js` exercises `FPLTeamManager.syncFromFpl()` end-to-end against a mocked FPL bootstrap response.

End-to-end tests (Playwright, real browser, 102 scenarios across 6 spec files) — see [`__tests__/e2e/README.md`](__tests__/e2e/README.md) for full details, including the FPL sync/import/multi-team workflow (`fpl-sync-and-teams.spec.js`).

All Jest tests use Jest with JSDOM for DOM simulation; E2E tests run against a real Chromium browser via Playwright.

## Deployment to GitHub Pages

Static hosting (e.g. GitHub Pages) only works for the **localStorage/IndexedDB backends with manual player management** — there is no server to run on GitHub Pages, so the SQLite backend and both FPL API features (SYNC, Import My Squad) will not work there, since they depend on the Express server (`/api/storage/*`, `/api/fpl/*`). To host the full app including FPL integration, deploy the Express server somewhere that can run Node.js (see [Future roadmap ideas](#future-roadmap-ideas)).

For the static-only subset:
1. Create a new repository on GitHub
2. Upload `index.html`, `styles.css`, `script.js`, `js/`, and `README.md`
3. Go to repository Settings → Pages
4. Select "Deploy from a branch" and choose the "main" branch
5. Your app will be available at `https://yourusername.github.io/repository-name`

## Files Structure

- `index.html` - Main HTML structure, including the FPL controls and multi-team selector
- `styles.css` - Responsive CSS styling
- `script.js` - `FPLTeamManager`: top-level app orchestration (player/week/UI wiring, storage read-modify-write)
- `js/services/` - Business-logic services: `player-service.js`, `week-service.js`, `captaincy-service.js`, `team-service.js`, `points-service.js`, `fpl-api.js`, `team-sync-coordinator.js`, `migration-service.js`, `legacy-compatibility-layer.js`
- `js/storage/` - Storage abstraction: `storage-service.js` facade and `adapters/` (contract, localStorage, IndexedDB, SQLite)
- `js/storage-module.js` - Storage backend factory and default-root creation
- `js/ui-manager.js` - All DOM rendering and event binding
- `js/app-init.js`, `js/app.js` - App bootstrap and storage negotiation
- `js/utils/` - `app-error.js` (error hierarchy) and `error-handler.js`
- `server/` - Express app: `server.js`, `database.js` (SQLite), `routes/storage.js` (`/api/storage/*`), `routes/fpl.js` (`/api/fpl/*` proxy)
- `__tests__/` - Jest unit/integration tests, plus `__tests__/e2e/` for Playwright tests (see its own [README](__tests__/e2e/README.md))
- `.devin/skills/code-review/` - A project-specific code review skill/checklist (architecture, security, performance, error handling) for use with AI coding agents
- `docs/storage-adapters.md` - Deep dive into the storage adapter contract
- `package.json` - Node.js dependencies and scripts
- `babel.config.js` - Babel configuration for testing
- `playwright.config.js` - Playwright E2E test configuration

## Browser Compatibility

Works on all modern browsers including:
- Chrome/Edge (Desktop & Mobile)
- Safari (Desktop & Mobile)
- Firefox (Desktop & Mobile)

## Data Storage

- **Default**: Browser `localStorage` (via `js/storage/adapters/local-storage-adapter.js`).
- **IndexedDB option**: Select "IndexedDB" from the storage dropdown, or run `npm run use:indexeddb`, to persist the full multi-team root as a JSON blob via `js/storage/adapters/indexeddb-adapter.js`.
- **SQLite option**: Select "SQLite" from the storage dropdown (requires the Express server running) for durable, file-backed storage via `server/database.js`.
- **Extensibility**: Additional adapters can be created by implementing the contract defined in `js/storage/adapters/database-adapter.contract.js` and registering them in `__tests__/storage-adapter.contract.test.js` and `js/storage-module.js` to gain test coverage.
- **Multi-device sync**: Not yet implemented — every backend above is local to a single browser/device. See roadmap below.

## Future roadmap ideas

### Infrastructure / hosting
- ~~proper database to allow at minimum local persistent storage~~ ✅ done (SQLite backend via `server/database.js`)
- enable a server accessible from the internet (currently `localhost` only) so the app — and its FPL integration, which requires the Express server — can be used outside the local machine
- utilize an online hosted database (e.g. Firebase, Supabase, or a hosted Postgres/SQLite) to allow multi-device usage
- authentication to protect data (single-user or per-account), likely via Firebase/Supabase auth once hosted online
- **Make a decision on storage backend support**: decide whether to keep supporting all three backends (localStorage, IndexedDB, SQLite) long-term, or drop one or more. Most of the storage-related bugs found and fixed this session (backend-switching case sensitivity, IndexedDB dropping the multi-team schema, SQLite E2E reset payload) came from keeping three backends in sync with every schema change — each new backend multiplies the surface area for this class of bug. Worth weighing that maintenance cost against how much value having three interchangeable backends actually provides once the app moves toward a hosted database (see above), which would likely replace at least one of them anyway.

### UX / simplification
- Hide less-frequently-used controls (e.g. storage backend switcher, what-if team creation, JSON import/export, FPL entry ID/SYNC/Import My Squad) behind a collapsible "Advanced" section or button, so the primary player-management UI stays focused for everyday use

### FPL API integration gaps
(see also [Current limitations of the FPL integration](#current-limitations-of-the-fpl-integration) above)
- Surface `TeamService.validateFplRules()` (budget, squad composition, per-club limits) in the UI for what-if teams — the logic exists and is unit-tested but nothing calls it today
- Import a specific past gameweek's squad, not just the current one
- Track transfers in/out (including transfer-cost point hits) instead of only replacing the squad snapshot on import
- Support real FPL chips (Wildcard, Free Hit, Bench Boost, Triple Captain)
- Tie the app's week numbering to real FPL gameweek deadlines instead of manual "Create New Week"
- Cache bootstrap-static responses (ETag or TTL) instead of re-fetching ~700 players on every SYNC/import
- Optional background/scheduled sync instead of fully manual, user-triggered SYNC
- Fixture difficulty ratings, live/provisional bonus points, price-change history, and mini-league/rank data
- E2E coverage for the "Import My Squad" flow (currently only unit-tested; see [`__tests__/e2e/README.md`](__tests__/e2e/README.md))

## Potential implementation of database and authentication (online)
- use firebase or supabase for database or SQLite for fully offline db
- use firebase or supabase authentication for authentication

## Lessons learned about using agentic AI (Windsurf)
- good tests are important (duh)
- refactoring is important (duh)
- but what is more important as the driver of the AI is to know good test coverage before refactoring is important
- due to undeterministic nature of these models (Claude 4, Gemini 2.5 Pro, GPT-5 low reasoning), even with "knowing" what model is good for what kind of issue, it is not possible to predict the outcome.

---

**Note**: This is an MVP (Minimum Viable Product) version. Player and team data can be entered manually, or imported from a real FPL account via entry ID (see [FPL API Integration](#fpl-api-integration)) — but the FPL integration itself is intentionally minimal (manual, one-shot sync/import; no transfers, chips, or historical gameweek support yet).

### Recent changes (FPL API integration + multi-team support)

- **Multi-team support**: `js/services/team-service.js` adds team CRUD, active-team/active-week resolution helpers, and FPL squad-rule validation (`validateFplRules`, not yet wired to the UI). The storage schema now supports `teams`/`currentTeam`/`settings` alongside the legacy single-team shape, with `js/services/migration-service.js` upgrading old data automatically.
- **FPL API client**: `js/services/fpl-api.js` (`FplApiClient`) fetches and normalizes FPL bootstrap-static and entry-picks data, including a `getCurrentGameweek()` helper.
- **SYNC**: Refreshes points/price/form/availability for existing players matched by FPL ID.
- **Import My Squad**: Fetches a user's real FPL picks and captaincy and replaces the primary team's active-week squad with them — see `js/services/team-sync-coordinator.js` (`TeamSyncCoordinator`).
- **Server-side FPL proxy**: `server/routes/fpl.js` proxies `bootstrap-static` and `entry/{id}/event/{gw}/picks` server-side, required because the FPL API blocks direct cross-origin browser requests (no CORS headers). This was found and fixed after real-browser testing showed SYNC failing silently in every automated test (Jest/Playwright mocks bypass real CORS enforcement).
- **Points tracking**: `js/services/points-service.js` calculates gameweek and season points, including captain/vice-captain multipliers, surfaced in new "Total Points"/"GW Points" summary fields and per-player "Total Pts"/"GW Pts" table columns.
- **Architecture**: Sync/team-switching orchestration extracted from `FPLTeamManager` (`script.js`) into `TeamSyncCoordinator`, following a code review that flagged the growing size of that class.
- **Code review skill**: Added `.devin/skills/code-review/` — a project-tailored code review checklist (architecture/SOLID, security, performance, error handling, async patterns) adapted for this project's stack.

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
- `server/` – Express app: SQLite storage routes/database module, plus the `routes/fpl.js` server-side FPL API proxy
