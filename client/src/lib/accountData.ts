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

import { emitAllStores } from './store';

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

/** Forget the account's data on this device and refresh what shows it. */
export function clearAccountData(): void {
  try { clear(localStorage); } catch { /* storage may be disabled */ }
  try { clear(sessionStorage); } catch { /* storage may be disabled */ }
  emitAllStores();
}
