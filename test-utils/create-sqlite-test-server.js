'use strict';

const { startServer } = require('../server/server.js');
const database = require('../server/database.js');

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

async function createSQLiteTestServer(options = {}) {
  const dbOptions = {
    fileName: ':memory:',
    ...options
  };

  database.configureDatabase(dbOptions);
  database.initializeSchema(dbOptions);

  const server = startServer(0, dbOptions);
  await waitForEvent(server, 'listening');

  const addressInfo = server.address();
  const port = addressInfo.port;
  const baseUrl = `http://127.0.0.1:${port}`;

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
    database.configureDatabase(dbOptions);
    database.initializeSchema(dbOptions);
  }

  async function teardown() {
    // Force close all connections to prevent open handles
    await new Promise((resolve, reject) => {
      server.closeAllConnections?.(); // Node 18.2+
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    database.closeDatabase();
  }

  return {
    server,
    baseUrl,
    dbOptions,
    fetchJson,
    reset,
    teardown
  };
}

module.exports = {
  createSQLiteTestServer
};
