// Short practice sessions and skip feedback (issues #159, #160).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { PracticeSessionResponse, SessionMinutes } from '../../../shared/practice-session';
import type { CodingSkipRequest, CodingSkipResponse } from '../../../shared/coding-skip';

const USER = '/api/user/[op]';

export const practiceKeys = { session: () => ['coding', 'practice-session'] as const };

export function fetchPracticeSession(signal?: AbortSignal): Promise<PracticeSessionResponse> {
  return apiFetch<PracticeSessionResponse>(`${USER}?op=practice-session`, { signal });
}

export function usePracticeSession(enabled: boolean) {
  return useQuery({
    queryKey: practiceKeys.session(),
    enabled,
    queryFn: ({ signal }) => fetchPracticeSession(signal),
    staleTime: 15_000,
  });
}

type SessionAction =
  | { action: 'start'; minutes: SessionMinutes; touch?: boolean }
  | { action: 'advance'; position?: number }
  | { action: 'finish' };

export function usePracticeSessionAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionAction) =>
      apiFetch<PracticeSessionResponse>(`${USER}?op=practice-session`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (result) => queryClient.setQueryData(practiceKeys.session(), result),
  });
}

/** Record a skip. It never awards XP, evidence or an unlock (issue #160). */
export function useSkipTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CodingSkipRequest) =>
      apiFetch<CodingSkipResponse>(`${USER}?op=coding-skip`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: practiceKeys.session() }),
  });
}
