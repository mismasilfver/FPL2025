function buildMockStorageAdapter() {
  return {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  };
}

module.exports = { buildMockStorageAdapter };

// Trivial test to satisfy Jest (this file exports helpers)
describe('test-helpers smoke', () => {
  test('exports buildMockStorageAdapter', () => {
    expect(typeof buildMockStorageAdapter).toBe('function');
  });
});
