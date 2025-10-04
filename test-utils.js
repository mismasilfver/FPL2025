const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Load the index.html file to be used as the base for our JSDOM environment
const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

/**
 * Creates a JSDOM environment from the project's index.html.
 * This ensures that the DOM structure in tests is identical to the real application.
 * @returns {Promise<{window: JSDOM.window, document: Document, fplManager: FPLTeamManager}>}
 */
const createDOM = () => {
  return new Promise((resolve) => {
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    dom.window.addEventListener('DOMContentLoaded', async () => {
      const { window } = dom;
      const { document } = window;
      
      // Polyfill for navigator to prevent @testing-library/user-event errors
      if (!window.navigator) {
        window.navigator = { userAgent: 'node.js' };
      }

      // Initialize FPLTeamManager for backward compatibility
      const { FPLTeamManager, UIManager } = require('./script');
      const uiManager = new UIManager();
      
      // Create shared storage for both async and sync access
      let store = {};
      
      // Create localStorage mock that shares the same store
      const mockLocalStorage = {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { 
          store[key] = value; 
        },
        removeItem: (key) => { 
          delete store[key]; 
        },
        clear: () => { 
          store = {}; 
        }
      };

      // Mock localStorage on window for tests that access it directly
      window.localStorage = mockLocalStorage;

      // Create storage adapter that uses the same store
      const storageAdapter = {
        getItem: jest.fn((key) => Promise.resolve(store[key])),
        setItem: jest.fn((key, value) => {
          store[key] = value;
          return Promise.resolve();
        }),
        clear: () => { 
          store = {}; 
        },
        localStorage: mockLocalStorage
      };

      const fplManager = new FPLTeamManager({ ui: uiManager, storage: storageAdapter });
      await fplManager.init(document);

      // Attach to window for backward compatibility
      window.fplManager = fplManager;

      resolve({ window, document, fplManager });
    });
  });
};

// Re-export userEvent from testing-library
const originalUserEvent = require('@testing-library/user-event').default;

// Helper function to replace deprecated userEvent.select
const selectOption = async (element, value, window) => {
    if (!element) {
        throw new Error(`Element is null - cannot set value to ${value}`);
    }
    element.value = value;
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
};

// Enhanced userEvent with backward compatibility
const enhancedUserEvent = {
    ...originalUserEvent,
    select: selectOption,
    submit: async (form, window) => {
        form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    }
};

module.exports = {
  createDOM,
  userEvent: enhancedUserEvent,
};