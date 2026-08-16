import { AppError } from './app-error.js';

const GENERIC_MESSAGE = 'Something went wrong. Please reload the page and try again.';

/**
 * Centralized error handler for the application.
 * Logs the error and surfaces a message to the user when a UI is available.
 * @param {Error | AppError} error - The error object to handle.
 * @param {object} [options={}]
 * @param {string} [options.userMessage] - Message to show instead of the default one.
 * @param {object} [options.ui] - UI manager used to display the message.
 */
export function handleAppError(error, { userMessage, ui } = {}) {
  console.error('[FPL Error]', error);
  notifyUser(error, userMessage, ui);
}

function notifyUser(error, userMessage, ui) {
  const message = userMessage
    || (error instanceof AppError && error.recoverable && error.message
      ? error.message
      : GENERIC_MESSAGE);

  const uiManager = ui || (typeof window !== 'undefined' ? window.fplManager?.ui : undefined);

  if (typeof uiManager?.showAlert === 'function') {
    uiManager.showAlert(message);
    return;
  }

  const container = typeof document !== 'undefined'
    ? document.querySelector('[data-testid="app-alert"]')
    : null;

  if (container) {
    container.textContent = message;
    container.classList.add('error');
    container.style.display = 'block';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.handleAppError = handleAppError;
}
