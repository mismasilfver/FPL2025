/**
 * @jest-environment jsdom
 */

const { FPLTeamManager } = require('../script.js');

describe('Dynamic modal build triggers event bindings (rebinding) so controls work', () => {
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

      <!-- Only template, no static modal -->
      <template id=\"player-modal-template\">
        <div id=\"player-modal\" class=\"modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"modal-title\">
          <div class=\"modal-content\">
            <div class=\"modal-header\">
              <h2 id=\"modal-title\">Add Player</h2>
              <span class=\"close\">&times;</span>
            </div>
            <form id=\"player-form\">
              <input id=\"player-name\" data-testid=\"player-name-input\" />
              <select id=\"player-position\" data-testid=\"player-position-select\">
                <option value=\"\"></option>
                <option value=\"goalkeeper\">Goalkeeper</option>
                <option value=\"defender\">Defender</option>
                <option value=\"midfield\">Midfield</option>
                <option value=\"forward\">Forward</option>
              </select>
              <input id=\"player-team\" data-testid=\"player-team-input\" />
              <input id=\"player-price\" data-testid=\"player-price-input\" />
              <select id=\"player-status\" data-testid=\"player-status-select\">
                <option value=\"\"></option>
                <option value=\"green\">Green</option>
              </select>
              <input type=\"checkbox\" id=\"player-have\" data-testid=\"player-have-checkbox\" />
              <textarea id=\"player-notes\" data-testid=\"player-notes-textarea\"></textarea>
              <button type=\"button\" id=\"cancel-btn\" data-testid=\"cancel-button\">Cancel</button>
              <button type=\"submit\" data-testid=\"save-player-button\">Save Player</button>
            </form>
          </div>
        </div>
      </template>
    `;
  });

  test('close button hides modal after dynamic build (listeners bound)', async () => {
    const manager = new FPLTeamManager();
    // Set up spy before initialization so it captures the bound method
    const closeSpy = jest.spyOn(manager, 'closeModal');
    await manager.init(document); // Initialize UIManager properly

    manager.openModal();
    // Wait a tick for modal creation to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    // Use the manager's modal reference instead of searching document
    const modal = manager.ui.modal;
    expect(modal).not.toBeNull();
    expect(modal.style.display).toBe('block');

    // Click close
    modal.querySelector('.close').click();

    expect(closeSpy).toHaveBeenCalled();
    expect(modal.style.display).toBe('none');
  });

  test('form submit calls handler after dynamic build', async () => {
    const manager = new FPLTeamManager();
    // Set up spy before initialization so it captures the bound method
    const submitSpy = jest.spyOn(manager, 'handleFormSubmit');
    await manager.init(document); // Initialize UIManager properly

    manager.openModal();
    // Wait a tick for modal creation to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    // Use the manager's modal reference instead of searching document
    const modal = manager.ui.modal;
    const form = modal.querySelector('#player-form');
    // Populate required fields so handler can read values
    modal.querySelector('[data-testid="player-name-input"]').value = 'Test Player';
    modal.querySelector('[data-testid="player-position-select"]').value = 'midfield';
    modal.querySelector('[data-testid="player-team-input"]').value = 'TST';
    modal.querySelector('[data-testid="player-price-input"]').value = '6.5';
    modal.querySelector('[data-testid="player-status-select"]').value = 'green';
    modal.querySelector('[data-testid="player-have-checkbox"]').checked = true;
    modal.querySelector('[data-testid="player-notes-textarea"]').value = 'note';

    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    expect(submitSpy).toHaveBeenCalled();
  });
});
