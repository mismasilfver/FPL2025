/**
 * @jest-environment jsdom
 */

const { makeAsync, patchAsyncMethods, makeMethodAsync } = require('../js/async-helpers.js');

describe('async-helpers', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('makeAsync', () => {
    it('resolves the value of a synchronous method', async () => {
      const wrapped = makeAsync(function (a, b) {
        return a + b;
      });

      await expect(wrapped(1, 2)).resolves.toBe(3);
    });

    it('awaits a promise returned by the method', async () => {
      const wrapped = makeAsync(() => Promise.resolve('done'));

      await expect(wrapped()).resolves.toBe('done');
    });

    it('preserves the calling context', async () => {
      const obj = {
        value: 'context',
        getValue: makeAsync(function () {
          return this.value;
        })
      };

      await expect(obj.getValue()).resolves.toBe('context');
    });

    it('logs and rethrows synchronous errors', async () => {
      const error = new Error('sync failure');
      const wrapped = makeAsync(() => {
        throw error;
      });

      await expect(wrapped()).rejects.toBe(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in async method:', error);
    });

    it('rejects when the returned promise rejects', async () => {
      const error = new Error('async failure');
      const wrapped = makeAsync(() => Promise.reject(error));

      await expect(wrapped()).rejects.toBe(error);
    });
  });

  describe('patchAsyncMethods', () => {
    it('wraps the named methods so they return promises', async () => {
      const obj = {
        sync: () => 'value',
        other: () => 'untouched'
      };
      const originalOther = obj.other;

      patchAsyncMethods(obj, ['sync']);

      const result = obj.sync();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe('value');
      expect(obj.other).toBe(originalOther);
    });

    it('ignores names that are missing or not functions', () => {
      const obj = { notAFunction: 42 };

      expect(() => patchAsyncMethods(obj, ['notAFunction', 'missing'])).not.toThrow();
      expect(obj.notAFunction).toBe(42);
      expect(obj.missing).toBeUndefined();
    });
  });

  describe('makeMethodAsync', () => {
    class Example {
      constructor() {
        this.value = 'instance';
      }

      getValue() {
        return this.value;
      }

      getAsyncValue() {
        return Promise.resolve('async instance');
      }

      fail() {
        throw new Error('method failure');
      }
    }

    it('makes a prototype method return a promise bound to the instance', async () => {
      makeMethodAsync(Example.prototype, 'getValue');
      const instance = new Example();

      const result = instance.getValue();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe('instance');
    });

    it('awaits promise-returning prototype methods', async () => {
      makeMethodAsync(Example.prototype, 'getAsyncValue');

      await expect(new Example().getAsyncValue()).resolves.toBe('async instance');
    });

    it('logs the method name and rethrows when the method throws', async () => {
      makeMethodAsync(Example.prototype, 'fail');

      await expect(new Example().fail()).rejects.toThrow('method failure');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in fail:', expect.any(Error));
    });

    it('does nothing when the method does not exist', () => {
      const prototype = {};

      expect(() => makeMethodAsync(prototype, 'missing')).not.toThrow();
      expect(prototype.missing).toBeUndefined();
    });
  });
});
