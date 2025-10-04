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
    // Add two players in week 1 using direct method calls
    await window.fplManager.addPlayer({
      name: 'P1',
      position: 'midfield',
      team: 'A',
      price: 6,
      have: true,
      status: '',
      notes: ''
    });

    await window.fplManager.addPlayer({
      name: 'P2',
      position: 'defence',
      team: 'B',
      price: 5,
      have: true,
      status: '',
      notes: ''
    });

    // Set captain/vice using direct methods for reliability
    const currentWeek = await window.fplManager.getCurrentWeekNumber();
    const currentWeekData = await window.fplManager.getWeekSnapshot(currentWeek);
    const p1 = currentWeekData.players.find(p => p.name === 'P1');
    const p2 = currentWeekData.players.find(p => p.name === 'P2');
    if (p1 && p2) {
      await window.fplManager.setCaptain(p1.id);
      await window.fplManager.setViceCaptain(p2.id);
    }

    // Create week 2
    userEvent.click(document.getElementById('create-week-btn'), window);
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Now modify week 2 slightly so totals change only for week 2
    if (p1) {
      await window.fplManager.updatePlayer(p1.id, { price: 7 }); // from 6 -> 7
    }

    // Wait for async save to settle
    await new Promise(resolve => setTimeout(resolve, 20));

    // Inspect storage - check both localStorage and storage adapter
    let raw = window.localStorage.getItem('fpl-team-data');
    if (!raw) {
      // Try getting from storage adapter directly
      raw = await window.fplManager.storage.getItem('fpl-team-data');
    }
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
    // Add one player in week 1 using direct method call
    await window.fplManager.addPlayer({
      name: 'R1',
      position: 'midfield',
      team: 'AA',
      price: 6,
      have: true,
      status: '',
      notes: ''
    });

    // Get player from current week data
    const currentWeek = await window.fplManager.getCurrentWeekNumber();
    const currentWeekData = await window.fplManager.getWeekSnapshot(currentWeek);
    const r1 = currentWeekData.players.find(p => p.name === 'R1');

    // Create week 2
    userEvent.click(document.getElementById('create-week-btn'), window);

    // Go back to week 1 and attempt to edit (should be blocked by UI in practice)
    userEvent.click(document.getElementById('prev-week-btn'), window);
    // Wait for async navigation to settle
    await new Promise(resolve => setTimeout(resolve, 30));
    
    // Attempt to update price while on week 1 (read-only) - should be blocked
    if (r1) {
      await window.fplManager.updatePlayer(r1.id, { price: 10 });
    }

    // Storage should still reflect original totals for week 1
    let raw = window.localStorage.getItem('fpl-team-data');
    if (!raw) {
      // Try getting from storage adapter directly
      raw = await window.fplManager.storage.getItem('fpl-team-data');
    }
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw);
    expect(data).toBeTruthy();
    expect(data.weeks).toBeTruthy();
    
    const w1 = data.weeks['1'] || data.weeks[1];
    const w2 = data.weeks['2'] || data.weeks[2];

    expect(w1.totalTeamCost).toBeCloseTo(6, 5);
    expect(w2.totalTeamCost).toBeCloseTo(6, 5); // unchanged since we didn't edit w2
  });
});
