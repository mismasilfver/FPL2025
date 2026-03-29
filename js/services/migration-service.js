import { WeekModel } from '../models/week-model.js';

/**
 * MigrationService handles data migration from legacy formats to current format.
 * Responsible for:
 * - Detecting and migrating v1 format ({ week, players, captain, viceCaptain }) to v2
 * - Populating missing derived fields (teamMembers, teamStats, totalTeamCost)
 * - Adding version field if missing
 */
export class MigrationService {
  /**
   * Check if data is in legacy v1 format
   * v1 format: { week, players, captain, viceCaptain } without weeks object
   * @param {object} data - Data to check
   * @returns {boolean} True if v1 format
   */
  isLegacyV1Format(data) {
    if (!data || typeof data !== 'object') return false;
    // V1 has no 'weeks' property but has either 'players' array or 'week' property
    return !data.weeks && (Array.isArray(data.players) || typeof data.week !== 'undefined');
  }

  /**
   * Migrate v1 format to v2 format
   * @param {object} v1Data - Legacy v1 data
   * @returns {object} Migrated v2 data
   */
  migrateV1ToV2(v1Data) {
    const legacyWeek = Number(v1Data.week) || 1;
    const migrated = {
      version: '2.0',
      currentWeek: legacyWeek,
      weeks: {
        [legacyWeek]: {
          players: Array.isArray(v1Data.players) ? v1Data.players : [],
          captain: v1Data.captain || null,
          viceCaptain: v1Data.viceCaptain || null,
          isReadOnly: false
        }
      }
    };
    return migrated;
  }

  /**
   * Check if week needs missing fields populated
   * @param {object} week - Week object to check
   * @returns {boolean} True if fields need population
   */
  needsFieldPopulation(week) {
    if (!week || typeof week !== 'object') return false;
    return !Array.isArray(week.teamMembers) || 
           !week.teamStats || 
           typeof week.totalTeamCost === 'undefined';
  }

  /**
   * Compute team snapshot for derived fields
   * @param {Array} players - Players array
   * @returns {object} Computed snapshot with teamMembers, teamStats, totalTeamCost
   */
  _computeTeamSnapshot(players) {
    const teamMembers = (players || [])
      .filter(p => p.have)
      .map(p => ({ id: p.id, name: p.name }));

    const totalValue = (players || [])
      .filter(p => p.have)
      .reduce((sum, p) => sum + (p.price || 0), 0);

    const playerCount = (players || []).filter(p => p.have).length;

    return {
      teamMembers,
      teamStats: {
        totalValue,
        playerCount,
        updatedDate: new Date().toISOString()
      },
      totalTeamCost: totalValue
    };
  }

  /**
   * Populate missing derived fields in a week
   * @param {object} root - Root data object
   * @param {string|number} weekNumber - Week number to populate
   * @returns {object} Root with populated fields and _mutated flag
   */
  populateMissingFields(root, weekNumber) {
    const wn = String(weekNumber);
    const week = root.weeks?.[wn];
    
    if (!week || !this.needsFieldPopulation(week)) {
      // Still check version
      if (!root.version) {
        root.version = '2.0';
        return { ...root, _mutated: true };
      }
      return { ...root, _mutated: false };
    }

    const snapshot = this._computeTeamSnapshot(week.players || []);
    
    root.weeks[wn] = {
      ...week,
      teamMembers: snapshot.teamMembers,
      teamStats: snapshot.teamStats,
      totalTeamCost: snapshot.totalTeamCost
    };

    if (!root.version) {
      root.version = '2.0';
    }

    return { ...root, _mutated: true };
  }

  /**
   * Migrate data if needed, handling both v1→v2 and field population
   * @param {object} data - Data to potentially migrate
   * @returns {object} Migrated data or default root if null
   */
  migrateIfNeeded(data) {
    // Handle null/undefined
    if (!data || typeof data !== 'object') {
      return {
        version: '2.0',
        currentWeek: 1,
        weeks: {
          1: WeekModel.createDefault(1)
        }
      };
    }

    // Migrate v1 to v2
    if (this.isLegacyV1Format(data)) {
      return this.migrateV1ToV2(data);
    }

    // Populate missing fields in v2 data
    if (data.weeks) {
      let mutated = false;
      const weekKeys = Object.keys(data.weeks);
      
      for (const wk of weekKeys) {
        const result = this.populateMissingFields(data, wk);
        if (result._mutated) {
          mutated = true;
          data = result;
        }
      }

      if (mutated) {
        return data;
      }
    }

    return data;
  }
}

export default MigrationService;

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MigrationService;
}
