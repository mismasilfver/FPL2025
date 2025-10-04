# Data Schemas

This document defines the legacy v1 schema and the new v2 weekly schema used by the FPL app.

## v1 (legacy, single-week)

- players: Array<Player>
- captain: string | null (player id)
- viceCaptain: string | null (player id)

Player:
- id: string
- name: string
- position: 'goalkeeper' | 'defence' | 'midfield' | 'forward'
- team: string (short code)
- price: number
- have: boolean (is in team this week)
- notes: string
- status: 'green' | 'yellow' | 'red'

Example: see `v1.sample.json`.

## v2 (weekly, versioned)

- version: '2.0'
- currentWeek: number (>= 1)
- weeks: Record<string, Week>

Week:
- players: Array<Player> (same Player shape as v1)
- teamMembers: Array<TeamMember>
- captain: string | null (player id)
- viceCaptain: string | null (player id)
- totalTeamCost: number (sum of `price` for players with `have === true`)

TeamMember:
- playerId: string
- addedAt: number (week number when added)

Notes:
- Historical composition is preserved via `teamMembers` per week.
- Only `currentWeek` is editable; previous weeks are read-only.
- Migration v1 -> v2 places all v1 data under `weeks['1']` and sets `currentWeek = 1`.

Example: see `v2.sample.json`.
