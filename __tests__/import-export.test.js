/**
 * Tests for the import/export functionality
 */

import { exportToJSON, importFromJSON } from '../js/import-export.js';

// Mock File and FileReader for testing
global.File = class MockFile {
  constructor(parts, filename, options = {}) {
    this.name = filename;
    this.type = options.type || '';
    this._content = parts.join('');
  }
};

global.FileReader = class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }

  readAsText(file) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({
          target: {
            result: file._content
          }
        });
      }
    }, 0);
  }
};

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('Import/Export Functionality', () => {
  let realCreateElement;

  beforeEach(() => {
    // Use shared DOM setup to ensure required elements/templates exist
    jest.clearAllMocks();
    if (typeof global.setupDOM === 'function') {
      global.setupDOM();
    } else {
      document.body.innerHTML = '';
    }

    if (!realCreateElement) {
      realCreateElement = document.createElement.bind(document);
    } else {
      document.createElement = realCreateElement;
    }
  });

  afterEach(() => {
    if (realCreateElement) {
      document.createElement = realCreateElement;
    }
  });

  describe('exportToJSON', () => {
    test('should create a download link with the correct filename', () => {
      // Mock document.createElement and appendChild
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement = jest.fn((tagName, options) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return realCreateElement(tagName, options);
      });
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
      
      const data = { test: 'data' };
      const currentWeek = 3;
      
      exportToJSON(data, currentWeek);
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('fpl-data-week-3.json');
      expect(mockLink.href).toBe('mock-url');
      expect(mockLink.click).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
    });
  });

  describe('importFromJSON', () => {
    test('should parse valid JSON file', async () => {
      const testData = { test: 'data', weeks: { 1: { players: [] } } };
      const file = new File([JSON.stringify(testData)], 'test.json', { type: 'application/json' });
      
      const result = await importFromJSON(file);
      
      expect(result).toEqual(testData);
    });

    test('should reject with error for invalid JSON', async () => {
      const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
      
      await expect(importFromJSON(file)).rejects.toThrow('Invalid JSON file');
    });
  });
});
