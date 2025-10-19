const express = require('express');

const database = require('../database');

const router = express.Router();

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
    const payload = req.body;
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
    const { weekNumber, payload } = req.body || {};
    const normalizedWeekNumber = validateWeekNumber(weekNumber);

    const created = database.saveWeek(
      normalizedWeekNumber,
      payload || database.createDefaultWeek(normalizedWeekNumber)
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
    const payload = req.body;
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
  res.status(500).json({ message: 'Internal server error', details: error.message });
});

module.exports = router;
