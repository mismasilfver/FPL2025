/**
 * @jest-environment jsdom
 */

const { FPLTeamManager } = require('../script.js');

describe('UI uses <template> for modal and builds it on open', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <button data-testid="add-player-button"></button>
      <div class="players-table-container"><table id="players-table"><tbody id="players-tbody"></tbody></table></div>
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

      <!-- No static #player-modal here on purpose -->
      <template id="player-modal-template">
        <div id="player-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-content">
            <div class="modal-header">
              <h2 id="modal-title">Add Player</h2>
              <span class="close">&times;</span>
            </div>
            <form id="player-form">
              <input id="player-name" data-testid="player-name-input" />
              <select id="player-position" data-testid="player-position-select"></select>
              <input id="player-team" data-testid="player-team-input" />
              <input id="player-price" data-testid="player-price-input" />
              <select id="player-status" data-testid="player-status-select"></select>
              <input type="checkbox" id="player-have" data-testid="player-have-checkbox" />
              <textarea id="player-notes" data-testid="player-notes-textarea"></textarea>
              <button type="button" id="cancel-btn" data-testid="cancel-button"></button>
              <button type="submit" data-testid="save-player-button"></button>
            </form>
          </div>
        </div>
      </template>
    `;
  });

  test('UIManager caches modal template and builds modal on open', () => {
    const manager = new FPLTeamManager();
    manager.ui.initElements(document);

    // Should cache the template element
    expect(manager.ui.playerModalTemplate).toBeInstanceOf(HTMLTemplateElement);
    expect(manager.ui.playerModalTemplate.id).toBe('player-modal-template');

    // Modal should not exist initially
    expect(document.getElementById('player-modal')).toBeNull();

    // Open modal should build from template - call UIManager directly
    manager.ui.openModal();

    const modal = document.getElementById('player-modal');
    expect(modal).not.toBeNull();
    // Basic elements wired
    expect(manager.ui.playerForm).toBeInstanceOf(HTMLFormElement);
    expect(manager.ui.playerName).toBeInstanceOf(HTMLElement);
  });
});
