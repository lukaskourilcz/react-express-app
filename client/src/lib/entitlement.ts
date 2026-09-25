// The signed-in account's plan: `useEntitlement()` on TanStack Query.
//
// The server decides what is open; this only reads what it holds for the
// account. Signed-out visitors are free without a request. The locks drawn from
// the plan live in `./locks`, which carries the coding index, so screens that
// only need the plan line (the Profile) do not load it.
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import { useAuth } from './auth';
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

export function useEntitlement(): EntitlementState {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: entitlementKeys.user(user?.id ?? 'signed-out'),
    queryFn: ({ signal }) => fetchEntitlement(signal),
    enabled: isAuthenticated && Boolean(user),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
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
