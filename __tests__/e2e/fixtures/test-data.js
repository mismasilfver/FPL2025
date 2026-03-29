/**
 * Test data fixtures for E2E tests
 * Provides realistic player data for testing
 */

export const testPlayers = [
  // Goalkeepers (2)
  { name: 'Alisson Becker', position: 'goalkeeper', price: 5.5, team: 'Liverpool' },
  { name: 'David Raya', position: 'goalkeeper', price: 5.0, team: 'Arsenal' },
  
  // Defenders (5)
  { name: 'Trent Alexander-Arnold', position: 'defender', price: 7.5, team: 'Liverpool' },
  { name: 'William Saliba', position: 'defender', price: 6.0, team: 'Arsenal' },
  { name: 'Reece James', position: 'defender', price: 5.5, team: 'Chelsea' },
  { name: 'Virgil van Dijk', position: 'defender', price: 6.5, team: 'Liverpool' },
  { name: 'Ruben Dias', position: 'defender', price: 5.5, team: 'Man City' },
  
  // Midfielders (5)
  { name: 'Mohamed Salah', position: 'midfielder', price: 11.0, team: 'Liverpool' },
  { name: 'Bukayo Saka', position: 'midfielder', price: 9.5, team: 'Arsenal' },
  { name: 'Martin Odegaard', position: 'midfielder', price: 8.0, team: 'Arsenal' },
  { name: 'Kevin De Bruyne', position: 'midfielder', price: 9.0, team: 'Man City' },
  { name: 'Bruno Fernandes', position: 'midfielder', price: 8.5, team: 'Man United' },
  
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
  const defenders = testPlayers.filter(p => p.position === 'defender').slice(0, 5);
  const midfielders = testPlayers.filter(p => p.position === 'midfielder').slice(0, 5);
  const forwards = testPlayers.filter(p => p.position === 'forward').slice(0, 3);
  
  return [...goalkeepers, ...defenders, ...midfielders, ...forwards];
};

/**
 * Build a minimal squad for quick testing
 * @returns {Array} Array of 3 player objects (1 per position type)
 */
export const buildMinimalSquad = () => {
  return [
    testPlayers.find(p => p.position === 'goalkeeper'),
    testPlayers.find(p => p.position === 'defender'),
    testPlayers.find(p => p.position === 'midfielder'),
    testPlayers.find(p => p.position === 'forward'),
  ].filter(Boolean);
};

/**
 * Get a single test player by position
 * @param {string} position - Position to filter by
 * @returns {Object|null} Player object or null
 */
export const getPlayerByPosition = (position) => {
  return testPlayers.find(p => p.position === position) || null;
};
