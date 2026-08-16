/**
 * Test data fixtures for E2E tests
 * Provides realistic player data for testing
 */

export const testPlayers = [
  // Goalkeepers (2)
  { name: 'Alisson Becker', position: 'goalkeeper', price: 5.5, team: 'Liverpool' },
  { name: 'David Raya', position: 'goalkeeper', price: 5.0, team: 'Arsenal' },
  
  // Defenders (5) - Note: HTML uses 'defence' not 'defender'
  { name: 'Trent Alexander-Arnold', position: 'defence', price: 7.5, team: 'Liverpool' },
  { name: 'William Saliba', position: 'defence', price: 6.0, team: 'Arsenal' },
  { name: 'Reece James', position: 'defence', price: 5.5, team: 'Chelsea' },
  { name: 'Virgil van Dijk', position: 'defence', price: 6.5, team: 'Liverpool' },
  { name: 'Ruben Dias', position: 'defence', price: 5.5, team: 'Man City' },
  
  // Midfielders (5) - Note: HTML uses 'midfield' not 'midfielder'
  { name: 'Mohamed Salah', position: 'midfield', price: 11.0, team: 'Liverpool' },
  { name: 'Bukayo Saka', position: 'midfield', price: 9.5, team: 'Arsenal' },
  { name: 'Martin Odegaard', position: 'midfield', price: 8.0, team: 'Arsenal' },
  { name: 'Kevin De Bruyne', position: 'midfield', price: 9.0, team: 'Man City' },
  { name: 'Bruno Fernandes', position: 'midfield', price: 8.5, team: 'Man United' },
  
  // Forwards (3)
  { name: 'Erling Haaland', position: 'forward', price: 12.5, team: 'Man City' },
  { name: 'Harry Kane', position: 'forward', price: 11.5, team: 'Bayern Munich' },
  { name: 'Ollie Watkins', position: 'forward', price: 8.5, team: 'Aston Villa' },
];

/**
 * Build a full 15-player squad (2 GK, 5 DEF, 5 MID, 3 FWD)
 * @returns {Array} Array of 15 player objects
 */
export const buildFullSquad = () => {
  const goalkeepers = testPlayers.filter(p => p.position === 'goalkeeper').slice(0, 2);
  const defenders = testPlayers.filter(p => p.position === 'defence').slice(0, 5);
  const midfielders = testPlayers.filter(p => p.position === 'midfield').slice(0, 5);
  const forwards = testPlayers.filter(p => p.position === 'forward').slice(0, 3);
  
  return [...goalkeepers, ...defenders, ...midfielders, ...forwards];
};

/**
 * Build a minimal squad for quick testing
 * @returns {Array} Array of 4 player objects (1 per position type)
 */
export const buildMinimalSquad = () => {
  return [
    testPlayers.find(p => p.position === 'goalkeeper'),
    testPlayers.find(p => p.position === 'defence'),
    testPlayers.find(p => p.position === 'midfield'),
    testPlayers.find(p => p.position === 'forward'),
  ].filter(Boolean);
};

/**
 * Get a single test player by position
 * @param {string} position - Position to filter by
 * @returns {Object|null} Player object or null
 */
export const getPlayerByPosition = (position) => {
  // Map common position names to HTML values
  const positionMap = {
    'defender': 'defence',
    'midfielder': 'midfield',
  };
  const mappedPosition = positionMap[position] || position;
  return testPlayers.find(p => p.position === mappedPosition) || null;
};
