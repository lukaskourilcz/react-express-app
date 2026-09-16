// The weekly micro-league — the client wrapper for the caller's own cohort.
//
// There is one room to read and it is always your own: the request carries no
// cohort id, no rank and no score, because every one of those is the server's
// to decide. Nothing in this module is ever the source of a number.
//
// A tier is a label on a room. It unlocks nothing, and no screen built on this
// module may make it unlock anything.

import { apiFetch } from './api';

/** One row of the caller's cohort. Ranking is the order the server returned. */
export interface LeagueEntry {
  displayName: string;
  picture: string | null;
  correct: number;
  answered: number;
  accuracyPct: number;
  isSelf: boolean;
}

export interface LeagueBoard {
  subject: string;
  /** True when the learner has left the league. Then there is no room to show. */
  optedOut: boolean;
  /** Monday of the current league week, ISO date, or null when unseated. */
  weekStart: string | null;
  /** 1–5, or null when the caller is not in a room. */
  tier: number | null;
  entries: LeagueEntry[];
}

// `api/user/[op].ts` is a dynamic route: the last path segment *is* the op.
const OP = (op: string) => `/api/user/${op}`;

export const getLeagueBoard = (subject: string): Promise<LeagueBoard> =>
  apiFetch<LeagueBoard>(`${OP('league-board')}?subject=${encodeURIComponent(subject)}`);

export const setLeagueOptout = (optedOut: boolean): Promise<{ optedOut: boolean }> =>
  apiFetch(OP('league-optout'), { method: 'PUT', body: JSON.stringify({ optedOut }) });

/** Sunday of the week that starts on `weekStart`, for the deadline line.
 * Parsed as UTC because the server's week is UTC; a local parse would show the
 * wrong day to anybody west of Greenwich. */
export function leagueWeekEnd(weekStart: string | null): Date | null {
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return null;
  const start = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
}
