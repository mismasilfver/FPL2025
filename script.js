// UI Manager to handle direct DOM interactions for the modal and form
class UIManager {
    constructor() {
        // Intentionally empty; call initElements() after DOM is ready
    }

    bindEvents(handlers = {}) {
        const {
            onAddPlayer,
            onModalClose,
            onFormSubmit,
            onPositionFilterChange,
            onHaveFilterChange,
            onPrevWeek,
            onNextWeek,
            onCreateWeek,
            onExportWeek,
            onEscapeKey,
            // Row-level handlers
            onToggleHave,
            onEdit,
            onDelete,
            onMakeCaptain,
            onMakeViceCaptain
        } = handlers;

        // Add player button
        this.addPlayerBtn?.addEventListener('click', () => onAddPlayer && onAddPlayer());

        // Modal close events
        this.closeBtn?.addEventListener('click', () => onModalClose && onModalClose());
        this.cancelBtn?.addEventListener('click', () => onModalClose && onModalClose());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal && onModalClose) onModalClose();
        });

        // Form submission
        this.playerForm?.addEventListener('submit', (e) => onFormSubmit && onFormSubmit(e));

        // Filters
        this.positionFilter?.addEventListener('change', () => onPositionFilterChange && onPositionFilterChange());
        this.haveFilter?.addEventListener('change', () => onHaveFilterChange && onHaveFilterChange());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && onEscapeKey) onEscapeKey(e);
        });

        // Week controls
        this.prevWeekBtn?.addEventListener('click', () => onPrevWeek && onPrevWeek());
        this.nextWeekBtn?.addEventListener('click', () => onNextWeek && onNextWeek());
        this.createWeekBtn?.addEventListener('click', () => onCreateWeek && onCreateWeek());
        this.exportWeekBtn?.addEventListener('click', () => onExportWeek && onExportWeek());

        // Delegated row events
        if (this.playersTbody) {
            this.playersTbody.addEventListener('click', (e) => {
                // Don't skip disabled elements - let the handler methods deal with read-only checks
                
                let actionEl = e.target.closest('[data-action]');
                let action = actionEl?.getAttribute('data-action') || '';
                let playerId = actionEl?.getAttribute('data-player-id') || '';
                
                // Always try data-testid fallback as primary method since tests use data-testid
                const testIdEl = e.target.closest('[data-testid]');
                if (testIdEl && this.playersTbody.contains(testIdEl)) {
                    const testId = testIdEl.getAttribute('data-testid') || '';
                    const m1 = testId.match(/^make-captain-(.+)$/);
                    const m2 = testId.match(/^make-vice-captain-(.+)$/);
                    const m3 = testId.match(/^(add-to-team|remove-from-team)-(.+)$/);
                    const m4 = testId.match(/^edit-player-(.+)$/);
                    const m5 = testId.match(/^delete-player-(.+)$/);
                    if (m1) { action = 'make-captain'; playerId = m1[1]; }
                    else if (m2) { action = 'make-vice'; playerId = m2[1]; }
                    else if (m3) { action = 'toggle-have'; playerId = m3[2]; }
                    else if (m4) { action = 'edit'; playerId = m4[1]; }
                    else if (m5) { action = 'delete'; playerId = m5[1]; }
                }
                
                if (!action || !playerId) return;
                
                switch (action) {
                    case 'toggle-have':
                        onToggleHave && onToggleHave(playerId);
                        break;
                    case 'edit':
                        onEdit && onEdit(playerId);
                        break;
                    case 'delete':
                        onDelete && onDelete(playerId);
                        break;
                    case 'make-captain':
                        onMakeCaptain && onMakeCaptain(playerId);
                        break;
                    case 'make-vice':
                        onMakeViceCaptain && onMakeViceCaptain(playerId);
                        break;
                    default:
                        break;
                }
            });
            // Delegated notes toggle
            this.playersTbody.addEventListener('click', (e) => {
                const notesCell = e.target.closest('.notes-cell');
                if (notesCell && this.playersTbody.contains(notesCell)) {
                    this.toggleNotesExpansion(notesCell);
                }
            });
        }
    }

    initElements() {
        // Main elements
        this.addPlayerBtn = document.querySelector('[data-testid="add-player-button"]');
        this.playersTable = document.getElementById('players-table');
        this.playersTbody = document.getElementById('players-tbody');
        this.emptyState = document.getElementById('empty-state');
        this.positionFilter = document.querySelector('[data-testid="position-filter-select"]');
        this.haveFilter = document.querySelector('[data-testid="have-filter-checkbox"]');

        // Week controls
        this.weekLabel = document.getElementById('week-label');
        this.weekReadonlyBadge = document.getElementById('week-readonly-badge');
        this.prevWeekBtn = document.getElementById('prev-week-btn');
        this.nextWeekBtn = document.getElementById('next-week-btn');
        this.createWeekBtn = document.getElementById('create-week-btn');
        this.exportWeekBtn = document.getElementById('export-week-btn');

        // Summary elements
        this.teamCount = document.getElementById('team-count');
        this.totalValue = document.getElementById('total-value');
        this.captainInfo = document.getElementById('captain-info');
        this.viceCaptainInfo = document.getElementById('vice-captain-info');

        // Modal elements
        this.modal = document.getElementById('player-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.playerForm = document.getElementById('player-form');
        this.closeBtn = document.querySelector('.close');
        this.cancelBtn = document.querySelector('[data-testid="cancel-button"]');

        // Form elements using data-testid
        this.playerName = document.querySelector('[data-testid="player-name-input"]');
        this.playerPosition = document.querySelector('[data-testid="player-position-select"]');
        this.playerTeam = document.querySelector('[data-testid="player-team-input"]');
        this.playerPrice = document.querySelector('[data-testid="player-price-input"]');
        this.playerStatus = document.querySelector('[data-testid="player-status-select"]');
        this.playerHave = document.querySelector('[data-testid="player-have-checkbox"]');
        this.playerNotes = document.querySelector('[data-testid="player-notes-textarea"]');

        // Templates
        this.playerRowTemplate = document.getElementById('player-row-template');
    }

    openModal(player = null) {
        if (player) {
            this.modalTitle.textContent = 'Edit Player';
            this.populateForm(player);
        } else {
            this.modalTitle.textContent = 'Add Player';
            this.clearForm();
        }

        this.modal.style.display = 'block';
        this.playerName?.focus();
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.clearForm();
    }

    populateForm(player) {
        this.playerName.value = player.name;
        this.playerPosition.value = player.position;
        this.playerTeam.value = player.team;
        this.playerPrice.value = player.price;
        this.playerStatus.value = player.status;
        this.playerHave.checked = player.have || false;
        this.playerNotes.value = player.notes || '';
    }

    clearForm() {
        this.playerForm.reset();
        this.playerStatus.value = '';
        this.playerHave.checked = false;
    }
}

// ===== UI rendering helpers (moved into UIManager) =====
UIManager.prototype.getStatusText = function(status) {
    const statusMap = { yellow: 'Maybe Good', green: 'Very Good', red: "Sell/Don't Buy" };
    return statusMap[status] || status;
};

UIManager.prototype.capitalizeFirst = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

