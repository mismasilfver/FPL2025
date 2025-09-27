/**
 * Main application entry point
 * This file initializes the FPL application with the appropriate storage backend
 */

import { initializeApp } from './app-init.js';

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize the app with the feature flag from window.USE_INDEXED_DB
    await initializeApp();
    console.log('FPL application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize FPL application:', error);
    // Show error in UI if possible
    const alertContainer = document.querySelector('.app-alert');
    if (alertContainer) {
      alertContainer.textContent = `Error initializing application: ${error.message}`;
      alertContainer.style.display = 'block';
      alertContainer.classList.add('error');
    }
  }
});
