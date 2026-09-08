// The learner's saved coding challenges and named collections (issue #157).
//
// One query holds the whole library; every mutation returns the new library, so
// the cache is replaced rather than patched and two tabs cannot drift. Saving is
// a reading-list action: it never changes what the learner may start.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { CodingLibraryAction, CodingLibraryResponse } from '../../../shared/coding-library';

const USER = '/api/user/[op]';

export const codingLibraryKey = () => ['coding', 'library'] as const;

export function fetchCodingLibrary(signal?: AbortSignal): Promise<CodingLibraryResponse> {
  return apiFetch<CodingLibraryResponse>(`${USER}?op=coding-library`, { signal });
}

export function runCodingLibraryAction(action: CodingLibraryAction): Promise<CodingLibraryResponse> {
  return apiFetch<CodingLibraryResponse>(`${USER}?op=coding-library`, {
    method: 'POST',
    body: JSON.stringify(action),
  });
}

/** The signed-in learner's library; disabled for anonymous visitors. */
export function useCodingLibrary(enabled: boolean) {
  return useQuery({
    queryKey: codingLibraryKey(),
    enabled,
    queryFn: ({ signal }) => fetchCodingLibrary(signal),
    staleTime: 30_000,
  });
}

export function useCodingLibraryAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runCodingLibraryAction,
    onSuccess: (library) => queryClient.setQueryData(codingLibraryKey(), library),
  });
}