UIManager.prototype.truncateText = function(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

UIManager.prototype.renderSummary = function(players) {
    const teamPlayers = (players || []).filter(p => p.have);
    const teamCount = teamPlayers.length;
    const totalValue = teamPlayers.reduce((sum, player) => sum + (Number(player.price) || 0), 0);
    if (this.teamCount) this.teamCount.textContent = `In Team: ${teamCount}/15`;
    if (this.totalValue) this.totalValue.textContent = `Total Value: £${totalValue.toFixed(1)}m`;
};

UIManager.prototype.renderCaptaincyInfo = function(players, captainId, viceCaptainId) {
    const captainPlayer = (players || []).find(p => p.id === captainId);
    const viceCaptainPlayer = (players || []).find(p => p.id === viceCaptainId);
    if (this.captainInfo) this.captainInfo.textContent = captainPlayer ? `Captain: ${captainPlayer.name}` : 'Captain: None selected';
    if (this.viceCaptainInfo) this.viceCaptainInfo.textContent = viceCaptainPlayer ? `Vice Captain: ${viceCaptainPlayer.name}` : 'Vice Captain: None selected';
};

UIManager.prototype.renderWeekControls = function({ currentWeek, totalWeeks, isReadOnly }) {
    if (this.weekLabel) this.weekLabel.textContent = `Week ${currentWeek}`;
    if (this.weekReadonlyBadge) this.weekReadonlyBadge.style.display = isReadOnly ? 'inline-block' : 'none';
    if (this.addPlayerBtn) this.addPlayerBtn.disabled = !!isReadOnly;
    if (this.prevWeekBtn) this.prevWeekBtn.disabled = currentWeek <= 1;
    if (this.nextWeekBtn) this.nextWeekBtn.disabled = currentWeek >= totalWeeks;
};

UIManager.prototype.createPlayerRow = function(player, { isReadOnly, captainId, viceCaptainId }) {
    const row = document.createElement('tr');
    const isCaptain = captainId === player.id;
    const isViceCaptain = viceCaptainId === player.id;
    row.innerHTML = `
            <td><strong>${player.name}</strong></td>
            <td>${this.capitalizeFirst(player.position)}</td>
            <td>${player.team}</td>
            <td>£${Number(player.price).toFixed(1)}m</td>
            <td style="text-align: center;">${player.status ? `<div class="status-circle status-${player.status}" title="${this.getStatusText(player.status)}"></div>` : ''}</td>
            <td style="text-align: center;" data-testid="have-cell-${player.id}">
                ${player.have ? 
                  `<span class="have-indicator" 
                        data-action="toggle-have" data-player-id="${player.id}"
                        style="${isReadOnly ? '' : 'cursor: pointer;'}" 
                        title="${isReadOnly ? 'Read-only week' : 'Click to remove from team'}"
                        data-testid="remove-from-team-${player.id}">✓</span>` : 
                  `<button class="btn btn-secondary" 
                          ${isReadOnly ? 'disabled' : ''}
                          data-action="toggle-have" data-player-id="${player.id}"
                          style="font-size: 10px; padding: 2px 6px;" 
                          title="${isReadOnly ? 'Read-only week' : 'Add to team'}"
                          data-testid="add-to-team-${player.id}">+</button>`}
            </td>
            <td data-testid="captain-cell-${player.id}">
                ${isCaptain ? 
                  `<span class="captain-badge" data-testid="captain-badge-${player.id}">C</span>` : 
                  `<button class="btn btn-secondary" 
                          ${isReadOnly ? 'disabled' : ''}
                          data-action="make-captain" data-player-id="${player.id}"
                          style="font-size: 10px; padding: 2px 6px;"
                          data-testid="make-captain-${player.id}">C</button>`}
            </td>
            <td data-testid="vice-captain-cell-${player.id}">
                ${isViceCaptain ? 
                  `<span class="vice-captain-badge" data-testid="vice-captain-badge-${player.id}">VC</span>` : 
                  `<button class="btn btn-secondary" 
                          ${isReadOnly ? 'disabled' : ''}
                          data-action="make-vice" data-player-id="${player.id}"
                          style="font-size: 10px; padding: 2px 6px;"
                          data-testid="make-vice-captain-${player.id}">VC</button>`}
            </td>
            <td class="notes-cell" 
                data-player-id="${player.id}" 
                data-full-notes="${player.notes || ''}" 
                title="Click to expand notes"
                data-testid="notes-cell-${player.id}">
                <span class="notes-text">${this.truncateText(player.notes || '', 20)}</span>
            </td>
            <td data-testid="actions-cell-${player.id}">
                <button class="btn btn-edit" 
                        ${isReadOnly ? 'disabled' : ''}
                        data-action="edit" data-player-id="${player.id}"
                        data-testid="edit-player-${player.id}">Edit</button>
                <button class="btn btn-danger" 
                        ${isReadOnly ? 'disabled' : ''}
                        data-action="delete" data-player-id="${player.id}"
                        data-testid="delete-player-${player.id}">Delete</button>
            </td>`;
    return row;
};

UIManager.prototype.buildRowFromTemplate = function(player, { isReadOnly, captainId, viceCaptainId }) {
    if (!this.playerRowTemplate) return this.createPlayerRow(player, { isReadOnly, captainId, viceCaptainId });
    const frag = this.playerRowTemplate.content.cloneNode(true);
    const row = frag.querySelector('tr.player-row');
    const isCaptain = captainId === player.id;
    const isViceCaptain = viceCaptainId === player.id;

    // Fill base columns
    const setText = (selector, text) => {
        const el = row.querySelector(selector);
        if (el) el.textContent = text;
    };
    setText('.col-name', player.name);
    setText('.col-position', this.capitalizeFirst(player.position));
    setText('.col-team', player.team);
    setText('.col-price', `£${Number(player.price).toFixed(1)}m`);

    // Status
    const statusCell = row.querySelector('.col-status');
    if (statusCell) {
        statusCell.innerHTML = player.status
            ? `<div class="status-circle status-${player.status}" title="${this.getStatusText(player.status)}"></div>`
            : '';
    }

    // Have
    const haveCell = row.querySelector('.col-have');
    if (haveCell) {
        haveCell.setAttribute('data-testid', `have-cell-${player.id}`);
        haveCell.innerHTML = player.have
            ? `<span class="have-indicator" data-action="toggle-have" data-player-id="${player.id}"
                    style="${isReadOnly ? '' : 'cursor: pointer;'}" 
                    title="${isReadOnly ? 'Read-only week' : 'Click to remove from team'}"
                    data-testid="remove-from-team-${player.id}">✓</span>`
            : `<button class="btn btn-secondary" ${isReadOnly ? 'disabled' : ''}
                      data-action="toggle-have" data-player-id="${player.id}"
                      style="font-size: 10px; padding: 2px 6px;" 
                      title="${isReadOnly ? 'Read-only week' : 'Add to team'}"
                      data-testid="add-to-team-${player.id}">+</button>`;
    }

    // Captain cell
    const capCell = row.querySelector('.col-captain');
    if (capCell) {
        capCell.setAttribute('data-testid', `captain-cell-${player.id}`);
        capCell.innerHTML = isCaptain
            ? `<span class="captain-badge" data-testid="captain-badge-${player.id}">C</span>`
            : `<button class="btn btn-secondary" ${isReadOnly ? 'disabled' : ''}
                      data-action="make-captain" data-player-id="${player.id}"
                      style="font-size: 10px; padding: 2px 6px;"
                      data-testid="make-captain-${player.id}">C</button>`;
    }

    // Vice cell
    const viceCell = row.querySelector('.col-vice');
    if (viceCell) {
        viceCell.setAttribute('data-testid', `vice-captain-cell-${player.id}`);
        viceCell.innerHTML = isViceCaptain
            ? `<span class="vice-captain-badge" data-testid="vice-captain-badge-${player.id}">VC</span>`
            : `<button class="btn btn-secondary" ${isReadOnly ? 'disabled' : ''}
                      data-action="make-vice" data-player-id="${player.id}"
                      style="font-size: 10px; padding: 2px 6px;"
                      data-testid="make-vice-captain-${player.id}">VC</button>`;
    }

    // Notes cell
    const notesCell = row.querySelector('.col-notes');
    if (notesCell) {
        notesCell.classList.add('notes-cell');
        notesCell.setAttribute('data-player-id', player.id);
        notesCell.setAttribute('data-full-notes', player.notes || '');
        notesCell.setAttribute('title', 'Click to expand notes');
        notesCell.setAttribute('data-testid', `notes-cell-${player.id}`);
        notesCell.innerHTML = `<span class="notes-text">${this.truncateText(player.notes || '', 20)}</span>`;
    }

    // Actions cell
    const actionsCell = row.querySelector('.col-actions');
    if (actionsCell) {
        actionsCell.setAttribute('data-testid', `actions-cell-${player.id}`);
        actionsCell.innerHTML = `
            <button class="btn btn-edit" ${isReadOnly ? 'disabled' : ''}
                    data-action="edit" data-player-id="${player.id}"
                    data-testid="edit-player-${player.id}">Edit</button>
            <button class="btn btn-danger" ${isReadOnly ? 'disabled' : ''}
                    data-action="delete" data-player-id="${player.id}"
                    data-testid="delete-player-${player.id}">Delete</button>
        `;
    }

    return row;
};

UIManager.prototype.renderPlayers = function(players, { isReadOnly, captainId, viceCaptainId }) {
    if (!players || players.length === 0) {
        if (this.emptyState) this.emptyState.style.display = 'block';
        if (this.playersTable?.parentElement) this.playersTable.parentElement.style.display = 'none';
        if (this.playersTbody) this.playersTbody.innerHTML = '';
        return;
    } else {
        if (this.emptyState) this.emptyState.style.display = 'none';
        if (this.playersTable?.parentElement) this.playersTable.parentElement.style.display = 'block';
    }
    if (this.playersTbody) this.playersTbody.innerHTML = '';
    (players || []).forEach(player => {
        const row = this.playerRowTemplate
            ? this.buildRowFromTemplate(player, { isReadOnly, captainId, viceCaptainId })
            : this.createPlayerRow(player, { isReadOnly, captainId, viceCaptainId });
        this.playersTbody.appendChild(row);
    });
};

UIManager.prototype.addNotesClickHandlers = function() {
    const notesCells = document.querySelectorAll('.notes-cell');
    notesCells.forEach(cell => {
        cell.addEventListener('click', (e) => {
            this.toggleNotesExpansion(e.target.closest('.notes-cell'));
        });
    });
};

UIManager.prototype.toggleNotesExpansion = function(cell) {
    if (!cell) return;
    const notesText = cell.querySelector('.notes-text');
    const fullNotes = cell.getAttribute('data-full-notes');
    const isExpanded = cell.classList.contains('expanded');
    if (!notesText) return;
    if (isExpanded) {
        notesText.textContent = this.truncateText(fullNotes || '', 20);
        cell.classList.remove('expanded');
        cell.title = 'Click to expand notes';
    } else {
        notesText.textContent = fullNotes || 'No notes';
        cell.classList.add('expanded');
        cell.title = 'Click to collapse notes';
    }
};

// ===== Storage Service to handle localStorage interactions =====
class StorageService {
    constructor(storageKey = 'fpl-team-data') {
        this.storageKey = storageKey;
    }

    // Phase 1: Check if old data exists and migrate it to the new weekly format.
    migrateStorageIfNeeded() {
        const oldDataKey = 'fpl-team';
        const oldData = localStorage.getItem(oldDataKey);
        const newData = localStorage.getItem(this.storageKey);

        if (oldData && !newData) {
            try {
                const parsedOldData = JSON.parse(oldData);
                if (parsedOldData && parsedOldData.players) {
                    const initialWeekData = {
                        players: parsedOldData.players || [],
                        captain: parsedOldData.captain || null,
                        viceCaptain: parsedOldData.viceCaptain || null,
                    };

                    const newStructure = {
                        weeks: { 1: initialWeekData },
                        currentWeek: 1,
                        version: '2.0'
                    };

                    localStorage.setItem(this.storageKey, JSON.stringify(newStructure));
                    // Optionally, remove the old key after successful migration
                    // localStorage.removeItem(oldDataKey);
                    console.log('Successfully migrated old data to new weekly format.');
                }
            } catch (error) {
                console.error('Error migrating old data:', error);
            }
        }
    }

    loadFromStorage() {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (data && data.weeks) {
                    const currentWeek = data.currentWeek || 1;
                    const weekData = data.weeks[currentWeek] || data.weeks[1] || {};
                    return {
                        players: weekData.players || [],
                        captain: weekData.captain || null,
                        viceCaptain: weekData.viceCaptain || null,
                        currentWeek: currentWeek
                    };
                } else if (data) { // Backward compatibility, though migration should handle this
                    return {
                        players: data.players || [],
                        captain: data.captain || null,
                        viceCaptain: data.viceCaptain || null,
                        currentWeek: 1
                    };
                }
            } catch (error) {
                console.error('Error loading data from storage:', error);
            }
        }
        return { players: [], captain: null, viceCaptain: null, currentWeek: 1 }; // Default state
    }

    saveToStorage(weekToSave, { players, captain, viceCaptain }, currentWeek) {
        const existingRaw = localStorage.getItem(this.storageKey);
        let root = { weeks: {}, version: '2.0' };
        if (existingRaw) {
            try {
                const parsed = JSON.parse(existingRaw);
                if (parsed && parsed.weeks) root = parsed;
            } catch (e) { /* ignore malformed data */ }
        }

        root.weeks[weekToSave] = root.weeks[weekToSave] || {};
        root.weeks[weekToSave].players = players;
        root.weeks[weekToSave].captain = captain;
        root.weeks[weekToSave].viceCaptain = viceCaptain;

        const teamMembers = players.filter(p => p.have).map(p => ({
            playerId: p.id, name: p.name, position: p.position, team: p.team, price: p.price,
        }));
        root.weeks[weekToSave].teamMembers = teamMembers;
        root.weeks[weekToSave].teamStats = {
            totalValue: teamMembers.reduce((s, p) => s + (Number(p.price) || 0), 0),
            playerCount: teamMembers.length,
            updatedDate: new Date().toISOString()
        };

        root.currentWeek = currentWeek;
        localStorage.setItem(this.storageKey, JSON.stringify(root));
    }

    getWeekCount() {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (data && data.weeks) {
                    return Object.keys(data.weeks).length;
                }
            } catch (e) { return 1; }
        }
        return 1;
    }

    getWeekSnapshot(weekNumber) {
        const savedData = localStorage.getItem(this.storageKey);
        if (!savedData) return null;
        try {
            const data = JSON.parse(savedData);
            return data.weeks ? data.weeks[weekNumber] : null;
        } catch (e) {
            return null;
        }
    }
}

