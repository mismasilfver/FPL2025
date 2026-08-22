import TeamSyncCoordinator from '../../js/services/team-sync-coordinator.js';

function createDeps(overrides = {}) {
  const deps = {
    teamService: {
      getCurrentTeam: jest.fn(),
      setFplEntryId: jest.fn((root) => root),
      createTeam: jest.fn((root) => root),
      switchTeam: jest.fn((root) => root),
    },
    fplApiClient: {
      fetchBootstrap: jest.fn(),
    },
    pointsService: {
      updatePlayerPointsFromFpl: jest.fn((players) => players),
      calculateWeekPoints: jest.fn(() => 0),
      recordGameweekPoints: jest.fn((team) => ({ gameweekPoints: team.gameweekPoints || {} })),
      calculateTeamTotalPoints: jest.fn((team) => ({ totalPoints: team.totalPoints || 0 })),
    },
    ui: {
      showAlert: jest.fn(),
      renderTeamSelector: jest.fn(),
      renderFplEntryId: jest.fn(),
    },
    getRootData: jest.fn(),
    saveRootData: jest.fn(),
    updateDisplay: jest.fn(),
    ...overrides,
  };
  deps.getFplApiClient = () => deps.fplApiClient;
  return deps;
}

function createRoot() {
  return {
    version: '3.1',
    currentTeam: 'default',
    settings: { fplEntryId: null },
    teams: {
      default: {
        id: 'default',
        name: 'Primary Team',
        type: 'primary',
        currentWeek: 1,
        weeks: { 1: { players: [], captain: null, viceCaptain: null } },
        totalPoints: 0,
        gameweekPoints: {},
      },
    },
  };
}

