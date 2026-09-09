// Streak protection — the read wrapper and the one action a learner can take.
//
// Every learner gets two protections a month. They used to be spent for you,
// after the fact: come back after a missed day and one was quietly used to
// bridge it. That is still the safety net, but it is invisible, and a learner
// who knows they will be away tomorrow had no way to say so. The shield is
// that way: spend one now and the streak survives the next 48 hours.
//
// `getStreakProtection` is a read and degrades gracefully — it never throws
// into render, so a signed-out visitor, an offline device or a database that
// has not had migration 032 applied all resolve to a state the profile can
// still draw. `activateShield` is an explicit user action and throws an
// ApiError on failure so the click handler can say what went wrong.

import { apiFetch } from './api';

export interface StreakProtection {
  /** Protections left this period. */
  remaining: number;
  /** Budget period, 'YYYY-MM'. */
  period: string;
  /** ISO dates (YYYY-MM-DD) a protection has been spent on this period. */
  used: string[];
  /** When the active shield expires, or null when none is active. */
  shieldUntil: string | null;
  /** False when the server cannot offer the shield yet — the migration that
   * adds it has not been applied. The budget still reads correctly. */
  shieldSupported: boolean;
}

const URL = '/api/user/freezes';

const currentPeriod = (): string => new Date().toISOString().slice(0, 7);

const EMPTY: StreakProtection = {
  remaining: 0,
  period: currentPeriod(),
  used: [],
  shieldUntil: null,
  shieldSupported: false,
};

function normalize(res: Partial<StreakProtection>): StreakProtection {
  const until = typeof res.shieldUntil === 'string' ? res.shieldUntil : null;
  return {
    remaining: Number(res.remaining) || 0,
    period: typeof res.period === 'string' && res.period ? res.period : currentPeriod(),
    used: Array.isArray(res.used) ? res.used.filter((d): d is string => typeof d === 'string') : [],
    shieldUntil: until && Number.isFinite(Date.parse(until)) ? until : null,
    shieldSupported: res.shieldSupported === true,
  };
}

/** Read the protection budget and any active shield. Never throws. */
export async function getStreakProtection(): Promise<StreakProtection> {
  try {
    return normalize(await apiFetch<Partial<StreakProtection>>(URL));
  } catch {
    return { ...EMPTY };
  }
}

/**
 * Spend one protection to shield the streak for the next 48 hours, and return
 * the refreshed state. Throws on failure — call it from an event handler.
 *
 * Spending is the server's decision, not this function's: it refuses when the
 * budget is empty and returns the existing window unchanged when a shield is
 * already running, so a second click cannot cost a second protection.
 */
export async function activateShield(): Promise<StreakProtection> {
  return normalize(await apiFetch<Partial<StreakProtection>>(URL, { method: 'POST' }));
}

/** Whole hours and minutes left on a shield, or null once it has expired.
 * Deliberately not live: it is read on load and left alone, because a ticking
 * clock on a two-day window is decoration that costs a render a second. */
export function shieldRemaining(shieldUntil: string | null, now = Date.now()): { hours: number; minutes: number } | null {
  if (!shieldUntil) return null;
  const until = Date.parse(shieldUntil);
  if (!Number.isFinite(until)) return null;
  const ms = until - now;
  if (ms <= 0) return null;
  return { hours: Math.floor(ms / 3_600_000), minutes: Math.floor((ms % 3_600_000) / 60_000) };
}
