/** Makes the Run worker's realm the grader's realm, just before learner code
 * runs (owner decisions, 9 October 2026):
 *
 *  - local time is Europe/Prague (shared/coding-prague-time.ts);
 *  - `toLocaleString`, `localeCompare` and their kin are the grader's
 *    (shared/coding-locale.ts);
 *  - `performance` has only `now`, as in the grader;
 *  - every global and built-in member the grader lacks is removed
 *    (shared/coding-checker-globals.ts).
 *
 * The worker (client/src/coding/runner/worker.ts) is started for one run and
 * then terminated, so nothing here is undone. It passes the returned names
 * to `evaluateCalls`, which tells a learner who used one that the checker
 * does not have it. */

import { hideMissingGlobals } from './coding-checker-globals';
import { LOCALE_SOURCE } from './coding-locale';
import { installPragueTime } from './coding-prague-time';

export function prepareRunRealm(global: typeof globalThis): ReadonlySet<string> {
  installPragueTime(global);
  (new Function(`return ${LOCALE_SOURCE};`)() as (realm: typeof globalThis) => void)(global);
  const clock = global.performance;
  if (clock && typeof clock.now === 'function') {
    const now = clock.now.bind(clock);
    Object.defineProperty(global, 'performance', { value: { now: () => now() }, writable: true, enumerable: false, configurable: true });
  }
  return hideMissingGlobals(global);
}
