/**
 * @jest-environment jsdom
 */

const { FPLTeamManager } = require('../script.js');

describe('UIManager.renderPlayers uses <template> cloning and fills cells', () => {
  beforeEach(() => {
    localStorage.clear();
    if (typeof global.setupDOM === 'function') {
      global.setupDOM();
    }
  });

  test('renders rows from template with correct content', () => {
    const manager = new FPLTeamManager();
    const existingTemplate = document.getElementById('player-row-template');
    if (existingTemplate) existingTemplate.remove();
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
    // Initialize UIManager elements to cache templates
    manager.ui.initElements(document);

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
