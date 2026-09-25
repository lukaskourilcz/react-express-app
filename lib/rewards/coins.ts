/** Coins: the credits that ride on verified learning (step D8, migration 041).
 *
 * Product copy says coins; the ledger, the routines and these functions keep
 * the `token` spelling of migration 028. Every credit here is a call to a
 * service-role routine with an event id derived from something the server
 * itself verified: an award id, an account, a topic, a project, a month. The
 * routines decide the amount (the rate, the Premium doubling, the daily cap)
 * and ignore a replay, so a retried request credits nothing. No browser input
 * names an amount or an event.
 *
 * A credit never fails the learning it rides on. A missing migration or a
 * database error is logged and swallowed; the verified result has already been
 * recorded by then. */

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger, isRpcMissing, withTimeout } from '../http';
import { getGameSettings } from '../settings-store';
import { ROADMAP_TOPICS, topicLevelCount } from '../roadmap';
import { EVOLVING_CHALLENGES } from '../../shared/evolving';
import { learnCheckpointXp, learnLevelXp } from '../../shared/progression';
import { tokensForVerifiedXp, type CoinSettings, type SocialPlatform } from '../../shared/rewards';

const logEvent = createLogger('coins');

/** Migration 041 is not installed. PostgREST reports a missing routine as
 * PGRST202 ("Could not find the function"), Postgres itself as "function …
 * does not exist"; both mean the same thing here. */
export const routineMissing = (error: { code?: string; message?: string } | null | undefined): boolean =>
  !!error && (isRpcMissing(error) || error.code === 'PGRST202' || /could not find the function/i.test(error.message ?? ''));

/** The account part of a per-account event id, as `token_account_key` in 041
 * computes it: a UUID as it is, anything else hashed. */
export function accountKey(userId: string): string {
  return /^[A-Za-z0-9_-]{1,64}$/.test(userId) ? userId : createHash('md5').update(userId, 'utf8').digest('hex');
}

/** The XP award id of a Learn level or part test passed for the first time.
 * One per account and step, so passing the same level again is the same award. */
export const learnAwardId = (userId: string, topic: string, kind: 'level' | 'checkpoint', ref: number): string =>
  `learn:${accountKey(userId)}:${topic}:${kind === 'level' ? 'L' : 'P'}${ref}`;

/** The XP award id of a coding challenge's first pass. Migration 041 records
 * the XP under this same id. */
export const codingAwardId = (userId: string, taskId: string): string => `coding:${accountKey(userId)}:${taskId}`;

async function coinSettings(): Promise<CoinSettings> {
  return (await getGameSettings()).coins;
}

/**
 * Credit coins for XP the server itself awarded, under that award's own id.
 * Returns the coins credited, 0 for a replay or a capped day.
 *
 * Before migration 041 is installed the old credit runs instead: the flat
 * rate, no doubling, no cap. That keeps a deploy that lands before the
 * migration from dropping credits.
 */
export async function creditVerifiedXp(
  supabase: SupabaseClient,
  input: { userId: string; awardId: string; subject: string; xp: number },
): Promise<number> {
  if (!Number.isFinite(input.xp) || input.xp <= 0) return 0;
  const coins = await coinSettings();
  const credited = await withTimeout(
    supabase.rpc('credit_verified_xp_tokens', {
      p_user_id: input.userId,
      p_award_id: input.awardId,
      p_subject: input.subject,
      p_xp: Math.round(input.xp),
      p_rate: coins.xpRate,
      p_premium_multiplier: coins.premiumMultiplier,
      p_daily_cap: coins.dailyXpCap,
    }),
  ).catch(() => null);
  if (credited && !credited.error) return Number(credited.data ?? 0);
  if (credited?.error && routineMissing(credited.error)) return legacyCredit(supabase, input);
  logEvent({ status: 500, kind: 'credit_failed', reason: credited?.error?.code ?? 'timeout' });
  return 0;
}

async function legacyCredit(
  supabase: SupabaseClient,
  input: { userId: string; awardId: string; subject: string; xp: number },
): Promise<number> {
  const amount = tokensForVerifiedXp(input.xp);
  if (amount <= 0) return 0;
  const credited = await withTimeout(
    supabase.rpc('credit_tokens', {
      p_user_id: input.userId,
      p_event_id: `xp:${input.awardId}`,
      p_subject: input.subject,
      p_amount: amount,
      p_reason: 'verified-xp',
      p_reference: input.awardId,
    }),
  ).catch(() => null);
  if (credited?.error && !routineMissing(credited.error)) {
    logEvent({ status: 500, kind: 'credit_failed', reason: credited.error.code ?? 'unknown' });
  }
  return credited && !credited.error && credited.data === true ? amount : 0;
}

/** A Learn level or part test passed for the first time: its XP credits coins. */
export function creditLearnPass(
  supabase: SupabaseClient,
  input: { userId: string; subject: string; topic: string; kind: 'level' | 'checkpoint'; ref: number },
): Promise<number> {
  const xp = input.kind === 'level' ? learnLevelXp(input.ref) : learnCheckpointXp(input.ref);
  return creditVerifiedXp(supabase, {
    userId: input.userId,
    awardId: learnAwardId(input.userId, input.topic, input.kind, input.ref),
    subject: input.subject,
    xp,
  });
}

/* ── milestones ────────────────────────────────────────────────────────── */

