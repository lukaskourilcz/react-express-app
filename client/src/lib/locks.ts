// The locks the browser draws, from the account's plan and `contentTier`.
//
// The server decides: it refuses locked content with 402 and the browser only
// mirrors that. Locks come from `contentTier` in shared/tiers.ts, the same
// function the server calls, so the two cannot disagree about what the free
// plan includes.
//
// Four lock states, because "locked" is only one of them:
//   open     free content, or a Premium account
//   locked   a signed-in free account on Premium content
//   preview  a signed-out visitor on Premium content. The server refuses it
//            with the same 402 as a free account (a guest keeps only the free
//            tier, unsaved), so it is drawn with the Premium mark and opens the
//            upgrade sheet, which leads to sign-in and checkout
//   unknown  a signed-in account whose plan has not loaded or cannot load
//            (offline): nothing is drawn as locked, and the server's 402
//            opens the sheet if the plan turns out to be free
//
// `isBarred` is the question every screen asks: is this step shown with the
// Premium mark, and does activating it open the upgrade sheet?
import { useCallback, useMemo } from 'react';
import { useEntitlement } from './entitlement';
import { CODING_INDEX } from '../../../shared/coding-index';
import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import { contentTier, type ContentIndex, type GatedContent } from '../../../shared/tiers';

/** The browser's content index: the generated coding index, the evolving
 * registry, and the level counts of the roadmap structure the page loaded. */
export function clientContentIndex(levelCounts: ContentIndex['levelCounts'] = {}): ContentIndex {
  return { levelCounts, coding: CODING_INDEX, evolving: EVOLVING_CHALLENGES };
}

export type LockState = 'open' | 'locked' | 'preview' | 'unknown';

/** Premium content the current visitor cannot start: a free account's lock or
 * a guest's preview. 'unknown' is not barred; the server decides. */
export const isBarred = (state: LockState): boolean => state === 'locked' || state === 'preview';

/** `lockOf(content)` for the current account. Pass the loaded level counts
 * when part tests are involved. */
export function useLocks(levelCounts?: ContentIndex['levelCounts']) {
  const entitlement = useEntitlement();
  const index = useMemo(() => clientContentIndex(levelCounts ?? {}), [levelCounts]);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const { tier, signedIn } = entitlement;
  const lockOf = useCallback((content: GatedContent): LockState => {
    if (contentTier(content, index) === 'free') return 'open';
    if (!signedIn) return tier === null ? 'unknown' : 'preview';
    if (tier === 'premium') return 'open';
    // Offline, a cached "free" may be stale (an upgrade on another device), so
    // it reads as unknown and the server decides once the connection is back.
    if (tier === null || offline) return 'unknown';
    return 'locked';
  }, [index, signedIn, tier, offline]);
  return { ...entitlement, lockOf };
}
