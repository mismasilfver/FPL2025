import UIManager from './js/ui-manager.js';
import { createStorageService, createDefaultRoot } from './js/storage-module.js';
import { WeekModel } from './js/models/week-model.js';
import { AppError } from './js/utils/app-error.js';
import PlayerService from './js/services/player-service.js';
import WeekService from './js/services/week-service.js';
import CaptaincyService from './js/services/captaincy-service.js';
import FplApiClient from './js/services/fpl-api.js';
import PointsService from './js/services/points-service.js';
import TeamService from './js/services/team-service.js';
import TeamSyncCoordinator from './js/services/team-sync-coordinator.js';
import LegacyCompatibilityLayer from './js/services/legacy-compatibility-layer.js';
import MigrationService from './js/services/migration-service.js';

// Global debug flag for this module
const DEBUG = false;

export class FPLTeamManager {
    constructor({ ui, storage } = {}) {
        this.ui = ui || new UIManager();
        this.storage = storage || createStorageService({ backend: 'localstorage' });
        this.playerService = new PlayerService(this.storage);
        this.weekService = new WeekService(this.storage);
        this.captaincyService = new CaptaincyService(this.storage);
        this.fplApiClient = new FplApiClient();
        this.pointsService = new PointsService();
        this.teamService = new TeamService();
        this.teamSyncCoordinator = new TeamSyncCoordinator({
            teamService: this.teamService,
            getFplApiClient: () => this.fplApiClient,
            pointsService: this.pointsService,
            ui: this.ui,
            getRootData: () => this._getRootData(),
            saveRootData: (root) => this._saveRootData(root),
            updateDisplay: () => this.updateDisplay(),
            ensureWeekDerivedFields: (root, weekNumber) => this._ensureWeekDerivedFields(root, weekNumber),
        });
        this.legacyLayer = new LegacyCompatibilityLayer('fpl-team-data');
        this.migrationService = new MigrationService();
        this.storageKey = 'fpl-team-data';
        this._supportsRootApi = false;
        this._storageReady = this._initializeStorage();
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
            rootData = this._migrateToTeams(createDefaultRoot());
        }

        const team = this.teamService.getCurrentTeam(rootData) || rootData;
        const currentWeek = team.currentWeek || 1;
        team.weeks[currentWeek] = {
            ...team.weeks[currentWeek],
            players: await this.getPlayers(),
            captain: await this.getCaptainId(),
            viceCaptain: await this.getViceCaptainId(),
        };