// Expose StorageService globally for tests that eval the script
if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
if (typeof global !== 'undefined') {
    global.StorageService = StorageService;
}

// Fantasy Premier League Team Manager
class FPLTeamManager {
    constructor({ ui, storage } = {}) {
        this.players = [];
        this.currentEditingId = null;
        this.captain = null;
        this.viceCaptain = null;
        this.currentWeek = 1;
        this.ui = ui || new UIManager();
        this.storage = storage || new StorageService(); // Use the new storage service
        
        this.initializeElements();
        // Phase 1: migrate storage (if needed) before loading
        this.storage.migrateStorageIfNeeded();
        this.loadStateFromStorage();
        this.bindEvents();
        this.updateDisplay();
    }
    
    initializeElements() {
        // Delegate to UI layer
        this.ui.initElements();
        // Maintain backward references for minimal change (will be removed later)
        this.addPlayerBtn = this.ui.addPlayerBtn;
        this.playersTable = this.ui.playersTable;
        this.playersTbody = this.ui.playersTbody;
        this.emptyState = this.ui.emptyState;
        this.positionFilter = this.ui.positionFilter;
        this.haveFilter = this.ui.haveFilter;
        this.weekLabel = this.ui.weekLabel;
        this.weekReadonlyBadge = this.ui.weekReadonlyBadge;
        this.prevWeekBtn = this.ui.prevWeekBtn;
        this.nextWeekBtn = this.ui.nextWeekBtn;
        this.createWeekBtn = this.ui.createWeekBtn;
        this.exportWeekBtn = this.ui.exportWeekBtn;
        this.teamCount = this.ui.teamCount;
        this.totalValue = this.ui.totalValue;
        this.captainInfo = this.ui.captainInfo;
        this.viceCaptainInfo = this.ui.viceCaptainInfo;
        this.modal = this.ui.modal;
        this.modalTitle = this.ui.modalTitle;
        this.playerForm = this.ui.playerForm;
        this.closeBtn = this.ui.closeBtn;
        this.cancelBtn = this.ui.cancelBtn;
        this.playerName = this.ui.playerName;
        this.playerPosition = this.ui.playerPosition;
        this.playerTeam = this.ui.playerTeam;
        this.playerPrice = this.ui.playerPrice;
        this.playerStatus = this.ui.playerStatus;
        this.playerHave = this.ui.playerHave;
        this.playerNotes = this.ui.playerNotes;
    }
    
