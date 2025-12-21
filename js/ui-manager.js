const DEBUG = false;

export default class UIManager {
    constructor() {
        this._boundGlobal = false;
        this._keydownBound = false;
        this.currentEditingId = null;
    }

    _logButtonClick(button, payload = {}) {
        try {
            console.log('[UIManager] Button click', { button, ...payload });
        } catch (error) {
            if (DEBUG) console.error('Failed to log button click', error);
        }
    }

    bindEvents(handlers = {}) {
        // Store handlers for later use in modal binding
        this.handlers = handlers;
        
        const {
            onAddPlayer, onModalClose, onFormSubmit, onPositionFilterChange,
            onHaveFilterChange, onPrevWeek, onNextWeek, onCreateWeek, onExportWeek,
            onEscapeKey, onToggleHave, onEdit, onDelete, onMakeCaptain, onMakeViceCaptain
        } = handlers;

        if (!this._boundGlobal) {
            this.addPlayerBtn?.addEventListener('click', () => {
                this._logButtonClick('add-player');
                onAddPlayer?.();
            });
            this.positionFilter?.addEventListener('change', () => {
                this._logButtonClick('position-filter-change');
                onPositionFilterChange?.();
            });
            this.haveFilter?.addEventListener('change', () => {
                this._logButtonClick('have-filter-change');
                onHaveFilterChange?.();
            });
            this.prevWeekBtn?.addEventListener('click', () => {
                this._logButtonClick('previous-week');
                onPrevWeek?.();
            });
            this.nextWeekBtn?.addEventListener('click', () => {
                this._logButtonClick('next-week');
                onNextWeek?.();
            });
            this.createWeekBtn?.addEventListener('click', () => {
                this._logButtonClick('create-week');
                onCreateWeek?.();
            });
            this.exportWeekBtn?.addEventListener('click', () => {
                this._logButtonClick('export-week');
                onExportWeek?.();
            });

            if (this.playersTbody) {
                this.playersTbody.addEventListener('click', (e) => {
                    const target = e.target;
                    const actionEl = target.closest('[data-action]');
                    const notesCell = target.closest('.notes-cell');

                    if (actionEl) {
                        const action = actionEl.getAttribute('data-action');
                        const playerId = actionEl.getAttribute('data-player-id');
                        if (!action || !playerId) return;

                        this._logButtonClick('player-action', { action, playerId });

                        switch (action) {
                            case 'toggle-have': onToggleHave?.(playerId); break;
                            case 'edit': onEdit?.(playerId); break;
                            case 'delete': onDelete?.(playerId); break;
                            case 'make-captain': onMakeCaptain?.(playerId); break;
                            case 'make-vice': onMakeViceCaptain?.(playerId); break;
                        }
                    } else if (notesCell) {
                        this.toggleNotesExpansion(notesCell);
                    }
                });
            }
            this._boundGlobal = true;
        }

        // Re-bind modal events if modal is rebuilt
        this.modal?.querySelector('.close')?.addEventListener('click', () => {
            this._logButtonClick('modal-close');
            onModalClose?.();
        });
        this.modal?.querySelector('[data-testid="cancel-button"]')?.addEventListener('click', () => {
            this._logButtonClick('modal-cancel');
            onModalClose?.();
        });
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) onModalClose?.();
        });
        this.modal?.querySelector('#player-form')?.addEventListener('submit', (e) => onFormSubmit?.(e));

        if (!this._keydownBound) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') onEscapeKey?.(e);
            });
            this._keydownBound = true;
        }
    }

    async initElements(doc = document) {
        this.document = doc;
        
        // Cache DOM elements
        this.addPlayerBtn = doc.querySelector('[data-testid="add-player-button"]');
        this.playersTbody = doc.getElementById('players-tbody');
        this.playersTable = doc.getElementById('players-table');
        this.emptyState = doc.getElementById('empty-state');
        this.weekLabel = doc.getElementById('week-label');
        this.weekReadonlyBadge = doc.getElementById('week-readonly-badge');
        this.positionFilter = doc.querySelector('[data-testid="position-filter-select"]');
        this.haveFilter = doc.querySelector('[data-testid="have-filter-checkbox"]');
        this.prevWeekBtn = doc.getElementById('prev-week-btn');
        this.nextWeekBtn = doc.getElementById('next-week-btn');
        this.createWeekBtn = doc.getElementById('create-week-btn');
        this.exportWeekBtn = doc.getElementById('export-week-btn');
        this.teamCount = doc.getElementById('team-count');
        this.totalValue = doc.getElementById('total-value');
        this.captainInfo = doc.getElementById('captain-info');
        this.viceCaptainInfo = doc.getElementById('vice-captain-info');
        
        
        if (DEBUG) console.log('initElements - prevWeekBtn found:', !!this.prevWeekBtn);
        if (DEBUG) console.log('initElements - playerModalTemplate found:', !!this.playerModalTemplate);
    }

    openModal(player = null) {
        if (!this.modal) this.buildModalFromTemplate();
        if (!this.modal) return console.error('Modal could not be created.');

        if (player) {
            this.modalTitle.textContent = 'Edit Player';
            this.populateForm(player);
            this.currentEditingId = player.id;
        } else {
            this.modalTitle.textContent = 'Add Player';
            this.clearForm();
            this.currentEditingId = null;
        }
        this.modal.style.display = 'block';
        this.playerName?.focus();
    }

    buildModalFromTemplate() {
        const doc = this.document || document;
        const playerModalTemplate = doc.getElementById('player-modal-template');
        if (!playerModalTemplate) return console.error('Player modal template not found');
        
        const frag = playerModalTemplate.content.cloneNode(true);
        doc.body.appendChild(frag);
        // Use the same document context to find the modal
        this.modal = doc.getElementById('player-modal');
        
        if (!this.modal) {
            console.error('Modal element not found after template creation');
            return;
        }
        
        this.modalTitle = this.modal.querySelector('#modal-title');
        this.playerForm = this.modal.querySelector('#player-form');
        this.playerName = this.modal.querySelector('[data-testid="player-name-input"]');
        this.playerPosition = this.modal.querySelector('[data-testid="player-position-select"]');
        this.playerTeam = this.modal.querySelector('[data-testid="player-team-input"]');
        this.playerPrice = this.modal.querySelector('[data-testid="player-price-input"]');
        this.playerStatus = this.modal.querySelector('[data-testid="player-status-select"]');
        this.playerHave = this.modal.querySelector('[data-testid="player-have-checkbox"]');
        this.playerNotes = this.modal.querySelector('[data-testid="player-notes-textarea"]');
        
        // Bind modal events after creation
        this.bindModalEvents();
    }
    
    bindModalEvents() {
        if (!this.modal || !this.handlers) return;
        
        const { onModalClose, onFormSubmit } = this.handlers;
        
        // Bind close button events
        const closeBtn = this.modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this._logButtonClick('modal-close');
                onModalClose?.();
            });
        }
        
        const cancelBtn = this.modal.querySelector('[data-testid="cancel-button"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this._logButtonClick('modal-cancel');
                onModalClose?.();
            });
        }
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this._logButtonClick('modal-overlay');
                onModalClose?.();
            }
        });
        
        // Bind form submit event
        const form = this.modal.querySelector('#player-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                onFormSubmit?.(e);
            });
        }
    }

    closeModal() {
        if (this.modal) this.modal.style.display = 'none';
        this.clearForm();
    }

    populateForm(player) {
        if (!this.playerName) return;
        this.playerName.value = player.name;
        this.playerPosition.value = player.position;
        this.playerTeam.value = player.team;
        this.playerPrice.value = player.price;
        this.playerStatus.value = player.status || '';
        this.playerHave.checked = player.have || false;
        this.playerNotes.value = player.notes || '';
    }

    clearForm() {
        this.playerForm?.reset();
        if(this.playerStatus) this.playerStatus.value = '';
        if(this.playerHave) this.playerHave.checked = false;
        this.currentEditingId = null;
    }

    getStatusText(status) {
        const statusMap = { yellow: 'Maybe Good', green: 'Very Good', red: "Sell/Don't Buy" };
        return statusMap[status] || status;
    }

    capitalizeFirst(str) {
        if (typeof str !== 'string' || str.length === 0) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }

    renderSummary(players) {
        const teamPlayers = (players || []).filter(p => p.have);
        const teamCount = teamPlayers.length;
        const totalValue = teamPlayers.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
        if (this.teamCount) this.teamCount.textContent = `In Team: ${teamCount}/15`;
        if (this.totalValue) this.totalValue.textContent = `Total Value: £${totalValue.toFixed(1)}m`;
    }

    renderCaptaincyInfo(players, captainId, viceCaptainId) {
        const captainPlayer = (players || []).find(p => p.id === captainId);
        const viceCaptainPlayer = (players || []).find(p => p.id === viceCaptainId);
        if (this.captainInfo) this.captainInfo.textContent = `Captain: ${captainPlayer ? captainPlayer.name : 'None selected'}`;
        if (this.viceCaptainInfo) this.viceCaptainInfo.textContent = `Vice Captain: ${viceCaptainPlayer ? viceCaptainPlayer.name : 'None selected'}`;
    }

    renderWeekControls({ currentWeek, totalWeeks, isReadOnly }) {
        if (this.weekLabel) this.weekLabel.textContent = `Week ${currentWeek}`;
        if (this.weekReadonlyBadge) this.weekReadonlyBadge.style.display = isReadOnly ? 'inline-block' : 'none';
        if (this.addPlayerBtn) this.addPlayerBtn.disabled = !!isReadOnly;
        if (this.prevWeekBtn) {
            if (DEBUG) console.log('Setting prevWeekBtn disabled:', currentWeek <= 1, 'currentWeek:', currentWeek);
            this.prevWeekBtn.disabled = currentWeek <= 1;
        }
        if (this.nextWeekBtn) this.nextWeekBtn.disabled = currentWeek >= totalWeeks;
    }

    ensurePlayerRowTemplate(doc) {
        const targetDoc = doc || (this.playersTbody ? this.playersTbody.ownerDocument : document);
        if (!targetDoc) return null;

        let template = targetDoc.getElementById('player-row-template');
        if (!template) {
            template = targetDoc.createElement('template');
            template.id = 'player-row-template';
            template.innerHTML = `
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
    `;
            targetDoc.body?.appendChild(template);
        }
        return template;
    }

    buildRowFromTemplate(player, { isReadOnly, captainId, viceCaptainId }) {
        const doc = this.playersTbody ? this.playersTbody.ownerDocument : document;
        const playerRowTemplate = this.ensurePlayerRowTemplate(doc);

        if (!playerRowTemplate) {
            console.error('Player row template not found');
            return null;
        }
        
        // Clone the template content
        const templateContent = playerRowTemplate.content.cloneNode(true);
        const row = templateContent.querySelector('tr');
        row.className = 'player-row';
        row.id = `player-row-${player.id}`;

        const isCaptain = captainId === player.id;
        const isViceCaptain = viceCaptainId === player.id;

        // Populate template cells with player data
        const nameCell = row.querySelector('.col-name');
        if (nameCell) nameCell.textContent = player.name;

        const positionCell = row.querySelector('.col-position');
        if (positionCell) positionCell.textContent = this.capitalizeFirst(player.position);

        const teamCell = row.querySelector('.col-team');
        if (teamCell) teamCell.textContent = player.team;

        const priceCell = row.querySelector('.col-price');
        if (priceCell) priceCell.textContent = `£${Number(player.price).toFixed(1)}m`;

        const statusCell = row.querySelector('.col-status');
        if (statusCell) {
            statusCell.textContent = '';
            if (player.status) {
                const statusDiv = doc.createElement('div');
                statusDiv.className = `status-circle status-${player.status}`;
                statusDiv.title = this.getStatusText(player.status);
                statusCell.appendChild(statusDiv);
            }
        }

        const haveCell = row.querySelector('.col-have');
        if (haveCell) {
            haveCell.setAttribute('data-testid', `have-cell-${player.id}`);
            haveCell.innerHTML = '';
            if (player.have) {
                const span = doc.createElement('span');
                span.className = 'have-indicator remove-from-team';
                span.setAttribute('data-testid', `remove-from-team-${player.id}`);
                span.setAttribute('data-action', 'toggle-have');
                span.setAttribute('data-player-id', player.id);
                span.style.cursor = 'pointer';
                span.title = 'Click to remove from team';
                span.textContent = '✓';
                haveCell.appendChild(span);
            } else {
                const button = doc.createElement('button');
                button.className = 'btn btn-secondary add-to-team';
                button.disabled = isReadOnly;
                button.setAttribute('data-testid', `add-to-team-${player.id}`);
                button.setAttribute('data-action', 'toggle-have');
                button.setAttribute('data-player-id', player.id);
                button.title = 'Add to team';
                button.textContent = '+';
                haveCell.appendChild(button);
            }
        }

        const captainCell = row.querySelector('.col-captain');
        if (captainCell) {
            captainCell.setAttribute('data-testid', `captain-cell-${player.id}`);
            captainCell.innerHTML = '';
            if (isCaptain) {
                const span = doc.createElement('span');
                span.className = 'captain-badge';
                span.setAttribute('data-testid', `captain-badge-${player.id}`);
                span.textContent = 'C';
                captainCell.appendChild(span);
            } else {
                const button = doc.createElement('button');
                button.className = 'btn btn-secondary make-captain';
                button.disabled = isReadOnly;
                button.setAttribute('data-action', 'make-captain');
                button.setAttribute('data-player-id', player.id);
                button.textContent = 'C';
                captainCell.appendChild(button);
            }
        }

        const viceCell = row.querySelector('.col-vice');
        if (viceCell) {
            viceCell.setAttribute('data-testid', `vice-captain-cell-${player.id}`);
            viceCell.innerHTML = '';
            if (isViceCaptain) {
                const span = doc.createElement('span');
                span.className = 'vice-captain-badge';
                span.setAttribute('data-testid', `vice-captain-badge-${player.id}`);
                span.textContent = 'VC';
                viceCell.appendChild(span);
            } else {
                const button = doc.createElement('button');
                button.className = 'btn btn-secondary make-vice-captain';
                button.disabled = isReadOnly;
                button.setAttribute('data-action', 'make-vice');
                button.setAttribute('data-player-id', player.id);
                button.textContent = 'VC';
                viceCell.appendChild(button);
            }
        }

        const notesCell = row.querySelector('.col-notes');
        if (notesCell) {
            notesCell.className = 'col-notes notes-cell';
            notesCell.setAttribute('data-testid', `notes-cell-${player.id}`);
            notesCell.setAttribute('data-player-id', player.id);
            notesCell.setAttribute('data-full-notes', player.notes || '');
            notesCell.title = 'Click to expand notes';
            const notesSpan = doc.createElement('span');
            notesSpan.className = 'notes-text';
            notesSpan.textContent = this.truncateText(player.notes || '', 20);
            notesCell.innerHTML = '';
            notesCell.appendChild(notesSpan);
        }

        const actionsCell = row.querySelector('.col-actions');
        if (actionsCell) {
            actionsCell.innerHTML = '';
            const editBtn = doc.createElement('button');
            editBtn.className = 'btn btn-edit edit-player';
            editBtn.disabled = isReadOnly;
            editBtn.setAttribute('data-testid', `edit-player-${player.id}`);
            editBtn.setAttribute('data-action', 'edit');
            editBtn.setAttribute('data-player-id', player.id);
            editBtn.textContent = 'Edit';
            actionsCell.appendChild(editBtn);
            
            const deleteBtn = doc.createElement('button');
            deleteBtn.className = 'btn btn-danger delete-player';
            deleteBtn.disabled = isReadOnly;
            deleteBtn.setAttribute('data-testid', `delete-player-${player.id}`);
            deleteBtn.setAttribute('data-action', 'delete');
            deleteBtn.setAttribute('data-player-id', player.id);
            deleteBtn.textContent = 'Delete';
            actionsCell.appendChild(deleteBtn);
        }

        return row;
    }

    renderPlayers(players, { isReadOnly, captainId, viceCaptainId }) {
        if (!this.playersTbody) return;

        this.playersTbody.innerHTML = '';
        if (!players || players.length === 0) {
            if(this.emptyState) this.emptyState.style.display = 'block';
            if(this.playersTable) this.playersTable.parentElement.style.display = 'none';
        } else {
            if(this.emptyState) this.emptyState.style.display = 'none';
            if(this.playersTable) this.playersTable.parentElement.style.display = 'block';
            players.forEach(player => {
                const row = this.buildRowFromTemplate(player, { isReadOnly, captainId, viceCaptainId });
                if (row && row.nodeType === Node.ELEMENT_NODE) {
                    this.playersTbody.appendChild(row);
                } else {
                    console.error('Invalid row element created for player:', player.id);
                }
            });
        }
    }

    toggleNotesExpansion(cell) {
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
    }
}