        rootData.version = rootData.version || '3.1';

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
            onWeekSelect: async (weekNumber) => await this.goToWeek(weekNumber),
            onExportWeek: this.exportWeekData.bind(this),
            onToggleHave: (id) => this.toggleHave(id),
            onEdit: (id) => this.openModal(id),
            onDelete: (id) => this.deletePlayer(id),
            onMakeCaptain: (id) => this.setCaptain(id),
            onMakeViceCaptain: (id) => this.setViceCaptain(id),
            onSaveFplId: (entryId) => this.saveFplEntryId(entryId),
            onSync: () => this.syncFromFpl(),
            onImportFplSquad: () => this.importFplSquad(),
            onAddTeam: () => this.addWhatIfTeam(),
            onTeamChange: (teamId) => this.switchTeam(teamId),
        });
    }

    async openModal(playerId = null) {
        if (await this.isCurrentWeekReadOnly()) {
            this.ui.showAlert('This week is read-only. Create a new week to make changes.');
            return;
        }
        const root = await this._getRootData();
        const team = this.teamService.getCurrentTeam(root);
        const currentWeek = team.weeks[team.currentWeek];
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
        const team = this.teamService.getCurrentTeam(root);
        const currentWeek = team.weeks[team.currentWeek];
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
        const team = this.teamService.getCurrentTeam(root);
        root = await this.playerService.addPlayer(root, playerData);
        await this._ensureWeekDerivedFields(root, team.currentWeek);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async updatePlayer(playerId, playerData) {
        if (await this.isCurrentWeekReadOnly()) return;
        let root = await this._getRootData();
        const team = this.teamService.getCurrentTeam(root);
        root = await this.playerService.updatePlayer(root, playerId, playerData);
        await this._ensureWeekDerivedFields(root, team.currentWeek);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async deletePlayer(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;

        if (!confirm('Are you sure you want to delete this player?')) {
            return;
        }

        let root = await this._getRootData();
        const team = this.teamService.getCurrentTeam(root);
        root = await this.playerService.deletePlayer(root, playerId);
        await this._ensureWeekDerivedFields(root, team.currentWeek);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async toggleHave(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;
        let root = await this._getRootData();
        const team = this.teamService.getCurrentTeam(root);
        try {
            root = await this.playerService.toggleHave(root, playerId);
            await this._ensureWeekDerivedFields(root, team.currentWeek);
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

        const team = this.teamService.getCurrentTeam(root);
        if (!team) {
            this.ui.showAlert('No active team found.');
            return;
        }

        if (!team.weeks) team.weeks = {};
        if (!team.currentWeek) team.currentWeek = 1;
        if (!team.weeks[team.currentWeek]) {
            // Initialize missing current week structure (can happen after legacy import)
            team.weeks[team.currentWeek] = { players: [], captain: null, viceCaptain: null, isReadOnly: false };
            await this._ensureWeekDerivedFields(root, team.currentWeek);
            await this._saveRootData(root);
        }
        const currentWeek = team.weeks[team.currentWeek];
        const players = currentWeek.players || [];
        const captainId = currentWeek.captain;
        const viceCaptainId = currentWeek.viceCaptain;
        const weekCount = Object.keys(team.weeks).length;

        const filters = {
            position: this.ui.positionFilter?.value || 'all',
            have: this.ui.haveFilter?.checked || false
        };

        const filteredPlayers = players.filter(player => {
            const positionMatch = filters.position === 'all' || player.position === filters.position;
            const haveMatch = !filters.have || player.have;
            return positionMatch && haveMatch;
        });

        this.ui.renderPlayers(filteredPlayers, { isReadOnly: currentWeek.isReadOnly, captainId, viceCaptainId, filters });
        const weekPoints = this.pointsService.calculateWeekPoints(team, team.currentWeek);
        const totalPoints = this.pointsService.calculateTeamTotalPoints(team).totalPoints || 0;
        this.ui.renderSummary(players, { totalPoints, gwPoints: weekPoints });
        this.ui.renderFplEntryId(root.settings?.fplEntryId || '');
        this.ui.renderLastSync(root.settings?.lastSyncedAt);
        this.ui.renderTeamSelector(root.teams, root.currentTeam);
        this.ui.renderCaptaincyInfo(players, captainId, viceCaptainId);
        if (DEBUG) console.log('About to call renderWeekControls with:', { currentWeek: team.currentWeek, totalWeeks: weekCount, isReadOnly: currentWeek.isReadOnly });
        this.ui.renderWeekControls({
            currentWeek: team.currentWeek,
            totalWeeks: weekCount,
            isReadOnly: currentWeek.isReadOnly,
            savedWeeks: Object.keys(team.weeks).map(Number).sort((a, b) => a - b),
        });
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
            }
        } else {
            const rawData = await this.storage.getItem(this.storageKey);
            if (!rawData) {
                const defaults = this._migrateToTeams(createDefaultRoot());
                await this._setRootData(defaults);
                return defaults;
            }

            try {
                root = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            } catch (error) {
                throw new AppError('Failed to parse root data', { code: 'STORAGE_PARSE_FAILURE', recoverable: true, context: { originalError: error } });
            }
        }

        // Migrate data if needed (v1→v2, missing fields, etc.)
        let data = this.migrationService.migrateIfNeeded(root);

        // Ensure multi-team shape for v3 roots that are still single-team
        if (!data.teams) {
            data = this._migrateToTeams(data);
        }

        // Save if migration produced changes
        if (data !== root || data._mutated) {
            delete data._mutated;
            await this._setRootData(data);
            return data;
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
        return this.legacyLayer.loadStateFromStorage();
    }

    // Legacy getters/setters delegated to LegacyCompatibilityLayer
    get players() {
        return this.legacyLayer.players;
    }

    set players(value) {
        this.legacyLayer.players = value;
    }

    get captain() {
        return this.legacyLayer.captain;
    }

    set captain(value) {
        this.legacyLayer.captain = value;
    }

    get viceCaptain() {
        return this.legacyLayer.viceCaptain;
    }

    set viceCaptain(value) {
        this.legacyLayer.viceCaptain = value;
    }

    get currentWeek() {
        return this.legacyLayer.currentWeek;
    }

    set currentWeek(value) {
        this.legacyLayer.currentWeek = value;
    }

    _getRootDataSync() {
        return this.legacyLayer._getRootDataSync();
    }

    _saveRootDataSync(root) {
        this.legacyLayer._saveRootDataSync(root);
    }

    _isReadOnlyCurrentWeek() {
        return this.legacyLayer._isReadOnlyCurrentWeek();
    }

    async saveFplEntryId(entryId) {
        return this.teamSyncCoordinator.saveFplEntryId(entryId);
    }

    async syncFromFpl() {
        return this.teamSyncCoordinator.syncFromFpl();
    }

    async importFplSquad() {
        return this.teamSyncCoordinator.importFplSquad();
    }

    async addWhatIfTeam() {
        return this.teamSyncCoordinator.addWhatIfTeam();
    }

    async switchTeam(teamId) {
        return this.teamSyncCoordinator.switchTeam(teamId);
    }

    _migrateToTeams(root) {
        return {
            ...root,
            version: '3.1',
            settings: { fplEntryId: null },
            currentTeam: 'default',
            _mutated: true,
            teams: {
                default: {
                    id: 'default',
                    name: 'Primary Team',
                    type: 'primary',
                    fplEntryId: null,
                    currentWeek: root.currentWeek,
                    weeks: root.weeks,
                    totalPoints: 0,
                    gameweekPoints: {},
                },
            },
        };
    }
}

// Export for Node.js environment (Jest)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FPLTeamManager, UIManager };
}

// Default export for ESM consumers
export default FPLTeamManager;