/** The configuration `settle_coin_milestones` reads, built from the server's
 * own content and the owner's settings. Remembered per settings object. */
const configs = new WeakMap<CoinSettings, Record<string, unknown>>();
export function milestoneConfig(coins: CoinSettings): Record<string, unknown> {
  let config = configs.get(coins);
  if (!config) {
    config = {
      streak: coins.streakMilestones.filter((one) => one.coins > 0),
      topic: {
        coins: coins.topicComplete,
        levels: Object.fromEntries(ROADMAP_TOPICS.map((topic) => [topic, topicLevelCount(topic)])),
      },
      projects: EVOLVING_CHALLENGES.map((challenge) => ({
        id: challenge.id,
        coins: challenge.short ? coins.shortPathComplete : coins.projectComplete,
        stages: challenge.stages,
      })),
    };
    configs.set(coins, config);
  }
  return config;
}

export interface MilestoneReport {
  premium: boolean;
  credited: { key: string; coins: number }[];
  streak: number;
  topics: { id: string; passed: number; total: number }[];
  projects: { id: string; passed: number; total: number }[];
  earned: string[];
  todayXpCoins: number;
}

/**
 * Pay whatever Premium milestones the learner's verified progress has reached
 * and report the progress behind each one. Idempotent: a milestone is one
 * ledger event per account. Returns null when migration 041 is missing or the
 * database could not answer.
 */
export async function settleMilestones(
  supabase: SupabaseClient,
  userId: string,
  subject: string,
): Promise<MilestoneReport | null> {
  const coins = await coinSettings();
  const settled = await withTimeout(
    supabase.rpc('settle_coin_milestones', { p_user_id: userId, p_subject: subject, p_config: milestoneConfig(coins) }),
  ).catch(() => null);
  if (!settled || settled.error) {
    if (!routineMissing(settled?.error)) {
      logEvent({ status: 500, kind: 'milestones_failed', reason: settled?.error?.code ?? 'timeout' });
    }
    return null;
  }
  const raw = (settled.data ?? {}) as Partial<MilestoneReport>;
  const report: MilestoneReport = {
    premium: raw.premium === true,
    credited: Array.isArray(raw.credited) ? raw.credited : [],
    streak: Number(raw.streak ?? 0),
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    earned: Array.isArray(raw.earned) ? raw.earned.map(String) : [],
    todayXpCoins: Number(raw.todayXpCoins ?? 0),
  };
  if (report.credited.length > 0) logEvent({ status: 200, kind: 'milestones_credited', count: report.credited.length });
  return report;
}

/* ── the monthly top three ─────────────────────────────────────────────── */

/** `yyyy-mm` of the calendar month before `now`, in UTC. */
export function previousMonth(now: Date = new Date()): string {
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Months this instance has already seen settled, so a warm function does not
 * ask again on every wallet read. The database is the authority either way. */
const settledMonths = new Set<string>();

/**
 * Settle the top three of the month that just ended, once. There is no cron:
 * the first wallet read after a month ends runs this before it answers.
 */
export async function settleFinishedMonth(supabase: SupabaseClient, subject: string, now: Date = new Date()): Promise<void> {
  const month = previousMonth(now);
  if (settledMonths.has(month)) return;
  const coins = await coinSettings();
  const settled = await withTimeout(
    supabase.rpc('settle_month_top3', { p_month: month, p_subject: subject, p_rewards: coins.monthTop, p_min_answers: 5 }),
  ).catch(() => null);
  if (!settled || settled.error) {
    if (!routineMissing(settled?.error)) {
      logEvent({ status: 500, kind: 'month_settlement_failed', reason: settled?.error?.code ?? 'timeout' });
    }
    return;
  }
  const result = (settled.data ?? {}) as { settled?: boolean; reason?: string; winners?: number };
  if (result.settled === true || result.reason === 'already') settledMonths.add(month);
  if (result.settled === true) logEvent({ status: 200, kind: 'month_settled', month, winners: result.winners ?? 0 });
}

/* ── the social click-through grant ────────────────────────────────────── */

/** Credit the owner-set amount for opening one profile, once per platform and
 * account. At the default of zero this credits nothing and asks nothing. */
export async function creditSocialVisit(
  supabase: SupabaseClient,
  input: { userId: string; subject: string; platform: SocialPlatform },
): Promise<{ granted: boolean; coins: number }> {
  const amount = (await coinSettings()).socialVisitGrant;
  if (amount <= 0) return { granted: false, coins: 0 };
  const credited = await withTimeout(
    supabase.rpc('credit_social_visit', {
      p_user_id: input.userId, p_subject: input.subject, p_platform: input.platform, p_amount: amount,
    }),
  ).catch(() => null);
  if (!credited || credited.error) {
    if (!routineMissing(credited?.error)) {
      logEvent({ status: 500, kind: 'social_credit_failed', reason: credited?.error?.code ?? 'timeout' });
    }
    return { granted: false, coins: 0 };
  }
  return credited.data === true ? { granted: true, coins: amount } : { granted: false, coins: 0 };
}

/* ── account deletion ──────────────────────────────────────────────────── */

/** Remove the account's XP credit records and its name from any month's
 * settlement. The ledger and the balance go with `delete_user_data`. */
export async function deleteCoinData(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const deleted = await withTimeout(supabase.rpc('delete_coin_data', { p_user_id: userId }), 8000);
  return !deleted.error || routineMissing(deleted.error);
}
