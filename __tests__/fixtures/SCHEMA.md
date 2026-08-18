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

## v3 (FPL metadata, weekly, versioned)

- version: '3.0'
- currentWeek: number (>= 1)
- weeks: Record<string, Week>

Week:
- players: Array<Player>
- teamMembers: Array<TeamMember>
- captain: string | null (player id)
- viceCaptain: string | null (player id)
- totalTeamCost: number (sum of `price` for players with `have === true`)

Player (v3 extends v2 with FPL metadata):
- id: string
- fplId: string (empty if not linked to FPL)
- name: string
- firstName: string (optional)
- lastName: string (optional)
- position: 'goalkeeper' | 'defence' | 'midfield' | 'forward'
- team: string (short code)
- price: number (in £m)
- nowCostTenths: number (cost in tenths of £m, e.g. 125 = £12.5m)
- have: boolean (is in team this week)
- notes: string
- status: 'green' | 'yellow' | 'red'
- totalPoints: number (FPL season total points)
- eventPoints: number (FPL points in current gameweek)
- form: number (FPL form value)
- availability: 'available' | 'doubt' | 'injured' | 'suspended' | 'unavailable' | 'unknown'
- news: string (optional, FPL news string)

Notes:
- FPL metadata fields are normalized to defaults for players that predate v3.
- nowCostTenths and price both represent cost; price is in £m, nowCostTenths is raw FPL value.
