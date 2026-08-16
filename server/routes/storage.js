const express = require('express');

const database = require('../database');
const { isPlainObject } = require('../security');

const router = express.Router();

function validatePayload(value, name) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function validateWeekNumber(value) {
  const weekNumber = Number(value);
  if (!Number.isInteger(weekNumber) || weekNumber <= 0) {
    throw new TypeError('weekNumber must be a positive integer');
  }
  return weekNumber;
}

router.get('/root', (_req, res, next) => {
  try {
    const rootData = database.getRootData();
    res.json(rootData);
  } catch (error) {
    next(error);
  }
});

router.put('/root', (req, res, next) => {
  try {
    const payload = validatePayload(req.body, 'root payload');
    const updated = database.setRootData(payload);
    res.json(updated);
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.get('/weeks', (_req, res, next) => {
  try {
    const weeks = database.listWeeks();
    res.json(weeks);
  } catch (error) {
    next(error);
  }
});

router.get('/weeks/:weekNumber', (req, res, next) => {
  try {
    const weekNumber = validateWeekNumber(req.params.weekNumber);
    const week = database.getWeek(weekNumber);
    if (!week) {
      res.status(404).json({ message: 'Week not found' });
      return;
    }
    res.json(week);
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.post('/weeks', (req, res, next) => {
  try {
    const body = validatePayload(req.body, 'request body');
    const { weekNumber, payload } = body;
    const normalizedWeekNumber = validateWeekNumber(weekNumber);

    const created = database.saveWeek(
      normalizedWeekNumber,
      payload === undefined || payload === null
        ? database.createDefaultWeek(normalizedWeekNumber)
        : validatePayload(payload, 'week payload')
    );
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.put('/weeks/:weekNumber', (req, res, next) => {
  try {
    const weekNumber = validateWeekNumber(req.params.weekNumber);
    const payload = validatePayload(req.body, 'week payload');
    const updated = database.saveWeek(weekNumber, payload);
    res.json(updated);
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.delete('/weeks/:weekNumber', (req, res, next) => {
  try {
    const weekNumber = validateWeekNumber(req.params.weekNumber);
    const existing = database.getWeek(weekNumber);
    if (!existing) {
      res.status(404).json({ message: 'Week not found' });
      return;
    }

    database.deleteWeek(weekNumber);
    res.status(204).send();
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

router.use((error, _req, res, _next) => {
  console.error('[storage-api] Error:', error);
  const body = { message: 'Internal server error' };
  // Internal error messages can leak schema and filesystem details, so they
  // are only echoed back outside production.
  if (process.env.NODE_ENV !== 'production') {
    body.details = error.message;
  }
  res.status(500).json(body);
});

module.exports = router;
