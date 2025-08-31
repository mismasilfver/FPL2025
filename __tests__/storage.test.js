/**
 * @jest-environment jsdom
 */

// We need to import the classes from script.js. Since it's not a module, we'll load it via fs.
const fs = require('fs');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Mock the DOM environment
document.body.innerHTML = `
    <div id="player-modal"></div>
    <input id="player-name" />
`;

// Evaluate the script content in the global scope to make classes available
eval(scriptContent);

describe('StorageService', () => {
    const storageKey = 'fpl-team-data-test';
    let storageService;

    beforeEach(() => {
        localStorage.clear();
        storageService = new StorageService(storageKey);
    });

    describe('v2 saving behavior (p1-09)', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        test('saveToStorage writes minimal teamMembers and totalTeamCost; preserves version/currentWeek', () => {
            const svc = new StorageService(storageKey);
            const players = [
                { id: 'p1', name: 'A', position: 'midfield', team: 'AAA', price: 6.5, have: true, notes: 'x', status: 'green' },
                { id: 'p2', name: 'B', position: 'defence', team: 'BBB', price: 4.0, have: false, notes: '', status: 'yellow' },
                { id: 'p3', name: 'C', position: 'forward', team: 'CCC', price: 7.2, have: true, notes: '', status: 'green' }
            ];
            const captain = 'p3';
            const viceCaptain = 'p1';
            const currentWeek = 1;

            svc.saveToStorage(1, { players, captain, viceCaptain }, currentWeek);

            const stored = JSON.parse(localStorage.getItem(storageKey));
            expect(stored.version).toBe('2.0');
            expect(stored.currentWeek).toBe(1);
            const w1 = stored.weeks['1'] || stored.weeks[1];
            expect(w1.players).toEqual(players);
            expect(w1.captain).toBe(captain);
            expect(w1.viceCaptain).toBe(viceCaptain);

            const expectedTeamMembers = players.filter(p => p.have).map(p => ({ playerId: p.id, addedAt: 1 }));
            expect(w1.teamMembers).toEqual(expectedTeamMembers);
            (w1.teamMembers || []).forEach(tm => {
                expect(Object.keys(tm).sort()).toEqual(['addedAt','playerId']);
            });
            const expectedCost = players.filter(p => p.have).reduce((s, p) => s + (Number(p.price) || 0), 0);
            expect(w1.totalTeamCost).toBeCloseTo(expectedCost, 5);
            // Backward compatibility: teamStats mirrors totals
            expect(w1.teamStats).toBeDefined();
            expect(w1.teamStats.totalValue).toBeCloseTo(expectedCost, 5);
        });

        test('saveToStorage supports multiple weeks and preserves earlier weeks', () => {
            const svc = new StorageService(storageKey);
            const playersW1 = [
                { id: 'p1', name: 'A', position: 'midfield', team: 'AAA', price: 6.5, have: true, notes: 'x', status: 'green' }
            ];
            svc.saveToStorage(1, { players: playersW1, captain: 'p1', viceCaptain: null }, 1);

            const playersW2 = [
                { id: 'p1', name: 'A', position: 'midfield', team: 'AAA', price: 6.5, have: true, notes: 'x', status: 'green' },
                { id: 'p2', name: 'B', position: 'defence', team: 'BBB', price: 4.0, have: true, notes: '', status: 'yellow' }
            ];
            svc.saveToStorage(2, { players: playersW2, captain: 'p2', viceCaptain: 'p1' }, 2);

            const stored = JSON.parse(localStorage.getItem(storageKey));
            expect(stored.version).toBe('2.0');
            expect(stored.currentWeek).toBe(2);
            // week 1 preserved
            const w1 = stored.weeks['1'] || stored.weeks[1];
            expect(w1.players).toEqual(playersW1);
            // week 2 written
            const w2 = stored.weeks['2'] || stored.weeks[2];
            expect(w2.players).toEqual(playersW2);
            expect(w2.captain).toBe('p2');
            expect(w2.viceCaptain).toBe('p1');
            const expectedTeamMembersW2 = playersW2.filter(p => p.have).map(p => ({ playerId: p.id, addedAt: 2 }));
            expect(w2.teamMembers).toEqual(expectedTeamMembersW2);
            const expectedCostW2 = playersW2.filter(p => p.have).reduce((s, p) => s + (Number(p.price) || 0), 0);
            expect(w2.totalTeamCost).toBeCloseTo(expectedCostW2, 5);
        });
    });

    describe('backward compatibility readers (p1-08)', () => {
        const fixturesDir = path.resolve(__dirname, 'fixtures');
        const legacyKey = 'fpl-team';

        beforeEach(() => {
            localStorage.clear();
        });

        test('loadFromStorage returns equivalent state for legacy v1 after migrate', () => {
            const v1 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1.sample.json'), 'utf8'));
            localStorage.setItem(legacyKey, JSON.stringify(v1));

            const svc = new StorageService(storageKey);
            // ensure migration path is exercised as part of loading flow
            svc.migrateStorageIfNeeded();
            const state = svc.loadFromStorage();

            expect(state.players).toEqual(v1.players);
            expect(state.captain).toBe(v1.captain || null);
            expect(state.viceCaptain).toBe(v1.viceCaptain || null);
            expect(state.currentWeek).toBe(1);
        });

        test('loadFromStorage returns week data for native v2 store', () => {
            const v2 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v2.sample.json'), 'utf8'));
            localStorage.setItem(storageKey, JSON.stringify(v2));

            const svc = new StorageService(storageKey);
            const state = svc.loadFromStorage();

            const w1 = v2.weeks['1'] || v2.weeks[1];
            expect(state.players).toEqual(w1.players);
            expect(state.captain).toBe(w1.captain || null);
            expect(state.viceCaptain).toBe(w1.viceCaptain || null);
            expect(state.currentWeek).toBe(v2.currentWeek || 1);
        });
    });

    describe('migration persistence wrapper (p1-07)', () => {
        const fixturesDir = path.resolve(__dirname, 'fixtures');
        const legacyKey = 'fpl-team';
        const backupKey = 'fpl-team-backup-v1';

        beforeEach(() => {
            localStorage.clear();
        });

        test('backs up v1, writes v2 to primary key, sets version=2.0', () => {
            const v1 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1.sample.json'), 'utf8'));
            localStorage.setItem(legacyKey, JSON.stringify(v1));

            const svc = new StorageService(storageKey);
            expect(svc.needsMigration()).toBe(true);
            svc.migrateStorageIfNeeded();

            // backup exists and equals original
            const backup = JSON.parse(localStorage.getItem(backupKey));
            expect(backup).toEqual(v1);

            // v2 written under storageKey and matches pure migration output
            const v2Stored = JSON.parse(localStorage.getItem(storageKey));
            const fn = typeof migrateV1ToV2 === 'function' ? migrateV1ToV2 : global.migrateV1ToV2;
            expect(v2Stored).toEqual(fn(v1));
            expect(v2Stored.version).toBe('2.0');
            expect(v2Stored.currentWeek).toBe(1);

            // legacy key remains (non-destructive)
            expect(localStorage.getItem(legacyKey)).not.toBeNull();
        });

        test('no-op if v2 already present: does not overwrite or create backup', () => {
            const v2Fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v2.sample.json'), 'utf8'));
            localStorage.setItem(storageKey, JSON.stringify(v2Fixture));

            const svc = new StorageService(storageKey);
            expect(svc.needsMigration()).toBe(false);
            svc.migrateStorageIfNeeded();

            // backup not created
            expect(localStorage.getItem(backupKey)).toBeNull();
            // data unchanged
            expect(JSON.parse(localStorage.getItem(storageKey))).toEqual(v2Fixture);
        });
    });

    describe('migration idempotency (p1-06)', () => {
        const fixturesDir = path.resolve(__dirname, 'fixtures');

        test('running migrateV1ToV2 on v1 then again yields identical v2 data', () => {
            const v1 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1.sample.json'), 'utf8'));
            const fn = typeof migrateV1ToV2 === 'function' ? migrateV1ToV2 : global.migrateV1ToV2;
            const v2a = fn(v1);
            const v2b = fn(v2a);
            expect(v2b).toEqual(v2a);
        });

        test('calling migrateV1ToV2 on already-v2 data returns equivalent v2 (no double-wrapping)', () => {
            const v2Fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v2.sample.json'), 'utf8'));
            const fn = typeof migrateV1ToV2 === 'function' ? migrateV1ToV2 : global.migrateV1ToV2;
            const v2out = fn(v2Fixture);
            expect(v2out).toEqual(v2Fixture);
        });
    });

    afterEach(() => {
        localStorage.clear();
    });

    test('should save and load data for a specific week', () => {
        const week1Data = { 
            players: [{ id: '1', name: 'Player A' }], 
            captain: '1', 
            viceCaptain: null 
        };
        storageService.saveToStorage(1, week1Data, 1);

        const loadedData = storageService.loadFromStorage();
        expect(loadedData.players).toEqual(week1Data.players);
        expect(loadedData.captain).toBe('1');
        expect(loadedData.currentWeek).toBe(1);
    });

    test('should return the correct week count', () => {
        storageService.saveToStorage(1, { players: [] }, 1);
        storageService.saveToStorage(2, { players: [] }, 2);
        expect(storageService.getWeekCount()).toBe(2);
    });

    test('should return a snapshot for a specific week', () => {
        const week2Data = { players: [{ id: '2', name: 'Player B' }] };
        storageService.saveToStorage(1, { players: [{ id: '1' }] }, 2);
        storageService.saveToStorage(2, week2Data, 2);

        const snapshot = storageService.getWeekSnapshot(2);
        expect(snapshot.players).toEqual(week2Data.players);
    });

    test('should return default empty state if no data is in storage', () => {
        const loadedData = storageService.loadFromStorage();
        expect(loadedData).toEqual({ 
            players: [], 
            captain: null, 
            viceCaptain: null, 
            currentWeek: 1 
        });
    });

    describe('migration execution (p1-04)', () => {
        const fixturesDir = path.resolve(__dirname, 'fixtures');

        test('migrateV1ToV2 converts single-week v1 to v2 weeks[1] with players, captain/vice, teamMembers, and totalTeamCost', () => {
            const v1 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1.sample.json'), 'utf8'));
            // Ensure function exists (to be implemented in p1-05) — this will fail now
            expect(typeof global.migrateV1ToV2 === 'function' || typeof migrateV1ToV2 === 'function').toBe(true);

            const fn = typeof migrateV1ToV2 === 'function' ? migrateV1ToV2 : global.migrateV1ToV2;
            const v2 = fn(v1);

            expect(v2).toBeTruthy();
            expect(v2.version).toBe('2.0');
            expect(v2.currentWeek).toBe(1);

            const w1 = v2.weeks && (v2.weeks['1'] || v2.weeks[1]);
            expect(w1).toBeTruthy();
            // players preserved fully (array equality)
            expect(w1.players).toEqual(v1.players);
            // assert deep equality for individual fields per player
            expect(Array.isArray(w1.players)).toBe(true);
            expect(w1.players.length).toBe(v1.players.length);
            w1.players.forEach((p, idx) => {
                const src = v1.players[idx];
                expect(p.id).toBe(src.id);
                expect(p.name).toBe(src.name);
                expect(p.position).toBe(src.position);
                expect(p.team).toBe(src.team);
                expect(p.price).toBe(src.price);
                expect(p.have).toBe(src.have);
                expect(p.notes).toBe(src.notes);
                expect(p.status).toBe(src.status);
            });
            // captaincy preserved
            expect(w1.captain).toBe(v1.captain || null);
            expect(w1.viceCaptain).toBe(v1.viceCaptain || null);
            // teamMembers derived only from have === true (and minimal schema)
            const expectedTeamMembers = v1.players.filter(p => p.have).map(p => ({ playerId: p.id, addedAt: 1 }));
            expect(w1.teamMembers).toEqual(expectedTeamMembers);
            // Ensure no extra properties beyond schema in teamMembers
            (w1.teamMembers || []).forEach(tm => {
                const keys = Object.keys(tm).sort();
                expect(keys).toEqual(['addedAt','playerId']);
            });
            // totalTeamCost = sum of prices for have === true
            const expectedCost = v1.players.filter(p => p.have).reduce((s, p) => s + (Number(p.price) || 0), 0);
            expect(w1.totalTeamCost).toBeCloseTo(expectedCost, 5);
        });

        test('migrateV1ToV2 does not mutate input object', () => {
            const v1 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1.sample.json'), 'utf8'));
            const original = JSON.stringify(v1);
            expect(typeof global.migrateV1ToV2 === 'function' || typeof migrateV1ToV2 === 'function').toBe(true);
            const fn = typeof migrateV1ToV2 === 'function' ? migrateV1ToV2 : global.migrateV1ToV2;
            fn(v1);
            expect(JSON.stringify(v1)).toBe(original);
        });
    });

    test('should migrate old data format to new weekly format', () => {
        const oldDataKey = 'fpl-team';
        const oldData = {
            players: [{ id: '1', name: 'Old Player' }],
            captain: '1',
            viceCaptain: null
        };
        localStorage.setItem(oldDataKey, JSON.stringify(oldData));

        // The migration is called in the FPLTeamManager constructor, so we instantiate it
        // We'll need a mock StorageService for this test to work as intended.
        const serviceWithMigration = new StorageService('fpl-team-data');
        serviceWithMigration.migrateStorageIfNeeded();

        const migratedData = JSON.parse(localStorage.getItem('fpl-team-data'));
        expect(migratedData.version).toBe('2.0');
        expect(migratedData.currentWeek).toBe(1);
        expect(migratedData.weeks['1'].players).toEqual(oldData.players);
        expect(localStorage.getItem(oldDataKey)).not.toBeNull(); // We don't remove old key by default
    });

    describe('migration detection (p1-02)', () => {
        const fixturesDir = path.resolve(__dirname, 'fixtures');

        test('detects v1 store and reports needsMigration=true', () => {
            const v1 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v1.sample.json'), 'utf8'));
            localStorage.setItem('fpl-team', JSON.stringify(v1));

            const svc = new StorageService(storageKey);
            // Methods to be implemented in p1-03, this test should fail now
            expect(typeof svc.getVersion).toBe('function');
            expect(typeof svc.needsMigration).toBe('function');
            expect(svc.getVersion()).toBe('1.0');
            expect(svc.needsMigration()).toBe(true);
        });

        test('detects v2 store and reports needsMigration=false', () => {
            const v2 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'v2.sample.json'), 'utf8'));
            localStorage.setItem(storageKey, JSON.stringify(v2));

            const svc = new StorageService(storageKey);
            expect(svc.getVersion()).toBe('2.0');
            expect(svc.needsMigration()).toBe(false);
        });

        test('empty store: getVersion() returns null and needsMigration=false', () => {
            const svc = new StorageService(storageKey);
            expect(svc.getVersion()).toBeNull();
            expect(svc.needsMigration()).toBe(false);
        });
    });
});
