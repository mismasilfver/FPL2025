import { normalizePlayer } from './fpl-api.js';

/**
 * Coordinates FPL data sync and multi-team switching operations.
 *
 * Extracted from FPLTeamManager to keep that class focused on
 * player/week UI orchestration. This coordinator owns the read-modify-write
 * flow (via injected getRootData/saveRootData) plus the UI feedback for
 * the FPL entry ID, SYNC, and team-switching actions.
 */
class TeamSyncCoordinator {
  constructor({ teamService, getFplApiClient, pointsService, ui, getRootData, saveRootData, updateDisplay }) {
    this.teamService = teamService;
    // Accessed via a getter (rather than a captured value) so that callers
    // reassigning the manager's fplApiClient after construction (e.g. tests
    // injecting a mock fetch implementation) are respected.
    this.getFplApiClient = getFplApiClient;
    this.pointsService = pointsService;
    this.ui = ui;
    this.getRootData = getRootData;
    this.saveRootData = saveRootData;
    this.updateDisplay = updateDisplay;
  }

  async saveFplEntryId(entryId) {
    try {
      let root = await this.getRootData();
      root = this.teamService.setFplEntryId(root, entryId);
      await this.saveRootData(root);
      this.ui.showAlert(`FPL entry ID saved: ${entryId}`);
    } catch (error) {
      this.ui.showAlert(`Failed to save FPL ID: ${error.message}`);
    }
  }

  async syncFromFpl() {
    try {
      this.ui.showAlert('Syncing with FPL...');
      const bootstrap = await this.getFplApiClient().fetchBootstrap();

      const normalizedMap = {};
      for (const element of bootstrap.elements) {
        const normalized = normalizePlayer(element, bootstrap.teams, bootstrap.element_types);
        normalizedMap[normalized.fplId] = normalized;
      }

      const root = await this.getRootData();
      const team = this.teamService.getCurrentTeam(root);
      const currentWeek = team.weeks[team.currentWeek];
      const players = currentWeek.players || [];

      const updatedPlayers = this.pointsService.updatePlayerPointsFromFpl(players, normalizedMap);
      currentWeek.players = updatedPlayers;
      team.weeks[team.currentWeek] = currentWeek;

      const weekPoints = this.pointsService.calculateWeekPoints(team, team.currentWeek);
      team.gameweekPoints = this.pointsService.recordGameweekPoints(team, team.currentWeek, weekPoints).gameweekPoints;
      team.totalPoints = this.pointsService.calculateTeamTotalPoints(team).totalPoints;

      await this.saveRootData(root);
      await this.updateDisplay();
      this.ui.showAlert('Sync complete');
    } catch (error) {
      this.ui.showAlert(`SYNC failed: ${error.message}`);
    }
  }

  async addWhatIfTeam() {
    const name = prompt('Enter a name for the what-if team:');
    if (!name) return;

    try {
      let root = await this.getRootData();
      root = this.teamService.createTeam(root, name, 'whatif');
      await this.saveRootData(root);
      this.ui.renderTeamSelector(root.teams, root.currentTeam);
      await this.updateDisplay();
    } catch (error) {
      this.ui.showAlert(error.message);
    }
  }

  async switchTeam(teamId) {
    try {
      let root = await this.getRootData();
      root = this.teamService.switchTeam(root, teamId);
      await this.saveRootData(root);
      this.ui.renderTeamSelector(root.teams, root.currentTeam);
      this.ui.renderFplEntryId(root.settings?.fplEntryId || '');
      await this.updateDisplay();
    } catch (error) {
      this.ui.showAlert(error.message);
    }
  }
}

export default TeamSyncCoordinator;
