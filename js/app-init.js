/**
 * Application initialization module
 * This file initializes the FPL application with the appropriate storage backend
 */

import { createStorageService } from './storage-module.js';
import { exportToJSON, importFromJSON } from './import-export.js';
import { patchFPLTeamManagerAsync } from './fpl-async-patch.js';
import * as ScriptModule from '../script.js';

const DEFAULT_STORAGE_INIT_TIMEOUT_MS = 2500;

/**
 * Initialize the application with the appropriate storage backend
 * @param {Object} options Configuration options
 * @param {boolean} options.useIndexedDB Whether to use IndexedDB (true) or localStorage (false)
 * @returns {Promise<void>} A promise that resolves when initialization is complete
 */
export async function initializeApp(options = {}) {
  const {
    useIndexedDB = window.USE_INDEXED_DB === true,
    storageBackend = window.ACTIVE_STORAGE_BACKEND || 'localstorage',
    storageInitTimeoutMs = DEFAULT_STORAGE_INIT_TIMEOUT_MS
  } = options;

  const storageKey = 'fpl-team-data';

  const {
    service: storageService,
    backend: activeBackend,
    fallbackInfo
  } = await createInitializedStorageService({
    backend: storageBackend,
    useIndexedDB,
    storageKey,
    timeoutMs: storageInitTimeoutMs
  });
  
  // Resolve the manager constructor from module exports or legacy globals
  const ManagerCtor = (ScriptModule && (ScriptModule.FPLTeamManager || ScriptModule.default))
    || (typeof window !== 'undefined' && window.FPLTeamManager)
    || (typeof global !== 'undefined' && global.FPLTeamManager);
  if (!ManagerCtor) {
    throw new Error('FPLTeamManager class not available on window');
  }

  // Patch FPLTeamManager methods to be async-compatible before instantiation
  patchFPLTeamManagerAsync(ManagerCtor);

  const mgr = new ManagerCtor({ storage: storageService });

  // Assign to global scope for access from tests or other scripts
  if (typeof window !== 'undefined') {
    window.fplManager = mgr;
  }
  if (typeof global !== 'undefined') {
    global.fplManager = mgr;
  }

  // Perform async initialization (data loading, initial render)
  await mgr.init();

  if (fallbackInfo?.message) {
    mgr.ui?.showAlert?.(fallbackInfo.message);
    recordInitEvent({ stage: 'ui', type: 'notice', message: fallbackInfo.message });
  }
  
  // Set up the import button handler
  setupImportHandler();
  
  // Add storage type indicator to the UI
  updateStorageIndicator(activeBackend);
  await syncStorageOptionsState(activeBackend);
  applyStorageControlsLayering();
  setupStorageToggle(activeBackend);

  return mgr;
}

