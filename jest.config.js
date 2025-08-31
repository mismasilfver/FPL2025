module.exports = {
  // A list of paths to modules that run some code to configure or set up the testing framework before each test.
  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/jest.setup.js'],

  // The test environment that will be used for testing
  testEnvironment: 'jsdom',

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'script.js', // Only collect coverage from the main script file
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\.js$': 'babel-jest',
  },
};