    bindEvents() {
        this.ui.bindEvents({
            onAddPlayer: this.openModal.bind(this),
            onModalClose: this.closeModal.bind(this),
            onFormSubmit: this.handleFormSubmit.bind(this),
            onPositionFilterChange: this.updateDisplay.bind(this),
            onHaveFilterChange: this.updateDisplay.bind(this),
            onEscapeKey: () => this.closeModal(),
            onPrevWeek: this.prevWeek.bind(this),
            onNextWeek: this.nextWeek.bind(this),
            onCreateWeek: this.createNewWeek.bind(this),
            onExportWeek: this.exportWeekData.bind(this),
            // Row-level handlers
            onToggleHave: (id) => this.toggleHave(id),
            onEdit: (id) => this.openModal(id),
            onDelete: (id) => this.deletePlayer(id),
            onMakeCaptain: (id) => this.setCaptain(id),
            onMakeViceCaptain: (id) => this.setViceCaptain(id),
        });
    }
    
    openModal(playerId = null) {
        if (this._isReadOnlyCurrentWeek()) {
            alert('This week is read-only. Create a new week to make changes.');
            return;
        }
        this.currentEditingId = playerId;
        const player = playerId ? this.players.find(p => p.id === playerId) : null;
        this.ui.openModal(player || null);
    }
    
    closeModal() {
        this.currentEditingId = null;
        this.ui.closeModal();
    }
    
    handleFormSubmit(e) {
        e.preventDefault();
        
        // Check form validity first
        if (!this.ui.playerForm.checkValidity()) {
            this.ui.playerForm.reportValidity();
            return;
        }
        
        const playerData = {
            name: this.ui.playerName.value.trim(),
            position: this.ui.playerPosition.value,
            team: this.ui.playerTeam.value.trim(),
            price: parseFloat(this.ui.playerPrice.value),
            status: this.ui.playerStatus.value || '', // Save empty string if no status selected
            have: this.ui.playerHave.checked,
            notes: this.ui.playerNotes.value.trim()
        };
        
        // Check 15 player limit for 'have' status
        if (playerData.have && !this.currentEditingId) {
            const currentTeamSize = this.players.filter(p => p.have).length;
            if (currentTeamSize >= 15) {
                alert('You can only have 15 players in your team. Please remove a player first.');
                return;
            }
        } else if (playerData.have && this.currentEditingId) {
            const currentPlayer = this.players.find(p => p.id === this.currentEditingId);
            const otherTeamPlayers = this.players.filter(p => p.have && p.id !== this.currentEditingId).length;
            if (!currentPlayer.have && otherTeamPlayers >= 15) {
                alert('You can only have 15 players in your team. Please remove a player first.');
                return;
            }
        }
        
        if (this.currentEditingId) {
            this.updatePlayer(this.currentEditingId, playerData);
        } else {
            this.addPlayer(playerData);
        }
        
        this.closeModal();
    }
    
    addPlayer(playerData) {
        if (this._isReadOnlyCurrentWeek()) {
            alert('This week is read-only. Create a new week to add players.');
            return;
        }
        const player = {
            id: Date.now().toString(),
            ...playerData,
            status: playerData.status || ''
        };
        
        this.players.push(player);
        this.saveStateToStorage();
        this.updateDisplay();
    }
    
