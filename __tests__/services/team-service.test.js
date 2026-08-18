import TeamService from '../../js/services/team-service.js';
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
});