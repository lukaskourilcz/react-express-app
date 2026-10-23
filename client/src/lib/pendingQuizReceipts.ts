// Quiz results the server graded but the account has not recorded yet.
//
// A graded quiz hands back a sealed receipt; POST /api/user/stats records it,
// once per attempt however often it is sent. When that write fails the
// receipt waits here and is sent again later (PendingQuizResults, when the
// learner is signed in and when the browser comes back online). A receipt
// lives for an hour on the server: one it refuses as expired or invalid can
// never be recorded, so it is dropped rather than resent forever, and the
// caller says so. One entry per attempt, so a second failure does not
// overwrite the first.
import { ApiError } from './api';
import { accountEpoch } from './accountData';
import { readJSON, removeStored, writeJSON } from './storage';
import { recordQuizResult, type UserStats } from './supabase';

const STORE_KEY = 'devshark:pending-quiz-receipts:v2';
/** The single slot used before results were kept per attempt. */
const LEGACY_KEY = 'studyshark:pending-quiz-receipt:v1';

export interface PendingReceipt {
  userId: string;
  receipt: string;
  profile: { email?: string; name?: string; picture?: string };
}

type Store = Record<string, PendingReceipt>;

const isPending = (value: unknown): value is PendingReceipt => {
  const v = value as Partial<PendingReceipt> | null;
  return !!v && typeof v.userId === 'string' && typeof v.receipt === 'string' && !!v.profile && typeof v.profile === 'object';
};

function readStore(): Store {
  const raw = readJSON<Record<string, unknown>>(STORE_KEY, {});
  const store: Store = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) if (isPending(value)) store[key] = value;
  }
  const legacy = readJSON<unknown>(LEGACY_KEY, null);
  if (isPending(legacy)) {
    store[`legacy:${legacy.receipt.slice(-22)}`] = legacy;
    writeJSON(STORE_KEY, store);
  }
  if (legacy !== null) removeStored(LEGACY_KEY);
  return store;
}

/** One key per attempt: a quiz session is one attempt, and its sealed token
 * ends in an authentication tag no other token shares. */
export const attemptKeyOf = (sessionId: string): string => sessionId.slice(-22);

export function queuePendingReceipt(attemptKey: string, pending: PendingReceipt): void {
  writeJSON(STORE_KEY, { ...readStore(), [attemptKey]: pending });
}

export function dropPendingReceipt(attemptKey: string): void {
  const store = readStore();
  if (!(attemptKey in store)) return;
  delete store[attemptKey];
  if (Object.keys(store).length === 0) removeStored(STORE_KEY);
  else writeJSON(STORE_KEY, store);
}

export function pendingReceiptsFor(userId: string): [string, PendingReceipt][] {
  return Object.entries(readStore()).filter(([, pending]) => pending.userId === userId);
}

/** The server will never record this receipt: it expired, or it is not this
 * account's. Resending it cannot help. */
export const isReceiptRefused = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 400 && error.code === 'invalid_receipt';

// The replay under way. Coming back online while one runs started a second
// that sent every waiting result again.
let replaying: { userId: string; run: Promise<{ recorded: number; refused: number }> } | null = null;

/** Send every waiting result of this learner again. Recorded ones and ones
 * the server refuses leave the queue; anything else (offline, a server
 * error) stays for the next try. A call while this learner's results are
 * already on their way waits for that replay and counts nothing itself. The
 * replay stops when the account signs out: the rest are no longer this
 * browser's to send, and a refusal then is no news for whoever is here. */
export function replayPendingReceipts(
  userId: string,
  onRecorded?: (data: UserStats | null) => void,
): Promise<{ recorded: number; refused: number }> {
  if (replaying?.userId === userId) return replaying.run.then(() => ({ recorded: 0, refused: 0 }));
  const run = sendPending(userId, onRecorded);
  const entry = { userId, run };
  replaying = entry;
  const done = () => { if (replaying === entry) replaying = null; };
  run.then(done, done);
  return run;
}

async function sendPending(
  userId: string,
  onRecorded?: (data: UserStats | null) => void,
): Promise<{ recorded: number; refused: number }> {
  const epoch = accountEpoch();
  let recorded = 0;
  let refused = 0;
  for (const [key, pending] of pendingReceiptsFor(userId)) {
    if (accountEpoch() !== epoch) break;
    try {
      const saved = await recordQuizResult(pending.receipt, pending.profile);
      if (accountEpoch() !== epoch) break;
      dropPendingReceipt(key);
      recorded++;
      onRecorded?.(saved.data);
    } catch (error) {
      if (accountEpoch() !== epoch) break;
      if (isReceiptRefused(error)) {
        dropPendingReceipt(key);
        refused++;
      }
    }
  }
  return { recorded, refused };
}
