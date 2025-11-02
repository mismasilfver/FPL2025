/**
 * @jest-environment jsdom
 */

const { FPLTeamManager } = require('../script.js');

describe('UI uses <template> for player rows', () => {
  beforeEach(() => {
    localStorage.clear();
    if (typeof global.setupDOM === 'function') {
      global.setupDOM();
    }
  });

  test('UIManager builds a player row from the template', () => {
    const manager = new FPLTeamManager();
    manager.ui.initElements(document); // Initialize with the test DOM

    const player = { id: '1', name: 'Test Player', position: 'GK', team: 'TST', price: '5.5', have: false };
    const row = manager.ui.buildRowFromTemplate(player, { isReadOnly: false });

    expect(row).toBeInstanceOf(HTMLTableRowElement);
    expect(row.querySelector('.col-name').textContent).toBe('Test Player');
  });
});
