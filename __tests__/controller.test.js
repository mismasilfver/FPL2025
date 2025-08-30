/**
 * @jest-environment jsdom
 */

// Import from script exports instead of eval
const { FPLTeamManager } = require('../script.js');

document.body.innerHTML = `
  <div id="players-table"></div>
  <div id="players-tbody"></div>
  <div id="empty-state"></div>
  <div id="week-label"></div>
  <div id="week-readonly-badge"></div>
`;

// script.js also initializes a real instance on DOMContentLoaded, which is okay in jsdom

// Helper to build a minimal mock UI with jest spies
function buildMockUI() {
  return {
    initElements: jest.fn(),
    bindEvents: jest.fn(),
    renderSummary: jest.fn(),
    renderCaptaincyInfo: jest.fn(),
    renderWeekControls: jest.fn(),
    renderPlayers: jest.fn(),
    openModal: jest.fn(),
    closeModal: jest.fn(),

    // inputs used by code paths
    addPlayerBtn: { disabled: false, addEventListener: jest.fn() },
    positionFilter: { value: 'all', addEventListener: jest.fn() },
    haveFilter: { checked: false, addEventListener: jest.fn() },
    playersTable: { parentElement: { style: {} } },
    playersTbody: { innerHTML: '', appendChild: jest.fn(), addEventListener: jest.fn() },
    emptyState: { style: {} },
    weekReadonlyBadge: { style: {} },
  };
}

function buildMockStorage() {
  return {
    migrateStorageIfNeeded: jest.fn(),
    loadFromStorage: jest.fn(() => ({ players: [], captain: null, viceCaptain: null, currentWeek: 1 })),
    saveToStorage: jest.fn(),
    getWeekCount: jest.fn(() => 1),
    getWeekSnapshot: jest.fn(() => ({ players: [], captain: null, viceCaptain: null })),
  };
}

describe('FPLTeamManager as a central controller (DI and delegation)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('accepts injected UIManager and StorageService, uses them on init', () => {
    const ui = buildMockUI();
    const storage = buildMockStorage();

    // Expect the constructor to accept an options object with ui and storage
    const manager = new FPLTeamManager({ ui, storage });

    expect(manager.ui).toBe(ui);
    expect(manager.storage).toBe(storage);

    // Should have called migrate + load via storage
    expect(storage.migrateStorageIfNeeded).toHaveBeenCalledTimes(1);
    expect(storage.loadFromStorage).toHaveBeenCalledTimes(1);

    // Should have initialized/bound the provided UI
    expect(ui.initElements).toHaveBeenCalledTimes(1);
    expect(ui.bindEvents).toHaveBeenCalledTimes(1);
  });

  test('saveStateToStorage delegates to StorageService.saveToStorage', () => {
    const ui = buildMockUI();
    const storage = buildMockStorage();
    const manager = new FPLTeamManager({ ui, storage });

    manager.players = [{ id: 'p1', name: 'A', position: 'midfield', team: 'AAA', price: 5.0, have: true }];
    manager.captain = 'p1';
    manager.viceCaptain = null;
    manager.currentWeek = 2;

    storage.saveToStorage.mockClear();
    manager.saveStateToStorage();

    expect(storage.saveToStorage).toHaveBeenCalledTimes(1);
    expect(storage.saveToStorage).toHaveBeenCalledWith(2, {
      players: manager.players,
      captain: 'p1',
      viceCaptain: null,
    }, 2);
  });

  test('updateDisplay delegates rendering to UIManager methods', () => {
    const ui = buildMockUI();
    const storage = buildMockStorage();
    const manager = new FPLTeamManager({ ui, storage });

    manager.players = [
      { id: '1', name: 'A', position: 'midfield', team: 'AAA', price: 5.0, have: true, notes: '' },
      { id: '2', name: 'B', position: 'forward', team: 'BBB', price: 6.0, have: false, notes: '' }
    ];
    manager.captain = '1';
    manager.viceCaptain = null;
    manager.currentWeek = 1;

    ui.renderSummary.mockClear();
    ui.renderCaptaincyInfo.mockClear();
    ui.renderWeekControls.mockClear();
    ui.renderPlayers.mockClear();

    manager.updateDisplay();

    expect(ui.renderSummary).toHaveBeenCalledWith(manager.players);
    expect(ui.renderCaptaincyInfo).toHaveBeenCalledWith(manager.players, '1', null);
    expect(ui.renderWeekControls).toHaveBeenCalledWith({ currentWeek: 1, totalWeeks: 1, isReadOnly: false });
    expect(ui.renderPlayers).toHaveBeenCalled();
  });
});
