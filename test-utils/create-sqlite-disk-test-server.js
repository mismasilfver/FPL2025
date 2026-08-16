'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  openDatabase,
  startSQLiteServer,
  stopSQLiteServer,
  createFetchJson
} = require('./sqlite-test-server-support.js');
const database = require('../server/database.js');

async function createTempDirectory(prefix = 'fpl-sqlite-disk-') {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function removeDirectory(targetPath) {
  if (!targetPath) return;
  await fs.promises.rm(targetPath, { recursive: true, force: true });
}

async function createSQLiteDiskTestServer(options = {}) {
  const tempDir = await createTempDirectory();
  const dbOptions = {
    fileName: options.fileName || 'test.sqlite',
    ...options,
    directory: tempDir
  };

  const { server, baseUrl } = await startSQLiteServer(dbOptions);
  const databasePath = path.join(tempDir, dbOptions.fileName);

  async function reset() {
    database.closeDatabase();
    try {
      await fs.promises.unlink(databasePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    openDatabase(dbOptions);
  }

  async function teardown() {
    await stopSQLiteServer(server);
    await removeDirectory(tempDir);
  }

  return {
    server,
    baseUrl,
    databasePath,
    databaseDir: tempDir,
    fetchJson: createFetchJson(baseUrl),
    reset,
    teardown
  };
}

module.exports = {
  createSQLiteDiskTestServer
};
