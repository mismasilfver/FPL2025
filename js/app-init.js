/**
 * Application initialization module
 * This file initializes the FPL application with the appropriate storage backend
 */

import { createStorageService } from './storage-module.js';
import { exportToJSON, importFromJSON } from './import-export.js';
import { patchFPLTeamManagerAsync } from './fpl-async-patch.js';
import * as ScriptModule from '../script.js';

/**
 * Initialize the application with the appropriate storage backend
 * @param {Object} options Configuration options
 * @param {boolean} options.useIndexedDB Whether to use IndexedDB (true) or localStorage (false)
 * @returns {Promise<void>} A promise that resolves when initialization is complete
 */
export async function initializeApp(options = {}) {
  const {
    useIndexedDB = window.USE_INDEXED_DB === true,
    storageBackend = window.ACTIVE_STORAGE_BACKEND || 'localstorage'
  } = options;
  
  // Create the appropriate storage service
  const storageService = createStorageService({
    backend: storageBackend,
    useIndexedDB,
    storageKey: 'fpl-team-data'
  });
  
  if (typeof storageService.initialize === 'function') {
    await storageService.initialize();
  }
  
  // Patch FPLTeamManager methods to be async-compatible
  // This must be done before creating an instance
  patchFPLTeamManagerAsync();
  
  // Initialize the FPL Team Manager using resolved class
  const ManagerCtor = (ScriptModule && (ScriptModule.FPLTeamManager || ScriptModule.default))
    || (typeof window !== 'undefined' && window.FPLTeamManager)
    || (typeof global !== 'undefined' && global.FPLTeamManager);
  if (!ManagerCtor) {
    throw new Error('FPLTeamManager class not available on window');
  }
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
  
  // Set up the import button handler
  setupImportHandler();
  
  // Add storage type indicator to the UI
  updateStorageIndicator(storageBackend);
  await syncStorageOptionsState(storageBackend);
  setupStorageToggle(storageBackend);

  return mgr;
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
