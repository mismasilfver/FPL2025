/**
 * @jest-environment jsdom
 */

const { FPLTeamManager } = require('../script.js');

describe('Template-rendered rows respect read-only state by disabling controls', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <button data-testid=\"add-player-button\"></button>
      <div class=\"players-table-container\"><table id=\"players-table\"><tbody id=\"players-tbody\"></tbody></table></div>
      <div id=\"empty-state\"></div>
      <div id=\"week-label\"></div>
      <span id=\"week-readonly-badge\"></span>
      <select id=\"position-filter\" data-testid=\"position-filter-select\"></select>
      <input type=\"checkbox\" id=\"have-filter\" data-testid=\"have-filter-checkbox\" />
      <button id=\"prev-week-btn\"></button>
      <button id=\"next-week-btn\"></button>
      <button id=\"create-week-btn\"></button>
      <button id=\"export-week-btn\"></button>
      <span id=\"team-count\"></span>
      <span id=\"total-value\"></span>
      <span id=\"captain-info\"></span>
      <span id=\"vice-captain-info\"></span>

      <template id=\"player-row-template\">
        <tr class=\"player-row\">
          <td class=\"col-name\"></td>
          <td class=\"col-position\"></td>
          <td class=\"col-team\"></td>
          <td class=\"col-price\"></td>
          <td class=\"col-status\"></td>
          <td class=\"col-have\"></td>
          <td class=\"col-captain\"></td>
          <td class=\"col-vice\"></td>
          <td class=\"col-notes\"></td>
          <td class=\"col-actions\"></td>
        </tr>
      </template>

      <template id=\"player-modal-template\">
        <div id=\"player-modal\" class=\"modal\">
          <div class=\"modal-content\">
            <div class=\"modal-header\">
              <h2 id=\"modal-title\">Add Player</h2>
              <span class=\"close\">&times;</span>
            </div>
            <form id=\"player-form\">
              <input id=\"player-name\" data-testid=\"player-name-input\" />
              <select id=\"player-position\" data-testid=\"player-position-select\"></select>
              <input id=\"player-team\" data-testid=\"player-team-input\" />
              <input id=\"player-price\" data-testid=\"player-price-input\" />
              <select id=\"player-status\" data-testid=\"player-status-select\"></select>
              <input type=\"checkbox\" id=\"player-have\" data-testid=\"player-have-checkbox\" />
              <textarea id=\"player-notes\" data-testid=\"player-notes-textarea\"></textarea>
              <button type=\"button\" id=\"cancel-btn\" data-testid=\"cancel-button\"></button>
            </form>
          </div>
        </div>
      </template>
    `;
  });

  test('disables add-to-team, make-captain/vice, edit/delete buttons when read-only', () => {
    const manager = new FPLTeamManager();
    manager.ui.initElements(document);

    const players = [
      { id: '1', name: 'Player A', position: 'midfield', team: 'AAA', price: 5.0, have: false, status: '', notes: '' },
      { id: '2', name: 'Player B', position: 'forward', team: 'BBB', price: 7.5, have: true, status: '', notes: '', },
      { id: '3', name: 'Player C', position: 'defence', team: 'CCC', price: 4.5, have: false, status: '', notes: '', },
    ];

    manager.ui.renderPlayers(players, { isReadOnly: true, captainId: '2', viceCaptainId: '3' });

    // Player 1 (not in team) should have disabled add-to-team button
    const addBtn1 = document.querySelector('[data-testid=\"add-to-team-1\"]');
    expect(addBtn1).not.toBeNull();
    expect(addBtn1.disabled).toBe(true);

    // Player 2 (captain) should show badge instead of button
    expect(document.querySelector('[data-testid=\"captain-badge-2\"]')).not.toBeNull();
    expect(document.querySelector('[data-testid=\"make-captain-2\"]')).toBeNull();

    // Player 3 (vice) should show badge instead of button
    expect(document.querySelector('[data-testid=\"vice-captain-badge-3\"]')).not.toBeNull();
    expect(document.querySelector('[data-testid=\"make-vice-captain-3\"]')).toBeNull();

    // Edit/Delete should be disabled for all rows
    const editButtons = Array.from(document.querySelectorAll('[data-testid^=\"edit-player-\"]'));
    const deleteButtons = Array.from(document.querySelectorAll('[data-testid^=\"delete-player-\"]'));
    expect(editButtons.length).toBe(3);
    expect(deleteButtons.length).toBe(3);
    editButtons.forEach(btn => expect(btn.disabled).toBe(true));
    deleteButtons.forEach(btn => expect(btn.disabled).toBe(true));
  });
});
