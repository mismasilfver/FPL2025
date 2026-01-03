/**
 * @jest-environment jsdom
 */

require('../test-setup');
const { FPLTeamManager } = require('../script.js');
const { __getMockStorage } = require('../js/storage-module.js');

describe('Read-only: notes expansion and filters still work', () => {
  beforeEach(() => {
    localStorage.clear();
    const storage = __getMockStorage?.();
    storage?.reset?.();
    document.body.innerHTML = `
      <button data-testid="add-player-button"></button>
      <div class="players-table-container"><table id="players-table"><tbody id="players-tbody"></tbody></table></div>
      <div id="empty-state"></div>
      <div id="week-label"></div>
      <span id="week-readonly-badge" style="display:none"></span>
      <select id="position-filter" data-testid="position-filter-select">
        <option value="all">All</option>
        <option value="goalkeeper">Goalkeeper</option>
        <option value="defence">Defence</option>
        <option value="midfield">Midfield</option>
        <option value="forward">Forward</option>
        <option value=\"goalkeeper\">Goalkeeper</option>
        <option value=\"defence\">Defence</option>
        <option value=\"midfield\">Midfield</option>
        <option value=\"forward\">Forward</option>
      </select>
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
    `;
  });

  test('notes cell toggles expansion in read-only', () => {
    const manager = new FPLTeamManager();
    manager.ui.initElements(document);

    const players = [
      { id: '10', name: 'Notes Guy', position: 'midfield', team: 'AAA', price: 5.0, have: true, status: '', notes: 'This is a very long note for testing expansion.' },
    ];

    // Render directly in read-only mode
    manager.ui.renderPlayers(players, { isReadOnly: true, captainId: null, viceCaptainId: null });

    const cell = document.querySelector('[data-testid=\"notes-cell-10\"]');
    expect(cell).not.toBeNull();
    const beforeText = cell.querySelector('.notes-text').textContent;

    // Click to expand - need to bind events first for delegation to work
    manager.ui.bindEvents({});
    cell.click();

    expect(cell.classList.contains('expanded')).toBe(true);
    const afterText = cell.querySelector('.notes-text').textContent;
    expect(afterText.length).toBeGreaterThanOrEqual(beforeText.length);
    expect(afterText).toContain('This is a very long note');
  });

  test('filters apply under read-only state', async () => {
    const manager = new FPLTeamManager();
    manager.ui.initElements(document);

    // Set up proper data structure for the new format
    const weekData = {
      version: '2.0',
      currentWeek: 1,
      weeks: {
        1: {
          players: [
            { id: '1', name: 'Mid A have', position: 'midfield', team: 'A', price: 6.0, have: true, status: '', notes: '' },
            { id: '2', name: 'Mid B not have', position: 'midfield', team: 'B', price: 6.5, have: false, status: '', notes: '' },
            { id: '3', name: 'Fwd C have', position: 'forward', team: 'C', price: 8.0, have: true, status: '', notes: '' },
          ],
          captain: null,
          viceCaptain: null,
          isReadOnly: true
        }
      }
    };
    
    const storage = __getMockStorage?.();
    if (storage && typeof storage.setRootData === 'function') {
      await storage.setRootData(weekData);
    } else if (typeof manager.storage.setRootData === 'function') {
      await manager.storage.setRootData(weekData);
    } else {
      throw new Error('No storage implementation with setRootData available for readonly filters test.');
    }

    // Set filters: position=midfield, have only
    const positionSelect = document.querySelector('[data-testid=\"position-filter-select\"]');
    const haveCheckbox = document.querySelector('[data-testid=\"have-filter-checkbox\"]');
    positionSelect.value = 'midfield';
    haveCheckbox.checked = true;

    await manager.updateDisplay();

    const rows = document.querySelectorAll('#players-tbody tr.player-row');
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('.col-position').textContent).toContain('Midfield');
    expect(rows[0].querySelector('[data-testid^=\"remove-from-team-\"]').getAttribute('data-testid')).toContain('remove-from-team-1');

    // Read-only UI signals
    expect(document.getElementById('week-readonly-badge').style.display).toBe('inline-block');
    expect(document.querySelector('[data-testid=\"add-player-button\"]').disabled).toBe(true);
  });
});
