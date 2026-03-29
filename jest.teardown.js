// Global teardown to ensure all resources are cleaned up after all tests complete

module.exports = async () => {
  // Force close any remaining database connections
  const database = require('./server/database.js');
  try {
    database.closeDatabase();
  } catch (error) {
    // Database might already be closed
  }

  // Clear any remaining timers
  if (global.setTimeout && typeof global.setTimeout.clearAll === 'function') {
    global.setTimeout.clearAll();
  }
  if (global.setInterval && typeof global.setInterval.clearAll === 'function') {
    global.setInterval.clearAll();
  }

  // Give a small delay for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 100));
};
