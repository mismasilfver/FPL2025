function setupDOM() {
  document.body.innerHTML = `
    <div class="container">
      <h1>FPL Team Manager</h1>
      <div class="week-controls">
        <button id="prev-week-btn">Previous Week</button>
        <span id="week-label">Week 1</span>
        <span id="week-readonly-badge" class="badge" style="display: none;">Read-only</span>
        <button id="next-week-btn">Next Week</button>
        <button id="create-week-btn">Start Next Week</button>
        <button id="export-week-btn">Export</button>
      </div>
      <div class="filters">
        <input type="text" id="name-filter" placeholder="Filter by name...">
        <select id="position-filter" data-testid="position-filter-select">
          <option value="all">All Positions</option>
          <option value="goalie">Goalkeeper</option>
          <option value="defender">Defender</option>
          <option value="midfield">Midfielder</option>
          <option value="forward">Forward</option>
        </select>
        <label><input type="checkbox" id="have-filter" data-testid="have-filter-checkbox"> Show only my players</label>
      </div>
      <div class="table-container">
        <table id="players-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Team</th>
              <th>Pos</th>
              <th>Price</th>
              <th>Status</th>
              <th>Have</th>
              <th>Captain</th>
              <th>Vice</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="players-tbody"></tbody>
        </table>
        <div id="empty-state" style="display: none;">No players found.</div>
      </div>
      <div class="summary">
        <p id="team-count">In Team: 0/15</p>
        <p id="total-value">Total Value: £0.0m</p>
      </div>
      <button data-testid="add-player-button" id="add-player-btn">Add Player</button>
    </div>

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

    <template id="player-modal-template">
      <div id="player-modal" style="display:none;">
        <div class="modal-content">
          <div class="modal-header"><span class="close"></span></div>
          <h2 id="modal-title">Add/Edit Player</h2>
          <form id="player-form">
            <input type="hidden" id="player-id">
            <input id="player-name-input" data-testid="player-name-input" required />
            <select id="player-position-select" data-testid="player-position-select" required></select>
            <input id="player-team-input" data-testid="player-team-input" required />
            <input id="player-price-input" data-testid="player-price-input" type="number" step="0.1" min="0" required />
            <select id="player-status-select" data-testid="player-status-select"></select>
            <input type="checkbox" id="player-have-checkbox" data-testid="player-have-checkbox" />
            <textarea id="player-notes-textarea" data-testid="player-notes-textarea"></textarea>
            <button type="button" id="cancel-btn" data-testid="cancel-button">Cancel</button>
          </form>
        </div>
      </div>
    </template>
  `;
}

module.exports = { setupDOM };

// Trivial test to ensure this utility file doesn't fail Jest's test runner
describe('test-dom smoke', () => {
  test('setupDOM is a function', () => {
    expect(typeof setupDOM).toBe('function');
  });
});
