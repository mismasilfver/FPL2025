import UIManager from './js/ui-manager.js';
import { createStorageService, createDefaultRoot } from './js/storage-module.js';
import { WeekModel } from './js/models/week-model.js';
import { AppError } from './js/utils/app-error.js';
import PlayerService from './js/services/player-service.js';
import WeekService from './js/services/week-service.js';
import CaptaincyService from './js/services/captaincy-service.js';

// Global debug flag for this module
const DEBUG = false;

export class FPLTeamManager {
    constructor({ ui, storage } = {}) {
        this.ui = ui || new UIManager();
        this.storage = storage || createStorageService({ backend: 'localstorage' });
        this.playerService = new PlayerService(this.storage);
        this.weekService = new WeekService(this.storage);
        this.captaincyService = new CaptaincyService(this.storage);
        this.storageKey = 'fpl-team-data'; // Centralize storage key
        this._supportsRootApi = false;
        this._storageReady = this._initializeStorage();
        // State is now managed directly via storage, not in-memory properties.
    }

    async _initializeStorage() {
        if (!this.storage) {
            this.storage = createStorageService({ backend: 'localstorage' });
        }

        if (typeof this.storage.initialize === 'function') {
            try {
                await this.storage.initialize();
            } catch (error) {
                throw new AppError('Failed to initialize storage service', { code: 'STORAGE_INIT_FAILURE', context: { originalError: error } });
            }
        }

        this._supportsRootApi = typeof this.storage.getRootData === 'function'
            && typeof this.storage.setRootData === 'function';

        return true;
    }

    async getCaptainId() {
        const root = await this._getRootData();
        return this.captaincyService.getCaptainId(root);
    }

    async getViceCaptainId() {
        const root = await this._getRootData();
        return this.captaincyService.getViceCaptainId(root);
    }

    async getPlayers() {
        const root = await this._getRootData();
        return this.playerService.getPlayers(root);
    }

    async calculateTotalCost() {
        const players = await this.getPlayers();
        return players.filter(p => p.have).reduce((sum, p) => sum + p.price, 0);
    }

    async init(doc = document) {
        if (DEBUG) console.log('FPLTeamManager.init called');
        await this.ui.initElements(doc);
        if (DEBUG) console.log('initElements completed');
        this.bindEvents();
        if (DEBUG) console.log('bindEvents completed');
        if (DEBUG) console.log('About to call updateDisplay');
        try {
            await this.updateDisplay();
            if (DEBUG) console.log('updateDisplay completed');
        } catch (error) {
            throw new AppError('Error in updateDisplay', { code: 'UI_UPDATE_FAILURE', context: { originalError: error } });
        }
    }

    async saveStateToStorage() {
        await this._storageReady;
        let rootData = await this._getRootData();

        if (!rootData || typeof rootData !== 'object') {
            rootData = createDefaultRoot();
        }

        const currentWeek = await this.getCurrentWeekNumber();
        rootData.weeks[currentWeek] = {
            ...rootData.weeks[currentWeek],
            players: await this.getPlayers(),
            captain: await this.getCaptainId(),
            viceCaptain: await this.getViceCaptainId(),
        };

        rootData.version = rootData.version || '2.0';
        rootData.currentWeek = await this.getCurrentWeekNumber();

        await this._setRootData(rootData);
    }

    bindEvents() {
        this.ui.bindEvents({
            onAddPlayer: this.openModal.bind(this),
            onModalClose: this.closeModal.bind(this),
            onFormSubmit: this.handleFormSubmit.bind(this),
            onPositionFilterChange: this.updateDisplay.bind(this),
            onHaveFilterChange: this.updateDisplay.bind(this),
            onEscapeKey: () => this.closeModal(),
            onPrevWeek: async () => await this.prevWeek(),
            onNextWeek: async () => await this.nextWeek(),
            onCreateWeek: async () => await this.createNewWeek(),
            onExportWeek: this.exportWeekData.bind(this),
            onToggleHave: (id) => this.toggleHave(id),
            onEdit: (id) => this.openModal(id),
            onDelete: (id) => this.deletePlayer(id),
            onMakeCaptain: (id) => this.setCaptain(id),
            onMakeViceCaptain: (id) => this.setViceCaptain(id),
        });
    }

