// Forgiving streaks — the read/config wrapper for streak freezes (S4). Each
// learner gets a small monthly freeze budget that bridges missed school days;
// configurable off-days never break a streak. Freezes are NEVER a shop item and
// are never client-settable — the only user-writable field is the off-days set.
//
// `getFreezes` is a read and degrades gracefully (never throws into render).
// `setOffDays` is an explicit user action: it returns the authoritative new
// state on success and throws an ApiError on failure so the caller's save
// handler can surface a save error — it is never called during render.

import { apiFetch } from './api';

/** The live freeze budget + off-day configuration. */
export interface FreezeState {
  /** Freezes left this period. */
  remaining: number;
  /** Budget period, 'YYYY-MM'. */
  period: string;
  /** ISO dates (YYYY-MM-DD) a freeze has been spent on this period. */
  used: string[];
  /** Off-days, 0=Sunday … 6=Saturday. Weekend default is [0, 6]. */
  offDays: number[];
}

/** Mirrors the server default so the offline fallback matches a fresh account. */
export const DEFAULT_OFF_DAYS: number[] = [0, 6];

const FREEZES_URL = '/api/user/freezes';

const currentPeriod = (): string => new Date().toISOString().slice(0, 7);

/** Coerce 0–6 integers, de-duplicated and sorted; drops anything invalid. */
export function sanitizeOffDays(input: number[]): number[] {
  const set = new Set<number>();
  for (const value of input) {
    if (Number.isInteger(value) && value >= 0 && value <= 6) set.add(value);
  }
  return [...set].sort((a, b) => a - b);
}

function normalize(res: Partial<FreezeState>): FreezeState {
  return {
    remaining: Number(res.remaining) || 0,
    period: typeof res.period === 'string' && res.period ? res.period : currentPeriod(),
    used: Array.isArray(res.used) ? res.used.filter((d): d is string => typeof d === 'string') : [],
    offDays: Array.isArray(res.offDays) ? sanitizeOffDays(res.offDays.map(Number)) : [...DEFAULT_OFF_DAYS],
  };
}

/**
 * Read the current freeze budget + off-days. Never throws: offline /
 * signed-out / migration-missing resolve to a safe empty state (0 remaining,
 * current period, weekend off-days) so the profile can still render.
 */
export async function getFreezes(): Promise<FreezeState> {
  try {
    const res = await apiFetch<Partial<FreezeState>>(FREEZES_URL);
    return normalize(res);
  } catch {
    return { remaining: 0, period: currentPeriod(), used: [], offDays: [...DEFAULT_OFF_DAYS] };
  }
}

/**
 * Update the off-days (the only user-writable field) and return the refreshed
 * state. Throws an ApiError on failure so a save handler can show a save error —
 * it must be called from an event handler, not during render.
 */
export async function setOffDays(offDays: number[]): Promise<FreezeState> {
  const res = await apiFetch<Partial<FreezeState>>(FREEZES_URL, {
    method: 'PUT',
    body: JSON.stringify({ offDays: sanitizeOffDays(offDays) }),
  });
  return normalize(res);
}
