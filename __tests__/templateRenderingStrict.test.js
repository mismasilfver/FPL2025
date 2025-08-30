/**
 * @jest-environment jsdom
 */

// Build DOM with template and required elements matching UIManager selectors
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

describe('UIManager.renderPlayers uses <template> cloning and fills cells', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders rows from template with correct content', () => {
    const manager = new FPLTeamManager();

    const players = [
      { id: '1', name: 'Saka', position: 'midfield', team: 'ARS', price: 9.0, have: true, status: 'green', notes: 'Great fixtures' },
      { id: '2', name: 'Haaland', position: 'forward', team: 'MCI', price: 14.0, have: false, status: '', notes: '' },
    ];
    // Call render directly to avoid side effects
    manager.ui.renderPlayers(players, { isReadOnly: false, captainId: '1', viceCaptainId: null });

    const rows = document.querySelectorAll('#players-tbody tr.player-row');
    expect(rows.length).toBe(2);

    const first = rows[0];
    expect(first.querySelector('.col-name')?.textContent).toContain('Saka');
    expect(first.querySelector('.col-position')?.textContent).toContain('Midfield');
    expect(first.querySelector('.col-team')?.textContent).toContain('ARS');
    expect(first.querySelector('.col-price')?.textContent).toContain('£9.0m');

    // Have cell should render tick for have: true
    expect(first.querySelector('[data-testid="remove-from-team-1"]')).not.toBeNull();

    // Captain cell should render badge for captain
    expect(first.querySelector('[data-testid="captain-badge-1"]')).not.toBeNull();

    // Actions cell should have edit/delete buttons
    expect(first.querySelector('[data-testid="edit-player-1"]')).not.toBeNull();
    expect(first.querySelector('[data-testid="delete-player-1"]')).not.toBeNull();
  });
});
