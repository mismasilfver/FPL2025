/**
 * Main application entry point
 * This file initializes the FPL application with the appropriate storage backend
 */

import { initializeApp } from './app-init.js';
import { handleAppError } from './utils/error-handler.js';

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize the app with the feature flag from window.USE_INDEXED_DB
    await initializeApp();
    console.log('FPL application initialized successfully');
  } catch (error) {
    handleAppError(error, {
      userMessage: `Error initializing application: ${error.message}`
    });
  }
});