async function createInitializedStorageService({ backend, useIndexedDB, storageKey, timeoutMs }) {
  const preferIndexedDb = backend === 'indexeddb' && useIndexedDB !== false;
  const diagnostics = ensureDiagnosticsContainer();
  diagnostics.backendRequested = backend;

  if (!preferIndexedDb) {
    const resolvedBackend = backend === 'indexeddb' ? 'localstorage' : backend;
    if (backend === 'indexeddb') {
      recordInitEvent({
        stage: 'storage',
        type: 'fallback',
        from: 'indexeddb',
        to: resolvedBackend,
        reason: 'disabled'
      });
    }

    const service = safeCreateStorageService({ backend: resolvedBackend, storageKey });
    recordInitEvent({ stage: 'storage', type: 'attempt', backend: resolvedBackend });

    const result = await initializeWithTimeout(service, timeoutMs, resolvedBackend);

    if (result.status === 'error') {
      recordInitEvent({
        stage: 'storage',
        type: 'error',
        backend: resolvedBackend,
        error: result.error?.message
      });
      throw result.error;
    }

    recordInitEvent({
      stage: 'storage',
      type: 'success',
      backend: resolvedBackend,
      elapsedMs: result.elapsedMs
    });

    setRuntimeBackendFlags(resolvedBackend);
    console.info(`[app-init] Storage backend ready: ${resolvedBackend}`);

    return {
      service,
      backend: resolvedBackend,
      fallbackInfo: backend === 'indexeddb'
        ? { message: 'IndexedDB backend disabled. Using localStorage instead.' }
        : undefined
    };
  }

  const primaryBackend = 'indexeddb';
  const service = safeCreateStorageService({ backend: primaryBackend, storageKey });
  recordInitEvent({ stage: 'storage', type: 'attempt', backend: primaryBackend });

  const result = await initializeWithTimeout(service, timeoutMs, primaryBackend);

  if (result.status === 'success' || result.status === 'skipped') {
    recordInitEvent({
      stage: 'storage',
      type: 'success',
      backend: primaryBackend,
      elapsedMs: result.elapsedMs
    });
    setRuntimeBackendFlags(primaryBackend);
    console.info(`[app-init] Storage backend ready: ${primaryBackend}`);
    return { service, backend: primaryBackend, fallbackInfo: undefined };
  }

  let fallbackReason = 'timeout';
  let fallbackError;

  if (result.status === 'error') {
    fallbackReason = 'error';
    fallbackError = result.error;
    recordInitEvent({
      stage: 'storage',
      type: 'error',
      backend: primaryBackend,
      error: fallbackError?.message
    });
  }

  const fallbackBackend = 'localstorage';
  recordInitEvent({
    stage: 'storage',
    type: 'fallback',
    from: primaryBackend,
    to: fallbackBackend,
    reason: fallbackReason,
    elapsedMs: result.elapsedMs
  });

  try {
    await service.teardown?.();
  } catch (teardownError) {
    console.error('Failed to teardown stalled IndexedDB service:', teardownError);
    recordInitEvent({
      stage: 'storage',
      type: 'teardown-error',
      backend: primaryBackend,
      error: teardownError?.message
    });
  }

  const warnMessage = fallbackReason === 'timeout'
    ? `IndexedDB initialization timed out after ${timeoutMs}ms. Falling back to localStorage.`
    : `IndexedDB initialization failed: ${fallbackError?.message || 'unknown error'}. Falling back to localStorage.`;
  console.warn(warnMessage);

  persistActiveBackendPreference(fallbackBackend);
  setRuntimeBackendFlags(fallbackBackend);

  const fallbackService = safeCreateStorageService({ backend: fallbackBackend, storageKey });
  recordInitEvent({ stage: 'storage', type: 'attempt', backend: fallbackBackend });

  const fallbackResult = await initializeWithTimeout(fallbackService, timeoutMs, fallbackBackend);

  if (fallbackResult.status === 'error') {
    recordInitEvent({
      stage: 'storage',
      type: 'error',
      backend: fallbackBackend,
      error: fallbackResult.error?.message
    });
    throw fallbackResult.error;
  }

  recordInitEvent({
    stage: 'storage',
    type: 'success',
    backend: fallbackBackend,
    elapsedMs: fallbackResult.elapsedMs
  });

  console.info(`[app-init] Storage backend ready: ${fallbackBackend}`);

  const fallbackInfo = {
    message: fallbackReason === 'timeout'
      ? 'IndexedDB backend timed out during initialization. Using localStorage instead.'
      : 'IndexedDB backend failed during initialization. Using localStorage instead.'
  };

  return {
    service: fallbackService,
    backend: fallbackBackend,
    fallbackInfo
  };
}

function safeCreateStorageService(options) {
  try {
    return createStorageService(options);
  } catch (error) {
    recordInitEvent({
      stage: 'storage',
      type: 'error',
      backend: options?.backend,
      error: error?.message
    });
    throw error;
  }
}

function applyStorageControlsLayering() {
  const header = document.querySelector('header');
  const controls = document.querySelector('.controls');

  if (header) {
    header.dataset.layer = 'storage-top';
  }

  if (controls) {
    controls.dataset.layer = 'primary-controls';
  }
}

