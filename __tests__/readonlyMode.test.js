const { createDOM, userEvent } = require('../test-utils');

describe('Read-only mode for previous weeks', () => {
  let window, document, fplManager;

  beforeEach(async () => {
    ({ window, document, fplManager } = await createDOM());
    window.localStorage.clear();
  });

  const seedTwoPlayers = async () => {
    // Open add modal and add player 1
    const addButton = document.querySelector('[data-testid="add-player-button"]');
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Player One', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'T1', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '6.0', window);
    userEvent.select(document.querySelector('[data-testid="player-status-select"]'), 'green', window);
    userEvent.submit(document.querySelector('#player-form'), window);

    // Add player 2
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Player Two', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'forward', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'T2', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '7.5', window);
    userEvent.select(document.querySelector('[data-testid="player-status-select"]'), 'yellow', window);
    userEvent.submit(document.querySelector('#player-form'), window);
  };

  test('previous week shows Read-only state and disables edit controls', async () => {
    await seedTwoPlayers();

    // Set captain in week 1
    const makeCaptainBtnWeek1 = document.querySelector('[data-testid^="make-captain-"]');
    if (makeCaptainBtnWeek1) userEvent.click(makeCaptainBtnWeek1, window);

    // Create a new week (week 2)
    const createBtn = document.getElementById('create-week-btn');
    userEvent.click(createBtn, window);

    // Navigate back to week 1
    const prevBtn = document.getElementById('prev-week-btn');
    userEvent.click(prevBtn, window);

    // Read-only should be set on previous week
    const isRO = window.fplManager.isWeekReadOnly(1);
    expect(isRO).toBe(true);

    // Badge should reflect read-only (inline style not 'none')
    const roBadge = document.getElementById('week-readonly-badge');
    expect(roBadge).not.toBeNull();
    expect(roBadge.style.display).not.toBe('none');

    // Buttons disabled in table for edit, delete, add-to-team
    const anyEdit = document.querySelector('[data-testid^="edit-player-"]');
    const anyDelete = document.querySelector('[data-testid^="delete-player-"]');
    const anyAddToTeam = document.querySelector('[data-testid^="add-to-team-"]');
    if (anyEdit) expect(anyEdit.disabled).toBe(true);
    if (anyDelete) expect(anyDelete.disabled).toBe(true);
    if (anyAddToTeam) expect(anyAddToTeam.disabled).toBe(true);
  });

  test('mutating actions in read-only week do nothing (guarded and/or disabled)', async () => {
    await seedTwoPlayers();

    // Remember initial data
    const initialPlayers = fplManager.players.map(p => ({ ...p }));

    // Create week 2 and go back to week 1
    userEvent.click(document.getElementById('create-week-btn'), window);
    userEvent.click(document.getElementById('prev-week-btn'), window);

    // Add button should be disabled; clicking should not change state
    const addBtn = document.querySelector('[data-testid="add-player-button"]');
    expect(addBtn.disabled).toBe(true);
    userEvent.click(addBtn, window);

    // Try to set captain (if button exists, it should be disabled)
    const makeCaptainBtn = document.querySelector('[data-testid^="make-captain-"]');
    if (makeCaptainBtn) {
      expect(makeCaptainBtn.disabled).toBe(true);
      userEvent.click(makeCaptainBtn, window);
    }

    // Try to delete (if button exists, it's disabled)
    const deleteBtn = document.querySelector('[data-testid^="delete-player-"]');
    if (deleteBtn) {
      expect(deleteBtn.disabled).toBe(true);
      userEvent.click(deleteBtn, window);
    }

    // State remains unchanged
    expect(fplManager.players.map(p => ({ ...p }))).toEqual(initialPlayers);
  });
});
