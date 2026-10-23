// Single shared TanStack Query client. Defaults are tuned for this app: data
// (roadmap structure, leaderboards) changes on the order of minutes, not
// seconds, so we keep a generous staleTime, don't refetch on every window focus
// (a quiz app tab-switches a lot), and retry once on transient failures.

import { QueryClient } from '@tanstack/react-query';

/** A failed read gets one more try when the failure may pass: a dropped
 * connection, a timeout or a server error. An answer in the 4xx range is the
 * server's word and comes back the same: signed out, not allowed, not found,
 * Premium opens this (402), or rate limited, where a retry at once only spends
 * the budget that refused it. */
function retryQuery(failures: number, error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return failures < 1 && !(typeof status === 'number' && status >= 400 && status < 500);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: retryQuery,
      refetchOnWindowFocus: false,
    },
  },
});

/** Any verified learning can move the streak from migration 048 (a quiz, a
 * finished Learn level, a coding pass, an awarded Challenge run), so after one
 * the Profile re-reads its stats the next time it shows them. The key is
 * profileStatsQueryKey's prefix (lib/queries.ts, which imports this file's
 * callers and so cannot be imported here). */
export function staleProfileStats(): void {
  void queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
}
