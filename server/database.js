const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const defaultOptions = {
  fileName: 'fpl_data.db',
  directory: 'data'
};

let databaseOptions = { ...defaultOptions };
const DEFAULT_ROOT_KEY = 'root';
const DEFAULT_WEEK_NUMBER = 1;

let dbInstance = null;

function createDefaultWeek(weekNumber = DEFAULT_WEEK_NUMBER) {
  return {
    weekNumber,
    players: [],
    captain: null,
    viceCaptain: null,
    notes: '',
    isReadOnly: false,
    teamMembers: [],
    teamStats: {
      totalValue: 0,
      totalPlayers: 0
    }
  };
}

function createDefaultRoot() {
  const defaultWeek = createDefaultWeek(DEFAULT_WEEK_NUMBER);
  return {
    version: '2.0',
    currentWeek: DEFAULT_WEEK_NUMBER,
    weeks: {
      [DEFAULT_WEEK_NUMBER]: defaultWeek
    }
  };
}

function ensureDataDirectory(directoryPath) {
  if (!directoryPath) return;
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function openDatabase() {
  const { fileName, directory } = databaseOptions;
  const isMemoryDatabase = fileName === ':memory:';
  const dataDir = isMemoryDatabase ? null : path.resolve(__dirname, directory);

  ensureDataDirectory(dataDir);

  const dbPath = isMemoryDatabase ? ':memory:' : path.join(dataDir, fileName);
  dbInstance = new Database(dbPath);

  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
}

function configureDatabase(options = {}) {
  databaseOptions = { ...databaseOptions, ...options };
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  databaseOptions = { ...defaultOptions };
}

function getDatabase(options = {}) {
  if (options && Object.keys(options).length > 0) {
    configureDatabase(options);
  }

  if (!dbInstance) {
    openDatabase();
  }

  return dbInstance;
}

function initializeSchema(options = {}) {
  const db = getDatabase(options);

  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS weeks (
      week_number INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureDefaultRoot(db);

  return db;
}

function ensureDefaultRoot(db) {
  const row = readRootRow(db);

  if (row && row.value) {
    const parsed = safeParseJSON(row.value, null);
    if (parsed) {
      const normalizedWeeks = normalizeWeeks(parsed.weeks);
      parsed.weeks = normalizedWeeks;
      parsed.currentWeek = Number.isInteger(parsed.currentWeek) && parsed.currentWeek > 0
        ? parsed.currentWeek
        : DEFAULT_WEEK_NUMBER;

      const transaction = db.transaction(() => {
        persistRoot(db, parsed);
        syncWeeksFromRoot(db, normalizedWeeks);
      });

      transaction();
      return parsed;
    }
  }

  const defaultRoot = createDefaultRoot();
  const transaction = db.transaction(() => {
    persistRoot(db, defaultRoot);
    syncWeeksFromRoot(db, defaultRoot.weeks);
  });
  transaction();

  return defaultRoot;
}

function readRootRow(db) {
  return db.prepare('SELECT value FROM meta WHERE key = ?').get(DEFAULT_ROOT_KEY);
}

function persistRoot(db, rootData) {
  db.prepare(`
    INSERT INTO meta (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run({
    key: DEFAULT_ROOT_KEY,
    value: JSON.stringify(rootData)
  });
}

function syncWeeksFromRoot(db, weeks = {}) {
  const upsert = db.prepare(`
    INSERT INTO weeks (week_number, payload)
    VALUES (?, ?)
    ON CONFLICT(week_number) DO UPDATE SET payload = excluded.payload
  `);

  const weekNumbers = [];

  for (const [key, value] of Object.entries(weeks || {})) {
    const weekNumber = Number(key);
    if (!Number.isInteger(weekNumber) || weekNumber <= 0) continue;
    weekNumbers.push(weekNumber);
    upsert.run(weekNumber, JSON.stringify(value));
  }

  if (weekNumbers.length === 0) {
    db.prepare('DELETE FROM weeks').run();
    return;
  }

  const placeholders = weekNumbers.map(() => '?').join(', ');
  db.prepare(`DELETE FROM weeks WHERE week_number NOT IN (${placeholders})`).run(...weekNumbers);
}

function safeParseJSON(value, fallback) {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[storage] Failed to parse JSON payload from SQLite. Resetting to default.', error);
    return fallback;
  }
}

function normalizeWeeks(weeks) {
  if (!weeks || typeof weeks !== 'object') return {};

  const normalized = {};
  for (const [key, value] of Object.entries(weeks)) {
    const weekNumber = Number(key);
    if (!Number.isInteger(weekNumber) || weekNumber <= 0) continue;
    normalized[weekNumber] = normalizeWeekPayload(weekNumber, value);
  }
  return normalized;
}

function normalizeWeekPayload(weekNumber, payload = {}) {
  const base = { ...(payload || {}) };
  base.weekNumber = weekNumber;
  base.players = Array.isArray(base.players) ? base.players : [];
  base.teamMembers = Array.isArray(base.teamMembers) ? base.teamMembers : [];
  base.captain = base.captain ?? null;
  base.viceCaptain = base.viceCaptain ?? null;
  base.notes = typeof base.notes === 'string' ? base.notes : '';
  base.isReadOnly = Boolean(base.isReadOnly);
  base.teamStats = normalizeTeamStats(base.teamStats);
  return base;
}

function normalizeTeamStats(stats) {
  if (stats && typeof stats === 'object' && !Array.isArray(stats)) {
    const copy = { ...stats };
    copy.totalValue = Number.isFinite(copy.totalValue) ? copy.totalValue : 0;
    copy.totalPlayers = Number.isFinite(copy.totalPlayers) ? copy.totalPlayers : 0;
    return copy;
  }

  return {
    totalValue: 0,
    totalPlayers: 0
  };
}

function coerceWeekNumber(value) {
  const weekNumber = Number(value);
  if (!Number.isInteger(weekNumber) || weekNumber <= 0) {
    throw new TypeError(`Invalid week number: ${value}`);
  }
  return weekNumber;
}

function upsertWeek(db, weekNumber, payload) {
  db.prepare(`
    INSERT INTO weeks (week_number, payload)
    VALUES (?, ?)
    ON CONFLICT(week_number) DO UPDATE SET payload = excluded.payload
  `).run(weekNumber, JSON.stringify(payload));
}

function getRootData() {
  const db = getDatabase();
  const row = readRootRow(db);

  if (!row || !row.value) {
    return ensureDefaultRoot(db);
  }

  const parsed = safeParseJSON(row.value, null);
  if (!parsed) {
    return ensureDefaultRoot(db);
  }

  parsed.weeks = normalizeWeeks(parsed.weeks);
  parsed.currentWeek = Number.isInteger(parsed.currentWeek) && parsed.currentWeek > 0
    ? parsed.currentWeek
    : DEFAULT_WEEK_NUMBER;

  return parsed;
}

function setRootData(data, options = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Root payload must be a plain object');
  }

  const db = getDatabase();
  const normalizedRoot = {
    ...data,
    version: data.version || '2.0',
    currentWeek: Number.isInteger(data.currentWeek) && data.currentWeek > 0
      ? data.currentWeek
      : DEFAULT_WEEK_NUMBER
  };

  normalizedRoot.weeks = normalizeWeeks(data.weeks);

  const transaction = db.transaction(() => {
    persistRoot(db, normalizedRoot);
    if (options.syncWeeks !== false) {
      syncWeeksFromRoot(db, normalizedRoot.weeks);
    }
  });

  transaction();
  return normalizedRoot;
}

function listWeeks() {
  const db = getDatabase();
  const rows = db.prepare('SELECT week_number, payload FROM weeks ORDER BY week_number ASC').all();

  return rows.map(({ week_number: weekNumber, payload }) => {
    return normalizeWeekPayload(weekNumber, safeParseJSON(payload, {}));
  });
}

function getWeek(weekNumber) {
  const db = getDatabase();
  const normalizedNumber = coerceWeekNumber(weekNumber);
  const row = db.prepare('SELECT payload FROM weeks WHERE week_number = ?').get(normalizedNumber);

  if (!row) return null;

  return normalizeWeekPayload(normalizedNumber, safeParseJSON(row.payload, {}));
}

function saveWeek(weekNumber, payload = {}) {
  const db = getDatabase();
  const normalizedNumber = coerceWeekNumber(weekNumber);
  const normalizedWeek = normalizeWeekPayload(normalizedNumber, payload);

  const transaction = db.transaction(() => {
    upsertWeek(db, normalizedNumber, normalizedWeek);

    const currentRoot = getRootData();
    const updatedRoot = {
      ...currentRoot,
      weeks: {
        ...currentRoot.weeks,
        [normalizedNumber]: normalizedWeek
      }
    };

    persistRoot(db, updatedRoot);
  });

  transaction();

  return normalizedWeek;
}

function deleteWeek(weekNumber) {
  const db = getDatabase();
  const normalizedNumber = coerceWeekNumber(weekNumber);

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM weeks WHERE week_number = ?').run(normalizedNumber);

    const currentRoot = getRootData();
    const updatedWeeks = { ...currentRoot.weeks };
    delete updatedWeeks[normalizedNumber];

    if (Object.keys(updatedWeeks).length === 0) {
      updatedWeeks[DEFAULT_WEEK_NUMBER] = createDefaultWeek(DEFAULT_WEEK_NUMBER);
    }

    const highestWeek = getHighestWeekNumber(updatedWeeks);
    const updatedRoot = {
      ...currentRoot,
      currentWeek: highestWeek,
      weeks: updatedWeeks
    };

    persistRoot(db, updatedRoot);
  });

  transaction();
}

function getHighestWeekNumber(weeks) {
  const numbers = Object.keys(weeks || {})
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);

  if (numbers.length === 0) {
    return DEFAULT_WEEK_NUMBER;
  }

  return Math.max(...numbers);
}

module.exports = {
  getDatabase,
  initializeSchema,
  getRootData,
  setRootData,
  listWeeks,
  getWeek,
  saveWeek,
  deleteWeek,
  createDefaultWeek,
  createDefaultRoot,
  configureDatabase,
  closeDatabase
};
