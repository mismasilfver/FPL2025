const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');

// Set up TextEncoder/TextDecoder before requiring JSDOM
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Now require JSDOM
const { JSDOM } = require('jsdom');

// Set up a basic DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

// Add any missing globals that might be needed
global.localStorage = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = String(value);
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

// Mock the StorageService
class MockStorageService {
    constructor() {
        // Initialize with default data
        this.reset();
    }
    
    reset() {
        this.data = {
            currentWeek: 1,
            weeks: {
                1: {
                    players: [],
                    captain: null,
                    viceCaptain: null,
                    teamMembers: [],
                    teamStats: { totalCost: 0, teamValue: 0 }
                }
            }
        };
    }

    async getRootData() {
        return Promise.resolve(this.data);
    }

    async saveRootData(data) {
        this.data = { ...this.data, ...data };
        return Promise.resolve();
    }

    async getWeekCount() {
        return Object.keys(this.data.weeks).length;
    }

    async getWeekSnapshot(weekNum) {
        return this.data.weeks[weekNum] || null;
    }

    async createNewWeek() {
        const weekCount = await this.getWeekCount();
        const newWeek = weekCount + 1;
        
        // Copy the previous week's data
        const prevWeek = this.data.weeks[weekCount];
        this.data.weeks[newWeek] = {
            ...prevWeek,
            players: JSON.parse(JSON.stringify(prevWeek.players)),
            teamMembers: [...prevWeek.teamMembers]
        };
        
        this.data.currentWeek = newWeek;
        return { ...this.data };
    }

    async goToWeek(weekNum) {
        if (this.data.weeks[weekNum]) {
            this.data.currentWeek = weekNum;
            return { ...this.data };
        }
        throw new Error(`Week ${weekNum} does not exist`);
    }
}

// Mock the UIManager
class MockUIManager {
    constructor() {
        this.initElements = jest.fn();
        this.bindEvents = jest.fn();
        this.updateDisplay = jest.fn();
        this.renderWeekControls = jest.fn();
        this.renderSummary = jest.fn();
        this.renderCaptaincyInfo = jest.fn();
        this.renderPlayers = jest.fn();
    }
}

// Mock FPLTeamManager
class MockFPLTeamManager {
    constructor({ ui, storage } = {}) {
        this.ui = ui || new MockUIManager();
        this.storage = storage || new MockStorageService();
        this.state = () => ({
            currentWeek: 1,
            weeks: {
                1: {
                    players: [],
                    captain: null,
                    viceCaptain: null,
                    teamMembers: [],
                    teamStats: { totalCost: 0, teamValue: 0 }
                }
            }
        });
    }

    async loadStateFromStorage() {
        const data = await this.storage.loadFromStorage();
        this.state = () => data;
        return data;
    }

    getCurrentWeekNumber() {
        return this.state().currentWeek;
    }

    getWeekCount() {
        return Object.keys(this.state().weeks).length;
    }

    isWeekReadOnly(weekNum) {
        const week = this.state().weeks[weekNum];
        return week && (week.readOnly || weekNum < this.getCurrentWeekNumber());
    }

    isCurrentWeekReadOnly() {
        return false;
    }

    getWeekSnapshot(weekNum) {
        return this.state().weeks[weekNum] || null;
    }

    async createNewWeek() {
        const weekCount = this.getWeekCount();
        const newWeek = weekCount + 1;
        
        // Copy the previous week's data
        const prevWeek = this.state().weeks[weekCount];
        this.state().weeks[newWeek] = {
            ...prevWeek,
            players: JSON.parse(JSON.stringify(prevWeek.players)),
            teamMembers: [...prevWeek.teamMembers]
        };
        
        this.state().currentWeek = newWeek;
        return this.state();
    }

    async goToWeek(weekNum) {
        if (this.state().weeks[weekNum]) {
            this.state().currentWeek = weekNum;
            return this.state();
        }
        throw new Error(`Week ${weekNum} does not exist`);
    }

    async nextWeek() {
        const nextWeek = this.state().currentWeek + 1;
        return this.goToWeek(nextWeek);
    }

    async prevWeek() {
        const prevWeek = this.state().currentWeek - 1;
        return this.goToWeek(prevWeek);
    }

    setCaptain(playerId) {
        const currentWeek = this.getCurrentWeekNumber();
        if (this.isWeekReadOnly(currentWeek)) {
            return false;
        }
        this.state().weeks[currentWeek].captain = playerId;
        return true;
    }

    calculateTotalCost() {
        return this.state().weeks[this.state().currentWeek].players
            .filter(p => p.have)
            .reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
    }
}

module.exports = {
    MockStorageService,
    MockUIManager,
    MockFPLTeamManager
};
