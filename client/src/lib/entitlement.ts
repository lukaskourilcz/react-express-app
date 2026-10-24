// The signed-in account's plan: `useEntitlement()` on TanStack Query.
//
// The server decides what is open; this only reads what it holds for the
// account. Signed-out visitors are free without a request. The locks drawn from
// the plan live in `./locks`, which carries the coding index, so screens that
// only need the plan line (the Profile) do not load it.
import { useCallback } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import { useAuth } from './auth';
import { queryClient } from './queryClient';
import { freshStoredAccessToken, storedSessionUserId } from './supabaseClient';
import type { EntitlementResponse, Tier } from '../../../shared/tiers';
import { ENTITLEMENT_QUERY_ROOT } from './upgradeSheet';

export const entitlementKeys = {
  all: ENTITLEMENT_QUERY_ROOT,
  user: (userId: string) => [...ENTITLEMENT_QUERY_ROOT, userId] as const,
};

export function fetchEntitlement(signal?: AbortSignal): Promise<EntitlementResponse> {
  return apiFetch<EntitlementResponse>('/api/user/[op]?op=entitlement', { signal });
}

export interface EntitlementState {
  /** The plan, once known. Signed-out visitors are free without a request. */
  tier: Tier | null;
  signedIn: boolean;
  /** First load for a signed-in account: paint nothing that depends on the plan. */
  loading: boolean;
  /** The plan could not be loaded and no earlier answer is cached. */
  failed: boolean;
  data: EntitlementResponse | null;
  refetch: () => void;
}

/** One account's plan, as one set of options the hook and a page's first-data
 * prefetch share. */
export const entitlementQuery = (userId: string) => queryOptions({
  queryKey: entitlementKeys.user(userId),
  queryFn: ({ signal }) => fetchEntitlement(signal),
  staleTime: 60_000,
});

/**
 * Start the plan read of the account whose session is stored, as the app
 * starts (perf baseline #587 C14). The header and every Learn map read the
 * plan anyway, and a map holds its first draw for it; asked only once auth
 * had restored the user, it left after the supabase-js download and the
 * session read. With a stored token supabase-js would hand out unchanged
 * (`freshStoredAccessToken`) the read leaves at once, under the key the
 * account's own query uses, so the hold finds it answered or in flight. One
 * attempt, as the hold's own read (lib/routeData.ts readOnce). A session that
 * turns out to have ended signs out, and the sign-out empties the cache.
 */
export function prefetchStoredAccountPlan(): void {
  const userId = storedSessionUserId();
  if (!userId || !freshStoredAccessToken()) return;
  void queryClient.prefetchQuery({ ...entitlementQuery(userId), retry: false });
}

/** `held`: the page's first-data hold read the plan (lib/routeData.ts
 * HELD_READ), so a failure it met shows as failed instead of loading again. */
export function useEntitlement({ held = false }: { held?: boolean } = {}): EntitlementState {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const query = useQuery({
    ...entitlementQuery(user?.id ?? 'signed-out'),
    enabled: isAuthenticated && Boolean(user),
    refetchOnWindowFocus: true,
    retryOnMount: !held,
  });
  const data = isAuthenticated ? query.data ?? null : null;
  const tier: Tier | null = authLoading ? null : !isAuthenticated ? 'free' : data?.tier ?? null;
  const { refetch } = query;
  return {
    tier,
    signedIn: isAuthenticated,
    loading: authLoading || (isAuthenticated && query.isPending && !query.isError),
    failed: isAuthenticated && query.isError && !data,
    data,
    refetch: useCallback(() => void refetch(), [refetch]),
  };
}
