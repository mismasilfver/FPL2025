const DEFAULT_TEAM_STATS = {
    totalValue: 0,
    playerCount: 0,
    updatedDate: new Date().toISOString()
};

const DEFAULT_WEEK_STRUCTURE = {
    players: [],
    captain: null,
    viceCaptain: null,
    teamMembers: [],
    teamStats: DEFAULT_TEAM_STATS,
    totalTeamCost: 0,
    isReadOnly: false,
    notes: ''
};

/**
 * Provides a set of static methods for creating, normalizing, and validating week data.
 * This class ensures data consistency and provides a single source of truth for week structure.
 */
export class WeekModel {
    /**
     * Creates a default week object with a specified week number.
     * @param {number} [weekNumber=1] - The week number for the new week.
     * @returns {object} A new week object with default values.
     */
    static createDefault(weekNumber = 1) {
        return {
            ...this.clone(DEFAULT_WEEK_STRUCTURE),
            weekNumber,
            teamStats: { ...DEFAULT_TEAM_STATS, updatedDate: new Date().toISOString() }
        };
    }

    /**
     * Normalizes a week object to ensure it conforms to the expected structure.
     * @param {object} weekData - The raw week data to normalize.
     * @param {number} weekNumber - The week number to assign.
     * @returns {object} A normalized week object.
     */
    static normalize(weekData, weekNumber) {
        if (!this.validate(weekData, true)) {
            return this.createDefault(weekNumber);
        }

        const defaultWeek = this.createDefault(weekNumber);
        const normalized = { ...defaultWeek, ...weekData };

        normalized.players = Array.isArray(weekData.players) ? weekData.players : [];
        normalized.teamMembers = Array.isArray(weekData.teamMembers) ? weekData.teamMembers : [];
        normalized.captain = weekData.captain ?? null;
        normalized.viceCaptain = weekData.viceCaptain ?? null;
        normalized.isReadOnly = Boolean(weekData.isReadOnly);
        normalized.notes = weekData.notes || '';
        normalized.teamStats = weekData.teamStats && typeof weekData.teamStats === 'object'
            ? { ...DEFAULT_TEAM_STATS, ...weekData.teamStats }
            : { ...DEFAULT_TEAM_STATS, updatedDate: new Date().toISOString() };

        return normalized;
    }

    /**
     * Computes team statistics and member list from a list of players.
     * @param {Array<object>} players - The list of players for the week.
     * @returns {{teamMembers: Array, teamStats: object, totalTeamCost: number}} Snapshot of team data.
     */
        static computeTeamSnapshot(players, weekNumber) {
        if (!Array.isArray(players)) {
            return { teamMembers: [], teamStats: { ...DEFAULT_TEAM_STATS }, totalTeamCost: 0 };
        }

        const inTeam = players.filter(p => p.have);
        const teamMembers = inTeam.map(p => ({ 
            addedAt: p.addedAt || weekNumber, 
            playerId: p.id 
        }));
        const totalValue = inTeam.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

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

    /**
     * Creates a deep clone of a week object.
     * @param {object} weekData - The week object to clone.
     * @returns {object | null} A deep copy of the week object or null if input is invalid.
     */
    static clone(weekData) {
        if (!weekData) return null;
        try {
            return JSON.parse(JSON.stringify(weekData));
        } catch (e) {
            return null;
        }
    }

    /**
     * Validates the basic structure of a week object.
     * @param {object} weekData - The week object to validate.
     * @param {boolean} [allowPartial=false] - If true, allows for missing optional fields.
     * @returns {boolean} True if the week object is valid, otherwise false.
     */
    static validate(weekData, allowPartial = false) {
        if (!weekData || typeof weekData !== 'object' || Array.isArray(weekData)) {
            return false;
        }
        if (allowPartial) {
            return true; // Basic object check is enough for partial validation before normalization
        }
        if (typeof weekData.weekNumber !== 'number' || !Number.isInteger(weekData.weekNumber)) {
            return false;
        }
        if (!Array.isArray(weekData.players)) {
            return false;
        }
        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports.WeekModel = WeekModel;
}
