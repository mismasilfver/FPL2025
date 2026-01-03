/**
 * @jest-environment jsdom
 */

describe('test-utils createDOM', () => {
  test('patches FPLTeamManager constructor before instantiation', async () => {
    jest.resetModules();
    jest.doMock('@testing-library/user-event', () => ({
      __esModule: true,
      default: {
        select: jest.fn(),
        submit: jest.fn()
      }
    }));

    const patchModule = require('../js/fpl-async-patch.js');
    const { FPLTeamManager } = require('../script.js');
    const spy = jest.spyOn(patchModule, 'patchFPLTeamManagerAsync');

    // Ensure clean call history before invoking helper
    spy.mockClear();

    const { createDOM } = require('../test-utils');
    const result = await createDOM();

    expect(spy).toHaveBeenCalledWith(FPLTeamManager);

    if (result?.window?.close instanceof Function) {
      result.window.close();
    }

    spy.mockRestore();
  });
});
