jest.mock('../js/storage-module.js', () => {
  const makeService = () => ({
    initialize: jest.fn().mockResolvedValue(),
    setRootData: jest.fn(),
    getRootData: jest.fn().mockResolvedValue({
      currentWeek: 1,
      weeks: {
        1: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
      }
    })
  });

  const createStorageService = jest.fn().mockImplementation(makeService);
  const createDefaultRoot = jest.fn(() => ({
    version: '2.0',
    currentWeek: 1,
    weeks: {
      1: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
    }
  }));

  return {
    __esModule: true,
    createStorageService,
    createDefaultRoot
  };
});

const { initializeApp } = require('../js/app-init.js');
const { createStorageService } = require('../js/storage-module.js');
const { FPLTeamManager: MockFPLTeamManager } = require('../script.js');

jest.mock('../script.js', () => {
  const makeManager = () => ({
    init: jest.fn().mockResolvedValue(),
    loadStateFromStorage: jest.fn().mockResolvedValue(),
    ui: { showAlert: jest.fn() },
    _getRootData: jest.fn().mockResolvedValue({
      currentWeek: 1,
      weeks: {
        1: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
      }
    }),
    _saveRootData: jest.fn().mockResolvedValue(),
    _ensureWeekDerivedFields: jest.fn().mockResolvedValue(),
    updateDisplay: jest.fn().mockResolvedValue()
  });

  const FPLTeamManager = jest.fn().mockImplementation(makeManager);

  return {
    __esModule: true,
    FPLTeamManager
  };
});

const storageState = {};
const mockStorage = {
  getItem: jest.fn((key) => (key in storageState ? storageState[key] : null)),
  setItem: jest.fn((key, value) => {
    storageState[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete storageState[key];
  }),
  clear: jest.fn(() => {
    Object.keys(storageState).forEach((key) => delete storageState[key]);
  })
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  configurable: true
});

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let originalLocation;
let appInstance;

beforeAll(() => {
  originalLocation = window.location;
  delete window.location;
  window.location = { reload: jest.fn() };
});

afterAll(() => {
  window.location = originalLocation;
});

beforeEach(() => {
  Object.keys(storageState).forEach((key) => delete storageState[key]);
  mockStorage.getItem.mockClear();
  mockStorage.setItem.mockClear();
  mockStorage.removeItem.mockClear();
  mockStorage.clear.mockClear();

  createStorageService.mockClear();
  MockFPLTeamManager.mockClear();

  global.fetch = jest.fn().mockResolvedValue({ ok: true });

  document.body.innerHTML = `
    <div class="app-alert" data-testid="app-alert"></div>
    <header>
      <div class="storage-controls" data-testid="storage-controls">
        <span id="storage-indicator" class="storage-indicator" data-testid="storage-indicator">Storage: localStorage</span>
        <div class="storage-toggle">
          <button id="toggle-storage-btn" class="btn btn-secondary" data-testid="toggle-storage-btn" type="button" aria-haspopup="listbox" aria-expanded="false">
            Change Storage
          </button>
          <ul id="storage-options" class="storage-options" data-testid="storage-options" role="listbox" aria-label="Storage backend" hidden>
            <li role="option" data-backend="localstorage" aria-selected="true">localStorage</li>
            <li role="option" data-backend="indexeddb" aria-selected="false">IndexedDB</li>
            <li role="option" data-backend="sqlite" aria-selected="false">SQLite</li>
          </ul>
        </div>
      </div>
    </header>
  `;

  window.fplManager = undefined;
  global.fplManager = undefined;
  window.FPLTeamManager = MockFPLTeamManager;
  global.FPLTeamManager = MockFPLTeamManager;
  window.USE_INDEXED_DB = false;
  window.ACTIVE_STORAGE_BACKEND = 'localstorage';
  delete window.fplInitDiagnostics;
  appInstance = undefined;

  if (typeof window.location.reload?.mockClear === 'function') {
    window.location.reload.mockClear();
  }
});

afterEach(() => {
  if (typeof global.fetch?.mockRestore === 'function') {
    global.fetch.mockRestore();
  }
});

async function initApp(options = {}) {
  const manager = await initializeApp(options);
  appInstance = { fplManager: manager };
  return manager;
}

