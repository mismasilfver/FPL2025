import WeekService from '../../js/services/week-service.js';
import { createDefaultRoot } from '../../js/storage-module.js';

describe('WeekService', () => {
  let weekService;
  let mockStorageService;
  let rootData;

  beforeEach(() => {
    mockStorageService = {
      getRootData: jest.fn(),
      setRootData: jest.fn(),
    };
    weekService = new WeekService(mockStorageService);
    rootData = createDefaultRoot();
  });

  it('should be defined', () => {
    expect(weekService).toBeDefined();
  });

  describe('createNewWeek', () => {
    it('should create a new week, increment currentWeek, and make the previous week read-only', () => {
      rootData.weeks[1].players.push({ id: '1', name: 'Player 1' });
      const updatedRoot = weekService.createNewWeek(rootData);

      expect(updatedRoot.currentWeek).toBe(2);
      expect(updatedRoot.weeks[1].isReadOnly).toBe(true);
      expect(updatedRoot.weeks[2].isReadOnly).toBe(false);
      expect(updatedRoot.weeks[2].players).toEqual(updatedRoot.weeks[1].players);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      rootData = weekService.createNewWeek(rootData); // now on week 2
      rootData = weekService.createNewWeek(rootData); // now on week 3
    });

    it('goToWeek should change the current week', () => {
      const updatedRoot = weekService.goToWeek(rootData, 1);
      expect(updatedRoot.currentWeek).toBe(1);
    });

    it('nextWeek should increment the current week', () => {
      let updatedRoot = weekService.goToWeek(rootData, 1);
      updatedRoot = weekService.nextWeek(updatedRoot);
      expect(updatedRoot.currentWeek).toBe(2);
    });

    it('nextWeek should not go past the max week', () => {
      const updatedRoot = weekService.nextWeek(rootData);
      expect(updatedRoot.currentWeek).toBe(3);
    });

    it('prevWeek should decrement the current week', () => {
      const updatedRoot = weekService.prevWeek(rootData);
      expect(updatedRoot.currentWeek).toBe(2);
    });

    it('prevWeek should not go below week 1', () => {
      let updatedRoot = weekService.goToWeek(rootData, 1);
      updatedRoot = weekService.prevWeek(updatedRoot);
      expect(updatedRoot.currentWeek).toBe(1);
    });
  });

  describe('getters', () => {
    it('getWeekCount should return the number of weeks', () => {
      rootData = weekService.createNewWeek(rootData);
      const count = weekService.getWeekCount(rootData);
      expect(count).toBe(2);
    });

    it('getCurrentWeekNumber should return the current week number', () => {
      rootData.currentWeek = 2;
      const weekNumber = weekService.getCurrentWeekNumber(rootData);
      expect(weekNumber).toBe(2);
    });

    it('getWeekSnapshot should return a snapshot of the specified week', () => {
      rootData.weeks[1].players.push({ id: '1', name: 'Player 1' });
      const snapshot = weekService.getWeekSnapshot(rootData, 1);
      expect(snapshot.players).toHaveLength(1);
    });
  });

  describe('read-only checks', () => {
    beforeEach(() => {
      rootData = weekService.createNewWeek(rootData);
    });

    it('isWeekReadOnly should return true for a read-only week', () => {
      const isReadOnly = weekService.isWeekReadOnly(rootData, 1);
      expect(isReadOnly).toBe(true);
    });

    it('isWeekReadOnly should return false for a writable week', () => {
      const isReadOnly = weekService.isWeekReadOnly(rootData, 2);
      expect(isReadOnly).toBe(false);
    });

    it('isCurrentWeekReadOnly should return false when on the latest week', () => {
      const isReadOnly = weekService.isCurrentWeekReadOnly(rootData);
      expect(isReadOnly).toBe(false);
    });

    it('isCurrentWeekReadOnly should return true when on a previous, read-only week', () => {
      const rootOnPrevWeek = weekService.goToWeek(rootData, 1);
      const isReadOnly = weekService.isCurrentWeekReadOnly(rootOnPrevWeek);
      expect(isReadOnly).toBe(true);
    });
  });
});
