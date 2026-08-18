import { WeekModel } from '../models/week-model.js';

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function createDefaultTeam(id, name, type = 'whatif') {
  return {
    id,
    name,
    type,
    fplEntryId: null,
    currentWeek: 1,
    weeks: { 1: WeekModel.createDefault(1) },
    totalPoints: 0,
    gameweekPoints: {},
  };
}

/**
 * Service for managing multiple teams (one primary + what-if teams).
 */
class TeamService {
  getCurrentTeam(root) {
    if (!root || !root.teams) return null;
    const teamId = root.currentTeam || Object.keys(root.teams)[0];
    return root.teams[teamId] || null;
  }

  getPrimaryTeam(root) {
    if (!root || !root.teams) return null;
    return Object.values(root.teams).find((t) => t.type === 'primary') || null;
  }

  createTeam(root, name, type = 'whatif') {
    const id = slugify(name);
    if (!root.teams) root.teams = {};
    if (root.teams[id]) {
      throw new Error('Team already exists');
    }

    if (type === 'primary') {
      const existingPrimary = this.getPrimaryTeam(root);
      if (existingPrimary) {
        existingPrimary.type = 'whatif';
      }
    }

    root.teams[id] = createDefaultTeam(id, name, type);
    root.currentTeam = id;
    return root;
  }

  switchTeam(root, teamId) {
    if (!root.teams || !root.teams[teamId]) {
      throw new Error('Team not found');
    }
    root.currentTeam = teamId;
    return root;
  }

  deleteTeam(root, teamId) {
    const team = root.teams?.[teamId];
    if (!team) return root;

    if (team.type === 'primary') {
      throw new Error('Cannot delete the primary team');
    }

    delete root.teams[teamId];

    if (root.currentTeam === teamId) {
      const primary = this.getPrimaryTeam(root);
      root.currentTeam = primary ? primary.id : Object.keys(root.teams)[0];
    }

    return root;
  }

  setPrimaryTeam(root, teamId) {
    if (!root.teams || !root.teams[teamId]) {
      throw new Error('Team not found');
    }

    Object.values(root.teams).forEach((team) => {
      team.type = team.id === teamId ? 'primary' : 'whatif';
    });

    return root;
  }

  setFplEntryId(root, entryId) {
    if (!root.settings) root.settings = {};
    root.settings.fplEntryId = entryId;

    const primary = this.getPrimaryTeam(root);
    if (primary) {
      primary.fplEntryId = entryId;
    }

    return root;
  }

  getFplEntryId(root) {
    return root.settings?.fplEntryId || this.getPrimaryTeam(root)?.fplEntryId || null;
  }
}

export default TeamService;
