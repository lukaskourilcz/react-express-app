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
import { getStreakProtection, type StreakProtection } from './streakFreezes';
import { getChallengeLeaderboard, getSprintLeaderboard } from './challengeApi';
import { getLeagueBoard } from './league';
import { useSubject } from './subjects';

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
export function useLeaderboard(
  period: LeaderboardPeriod,
  date: string,
  category: string,
  categories: string[],
  /** False while a sibling tab owns the screen, so no board is fetched for a
   *  view nobody is looking at. */
  enabled = true,
) {
  return useQuery({
    enabled,
    queryKey: [
      'leaderboard',
      period,
      period === 'daily' ? date : null,
      period === 'category' ? category : null,
      period === 'global' || period === 'daily' ? categories.join(',') : null,
    ],
    queryFn: () => fetchLeaderboard(period, { date, category, categories }),
    staleTime: 30_000,
  });
}

/** The caller's own weekly league cohort. Authenticated, and the server is the
 *  one that says so: a signed-out read comes back 401 and the panel renders the
 *  sign-in state from that, rather than keeping a second copy of who is signed
 *  in. Only mounted when the League tab is open, so nothing is fetched for a
 *  tab nobody looked at. */
export function useLeague(subject: string) {
  return useQuery({
    queryKey: ['league', subject],
    queryFn: () => getLeagueBoard(subject),
    staleTime: 30_000,
    retry: false,
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

/**
 * The protection budget and any live shield.
 *
 * Gated rather than eager on purpose: Today only needs to know whether a
 * protection is already on when the streak is actually standing on yesterday,
 * so the request is made for the few learners it can change an answer for and
 * for nobody else. `getStreakProtection` never throws, so a failure resolves
 * to the unprotected state and the surface offers the protection instead of
 * claiming one.
 */
export function useStreakProtection(enabled: boolean) {
  return useQuery<StreakProtection>({
    queryKey: ['streak-protection'],
    enabled,
    queryFn: getStreakProtection,
    staleTime: 60_000,
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

/** The three-minute sprint's own board. Separate key, because a sprint score
 *  and a strikes score are never ranked against each other. */
export function useSprintLeaderboard(enabled = true) {
  const [subject] = useSubject();
  return useQuery({
    queryKey: ['sprint', 'leaderboard', subject],
    queryFn: getSprintLeaderboard,
    staleTime: 30_000,
    enabled,
  });
}
