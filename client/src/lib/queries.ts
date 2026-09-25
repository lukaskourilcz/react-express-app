// Shared TanStack Query hooks for the app's read-only fetches. Centralising the
// query keys + fns here means callers get caching, request de-duplication
// (e.g. /learn and /roadmap share one roadmap-structure fetch), background
// revalidation and built-in cancellation for free — replacing the bespoke
// useEffect + AbortController + loading/error state each screen used to carry.

import { useQuery } from '@tanstack/react-query';
import { fetchRoadmapStructure } from './roadmap';
import { fetchLeaderboard, type LeaderboardPeriod } from './play';
import { getUserStats, createOrUpdateUserStats, type UserStats } from './supabase';
import { listFlashcards } from './flashcards';
import { getChallengeLeaderboard } from './challengeApi';
import { useSubject } from './subjects';

/** The roadmap level/checkpoint map. Shared by the Learn path and the roadmap tree. */
export function useRoadmapStructure() {
  return useQuery({
    queryKey: ['roadmap', 'structure'],
    // React Query supplies an AbortSignal that fetchRoadmapStructure forwards to fetch.
    queryFn: ({ signal }) => fetchRoadmapStructure(signal),
    staleTime: 5 * 60_000, // the structure only changes when questions are edited in /dev
  });
}

/** What one board needs from the server. The 30-day board is the default. */
export type LeaderboardRequest =
  | { period: '30d'; category: string | null; viewer: string | null }
  | { period: 'global'; categories: string[] }
  | { period: 'category'; category: string }
  | { period: 'daily'; date: string; categories: string[] };

/** A leaderboard board. The key holds only the inputs that change the result,
 *  plus the viewer on the 30-day board, whose response carries their own line. */
export function useLeaderboard(request: LeaderboardRequest) {
  const period: LeaderboardPeriod = request.period;
  return useQuery({
    queryKey: [
      'leaderboard',
      period,
      request.period === 'daily' ? request.date : null,
      request.period === 'category' || request.period === '30d' ? request.category : null,
      request.period === 'global' || request.period === 'daily' ? request.categories.join(',') : null,
      request.period === '30d' ? request.viewer : null,
    ],
    queryFn: ({ signal }) =>
      fetchLeaderboard(period, {
        signal,
        date: request.period === 'daily' ? request.date : undefined,
        category: request.period === 'category' || request.period === '30d' ? request.category : undefined,
        categories: request.period === 'global' || request.period === 'daily' ? request.categories : undefined,
        personal: request.period === '30d' && !!request.viewer,
      }),
    staleTime: 30_000,
  });
}

export const profileStatsQueryKey = (userId: string | undefined) =>
  ['profile-stats', userId] as const;

/** The signed-in user's profile stats, creating the row on first visit. */
export function useProfileStats(
  userId: string | undefined,
  createWith: { email?: string; name?: string; picture?: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: profileStatsQueryKey(userId),
    enabled: enabled && !!userId,
    queryFn: async (): Promise<UserStats | null> => {
      const loaded = await getUserStats(userId!);
      return loaded ?? (await createOrUpdateUserStats(userId!, createWith));
    },
  });
}

/** The signed-in user's saved flashcards. */
export function useFlashcards(enabled: boolean) {
  const [subject] = useSubject();
  return useQuery({
    queryKey: ['flashcards', subject],
    enabled,
    queryFn: listFlashcards,
  });
}

/** The Biggest Shark Challenge leaderboard (best-effort; never throws to the UI). */
export function useChallengeLeaderboard() {
  const [subject] = useSubject();
  return useQuery({
    queryKey: ['challenge', 'leaderboard', subject],
    queryFn: getChallengeLeaderboard,
    staleTime: 30_000,
  });
}
