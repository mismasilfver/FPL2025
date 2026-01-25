import { AppError } from './app-error.js';

/**
 * Centralized error handler for the application.
 * @param {Error | AppError} error - The error object to handle.
 */
export function handleAppError(error) {
  console.error('[FPL Error]', error);

  // In the future, this could send errors to a logging service like Sentry
  // Sentry.captureException(error);

  // This could also trigger a UI notification to the user
  // const message = error.recoverable ? error.message : 'An unexpected error occurred. Please refresh the page.';
  // UIManager.showErrorNotification(message);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.handleAppError = handleAppError;
}
