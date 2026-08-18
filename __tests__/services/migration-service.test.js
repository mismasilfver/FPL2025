const MigrationService = require('../../js/services/migration-service.js');
const { WeekModel } = require('../../js/models/week-model.js');

describe('MigrationService', () => {
  let service;

  beforeEach(() => {
    service = new MigrationService();
  });

  describe('isLegacyV1Format', () => {
    it('should return true for v1 format with players array', () => {
      const v1Data = {
        week: 1,
        players: [{ id: 'p1', name: 'Player 1' }],
        captain: 'p1',
        viceCaptain: null
      };
      expect(service.isLegacyV1Format(v1Data)).toBe(true);
    });

    it('should return true for v1 format with week property only', () => {
      const v1Data = {
        week: 2,
        captain: null,
        viceCaptain: null
      };
      expect(service.isLegacyV1Format(v1Data)).toBe(true);
    });

    it('should return false for v2 format with weeks object', () => {
      const v2Data = {
        version: '2.0',
        currentWeek: 1,
        weeks: {
          1: { players: [], captain: null, viceCaptain: null, isReadOnly: false }
        }
      };
      expect(service.isLegacyV1Format(v2Data)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(service.isLegacyV1Format(null)).toBe(false);
      expect(service.isLegacyV1Format(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(service.isLegacyV1Format({})).toBe(false);
    });
  });

  describe('migrateV1ToV2', () => {
    it('should migrate v1 format to v2 structure', () => {
      const v1Data = {
        week: 3,
        players: [
          { id: 'p1', name: 'Player 1', have: true, price: 10 },
          { id: 'p2', name: 'Player 2', have: false, price: 8 }
        ],
        captain: 'p1',
        viceCaptain: 'p2'
      };

      const migrated = service.migrateV1ToV2(v1Data);

      expect(migrated.version).toBe('3.0');
      expect(migrated.currentWeek).toBe(3);
      expect(migrated.weeks[3]).toBeDefined();
      expect(migrated.weeks[3].players).toHaveLength(2);
      expect(migrated.weeks[3].captain).toBe('p1');
      expect(migrated.weeks[3].viceCaptain).toBe('p2');
      expect(migrated.weeks[3].isReadOnly).toBe(false);
    });

    it('should handle missing players array', () => {
      const v1Data = {
        week: 1,
        captain: null,
        viceCaptain: null
      };

      const migrated = service.migrateV1ToV2(v1Data);

      expect(migrated.weeks[1].players).toEqual([]);
    });

    it('should default week to 1 if not specified', () => {
      const v1Data = {
        players: [],
        captain: null,
        viceCaptain: null
      };

      const migrated = service.migrateV1ToV2(v1Data);

      expect(migrated.currentWeek).toBe(1);
      expect(migrated.weeks[1]).toBeDefined();
    });
  });

  describe('needsFieldPopulation', () => {
    it('should return true when teamMembers is missing', () => {
      const week = {
        players: [],
        captain: null,
        viceCaptain: null,
        isReadOnly: false
      };
      expect(service.needsFieldPopulation(week)).toBe(true);
    });

    it('should return true when teamStats is missing', () => {
      const week = {
        players: [],
        captain: null,
        viceCaptain: null,
        teamMembers: [],
        isReadOnly: false
      };
      expect(service.needsFieldPopulation(week)).toBe(true);
    });

    it('should return true when totalTeamCost is missing', () => {
      const week = {
        players: [],
        captain: null,
        viceCaptain: null,
        teamMembers: [],
        teamStats: { totalValue: 0, playerCount: 0 },
        isReadOnly: false
      };
      expect(service.needsFieldPopulation(week)).toBe(true);
    });

    it('should return false when all derived fields exist', () => {
      const week = {
        players: [],
        captain: null,
        viceCaptain: null,
        teamMembers: [],
        teamStats: { totalValue: 0, playerCount: 0 },
        totalTeamCost: 0,
        isReadOnly: false
      };
      expect(service.needsFieldPopulation(week)).toBe(false);
    });
  });

  describe('populateMissingFields', () => {
    it('should add missing derived fields to week', () => {
      const root = {
        version: '2.0',
        currentWeek: 1,
        weeks: {
          1: {
            players: [{ id: 'p1', name: 'Player 1', have: true, price: 10 }],
            captain: null,
            viceCaptain: null,
            isReadOnly: false
          }
        }
      };

      const result = service.populateMissingFields(root, 1);

      expect(result.weeks[1].teamMembers).toEqual([{ id: 'p1', name: 'Player 1' }]);
      expect(result.weeks[1].teamStats).toEqual({
        totalValue: 10,
        playerCount: 1,
        updatedDate: expect.any(String)
      });
      expect(result.weeks[1].totalTeamCost).toBe(10);
    });

    it('should mark root as mutated when fields are added', () => {
      const root = {
        version: '2.0',
        currentWeek: 1,
        weeks: {
          1: {
            players: [],
            captain: null,
            viceCaptain: null,
            isReadOnly: false
          }
        }
      };

      const result = service.populateMissingFields(root, 1);

      expect(result._mutated).toBe(true);
    });

    it('should not mark as mutated if no changes needed', () => {
      const root = {
        version: '3.0',
        currentWeek: 1,
        weeks: {
          1: {
            players: [],
            captain: null,
            viceCaptain: null,
            teamMembers: [],
            teamStats: { totalValue: 0, playerCount: 0, updatedDate: '2024-01-01' },
            totalTeamCost: 0,
            isReadOnly: false
          }
        }
      };

      const result = service.populateMissingFields(root, 1);

      expect(result._mutated).toBe(false);
    });

    it('should add version if missing', () => {
      const root = {
        currentWeek: 1,
        weeks: {
          1: {
            players: [],
            teamMembers: [],
            teamStats: { totalValue: 0, playerCount: 0 },
            totalTeamCost: 0,
            isReadOnly: false
          }
        }
      };

      const result = service.populateMissingFields(root, 1);

      expect(result.version).toBe('3.0');
      expect(result._mutated).toBe(true);
    });

    it('should add missing FPL metadata fields to existing players', () => {
      const root = {
        version: '2.0',
        currentWeek: 1,
        weeks: {
          1: {
            players: [{ id: 'p1', name: 'Player 1', have: true, price: 10 }],
            captain: null,
            viceCaptain: null,
            teamMembers: [],
            teamStats: { totalValue: 0, playerCount: 0 },
            totalTeamCost: 0,
            isReadOnly: false
          }
        }
      };

      const result = service.populateMissingFields(root, 1);
      const player = result.weeks[1].players[0];

      expect(player.fplId).toBe('');
      expect(player.nowCostTenths).toBe(0);
      expect(player.totalPoints).toBe(0);
      expect(player.eventPoints).toBe(0);
      expect(player.form).toBe(0);
      expect(player.availability).toBe('unknown');
    });
  });

  describe('migrateIfNeeded', () => {
    it('should migrate v1 data to v2', () => {
      const v1Data = {
        week: 1,
        players: [{ id: 'p1', name: 'Player 1' }],
        captain: null,
        viceCaptain: null
      };

      const result = service.migrateIfNeeded(v1Data);

      expect(result.version).toBe('3.0');
      expect(result.weeks).toBeDefined();
    });

    it('should populate missing fields in v2 data', () => {
      const v2Data = {
        currentWeek: 1,
        weeks: {
          1: {
            players: [{ id: 'p1', name: 'Player 1', have: true, price: 5 }],
            captain: null,
            viceCaptain: null,
            isReadOnly: false
          }
        }
      };

      const result = service.migrateIfNeeded(v2Data);

      expect(result.version).toBe('3.0');
      expect(result.weeks[1].teamMembers).toBeDefined();
      expect(result.weeks[1].teamStats).toBeDefined();
    });

    it('should return data unchanged if no migration needed', () => {
      const completeData = {
        version: '3.0',
        currentWeek: 1,
        weeks: {
          1: {
            players: [],
            teamMembers: [],
            teamStats: { totalValue: 0, playerCount: 0 },
            totalTeamCost: 0,
            captain: null,
            viceCaptain: null,
            isReadOnly: false
          }
        }
      };

      const result = service.migrateIfNeeded(completeData);

      expect(result).toEqual(completeData);
    });

    it('should return default root for null/undefined', () => {
      const result = service.migrateIfNeeded(null);

      expect(result.currentWeek).toBe(1);
      expect(result.weeks[1]).toBeDefined();
    });
  });
});
