class CaptaincyService {
  constructor(storageService) {
    if (!storageService) {
      throw new Error('CaptaincyService requires a storage service.');
    }
    this.storageService = storageService;
  }

  getCaptainId(root) {
    const week = root.weeks[root.currentWeek] || {};
    return week.captain;
  }

  getViceCaptainId(root) {
    const week = root.weeks[root.currentWeek] || {};
    return week.viceCaptain;
  }

  setCaptain(root, playerId) {
    const currentWeek = this._requireCurrentWeek(root);
    const player = currentWeek.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} was not found in week ${root.currentWeek}.`);
    }
    if (!player.have) {
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
    const currentWeek = this._requireCurrentWeek(root);
    const player = currentWeek.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} was not found in week ${root.currentWeek}.`);
    }
    if (!player.have) {
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

  _requireCurrentWeek(root) {
    const currentWeek = root?.weeks?.[root?.currentWeek];
    if (!currentWeek || !Array.isArray(currentWeek.players)) {
      throw new Error(`Week ${root?.currentWeek} could not be read from stored data.`);
    }
    return currentWeek;
  }
}

export default CaptaincyService;