    async openModal(playerId = null) {
        if (await this.isCurrentWeekReadOnly()) {
            this.ui.showAlert('This week is read-only. Create a new week to make changes.');
            return;
        }
        const root = await this._getRootData();
        const currentWeek = root.weeks[root.currentWeek];
        const player = playerId ? currentWeek.players.find(p => p.id === playerId) : null;
        this.ui.openModal(player);
    }

    closeModal() {
        this.ui.closeModal();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        if (!this.ui.playerForm || !this.ui.playerForm.checkValidity()) {
            this.ui.playerForm?.reportValidity();
            return;
        }

        const playerData = {
            name: this.ui.playerName.value.trim(),
            position: this.ui.playerPosition.value,
            team: this.ui.playerTeam.value.trim(),
            price: parseFloat(this.ui.playerPrice.value),
            status: this.ui.playerStatus.value || '',
            have: this.ui.playerHave.checked,
            notes: this.ui.playerNotes.value.trim()
        };

        const root = await this._getRootData();
        const currentWeek = root.weeks[root.currentWeek];
        const teamSize = currentWeek.players.filter(p => p.have).length;
        const isEditing = !!this.ui.currentEditingId;
        const playerBeingEdited = isEditing ? currentWeek.players.find(p => p.id === this.ui.currentEditingId) : null;
        const wasInTeam = playerBeingEdited ? playerBeingEdited.have : false;

        if (playerData.have && !wasInTeam && teamSize >= 15) {
            this.ui.showAlert('You can only have 15 players in your team.');
            return;
        }

        if (isEditing) {
            this.updatePlayer(this.ui.currentEditingId, playerData);
        } else {
            this.addPlayer(playerData);
        }

        this.closeModal();
    }

