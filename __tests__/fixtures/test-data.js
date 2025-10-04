const v1Sample = {
  players: [
    { id: 'p1', name: 'Player 1', position: 'midfield', team: 'Team A', price: 8.0, have: true, status: 'green', notes: 'Good form' },
    { id: 'p2', name: 'Player 2', position: 'defence', team: 'Team B', price: 5.0, have: true, status: 'yellow', notes: '' },
    { id: 'p3', name: 'Player 3', position: 'forward', team: 'Team C', price: 10.0, have: false, status: 'red', notes: 'Injured' }
  ],
  captain: 'p1',
  viceCaptain: 'p2',
  teamMembers: ['p1', 'p2', 'p3'],
  totalTeamCost: 23.0
};

const v2Sample = {
  version: '2.0',
  currentWeek: 1,
  weeks: {
    1: {
      players: [
        { id: 'p1', name: 'Player 1', position: 'midfield', team: 'Team A', price: 8.0, have: true, status: 'green', notes: 'Good form' },
        { id: 'p2', name: 'Player 2', position: 'defence', team: 'Team B', price: 5.0, have: true, status: 'yellow', notes: '' },
        { id: 'p3', name: 'Player 3', position: 'forward', team: 'Team C', price: 10.0, have: false, status: 'red', notes: 'Injured' }
      ],
      captain: 'p1',
      viceCaptain: 'p2',
      teamMembers: ['p1', 'p2', 'p3'],
      totalTeamCost: 23.0
    }
  }
};

module.exports = {
  v1Sample,
  v2Sample
};
