const { WeekModel } = require('../../js/models/week-model.js');

describe('WeekModel', () => {
    describe('createDefault()', () => {
        it('should create a default week structure with week number', () => {
            const week = WeekModel.createDefault(1);
            expect(week).toEqual({
                weekNumber: 1,
                players: [],
                captain: null,
                viceCaptain: null,
                teamMembers: [],
                teamStats: { totalValue: 0, playerCount: 0, updatedDate: expect.any(String) },
                totalTeamCost: 0,
                isReadOnly: false,
                notes: ''
            });
        });

        it('should default to week 1 if no week number is provided', () => {
            const week = WeekModel.createDefault();
            expect(week.weekNumber).toBe(1);
        });
    });

    describe('normalize()', () => {
        it('should return a default week structure for null or invalid input', () => {
            const expectedStructure = {
                weekNumber: 1,
                players: [],
                captain: null,
                viceCaptain: null,
                teamMembers: [],
                teamStats: { totalValue: 0, playerCount: 0, updatedDate: expect.any(String) },
                totalTeamCost: 0,
                isReadOnly: false,
                notes: ''
            };

            expect(WeekModel.normalize(null, 1)).toEqual(expect.objectContaining(expectedStructure));
            expect(WeekModel.normalize({}, 1)).toEqual(expect.objectContaining(expectedStructure));
            expect(WeekModel.normalize([], 1)).toEqual(expect.objectContaining(expectedStructure));
        });

        it('should normalize a partial week object, filling in missing fields', () => {
            const partialWeek = {
                players: [{ id: 1, name: 'Player A' }],
                captain: 1
            };
            const normalized = WeekModel.normalize(partialWeek, 2);
            expect(normalized).toEqual(expect.objectContaining({
                weekNumber: 2,
                players: [expect.objectContaining({ id: 1, name: 'Player A' })],
                captain: 1,
                viceCaptain: null,
                isReadOnly: false,
                notes: ''
            }));
        });

        it('should ensure players and teamMembers are arrays', () => {
            const weekWithInvalidArrays = {
                players: 'not-an-array',
                teamMembers: { id: 1 }
            };
            const normalized = WeekModel.normalize(weekWithInvalidArrays, 1);
            expect(Array.isArray(normalized.players)).toBe(true);
            expect(Array.isArray(normalized.teamMembers)).toBe(true);
        });

        it('should handle nullish values for captain and viceCaptain', () => {
            const week = { captain: undefined, viceCaptain: 0 };
            const normalized = WeekModel.normalize(week, 1);
            expect(normalized.captain).toBeNull();
            expect(normalized.viceCaptain).toBe(0);
        });

        it('should normalize FPL metadata on players', () => {
            const week = {
                players: [
                    {
                        id: '1',
                        name: 'Raya',
                        fplId: '1',
                        nowCostTenths: 60,
                        totalPoints: 162,
                        eventPoints: 0,
                        form: 0,
                        availability: 'available'
                    }
                ]
            };
            const normalized = WeekModel.normalize(week, 1);
            const player = normalized.players[0];
            expect(player.fplId).toBe('1');
            expect(player.nowCostTenths).toBe(60);
            expect(player.totalPoints).toBe(162);
            expect(player.eventPoints).toBe(0);
            expect(player.form).toBe(0);
            expect(player.availability).toBe('available');
        });

        it('should set default FPL metadata on players when missing', () => {
            const week = { players: [{ id: '1', name: 'Player A' }] };
            const normalized = WeekModel.normalize(week, 1);
            const player = normalized.players[0];
            expect(player.fplId).toBe('');
            expect(player.nowCostTenths).toBe(0);
            expect(player.totalPoints).toBe(0);
            expect(player.eventPoints).toBe(0);
            expect(player.form).toBe(0);
            expect(player.availability).toBe('unknown');
        });
    });

    describe('computeTeamSnapshot()', () => {
        const players = [
            { id: 1, name: 'Player A', have: true, price: 10.5 },
            { id: 2, name: 'Player B', have: false, price: 5.5 },
            { id: 3, name: 'Player C', have: true, price: 8.0 },
            { id: 4, name: 'Player D', have: true, price: 'invalid' },
        ];

        it('should compute team stats correctly from a list of players', () => {
            const snapshot = WeekModel.computeTeamSnapshot(players, 1);
            expect(snapshot.teamStats.playerCount).toBe(3);
            expect(snapshot.teamStats.totalValue).toBeCloseTo(18.5);
            expect(snapshot.totalTeamCost).toBeCloseTo(18.5);
            expect(snapshot.teamStats.updatedDate).toEqual(expect.any(String));
        });

        it('should extract teamMembers from players with the have flag', () => {
            const snapshot = WeekModel.computeTeamSnapshot(players, 1);
            expect(snapshot.teamMembers).toHaveLength(3);
            expect(snapshot.teamMembers.map(m => m.playerId)).toEqual([1, 3, 4]);
        });

        it('should return a zero-state snapshot for empty or invalid player list', () => {
            const snapshot = WeekModel.computeTeamSnapshot([], 1);
            expect(snapshot.teamStats.playerCount).toBe(0);
            expect(snapshot.teamStats.totalValue).toBe(0);
            expect(snapshot.teamMembers).toEqual([]);
        });
    });

    describe('clone()', () => {
        it('should create a deep copy of a week object', () => {
            const originalWeek = {
                weekNumber: 1,
                players: [{ id: 1, name: 'Player A' }],
                teamStats: { totalValue: 10.5, playerCount: 1 }
            };
            const clonedWeek = WeekModel.clone(originalWeek);

            expect(clonedWeek).toEqual(originalWeek);
            expect(clonedWeek).not.toBe(originalWeek);
            expect(clonedWeek.players).not.toBe(originalWeek.players);
            expect(clonedWeek.players[0]).not.toBe(originalWeek.players[0]);
            expect(clonedWeek.teamStats).not.toBe(originalWeek.teamStats);
        });
    });

    describe('validate()', () => {
        it('should return true for a valid week structure', () => {
            const validWeek = WeekModel.createDefault(1);
            expect(WeekModel.validate(validWeek)).toBe(true);
        });

        it('should return false for an invalid week structure', () => {
            expect(WeekModel.validate(null)).toBe(false);
            expect(WeekModel.validate({})).toBe(false);
            expect(WeekModel.validate({ players: 'not-an-array' })).toBe(false);
            expect(WeekModel.validate({ weekNumber: 'one' })).toBe(false);
        });
    });
});