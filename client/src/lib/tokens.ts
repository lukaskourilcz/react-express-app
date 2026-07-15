// Token economy: a separate currency from XP, spent in the in-app Shop.
//
// Tokens are counted PER SUBJECT (platform): each subject has its own wallet,
// earned on that platform and spendable only in that platform's shop. Every
// hook/getter here is scoped to the active subject.
//
//   • Passive accrual — every XP gain (quiz, learning, practice) also awards
//     10 % of that amount in tokens, into the active subject's wallet.
//   • Sign-up bonus — the first time a brand-new account signs in, we mint
//     200 tokens as a welcome gift (into the wallet of the subject active at
//     that moment). Guarded by a `user_metadata` flag so the grant doesn't
//     repeat across devices or sign-outs.
//
// State lives in localStorage like the quest-XP store; the server-side mirror
// rides along in the account-synced roadmap blob (see roadmap.ts).

import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { supabase } from './supabaseClient';
import { getSubject, useSubject, isSubjectId, type SubjectId } from './subjects';
import type { User } from '@supabase/supabase-js';

// v1 held ONE global balance shared by every subject; v2 keys wallets by subject.
const TOKENS_KEY_LEGACY = 'devquiz:tokens:balance:v1';
const TOKENS_KEY = 'devquiz:tokens:balance:v2';
const REGISTRATION_BONUS_KEY = 'devquiz:tokens:registration-bonus:v1';
const REGISTRATION_BONUS_AMOUNT = 200;
const XP_TO_TOKEN_RATIO = 0.1;
const MAX_TOKENS = 100_000_000;

const clampTokens = (n: number): number =>
  Number.isFinite(n) && n > 0 ? Math.min(MAX_TOKENS, Math.round(n)) : 0;

type BalanceMap = Partial<Record<SubjectId, number>>;

function sanitizeBalances(raw: unknown): BalanceMap {
  const out: BalanceMap = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSubjectId(k)) continue;
    const bal = clampTokens(typeof v === 'number' ? v : 0);
    if (bal > 0) out[k] = bal;
  }
  return out;
}

function readBalances(): BalanceMap {
  const raw = readJSON<Record<string, unknown> | null>(TOKENS_KEY, null);
  if (raw !== null) return sanitizeBalances(raw);
  // One-time migration: the pre-split balance was shared by all subjects.
  // Attribute it to the subject active right now (same rule as quest XP).
  const legacy = clampTokens(readJSON<number>(TOKENS_KEY_LEGACY, 0));
  const migrated: BalanceMap = legacy > 0 ? { [getSubject()]: legacy } : {};
  writeJSON(TOKENS_KEY, migrated);
  return migrated;
}

const tokensStore = createStore<BalanceMap>(readBalances);

/** Live token balance of the ACTIVE subject (re-renders on change). */
export function useTokens(): number {
  const map = useStore(tokensStore);
  const [subject] = useSubject();
  return map[subject] ?? 0;
}

/** Imperative read of the active subject's balance. */
export function getTokens(): number {
  return readBalances()[getSubject()] ?? 0;
}

/** Snapshot of every subject's wallet, for the account sync. */
export function getWalletsSnapshot(): Record<string, { balance: number }> {
  const out: Record<string, { balance: number }> = {};
  for (const [k, v] of Object.entries(readBalances())) out[k] = { balance: v ?? 0 };
  return out;
}

function writeBalance(subject: SubjectId, value: number): void {
  writeJSON(TOKENS_KEY, { ...readBalances(), [subject]: clampTokens(value) });
  tokensStore.emit();
  // Any balance change gets scheduled for the account sync so the wallet
  // survives a device switch. Fire-and-forget: local write already succeeded.
  scheduleAccountSync();
}

/**
 * Merge authoritative per-subject balances from the account sync: per-subject
 * max (tokens only grow across devices — no one gets refunded twice).
 */
export function mergeBalancesFromServer(wallets: Record<string, { balance: number }>): void {
  const local = readBalances();
  let changed = false;
  const merged: BalanceMap = { ...local };
  for (const [k, v] of Object.entries(wallets)) {
    if (!isSubjectId(k)) continue;
    const server = clampTokens(Number(v?.balance ?? 0));
    if (server > (merged[k] ?? 0)) {
      merged[k] = server;
      changed = true;
    }
  }
  if (!changed) return;
  writeJSON(TOKENS_KEY, merged);
  tokensStore.emit();
}

// Debounce account pushes: many quick token gains (e.g. rapid-fire XP toasts
// during a lesson) coalesce into a single PUT. Import lazily to avoid a
// module-load cycle with roadmap.ts.
let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAccountSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    // Dynamic import so this module doesn't force roadmap.ts into the shell
    // graph. roadmap.ts is already eagerly imported by many components anyway,
    // so the resolution is instant at runtime.
    void import('./roadmap').then((m) => m.pushProgressToServer().catch(() => {}));
  }, 800);
}

export function flushAccountSyncNow(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

/**
 * Award tokens to the active subject's balance. Called from the XP store on
 * every XP gain (`tokensFromXp(amount)` chooses the size of the award).
 */
export function awardTokens(amount: number): void {
  const add = clampTokens(amount);
  if (add <= 0) return;
  const subject = getSubject();
  writeBalance(subject, (readBalances()[subject] ?? 0) + add);
}

/** Convert an XP gain into the matching token award (10 %). */
export function tokensFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return Math.floor(xp * XP_TO_TOKEN_RATIO);
}

/** Spend tokens from the active subject's wallet. Returns true if balance allowed it. */
export function spendTokens(amount: number): boolean {
  const cost = clampTokens(amount);
  const subject = getSubject();
  const balance = readBalances()[subject] ?? 0;
  if (cost <= 0 || cost > balance) return false;
  writeBalance(subject, balance - cost);
  return true;
}

/**
 * Grant the one-time 200-token sign-up bonus. Idempotent across devices: the
 * Supabase `user_metadata.devquiz_signup_bonus_granted` flag is the source of
 * truth, with a localStorage mirror for instant guards.
 *
 * Returns true if the bonus was actually applied (caller can toast it).
 */
export async function grantRegistrationBonusIfNew(user: User): Promise<boolean> {
  if (readJSON<boolean>(REGISTRATION_BONUS_KEY, false)) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (meta.devquiz_signup_bonus_granted === true) {
    // Already granted on another device — mark the local flag so we skip it
    // next time without another network call.
    writeJSON(REGISTRATION_BONUS_KEY, true);
    return false;
  }
  // Mark server-side FIRST so a concurrent device can't double-grant.
  if (supabase) {
    try {
      await supabase.auth.updateUser({ data: { devquiz_signup_bonus_granted: true } });
    } catch {
      // If we can't persist the marker, refuse to grant — better to skip the
      // bonus than risk granting it twice.
      return false;
    }
  }
  writeJSON(REGISTRATION_BONUS_KEY, true);
  const subject = getSubject();
  writeBalance(subject, (readBalances()[subject] ?? 0) + REGISTRATION_BONUS_AMOUNT);
  return true;
}

export const SIGNUP_BONUS_TOKENS = REGISTRATION_BONUS_AMOUNT;
