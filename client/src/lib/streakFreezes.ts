// Streak protection — the read wrapper and the one action a learner can take.
//
// Every learner gets two protections a month. They used to be spent for you,
// after the fact: come back after a missed day and one was quietly used to
// bridge it. That is still the safety net, but it is invisible, and a learner
// who knows they will be away tomorrow had no way to say so. The shield is
// that way: spend one now and today and tomorrow (UTC dates) are covered.
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
 * Spend one protection to shield the streak today and tomorrow (UTC dates),
 * and return the refreshed state. Throws on failure — call it from an event
 * handler.
 *
 * Spending is the server's decision, not this function's: it refuses when the
 * budget is empty and returns the existing window unchanged when a shield is
 * already running, so a second click cannot cost a second protection.
 */
export async function activateShield(): Promise<StreakProtection> {
  return normalize(await apiFetch<Partial<StreakProtection>>(URL, { method: 'POST' }));
}

const DAY_MS = 86_400_000;
const SHIELD_MS = 48 * 3_600_000;
const utcDay = (ms: number): number => Math.floor(ms / DAY_MS);

/** The UTC day a shield was raised: 48 hours before its end. Right for a
 * shield stored as "raised + 48 h" (before migration 048) and for one that
 * ends at 00:00 UTC the day after tomorrow (from 048). */
const shieldRaisedDay = (shieldUntil: number): number => utcDay(shieldUntil - SHIELD_MS);

/**
 * The streak as it stands today: the recorded count while the streak is still
 * alive, 0 once it has ended.
 *
 * This is the rule the server applies when the learner comes back to any
 * verified learning (advance_verified_streak, migration 048): the UTC date a
 * shield was raised and the next one were paid for in advance; each other day
 * missed between the last learning day and today needs a protection; more
 * than two missed days, or more than the protections left this month, end the
 * streak. `last_quiz_date` is that last learning day, whatever the learning
 * was. `protection` is the state `getStreakProtection` read. Without it only
 * today and yesterday keep a streak alive. Days are UTC days, as on the
 * server.
 */
export function liveStreak(
  stats: { current_streak: number; last_quiz_date: string | null } | null,
  protection: Pick<StreakProtection, 'remaining' | 'shieldUntil'> | null,
  now = Date.now(),
): number {
  if (!stats?.last_quiz_date || stats.current_streak <= 0) return 0;
  const last = Date.parse(stats.last_quiz_date);
  if (!Number.isFinite(last)) return 0;
  const lastDay = utcDay(last);
  const today = utcDay(now);
  if (today - lastDay <= 1) return stats.current_streak;

  const until = protection?.shieldUntil ? Date.parse(protection.shieldUntil) : Number.NaN;
  const raised = Number.isFinite(until) ? shieldRaisedDay(until) : Number.NaN;
  const shielded = (day: number) => Number.isFinite(raised) && day >= raised && day <= raised + 1;
  let missed = 0;
  for (let day = lastDay + 1; day < today && missed <= 2; day++) {
    if (!shielded(day)) missed++;
  }
  if (missed === 0) return stats.current_streak;
  return missed <= 2 && missed <= (protection?.remaining ?? 0) ? stats.current_streak : 0;
}

/** Whole hours and minutes left on a shield, or null once it has expired.
 * Deliberately not live: it is read on load and left alone, because a ticking
 * clock on a window of up to two days is decoration that costs a render a
 * second. */
export function shieldRemaining(shieldUntil: string | null, now = Date.now()): { hours: number; minutes: number } | null {
  if (!shieldUntil) return null;
  const until = Date.parse(shieldUntil);
  if (!Number.isFinite(until)) return null;
  // Covered until the day after the raise date ends (UTC). A shield raised
  // before migration 048 is stored as raised + 48 h and can run past that.
  const ms = Math.min(until, (shieldRaisedDay(until) + 2) * DAY_MS) - now;
  if (ms <= 0) return null;
  return { hours: Math.floor(ms / 3_600_000), minutes: Math.floor((ms % 3_600_000) / 60_000) };
}
