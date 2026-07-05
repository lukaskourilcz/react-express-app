// Token economy: a separate currency from XP, spent in the in-app Shop.
//
//   • Passive accrual — every XP gain (quiz, learning, practice) also awards
//     10 % of that amount in tokens. This is the only earn path for now; XP
//     itself must still be earned the normal way.
//   • Sign-up bonus — the first time a brand-new account signs in, we mint
//     200 tokens as a welcome gift. Guarded by a `user_metadata` flag so the
//     grant doesn't repeat across devices or sign-outs.
//
// State lives in localStorage like the quest-XP store; the server-side mirror
// uses Supabase `user_metadata` (no DB migration needed for the MVP).

import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

const TOKENS_KEY = 'devquiz:tokens:balance:v1';
const REGISTRATION_BONUS_KEY = 'devquiz:tokens:registration-bonus:v1';
const REGISTRATION_BONUS_AMOUNT = 200;
const XP_TO_TOKEN_RATIO = 0.1;
const MAX_TOKENS = 100_000_000;

const clampTokens = (n: number): number =>
  Number.isFinite(n) && n > 0 ? Math.min(MAX_TOKENS, Math.round(n)) : 0;

const readBalance = (): number => clampTokens(readJSON<number>(TOKENS_KEY, 0));

const tokensStore = createStore<number>(readBalance);

/** Live token balance (re-renders on change). */
export function useTokens(): number {
  return useStore(tokensStore);
}

/** Imperative read of the current balance. */
export function getTokens(): number {
  return readBalance();
}

function writeBalance(value: number): void {
  const next = clampTokens(value);
  writeJSON(TOKENS_KEY, next);
  tokensStore.emit();
  // Any balance change gets scheduled for the account sync so the wallet
  // survives a device switch. Fire-and-forget: local write already succeeded.
  scheduleAccountSync();
}

/** Direct write of an authoritative balance — used by the account-sync merge. */
export function setBalanceFromServer(value: number): void {
  const next = clampTokens(value);
  writeJSON(TOKENS_KEY, next);
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
 * Award tokens to the live balance. Called from the XP store on every XP gain
 * (`tokensFromXp(amount)` chooses the size of the award).
 */
export function awardTokens(amount: number): void {
  const add = clampTokens(amount);
  if (add <= 0) return;
  writeBalance(readBalance() + add);
}

/** Convert an XP gain into the matching token award (10 %). */
export function tokensFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return Math.floor(xp * XP_TO_TOKEN_RATIO);
}

/** Spend tokens (e.g. on a shop purchase). Returns true if balance allowed it. */
export function spendTokens(amount: number): boolean {
  const cost = clampTokens(amount);
  const balance = readBalance();
  if (cost <= 0 || cost > balance) return false;
  writeBalance(balance - cost);
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
  writeBalance(readBalance() + REGISTRATION_BONUS_AMOUNT);
  return true;
}

export const SIGNUP_BONUS_TOKENS = REGISTRATION_BONUS_AMOUNT;
