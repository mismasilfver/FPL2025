/**
 * @jest-environment jsdom
 */

const { patchFPLTeamManagerAsync } = require('../js/fpl-async-patch.js');

const PATCHED_METHODS = [
  'loadStateFromStorage',
  'saveStateToStorage',
  'saveToStorage',
  'getWeekCount',
  '_isReadOnlyCurrentWeek',
  'getWeekSnapshot',
  'createNewWeek',
  'goToWeek',
  'nextWeek',
  'prevWeek',
  'updateDisplay',
  'exportWeekData',
  'importFromJSON'
];

const createManagerClass = () => {
  function FakeManager() {
    this.value = 'state';
  }

  PATCHED_METHODS.forEach((methodName) => {
    FakeManager.prototype[methodName] = function () {
      return `${methodName}:${this.value}`;
    };
  });

  return FakeManager;
};

describe('patchFPLTeamManagerAsync', () => {
  let consoleLogSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    delete window.FPLTeamManager;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    delete window.FPLTeamManager;
  });

  it('makes every storage, week, UI and import/export method async', async () => {
    const FakeManager = createManagerClass();

    patchFPLTeamManagerAsync(FakeManager);

    const instance = new FakeManager();
    for (const methodName of PATCHED_METHODS) {
      const result = instance[methodName]();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(`${methodName}:state`);
    }
    expect(consoleLogSpy).toHaveBeenCalledWith('FPLTeamManager methods patched for async compatibility');
  });

  it('falls back to window.FPLTeamManager when no class is provided', async () => {
    const FakeManager = createManagerClass();
    window.FPLTeamManager = FakeManager;

    patchFPLTeamManagerAsync();

    await expect(new FakeManager().getWeekCount()).resolves.toBe('getWeekCount:state');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('warns and does nothing when no constructor can be resolved', () => {
    patchFPLTeamManagerAsync();

    expect(consoleWarnSpy).toHaveBeenCalledWith('FPLTeamManager constructor not provided for async patch');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('warns when the provided value is not a constructor', () => {
    patchFPLTeamManagerAsync({ notAClass: true });

    expect(consoleWarnSpy).toHaveBeenCalledWith('FPLTeamManager constructor not provided for async patch');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
