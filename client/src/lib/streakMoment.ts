// The two moments a streak has, and the day it is about to lose.
//
// A streak is a number the server owns. Nothing here changes it, reads a
// clock the server does not share, or decides anything: these are pure
// functions over the stats row that came back from a verified result, so the
// surfaces that celebrate a streak and the surface that warns about one agree
// on what they are looking at.
//
// Days are counted in UTC, because that is how they are counted in
// `record_verified_quiz_result_v2` — `(NOW() AT TIME ZONE 'UTC')::DATE`. A
// local-midnight computation would put the boundary somewhere else and the
// warning would fire on the wrong evening.

import type { UserStats } from './supabase';
import type { Lang } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

/** The one milestone. Duolingo's own measurement is about the seventh day, and
 * one milestone that means something beats a ladder of them that does not. */
export const STREAK_MILESTONE_DAYS = 7;

export interface StreakMoment {
  /** `milestone` is the first crossing of the seventh day; everything else
   * that moves the count is `extended`. */
  kind: 'extended' | 'milestone';
  /** The streak after this session, in days. */
  days: number;
}

/** The UTC midnight of a date, in epoch milliseconds, or null if unparseable. */
function utcMidnight(value: string | Date): number | null {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (!Number.isFinite(time)) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * What, if anything, this session did to the streak.
 *
 * `previous` is the stats row as it was before the result was recorded, and
 * `null` means it was not known — an unwarmed cache, a first visit, a
 * reconnecting device replaying a receipt. In that case this returns null
 * rather than guessing: a learner on day forty should not be told they have
 * just reached seven, and an honest silence costs nothing.
 *
 * The milestone fires on the first crossing of the seventh day and never
 * again, including when a protection bridges a gap and the count jumps over
 * it. The badge of the same name is a different thing and stays that way: it
 * is earned on the longest streak ever reached and lives in the grid. This is
 * a moment, and it reads the streak running now.
 */
export function streakMomentFor(
  previous: UserStats | null | undefined,
  next: UserStats | null | undefined,
): StreakMoment | null {
  if (!previous || !next) return null;
  const days = Math.floor(next.current_streak ?? 0);
  const before = Math.floor(previous.current_streak ?? 0);
  if (!Number.isFinite(days) || days <= 0 || days <= before) return null;
  if (days >= STREAK_MILESTONE_DAYS && before < STREAK_MILESTONE_DAYS) {
    return { kind: 'milestone', days };
  }
  return { kind: 'extended', days };
}

/**
 * Whether a live streak is standing on yesterday and nothing else.
 *
 * Exactly one day, not "one or more": two days without a session means the
 * streak has already been bridged by a protection or already reset, and
 * warning about it then would be describing a decision the server has made.
 */
export function streakAtRisk(stats: UserStats | null | undefined, now: Date = new Date()): boolean {
  if (!stats || !stats.last_quiz_date) return false;
  if (Math.floor(stats.current_streak ?? 0) <= 0) return false;
  const last = utcMidnight(stats.last_quiz_date);
  const today = utcMidnight(now);
  if (last === null || today === null) return false;
  return Math.floor((today - last) / 86_400_000) === 1;
}

/**
 * The right word for "day" beside a number.
 *
 * English has two forms and Czech has three — 1 den, 2–4 dny, 5+ dní — so a
 * count and a unit cannot be concatenated without knowing the language. The
 * keys already exist for the profile's streak tiles; this is the rule that
 * picks between them, in one place, for every surface that prints a day count.
 */
export function dayUnitKey(value: number, lang: Lang): TranslationKey {
  if (lang === 'en') return value === 1 ? 'profile.day' : 'profile.days';
  if (value === 1) return 'profile.day';
  if (value >= 2 && value <= 4) return 'profile.daysFew';
  return 'profile.days';
}
