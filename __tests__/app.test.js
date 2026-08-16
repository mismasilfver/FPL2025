/**
 * @jest-environment jsdom
 */

describe('js/app.js entry point', () => {
  let initializeApp;
  let consoleLogSpy;
  let consoleErrorSpy;

  const loadApp = () => {
    jest.resetModules();
    initializeApp = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../js/app-init.js', () => ({
      __esModule: true,
      initializeApp
    }));
    require('../js/app.js');
  };

  const fireDomContentLoaded = async () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    // Let the async listener settle
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    loadApp();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.dontMock('../js/app-init.js');
  });

  it('initializes the app once the DOM is ready', async () => {
    await fireDomContentLoaded();

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('FPL application initialized successfully');
  });

  it('shows the failure in the alert container when initialization rejects', async () => {
    const error = new Error('boom');
    initializeApp.mockRejectedValue(error);
    const alertContainer = document.createElement('div');
    alertContainer.className = 'app-alert';
    document.body.appendChild(alertContainer);

    await fireDomContentLoaded();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize FPL application:', error);
    expect(alertContainer.textContent).toBe('Error initializing application: boom');
    expect(alertContainer.style.display).toBe('block');
    expect(alertContainer.classList.contains('error')).toBe(true);
  });

  it('only logs the failure when no alert container exists', async () => {
    initializeApp.mockRejectedValue(new Error('boom'));
    expect(document.querySelector('.app-alert')).toBeNull();

    await expect(fireDomContentLoaded()).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize FPL application:',
      expect.any(Error)
    );
  });
});
