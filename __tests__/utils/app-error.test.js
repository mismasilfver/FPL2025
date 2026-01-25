const { AppError } = require('../../js/utils/app-error.js');

describe('AppError', () => {
    it('should create an error with a message', () => {
        const error = new AppError('Test error message');
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error message');
        expect(error.name).toBe('AppError');
    });

    it('should assign default options correctly', () => {
        const error = new AppError('Test error');
        expect(error.code).toBeUndefined();
        expect(error.recoverable).toBe(false);
        expect(error.context).toBeUndefined();
    });

    it('should assign all options correctly', () => {
        const context = { userId: 123 };
        const error = new AppError('Test error', {
            code: 'TEST_CODE',
            recoverable: true,
            context: context
        });

        expect(error.code).toBe('TEST_CODE');
        expect(error.recoverable).toBe(true);
        expect(error.context).toBe(context);
    });

    it('should be an instance of both Error and AppError', () => {
        const error = new AppError('Test');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
    });
});