describe('App initialization storage dropdown', () => {
  test('initializes with sqlite backend and marks option selected', async () => {
    await initApp({ storageBackend: 'sqlite' });
    await flushPromises();

    const indicator = document.getElementById('storage-indicator');
    const optionsList = document.getElementById('storage-options');
    const sqliteOption = optionsList?.querySelector('li[data-backend="sqlite"]');

    expect(indicator.textContent).toContain('SQLite');
    expect(sqliteOption.getAttribute('aria-selected')).toBe('true');
    expect(sqliteOption.classList.contains('is-selected')).toBe(true);
    expect(MockFPLTeamManager).toHaveBeenCalledTimes(1);
  });

  test('storage dropdown persists sqlite selection and triggers reload', async () => {
    await initApp({ storageBackend: 'localstorage' });

    const toggleBtn = document.getElementById('toggle-storage-btn');
    const optionsList = document.getElementById('storage-options');
    const sqliteOption = optionsList.querySelector('[data-backend="sqlite"]');

    toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(optionsList.hidden).toBe(false);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    sqliteOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(mockStorage.setItem).toHaveBeenCalledWith('fpl-storage-backend', 'sqlite');
    expect(optionsList.hidden).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('storage-indicator').textContent).toContain('SQLite');
    expect(window.location.reload).toHaveBeenCalled();
  });

  test('storage dropdown closes when clicking outside', async () => {
    await initApp({ storageBackend: 'indexeddb' });

    const toggleBtn = document.getElementById('toggle-storage-btn');
    const optionsList = document.getElementById('storage-options');

    toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(optionsList.hidden).toBe(false);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(optionsList.hidden).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });

  test('disables sqlite option and falls back when health check fails during init', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    await initApp({ storageBackend: 'sqlite' });
    await flushPromises();

    const indicator = document.getElementById('storage-indicator');
    const sqliteOption = document.querySelector('[data-backend="sqlite"]');

    expect(sqliteOption.getAttribute('aria-disabled')).toBe('true');
    expect(sqliteOption.classList.contains('is-disabled')).toBe(true);
    expect(indicator.textContent).toContain('localStorage');
    expect(mockStorage.setItem).toHaveBeenCalledWith('fpl-storage-backend', 'localstorage');
  });

  test('handles sqlite selection failure gracefully when toggled from menu', async () => {
    await initApp({ storageBackend: 'localstorage' });

    global.fetch.mockResolvedValueOnce({ ok: false });

    const toggleBtn = document.getElementById('toggle-storage-btn');
    const optionsList = document.getElementById('storage-options');
    const sqliteOption = optionsList.querySelector('[data-backend="sqlite"]');

    toggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(optionsList.hidden).toBe(false);

    sqliteOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(sqliteOption.getAttribute('aria-disabled')).toBe('true');
    expect(sqliteOption.classList.contains('is-disabled')).toBe(true);
    expect(optionsList.hidden).toBe(true);
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});

describe('IndexedDB fallback resilience', () => {
  test('falls back to localStorage when IndexedDB initialization stalls and records diagnostics', async () => {
    jest.useFakeTimers();

    const stalledService = {
      initialize: jest.fn(() => new Promise(() => {})),
      getRootData: jest.fn(),
      setRootData: jest.fn(),
      teardown: jest.fn()
    };

    createStorageService.mockImplementationOnce(() => stalledService);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    window.ACTIVE_STORAGE_BACKEND = 'indexeddb';
    window.USE_INDEXED_DB = true;

    try {
      const initPromise = initApp({ storageBackend: 'indexeddb', storageInitTimeoutMs: 50 });

      await Promise.resolve();
      jest.advanceTimersByTime(50);
      await flushPromises();
      await flushPromises();

      const manager = await initPromise;

      expect(manager).toBeDefined();
      expect(createStorageService).toHaveBeenNthCalledWith(1, expect.objectContaining({ backend: 'indexeddb' }));
      expect(createStorageService).toHaveBeenNthCalledWith(2, expect.objectContaining({ backend: 'localstorage' }));
      expect(MockFPLTeamManager).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('IndexedDB initialization timed out'));
      expect(window.fplInitDiagnostics).toBeDefined();
      expect(window.fplInitDiagnostics.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stage: 'storage',
            type: 'fallback',
            from: 'indexeddb',
            to: 'localstorage',
            reason: 'timeout'
          })
        ])
      );
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      infoSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});
