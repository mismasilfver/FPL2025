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
  const { useIndexedDB = window.USE_INDEXED_DB === true } = options;
  
  // Create the appropriate storage service
  const storageService = createStorageService({
    useIndexedDB,
    storageKey: 'fpl-team-data'
  });
  
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
  const mgr = new ManagerCtor();

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
  setupImportHandler(storageService);
  
  // Add storage type indicator to the UI
  addStorageIndicator(useIndexedDB);
  
  return mgr;
}

/**
 * Set up the import button handler
 * @param {Object} storageService The storage service to use for importing
 */
function setupImportHandler(storageService) {
  const importButton = document.getElementById('import-button');
  const importInput = document.getElementById('import-json');
  
  if (importButton && importInput) {
    importButton.addEventListener('click', async () => {
      if (!importInput.files || importInput.files.length === 0) {
        window.fplManager.ui.showAlert('Please select a JSON file to import.');
        return;
      }
      
      try {
        const file = importInput.files[0];
        const data = await importFromJSON(file);
        
        await storageService.importFromJSON(JSON.stringify(data));
        await window.fplManager.loadStateFromStorage();
        await window.fplManager.updateDisplay();
        
        window.fplManager.ui.showAlert('Data imported successfully!');
      } catch (error) {
        console.error('Import failed:', error);
        window.fplManager.ui.showAlert(`Import failed: ${error.message}`);
      }
    });
  }
}

/**
 * Add storage type indicator to the UI
 * @param {boolean} useIndexedDB Whether IndexedDB is being used
 */
function addStorageIndicator(useIndexedDB) {
  const header = document.querySelector('header');
  if (header) {
    const storageIndicator = document.createElement('div');
    storageIndicator.className = 'storage-indicator';
    storageIndicator.textContent = `Storage: ${useIndexedDB ? 'IndexedDB' : 'localStorage'}`;
    header.appendChild(storageIndicator);
  }
}