async function initializeWithTimeout(service, timeoutMs, backend) {
  if (!service) {
    return { status: 'skipped', elapsedMs: 0 };
  }

  const start = Date.now();
  let timeoutId;

  let initPromise;
  try {
    if (service.initialized && typeof service.initialized.then === 'function') {
      initPromise = service.initialized;
    } else if (typeof service.initialize === 'function') {
      initPromise = Promise.resolve().then(() => service.initialize());
    } else {
      return { status: 'skipped', elapsedMs: 0 };
    }
  } catch (error) {
    return { status: 'error', error, elapsedMs: Date.now() - start };
  }

  const guardedInit = Promise.resolve(initPromise)
    .then(() => ({ status: 'success', elapsedMs: Date.now() - start }))
    .catch((error) => ({ status: 'error', error, elapsedMs: Date.now() - start }));

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ status: 'timeout', elapsedMs: Date.now() - start });
    }, timeoutMs);
  });

  const outcome = await Promise.race([guardedInit, timeoutPromise]);
  clearTimeout(timeoutId);

  if (outcome.status === 'timeout') {
    // Ensure eventual settle of initialize promise is handled to avoid unhandled rejections
    guardedInit.catch(() => {});
    recordInitEvent({
      stage: 'storage',
      type: 'timeout',
      backend,
      elapsedMs: outcome.elapsedMs
    });
  }

  return outcome;
}

function ensureDiagnosticsContainer() {
  const host = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
  if (!host.fplInitDiagnostics) {
    host.fplInitDiagnostics = {
      startedAt: Date.now(),
      events: []
    };
  }
  return host.fplInitDiagnostics;
}

function recordInitEvent(event) {
  const diagnostics = ensureDiagnosticsContainer();
  diagnostics.events.push({ ...event, timestamp: Date.now() });
  return diagnostics;
}

function persistActiveBackendPreference(backend) {
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
    if (storage) {
      storage.setItem('fpl-storage-backend', backend);
      recordInitEvent({ stage: 'storage', type: 'preference-persisted', backend });
    }
  } catch (error) {
    console.error('Failed to persist fallback backend preference:', error);
    recordInitEvent({
      stage: 'storage',
      type: 'preference-error',
      backend,
      error: error?.message
    });
  }
}

function setRuntimeBackendFlags(backend) {
  const isIndexedDb = backend === 'indexeddb';

  if (typeof window !== 'undefined') {
    window.ACTIVE_STORAGE_BACKEND = backend;
    window.USE_INDEXED_DB = isIndexedDb;
  }

  if (typeof global !== 'undefined') {
    global.ACTIVE_STORAGE_BACKEND = backend;
    global.USE_INDEXED_DB = isIndexedDb;
  }
}

/**
 * Set up the import button handler
 * @param {Object} storageService The storage service to use for importing
 */
function setupImportHandler() { // storageService is no longer needed here
  const importButton = document.getElementById('import-button');
  const importInput = document.getElementById('import-json');
  
  if (importButton && importInput) {
    importButton.addEventListener('click', async () => {
      if (!importInput.files || importInput.files.length === 0) {
        window.fplManager?.ui.showAlert('Please select a JSON file to import.');
        return;
      }
      
      try {
        const file = importInput.files[0];
        const importedData = await importFromJSON(file);

        // Get current root data
        const rootData = await window.fplManager._getRootData();

        // Determine the week number from the imported file (legacy or v2 format)
        const importedWeekNumber = importedData.week || (importedData.weeks && Object.keys(importedData.weeks)[0]) || rootData.currentWeek;

        // Extract players and other relevant data for that week
        const weekDataToMerge = importedData.weeks ? 
            importedData.weeks[importedWeekNumber] : 
            { players: importedData.players, captain: importedData.captain, viceCaptain: importedData.viceCaptain, isReadOnly: false };

        // Merge the imported week's data into the root data
        rootData.weeks[importedWeekNumber] = weekDataToMerge;
        rootData.currentWeek = Number(importedWeekNumber);

        // Ensure derived fields are calculated for the newly imported week
        await window.fplManager._ensureWeekDerivedFields(rootData, importedWeekNumber);

        // Save the merged data and update the display
        await window.fplManager._saveRootData(rootData);
        await window.fplManager.updateDisplay();
        
        window.fplManager?.ui.showAlert(`Week ${importedWeekNumber} data imported successfully!`);
      } catch (error) {
        console.error('Import failed:', error);
        window.fplManager?.ui.showAlert(`Import failed: ${error.message}`);
      }
    });
  }
}

/**
 * Add storage type indicator to the UI
 * @param {boolean} useIndexedDB Whether IndexedDB is being used
 */
