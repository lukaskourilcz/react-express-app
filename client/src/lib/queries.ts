// Shared TanStack Query hooks for the app's read-only fetches. Centralising the
// query keys + fns here means callers get caching, request de-duplication
// (e.g. /learn and /roadmap share one roadmap-structure fetch), background
// revalidation and built-in cancellation for free — replacing the bespoke
// useEffect + AbortController + loading/error state each screen used to carry.

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRoadmapStructure } from './roadmap';
import { useAuth } from './auth';
import { entitlementQuery } from './entitlement';
import { readOnce, settled, useFirstData } from './routeData';
import { fetchLeaderboard, type LeaderboardPeriod } from './play';
import { getUserStats, createOrUpdateUserStats, type UserStats } from './supabase';
import { apiFetch } from './api';
import { listFlashcards } from './flashcards';
import { getChallengeLeaderboard } from './challengeApi';
import { useSubject, type SubjectId } from './subjects';

/** The roadmap level/checkpoint map, as one set of options the hook and a
 * page's first-data prefetch share. */
export const roadmapStructureQuery = queryOptions({
  queryKey: ['roadmap', 'structure'],
  // React Query supplies an AbortSignal that fetchRoadmapStructure forwards to fetch.
  queryFn: ({ signal }) => fetchRoadmapStructure(signal),
  staleTime: 5 * 60_000, // the structure only changes when questions are edited in /dev
});

/** The roadmap level/checkpoint map. Shared by the Learn path and the roadmap tree. */
export function useRoadmapStructure() {
  return useQuery(roadmapStructureQuery);
}

/** Hold a page drawn from the roadmap structure until the structure (and,
 * with `plan`, a signed-in account's plan, which decides the Premium marks) is
 * in the cache, so it draws its path once instead of a skeleton first. */
export function useRoadmapStructureFirst({ plan }: { plan: boolean }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const account = plan ? user : null;
  useFirstData(`structure ${account?.id ?? ''}`, () => settled([
    readOnce(queryClient, roadmapStructureQuery),
    account ? readOnce(queryClient, entitlementQuery(account.id)) : null,
  ]));
}

/** What one board needs from the server. The 30-day board is the default. */
export type LeaderboardRequest =
  | { period: '30d'; category: string | null; viewer: string | null }
  | { period: 'global'; categories: string[] }
  | { period: 'category'; category: string }
  | { period: 'daily'; date: string; categories: string[] };

/** One board, as one set of options the hook and the page's first-data
 *  prefetch share, so the two cannot ask for different keys. The key holds only
 *  the inputs that change the result, plus the viewer on the 30-day board,
 *  whose response carries their own line. */
export function leaderboardQuery(request: LeaderboardRequest) {
  const period: LeaderboardPeriod = request.period;
  return queryOptions({
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

/** A leaderboard board. */
export function useLeaderboard(request: LeaderboardRequest) {
  return useQuery(leaderboardQuery(request));
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

/** The Biggest Shark Challenge leaderboard of a subject, as one set of
 * options the hook and the page's first-data prefetch share. */
export const challengeLeaderboardQuery = (subject: SubjectId) => queryOptions({
  queryKey: ['challenge', 'leaderboard', subject],
  queryFn: getChallengeLeaderboard,
  staleTime: 30_000,
});

/** The Biggest Shark Challenge leaderboard (best-effort; never throws to the UI). */
export function useChallengeLeaderboard() {
  const [subject] = useSubject();
  return useQuery(challengeLeaderboardQuery(subject));
}

/** Concepts whose spaced review is due, for Today's review card. */
interface ConceptDueResponse {
  due: { conceptId: string; overdueHours: number; stage: number }[];
  estimatedMinutes: number;
}

/** The signed-in learner's due concepts, as one set of options the Today card
 * and Today's first-data prefetch share. A failure only hides the card, so it
 * is not retried. */
export const conceptDueQuery = queryOptions({
  queryKey: ['concept-due'],
  queryFn: () => apiFetch<ConceptDueResponse>('/api/quiz/questions?resource=due'),
  staleTime: 60_000,
  retry: false,
});
