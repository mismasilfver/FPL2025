const { createDOM, userEvent } = require('../test-utils');

describe('Week Navigation Controls', () => {
  let window, document, fplManager;

  beforeEach(async () => {
    ({ window, document, fplManager } = await createDOM());
    // Ensure clean storage between tests
    window.localStorage.clear();
  });

  test('Switching weeks updates read-only badge and control enablement', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');
    const roBadge = document.getElementById('week-readonly-badge');
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');
    const createBtn = document.getElementById('create-week-btn');

    // Start on Week 1: badge hidden, add enabled, prev disabled, next disabled (only one week)
    expect(roBadge.style.display === 'none' || roBadge.style.display === '').toBe(true);
    expect(addButton.disabled).toBe(false);
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);

    // Add a player to expose row controls
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'BadgeGuy', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'BG', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '6', window);
    const have = document.querySelector('[data-testid="player-have-checkbox"]');
    have.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    const player = fplManager.players.find(p => p.name === 'BadgeGuy');
    const capBtnW1 = document.querySelector(`[data-testid="make-captain-${player.id}"]`);
    const vcBtnW1 = document.querySelector(`[data-testid="make-vice-captain-${player.id}"]`);
    const editBtnW1 = document.querySelector(`[data-testid="edit-player-${player.id}"]`);
    const delBtnW1 = document.querySelector(`[data-testid="delete-player-${player.id}"]`);

    // In Week 1 (editable): row controls enabled
    expect(capBtnW1.disabled).toBe(false);
    expect(vcBtnW1.disabled).toBe(false);
    expect(editBtnW1.disabled).toBe(false);
    expect(delBtnW1.disabled).toBe(false);

    // Create Week 2: now on Week 2 (editable): badge hidden, add enabled, prev enabled, next disabled
    userEvent.click(createBtn, window);
    expect(roBadge.style.display === 'none' || roBadge.style.display === '').toBe(true);
    expect(addButton.disabled).toBe(false);
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(true);

    // Controls on Week 2 should be enabled
    const capBtnW2 = document.querySelector(`[data-testid=\"make-captain-${player.id}\"]`);
    const vcBtnW2 = document.querySelector(`[data-testid=\"make-vice-captain-${player.id}\"]`);
    const editBtnW2 = document.querySelector(`[data-testid=\"edit-player-${player.id}\"]`);
    const delBtnW2 = document.querySelector(`[data-testid=\"delete-player-${player.id}\"]`);
    expect(capBtnW2.disabled).toBe(false);
    expect(vcBtnW2.disabled).toBe(false);
    expect(editBtnW2.disabled).toBe(false);
    expect(delBtnW2.disabled).toBe(false);

    // Go back to Week 1: badge visible, add disabled, row controls disabled
    userEvent.click(prevBtn, window);
    expect(roBadge.style.display).not.toBe('none');
    expect(addButton.disabled).toBe(true);
    const capBtnBack = document.querySelector(`[data-testid=\"make-captain-${player.id}\"]`);
    const vcBtnBack = document.querySelector(`[data-testid=\"make-vice-captain-${player.id}\"]`);
    const editBtnBack = document.querySelector(`[data-testid=\"edit-player-${player.id}\"]`);
    const delBtnBack = document.querySelector(`[data-testid=\"delete-player-${player.id}\"]`);
    expect(capBtnBack.disabled).toBe(true);
    expect(vcBtnBack.disabled).toBe(true);
    expect(editBtnBack.disabled).toBe(true);
    expect(delBtnBack.disabled).toBe(true);

    // Forward to Week 2 again: badge hidden and controls enabled again
    userEvent.click(nextBtn, window);
    expect(roBadge.style.display === 'none' || roBadge.style.display === '').toBe(true);
    expect(addButton.disabled).toBe(false);
    const capBtnFwd = document.querySelector(`[data-testid=\"make-captain-${player.id}\"]`);
    const vcBtnFwd = document.querySelector(`[data-testid=\"make-vice-captain-${player.id}\"]`);
    const editBtnFwd = document.querySelector(`[data-testid=\"edit-player-${player.id}\"]`);
    const delBtnFwd = document.querySelector(`[data-testid=\"delete-player-${player.id}\"]`);
    expect(capBtnFwd.disabled).toBe(false);
    expect(vcBtnFwd.disabled).toBe(false);
    expect(editBtnFwd.disabled).toBe(false);
    expect(delBtnFwd.disabled).toBe(false);
  });

  test("Toggling have from true to false in week 2 doesn’t remove player from week 1 teamMembers", async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add player with have=true in week 1
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Removable', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'TEAMX', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '6', window);
    const have = document.querySelector('[data-testid="player-have-checkbox"]');
    have.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    const player = fplManager.players.find(p => p.name === 'Removable');

    // Create week 2
    userEvent.click(document.getElementById('create-week-btn'), window);

    // In week 2, remove from team via remove indicator
    const removeSpan = document.querySelector(`[data-testid="remove-from-team-${player.id}"]`);
    if (removeSpan) userEvent.click(removeSpan, window);

    const w1 = window.fplManager.getWeekSnapshot(1);
    const w2 = window.fplManager.getWeekSnapshot(2);

    // Week 1 still has the player in teamMembers
    expect(w1.teamMembers.map(m => m.playerId)).toContain(player.id);
    // Week 2 no longer has the player in teamMembers
    expect(w2.teamMembers.map(m => m.playerId)).not.toContain(player.id);
  });

  test('Changing have from false to true in week 2 adds to teamMembers without altering week 1', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add player with have=false in week 1
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Adder', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'TEAM1', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '6', window);
    // leave have unchecked
    userEvent.submit(document.querySelector('#player-form'), window);

    const player = fplManager.players.find(p => p.name === 'Adder');

    // Create week 2
    userEvent.click(document.getElementById('create-week-btn'), window);

    // In week 2, click Add-to-team control to set have=true
    const addToTeamBtn = document.querySelector(`[data-testid="add-to-team-${player.id}"]`);
    if (addToTeamBtn) userEvent.click(addToTeamBtn, window);

    const w1 = window.fplManager.getWeekSnapshot(1);
    const w2 = window.fplManager.getWeekSnapshot(2);

    // Week 1 remains without the player in teamMembers
    expect(w1.teamMembers.map(m => m.playerId)).not.toContain(player.id);
    // Week 2 now includes the player in teamMembers
    expect(w2.teamMembers.map(m => m.playerId)).toContain(player.id);
  });

  test("Editing position/team in week 2 doesn’t mutate week 1 snapshots", async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add player in week 1 with initial position/team
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'FieldEdit', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'defence', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'OLD', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '5', window);
    const have = document.querySelector('[data-testid="player-have-checkbox"]');
    have.checked = true; // owned for clearer team snapshot
    userEvent.submit(document.querySelector('#player-form'), window);

    const player = fplManager.players.find(p => p.name === 'FieldEdit');

    // Create week 2
    userEvent.click(document.getElementById('create-week-btn'), window);

    // Edit in week 2: change position and team
    const editBtn = document.querySelector(`[data-testid="edit-player-${player.id}"]`);
    if (editBtn) userEvent.click(editBtn, window);
    const posSelect = document.querySelector('[data-testid="player-position-select"]');
    userEvent.select(posSelect, 'midfield', window);
    const teamInput = document.querySelector('[data-testid="player-team-input"]');
    teamInput.value = '';
    userEvent.type(teamInput, 'NEW', window);
    userEvent.submit(document.querySelector('#player-form'), window);

    const w1 = window.fplManager.getWeekSnapshot(1);
    const w2 = window.fplManager.getWeekSnapshot(2);
    const w1Player = window.fplManager.getPlayerSnapshot(1, player.id);
    const w2Player = window.fplManager.getPlayerSnapshot(2, player.id);

    // Week 1 retains original fields
    expect(w1Player.position).toBe('defence');
    expect(w1Player.team).toBe('OLD');

    // Week 2 reflects edits
    expect(w2Player.position).toBe('midfield');
    expect(w2Player.team).toBe('NEW');
  });

  test("Deleting a player in week 2 doesn’t remove them from week 1’s players or teamMembers", async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add a player with have=true so they appear in teamMembers
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Deletable', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'defence', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'ZZZ', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '5', window);
    const have = document.querySelector('[data-testid="player-have-checkbox"]');
    have.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    const player = fplManager.players.find(p => p.name === 'Deletable');

    // Create week 2, which freezes week 1
    userEvent.click(document.getElementById('create-week-btn'), window);

    // Delete the player in week 2
    // jsdom doesn't implement confirm; mock it to return true
    window.confirm = jest.fn(() => true);
    const delBtn = document.querySelector(`[data-testid="delete-player-${player.id}"]`);
    if (delBtn) userEvent.click(delBtn, window);

    const w1 = window.fplManager.getWeekSnapshot(1);
    const w2 = window.fplManager.getWeekSnapshot(2);

    // Week 1 still has the player in players and teamMembers
    expect((w1.players || []).some(p => p.id === player.id)).toBe(true);
    expect(w1.teamMembers.map(m => m.playerId)).toContain(player.id);

    // Week 2 no longer has the player
    expect((w2.players || []).some(p => p.id === player.id)).toBe(false);
    expect(w2.teamMembers.map(m => m.playerId)).not.toContain(player.id);
  });

  test("Editing a non-owned player in week 2 doesn’t affect week 1’s snapshot state", async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add a player with have=false so not in teamMembers
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'BenchGuy', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'forward', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'YYY', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '4.5', window);
    // leave have unchecked
    userEvent.submit(document.querySelector('#player-form'), window);

    const player = fplManager.players.find(p => p.name === 'BenchGuy');

    // Snapshot to week 2
    userEvent.click(document.getElementById('create-week-btn'), window);

    // Edit in week 2: adjust price and notes
    const editBtn = document.querySelector(`[data-testid="edit-player-${player.id}"]`);
    if (editBtn) userEvent.click(editBtn, window);
    const priceInput = document.querySelector('[data-testid="player-price-input"]');
    priceInput.value = '';
    userEvent.type(priceInput, '5.0', window);
    const notesInput = document.querySelector('[data-testid="player-notes-textarea"]');
    userEvent.type(notesInput, 'bench updated', window);
    userEvent.submit(document.querySelector('#player-form'), window);

    const w1 = window.fplManager.getWeekSnapshot(1);
    const w2 = window.fplManager.getWeekSnapshot(2);

    const w1Player = window.fplManager.getPlayerSnapshot(1, player.id);
    const w2Player = window.fplManager.getPlayerSnapshot(2, player.id);

    // Week 1 player data unchanged and not in teamMembers
    expect(w1Player.price).toBe(4.5);
    expect(w1Player.notes || '').toBe('');
    expect(w1.teamMembers.map(m => m.playerId)).not.toContain(player.id);

    // Week 2 player updated and still not in teamMembers (have remained false)
    expect(w2Player.price).toBe(5.0);
    expect(w2Player.notes).toBe('bench updated');
    expect(w2.teamMembers.map(m => m.playerId)).not.toContain(player.id);
  });

  test("Editing a player's notes or price in week 2 doesn't change week 1 snapshot", async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add a player with have=true, price=6, no notes
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Editable', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'EEE', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '6', window);
    const have = document.querySelector('[data-testid="player-have-checkbox"]');
    have.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    const player = fplManager.players.find(p => p.name === 'Editable');

    // Create week 2 (snapshot week 1)
    userEvent.click(document.getElementById('create-week-btn'), window);

    // Edit in week 2: change price to 7 and add notes
    const editBtnW2 = document.querySelector(`[data-testid="edit-player-${player.id}"]`);
    if (editBtnW2) userEvent.click(editBtnW2, window);
    // Update fields in modal
    const priceInput = document.querySelector('[data-testid="player-price-input"]');
    priceInput.value = '';
    userEvent.type(priceInput, '7', window);
    const notesInput = document.querySelector('[data-testid="player-notes-textarea"]');
    userEvent.type(notesInput, 'changed', window);
    userEvent.submit(document.querySelector('#player-form'), window);

    const w1 = window.fplManager.getWeekSnapshot(1);
    const w2 = window.fplManager.getWeekSnapshot(2);

    const w1Player = window.fplManager.getPlayerSnapshot(1, player.id);
    const w2Player = window.fplManager.getPlayerSnapshot(2, player.id);

    // Week 1 retains original price and notes
    expect(w1Player.price).toBe(6);
    expect(w1Player.notes || '').toBe('');

    // Week 2 has updated price and notes
    expect(w2Player.price).toBe(7);
    expect(w2Player.notes).toBe('changed');

    // teamStats totalValue updated only for week 2 (week 1 unchanged)
    expect(w1.teamStats.totalValue).toBe(6);
    expect(w2.teamStats.totalValue).toBe(7);
  });

  test('Toggling team membership in week 2 does not affect week 1 (historical integrity)', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add Player InTeam and mark as have
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'InTeam', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'EEE', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '6', window);
    const have = document.querySelector('[data-testid="player-have-checkbox"]');
    have.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    const player = fplManager.players.find(p => p.name === 'InTeam');

    // Create week 2 (week 1 snapshot has player in team)
    userEvent.click(document.getElementById('create-week-btn'), window);

    // In week 2, remove from team via remove indicator
    const removeSpan = document.querySelector(`[data-testid="remove-from-team-${player.id}"]`);
    if (removeSpan) {
      userEvent.click(removeSpan, window);
    }

    const w1 = window.fplManager.getWeekSnapshot(1);
    const w2 = window.fplManager.getWeekSnapshot(2);

    // Week 1 teamMembers remains with the player
    expect(w1.teamMembers.map(m => m.playerId)).toContain(player.id);
    // Week 2 teamMembers no longer contains the player
    expect(w2.teamMembers.map(m => m.playerId)).not.toContain(player.id);
  });

  test('Changing captain in week 2 does not change week 1 (historical integrity)', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add two players and mark both as have
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Cap One', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'AAA', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '9', window);
    const have1 = document.querySelector('[data-testid="player-have-checkbox"]');
    have1.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Cap Two', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'forward', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'BBB', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '8', window);
    const have2 = document.querySelector('[data-testid="player-have-checkbox"]');
    have2.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    const p1 = fplManager.players.find(p => p.name === 'Cap One');
    const p2 = fplManager.players.find(p => p.name === 'Cap Two');

    // Set captain to p1 in week 1
    const capBtnW1 = document.querySelector(`[data-testid="make-captain-${p1.id}"]`);
    if (capBtnW1) userEvent.click(capBtnW1, window);

    // Create week 2 (copies captain)
    userEvent.click(document.getElementById('create-week-btn'), window);

    // In week 2, set captain to p2
    const capBtnW2 = document.querySelector(`[data-testid="make-captain-${p2.id}"]`);
    if (capBtnW2) userEvent.click(capBtnW2, window);

    // Navigate back to week 1 and verify captain unchanged
    userEvent.click(document.getElementById('prev-week-btn'), window);
    expect(window.fplManager.getWeekSnapshot(1).captain).toBe(p1.id);
    expect(window.fplManager.getWeekSnapshot(2).captain).toBe(p2.id);
  });

  test('Changing vice-captain in week 2 does not change week 1 (historical integrity)', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add two players and mark both as have
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'VC One', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'defence', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'CCC', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '5', window);
    const have1 = document.querySelector('[data-testid="player-have-checkbox"]');
    have1.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'VC Two', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'goalkeeper', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'DDD', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '4.5', window);
    const have2 = document.querySelector('[data-testid="player-have-checkbox"]');
    have2.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    const p1 = fplManager.players.find(p => p.name === 'VC One');
    const p2 = fplManager.players.find(p => p.name === 'VC Two');

    // Set vice to p1 in week 1
    const vcBtnW1 = document.querySelector(`[data-testid="make-vice-captain-${p1.id}"]`);
    if (vcBtnW1) userEvent.click(vcBtnW1, window);

    // Create week 2 (copies vice)
    userEvent.click(document.getElementById('create-week-btn'), window);

    // In week 2, set vice to p2
    const vcBtnW2 = document.querySelector(`[data-testid="make-vice-captain-${p2.id}"]`);
    if (vcBtnW2) userEvent.click(vcBtnW2, window);

    // Navigate back to week 1 and verify vice unchanged
    userEvent.click(document.getElementById('prev-week-btn'), window);
    expect(window.fplManager.getWeekSnapshot(1).viceCaptain).toBe(p1.id);
    expect(window.fplManager.getWeekSnapshot(2).viceCaptain).toBe(p2.id);
  });

  test('should render initial week label as Week 1', async () => {
    const weekLabel = document.getElementById('week-label');
    expect(weekLabel).not.toBeNull();
    expect(weekLabel.textContent).toMatch(/Week\s+1/);
  });

  test('Create New Week sets current to new week and enables Prev', async () => {
    const createBtn = document.getElementById('create-week-btn');
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');
    const weekLabel = document.getElementById('week-label');

    userEvent.click(createBtn, window);

    expect(weekLabel.textContent).toMatch(/Week\s+2/);
    expect(prevBtn.disabled).toBe(false);
    // At last week, next should be disabled
    expect(nextBtn.disabled).toBe(true);

    // Read-only badge should be hidden on current editable week
    const roBadge = document.getElementById('week-readonly-badge');
    expect(roBadge.style.display === 'none' || roBadge.style.display === '').toBe(true);
  });

  test('Prev/Next navigate between weeks properly', async () => {
    const createBtn = document.getElementById('create-week-btn');
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');
    const weekLabel = document.getElementById('week-label');

    // Create up to week 3
    userEvent.click(createBtn, window); // -> week 2
    userEvent.click(createBtn, window); // -> week 3

    expect(weekLabel.textContent).toMatch(/Week\s+3/);
    expect(nextBtn.disabled).toBe(true);

    // Go to week 2
    userEvent.click(prevBtn, window);
    expect(weekLabel.textContent).toMatch(/Week\s+2/);
    expect(nextBtn.disabled).toBe(false);

    // Back to week 1
    userEvent.click(prevBtn, window);
    expect(weekLabel.textContent).toMatch(/Week\s+1/);
    expect(prevBtn.disabled).toBe(true);
  });

  test('Prev disabled on week 1 and Next disabled on last week', async () => {
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');
    const createBtn = document.getElementById('create-week-btn');

    // Initial: only week 1 exists
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);

    // Create week 2 -> now at week 2 (last week)
    userEvent.click(createBtn, window);
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(true);

    // Navigate back to week 1 -> not last week anymore
    userEvent.click(prevBtn, window);
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);
  });

  test('Creating new week snapshots teamMembers and teamStats', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');

    // Add Player A (have = true, price 10.0)
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Player A', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'AAA', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '10', window);
    userEvent.select(document.querySelector('[data-testid="player-status-select"]'), 'green', window);
    // mark have
    const haveCheckbox = document.querySelector('[data-testid="player-have-checkbox"]');
    haveCheckbox.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    // Add Player B (have = false, price 5.0)
    userEvent.click(addButton, window);
    userEvent.type(document.querySelector('[data-testid="player-name-input"]'), 'Player B', window);
    userEvent.select(document.querySelector('[data-testid="player-position-select"]'), 'forward', window);
    userEvent.type(document.querySelector('[data-testid="player-team-input"]'), 'BBB', window);
    userEvent.type(document.querySelector('[data-testid="player-price-input"]'), '5', window);
    userEvent.select(document.querySelector('[data-testid="player-status-select"]'), 'yellow', window);
    // mark have
    const haveCheckboxB = document.querySelector('[data-testid="player-have-checkbox"]');
    haveCheckboxB.checked = true;
    userEvent.submit(document.querySelector('#player-form'), window);

    // Get player references
    const pA = fplManager.players.find(p => p.name === 'Player A');
    const pB = fplManager.players.find(p => p.name === 'Player B');
    
    // Make sure both players are in the team
    pA.have = true;
    pB.have = true;
    
    // Save the updated players
    fplManager.saveToStorage(1, { 
      players: fplManager.players, 
      captain: null, 
      viceCaptain: null 
    }, 1);
    
    // Update display to reflect the changes
    fplManager.updateDisplay();
    
    // Now set captain and vice-captain
    fplManager.setCaptain(pA.id);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    fplManager.setViceCaptain(pB.id);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Verify the state before creating new week
    expect(fplManager.captain).toBe(pA.id);
    expect(fplManager.viceCaptain).toBe(pB.id);

    // Create new week
    userEvent.click(document.getElementById('create-week-btn'), window);

    const w1 = window.fplManager.getWeekSnapshot(1);
    const w2 = window.fplManager.getWeekSnapshot(2);

    // Week 1 should be read-only after creating week 2
    expect(window.fplManager.isWeekReadOnly(1)).toBe(true);
    expect(window.fplManager.isWeekReadOnly(2)).toBe(false);

    // teamMembers only include have=true players
    expect(Array.isArray(w1.teamMembers)).toBe(true);
    expect(Array.isArray(w2.teamMembers)).toBe(true);
    expect(w1.teamMembers.length).toBe(2);
    expect(w2.teamMembers.length).toBe(2);
    const w1Names = w1.teamMembers.map(p => p.name).sort();
    const w2Names = w2.teamMembers.map(p => p.name).sort();
    expect(w1Names).toEqual(['Player A', 'Player B']);
    expect(w2Names).toEqual(['Player A', 'Player B']);

    // teamStats reflects value and count
    expect(w1.teamStats.playerCount).toBe(2);
    expect(w2.teamStats.playerCount).toBe(2);
    expect(w1.teamStats.totalValue).toBe(15);
    expect(w2.teamStats.totalValue).toBe(15);

    // captain and vice are copied to new week
    expect(w1.captain).toBe(pA.id);
    expect(w2.captain).toBe(pA.id);
    expect(w1.viceCaptain).toBe(pB.id);
    expect(w2.viceCaptain).toBe(pB.id);
  });
});
