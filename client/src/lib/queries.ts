// Shared TanStack Query hooks for the app's read-only fetches. Centralising the
// query keys + fns here means callers get caching, request de-duplication
// (e.g. /learn and /roadmap share one roadmap-structure fetch), background
// revalidation and built-in cancellation for free — replacing the bespoke
// useEffect + AbortController + loading/error state each screen used to carry.

import { useQuery } from '@tanstack/react-query';
import { fetchRoadmapStructure } from './roadmap';
import { fetchLeaderboard } from './play';
import { getUserStats, createOrUpdateUserStats, type UserStats } from './supabase';
import { listFlashcards } from './flashcards';
import { getChallengeLeaderboard } from './challengeApi';

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

/** A leaderboard board. The key only includes the inputs that affect the result.
 *  `categories` scopes the all-time board to the active subject (platform). */
export function useLeaderboard(period: LeaderboardPeriod, date: string, category: string, categories: string[]) {
  return useQuery({
    queryKey: [
      'leaderboard',
      period,
      period === 'daily' ? date : null,
      period === 'category' ? category : null,
      period === 'global' ? categories.join(',') : null,
    ],
    queryFn: () => fetchLeaderboard(period, { date, category, categories }),
    staleTime: 30_000,
  });
}

/** The signed-in user's profile stats, creating the row on first visit. */
export function useProfileStats(
  userId: string | undefined,
  createWith: { email?: string; name?: string; picture?: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    enabled: enabled && !!userId,
    queryFn: async (): Promise<UserStats | null> => {
      const loaded = await getUserStats(userId!);
      return loaded ?? (await createOrUpdateUserStats(userId!, createWith));
    },
  });
}

/** The signed-in user's saved flashcards. */
export function useFlashcards(enabled: boolean) {
  return useQuery({
    queryKey: ['flashcards'],
    enabled,
    queryFn: listFlashcards,
  });
}

/** The Biggest Shark Challenge leaderboard (best-effort; never throws to the UI). */
export function useChallengeLeaderboard() {
  return useQuery({
    queryKey: ['challenge', 'leaderboard'],
    queryFn: getChallengeLeaderboard,
    staleTime: 30_000,
  });
}