    updatePlayer(playerId, playerData) {
        if (this._isReadOnlyCurrentWeek()) {
            alert('This week is read-only. Create a new week to edit players.');
            return;
        }
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            this.players[playerIndex] = { ...this.players[playerIndex], ...playerData };
            this.saveStateToStorage();
            this.updateDisplay();
        }
    }
    
    deletePlayer(playerId) {
        if (this._isReadOnlyCurrentWeek()) {
            alert('This week is read-only. Create a new week to delete players.');
            return;
        }
        if (confirm('Are you sure you want to delete this player?')) {
            // Remove from captain/vice captain if applicable
            if (this.captain === playerId) {
            this.captain = null;
        }
            if (this.viceCaptain === playerId) this.viceCaptain = null;
            
            this.players = this.players.filter(p => p.id !== playerId);
            this.saveStateToStorage();
            this.updateDisplay();
        }
    }
    
    setCaptain(playerId) {
        if (this._isReadOnlyCurrentWeek()) {
            alert('This week is read-only. Create a new week to change captain.');
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.have) {
            alert('Only players in your team can be selected as captain.');
            return;
        }
        if (this.captain === playerId) {
            this.captain = null; // Unset captain
        } else {
            this.captain = playerId;
            // If the new captain was the vice-captain, unset the vice-captain
            if (this.viceCaptain === playerId) {
                this.viceCaptain = null;
            }
        }
        
        this.saveStateToStorage();
        this.updateDisplay();
    }
    
    setViceCaptain(playerId) {
        if (this._isReadOnlyCurrentWeek()) {
            alert('This week is read-only. Create a new week to change vice captain.');
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.have) {
            alert('Only players in your team can be selected as vice-captain.');
            return;
        }
        if (this.viceCaptain === playerId) {
            this.viceCaptain = null; // Unset vice-captain
        } else {
            this.viceCaptain = playerId;
            // If the new vice-captain was the captain, unset the captain
            if (this.captain === playerId) {
                this.captain = null;
            }
        }
        
        this.saveStateToStorage();
        this.updateDisplay();
    }
    
    toggleHave(playerId) {
        if (this._isReadOnlyCurrentWeek()) {
            alert('This week is read-only. Create a new week to change team membership.');
            return;
        }
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        if (player.have) {
            // Remove from team
            player.have = false;
        } else {
            // Add to team - check 15 player limit
            const currentTeamSize = this.players.filter(p => p.have).length;
            if (currentTeamSize >= 15) {
                alert('You can only have 15 players in your team. Please remove a player first.');
                return;
            }
            player.have = true;
        }
        
        this.saveStateToStorage();
        this.updateDisplay();
    }
    
    getFilteredPlayers() {
        let filteredPlayers = this.players;
        
        // Filter by position
        const positionFilterValue = this.positionFilter.value;
        if (positionFilterValue !== 'all') {
            filteredPlayers = filteredPlayers.filter(player => player.position === positionFilterValue);
        }
        
        // Filter by "Have" status
        const haveFilterChecked = this.haveFilter.checked;
        if (haveFilterChecked) {
            filteredPlayers = filteredPlayers.filter(player => player.have === true);
        }
        
        return filteredPlayers;
    }
    
    updateDisplay() {
        const filteredPlayers = this.getFilteredPlayers();
        const isReadOnly = this._isReadOnlyCurrentWeek();
        const totalWeeks = this.getWeekCount();

        // Summary and captaincy
        this.ui.renderSummary(this.players);
        this.ui.renderCaptaincyInfo(this.players, this.captain, this.viceCaptain);

        // Week controls
        this.ui.renderWeekControls({ currentWeek: this.currentWeek, totalWeeks, isReadOnly });

        // Players table
        this.ui.renderPlayers(filteredPlayers, { isReadOnly, captainId: this.captain, viceCaptainId: this.viceCaptain });

        // Notes interactions handled via delegated listener in UIManager
    }
    
    saveStateToStorage() {
        this.storage.saveToStorage(
            this.currentWeek,
            {
                players: this.players,
                captain: this.captain,
                viceCaptain: this.viceCaptain
            },
            this.currentWeek
        );
    }
    
    // Backward-compatibility: tests may still call this method directly
    saveToStorage(weekToSave, { players, captain, viceCaptain }, currentWeek) {
        this.storage.saveToStorage(weekToSave, { players, captain, viceCaptain }, currentWeek);
    }
    
    loadStateFromStorage() {
        const data = this.storage.loadFromStorage();
        this.players = data.players;
        this.captain = data.captain;
        this.viceCaptain = data.viceCaptain;
        this.currentWeek = data.currentWeek;
    }

    // ===== Week Navigation (Phase 2) =====

    getWeekCount() {
        return this.storage.getWeekCount();
    }

    _isReadOnlyCurrentWeek() {
        const totalWeeks = this.getWeekCount();
        return this.currentWeek < totalWeeks;
    }

    getWeekSnapshot(weekNumber) {
        return this.storage.getWeekSnapshot(weekNumber);
    }

    createNewWeek() {
        const lastWeekNumber = this.currentWeek;
        // 1. Save the final state of the current week before creating a new one.
        this.saveStateToStorage();

        const lastWeekData = this.storage.getWeekSnapshot(lastWeekNumber);

        // 2. Increment week count and set as current.
        this.currentWeek = lastWeekNumber + 1;

        // 3. New week inherits players, captain, and vice-captain from the last week.
        this.players = lastWeekData ? JSON.parse(JSON.stringify(lastWeekData.players || [])) : [];
        this.captain = lastWeekData ? lastWeekData.captain : null;
        this.viceCaptain = lastWeekData ? lastWeekData.viceCaptain : null;

        // 4. Save the new week's initial state.
        this.saveStateToStorage();

        // 5. Update UI to reflect the new week.
        this.updateDisplay();
    }

    getWeekCount() {
        return this.storage.getWeekCount();
    }

    _isReadOnlyCurrentWeek() {
        return this.currentWeek < this.storage.getWeekCount();
    }

    // Test helper to get a clean snapshot from storage
    getWeekSnapshot(weekNumber) {
        return this.storage.getWeekSnapshot(weekNumber);
    }

    getPlayerSnapshot(weekNumber, playerId) {
        const week = this.getWeekSnapshot(weekNumber);
        return week && week.players ? week.players.find(p => p.id === playerId) : null;
    }

    goToWeek(weekNumber) {
        const totalWeeks = this.storage.getWeekCount();
        if (weekNumber >= 1 && weekNumber <= totalWeeks) {
            this.currentWeek = weekNumber;
            this.loadStateFromStorage(); // Reloads state for the target week
            this.updateDisplay();
        }
    }

    prevWeek() {
        this.goToWeek(this.currentWeek - 1);
    }

    nextWeek() {
        this.goToWeek(this.currentWeek + 1);
    }

    // ===== Storage & Migration (Phase 1) =====

    migrateStorageIfNeeded() {
        const savedData = localStorage.getItem('fpl-team-data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                // If data exists but is not in weekly format, migrate it
                if (data && !data.weeks) {
                    const migratedData = {
                        version: '2.0',
                        currentWeek: 1,
                        weeks: {
                            1: {
                                players: data.players || [],
                                captain: data.captain || null,
                                viceCaptain: data.viceCaptain || null,
                                teamMembers: (data.players || []).filter(p => p.have).map(p => ({ playerId: p.id, name: p.name, position: p.position, team: p.team, price: p.price })),
                                teamStats: {
                                    totalValue: (data.players || []).filter(p => p.have).reduce((s, p) => s + (Number(p.price) || 0), 0),
                                    playerCount: (data.players || []).filter(p => p.have).length,
                                    updatedDate: new Date().toISOString()
                                }
                            }
                        }
                    };
                    localStorage.setItem('fpl-team-data', JSON.stringify(migratedData));
                }
            } catch (e) {
                console.error('Failed to parse or migrate data:', e);
                localStorage.removeItem('fpl-team-data'); // Clear corrupted data
            }
        }
    }

    exportWeekData() {
        const dataToExport = {
            week: this.currentWeek,
            players: this.players,
            captain: this.captain,
            viceCaptain: this.viceCaptain,
        };

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `fpl_week_${this.currentWeek}_data.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fplManager = new FPLTeamManager();
    // Expose week navigation helpers for Phase 2 (UI will come in Phase 3)
    window.fplManagerCreateNewWeek = () => window.fplManager.createNewWeek();
    window.fplManagerGoToWeek = (n) => window.fplManager.goToWeek(n);
    window.fplManagerNextWeek = () => window.fplManager.nextWeek();
    window.fplManagerPrevWeek = () => window.fplManager.prevWeek();
});

// Conditionally export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FPLTeamManager, StorageService };
}

// Load CSV data as initial players
document.addEventListener('DOMContentLoaded', () => {
    // Seed CSV data ONLY if there is no existing data
    setTimeout(() => {
        if (window.fplManager) {
            const existing = localStorage.getItem('fpl-team-data');
            if (existing) return; // Do not overwrite user data

            // CSV data parsed from 2025-Table 1.csv
            const csvPlayers = [
                {name: 'Areola', position: 'goalkeeper', team: 'WHU', price: 4.5, have: true, notes: ''},
                {name: 'Kelleher', position: 'goalkeeper', team: 'BRE', price: 4.5, have: false, notes: 'first six home fixtures are incredibly tough'},
                {name: 'Petrovic', position: 'goalkeeper', team: 'BOU', price: 4.5, have: false, notes: 'Over Gameweeks 2-7, FOUR of Bournemouth\'s six fixtures are at home, with Wolverhampton Wanderers, Brighton & Hove Albion, Newcastle and Fulham the visitors.'},
                {name: 'Dubravka', position: 'goalkeeper', team: 'BUR', price: 4, have: true, notes: 'Dubravka could offer exceptional value due to his huge potential for save points, at the very least. It\'s a similar situation to Dubravka - Sunderland\'s loan signing from Chelsea is there to essentially sit on your bench and at least offers the security of starts if he is called upon.'},
                {name: 'Matz Sels', position: 'goalkeeper', team: 'NFO', price: 5, have: false, notes: 'favourable early schedule. favourable early schedule'},
                {name: 'Sanchez', position: 'goalkeeper', team: 'CHE', price: 5, have: false, notes: 'favourable early schedule'},
                {name: 'Pickford', position: 'goalkeeper', team: 'EVE', price: 5.5, have: false, notes: 'best last season'},
                {name: 'Esteve', position: 'defence', team: 'BUR', price: 4, have: false, notes: 'for bench'},
                {name: 'Rodon', position: 'defence', team: 'LEE', price: 4, have: false, notes: 'defensive contribution points this season boosts centre-backs playing for promoted clubs, such as Leeds United\'s Rodon. eing a centre-back for a newly-promoted club, he carries obvious DC points potential. Opponents Everton struggled for goals last season, too.'},
                {name: 'Seelt', position: 'defence', team: 'SUN', price: 4, have: false, notes: ''},
                {name: 'van de Ven', position: 'defence', team: 'TOT', price: 4.5, have: true, notes: 'Easy games to begin with At present, centre-back Micky van de Ven (£4.5m) is the most secure of them, although one of Destiny Udogie or Djed Spence (both £4.5m) is expected to claim the left-back berth.'},
                {name: 'Wan-Bissaka', position: 'defence', team: 'WHU', price: 4.5, have: true, notes: 'His form under Graham Potter last season shows just why. The right wing-back supplied five assists after Potter was appointed head coach in Gameweek 20, more than any other defender in Fantasy.'},
                {name: 'El Hadji Malick Diouf', position: 'defence', team: 'WHU', price: 4.5, have: false, notes: 'Alternative to Wan Bissaka major attacking potential from his role as a left wing-back.'},
                {name: 'Konsa', position: 'defence', team: 'AVL', price: 4.5, have: false, notes: 'Historically, however, the centre-back has offered very little threat going forward. With just 11 attacking returns over his six seasons at Villa, Konsa\'s backers may have to solely rely on clean sheets.'},
                {name: 'Neco Williams', position: 'defence', team: 'NFO', price: 5, have: true, notes: 'full back. favourable early schedule'},
                {name: 'Ola Aina', position: 'defence', team: 'NFO', price: 5, have: false, notes: 'full back. favourable early schedule'},
                {name: 'Milenkovic', position: 'defence', team: 'NFO', price: 5.5, have: true, notes: 'maybe worht the extra Milenkovic clearly carries the main goal threat of the two. His five goals and 27 shots in the box were both more than TWICE Murillo\'s respective totals of two and 13. Milenkovic\'s far superior goal threat gives him the edge, and his ownership of only eight per cent makes him a great differential. favourable early schedule'},
                {name: 'Murillo', position: 'defence', team: 'NFO', price: 5.5, have: false, notes: 'maybe worht the extra Yet the latter is far more likely to produce defensive contribution points; Murillo would have tallied 38 of them last season, compared with the 26 of Milenkovic.'},
                {name: 'Palhinha', position: 'defence', team: 'TOT', price: 5.5, have: false, notes: 'defensive midfielder'},
                {name: 'Romero\'s', position: 'defence', team: 'TOT', price: 5, have: false, notes: 'aerial ability at set-pieces,'},
                {name: 'Porro', position: 'defence', team: 'TOT', price: 5.5, have: false, notes: 'all-round threat of any Spurs defender attacking beasts'},
                {name: 'Tarkowski', position: 'defence', team: 'EVE', price: 5.5, have: false, notes: ''},
                {name: 'Cucurella', position: 'defence', team: 'CHE', price: 6, have: true, notes: 'favourable early schedule'},
                {name: 'Gvardiol', position: 'defence', team: 'MCI', price: 6, have: false, notes: 'are among the premium defenders with strong early-to-mid-term schedules.'},
                {name: 'Ait Nouri', position: 'defence', team: 'MCI', price: 6, have: false, notes: 'are among the premium defenders with strong early-to-mid-term schedules. . The Algerian delivered 11 attacking returns last season – more than any defender – and now looks set to occupy the left-back berth, with Gvardiol taking up a centre-back role.'},
                {name: 'Chalobah', position: 'defence', team: 'CHE', price: 5, have: false, notes: 'markedly cheaper if you\'re seeking out value early on. favourable early schedule'},
                {name: 'Colwill', position: 'defence', team: 'CHE', price: 5, have: false, notes: 'markedly cheaper if you\'re seeking out value early on. favourable early schedule'},
                {name: 'van Dij', position: 'defence', team: 'LIV', price: 6, have: false, notes: ''},
                {name: 'Gabriel', position: 'defence', team: 'ARS', price: 6, have: false, notes: 'tough early runs of opponents.'},
                {name: 'Munoz', position: 'defence', team: 'CRY', price: 5.5, have: false, notes: 'tough early runs of opponents. attacking beasts'},
                {name: 'Hall', position: 'defence', team: 'NEW', price: 5.5, have: false, notes: 'But as a left-back choice for your FPL squads after the opening few games, he could be a really good pick. tough early runs of opponents.'},
                {name: 'De Cuyper', position: 'defence', team: 'BHA', price: 4.5, have: false, notes: 'Brighton & Hove Albion\'s new left-back has the attacking potential to be a fixture-proof asset in Fantasy. not favorable schedule'},
                {name: 'Johnson', position: 'defence', team: '', price: 7, have: false, notes: ''},
                {name: 'Caicedo', position: 'midfield', team: 'CHE', price: 5.5, have: false, notes: 'would have been the top-scoring midfielder for this metric last season. favourable early schedule'},
                {name: 'Dewsbury-Hall', position: 'midfield', team: 'EVE', price: 5, have: false, notes: 'Dewsbury-Hall looks set to become a regular for David Moyes\' side following his move from Chelsea. He could be handed a No 10 role in a 4-2-3-1 formation and will now contend with Dwight McNeil (£6.0m) for set-piece duties. favourable early schedule'},
                {name: 'Sarr', position: 'midfield', team: 'TOT', price: 6.5, have: false, notes: 'Sarr, meanwhile, has been Spurs\' form player over the summer under new head coach Thomas Frank. The Senegalese has scored three goals while playing as a No 10 and could now start the season in that position, with James Maddison (£7.0m) ruled out for an extended period after he ruptured his Anterior Cruciate Ligament (ACL). favourable early schedule'},
                {name: 'Kudus', position: 'midfield', team: 'TOT', price: 6.5, have: true, notes: 'Kudus is likely to play on Spurs\' right flank after signing from West Ham United over the summer, while Ndiaye is expected to continue as Everton\'s first-choice penalty-taker. favourable early schedule'},
                {name: 'Ndiaye', position: 'midfield', team: 'EVE', price: 6.5, have: false, notes: 'expected to continue as Everton\'s first-choice penalty-taker.'},
                {name: 'Malen', position: 'midfield', team: 'AVL', price: 5.5, have: true, notes: 'favourable early schedule'},
                {name: 'Wilson', position: 'midfield', team: 'FUL', price: 5.5, have: false, notes: ''},
                {name: 'Amad', position: 'midfield', team: 'MNU', price: 6.5, have: false, notes: 'A cost of just £6.5m looks great value as a route into the Manchester United attack, with eight goals and eight assists underlining Amad\'s all-round potential.'},
                {name: 'Fernandez', position: 'midfield', team: 'CHE', price: 6.5, have: false, notes: 'favourable early schedule'},
                {name: 'Anderson', position: 'midfield', team: 'NFO', price: 5.5, have: true, notes: 'defensive points. favourable early schedule'},
                {name: 'Palhinha', position: 'midfield', team: 'TOT', price: 5.5, have: false, notes: 'favourable early schedule'},
                {name: 'Rodri', position: 'midfield', team: 'MCI', price: 6.5, have: false, notes: 'defensive points, NON STARTER'},
                {name: 'Baleba', position: 'midfield', team: 'BHA', price: 5, have: false, notes: 'registered four attacking returns. He would also have returned 30 defensive contribution points.'},
                {name: 'Wharton', position: 'midfield', team: 'CRY', price: 5, have: false, notes: ''},
                {name: 'Salah\'s', position: 'midfield', team: 'LIV', price: 14.5, have: true, notes: ''},
                {name: 'Wirtz', position: 'midfield', team: 'LIV', price: 8.5, have: true, notes: 'outperformed Salah over Liverpool\'s summer friendlies so far.'},
                {name: 'Gakpo', position: 'midfield', team: 'LIV', price: 7.5, have: false, notes: 'outperformed Salah over Liverpool\'s summer friendlies so far.'},
                {name: 'Palmer', position: 'midfield', team: 'CHE', price: 10.5, have: false, notes: 'Crucially, Palmer offers a great armband alternative to Salah in Gameweeks 2-3, in particular. favourable early schedule'},
                {name: 'Marmoush', position: 'midfield', team: 'LIV', price: 8.5, have: false, notes: 'Meanwhile, Omar Marmoush (£8.5m) offers you a significant saving of £5.5m over Erling Haaland (£14.0m) as a route into Manchester City attack. We think it would be worth waiting to see if he becomes a regular before adding him to your teams. differential'},
                {name: 'Saka', position: 'midfield', team: 'ARS', price: 10, have: false, notes: 'Arsenal\'s Bukayo Saka (£10.0m) and Manchester United\'s Bruno Fernandes (£9.0m) could struggle to justify their hefty price tags in the early stages as they have far tougher schedules.'},
                {name: 'Fernandes', position: 'midfield', team: 'MUN', price: 9, have: false, notes: 'Arsenal\'s Bukayo Saka (£10.0m) and Manchester United\'s Bruno Fernandes (£9.0m) could struggle to justify their hefty price tags in the early stages as they have far tougher schedules. Fernandes, nonetheless, boasts the superior form of the two over pre-season, with three goals and an assist to his name.'},
                {name: 'Eze', position: 'midfield', team: 'CRY', price: 7.5, have: false, notes: 'among the best options in the sub-£8.0m bracket but he does have a somewhat mixed run of opponents. not favorable schedule'},
                {name: 'Kluivert', position: 'midfield', team: 'BOU', price: 7, have: false, notes: 'favourable early schedule'},
                {name: 'Semenyo', position: 'midfield', team: 'BOU', price: 7, have: false, notes: 'favourable early schedule'},
                {name: 'Rogers', position: 'midfield', team: 'AVL', price: 7, have: false, notes: ''},
                {name: 'Malen', position: 'midfield', team: 'AVL', price: 5.5, have: false, notes: 'better value'},
                {name: 'Reijnders', position: 'midfield', team: 'MCI', price: 5.5, have: false, notes: 'His two goals against Palermo in Manchester City\'s final pre-season match suggest the Dutchman can offer outstanding value in his debut Fantasy campaign.'},
                {name: 'MITOMA', position: 'midfield', team: 'BHA', price: 6.5, have: false, notes: 'perhaps the most sensible medium-term Brighton midfield option.'},
                {name: 'DAMSGAARD', position: 'midfield', team: 'BRE', price: 6, have: false, notes: 'pretty secure for starts'},
                {name: 'Rice', position: 'midfield', team: 'ARS', price: 6.5, have: false, notes: 'meh'},
                {name: 'Cherki', position: 'midfield', team: 'MCI', price: 6.5, have: false, notes: 'As well as that, the addition of Rayan Cherki (£6.5m) might impact the minutes Marmoush gets. He\'s also sitting on a higher price than any of the other Manchester City midfield options.'},
                {name: 'Guiu', position: 'forward', team: 'SUN', price: 4.5, have: false, notes: 'starting the season with a 3-5-2 formation is gaining momentum.'},
                {name: 'Isak', position: 'forward', team: 'NEW', price: 10.5, have: false, notes: 'Isak didn\'t feature over pre-season for the Magpies, with reports linking with a move to Liverpool.'},
                {name: 'Fullkrug', position: 'forward', team: 'WHU', price: 6, have: false, notes: 'The German claimed three goals, scoring once in each of the Hammers\' final three friendlies. With an ownership currently under 4.0%, Fullkrug looks like a decent alternative for those Fantasy managers who can\'t afford Bowen, who has been re-classified from a midfielder to a forward this season.'},
                {name: 'Bowen', position: 'forward', team: 'WHU', price: 8, have: true, notes: 'Fullkrug offers a £2.0m saving over his team-mate Jarrod Bowen (£8.0m), who has been re-classified from a midfielder to a forward this season.'},
                {name: 'Thiago', position: 'forward', team: 'BRE', price: 6, have: false, notes: ''},
                {name: 'Strand Larsen', position: 'forward', team: 'WOF', price: 6.5, have: false, notes: 'The Norwegian will now be Wolverhampton Wanderers\' No 1 penalty-taker following Matheus Cunha\'s (£8.0m) move to Man Utd.'},
                {name: 'Welbeck', position: 'forward', team: 'BHA', price: 6.5, have: false, notes: 'Brighton & Hove Albion\'s Danny Welbeck could also be boosted by penalty duties for the same reason.'},
                {name: 'Pedro', position: 'forward', team: 'CHE', price: 7.5, have: true, notes: 'Chelsea avoid all of last season\'s top seven clubs in the first six Gameweeks, a run that looks very promising for a double-up on Cole Palmer (£10.5m) and Joao Pedro in attack. favourable early schedule'},
                {name: 'Delap', position: 'forward', team: 'CHE', price: 6.5, have: false, notes: 'It is, nonetheless, likely that the Blues\' other new forward, Liam Delap (£6.5m), could be introduced later on in matches as head coach Enzo Maresca opts for fresh legs up front. favourable early schedule'},
                {name: 'Mateta', position: 'forward', team: 'CRY', price: 7.5, have: false, notes: 'As evidenced by his converted effort against Liverpool in the FA Community Shield on Sunday, the Frenchman also appears to be back on penalty duties again. not favorable schedule'},
                {name: 'Wood', position: 'forward', team: 'NFO', price: 7.5, have: false, notes: 'team not in form with forwards'},
                {name: 'Evanilson', position: 'forward', team: 'BOU', price: 7, have: false, notes: ''},
                {name: 'Watkins', position: 'forward', team: 'AVL', price: 9, have: true, notes: 'consider Malen instead. favourable early schedule'},
                {name: 'Ekitike', position: 'forward', team: 'LIV', price: 8.5, have: false, notes: ''},
                {name: 'Gyokeres', position: 'forward', team: 'ARS', price: 9, have: false, notes: 'Gyokeres is the one to monitor most as he could be on penalties for the Gunners.'}
            ];

            // Build week 1 with CSV players
            const players = [];
            let captainPlayerId = null;
            csvPlayers.forEach((playerData, index) => {
                const player = { id: `csv_${Date.now()}_${index}`, ...playerData };
                if (playerData.name === 'Salah\'s') captainPlayerId = player.id;
                players.push(player);
            });

            const teamMembers = players.filter(p => p.have).map(p => ({
                playerId: p.id,
                name: p.name,
                position: p.position,
                team: p.team,
                price: p.price,
            }));

            const root = {
                version: '2.0',
                currentWeek: 1,
                weeks: {
                    1: {
                        players,
                        captain: captainPlayerId,
                        viceCaptain: null,
                        teamMembers,
                        teamStats: {
                            totalValue: teamMembers.reduce((s, p) => s + (Number(p.price) || 0), 0),
                            playerCount: teamMembers.length,
                            createdDate: new Date().toISOString()
                        },
                        isReadOnly: false
                    }
                }
            };

            localStorage.setItem('fpl-team-data', JSON.stringify(root));

            // Load into manager instance
            window.fplManager.loadStateFromStorage();
            window.fplManager.updateDisplay();
        }
    }, 100);
});

// Phase 1: Migration helper methods
FPLTeamManager.prototype.migrateStorageIfNeeded = function() {
    const raw = localStorage.getItem('fpl-team-data');
    if (!raw) return; // nothing to migrate
    let data = null;
    try { data = JSON.parse(raw); } catch (e) { return; }

    // If already in new schema, ensure version and exit
    if (data && data.weeks) {
        if (!data.version) {
            data.version = '2.0';
            localStorage.setItem('fpl-team-data', JSON.stringify(data));
        }
        return;
    }

    // Old schema -> migrate to week-based schema
    const players = Array.isArray(data.players) ? data.players : [];
    const captain = data.captain || null;
    const viceCaptain = data.viceCaptain || null;

    const teamMembers = players.filter(p => p.have).map(p => ({
        playerId: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        price: p.price,
    }));

    const migrated = {
        version: '2.0',
        currentWeek: 1,
        weeks: {
            1: {
                players,
                captain,
                viceCaptain,
                teamMembers,
                teamStats: {
                    totalValue: teamMembers.reduce((s, p) => s + (Number(p.price) || 0), 0),
                    playerCount: teamMembers.length,
                    createdDate: new Date().toISOString()
                },
                isReadOnly: false
            }
        }
    };

    localStorage.setItem('fpl-team-data', JSON.stringify(migrated));
};

// Phase 2: Week management helpers
FPLTeamManager.prototype._getRootData = function() {
    const defaultWeek = () => ({
        players: [],
        captain: null,
        viceCaptain: null,
        teamMembers: [],
        teamStats: { totalValue: 0, playerCount: 0, createdDate: new Date().toISOString() },
        isReadOnly: false
    });
    const defaultRoot = () => ({ version: '2.0', currentWeek: 1, weeks: { 1: defaultWeek() } });

    const raw = localStorage.getItem('fpl-team-data');
    if (!raw) {
        const root = defaultRoot();
        localStorage.setItem('fpl-team-data', JSON.stringify(root));
        return root;
    }
    let data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }

    if (!data || typeof data !== 'object') {
        const root = defaultRoot();
        localStorage.setItem('fpl-team-data', JSON.stringify(root));
        return root;
    }

    // If already weekly schema and valid, ensure version and return
    if (data.weeks && typeof data.weeks === 'object') {
        data.version = data.version || '2.0';
        // Ensure currentWeek and a valid week exist
        const cw = Number(data.currentWeek || 1);
        data.currentWeek = cw >= 1 ? cw : 1;
        if (!data.weeks[data.currentWeek]) {
            data.weeks[data.currentWeek] = defaultWeek();
        }
        localStorage.setItem('fpl-team-data', JSON.stringify(data));
        return data;
    }

    // Old schema -> migrate to weekly on the fly
    const players = Array.isArray(data.players) ? data.players : [];
    const captain = data.captain || null;
    const viceCaptain = data.viceCaptain || null;
    const teamMembers = players.filter(p => p.have).map(p => ({
        playerId: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        price: p.price,
    }));
    const migrated = {
        version: '2.0',
        currentWeek: 1,
        weeks: {
            1: {
                players,
                captain,
                viceCaptain,
                teamMembers,
                teamStats: {
                    totalValue: teamMembers.reduce((s, p) => s + (Number(p.price) || 0), 0),
                    playerCount: teamMembers.length,
                    createdDate: new Date().toISOString()
                },
                isReadOnly: false
            }
        }
    };
    localStorage.setItem('fpl-team-data', JSON.stringify(migrated));
    return migrated;
};

FPLTeamManager.prototype._saveRootData = function(root) {
    root.version = root.version || '2.0';
    localStorage.setItem('fpl-team-data', JSON.stringify(root));
};

FPLTeamManager.prototype._computeTeamSnapshot = function(players) {
    const teamMembers = (players || []).filter(p => p.have).map(p => ({
        playerId: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        price: p.price,
    }));
    return {
        teamMembers,
        teamStats: {
            totalValue: teamMembers.reduce((s, p) => s + (Number(p.price) || 0), 0),
            playerCount: teamMembers.length,
            updatedDate: new Date().toISOString()
        }
    };
};

FPLTeamManager.prototype.createNewWeek = function() {
    const root = this._getRootData();
    const currentWeek = this.currentWeek || root.currentWeek || 1;
    // Always use in-memory state as the source of truth for captain/viceCaptain
    // This ensures that any changes made via UI are captured
    const source = {
        players: this.players || [],
        captain: this.captain || null,
        viceCaptain: this.viceCaptain || null
    };

    // Ensure the source week has up-to-date cap/vice persisted
    root.weeks[currentWeek] = root.weeks[currentWeek] || {};
    root.weeks[currentWeek].players = source.players;
    root.weeks[currentWeek].captain = source.captain;
    root.weeks[currentWeek].viceCaptain = source.viceCaptain;
    const snapshot = this._computeTeamSnapshot(source.players);
    root.weeks[currentWeek].teamMembers = snapshot.teamMembers;
    root.weeks[currentWeek].teamStats = snapshot.teamStats;
    
    // Save the updated root to ensure captain/viceCaptain are persisted before creating new week
    this._saveRootData(root);

    // Mark all existing weeks read-only
    Object.keys(root.weeks).forEach(w => { if (root.weeks[w]) root.weeks[w].isReadOnly = true; });

    const newWeekNumber = Math.max(...Object.keys(root.weeks).map(n => Number(n))) + 1;
    const clonedPlayers = (source.players || []).map(p => ({ ...p }));
    const { teamMembers, teamStats } = this._computeTeamSnapshot(clonedPlayers);

    root.weeks[newWeekNumber] = {
        players: clonedPlayers,
        captain: source.captain || null,
        viceCaptain: source.viceCaptain || null,
        teamMembers,
        teamStats,
        isReadOnly: false
    };

    root.currentWeek = newWeekNumber;
    this.currentWeek = newWeekNumber;

    // Load into memory
    this.players = clonedPlayers;
    this.captain = source.captain || null;
    this.viceCaptain = source.viceCaptain || null;

    this._saveRootData(root);
    this.updateDisplay();
};

FPLTeamManager.prototype.goToWeek = function(weekNumber) {
    const root = this._getRootData();
    const week = root.weeks[weekNumber];
    if (!week) return;
    this.currentWeek = Number(weekNumber);
    root.currentWeek = this.currentWeek;
    this.players = week.players || [];
    this.captain = week.captain || null;
    this.viceCaptain = week.viceCaptain || null;
    this._saveRootData(root);
    this.updateDisplay();
};

FPLTeamManager.prototype.nextWeek = function() {
    const root = this._getRootData();
    const maxWeek = Math.max(...Object.keys(root.weeks).map(n => Number(n)));
    const target = Math.min(this.currentWeek + 1, maxWeek);
    this.goToWeek(target);
};

FPLTeamManager.prototype.prevWeek = function() {
    const target = Math.max(1, this.currentWeek - 1);
    this.goToWeek(target);
};

FPLTeamManager.prototype.getWeekCount = function() {
    const root = this._getRootData();
    if (!root || !root.weeks || typeof root.weeks !== 'object') return 1;
    return Object.keys(root.weeks).length || 1;
};

FPLTeamManager.prototype.getCurrentWeekNumber = function() {
    return this.currentWeek || 1;
};

// Public read-only helpers for testing and migration
FPLTeamManager.prototype.getWeekSnapshot = function(weekNumber) {
    const root = this._getRootData();
    const wn = String(weekNumber || this.currentWeek || root.currentWeek || 1);
    const wk = root.weeks[wn] || {};
    // Return a deep-cloned snapshot to avoid accidental mutations in tests
    return JSON.parse(JSON.stringify({
        players: wk.players || [],
        captain: wk.captain || null,
        viceCaptain: wk.viceCaptain || null,
        teamMembers: wk.teamMembers || [],
        teamStats: wk.teamStats || { totalValue: 0, playerCount: 0 }
    }));
};

FPLTeamManager.prototype.getPlayerSnapshot = function(weekNumber, playerId) {
    const week = this.getWeekSnapshot(weekNumber);
    return (week.players || []).find(p => p.id === playerId) || null;
};

FPLTeamManager.prototype.isPlayerInTeam = function(playerId, weekNumber) {
    const week = this.getWeekSnapshot(weekNumber);
    return (week.teamMembers || []).some(m => m.playerId === playerId);
};

FPLTeamManager.prototype.isWeekReadOnly = function(weekNumber) {
    const root = this._getRootData();
    const wn = String(weekNumber || this.currentWeek || root.currentWeek || 1);
    const wk = root.weeks[wn] || {};
    return !!wk.isReadOnly;
};

FPLTeamManager.prototype.getCurrentWeekNumber = function() {
    return this.currentWeek || 1;
};

FPLTeamManager.prototype.isCurrentWeekReadOnly = function() {
    return this._isReadOnlyCurrentWeek();
};

// Phase 3: read-only helper to separate Week Navigation Tests from implementation
FPLTeamManager.prototype._isReadOnlyCurrentWeek = function() {
    const root = this._getRootData();
    if (!root || !root.weeks || typeof root.weeks !== 'object') return false;
    const currentWeek = this.currentWeek || root.currentWeek || 1;
    const week = root.weeks[currentWeek];
    if (!week) return false;
    return week.isReadOnly === true;
};
