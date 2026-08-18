import { WeekModel } from '../models/week-model.js';
import { getActiveTeam } from './team-service.js';

class PlayerService {
  constructor(storageService) {
    if (!storageService) {
      throw new Error('PlayerService requires a storage service.');
    }
    this.storageService = storageService;
  }

  _getCurrentWeek(team) {
    if (!team || !team.weeks || !team.currentWeek) return { players: [], captain: null, viceCaptain: null };
    return team.weeks[team.currentWeek] || { players: [], captain: null, viceCaptain: null };
  }

  async getPlayers(root) {
    const team = getActiveTeam(root);
    const week = this._getCurrentWeek(team);
    return week.players || [];
  }

  async addPlayer(root, playerData) {
    const team = getActiveTeam(root);
    if (!team) throw new Error('No active team available.');
    const currentWeekNumber = team.currentWeek;
    const existingWeek = this._getCurrentWeek(team);
    const workingWeek = WeekModel.clone(existingWeek);

    const player = {
        id: Date.now().toString(),
        ...playerData,
        addedAt: currentWeekNumber
    };
    workingWeek.players.push(player);

    team.weeks[currentWeekNumber] = workingWeek;
    return root;
  }

  async updatePlayer(root, playerId, playerData) {
    const team = getActiveTeam(root);
    if (!team) throw new Error('No active team available.');
    const currentWeekNumber = team.currentWeek;
    const existingWeek = this._getCurrentWeek(team);
    const workingWeek = WeekModel.clone(existingWeek);
    const playerIndex = workingWeek.players.findIndex(p => p.id === playerId);

    if (playerIndex !== -1) {
        workingWeek.players[playerIndex] = { ...workingWeek.players[playerIndex], ...playerData };
        team.weeks[currentWeekNumber] = workingWeek;
    }
    return root;
  }

  async deletePlayer(root, playerId) {
    const team = getActiveTeam(root);
    if (!team) throw new Error('No active team available.');
    const currentWeekNumber = team.currentWeek;
    const existingWeek = this._getCurrentWeek(team);
    const workingWeek = WeekModel.clone(existingWeek);

    workingWeek.players = workingWeek.players.filter(p => p.id !== playerId);
    if (workingWeek.captain === playerId) workingWeek.captain = null;
    if (workingWeek.viceCaptain === playerId) workingWeek.viceCaptain = null;

    team.weeks[currentWeekNumber] = workingWeek;
    return root;
  }

  async toggleHave(root, playerId) {
    const team = getActiveTeam(root);
    if (!team) throw new Error('No active team available.');
    const currentWeekNumber = team.currentWeek;
    const existingWeek = this._getCurrentWeek(team);
    const workingWeek = WeekModel.clone(existingWeek);
    const player = workingWeek.players.find(p => p.id === playerId);

    if (player) {
        if (!player.have && workingWeek.players.filter(p => p.have).length >= 15) {
            throw new Error('You can only have 15 players in your team.');
        }
        player.have = !player.have;
        team.weeks[currentWeekNumber] = workingWeek;
    }
    return root;
  }
}

export default PlayerService;
