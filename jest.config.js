module.exports = {
  // A list of paths to modules that run some code to configure or set up the testing framework before each test.
  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/jest.setup.js', '<rootDir>/test-setup.js'],

  // The test environment that will be used for testing
  testEnvironment: 'jsdom',
  
  // A URL for the jsdom environment (replacement for deprecated testURL)
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'script.js', // Only collect coverage from the main script file
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },
  
  // Don't transform node_modules except for specific packages that need it
  transformIgnorePatterns: [
    'node_modules/(?!(your-esm-packages-here)/)',
  ],

  // Paths to ignore when running tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/fixtures/',
    'test-utils.js',
    'test-helpers.js',
    'alert-test-helpers.js',
    'alert-test-utils.js',
  ],
  
  // Module name mapper for handling module paths
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Don't run setup files during tests
  setupFiles: [],
  
  // Don't automatically clear mocks between tests
  clearMocks: false,
  
  // Reset modules between tests to avoid state leakage
  resetModules: true,
};
