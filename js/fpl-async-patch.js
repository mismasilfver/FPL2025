/**
 * Patch for FPLTeamManager to make methods async-compatible
 */

import { makeMethodAsync } from './async-helpers.js';

/**
 * Patch FPLTeamManager methods to be async-compatible
 * This ensures all methods properly handle promises from storage services
 */
export function patchFPLTeamManagerAsync() {
  // Get FPLTeamManager from global scope or parameter
  const FPLTeamManagerClass = typeof window !== 'undefined' ? window.FPLTeamManager : null;
  
  if (!FPLTeamManagerClass) {
    console.error('FPLTeamManager not found in global scope');
    return;
  }
  
  // Core storage methods
  makeMethodAsync(FPLTeamManagerClass.prototype, 'loadStateFromStorage');
  makeMethodAsync(FPLTeamManagerClass.prototype, 'saveStateToStorage');
  makeMethodAsync(FPLTeamManagerClass.prototype, 'saveToStorage');
  
  // Week management methods
  makeMethodAsync(FPLTeamManagerClass.prototype, 'getWeekCount');
  makeMethodAsync(FPLTeamManagerClass.prototype, '_isReadOnlyCurrentWeek');
  makeMethodAsync(FPLTeamManagerClass.prototype, 'getWeekSnapshot');
  makeMethodAsync(FPLTeamManagerClass.prototype, 'createNewWeek');
  makeMethodAsync(FPLTeamManagerClass.prototype, 'goToWeek');
  makeMethodAsync(FPLTeamManagerClass.prototype, 'nextWeek');
  makeMethodAsync(FPLTeamManagerClass.prototype, 'prevWeek');
  
  // UI-related methods
  makeMethodAsync(FPLTeamManagerClass.prototype, 'updateDisplay');
  
  // Import/Export methods
  makeMethodAsync(FPLTeamManagerClass.prototype, 'exportWeekData');
  makeMethodAsync(FPLTeamManagerClass.prototype, 'importFromJSON');
  
  console.log('FPLTeamManager methods patched for async compatibility');
}
