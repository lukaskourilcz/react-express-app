// Saved challenges, collections, skip reasons and short practice sessions.
//
// All of it is owner-scoped server state, so all of it goes through the API
// rather than localStorage: a saved list that lives on one device is not a
// saved list. None of it grants anything — the eligibility rules are applied
// server-side when a task is issued, exactly as they are for any other route.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type {
  CodingBookmarkRequest,
  CodingBookmarksResponse,
  CodingSkipRequest,
  CodingSkipResponse,
  PracticeSessionAdvanceRequest,
  PracticeSessionResponse,
  PracticeSessionStartRequest,
} from '../../../shared/coding-api';

const BOOKMARKS = '/api/user/[op]?op=coding-bookmarks';
const SKIP = '/api/user/[op]?op=coding-skip';
const SESSION = '/api/user/[op]?op=practice-session';

export const practiceKeys = {
  bookmarks: () => ['coding', 'bookmarks'] as const,
  session: () => ['coding', 'session'] as const,
};

export const fetchBookmarks = (signal?: AbortSignal): Promise<CodingBookmarksResponse> =>
  apiFetch<CodingBookmarksResponse>(BOOKMARKS, { signal });

export const writeBookmarks = (body: CodingBookmarkRequest): Promise<CodingBookmarksResponse> =>
  apiFetch<CodingBookmarksResponse>(BOOKMARKS, { method: 'PUT', body: JSON.stringify(body) });

export const skipTask = (body: CodingSkipRequest): Promise<CodingSkipResponse> =>
  apiFetch<CodingSkipResponse>(SKIP, { method: 'POST', body: JSON.stringify(body) });

export const fetchPracticeSession = (signal?: AbortSignal): Promise<PracticeSessionResponse> =>
  apiFetch<PracticeSessionResponse>(SESSION, { signal });

export const startPracticeSession = (body: PracticeSessionStartRequest): Promise<PracticeSessionResponse> =>
  apiFetch<PracticeSessionResponse>(SESSION, { method: 'POST', body: JSON.stringify(body) });

export const advancePracticeSession = (body: PracticeSessionAdvanceRequest): Promise<PracticeSessionResponse> =>
  apiFetch<PracticeSessionResponse>(SESSION, { method: 'PUT', body: JSON.stringify(body) });

/** The learner's saved challenges and collections. Signed out there are none:
 * saving is an account feature, and the UI says so rather than pretending. */
export function useBookmarks(enabled: boolean) {
  return useQuery({
    queryKey: practiceKeys.bookmarks(),
    enabled,
    queryFn: ({ signal }) => fetchBookmarks(signal),
    staleTime: 60_000,
  });
}

export function useSaveChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CodingBookmarkRequest) => writeBookmarks(input),
    onSuccess: (data) => queryClient.setQueryData(practiceKeys.bookmarks(), data),
  });
}

export function usePracticeSession(enabled: boolean) {
  return useQuery({
    queryKey: practiceKeys.session(),
    enabled,
    queryFn: ({ signal }) => fetchPracticeSession(signal),
    staleTime: 15_000,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PracticeSessionStartRequest) => startPracticeSession(input),
    onSuccess: (data) => queryClient.setQueryData(practiceKeys.session(), data),
  });
}

export function useAdvanceSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PracticeSessionAdvanceRequest) => advancePracticeSession(input),
    onSuccess: (data) => queryClient.setQueryData(practiceKeys.session(), data),
  });
}
