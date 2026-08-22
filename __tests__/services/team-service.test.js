import TeamService, { getActiveTeam, getActiveWeek } from '../../js/services/team-service.js';
import { WeekModel } from '../../js/models/week-model.js';

function createDefaultTeam(id, name = 'Default Team') {
  return {
    id,
    name,
    type: 'whatif',
    fplEntryId: null,
    currentWeek: 1,
    weeks: { 1: WeekModel.createDefault(1) },
    totalPoints: 0,
    gameweekPoints: {},
  };
}

describe('TeamService', () => {
  let service;
  let rootData;

  beforeEach(() => {
    service = new TeamService();
    rootData = {
      version: '3.0',
      settings: { fplEntryId: null },
      currentTeam: 'default',
      teams: {
        default: createDefaultTeam('default', 'Primary Team'),
      },
    };
    rootData.teams.default.type = 'primary';
  });

  describe('getCurrentTeam', () => {
    it('should return the current team', () => {
      const team = service.getCurrentTeam(rootData);
      expect(team.id).toBe('default');
    });
  });

  describe('createTeam', () => {
    it('should create a new what-if team', () => {
      const updatedRoot = service.createTeam(rootData, 'Wildcard', 'whatif');
      const team = updatedRoot.teams.wildcard;
      expect(team).toBeDefined();
      expect(team.name).toBe('Wildcard');
      expect(team.type).toBe('whatif');
      expect(updatedRoot.currentTeam).toBe('wildcard');
    });

    it('should throw if team id already exists', () => {
      expect(() => service.createTeam(rootData, 'Default', 'whatif')).toThrow('Team already exists');
    });
  });

  describe('switchTeam', () => {
    it('should switch to an existing team', () => {
      service.createTeam(rootData, 'Bench', 'whatif');
      const updatedRoot = service.switchTeam(rootData, 'bench');
      expect(updatedRoot.currentTeam).toBe('bench');
    });

    it('should throw if team does not exist', () => {
      expect(() => service.switchTeam(rootData, 'missing')).toThrow('Team not found');
    });
  });

  describe('deleteTeam', () => {
    it('should delete a what-if team', () => {
      const afterCreate = service.createTeam(rootData, 'ToDelete', 'whatif');
      const afterDelete = service.deleteTeam(afterCreate, 'todelete');
      expect(afterDelete.teams.todelete).toBeUndefined();
      expect(afterDelete.currentTeam).toBe('default');
    });

    it('should not delete the last primary team', () => {
      expect(() => service.deleteTeam(rootData, 'default')).toThrow('Cannot delete the primary team');
    });
  });

  describe('setPrimaryTeam', () => {
    it('should mark a different team as primary', () => {
      const afterCreate = service.createTeam(rootData, 'NewPrimary', 'whatif');
      const afterSet = service.setPrimaryTeam(afterCreate, 'newprimary');
      expect(afterSet.teams.newprimary.type).toBe('primary');
      expect(afterSet.teams.default.type).toBe('whatif');
    });

    it('should only allow one primary team', () => {
      const afterCreate = service.createTeam(rootData, 'Another', 'whatif');
      const afterSet = service.setPrimaryTeam(afterCreate, 'another');
      const primaryTeams = Object.values(afterSet.teams).filter((t) => t.type === 'primary');
      expect(primaryTeams).toHaveLength(1);
      expect(primaryTeams[0].id).toBe('another');
    });
  });

  describe('setFplEntryId', () => {
    it('should store the FPL entry id in settings', () => {
      const updatedRoot = service.setFplEntryId(rootData, '12345');
      expect(updatedRoot.settings.fplEntryId).toBe('12345');
    });

    it('should store the FPL entry id on the primary team', () => {
      const updatedRoot = service.setFplEntryId(rootData, '12345');
      expect(updatedRoot.teams.default.fplEntryId).toBe('12345');
    });
  });

  describe('getActiveTeam', () => {
    it('should return the team referenced by root.currentTeam', () => {
      const team = getActiveTeam(rootData);
      expect(team.id).toBe('default');
      expect(team.name).toBe('Primary Team');
    });

    it('should fall back to the first team when currentTeam is missing', () => {
      const { currentTeam, ...partialRoot } = rootData;
      const team = getActiveTeam(partialRoot);
      expect(team.id).toBe('default');
    });

    it('should return a legacy single-team root when teams are absent', () => {
      const legacyRoot = { version: '2.0', currentWeek: 1, weeks: { 1: WeekModel.createDefault(1) } };
      const team = getActiveTeam(legacyRoot);
      expect(team.weeks).toBeDefined();
      expect(team.currentWeek).toBe(1);
    });

    it('should return null for null or empty roots', () => {
      expect(getActiveTeam(null)).toBeNull();
      expect(getActiveTeam({})).toBeNull();
    });
  });

  describe('getActiveWeek', () => {
    it('should return the current week of the active team', () => {
      const week = getActiveWeek(rootData);
      expect(week).toBe(rootData.teams.default.weeks[1]);
    });

    it('should return an empty object when the active team has no current week', () => {
      const root = { version: '3.1', currentTeam: 'default', teams: { default: { id: 'default', currentWeek: 2, weeks: { 1: WeekModel.createDefault(1) } } } };
      expect(getActiveWeek(root)).toEqual({});
    });

    it('should work with a legacy single-team root', () => {
      const legacyRoot = { version: '2.0', currentWeek: 1, weeks: { 1: WeekModel.createDefault(1) } };
      const week = getActiveWeek(legacyRoot);
      expect(week).toEqual(legacyRoot.weeks[1]);
    });
  });

  describe('validateFplRules', () => {
    it('should pass for an empty team', () => {
      const team = rootData.teams.default;
      const result = service.validateFplRules(team);
      expect(result.valid).toBe(true);
    });

    it('should fail when team has more than 15 players', () => {
      const team = rootData.teams.default;
      team.weeks[1].players = Array.from({ length: 16 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        position: 'midfield',
        team: 'A',
        price: 5,
        have: true,
      }));
      const result = service.validateFplRules(team);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Team can have at most 15 players');
    });

    it('should fail when team exceeds budget', () => {
      const team = rootData.teams.default;
      team.weeks[1].players = [
        { id: 'p1', name: 'P1', position: 'midfield', team: 'A', price: 120, have: true },
      ];
      const result = service.validateFplRules(team);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Team cost £120m exceeds £100m budget');
    });

    it('should fail with too many players in one position', () => {
      const team = rootData.teams.default;
      team.weeks[1].players = Array.from({ length: 6 }, (_, i) => ({
        id: `d${i}`,
        name: `Defender ${i}`,
        position: 'defence',
        team: 'A',
        price: 5,
        have: true,
      }));
      const result = service.validateFplRules(team);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Too many defence players (max 5)');
    });
  });
});