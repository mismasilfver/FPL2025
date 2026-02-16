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
    const currentWeek = root.weeks[root.currentWeek];
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
    const currentWeek = root.weeks[root.currentWeek];
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

