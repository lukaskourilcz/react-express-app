// The retired browser wallet (step D8, #227).
//
// Coins live in the server ledger of migration 028 and nowhere else: the
// Rewards screen reads them from `op=wallet` (./rewards.ts), and every credit
// is written by a service-role routine. This module used to award tokens on
// every XP gain and mint a 200-token sign-up bonus in localStorage. It does
// neither now. What remains keeps the old per-subject numbers readable in the
// account-synced blob (see roadmap.ts), as docs/rewards-launch.md promises;
// they are never shown and never spent.

import { readJSON, writeJSON } from './storage';
import { getSubject, isSubjectId, type SubjectId } from './subjects';

// v1 held ONE global balance shared by every subject; v2 keys wallets by subject.
const TOKENS_KEY_LEGACY = 'devquiz:tokens:balance:v1';
const TOKENS_KEY = 'devquiz:tokens:balance:v2';
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

/** Snapshot of every subject's wallet, for the account sync. */
export function getWalletsSnapshot(): Record<string, { balance: number }> {
  const out: Record<string, { balance: number }> = {};
  for (const [k, v] of Object.entries(readBalances())) out[k] = { balance: v ?? 0 };
  return out;
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
}
