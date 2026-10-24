// The locks the browser draws for everything but coding tasks: Learn levels
// and part tests, and the learning paths and their activities. The states,
// the rules and the account's plan are those of lib/locks.ts, which adds the
// coding tasks on top of this module.
//
// It is apart from lib/locks.ts because the coding locks need the generated
// coding index (shared/coding-index.ts, about 17 KB gzip of task summaries),
// and every screen that drew a lock pulled it in: the Learn map, Career and
// the FDE screens downloaded it to decide nothing about a coding task (perf
// baseline #587 C11). A screen that locks a coding task uses lib/locks.ts;
// the content type below keeps a coding task out of this module's lockOf.
//
// The server decides either way: it refuses locked content with 402 and the
// browser only mirrors that, through the same `contentTier` the server calls.
import { useCallback, useMemo } from 'react';
import { useEntitlement } from './entitlement';
import { EVOLVING_CHALLENGES } from '../../../shared/evolving';
import { contentTier, type ContentIndex, type GatedContent } from '../../../shared/tiers';

/** The lock states (lib/locks.ts says what each means). */
export type LockState = 'open' | 'locked' | 'preview' | 'unknown';

/** Premium content the current visitor cannot start: a free account's lock or
 * a guest's preview. 'unknown' is not barred; the server decides. */
export const isBarred = (state: LockState): boolean => state === 'locked' || state === 'preview';

/** Everything this module can lock: all gated content but coding tasks and
 * evolving stages, which need the coding index (lib/locks.ts). */
export type NonCodingContent = Exclude<GatedContent, { kind: 'coding-task' } | { kind: 'evolving-stage' }>;

const NO_CODING: ContentIndex['coding'] = [];

/** `lockOf(content)` over a content index, for the current account. */
export function useLockOf<C extends GatedContent>(index: ContentIndex, held: boolean) {
  const entitlement = useEntitlement({ held });
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const { tier, signedIn } = entitlement;
  const lockOf = useCallback((content: C): LockState => {
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

/** `lockOf(content)` for Learn levels, part tests and the learning paths.
 * Pass the loaded level counts when part tests are involved, the published
 * manifests for path activities, and `held` when the page's first-data hold
 * read the plan (useEntitlement). */
export function useContentLocks(levelCounts?: ContentIndex['levelCounts'], { held = false, paths }: { held?: boolean; paths?: ContentIndex['learningPaths'] } = {}) {
  const index = useMemo<ContentIndex>(
    () => ({ levelCounts: levelCounts ?? {}, coding: NO_CODING, evolving: EVOLVING_CHALLENGES, learningPaths: paths }),
    [levelCounts, paths],
  );
  return useLockOf<NonCodingContent>(index, held);
}