describe('TeamSyncCoordinator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('saveFplEntryId', () => {
    it('saves the entry id and shows a success alert', async () => {
      const deps = createDeps();
      const root = createRoot();
      deps.getRootData.mockResolvedValue(root);
      const coordinator = new TeamSyncCoordinator(deps);

      await coordinator.saveFplEntryId('12345');

      expect(deps.teamService.setFplEntryId).toHaveBeenCalledWith(root, '12345');
      expect(deps.saveRootData).toHaveBeenCalledWith(root);
      expect(deps.ui.showAlert).toHaveBeenCalledWith('FPL entry ID saved: 12345');
    });

    it('shows a failure alert when saving fails', async () => {
      const deps = createDeps();
      deps.getRootData.mockRejectedValue(new Error('storage down'));
      const coordinator = new TeamSyncCoordinator(deps);

      await coordinator.saveFplEntryId('12345');

      expect(deps.ui.showAlert).toHaveBeenCalledWith('Failed to save FPL ID: storage down');
      expect(deps.saveRootData).not.toHaveBeenCalled();
    });
  });

  describe('syncFromFpl', () => {
    function createBootstrap() {
      return {
        elements: [
          { id: 1, web_name: 'Raya', element_type: 1, team: 1, now_cost: 60, total_points: 100, event_points: 6, form: '2.0', status: 'a', chance_of_playing_next_round: null },
        ],
        teams: [{ id: 1, name: 'Arsenal' }],
        element_types: [{ id: 1, singular_name_short: 'GKP' }],
      };
    }

    it('updates player points and saves the active team on success', async () => {
      const deps = createDeps();
      const root = createRoot();
      deps.getRootData.mockResolvedValue(root);
      deps.fplApiClient.fetchBootstrap.mockResolvedValue(createBootstrap());
      deps.teamService.getCurrentTeam.mockReturnValue(root.teams.default);
      deps.pointsService.calculateWeekPoints.mockReturnValue(6);
      deps.pointsService.recordGameweekPoints.mockReturnValue({ gameweekPoints: { 1: 6 } });
      deps.pointsService.calculateTeamTotalPoints.mockReturnValue({ totalPoints: 6 });

      const coordinator = new TeamSyncCoordinator(deps);
      await coordinator.syncFromFpl();

      expect(deps.pointsService.updatePlayerPointsFromFpl).toHaveBeenCalledWith(
        [],
        { '1': expect.objectContaining({ fplId: '1' }) }
      );
      expect(deps.saveRootData).toHaveBeenCalledWith(root);
      expect(deps.updateDisplay).toHaveBeenCalled();
      expect(deps.ui.showAlert).toHaveBeenCalledWith('Syncing with FPL...');
      expect(deps.ui.showAlert).toHaveBeenLastCalledWith('Sync complete');
    });

    it('shows a failure alert and does not save when the FPL fetch fails', async () => {
      const deps = createDeps();
      deps.fplApiClient.fetchBootstrap.mockRejectedValue(new Error('Network error'));

      const coordinator = new TeamSyncCoordinator(deps);
      await coordinator.syncFromFpl();

      expect(deps.ui.showAlert).toHaveBeenLastCalledWith('SYNC failed: Network error');
      expect(deps.saveRootData).not.toHaveBeenCalled();
      expect(deps.updateDisplay).not.toHaveBeenCalled();
    });
  });

  describe('addWhatIfTeam', () => {
    let promptSpy;

    afterEach(() => {
      promptSpy?.mockRestore();
    });

    it('does nothing when the user cancels the prompt', async () => {
      promptSpy = jest.spyOn(global, 'prompt').mockReturnValue(null);
      const deps = createDeps();
      const coordinator = new TeamSyncCoordinator(deps);

      await coordinator.addWhatIfTeam();

      expect(deps.getRootData).not.toHaveBeenCalled();
    });

    it('creates the team, saves, and refreshes the UI', async () => {
      promptSpy = jest.spyOn(global, 'prompt').mockReturnValue('Wildcard');
      const deps = createDeps();
      const root = createRoot();
      const updatedRoot = { ...root, currentTeam: 'wildcard' };
      deps.getRootData.mockResolvedValue(root);
      deps.teamService.createTeam.mockReturnValue(updatedRoot);

      const coordinator = new TeamSyncCoordinator(deps);
      await coordinator.addWhatIfTeam();

      expect(deps.teamService.createTeam).toHaveBeenCalledWith(root, 'Wildcard', 'whatif');
      expect(deps.saveRootData).toHaveBeenCalledWith(updatedRoot);
      expect(deps.ui.renderTeamSelector).toHaveBeenCalledWith(updatedRoot.teams, 'wildcard');
      expect(deps.updateDisplay).toHaveBeenCalled();
    });

    it('shows an alert when team creation fails', async () => {
      promptSpy = jest.spyOn(global, 'prompt').mockReturnValue('Duplicate');
      const deps = createDeps();
      deps.getRootData.mockResolvedValue(createRoot());
      deps.teamService.createTeam.mockImplementation(() => {
        throw new Error('Team already exists');
      });

      const coordinator = new TeamSyncCoordinator(deps);
      await coordinator.addWhatIfTeam();

      expect(deps.ui.showAlert).toHaveBeenCalledWith('Team already exists');
      expect(deps.saveRootData).not.toHaveBeenCalled();
    });
  });

  describe('switchTeam', () => {
    it('switches the team and refreshes the UI', async () => {
      const deps = createDeps();
      const root = createRoot();
      const updatedRoot = { ...root, currentTeam: 'wildcard', settings: { fplEntryId: '999' } };
      deps.getRootData.mockResolvedValue(root);
      deps.teamService.switchTeam.mockReturnValue(updatedRoot);

      const coordinator = new TeamSyncCoordinator(deps);
      await coordinator.switchTeam('wildcard');

      expect(deps.teamService.switchTeam).toHaveBeenCalledWith(root, 'wildcard');
      expect(deps.saveRootData).toHaveBeenCalledWith(updatedRoot);
      expect(deps.ui.renderTeamSelector).toHaveBeenCalledWith(updatedRoot.teams, 'wildcard');
      expect(deps.ui.renderFplEntryId).toHaveBeenCalledWith('999');
      expect(deps.updateDisplay).toHaveBeenCalled();
    });

    it('shows an alert when the team is not found', async () => {
      const deps = createDeps();
      deps.getRootData.mockResolvedValue(createRoot());
      deps.teamService.switchTeam.mockImplementation(() => {
        throw new Error('Team not found');
      });

      const coordinator = new TeamSyncCoordinator(deps);
      await coordinator.switchTeam('missing');

      expect(deps.ui.showAlert).toHaveBeenCalledWith('Team not found');
      expect(deps.saveRootData).not.toHaveBeenCalled();
    });
  });
});
