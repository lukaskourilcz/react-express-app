// Profile edits the independent leaderboard preference; boards read it.
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import { useAuth } from './auth';

const URL = '/api/user/leaderboard-name';

export interface LeaderboardVisibility {
  mode: 'nickname' | 'account';
  nickname: string;
  accountName: string | null;
  showPhoto?: boolean;
  picture?: string | null;
}

export const leaderboardVisibilityQuery = (userId: string) => queryOptions({
  queryKey: ['leaderboard-name', userId],
  queryFn: ({ signal }) => apiFetch<LeaderboardVisibility>(URL, { signal }),
  staleTime: 5 * 60_000,
});

type Patch = { mode?: LeaderboardVisibility['mode']; showPhoto?: boolean };

/**
 * The signed-in learner's setting and the way to change it. `setMode`
 * shows the new state at once and puts the old one back if the save fails;
 * pass `onError` to tell the learner. A save, successful or not, refetches
 * every board this tab has loaded: the learner's own 30-day board, whose line
 * for them is uncached, follows at once, and the shared boards follow as soon
 * as the CDN's copy expires, within a minute (they are never served stale).
 *
 * A save writes its answer to the account that made it. The hook's options
 * follow whoever is signed in now, and a pending save takes them up on each
 * render, so a save that lands after another account signed in would
 * otherwise write the first account's names into the second one's setting.
 */
export function useLeaderboardVisibility() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const options = leaderboardVisibilityQuery(userId ?? '');
  const query = useQuery({ ...options, enabled: !!userId });

  const mutation = useMutation({
    mutationFn: (patch: Patch) =>
      apiFetch<LeaderboardVisibility>(URL, { method: 'PUT', body: JSON.stringify(patch) }),
    onMutate: async (patch: Patch) => {
      const queryKey = options.queryKey;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: LeaderboardVisibility | undefined) => old ? { ...old, ...patch } : old);
      return { previous, queryKey };
    },
    onError: (_error, _patch, context) => {
      if (!context) return;
      if (context.previous) queryClient.setQueryData(context.queryKey, context.previous);
      else void queryClient.resetQueries({ queryKey: context.queryKey });
    },
    onSuccess: (saved, _patch, context) => {
      if (context) queryClient.setQueryData(context.queryKey, saved);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
  });

  return {
    /** Null while it has not loaded (or there is no signed-in learner). */
    setting: query.data ?? null,
    loading: query.isPending && !!userId,
    failed: query.isError && query.data === undefined,
    retry: () => void query.refetch(),
    saving: mutation.isPending,
    setMode: (mode: LeaderboardVisibility['mode'], handlers?: { onError?: (error: unknown) => void }) =>
      mutation.mutate({ mode }, { onError: handlers?.onError }),
    setPhoto: (showPhoto: boolean, handlers?: { onError?: (error: unknown) => void }) =>
      mutation.mutate({ showPhoto }, { onError: handlers?.onError }),
  };
}
