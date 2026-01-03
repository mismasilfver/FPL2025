jest.mock('url', () => ({
  __esModule: true,
  default: {
    createObjectURL: jest.fn(() => 'blob:mock'),
    revokeObjectURL: jest.fn(),
  },
}));

import { createDOM, userEvent } from '../test-utils';

function expectLogCall(spy, button, payloadMatcher) {
  const call = spy.mock.calls.find(([name]) => name === button);
  expect(call).toBeDefined();
  if (payloadMatcher) {
    expect(call[1]).toMatchObject(payloadMatcher);
  }
}

describe('UI logging', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('primary controls log button clicks', async () => {
    const { document, window, fplManager } = await createDOM();
    const logSpy = jest.spyOn(fplManager.ui, '_logButtonClick').mockImplementation(() => {});

    const exportButton = document.getElementById('export-week-btn');
    if (exportButton) {
      exportButton.style.display = 'block';
    }

    const buttonSpecs = [
      { selector: '[data-testid="add-player-button"]', name: 'add-player' },
      { selector: '#prev-week-btn', name: 'previous-week' },
      { selector: '#next-week-btn', name: 'next-week' },
      { selector: '#create-week-btn', name: 'create-week' },
      { selector: '#export-week-btn', name: 'export-week' },
    ];

    for (const { selector, name } of buttonSpecs) {
      const button = document.querySelector(selector);
      expect(button).not.toBeNull();

      if (button.disabled) {
        button.disabled = false;
      }

      logSpy.mockClear();
      await userEvent.click(button, window);
      expectLogCall(logSpy, name);
    }

    jest.clearAllMocks();
  });

  test('modal buttons log interactions', async () => {
    const { document, window, fplManager } = await createDOM();
    const logSpy = jest.spyOn(fplManager.ui, '_logButtonClick').mockImplementation(() => {});

    const addButton = document.querySelector('[data-testid="add-player-button"]');
    expect(addButton).not.toBeNull();

    await userEvent.click(addButton, window);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const { modal } = fplManager.ui;
    expect(modal).not.toBeNull();

    const cancelButton = modal.querySelector('[data-testid="cancel-button"]');
    const closeButton = modal.querySelector('.close');
    expect(cancelButton).not.toBeNull();
    expect(closeButton).not.toBeNull();

    await userEvent.click(cancelButton, window);
    expectLogCall(logSpy, 'modal-cancel');

    await userEvent.click(addButton, window);
    await new Promise((resolve) => setTimeout(resolve, 0));

    await userEvent.click(closeButton, window);
    expectLogCall(logSpy, 'modal-close');
  });

  test('player action buttons log interactions', async () => {
    const { document, window, fplManager } = await createDOM();
    const logSpy = jest.spyOn(fplManager.ui, '_logButtonClick').mockImplementation(() => {});

    await fplManager.addPlayer({
      id: 'logging-test-player',
      name: 'Loggable Player',
      position: 'midfield',
      team: 'LOG',
      price: 5.5,
      have: true,
      notes: '',
    });
    await fplManager.updateDisplay();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const editButton = document.querySelector('[data-action="edit"][data-player-id="logging-test-player"]');
    expect(editButton).not.toBeNull();

    await userEvent.click(editButton, window);

    expectLogCall(logSpy, 'player-action', {
      action: 'edit',
      playerId: 'logging-test-player',
    });
  });
});
