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
//
// Learn levels, part tests and the learning paths lock through
// lib/contentLocks.ts, which needs no coding index; this module adds the
// coding tasks, whose free list is in the generated coding index (perf
// baseline #587 C11). Use it only where a coding task is locked.
import { useMemo } from 'react';
import { CODING_INDEX } from '../../../shared/coding-index';
import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import type { ContentIndex, GatedContent } from '../../../shared/tiers';
import { useLockOf } from './contentLocks';

export { isBarred, type LockState } from './contentLocks';

/** The browser's content index: the generated coding index, the evolving
 * registry, and the level counts of the roadmap structure the page loaded. */
export function clientContentIndex(levelCounts: ContentIndex['levelCounts'] = {}, learningPaths?: ContentIndex['learningPaths']): ContentIndex {
  return { levelCounts, coding: CODING_INDEX, evolving: EVOLVING_CHALLENGES, learningPaths };
}

/** `lockOf(content)` for the current account, coding tasks included. Pass the
 * loaded level counts when part tests are involved, and `held` when the page's
 * first-data hold read the plan (useEntitlement). */
export function useLocks(levelCounts?: ContentIndex['levelCounts'], { held = false, paths }: { held?: boolean; paths?: ContentIndex['learningPaths'] } = {}) {
  const index = useMemo(() => clientContentIndex(levelCounts ?? {}, paths), [levelCounts, paths]);
  return useLockOf<GatedContent>(index, held);
}
