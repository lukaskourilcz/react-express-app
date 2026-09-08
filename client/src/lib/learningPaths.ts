// Typed wrappers over the learning-path API plus the TanStack Query hooks the
// path screens use. Query keys live under ['learning-path', …] and always
// carry the account and the enrollment, so signing in as somebody else can
// never show the previous learner's evidence from a warm cache.
//
// Nothing here decides what a learner has passed. The server owns grading,
// enrollment and completion; this module only asks and renders the answer.

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  DraftGetResponse,
  DraftSaveRequest,
  DraftSaveResponse,
  EnrollmentCreateRequest,
  EnrollmentListResponse,
  LearningPathCatalogResponse,
  LearningPreferenceRequest,
  LearningPreferenceResponse,
  PathAvailability,
  PathCatalogEntry,
  PathProgressResponse,
  StartActivityRequest,
  StartActivityResponse,
  SubmitActivityRequest,
  SubmitActivityResponse,
} from '../../../shared/learning-path-api';
import type { LearningPathId } from '../../../shared/learning-paths';

const ROADMAP = '/api/quiz/roadmap';
const USER = '/api/user/[op]';

export const learningPathKeys = {
  catalog: () => ['learning-path', 'catalog'] as const,
  preference: (userId: string | undefined) => ['learning-path', 'preference', userId ?? 'anon'] as const,
  enrollments: (userId: string | undefined) => ['learning-path', 'enrollments', userId ?? 'anon'] as const,
  progress: (userId: string | undefined, enrollmentId: string | undefined, version: number | undefined) =>
    ['learning-path', 'progress', userId ?? 'anon', enrollmentId ?? '', version ?? 0] as const,
  draft: (enrollmentId: string | undefined, activityId: string | undefined) =>
    ['learning-path', 'draft', enrollmentId ?? '', activityId ?? ''] as const,
};

/* ── catalog ───────────────────────────────────────────────────────────── */

export function fetchPathCatalog(signal?: AbortSignal): Promise<LearningPathCatalogResponse> {
  return apiFetch<LearningPathCatalogResponse>(`${ROADMAP}?resource=learning-path-catalog`, { signal });
}

/** The published manifests. Guests get this too — the outline is previewable
 * without an account; only persisted, graded work needs one. */
export function usePathCatalog(enabled = true) {
  return useQuery({
    queryKey: learningPathKeys.catalog(),
    enabled,
    queryFn: ({ signal }) => fetchPathCatalog(signal),
    staleTime: 5 * 60_000,
  });
}

export const entryFor = (
  catalog: LearningPathCatalogResponse | undefined,
  pathId: LearningPathId,
): PathCatalogEntry | undefined => catalog?.paths.find((entry) => entry.manifest.id === pathId);

/** True when a learner can enrol and record work right now. Anything else is
 * previewable, and the reason is shown rather than hidden. */
export const isOpen = (availability: PathAvailability | undefined): boolean => availability === 'available';

/* ── preference ────────────────────────────────────────────────────────── */

export function fetchLearningPreference(signal?: AbortSignal): Promise<LearningPreferenceResponse> {
  return apiFetch<LearningPreferenceResponse>(`${USER}?op=learning-preference`, { signal });
}

export function saveLearningPreference(input: LearningPreferenceRequest): Promise<LearningPreferenceResponse> {
  return apiFetch<LearningPreferenceResponse>(`${USER}?op=learning-preference`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function useLearningPreference(userId: string | undefined) {
  return useQuery({
    queryKey: learningPathKeys.preference(userId),
    enabled: Boolean(userId),
    queryFn: ({ signal }) => fetchLearningPreference(signal),
    staleTime: 60_000,
  });
}

/* ── enrollment ────────────────────────────────────────────────────────── */

export function fetchEnrollments(signal?: AbortSignal): Promise<EnrollmentListResponse> {
  return apiFetch<EnrollmentListResponse>(`${USER}?op=learning-path-enrollment`, { signal });
}

export function changeEnrollment(input: EnrollmentCreateRequest): Promise<EnrollmentListResponse> {
  return apiFetch<EnrollmentListResponse>(`${USER}?op=learning-path-enrollment`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function useEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: learningPathKeys.enrollments(userId),
    enabled: Boolean(userId),
    queryFn: ({ signal }) => fetchEnrollments(signal),
    staleTime: 30_000,
  });
}

/* ── progress ──────────────────────────────────────────────────────────── */

export function fetchPathProgress(enrollmentId: string, signal?: AbortSignal): Promise<PathProgressResponse> {
  return apiFetch<PathProgressResponse>(
    `${USER}?op=learning-path-progress&enrollmentId=${encodeURIComponent(enrollmentId)}`,
    { signal },
  );
}

export function usePathProgress(
  userId: string | undefined,
  enrollmentId: string | undefined,
  version: number | undefined,
) {
  return useQuery({
    queryKey: learningPathKeys.progress(userId, enrollmentId, version),
    enabled: Boolean(userId && enrollmentId),
    queryFn: ({ signal }) => fetchPathProgress(enrollmentId!, signal),
    staleTime: 15_000,
  });
}

/* ── activities ────────────────────────────────────────────────────────── */

export function startActivity(input: StartActivityRequest): Promise<StartActivityResponse> {
  return apiFetch<StartActivityResponse>(`${ROADMAP}?resource=learning-path-start`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function submitActivity(input: SubmitActivityRequest): Promise<SubmitActivityResponse> {
  return apiFetch<SubmitActivityResponse>(`${ROADMAP}?resource=learning-path-submit`, {
    method: 'POST',
    body: JSON.stringify(input),
    // Grading a code activity runs the sandbox; the API's own budget is
    // shorter than this, so the client never gives up first.
    timeoutMs: 30_000,
  });
}

/** A fresh key per intended submission. Retrying a failed request reuses the
 * same key so the server can replay its stored result rather than grade twice;
 * a new submission mints a new one. */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += String.fromCharCode(byte);
  return btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ── drafts ────────────────────────────────────────────────────────────── */

export function fetchPathDraft(
  enrollmentId: string,
  activityId: string,
  signal?: AbortSignal,
): Promise<DraftGetResponse> {
  return apiFetch<DraftGetResponse>(
    `${USER}?op=learning-path-draft&enrollmentId=${encodeURIComponent(enrollmentId)}&activityId=${encodeURIComponent(activityId)}`,
    { signal },
  );
}

export function savePathDraft(input: DraftSaveRequest): Promise<DraftSaveResponse> {
  return apiFetch<DraftSaveResponse>(`${USER}?op=learning-path-draft`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/* ── routes ────────────────────────────────────────────────────────────── */

/** Role specializations and skill paths get different entry routes so the
 * career flow and the focused paths stay visibly separate, even though they
 * share one workspace underneath. */
export function pathHref(pathId: LearningPathId): string {
  return pathId === 'fde' ? '/roadmap/specializations/fde' : '/roadmap/paths/dsa-foundations';
}

export function moduleHref(pathId: LearningPathId, moduleId: string): string {
  return `${pathHref(pathId)}/${encodeURIComponent(moduleId)}`;
}

export function activityHref(pathId: LearningPathId, moduleId: string, activityId: string): string {
  return `${moduleHref(pathId, moduleId)}?activity=${encodeURIComponent(activityId)}`;
}
