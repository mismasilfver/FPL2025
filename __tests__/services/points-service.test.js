import PointsService from '../../js/services/points-service.js';

describe('PointsService', () => {
  let service;

  beforeEach(() => {
    service = new PointsService();
  });

  describe('calculateWeekPoints', () => {
    it('should return 0 for an empty team', () => {
      const team = {
        weeks: { 1: { players: [], captain: null, viceCaptain: null } },
        currentWeek: 1,
      };
      expect(service.calculateWeekPoints(team, 1)).toBe(0);
    });

    it('should sum eventPoints for players in the team', () => {
      const team = {
        weeks: {
          1: {
            players: [
              { id: '1', have: true, eventPoints: 6 },
              { id: '2', have: true, eventPoints: 2 },
              { id: '3', have: false, eventPoints: 8 },
            ],
            captain: null,
            viceCaptain: null,
          },
        },
        currentWeek: 1,
      };
      expect(service.calculateWeekPoints(team, 1)).toBe(8);
    });

    it('should double captain points', () => {
      const team = {
        weeks: {
          1: {
            players: [
              { id: '1', have: true, eventPoints: 6 },
              { id: '2', have: true, eventPoints: 2 },
            ],
            captain: '1',
            viceCaptain: null,
          },
        },
        currentWeek: 1,
      };
      expect(service.calculateWeekPoints(team, 1)).toBe(14);
    });

    it('should double vice captain points when captain is not in team', () => {
      const team = {
        weeks: {
          1: {
            players: [
              { id: '1', have: false, eventPoints: 6 },
              { id: '2', have: true, eventPoints: 3 },
            ],
            captain: '1',
            viceCaptain: '2',
          },
        },
        currentWeek: 1,
      };
      expect(service.calculateWeekPoints(team, 1)).toBe(6);
    });
  });

  describe('updatePlayerPointsFromFpl', () => {
    it('should update player event and total points from FPL data', () => {
      const players = [
        { id: '1', fplId: '100', name: 'P1', eventPoints: 0, totalPoints: 0 },
      ];
      const fplPlayers = {
        100: { fplId: '100', eventPoints: 8, totalPoints: 120 },
      };
      const updated = service.updatePlayerPointsFromFpl(players, fplPlayers);
      expect(updated[0].eventPoints).toBe(8);
      expect(updated[0].totalPoints).toBe(120);
    });

    it('should update player availability and news from FPL data', () => {
      const players = [
        { id: '1', fplId: '100', availability: 'unknown', news: '' },
      ];
      const fplPlayers = {
        100: { fplId: '100', availability: 'injured', news: 'Hamstring injury' },
      };
      const updated = service.updatePlayerPointsFromFpl(players, fplPlayers);
      expect(updated[0].availability).toBe('injured');
      expect(updated[0].news).toBe('Hamstring injury');
    });

    it('should return players unchanged when no FPL data matches', () => {
      const players = [
        { id: '1', fplId: '100', name: 'P1', eventPoints: 0, totalPoints: 0 },
      ];
      const fplPlayers = {};
      const updated = service.updatePlayerPointsFromFpl(players, fplPlayers);
      expect(updated[0].eventPoints).toBe(0);
      expect(updated[0].totalPoints).toBe(0);
    });
  });

  describe('calculateTeamTotalPoints', () => {
    it('should sum gameweek points into total points', () => {
      const team = {
        gameweekPoints: { 1: 50, 2: 60 },
        totalPoints: 0,
      };
      const updated = service.calculateTeamTotalPoints(team);
      expect(updated.totalPoints).toBe(110);
    });
  });
});