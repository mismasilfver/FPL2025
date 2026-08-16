import { WeekModel } from '../models/week-model.js';

class WeekService {
  constructor(storageService) {
    if (!storageService) {
      throw new Error('WeekService requires a storage service.');
    }
    this.storageService = storageService;
  }

  _computeTeamSnapshot(players) {
    return WeekModel.computeTeamSnapshot(players);
  }

  _cloneWeekData(week) {
    return WeekModel.clone(week);
  }

  _ensureWeekDerivedFields(root, weekNumber) {
    const wn = String(weekNumber);
    const existingWeek = root.weeks[wn];
    if (!existingWeek) return root;

    const snapshot = this._computeTeamSnapshot(existingWeek.players || []);
    root.weeks[wn] = {
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
    const currentWeekNumber = root.currentWeek;
    const currentWeekPayload = root.weeks[currentWeekNumber] || { players: [], captain: null, viceCaptain: null };
    const snapshotForClone = this._cloneWeekData(currentWeekPayload);

    if (root.weeks[currentWeekNumber]) {
        root = this._ensureWeekDerivedFields(root, currentWeekNumber);
        const frozenWeek = this._cloneWeekData(root.weeks[currentWeekNumber]);
        frozenWeek.isReadOnly = true;
        root.weeks[currentWeekNumber] = frozenWeek;

        if (typeof Object.freeze === 'function') {
            Object.freeze(root.weeks[currentWeekNumber]);
        }
    }

    const newWeekNumber = currentWeekNumber + 1;
    const newWeek = this._cloneWeekData(snapshotForClone);
    newWeek.isReadOnly = false;
    root.weeks[newWeekNumber] = newWeek;

    root = this._ensureWeekDerivedFields(root, newWeekNumber);
    root.currentWeek = newWeekNumber;
    return root;
  }

  goToWeek(root, weekNumber) {
    if (!root.weeks[weekNumber]) return root;
    root.currentWeek = Number(weekNumber);
    return root;
  }

  nextWeek(root) {
    const maxWeek = Math.max(...Object.keys(root.weeks).map(n => Number(n)));
    const target = Math.min(root.currentWeek + 1, maxWeek);
    return this.goToWeek(root, target);
  }

  prevWeek(root) {
    const target = Math.max(1, root.currentWeek - 1);
    return this.goToWeek(root, target);
  }

  getWeekCount(root) {
    if (!root || !root.weeks) return 1;
    return Object.keys(root.weeks).length || 1;
  }

  getCurrentWeekNumber(root) {
    return root.currentWeek || 1;
  }

  getWeekSnapshot(root, weekNumber) {
    const wn = String(weekNumber || root.currentWeek);
    const wk = root.weeks[wn] || {};
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
    const week = root.weeks[weekNumber] || {};
    return !!week.isReadOnly;
  }

  isCurrentWeekReadOnly(root) {
    const week = root.weeks[root.currentWeek] || {};
    return !!week.isReadOnly;
  }
}

export default WeekService;

