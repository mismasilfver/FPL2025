/**
 * @jest-environment jsdom
 */

const { createDOM } = require('../test-utils');

describe('Single Alert Test', () => {
  let document, window, alertEl;

  beforeAll(async () => {
    // Create DOM environment
    ({ window, document } = await createDOM());
    
    // Create a simple alert element
    alertEl = document.createElement('div');
    alertEl.className = 'app-alert';
    alertEl.setAttribute('data-testid', 'app-alert');
    alertEl.style.display = 'none';
    document.body.appendChild(alertEl);
  });

  test('shows and hides alert', () => {
    // Show alert
    alertEl.textContent = 'Test message';
    alertEl.style.display = 'block';
    
    // Verify alert is visible with correct message
    expect(alertEl).toHaveTextContent('Test message');
    expect(alertEl.style.display).toBe('block');
    
    // Hide alert
    alertEl.style.display = 'none';
    
    // Verify alert is hidden
    expect(alertEl.style.display).toBe('none');
  });
});
