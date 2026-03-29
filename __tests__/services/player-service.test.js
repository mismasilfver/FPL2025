import PlayerService from '../../js/services/player-service.js';
import { createDefaultRoot } from '../../js/storage-module.js';

describe('PlayerService', () => {
  let playerService;
  let mockStorageService;
  let rootData;

  beforeEach(() => {
    mockStorageService = {
      getRootData: jest.fn(),
      setRootData: jest.fn(),
    };
    playerService = new PlayerService(mockStorageService);
    rootData = createDefaultRoot();
  });

  describe('getPlayers', () => {
    it('should return players from the current week', async () => {
      rootData.weeks[1].players.push({ id: '1', name: 'Player 1' });
      const players = await playerService.getPlayers(rootData);
      expect(players).toHaveLength(1);
      expect(players[0].name).toBe('Player 1');
    });
  });

  describe('addPlayer', () => {
    it('should add a player to the current week', async () => {
      const playerData = { name: 'New Player', position: 'MID', team: 'NFO', price: 5.5, have: true, notes: '' };
      const updatedRoot = await playerService.addPlayer(rootData, playerData);
      const players = updatedRoot.weeks[1].players;
      expect(players).toHaveLength(1);
      expect(players[0].name).toBe('New Player');
    });
  });

  describe('updatePlayer', () => {
    it('should update an existing player', async () => {
      rootData.weeks[1].players.push({ id: '1', name: 'Player 1' });
      const updatedPlayerData = { name: 'Player 1 Updated' };
      const updatedRoot = await playerService.updatePlayer(rootData, '1', updatedPlayerData);
      const player = updatedRoot.weeks[1].players[0];
      expect(player.name).toBe('Player 1 Updated');
    });
  });

  describe('deletePlayer', () => {
    it('should delete a player from the current week', async () => {
      rootData.weeks[1].players.push({ id: '1', name: 'Player 1' });
      const updatedRoot = await playerService.deletePlayer(rootData, '1');
      expect(updatedRoot.weeks[1].players).toHaveLength(0);
    });
  });

  describe('toggleHave', () => {
    it('should toggle the have status of a player', async () => {
      rootData.weeks[1].players.push({ id: '1', name: 'Player 1', have: false });
      const updatedRoot = await playerService.toggleHave(rootData, '1');
      const player = updatedRoot.weeks[1].players[0];
      expect(player.have).toBe(true);
    });

    it('should throw an error if trying to add a 16th player', async () => {
      for (let i = 0; i < 15; i++) {
        rootData.weeks[1].players.push({ id: `${i}`, name: `Player ${i}`, have: true });
      }
      rootData.weeks[1].players.push({ id: '15', name: 'Player 15', have: false });

      await expect(playerService.toggleHave(rootData, '15')).rejects.toThrow('You can only have 15 players in your team.');
    });
  });
});
