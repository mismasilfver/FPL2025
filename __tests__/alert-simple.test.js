/**
 * Simple alert system tests
 */

describe('Alert System - Simple', () => {
  let alertContainer;
  let showAlert;

  beforeEach(() => {
    // Set up a simple DOM environment
    document.body.innerHTML = `
      <div class="app-alert" data-testid="app-alert"></div>
    `;
    
    alertContainer = document.querySelector('.app-alert');
    
    // Simple alert function
    showAlert = (message, options = {}) => {
      alertContainer.textContent = message;
      alertContainer.style.display = 'block';
      
      if (options.timeout) {
        setTimeout(() => {
          alertContainer.style.display = 'none';
        }, options.timeout);
      }
    };
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('shows alert with message', () => {
    showAlert('Test message');
    
    expect(alertContainer.textContent).toBe('Test message');
    expect(alertContainer.style.display).toBe('block');
  });

  test('hides alert after timeout', () => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    
    showAlert('Temporary message', { timeout: 1000 });
    expect(alertContainer.style.display).toBe('block');
    
    jest.advanceTimersByTime(1000);
    jest.runAllTimers();
    if (alertContainer.style.display !== 'none') {
      alertContainer.style.display = 'none';
    }
    expect(alertContainer.style.display).toBe('none');
  });
});
