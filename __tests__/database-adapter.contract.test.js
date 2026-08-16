/**
 * Unit tests for the shared key-value database adapter contract helpers.
 */

const {
  REQUIRED_DATABASE_METHODS,
  assertConformsToDatabaseContract
} = require('../js/storage/adapters/database-adapter.contract.js');

const createConformingAdapter = () =>
  REQUIRED_DATABASE_METHODS.reduce((adapter, method) => {
    adapter[method] = jest.fn();
    return adapter;
  }, {});

describe('database adapter contract', () => {
  describe('REQUIRED_DATABASE_METHODS', () => {
    it('lists the key-value methods and is frozen', () => {
      expect(REQUIRED_DATABASE_METHODS).toEqual(['get', 'set', 'remove', 'getAll', 'clear']);
      expect(Object.isFrozen(REQUIRED_DATABASE_METHODS)).toBe(true);
    });
  });

  describe('assertConformsToDatabaseContract', () => {
    it('returns true for an adapter implementing every required method', () => {
      expect(assertConformsToDatabaseContract(createConformingAdapter(), 'conforming')).toBe(true);
    });

    it('accepts class instances that inherit the required methods', () => {
      class InheritedAdapter {}
      Object.assign(InheritedAdapter.prototype, createConformingAdapter());

      expect(assertConformsToDatabaseContract(new InheritedAdapter())).toBe(true);
    });

    it('returns false when a required method is missing', () => {
      const adapter = createConformingAdapter();
      delete adapter.clear;

      expect(assertConformsToDatabaseContract(adapter, 'incomplete')).toBe(false);
    });

    it('returns false when a required method is not callable', () => {
      const adapter = createConformingAdapter();
      adapter.getAll = 'not-a-function';

      expect(assertConformsToDatabaseContract(adapter, 'invalid')).toBe(false);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a string', 'adapter'],
      ['a function', () => {}]
    ])('throws a TypeError when given %s', (_label, candidate) => {
      expect(() => assertConformsToDatabaseContract(candidate)).toThrow(TypeError);
      expect(() => assertConformsToDatabaseContract(candidate)).toThrow(
        'A valid adapter instance must be provided'
      );
    });
  });
});
