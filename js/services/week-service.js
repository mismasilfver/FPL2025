import { WeekModel } from '../models/week-model.js';
import { getActiveTeam } from './team-service.js';

class WeekService {
  constructor(storageService) {
    if (!storageService) {
      throw new Error('WeekService requires a storage service.');
    }
    this.storageService = storageService;
  }

  _getTeam(root) {
    return getActiveTeam(root);
  }

  _computeTeamSnapshot(players) {
    return WeekModel.computeTeamSnapshot(players);
  }

  _cloneWeekData(week) {
    return WeekModel.clone(week);
  }

  _ensureWeekDerivedFields(root, weekNumber) {
    const team = this._getTeam(root);
    if (!team) return root;

    const wn = String(weekNumber);
    const existingWeek = team.weeks[wn];
    if (!existingWeek) return root;

    const snapshot = this._computeTeamSnapshot(existingWeek.players || []);
    team.weeks[wn] = {
        ...snapshot,
        players: WeekModel.clone(existingWeek.players || []),
        captain: existingWeek.captain,
        viceCaptain: existingWeek.viceCaptain,
        isReadOnly: existingWeek.isReadOnly,
        notes: existingWeek.notes
    };
    return root;
  }

  createNewWeek(root) {
    const team = this._getTeam(root);
    if (!team) return root;

    const currentWeekNumber = team.currentWeek;
    const currentWeekPayload = team.weeks[currentWeekNumber] || { players: [], captain: null, viceCaptain: null };
    const snapshotForClone = this._cloneWeekData(currentWeekPayload);

    if (team.weeks[currentWeekNumber]) {
        root = this._ensureWeekDerivedFields(root, currentWeekNumber);
        const frozenWeek = this._cloneWeekData(team.weeks[currentWeekNumber]);
        frozenWeek.isReadOnly = true;
        team.weeks[currentWeekNumber] = frozenWeek;

        if (typeof Object.freeze === 'function') {
            Object.freeze(team.weeks[currentWeekNumber]);
        }
    }

    const newWeekNumber = currentWeekNumber + 1;
    const newWeek = this._cloneWeekData(snapshotForClone);
    newWeek.isReadOnly = false;
    team.weeks[newWeekNumber] = newWeek;

    root = this._ensureWeekDerivedFields(root, newWeekNumber);
    team.currentWeek = newWeekNumber;
    return root;
  }

  goToWeek(root, weekNumber) {
    const team = this._getTeam(root);
    if (!team) return root;
    if (!team.weeks[weekNumber]) return root;
    team.currentWeek = Number(weekNumber);
    return root;
  }

  nextWeek(root) {
    const team = this._getTeam(root);
    if (!team) return root;
    const maxWeek = Math.max(...Object.keys(team.weeks).map(n => Number(n)));
    const target = Math.min(team.currentWeek + 1, maxWeek);
    return this.goToWeek(root, target);
  }

  prevWeek(root) {
    const team = this._getTeam(root);
    if (!team) return root;
    const target = Math.max(1, team.currentWeek - 1);
    return this.goToWeek(root, target);
  }

  getWeekCount(root) {
    const team = this._getTeam(root);
    if (!team || !team.weeks) return 1;
    return Object.keys(team.weeks).length || 1;
  }

  getCurrentWeekNumber(root) {
    const team = this._getTeam(root);
    return team?.currentWeek || 1;
  }

  getWeekSnapshot(root, weekNumber) {
    const team = this._getTeam(root);
    if (!team) return {};
    const wn = String(weekNumber || team.currentWeek);
    const wk = team.weeks[wn] || {};
    return JSON.parse(JSON.stringify({
        players: wk.players || [],
        captain: wk.captain || null,
        viceCaptain: wk.viceCaptain || null,
        isReadOnly: wk.isReadOnly || false,
        teamMembers: wk.teamMembers || [],
        teamStats: wk.teamStats || { totalValue: 0, playerCount: 0 }
    }));
  }

  isWeekReadOnly(root, weekNumber) {
    const team = this._getTeam(root);
    if (!team) return false;
    const week = team.weeks[weekNumber] || {};
    return !!week.isReadOnly;
  }

  isCurrentWeekReadOnly(root) {
    const team = this._getTeam(root);
    if (!team) return false;
    const week = team.weeks[team.currentWeek] || {};
    return !!week.isReadOnly;
  }
}

export default WeekService;
