// Shared TanStack Query hooks for the app's read-only fetches. Centralising the
// query keys + fns here means callers get caching, request de-duplication
// (e.g. /learn and /roadmap share one roadmap-structure fetch), background
// revalidation and built-in cancellation for free — replacing the bespoke
// useEffect + AbortController + loading/error state each screen used to carry.

import { useQuery } from '@tanstack/react-query';
import { fetchRoadmapStructure } from './roadmap';
import { fetchLeaderboard } from './play';

type LeaderboardPeriod = 'global' | 'daily' | 'category';

/** The roadmap level/checkpoint map. Shared by the Learn path and the roadmap tree. */
export function useRoadmapStructure() {
  return useQuery({
    queryKey: ['roadmap', 'structure'],
    // React Query supplies an AbortSignal that fetchRoadmapStructure forwards to fetch.
    queryFn: ({ signal }) => fetchRoadmapStructure(signal),
    staleTime: 5 * 60_000, // the structure only changes when questions are edited in /dev
  });
}

/** A leaderboard board. The key only includes the inputs that affect the result. */
export function useLeaderboard(period: LeaderboardPeriod, date: string, category: string) {
  return useQuery({
    queryKey: [
      'leaderboard',
      period,
      period === 'daily' ? date : null,
      period === 'category' ? category : null,
    ],
    queryFn: () => fetchLeaderboard(period, { date, category }),
    staleTime: 30_000,
  });
}
