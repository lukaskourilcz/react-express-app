// The Learn map's own reads, started beside its first-data hold (perf
// baseline #587 C07).
//
// The map holds its first draw for the structure and, signed in, the plan
// (useRoadmapStructureFirst). Its other reads lived in effects and hooks that
// run only once the map has drawn: the account's progress and XP, and, where
// the FDE path is on screen or may count toward the switcher's figure, the
// path catalogue and the account's enrollments. Each then left one round
// trip after the structure. They start here instead, in the render the hold
// suspends, without being waited for: the map draws when the structure and
// the plan are in, exactly as before, and the reads it would have started
// are answered or on their way.
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'react-router-dom';
import { accountEpoch } from '../../lib/accountData';
import { useAuth } from '../../lib/auth';
import { enrollmentsQuery, pathCatalogQuery } from '../../lib/learningPaths';
import { syncProgressWithServer } from '../../lib/roadmap';
import { readString } from '../../lib/storage';
import { primeRankMarker, syncXpWithServer } from '../../lib/xp';
import { SECTION_KEY, resolveSection } from './sections';
import { useFdeOpenInSettings } from './useFdePathSteps';

/**
 * Pull the account's progress and XP and merge them with this device. The
 * two reads leave together (#587 C08); XP used to wait for progress so the
 * rank marker counted the merged learning XP, and the marker is set again,
 * silently, once both are in, which leaves it where the chained reads left
 * it.
 */
export function syncMapAccount(): Promise<void> {
  return Promise.allSettled([syncProgressWithServer(), syncXpWithServer()]).then(() => primeRankMarker());
}

/** The sync a render before the map's first draw started, for the mount that
 * draws to take over. A mount that suspends keeps no state or refs, so it
 * lives here. Older than EARLY_SYNC_MS it belongs to a mount that never drew
 * (the learner left during the hold), and the next mount syncs afresh. */
let early: { account: string; at: number } | null = null;
const EARLY_SYNC_MS = 5_000;
const earlyFor = (account: string): boolean => early !== null && early.account === account && Date.now() - early.at < EARLY_SYNC_MS;

/**
 * Start the map's reads beside its hold. Call it before the hold suspends.
 *
 * Signed in, the map syncs once per mount and once more on each sign-in or
 * sign-out while it is mounted, as the mount effect did; a section switch
 * keeps the page mounted and syncs nothing new. The renders before the first
 * draw start the sync and the mount's effect takes it over. The path reads
 * are prefetched only before the first draw: a prefetch in a later render of
 * a query gone stale would read it again, which the page's own queries do
 * only on mount.
 */
export function useMapReadsBesideHold(): void {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { section: param } = useParams();
  const location = useLocation();
  const verdict = useFdeOpenInSettings();
  const userId = isAuthenticated ? user?.id : undefined;
  const account = userId ? `${userId} ${accountEpoch()}` : null;
  const drawn = useRef(false);
  if (!drawn.current) {
    if (account && !earlyFor(account)) {
      early = { account, at: Date.now() };
      void syncMapAccount();
    }
    // The FDE section reads the catalogue for its shelf and its join, and
    // every section reads it for the switcher's figure while the path may be
    // open.
    const fdeOnScreen = resolveSection(param, location.search, readString(SECTION_KEY)).section === 'forward-deployed-engineer';
    if (fdeOnScreen || verdict === 'open' || verdict === 'unknown') {
      void queryClient.prefetchQuery(pathCatalogQuery);
      if (userId) void queryClient.prefetchQuery(enrollmentsQuery(userId));
    }
  }
  useEffect(() => {
    drawn.current = true;
  }, []);
  useEffect(() => {
    if (!account) return;
    if (earlyFor(account)) {
      early = null;
      return;
    }
    void syncMapAccount();
  }, [account]);
}
