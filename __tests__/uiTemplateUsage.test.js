/**
 * @jest-environment jsdom
 */

// Build a minimal DOM including the template before loading script.js
beforeAll(() => {
  document.body.innerHTML = `
    <button data-testid="add-player-button"></button>
    <div class="players-table-container">
      <table id="players-table">
        <tbody id="players-tbody"></tbody>
      </table>
    </div>
    <div id="empty-state"></div>
    <div id="week-label"></div>
    <span id="week-readonly-badge"></span>
    <select id="position-filter" data-testid="position-filter-select"></select>
    <input type="checkbox" id="have-filter" data-testid="have-filter-checkbox" />
    <button id="prev-week-btn"></button>
    <button id="next-week-btn"></button>
    <button id="create-week-btn"></button>
    <button id="export-week-btn"></button>
    <span id="team-count"></span>
    <span id="total-value"></span>
    <span id="captain-info"></span>
    <span id="vice-captain-info"></span>
    <div id="player-modal"><div class="modal-content"><div class="modal-header"><span class="close"></span></div></div></div>
    <form id="player-form"></form>
    <input id="player-name" data-testid="player-name-input" />
    <select id="player-position" data-testid="player-position-select"></select>
    <input id="player-team" data-testid="player-team-input" />
    <input id="player-price" data-testid="player-price-input" />
    <select id="player-status" data-testid="player-status-select"></select>
    <input type="checkbox" id="player-have" data-testid="player-have-checkbox" />
    <textarea id="player-notes" data-testid="player-notes-textarea"></textarea>
    <button id="cancel-btn" data-testid="cancel-button"></button>

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
  `;
});

const { FPLTeamManager } = require('../script.js');

describe('UI uses <template> for player rows', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('UIManager caches player row template element on init', () => {
    const manager = new FPLTeamManager();
    manager.ui.initElements(document);
    expect(manager.ui.playerRowTemplate).toBeInstanceOf(HTMLTemplateElement);
    expect(manager.ui.playerRowTemplate.id).toBe('player-row-template');
  });
});
