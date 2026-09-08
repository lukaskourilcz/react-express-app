// The learner's plan: their versioned profile and the eligibility it produces.
//
// One fetch of `?op=eligibility` answers every question a personalised surface
// asks — which paths exist, which topics are open, what the next step is — so
// the Roadmap, Today, the navigation and the coding session queue never invent
// their own rules. When the learner has no profile yet, `personalized` is false
// and the surfaces fall back to the generic roadmap.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type {
  LearnerProfileDraft,
  LearnerProfileFieldError,
  LearnerProfileState,
} from '../../../shared/learner-profile';
import type { EligibilityResponse, StepRef } from '../../../shared/progression';

const USER = '/api/user/[op]';

export const learningPlanKeys = {
  profile: () => ['learning-plan', 'profile'] as const,
  eligibility: () => ['learning-plan', 'eligibility'] as const,
};

export type LearnerProfileSaveResponse = LearnerProfileState & { planChanged?: boolean };

export function fetchLearnerProfile(signal?: AbortSignal): Promise<LearnerProfileState> {
  return apiFetch<LearnerProfileState>(`${USER}?op=learner-profile`, { signal });
}

export function saveLearnerProfile(profile: LearnerProfileDraft): Promise<LearnerProfileSaveResponse> {
  return apiFetch<LearnerProfileSaveResponse>(`${USER}?op=learner-profile`, {
    method: 'PUT',
    body: JSON.stringify({ profile }),
  });
}

export function fetchEligibility(signal?: AbortSignal): Promise<EligibilityResponse> {
  return apiFetch<EligibilityResponse>(`${USER}?op=eligibility`, { signal });
}

/** The signed-in learner's profile; disabled for anonymous visitors. */
export function useLearnerProfile(enabled: boolean) {
  return useQuery({
    queryKey: learningPlanKeys.profile(),
    enabled,
    queryFn: ({ signal }) => fetchLearnerProfile(signal),
    staleTime: 60_000,
  });
}

/** The eligibility response every personalised surface reads. */
export function useEligibility(enabled: boolean) {
  return useQuery({
    queryKey: learningPlanKeys.eligibility(),
    enabled,
    queryFn: ({ signal }) => fetchEligibility(signal),
    staleTime: 30_000,
  });
}

/**
 * Save answers. A write that changes the plan invalidates everything derived
 * from it — eligibility, the roadmap structure view and the coding queue — so
 * a second device or a stale tab cannot keep showing the old plan.
 */
export function useSaveLearnerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveLearnerProfile,
    onSuccess: (result) => {
      queryClient.setQueryData(learningPlanKeys.profile(), {
        profile: result.profile,
        draft: result.draft,
        missing: result.missing,
        complete: result.complete,
        version: result.version,
      } satisfies LearnerProfileState);
      void queryClient.invalidateQueries({ queryKey: learningPlanKeys.eligibility() });
      if (result.planChanged) {
        void queryClient.invalidateQueries({ queryKey: ['roadmap'] });
        void queryClient.invalidateQueries({ queryKey: ['coding'] });
      }
    },
  });
}

/** Field errors returned by a rejected write, keyed by field. */
export function fieldErrorsOf(error: unknown): Record<string, LearnerProfileFieldError['code']> {
  const fields = (error as { fields?: LearnerProfileFieldError[] } | null)?.fields;
  if (!Array.isArray(fields)) return {};
  return Object.fromEntries(fields.map((one) => [one.field, one.code]));
}

/** A deep link for one step of the plan. */
export function stepHref(step: StepRef | null): string | null {
  if (!step) return null;
  return step.kind === 'level'
    ? `/learn?topic=${encodeURIComponent(step.topic)}&level=${step.ref}`
    : `/learn?topic=${encodeURIComponent(step.topic)}&checkpoint=${step.ref}`;
}
