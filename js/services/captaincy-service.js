import { getActiveTeam, getActiveWeek } from './team-service.js';

class CaptaincyService {
  constructor(storageService) {
    if (!storageService) {
      throw new Error('CaptaincyService requires a storage service.');
    }
    this.storageService = storageService;
  }

  getCaptainId(root) {
    const week = getActiveWeek(root);
    return week.captain ?? null;
  }

  getViceCaptainId(root) {
    const week = getActiveWeek(root);
    return week.viceCaptain ?? null;
  }

  _getCurrentWeek(root) {
    const team = getActiveTeam(root);
    if (!team || !team.weeks || !team.currentWeek) return null;
    return team.weeks[team.currentWeek] || null;
  }

  setCaptain(root, playerId) {
    const currentWeek = this._getCurrentWeek(root);
    if (!currentWeek) return root;

    const player = currentWeek.players.find(p => p.id === playerId);
    if (player && !player.have) {
      throw new Error('Player must be in the team to be captain.');
    }

    if (currentWeek.captain === playerId) {
      currentWeek.captain = null;
    } else {
      currentWeek.captain = playerId;
      if (currentWeek.viceCaptain === playerId) {
        currentWeek.viceCaptain = null;
      }
    }
    return root;
  }

  setViceCaptain(root, playerId) {
    const currentWeek = this._getCurrentWeek(root);
    if (!currentWeek) return root;

    const player = currentWeek.players.find(p => p.id === playerId);
    if (player && !player.have) {
      throw new Error('Player must be in the team to be vice-captain.');
    }

    if (currentWeek.viceCaptain === playerId) {
      currentWeek.viceCaptain = null;
    } else {
      currentWeek.viceCaptain = playerId;
      if (currentWeek.captain === playerId) {
        currentWeek.captain = null;
      }
    }
    return root;
  }
}

export default CaptaincyService;
