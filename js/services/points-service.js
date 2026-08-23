/**
 * Service for calculating and tracking FPL points.
 */
class PointsService {
  /**
   * Calculate the points for a team in a specific gameweek.
   * @param {object} team - Team object with weeks
   * @param {number} weekNumber - Gameweek to calculate
   * @returns {number} Total points for the week
   */
  calculateWeekPoints(team, weekNumber) {
    if (!team || !team.weeks || !team.weeks[weekNumber]) return 0;

    const week = team.weeks[weekNumber];
    const players = Array.isArray(week.players) ? week.players : [];
    const inTeam = players.filter((p) => p.have);

    let total = 0;
    let captainPoints = 0;
    let captainPlayed = false;

    for (const player of inTeam) {
      const points = Number(player.eventPoints) || 0;
      total += points;

      if (String(player.id) === String(week.captain)) {
        captainPoints = points;
        captainPlayed = true;
      }
    }

    if (captainPlayed) {
      total += captainPoints;
    } else if (week.viceCaptain) {
      const vice = inTeam.find((p) => String(p.id) === String(week.viceCaptain));
      if (vice) {
        total += Number(vice.eventPoints) || 0;
      }
    }

    return total;
  }

  /**
   * Update player event and total points from FPL player data.
   * @param {Array<object>} players - App players
   * @param {Record<string, object>} fplPlayers - Map of fplId to FPL player data
   * @returns {Array<object>} Updated players
   */
  updatePlayerPointsFromFpl(players, fplPlayers) {
    if (!Array.isArray(players) || !fplPlayers) return players;

    return players.map((player) => {
      const fplData = fplPlayers[player.fplId];
      if (!fplData) return player;

      return {
        ...player,
        eventPoints: Number(fplData.eventPoints) || 0,
        totalPoints: Number(fplData.totalPoints) || 0,
        form: Number(fplData.form) || 0,
        price: (Number(fplData.nowCostTenths) || 0) / 10,
        nowCostTenths: Number(fplData.nowCostTenths) || 0,
        availability: fplData.availability || player.availability || 'unknown',
        news: fplData.news || '',
      };
    });
  }

  /**
   * Calculate and set the total points for a team.
   * @param {object} team - Team with gameweekPoints
   * @returns {object} Updated team
   */
  calculateTeamTotalPoints(team) {
    if (!team || !team.gameweekPoints) return team;

    const total = Object.values(team.gameweekPoints).reduce(
      (sum, points) => sum + (Number(points) || 0),
      0
    );

    return { ...team, totalPoints: total };
  }

  /**
   * Record a gameweek's points for a team.
   * @param {object} team - Team to update
   * @param {number} weekNumber - Gameweek number
   * @param {number} points - Points for the week
   * @returns {object} Updated team
   */
  recordGameweekPoints(team, weekNumber, points) {
    if (!team) return team;
    const gameweekPoints = { ...(team.gameweekPoints || {}) };
    gameweekPoints[weekNumber] = Number(points) || 0;
    return { ...team, gameweekPoints };
  }
}

export default PointsService;
