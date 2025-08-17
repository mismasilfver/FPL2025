const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM, ResourceLoader } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Custom resource loader to fetch local files
class CustomResourceLoader extends ResourceLoader {
  fetch(url, options) {
    const localPath = url.replace('http://localhost/', '');
    const filePath = path.resolve(__dirname, localPath);

    if (fs.existsSync(filePath)) {
      return Promise.resolve(fs.readFileSync(filePath));
    }

    return super.fetch(url, options);
  }
}

// Load HTML file
const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

// Create a helper function to set up the DOM
const createDOM = () => {
  return new Promise((resolve) => {
    const dom = new JSDOM(html, { 
      runScripts: 'dangerously',
      url: 'http://localhost',
      resources: new CustomResourceLoader(),
      pretendToBeVisual: true,
    });

    dom.window.addEventListener('load', () => {
      // Mock localStorage
      const localStorageMock = (() => {
        let store = {};
        return {
          getItem: (key) => store[key] || null,
          setItem: (key, value) => {
            store[key] = value.toString();
          },
          removeItem: (key) => {
            delete store[key];
          },
          clear: () => {
            store = {};
          },
          length: 0,
          key: () => null
        };
      })();

      // Assign mocks to global
      global.window = dom.window;
      global.document = dom.window.document;
      global.localStorage = localStorageMock;
      global.Node = dom.window.Node;

      resolve({
        window: dom.window,
        document: dom.window.document,
        fplManager: dom.window.fplManager
      });
    });
  });
};

// Helper function to simulate user interactions
const userEvent = {
  click: (element, window) => {
    if (!element) {
      throw new Error('Element is null or undefined');
    }
    const event = new window.MouseEvent('click', { 
      bubbles: true, 
      cancelable: true,
      view: window 
    });
    element.dispatchEvent(event);
  },
  type: (element, value, window) => {
    if (!element) {
      throw new Error('Element is null or undefined');
    }
    element.value = value;
    const event = new window.Event('input', { 
      bubbles: true,
      cancelable: true 
    });
    element.dispatchEvent(event);
  },
  select: (element, value, window) => {
    if (!element) {
      throw new Error('Element is null or undefined');
    }
    element.value = value;
    const event = new window.Event('change', { 
      bubbles: true,
      cancelable: true 
    });
    element.dispatchEvent(event);
  },
  submit: (form, window) => {
    if (!form) {
      throw new Error('Form is null or undefined');
    }
    const event = new window.Event('submit', { 
      cancelable: true, 
      bubbles: true 
    });
    form.dispatchEvent(event);
  }
};

module.exports = { createDOM, userEvent };
