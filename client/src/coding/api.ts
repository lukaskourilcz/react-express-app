// Typed wrappers over the coding API resources plus the TanStack Query hooks
// the section screens use. Query keys live under ['coding', …] so a submit
// can invalidate exactly the progress it changed.
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { getStoredLang } from '../i18n/LanguageContext';
import type {
  CodingDraftResponse,
  CodingProgressResponse,
  CodingRevealRequest,
  CodingRevealResponse,
  CodingSubmitRequest,
  CodingTaskResponse,
  CodingVerdictResponse,
  GithubConnectStartResponse,
  GithubConnectionResponse,
  GithubSyncResponse,
} from '../../../shared/coding-api';

const ROADMAP = '/api/quiz/roadmap';
const USER = '/api/user/[op]';

export const codingKeys = {
  task: (id: string) => ['coding', 'task', id] as const,
  progress: () => ['coding', 'progress'] as const,
  github: () => ['coding', 'github'] as const,
};

export function fetchCodingTask(id: string, signal?: AbortSignal): Promise<CodingTaskResponse> {
  return apiFetch<CodingTaskResponse>(`${ROADMAP}?resource=coding-task&id=${encodeURIComponent(id)}`, { signal });
}

export function submitCoding(input: CodingSubmitRequest): Promise<CodingVerdictResponse> {
  return apiFetch<CodingVerdictResponse>(`${ROADMAP}?resource=coding-submit`, {
    method: 'POST',
    body: JSON.stringify({ ...input, lang: getStoredLang() }),
    timeoutMs: 30_000,
  });
}

export function revealCoding(input: CodingRevealRequest): Promise<CodingRevealResponse> {
  return apiFetch<CodingRevealResponse>(`${ROADMAP}?resource=coding-reveal`, { method: 'POST', body: JSON.stringify(input) });
}

export function fetchCodingProgress(signal?: AbortSignal): Promise<CodingProgressResponse> {
  return apiFetch<CodingProgressResponse>(`${USER}?op=coding-progress`, { signal });
}

export function fetchCodingDraft(id: string, signal?: AbortSignal): Promise<CodingDraftResponse> {
  return apiFetch<CodingDraftResponse>(`${USER}?op=coding-draft&id=${encodeURIComponent(id)}`, { signal });
}

export function saveCodingDraft(id: string, code: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`${USER}?op=coding-draft`, { method: 'POST', body: JSON.stringify({ id, code }) });
}

export function fetchGithubConnection(signal?: AbortSignal): Promise<GithubConnectionResponse> {
  return apiFetch<GithubConnectionResponse>(`${USER}?op=github-connection`, { signal });
}
export function startGithubConnect(): Promise<GithubConnectStartResponse> {
  return apiFetch<GithubConnectStartResponse>(`${USER}?op=github-connect-start`, { method: 'POST', body: '{}' });
}
export function finishGithubConnect(installationId: string, state: string): Promise<GithubConnectionResponse> {
  return apiFetch<GithubConnectionResponse>(`${USER}?op=github-connect-finish`, { method: 'POST', body: JSON.stringify({ installationId, state }) });
}
export function chooseGithubRepo(repoFullName: string): Promise<GithubConnectionResponse> {
  return apiFetch<GithubConnectionResponse>(`${USER}?op=github-repo`, { method: 'POST', body: JSON.stringify({ repoFullName }) });
}
export function syncGithub(): Promise<GithubSyncResponse> {
  return apiFetch<GithubSyncResponse>(`${USER}?op=github-sync`, { method: 'POST', body: '{}', timeoutMs: 30_000 });
}
export function disconnectGithub(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`${USER}?op=github-disconnect`, { method: 'POST', body: '{}' });
}

/** The signed-in learner's coding progress; `enabled` false for anonymous visitors. */
export function useCodingProgress(enabled: boolean) {
  return useQuery({
    queryKey: codingKeys.progress(),
    enabled,
    queryFn: ({ signal }) => fetchCodingProgress(signal),
    staleTime: 30_000,
  });
}

export function useCodingTask(id: string | undefined) {
  return useQuery({
    queryKey: codingKeys.task(id ?? ''),
    enabled: Boolean(id),
    queryFn: ({ signal }) => fetchCodingTask(id!, signal),
    staleTime: 0,
    gcTime: 60_000,
  });
}

export function useGithubConnection(enabled: boolean) {
  return useQuery({
    queryKey: codingKeys.github(),
    enabled,
    queryFn: ({ signal }) => fetchGithubConnection(signal),
    staleTime: 30_000,
  });
}
