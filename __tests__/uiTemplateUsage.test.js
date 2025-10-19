/**
 * @jest-environment jsdom
 */

const { FPLTeamManager } = require('../script.js');

describe('UI uses <template> for player rows', () => {
  beforeEach(() => {
    localStorage.clear();
    if (typeof global.setupDOM === 'function') {
      global.setupDOM();
      const existingTemplate = document.getElementById('player-row-template');
      if (existingTemplate) {
        existingTemplate.remove();
      }
      document.body.insertAdjacentHTML('beforeend', `
        <template id="player-row-template">
          <tr class="player-row">
            <td class="col-name"></td>
            <td class="col-position"></td>
            <td class="col-team"></td>
            <td class="col-price"></td>
            <td class="col-status"></td>
            <td class="col-have"></td>
            <td class="col-captain"></td>
            <td class="col-vice"></td>
            <td class="col-notes"></td>
            <td class="col-actions"></td>
          </tr>
        </template>
      `);
    }
  });

  test('UIManager caches player row template element on init', () => {
    const manager = new FPLTeamManager();
    manager.ui.initElements(document);
    expect(manager.ui.playerRowTemplate).toBeInstanceOf(HTMLTemplateElement);
    expect(manager.ui.playerRowTemplate.id).toBe('player-row-template');
  });
});
