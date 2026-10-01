// Whether the public leaderboards show the signed-in learner's name and photo
// (api/user/[op].ts, op=leaderboard-visibility; migration 049). It is off
// until the learner switches it on, and the boards list them as "Learner"
// meanwhile. The Profile and the Leaderboard draw their switches from this one
// query and mutation, so the two always agree.

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import { useAuth } from './auth';

const URL = '/api/user/leaderboard-visibility';

export interface LeaderboardVisibility {
  visible: boolean;
}

export const leaderboardVisibilityQuery = (userId: string) => queryOptions({
  queryKey: ['leaderboard-visibility', userId],
  queryFn: ({ signal }) => apiFetch<LeaderboardVisibility>(URL, { signal }),
  staleTime: 5 * 60_000,
});

/**
 * The signed-in learner's setting and the way to change it. `setVisible`
 * shows the new state at once and puts the old one back if the save fails;
 * pass `onError` to tell the learner. A save, successful or not, refetches
 * every board this tab has loaded: the learner's own 30-day board, whose line
 * for them is uncached, follows at once, and the shared boards follow as soon
 * as the CDN's copy expires, within a minute (they are never served stale).
 */
export function useLeaderboardVisibility() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const options = leaderboardVisibilityQuery(userId ?? '');
  const query = useQuery({ ...options, enabled: !!userId });

  const mutation = useMutation({
    mutationFn: (visible: boolean) =>
      apiFetch<LeaderboardVisibility>(URL, { method: 'PUT', body: JSON.stringify({ visible }) }),
    onMutate: async (visible: boolean) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      const previous = queryClient.getQueryData(options.queryKey);
      queryClient.setQueryData(options.queryKey, { visible });
      return { previous };
    },
    onError: (_error, _visible, context) => {
      if (context?.previous) queryClient.setQueryData(options.queryKey, context.previous);
      else void queryClient.resetQueries({ queryKey: options.queryKey });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(options.queryKey, saved);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
  });

  return {
    /** Null while it has not loaded (or there is no signed-in learner). */
    visible: query.data?.visible ?? null,
    loading: query.isPending && !!userId,
    failed: query.isError && query.data === undefined,
    retry: () => void query.refetch(),
    saving: mutation.isPending,
    setVisible: (visible: boolean, handlers?: { onError?: (error: unknown) => void }) =>
      mutation.mutate(visible, { onError: handlers?.onError }),
  };
}
