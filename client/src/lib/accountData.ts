// What a signed-in account leaves in this browser, and forgetting it.
//
// Learn progress and unlocks, the chosen track, quest XP and rank marks, the
// coin and shop snapshots the account sync carries, bookmarks, the perfect-quiz
// count, coding drafts, the typing best, results waiting to be recorded, the
// cached leaderboards, an invitation or voucher code and the legacy admin
// password all sit in localStorage or sessionStorage under the app's prefixes.
// After a sign-out or an account deletion the next person on the device must
// not see them, and must not have them merged into their own account when they
// sign in (lib/roadmap.ts unions unlocks and keeps the larger coin snapshot).
//
// Everything under those prefixes goes except the device's own settings below:
// they belong to the device or the person at it, not to an account, and a
// sign-in in progress needs its return path. A key added later is cleared
// unless it is listed here.
//
// Coding drafts are the one exception, and only when the sign-out was not the
// learner's choice: a session that could not refresh (expired, revoked, the
// password changed elsewhere) keeps them, under the account's id, out of
// sight. When that account signs in again they come back as the device copies
// they were, and the usual rules of coding/drafts.ts decide what opens; when
// another account signs in they are deleted unread (owner decision 4).

import { emitAllStores } from './store';
import { readJSON, removeStored, writeJSON } from './storage';

const APP_PREFIXES = ['devquiz:', 'devshark:', 'studyshark:', 'shark:'];

const DEVICE_KEYS = new Set([
  'devquiz:color-mode', // appearance
  'devquiz:settings', // sound effects
  'devquiz:quiz-setup:v1', // quiz length, difficulty and topics
  'devshark:coding:layout:v1', // editor layout
  'devquiz:register-prompt:dismissed:v1', // this tab's "Not now"
  'devshark:campaign', // the campaign this browser first arrived with
  'devshark:auth-return', // a sign-in's way back (lib/authReturn.ts)
  'devshark:auth-resume',
  'devshark:upgrade-resume',
  'devshark:route-reload',
  'devshark:signed-out-by-choice', // a Log out, which the other tabs hear too (lib/auth.tsx)
]);
// The language is kept under `devquiz.lang`, outside the prefixes.

/** A learning preference chosen before any sign-in (lib/trackPref.ts). */
const GUEST_PREFERENCE = /^devquiz:[^:]+:learning-preference:guest$/;

const isAccountKey = (key: string): boolean =>
  APP_PREFIXES.some((prefix) => key.startsWith(prefix)) && !DEVICE_KEYS.has(key) && !GUEST_PREFERENCE.test(key);

function clear(storage: Storage): void {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
  for (const key of keys) if (key && isAccountKey(key)) storage.removeItem(key);
}

// Which account's data this page holds: a count that moves every time the
// data is forgotten. Work started for one account (a progress sync still in
// flight at sign-out) reads it before and after, and writes nothing when it
// moved, so the account that left does not come back into the browser.
let epoch = 0;

/** The current account epoch; see above. */
export function accountEpoch(): number {
  return epoch;
}

// Work still in memory when the account changes: a draft typed a moment ago
// that waits to be written. It reaches storage before the data is forgotten,
// kept or taken back.
const settlers = new Set<() => void>();
export function beforeAccountChange(settle: () => void): void {
  settlers.add(settle);
}
const settle = () => settlers.forEach((one) => one());

// A device copy, its time and a copy set aside, per task (coding/drafts.ts),
// and where an involuntary sign-out keeps them: the account's id and the
// keys as they were. coding/drafts.ts gives them back when that account
// opens a coding task signed in again.
export const DRAFT_KEY = /^devshark:coding:draft(-time|-aside)?:(.+)$/;
export const KEPT_DRAFTS = 'devshark:coding:kept:v1';
interface Kept { userId: string; drafts: Record<string, string> }
export const keptDrafts = (): Kept | null => {
  const value = readJSON<Kept | null>(KEPT_DRAFTS, null);
  return typeof value?.userId === 'string' && value.drafts && typeof value.drafts === 'object' ? value : null;
};

/** Forget the account's data on this device and refresh what shows it. With
 * `keepDraftsOf`, a sign-out the learner did not choose: that account's coding
 * drafts are kept for it. Says whether drafts are kept for it now. */
export function clearAccountData(keepDraftsOf: string | null = null): boolean {
  settle();
  epoch += 1;
  // Another tab may have kept this account's drafts already.
  const before = keptDrafts();
  const drafts: Record<string, string> = keepDraftsOf && before?.userId === keepDraftsOf ? before.drafts : {};
  if (keepDraftsOf) {
    try {
      for (const key of Object.keys(localStorage)) if (DRAFT_KEY.test(key)) drafts[key] = localStorage.getItem(key) ?? '';
    } catch { /* storage may be disabled */ }
  }
  try { clear(localStorage); } catch { /* storage may be disabled */ }
  try { clear(sessionStorage); } catch { /* storage may be disabled */ }
  const keeping = Boolean(keepDraftsOf) && Object.keys(drafts).length > 0;
  if (keepDraftsOf && keeping) writeJSON(KEPT_DRAFTS, { userId: keepDraftsOf, drafts } satisfies Kept);
  emitAllStores();
  return keeping;
}

/** Another account signed in: drafts kept for an account before it are
 * deleted unread. */
export function forgetOthersKeptDrafts(userId: string): void {
  if ((keptDrafts()?.userId ?? userId) === userId) return;
  removeStored(KEPT_DRAFTS);
  emitAllStores();
}
