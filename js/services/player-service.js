import { WeekModel } from '../models/week-model.js';

class PlayerService {
  constructor(storageService) {
    if (!storageService) {
      throw new Error('PlayerService requires a storage service.');
    }
    this.storageService = storageService;
  }

  async getPlayers(root) {
    const week = root.weeks[root.currentWeek] || {};
    return week.players || [];
  }

  async addPlayer(root, playerData) {
    const currentWeekNumber = root.currentWeek;
    const existingWeek = root.weeks[currentWeekNumber] || { players: [], captain: null, viceCaptain: null };
    const workingWeek = WeekModel.clone(existingWeek);

    const player = {
        id: Date.now().toString(),
        ...playerData,
        addedAt: currentWeekNumber
    };
    workingWeek.players.push(player);

    root.weeks[currentWeekNumber] = workingWeek;
    return root;
  }

  async updatePlayer(root, playerId, playerData) {
    const currentWeekNumber = root.currentWeek;
    const existingWeek = root.weeks[currentWeekNumber] || { players: [], captain: null, viceCaptain: null };
    const workingWeek = WeekModel.clone(existingWeek);
    const playerIndex = workingWeek.players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
        throw new Error(`Player ${playerId} was not found in week ${currentWeekNumber}.`);
    }

    workingWeek.players[playerIndex] = { ...workingWeek.players[playerIndex], ...playerData };
    root.weeks[currentWeekNumber] = workingWeek;
    return root;
  }

  async deletePlayer(root, playerId) {
    const currentWeekNumber = root.currentWeek;
    const existingWeek = root.weeks[currentWeekNumber] || { players: [], captain: null, viceCaptain: null };
    const workingWeek = WeekModel.clone(existingWeek);

    if (!workingWeek.players.some(p => p.id === playerId)) {
        throw new Error(`Player ${playerId} was not found in week ${currentWeekNumber}.`);
    }

    workingWeek.players = workingWeek.players.filter(p => p.id !== playerId);
    if (workingWeek.captain === playerId) workingWeek.captain = null;
    if (workingWeek.viceCaptain === playerId) workingWeek.viceCaptain = null;

    root.weeks[currentWeekNumber] = workingWeek;
    return root;
  }

  async toggleHave(root, playerId) {
    const currentWeekNumber = root.currentWeek;
    const existingWeek = root.weeks[currentWeekNumber] || { players: [], captain: null, viceCaptain: null };
    const workingWeek = WeekModel.clone(existingWeek);
    const player = workingWeek.players.find(p => p.id === playerId);

    if (!player) {
        throw new Error(`Player ${playerId} was not found in week ${currentWeekNumber}.`);
    }

    if (!player.have && workingWeek.players.filter(p => p.have).length >= 15) {
        throw new Error('You can only have 15 players in your team.');
    }

    player.have = !player.have;
    root.weeks[currentWeekNumber] = workingWeek;
    return root;
  }
}

export default PlayerService;