async function syncStorageOptionsState(activeBackend) {
  const optionsList = document.getElementById('storage-options');
  if (!optionsList) return;

  if (activeBackend === 'sqlite') {
    const apiHealthy = await checkSqliteHealth();
    if (!apiHealthy) {
      const toggleBtn = document.getElementById('toggle-storage-btn');
      const sqliteOption = optionsList.querySelector('[data-backend="sqlite"]');
      if (sqliteOption) {
        sqliteOption.setAttribute('aria-disabled', 'true');
        sqliteOption.classList.add('is-disabled');
      }
      if (toggleBtn) {
        toggleBtn.setAttribute('data-warning', 'sqlite-unavailable');
      }
      window.fplManager?.ui?.showAlert?.('SQLite backend is unavailable. Falling back to localStorage.');
      const storage = window.localStorage;
      try {
        if (storage) {
          storage.setItem('fpl-storage-backend', 'localstorage');
        }
      } catch (error) {
        console.error('Failed to persist fallback backend preference:', error);
      }
      window.ACTIVE_STORAGE_BACKEND = 'localstorage';
      window.USE_INDEXED_DB = false;
      updateStorageIndicator('localstorage');
      return;
    }
  }

  const options = Array.from(optionsList.querySelectorAll('[role="option"]'));
  options.forEach((option) => {
    const backend = option.getAttribute('data-backend');
    const isActive = backend === activeBackend;
    option.setAttribute('aria-selected', isActive ? 'true' : 'false');
    option.classList.toggle('is-selected', isActive);
    if (backend === 'sqlite') {
      option.removeAttribute('aria-disabled');
      option.classList.remove('is-disabled');
    }
  });
}

async function checkSqliteHealth() {
  try {
    const response = await fetch('/api/storage/root', { method: 'GET' });
    return response.ok;
  } catch (error) {
    console.warn('SQLite health check failed:', error);
    return false;
  }
}

function updateStorageIndicator(activeBackend) {
  const indicator = document.getElementById('storage-indicator');
  const optionsList = document.getElementById('storage-options');

  if (indicator) {
    const label = formatBackendLabel(activeBackend);
    indicator.textContent = `Storage: ${label}`;
    indicator.setAttribute('data-backend', activeBackend);
  }

  if (optionsList) {
    const options = Array.from(optionsList.querySelectorAll('[role="option"]'));
    options.forEach((option) => {
      const isActive = option.getAttribute('data-backend') === activeBackend;
      option.setAttribute('aria-selected', isActive ? 'true' : 'false');
      option.classList.toggle('is-selected', isActive);
    });
  }
}

function setupStorageToggle() {
  const toggleBtn = document.getElementById('toggle-storage-btn');
  const indicator = document.getElementById('storage-indicator');
  const optionsList = document.getElementById('storage-options');

  if (!toggleBtn || !optionsList) return;

  const storage = window.localStorage;

  const closeMenu = () => {
    optionsList.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', handleOutsideClick);
  };

  const openMenu = () => {
    optionsList.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', handleOutsideClick);
  };

  const handleOutsideClick = (event) => {
    if (!optionsList.contains(event.target) && event.target !== toggleBtn) {
      closeMenu();
    }
  };

  const activeBackend = indicator?.getAttribute('data-backend') || 'localstorage';
  updateStorageIndicator(activeBackend);

  toggleBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (optionsList.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  optionsList.addEventListener('click', async (event) => {
    const option = event.target.closest('[role="option"]');
    if (!option) return;

    const nextBackend = option.getAttribute('data-backend');
    if (!nextBackend) return;

    if (option.getAttribute('aria-disabled') === 'true') {
      closeMenu();
      return;
    }

    if (nextBackend === 'sqlite') {
      const healthy = await checkSqliteHealth();
      if (!healthy) {
        option.setAttribute('aria-disabled', 'true');
        option.classList.add('is-disabled');
        closeMenu();
        window.fplManager?.ui?.showAlert?.('SQLite backend is unavailable right now.');
        return;
      }
    }

    try {
      if (storage) {
        storage.setItem('fpl-storage-backend', nextBackend);
      }
    } catch (error) {
      console.error('Failed to persist storage backend preference:', error);
    }

    closeMenu();
    updateStorageIndicator(nextBackend);
    window.location.reload();
  });
}

function formatBackendLabel(backend) {
  switch (backend) {
    case 'indexeddb':
      return 'IndexedDB';
    case 'sqlite':
      return 'SQLite';
    default:
      return 'localStorage';
  }
}
