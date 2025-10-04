// Jest setup: stub browser dialogs for jsdom environment and setup fake-indexeddb
// jsdom does not implement alert/confirm. Our app calls these in read-only guards
// and delete confirmations, which would otherwise log noisy "Not implemented" errors.
// We stub them here for all tests to keep output clean and deterministic.

// Add missing browser APIs for testing
if (!global.window) {
  global.window = global;
}

// Add missing browser APIs
if (!global.window.MouseEvent) {
  global.window.MouseEvent = class MouseEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.button = options.button || 0;
      this.buttons = options.buttons || 0;
      this.clientX = options.clientX || 0;
      this.clientY = options.clientY || 0;
    }
  };
}

// Completely disable script loading during tests (only when document is available)
if (typeof document !== 'undefined' && document?.createElement) {
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tagName, options) {
    if (tagName === 'script') {
      const script = originalCreateElement(tagName);
      // Prevent any actual script execution
      Object.defineProperty(script, 'src', {
        set() {},
        get() { return ''; },
        configurable: true
      });
      return script;
    }
    return originalCreateElement(tagName, options);
  };
}

// Setup fake-indexeddb for testing IndexedDB
require('fake-indexeddb/auto');

const fs = require('fs');
const path = require('path');

// Load the index.html file to set up the DOM for tests
const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

beforeEach(() => {
  // Set up the document's body with the HTML from index.html
  // This ensures each test starts with a fresh DOM
  document.body.innerHTML = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)[1];
});

beforeAll(() => {
  const w = global.window || global;

  // Ensure alert exists on window and global, then stub it
  if (typeof w.alert === 'undefined') {
    w.alert = jest.fn();
  }
  if (typeof global.alert === 'undefined') {
    global.alert = w.alert;
  }
  jest.spyOn(w, 'alert').mockImplementation(() => {});
  if (w !== global && typeof global.alert === 'function') {
    jest.spyOn(global, 'alert').mockImplementation(() => {});
  }

  // Ensure confirm exists on window and global, then stub it (default OK)
  if (typeof w.confirm === 'undefined') {
    w.confirm = () => true;
  }
  if (typeof global.confirm === 'undefined') {
    global.confirm = w.confirm;
  }
  jest.spyOn(w, 'confirm').mockImplementation(() => true);
  if (w !== global && typeof global.confirm === 'function') {
    jest.spyOn(global, 'confirm').mockImplementation(() => true);
  }
});
