const { handleAppError } = require('../../js/utils/error-handler.js');
const { AppError } = require('../../js/utils/app-error.js');

describe('handleAppError', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        // Spy on console.error to check if it's called
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore the original console.error
        consoleErrorSpy.mockRestore();
    });

    it('should log a standard Error to console.error', () => {
        const error = new Error('A standard error');
        handleAppError(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('[FPL Error]', error);
    });

    it('should log an AppError to console.error', () => {
        const appError = new AppError('An app-specific error', { code: 'TEST_ERROR' });
        handleAppError(appError);
        expect(consoleErrorSpy).toHaveBeenCalledWith('[FPL Error]', appError);
    });

    it('should handle non-Error objects gracefully', () => {
        const plainObjectError = { message: 'Just an object' };
        handleAppError(plainObjectError);
        expect(consoleErrorSpy).toHaveBeenCalledWith('[FPL Error]', plainObjectError);
    });
});
