import UIManager from './js/ui-manager.js';
import { LocalStorageAdapter } from './js/storage.js';

// Global debug flag for this module
const DEBUG = false;

export class FPLTeamManager {
    constructor({ ui, storage } = {}) {
        this.ui = ui || new UIManager();
        this.storage = storage; // Use the injected storage adapter
        if (!this.storage && typeof LocalStorageAdapter !== 'undefined') {
            this.storage = new LocalStorageAdapter();
        }
        this.storageKey = 'fpl-team-data'; // Centralize storage key
        // State is now managed directly via storage, not in-memory properties.
    }

    async getCaptainId() {
        const root = await this._getRootData();
        const week = root.weeks[root.currentWeek] || {};
        return week.captain;
    }

    async getViceCaptainId() {
        const root = await this._getRootData();
        const week = root.weeks[root.currentWeek] || {};
        return week.viceCaptain;
    }

    async getPlayers() {
        const root = await this._getRootData();
        const week = root.weeks[root.currentWeek] || {};
        return week.players || [];
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
            console.error('Error in updateDisplay:', error);
            throw error;
        }
    }

    async saveStateToStorage() {
        const rawData = await this.storage.getItem(this.storageKey);
        let rootData;
        try {
            rootData = rawData ? JSON.parse(rawData) : this._getRootData();
        } catch (e) {
            rootData = this._getRootData();
        }

        if (!rootData.weeks) {
            rootData.weeks = {};
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

        await this.storage.setItem(this.storageKey, JSON.stringify(rootData));
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
            alert('This week is read-only. Create a new week to make changes.');
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
            alert('You can only have 15 players in your team.');
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
        const root = await this._getRootData();
        const currentWeek = root.weeks[root.currentWeek];
        const player = {
            id: Date.now().toString(),
            ...playerData,
        };
        currentWeek.players.push(player);
        await this._ensureWeekDerivedFields(root, root.currentWeek);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async updatePlayer(playerId, playerData) {
        if (await this.isCurrentWeekReadOnly()) return;
        const root = await this._getRootData();
        const currentWeek = root.weeks[root.currentWeek];
        const playerIndex = currentWeek.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            currentWeek.players[playerIndex] = { ...currentWeek.players[playerIndex], ...playerData };
            await this._ensureWeekDerivedFields(root, root.currentWeek);
            await this._saveRootData(root);
            await this.updateDisplay();
        }
    }

    async deletePlayer(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;
        
        // Ask for confirmation before deleting
        if (!confirm('Are you sure you want to delete this player?')) {
            return;
        }
        
        const root = await this._getRootData();
        const currentWeek = root.weeks[root.currentWeek];
        currentWeek.players = currentWeek.players.filter(p => p.id !== playerId);
        // Clear captain/vice-captain if they were the deleted player
        if (currentWeek.captain === playerId) currentWeek.captain = null;
        if (currentWeek.viceCaptain === playerId) currentWeek.viceCaptain = null;
        await this._ensureWeekDerivedFields(root, root.currentWeek);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async toggleHave(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;
        const root = await this._getRootData();
        const currentWeek = root.weeks[root.currentWeek];
        const player = currentWeek.players.find(p => p.id === playerId);
        if (player) {
            if (!player.have && currentWeek.players.filter(p => p.have).length >= 15) {
                alert('You can only have 15 players in your team.');
                return;
            }
            player.have = !player.have;
            await this._ensureWeekDerivedFields(root, root.currentWeek);
            await this._saveRootData(root);
            await this.updateDisplay();
        }
    }

    async setCaptain(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;
        const root = await this._getRootData();
        const currentWeek = root.weeks[root.currentWeek];
        const player = currentWeek.players.find(p => p.id === playerId);
        if (player && !player.have) {
            alert('Player must be in the team to be captain.');
            return;
        }

        if (currentWeek.captain === playerId) {
            currentWeek.captain = null;
        } else {
            currentWeek.captain = playerId;
            if (currentWeek.viceCaptain === playerId) {
                currentWeek.viceCaptain = null;
            }
        }
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async setViceCaptain(playerId) {
        if (await this.isCurrentWeekReadOnly()) return;
        const root = await this._getRootData();
        const currentWeek = root.weeks[root.currentWeek];
        const player = currentWeek.players.find(p => p.id === playerId);
        if (player && !player.have) {
            alert('Player must be in the team to be vice-captain.');
            return;
        }

        if (currentWeek.viceCaptain === playerId) {
            currentWeek.viceCaptain = null;
        } else {
            currentWeek.viceCaptain = playerId;
            if (currentWeek.captain === playerId) {
                currentWeek.captain = null;
            }
        }
        await this._saveRootData(root);
        await this.updateDisplay();
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
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fpl_week_${currentWeek}_data.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async _getRootData() {
        const rawData = await this.storage.getItem(this.storageKey);
        if (!rawData) {
            // If no data, create and save default data
            const defaultData = { version: '2.0', currentWeek: 1, weeks: { 1: { players: [], captain: null, viceCaptain: null, isReadOnly: false } } };
            await this.storage.setItem(this.storageKey, JSON.stringify(defaultData));
            return defaultData;
        }
        try {
            // Always parse the latest data from storage
            const parsed = JSON.parse(rawData);
            // Detect legacy shape: { week, players, captain, viceCaptain }
            const isLegacy = !parsed.weeks && (Array.isArray(parsed.players) || typeof parsed.week !== 'undefined');
            if (isLegacy) {
                const legacyWeek = Number(parsed.week) || 1;
                const migrated = {
                    version: '2.0',
                    currentWeek: legacyWeek,
                    weeks: {
                        [legacyWeek]: {
                            players: Array.isArray(parsed.players) ? parsed.players : [],
                            captain: parsed.captain || null,
                            viceCaptain: parsed.viceCaptain || null,
                            isReadOnly: false
                        }
                    }
                };
                // Compute derived fields
                await this._ensureWeekDerivedFields(migrated, legacyWeek);
                await this.storage.setItem(this.storageKey, JSON.stringify(migrated));
                return migrated;
            }

            // Ensure derived fields exist for v2 data
            if (parsed && parsed.weeks) {
                const weekKeys = Object.keys(parsed.weeks);
                let mutated = false;
                for (const wk of weekKeys) {
                    const weekObj = parsed.weeks[wk];
                    if (weekObj && (!Array.isArray(weekObj.teamMembers) || !weekObj.teamStats || typeof weekObj.totalTeamCost === 'undefined')) {
                        await this._ensureWeekDerivedFields(parsed, wk);
                        mutated = true;
                    }
                }
                if (!parsed.version) {
                    parsed.version = '2.0';
                    mutated = true;
                }
                if (mutated) {
                    await this.storage.setItem(this.storageKey, JSON.stringify(parsed));
                }
            }

            return parsed;
        } catch (e) {
            console.error('Failed to parse root data, returning default.', e);
            // Fallback to default data in case of parsing error
            return { version: '2.0', currentWeek: 1, weeks: { 1: { players: [], captain: null, viceCaptain: null, isReadOnly: false } } };
        }
    }

    async _saveRootData(root) {
        root.version = root.version || '2.0';
        await this.storage.setItem(this.storageKey, JSON.stringify(root));
    }

    _computeTeamSnapshot(players) {
        // Minimal teamMembers shape expected by tests: [{ addedAt, playerId }]
        const inTeam = (players || []).filter(p => p.have);
        const teamMembers = inTeam.map(p => ({
            addedAt: p.addedAt || p.id, // use existing timestamp-like id if not present
            playerId: p.id
        }));
        const totalValue = inTeam.reduce((s, p) => s + (Number(p.price) || 0), 0);
        return {
            teamMembers,
            teamStats: {
                totalValue,
                playerCount: inTeam.length,
                updatedDate: new Date().toISOString()
            },
            totalTeamCost: totalValue
        };
    }

    // Ensure derived fields on a specific week are up-to-date based on its players
    async _ensureWeekDerivedFields(root, weekNumber) {
        const wn = String(weekNumber);
        const wk = root.weeks[wn];
        if (!wk) return;
        const { teamMembers, teamStats, totalTeamCost } = this._computeTeamSnapshot(wk.players || []);
        wk.teamMembers = teamMembers;
        wk.teamStats = teamStats;
        // Mirror total cost to a dedicated field as expected by tests
        wk.totalTeamCost = totalTeamCost;
    }

    async createNewWeek() {
        const root = await this._getRootData();
        const currentWeekNumber = root.currentWeek;

        if (root.weeks[currentWeekNumber]) {
            root.weeks[currentWeekNumber].isReadOnly = true;
            // Recompute derived fields for the week we are freezing
            await this._ensureWeekDerivedFields(root, currentWeekNumber);
        }

        const newWeekNumber = currentWeekNumber + 1;
        // Deep copy the current week's data to the new week
        root.weeks[newWeekNumber] = JSON.parse(JSON.stringify(root.weeks[currentWeekNumber] || { players: [], captain: null, viceCaptain: null }));
        root.weeks[newWeekNumber].isReadOnly = false;

        // Recompute derived fields for the new week as well
        await this._ensureWeekDerivedFields(root, newWeekNumber);

        root.currentWeek = newWeekNumber;
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async goToWeek(weekNumber) {
        const root = await this._getRootData();
        if (!root.weeks[weekNumber]) return;

        root.currentWeek = Number(weekNumber);
        await this._saveRootData(root);
        await this.updateDisplay();
    }

    async nextWeek() {
        const root = await this._getRootData();
        const maxWeek = Math.max(...Object.keys(root.weeks).map(n => Number(n)));
        const target = Math.min(root.currentWeek + 1, maxWeek);
        await this.goToWeek(target);
    }

    async prevWeek() {
        const root = await this._getRootData();
        const target = Math.max(1, root.currentWeek - 1);
        await this.goToWeek(target);
    }

    async getWeekCount() {
        const root = await this._getRootData();
        if (!root || !root.weeks) return 1;
        return Object.keys(root.weeks).length || 1;
    }

    async getCurrentWeekNumber() {
        const root = await this._getRootData();
        return root.currentWeek || 1;
    }

    async getWeekSnapshot(weekNumber) {
        const root = await this._getRootData();
        const wn = String(weekNumber || root.currentWeek);
        const wk = root.weeks[wn] || {};
        return JSON.parse(JSON.stringify({
            players: wk.players || [],
            captain: wk.captain || null,
            viceCaptain: wk.viceCaptain || null,
            isReadOnly: wk.isReadOnly || false,
            teamMembers: wk.teamMembers || [],
            teamStats: wk.teamStats || { totalValue: 0, playerCount: 0 }
        }));
    }

    async isWeekReadOnly(weekNumber) {
        const root = await this._getRootData();
        const week = root.weeks[weekNumber] || {};
        return !!week.isReadOnly;
    }

    async isCurrentWeekReadOnly() {
        const root = await this._getRootData();
        const week = root.weeks[root.currentWeek] || {};
        return !!week.isReadOnly;
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
