'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const { startServer } = require('../server/server.js');
const database = require('../server/database.js');

const mkdtemp = promisify(fs.mkdtemp);
const rm = promisify(fs.rm ? fs.rm : fs.rmdir);

function waitForEvent(emitter, event) {
  return new Promise((resolve, reject) => {
    const handleResolve = (...args) => {
      cleanup();
      resolve(...args);
    };

    const handleReject = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      emitter.removeListener(event, handleResolve);
      emitter.removeListener('error', handleReject);
    };

    emitter.once(event, handleResolve);
    emitter.once('error', handleReject);
  });
}

async function createTempDirectory(prefix = 'fpl-sqlite-disk-') {
  const base = path.join(os.tmpdir(), prefix);
  return mkdtemp(base);
}

async function removeDirectory(targetPath) {
  if (!targetPath) return;
  if (typeof fs.rm === 'function') {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
    return;
  }

  // Fallback for older Node versions
  const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await removeDirectory(entryPath);
    } else {
      await fs.promises.unlink(entryPath);
    }
  }));
  await fs.promises.rmdir(targetPath);
}

async function createSQLiteDiskTestServer(options = {}) {
  const tempDir = await createTempDirectory();
  const dbOptions = {
    directory: tempDir,
    fileName: options.fileName || 'test.sqlite',
    ...options,
    directory: tempDir
  };

  database.configureDatabase(dbOptions);
  database.initializeSchema(dbOptions);

  const server = startServer(0, dbOptions);
  await waitForEvent(server, 'listening');

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const databasePath = path.join(tempDir, dbOptions.fileName);

  async function fetchJson(pathname, init) {
    const url = `${baseUrl}${pathname}`;
    const response = await fetch(url, init);

    if (!response.ok) {
      const text = await response.text();
      const error = new Error(`Request to ${pathname} failed with ${response.status}: ${text}`);
      error.status = response.status;
      throw error;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function reset() {
    database.closeDatabase();
    try {
      await fs.promises.unlink(databasePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    database.configureDatabase(dbOptions);
    database.initializeSchema(dbOptions);
  }

  async function teardown() {
    await new Promise((resolve) => server.close(resolve));
    database.closeDatabase();
    await removeDirectory(tempDir);
  }

  return {
    server,
    baseUrl,
    databasePath,
    databaseDir: tempDir,
    fetchJson,
    reset,
    teardown
  };
}

module.exports = {
  createSQLiteDiskTestServer
};
