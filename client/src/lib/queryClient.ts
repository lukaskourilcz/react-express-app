// Single shared TanStack Query client. Defaults are tuned for this app: data
// (roadmap structure, leaderboards) changes on the order of minutes, not
// seconds, so we keep a generous staleTime, don't refetch on every window focus
// (a quiz app tab-switches a lot), and retry once on transient failures.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      // A 402 is an answer (Premium opens this), not a transient failure.
      retry: (failures, error) => (error as { status?: unknown } | null)?.status !== 402 && failures < 1,
      refetchOnWindowFocus: false,
    },
  },
});
