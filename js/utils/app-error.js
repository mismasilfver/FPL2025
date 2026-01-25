/**
 * Custom error class for the application.
 */
export class AppError extends Error {
  /**
   * @param {string} message - The error message.
   * @param {object} [options={}] - Additional options for the error.
   * @param {string} [options.code] - An error code (e.g., 'STORAGE_FAILURE').
   * @param {boolean} [options.recoverable=false] - Whether the application can recover from this error.
   * @param {object} [options.context] - Extra debug information.
   */
  constructor(message, { code, recoverable = false, context } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.recoverable = recoverable;
    this.context = context;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.AppError = AppError;
}
