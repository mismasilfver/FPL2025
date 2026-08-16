/**
 * Shared helpers describing the v2 root payload shape.
 *
 * Keeping the defaults here (rather than in the storage module facade) lets
 * adapters normalize payloads without importing the module that constructs them.
 */

import { WeekModel } from '../models/week-model.js';

export const ROOT_VERSION = '2.0';

export function createDefaultRoot() {
  return {
    version: ROOT_VERSION,
    currentWeek: 1,
    weeks: {
      1: WeekModel.createDefault(1)
    }
  };
}

export function normalizeWeekNumber(value) {
  const weekNumber = Number(value);
  return Number.isInteger(weekNumber) && weekNumber > 0 ? weekNumber : 1;
}

/**
 * Returns the version/currentWeek metadata for a root payload, applying defaults
 * for missing or invalid values.
 */
export function normalizeRootMetadata(root) {
  return {
    version: root?.version || ROOT_VERSION,
    currentWeek: normalizeWeekNumber(root?.currentWeek)
  };
}

/**
 * Normalizes every week entry of a root payload, dropping invalid week keys.
 */
export function normalizeRootWeeks(weeks) {
  return Object.entries(weeks || {}).reduce((acc, [key, value]) => {
    const weekNumber = Number(key);
    if (Number.isInteger(weekNumber) && weekNumber > 0) {
      acc[weekNumber] = WeekModel.normalize(value, weekNumber);
    }
    return acc;
  }, {});
}

export function parseRootPayload(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.ROOT_VERSION = ROOT_VERSION;
  module.exports.createDefaultRoot = createDefaultRoot;
  module.exports.normalizeWeekNumber = normalizeWeekNumber;
  module.exports.normalizeRootMetadata = normalizeRootMetadata;
  module.exports.normalizeRootWeeks = normalizeRootWeeks;
  module.exports.parseRootPayload = parseRootPayload;
}
