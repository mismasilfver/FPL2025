import CaptaincyService from '../../js/services/captaincy-service.js';
import { createDefaultRoot } from '../../js/storage-module.js';

describe('CaptaincyService', () => {
  let captaincyService;
  let mockStorageService;
  let rootData;

  beforeEach(() => {
    mockStorageService = {
      getRootData: jest.fn(),
      setRootData: jest.fn(),
    };
    captaincyService = new CaptaincyService(mockStorageService);
    rootData = createDefaultRoot();
    rootData.weeks[1].players.push({ id: '1', name: 'Player 1', have: true });
    rootData.weeks[1].players.push({ id: '2', name: 'Player 2', have: true });
    rootData.weeks[1].players.push({ id: '3', name: 'Player 3', have: false });
  });

  describe('getCaptainId', () => {
    it('should return the captain id', () => {
      rootData.weeks[1].captain = '1';
      const captainId = captaincyService.getCaptainId(rootData);
      expect(captainId).toBe('1');
    });
  });

  describe('getViceCaptainId', () => {
    it('should return the vice-captain id', () => {
      rootData.weeks[1].viceCaptain = '2';
      const viceCaptainId = captaincyService.getViceCaptainId(rootData);
      expect(viceCaptainId).toBe('2');
    });
  });

  describe('setCaptain', () => {
    it('should set a player as captain', () => {
      const updatedRoot = captaincyService.setCaptain(rootData, '1');
      expect(updatedRoot.weeks[1].captain).toBe('1');
    });

    it('should unset captain if the same player is set again', () => {
      rootData.weeks[1].captain = '1';
      const updatedRoot = captaincyService.setCaptain(rootData, '1');
      expect(updatedRoot.weeks[1].captain).toBeNull();
    });

    it('should unset vice-captain if they are promoted to captain', () => {
      rootData.weeks[1].viceCaptain = '1';
      const updatedRoot = captaincyService.setCaptain(rootData, '1');
      expect(updatedRoot.weeks[1].captain).toBe('1');
      expect(updatedRoot.weeks[1].viceCaptain).toBeNull();
    });

    it('should throw an error if setting a player not in the team as captain', () => {
      expect(() => captaincyService.setCaptain(rootData, '3')).toThrow('Player must be in the team to be captain.');
    });
  });

  describe('setViceCaptain', () => {
    it('should set a player as vice-captain', () => {
      const updatedRoot = captaincyService.setViceCaptain(rootData, '2');
      expect(updatedRoot.weeks[1].viceCaptain).toBe('2');
    });

    it('should unset vice-captain if the same player is set again', () => {
      rootData.weeks[1].viceCaptain = '2';
      const updatedRoot = captaincyService.setViceCaptain(rootData, '2');
      expect(updatedRoot.weeks[1].viceCaptain).toBeNull();
    });

    it('should unset captain if they are demoted to vice-captain', () => {
      rootData.weeks[1].captain = '2';
      const updatedRoot = captaincyService.setViceCaptain(rootData, '2');
      expect(updatedRoot.weeks[1].viceCaptain).toBe('2');
      expect(updatedRoot.weeks[1].captain).toBeNull();
    });

    it('should throw an error if setting a player not in the team as vice-captain', () => {
      expect(() => captaincyService.setViceCaptain(rootData, '3')).toThrow('Player must be in the team to be vice-captain.');
    });
  });
});
