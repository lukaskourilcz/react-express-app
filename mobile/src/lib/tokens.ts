// Token economy: a separate currency from XP, spent in the in-app Shop.
// Ported from client/src/lib/tokens.ts. State lives in the synchronous storage
// facade; the account mirror rides the roadmap `extra` sync (wallet.balance).
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { supabase } from './supabase';
import { pushProgressToServer } from './roadmapProgress';
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

export function useTokens(): number {
  return useStore(tokensStore);
}
export function getTokens(): number {
  return readBalance();
}

function writeBalance(value: number): void {
  const next = clampTokens(value);
  writeJSON(TOKENS_KEY, next);
  tokensStore.emit();
  scheduleAccountSync();
}

/** Direct write of an authoritative balance — used by the account-sync merge. */
export function setBalanceFromServer(value: number): void {
  const next = clampTokens(value);
  writeJSON(TOKENS_KEY, next);
  tokensStore.emit();
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAccountSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushProgressToServer().catch(() => {});
  }, 800);
}

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

export function spendTokens(amount: number): boolean {
  const cost = clampTokens(amount);
  const balance = readBalance();
  if (cost <= 0 || cost > balance) return false;
  writeBalance(balance - cost);
  return true;
}

/**
 * Grant the one-time 200-token sign-up bonus, idempotent across devices via the
 * Supabase user_metadata flag. Returns true if the bonus was applied.
 */
export async function grantRegistrationBonusIfNew(user: User): Promise<boolean> {
  if (readJSON<boolean>(REGISTRATION_BONUS_KEY, false)) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (meta.devquiz_signup_bonus_granted === true) {
    writeJSON(REGISTRATION_BONUS_KEY, true);
    return false;
  }
  if (supabase) {
    try {
      await supabase.auth.updateUser({ data: { devquiz_signup_bonus_granted: true } });
    } catch {
      return false;
    }
  }
  writeJSON(REGISTRATION_BONUS_KEY, true);
  writeBalance(readBalance() + REGISTRATION_BONUS_AMOUNT);
  return true;
}

export const SIGNUP_BONUS_TOKENS = REGISTRATION_BONUS_AMOUNT;
