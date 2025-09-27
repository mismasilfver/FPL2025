const { createDOM, userEvent } = require('../test-utils');

/**
 * Phase 2 storage-focused tests: creating new weeks via UI should persist
 * correct v2 structures and preserve historical integrity.
 */

describe('Phase 2: Week creation persists correct v2 structures', () => {
  let window, document;

  beforeEach(async () => {
    ({ window, document } = await createDOM());
    window.localStorage.clear();
  });

  test('Creating a new week updates currentWeek and snapshots minimal teamMembers + totals', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add two players in week 1
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'P1', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'A', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '6', window);
    const have1 = document.querySelector('[data-testid="player-have-checkbox"]');
    have1.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'P2', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'defence', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'B', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '5', window);
    const have2 = document.querySelector('[data-testid="player-have-checkbox"]');
    have2.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    // Set captain/vice
    const p1 = window.fplManager.players.find(p => p.name === 'P1');
    const p2 = window.fplManager.players.find(p => p.name === 'P2');
    const capBtnW1 = document.querySelector(`[data-testid="make-captain-${p1.id}"]`);
    if (capBtnW1) userEvent.click(capBtnW1, window);
    const vcBtnW1 = document.querySelector(`[data-testid="make-vice-captain-${p2.id}"]`);
    if (vcBtnW1) userEvent.click(vcBtnW1, window);

    // Create week 2
    userEvent.click(document.getElementById('create-week-btn'), window);

    // Now modify week 2 slightly so totals change only for week 2
    const editBtnW2 = document.querySelector(`[data-testid="edit-player-${p1.id}"]`);
    if (editBtnW2) userEvent.click(editBtnW2, window);
    const priceInput = document.querySelector('[data-testid="player-price-input"]');
    priceInput.value = '';
    userEvent.type(priceInput, '7', window); // from 6 -> 7
    userEvent.submit(document.querySelector('#player-form'), window);

    // Inspect storage
    const raw = window.localStorage.getItem('fpl-team-data');
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw);

    expect(data.version).toBe('2.0');
    expect(data.currentWeek).toBe(2);

    const w1 = data.weeks['1'] || data.weeks[1];
    const w2 = data.weeks['2'] || data.weeks[2];

    // Minimal teamMembers shape
    const hasMinimalShape = (arr) => Array.isArray(arr) && arr.every(m => {
      const keys = Object.keys(m).sort();
      return JSON.stringify(keys) === JSON.stringify(['addedAt','playerId']);
    });
    expect(hasMinimalShape(w1.teamMembers)).toBe(true);
    expect(hasMinimalShape(w2.teamMembers)).toBe(true);

    // totalTeamCost exists per week and reflects changes only in week 2
    expect(w1.totalTeamCost).toBeCloseTo(11, 5); // 6 + 5
    expect(w2.totalTeamCost).toBeCloseTo(12, 5); // 7 + 5

    // teamStats mirrors totals for backward compatibility
    expect(w1.teamStats.totalValue).toBeCloseTo(11, 5);
    expect(w2.teamStats.totalValue).toBeCloseTo(12, 5);

    // captain and vice copied
    expect(w1.captain).toBe(p1.id);
    expect(w1.viceCaptain).toBe(p2.id);
    expect(w2.captain).toBe(p1.id);
    expect(w2.viceCaptain).toBe(p2.id);
  });

  test('Previous weeks are read-only: storage remains unchanged when editing while on week 1', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add one player in week 1
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'R1', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'AA', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '6', window);
    const have = document.querySelector('[data-testid="player-have-checkbox"]');
    have.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    const r1 = window.fplManager.players.find(p => p.name === 'R1');

    // Create week 2
    userEvent.click(document.getElementById('create-week-btn'), window);

    // Go back to week 1 and attempt to edit (should be blocked by UI in practice)
    userEvent.click(document.getElementById('prev-week-btn'), window);
    const editBtn = document.querySelector(`[data-testid="edit-player-${r1.id}"]`);
    if (editBtn) userEvent.click(editBtn, window);
    const priceInput = document.querySelector('[data-testid="player-price-input"]');
    if (priceInput) {
      priceInput.value = '';
      userEvent.type(priceInput, '10', window);
      userEvent.submit(document.querySelector('#player-form'), window);
    }

    // Storage should still reflect original totals for week 1
    const raw = window.localStorage.getItem('fpl-team-data');
    const data = JSON.parse(raw);
    const w1 = data.weeks['1'] || data.weeks[1];
    const w2 = data.weeks['2'] || data.weeks[2];

    expect(w1.totalTeamCost).toBeCloseTo(6, 5);
    expect(w2.totalTeamCost).toBeCloseTo(6, 5); // unchanged since we didn't edit w2
  });
});
