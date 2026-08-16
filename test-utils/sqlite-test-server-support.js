'use strict';

/**
 * Lifecycle helpers shared by the in-memory and on-disk SQLite test servers.
 */

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

function openDatabase(dbOptions) {
  database.configureDatabase(dbOptions);
  database.initializeSchema(dbOptions);
}

function reopenDatabase(dbOptions) {
  database.closeDatabase();
  openDatabase(dbOptions);
}

/**
 * Opens the database, starts the API server on an ephemeral port and waits until
 * it is listening.
 */
async function startSQLiteServer(dbOptions) {
  openDatabase(dbOptions);

  const server = startServer(0, dbOptions);
  await waitForEvent(server, 'listening');

  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  };
}

async function stopSQLiteServer(server) {
  await new Promise((resolve, reject) => {
    server.closeAllConnections?.(); // Node 18.2+, avoids leaking open handles
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  database.closeDatabase();
}

function createFetchJson(baseUrl) {
  return async function fetchJson(pathname, init) {
    const response = await fetch(`${baseUrl}${pathname}`, init);
    const text = await response.text();

    if (!response.ok) {
      const error = new Error(`Request to ${pathname} failed with ${response.status}: ${text}`);
      error.status = response.status;
      throw error;
    }

    return text ? JSON.parse(text) : null;
  };
}

module.exports = {
  waitForEvent,
  openDatabase,
  reopenDatabase,
  startSQLiteServer,
  stopSQLiteServer,
  createFetchJson
};
