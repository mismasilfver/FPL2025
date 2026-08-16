'use strict';

const {
  reopenDatabase,
  startSQLiteServer,
  stopSQLiteServer,
  createFetchJson
} = require('./sqlite-test-server-support.js');

async function createSQLiteTestServer(options = {}) {
  const dbOptions = {
    fileName: ':memory:',
    ...options
  };

  const { server, baseUrl } = await startSQLiteServer(dbOptions);

  async function reset() {
    reopenDatabase(dbOptions);
  }

  async function teardown() {
    await stopSQLiteServer(server);
  }

  return {
    server,
    baseUrl,
    dbOptions,
    fetchJson: createFetchJson(baseUrl),
    reset,
    teardown
  };
}

module.exports = {
  createSQLiteTestServer
};