    async addPlayer(playerData) {
        if (await this.isCurrentWeekReadOnly()) return;
        let root = await this._getRootData();
        root = await this.playerService.addPlayer(root, playerData);
        await this._ensureWeekDerivedFields(root, root.currentWeek);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async updatePlayer(playerId, playerData) {
        if (await this.isCurrentWeekReadOnly()) return;
        let root = await this._getRootData();
        root = await this.playerService.updatePlayer(root, playerId, playerData);
        await this._ensureWeekDerivedFields(root, root.currentWeek);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async deletePlayer(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;

        if (!confirm('Are you sure you want to delete this player?')) {
            return;
        }

        let root = await this._getRootData();
        root = await this.playerService.deletePlayer(root, playerId);
        await this._ensureWeekDerivedFields(root, root.currentWeek);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async toggleHave(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;
        let root = await this._getRootData();
        try {
            root = await this.playerService.toggleHave(root, playerId);
            await this._ensureWeekDerivedFields(root, root.currentWeek);
            await this._saveRootData(root);
            await this.updateDisplay();
        } catch (error) {
            this.ui.showAlert(error.message);
        }
    }

    async setCaptain(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;
        let root = await this._getRootData();
        try {
            root = this.captaincyService.setCaptain(root, playerId);
            await this._saveRootData(root);
            await this.updateDisplay();
        } catch (error) {
            this.ui.showAlert(error.message);
        }
    }

    async setViceCaptain(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;
        let root = await this._getRootData();
        try {
            root = this.captaincyService.setViceCaptain(root, playerId);
            await this._saveRootData(root);
            await this.updateDisplay();
        } catch (error) {
            this.ui.showAlert(error.message);
        }
    }

    async updateDisplay() {
        if (DEBUG) console.log('updateDisplay called');
        const root = await this._getRootData();
        if (DEBUG) console.log('Got root data:', root);
        if (!root.weeks) root.weeks = {};
        if (!root.currentWeek) root.currentWeek = 1;
        if (!root.weeks[root.currentWeek]) {
            // Initialize missing current week structure (can happen after legacy import)
            root.weeks[root.currentWeek] = { players: [], captain: null, viceCaptain: null, isReadOnly: false };
            await this._ensureWeekDerivedFields(root, root.currentWeek);
            await this._saveRootData(root);
        }
        const currentWeek = root.weeks[root.currentWeek];
        const players = currentWeek.players || [];
        const captainId = currentWeek.captain;
        const viceCaptainId = currentWeek.viceCaptain;
        const weekCount = Object.keys(root.weeks).length;

        const filters = {
            position: this.ui.positionFilter?.value || 'all',
            have: this.ui.haveFilter?.checked || false
        };

        const filteredPlayers = players.filter(player => {
            const positionMatch = filters.position === 'all' || player.position === filters.position;
            const haveMatch = !filters.have || player.have;
            return positionMatch && haveMatch;
        });

        this.ui.renderPlayers(filteredPlayers, { isReadOnly: currentWeek.isReadOnly, captainId, viceCaptainId });
        this.ui.renderSummary(players);
        this.ui.renderCaptaincyInfo(players, captainId, viceCaptainId);
        if (DEBUG) console.log('About to call renderWeekControls with:', { currentWeek: root.currentWeek, totalWeeks: weekCount, isReadOnly: currentWeek.isReadOnly });
        this.ui.renderWeekControls({ currentWeek: root.currentWeek, totalWeeks: weekCount, isReadOnly: currentWeek.isReadOnly });
    }

    async exportWeekData() {
        const currentWeek = await this.getCurrentWeekNumber();
        const weekData = await this.getWeekSnapshot(currentWeek);
        const dataStr = JSON.stringify(weekData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const urlApi = (typeof window !== 'undefined' && window.URL)
            || (typeof global !== 'undefined' && global.URL)
            || null;

        const canCreateObjectUrl = urlApi && typeof urlApi.createObjectURL === 'function';
        const canRevokeObjectUrl = urlApi && typeof urlApi.revokeObjectURL === 'function';

        if (!canCreateObjectUrl || !canRevokeObjectUrl) {
            console.warn('URL.createObjectURL is not available; skipping export.');
            return;
        }

        const url = urlApi.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fpl_week_${currentWeek}_data.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        urlApi.revokeObjectURL(url);
    }

    async _getRootData() {
        await this._storageReady;

        let root;

        if (this._supportsRootApi) {
            try {
                root = await this.storage.getRootData();
            } catch (error) {
                throw new AppError('Failed to load root data from storage service', { code: 'STORAGE_ROOT_LOAD_FAILURE', context: { originalError: error } });
                root = null;
            }
        } else {
            const rawData = await this.storage.getItem(this.storageKey);
            if (!rawData) {
                const defaults = createDefaultRoot();
                await this._setRootData(defaults);
                return defaults;
            }

            try {
                root = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            } catch (error) {
                throw new AppError('Failed to parse root data', { code: 'STORAGE_PARSE_FAILURE', recoverable: true, context: { originalError: error } });
                const defaults = createDefaultRoot();
                await this._setRootData(defaults);
                return defaults;
            }
        }

        if (!root || typeof root !== 'object') {
            const defaults = createDefaultRoot();
            await this._setRootData(defaults);
            return defaults;
        }

        // Detect legacy shape: { week, players, captain, viceCaptain }
        const isLegacy = !root.weeks && (Array.isArray(root.players) || typeof root.week !== 'undefined');
        if (isLegacy) {
            const legacyWeek = Number(root.week) || 1;
            const migrated = {
                version: '2.0',
                currentWeek: legacyWeek,
                weeks: {
                    [legacyWeek]: {
                        players: Array.isArray(root.players) ? root.players : [],
                        captain: root.captain || null,
                        viceCaptain: root.viceCaptain || null,
                        isReadOnly: false
                    }
                }
            };
            await this._ensureWeekDerivedFields(migrated, legacyWeek);
            await this._setRootData(migrated);
            return migrated;
        }

        if (root && root.weeks) {
            const weekKeys = Object.keys(root.weeks);
            let mutated = false;
            for (const wk of weekKeys) {
                const weekObj = root.weeks[wk];
                if (weekObj && (!Array.isArray(weekObj.teamMembers) || !weekObj.teamStats || typeof weekObj.totalTeamCost === 'undefined')) {
                    await this._ensureWeekDerivedFields(root, wk);
                    mutated = true;
                }
            }
            if (!root.version) {
                root.version = '2.0';
                mutated = true;
            }
            if (mutated) {
                await this._setRootData(root);
            }
        }

        return root;
    }

    async _saveRootData(root) {
        root.version = root.version || '2.0';
        const snapshot = JSON.parse(JSON.stringify(root));
        await this._setRootData(snapshot);
    }

    async _setRootData(root) {
        await this._storageReady;
        if (this._supportsRootApi) {
            return this.storage.setRootData(root);
        }
        return this.storage.setItem(this.storageKey, JSON.stringify(root));
    }


    // Ensure derived fields on a specific week are up-to-date based on its players
    async _ensureWeekDerivedFields(root, weekNumber) {
        return this.weekService._ensureWeekDerivedFields(root, weekNumber);
    }

    async createNewWeek() {
        let root = await this._getRootData();
        root = this.weekService.createNewWeek(root);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async goToWeek(weekNumber) {
        let root = await this._getRootData();
        root = this.weekService.goToWeek(root, weekNumber);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async nextWeek() {
        let root = await this._getRootData();
        root = this.weekService.nextWeek(root);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async prevWeek() {
        let root = await this._getRootData();
        root = this.weekService.prevWeek(root);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async getWeekCount() {
        const root = await this._getRootData();
        return this.weekService.getWeekCount(root);
    }

    async getCurrentWeekNumber() {
        const root = await this._getRootData();
        return this.weekService.getCurrentWeekNumber(root);
    }

    async getWeekSnapshot(weekNumber) {
        const root = await this._getRootData();
        return this.weekService.getWeekSnapshot(root, weekNumber);
    }

    async isWeekReadOnly(weekNumber) {
        const root = await this._getRootData();
        return this.weekService.isWeekReadOnly(root, weekNumber);
    }

    async isCurrentWeekReadOnly() {
        const root = await this._getRootData();
        return this.weekService.isCurrentWeekReadOnly(root);
    }

    // Backward compatibility methods for legacy tests
    async loadStateFromStorage() {
        // Legacy method - delegate to init
        return await this.init();
    }

    // Synchronous helper methods for backward compatibility
    _getRootDataSync() {
        try {
            const data = localStorage.getItem('fpl-team-data');
            return data ? JSON.parse(data) : { currentWeek: 1, weeks: { 1: { players: [], captain: null, viceCaptain: null, isReadOnly: false } } };
        } catch (e) {
            return { currentWeek: 1, weeks: { 1: { players: [], captain: null, viceCaptain: null, isReadOnly: false } } };
        }
    }

    _saveRootDataSync(root) {
        try {
            localStorage.setItem('fpl-team-data', JSON.stringify(root));
        } catch (e) {
            console.warn('Failed to save data synchronously:', e);
        }
    }

    // Legacy players getter/setter for backward compatibility
    get players() {
        const root = this._getRootDataSync();
        return root?.weeks?.[root.currentWeek]?.players || [];
    }

    set players(value) {
        const root = this._getRootDataSync();
        if (!root.weeks[root.currentWeek]) {
            root.weeks[root.currentWeek] = { players: [], captain: null, viceCaptain: null, isReadOnly: false };
        }
        root.weeks[root.currentWeek].players = value;
        this._saveRootDataSync(root);
    }

    // Legacy captain getter/setter for backward compatibility
    get captain() {
        const root = this._getRootDataSync();
        return root?.weeks?.[root.currentWeek]?.captain || null;
    }

    set captain(value) {
        const root = this._getRootDataSync();
        if (!root.weeks[root.currentWeek]) {
            root.weeks[root.currentWeek] = { players: [], captain: null, viceCaptain: null, isReadOnly: false };
        }
        root.weeks[root.currentWeek].captain = value;
        this._saveRootDataSync(root);
    }

    // Legacy viceCaptain getter/setter for backward compatibility
    get viceCaptain() {
        const root = this._getRootDataSync();
        return root?.weeks?.[root.currentWeek]?.viceCaptain || null;
    }

    set viceCaptain(value) {
        const root = this._getRootDataSync();
        if (!root.weeks[root.currentWeek]) {
            root.weeks[root.currentWeek] = { players: [], captain: null, viceCaptain: null, isReadOnly: false };
        }
        root.weeks[root.currentWeek].viceCaptain = value;
        this._saveRootDataSync(root);
    }

    // Legacy currentWeek getter/setter for backward compatibility
    get currentWeek() {
        const root = this._getRootDataSync();
        return root?.currentWeek || 1;
    }

    set currentWeek(value) {
        const root = this._getRootDataSync();
        root.currentWeek = value;
        this._saveRootDataSync(root);
    }

    // Legacy method for mocking in tests
    _isReadOnlyCurrentWeek() {
        const root = this._getRootDataSync();
        const week = root?.weeks?.[root.currentWeek] || {};
        return !!week.isReadOnly;
    }
}

// Export for Node.js environment (Jest)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FPLTeamManager, UIManager };
}

// Default export for ESM consumers
export default FPLTeamManager;
