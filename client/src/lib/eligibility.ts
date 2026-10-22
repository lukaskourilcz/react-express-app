// What the learner may open, answered once and read everywhere.
//
// The server owns this answer: it derives eligibility from the versioned
// profile on the account plus its own record of what was verified, using the
// graph in shared/progression.ts. The roadmap, Today and the navigation all
// read the same response, so they cannot disagree about what is available —
// and none of them recomputes it from local state.
//
// Signed out, or offline, there is no server answer to read. The same shared
// graph then runs against whatever progress the device holds, which is exactly
// the preview the product has always shown: it renders a map, it never grants
// access. Access is decided by the API, every time, on the server's evidence.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import { useAuth } from './auth';
import { learnerProfileOf } from './trackPref';
import { useExtraUnlocks, useRoadmapProgress } from './roadmap';
import { getSubject } from './subjects';
import {
  eligibleTopics as eligibleFromGraph,
  isTopicInPlan,
  nextEligibleStep as nextFromGraph,
} from '../../../shared/progression';
import { missingProfileFields, type LearnerProfile, type RequiredProfileField } from '../../../shared/learning-paths';
import { learnerSections, type LearnSectionId } from '../../../shared/learn-sections';

export interface EligiblePlan {
  subject: string;
  topics: string[];
  next: { topic: string; level: number } | null;
}

export interface EligibilityResponse {
  signedIn: boolean;
  profileComplete: boolean;
  missingProfileFields: RequiredProfileField[];
  plan: { baseTrack: string; specialization: string | null; skillPaths: string[] } | null;
  plans: EligiblePlan[];
}

export const eligibilityKeys = { all: ['eligibility'] as const };

export const fetchEligibility = (signal?: AbortSignal): Promise<EligibilityResponse> =>
  apiFetch<EligibilityResponse>('/api/quiz/roadmap?resource=eligibility', { signal });

/**
 * The learner's eligible topics and single next step.
 *
 * `source` says where the answer came from, because the two are not equal:
 * `server` is authoritative, `local` is the preview a signed-out or offline
 * visitor sees. Surfaces that promise something ("you have unlocked…") should
 * check it; surfaces that merely draw a map do not need to.
 */
export function useEligibility(): {
  topics: string[];
  next: { topic: string; level: number } | null;
  profileComplete: boolean;
  missingProfileFields: RequiredProfileField[];
  source: 'server' | 'local';
  isLoading: boolean;
} {
  const { user, isAuthenticated } = useAuth();
  const progress = useRoadmapProgress();
  const extra = useExtraUnlocks();
  const subject = getSubject();

  const query = useQuery({
    queryKey: eligibilityKeys.all,
    enabled: isAuthenticated,
    queryFn: ({ signal }) => fetchEligibility(signal),
    staleTime: 30_000,
  });

  const local = useMemo(() => {
    const profile = learnerProfileOf(user);
    return {
      topics: eligibleFromGraph(profile, subject, progress, extra),
      profileComplete: missingProfileFields(profile).length === 0,
      missing: missingProfileFields(profile),
    };
  }, [user, subject, progress, extra]);

  const fromServer = query.data?.plans.find((plan) => plan.subject === subject);
  if (query.data && fromServer) {
    return {
      topics: fromServer.topics,
      next: fromServer.next,
      profileComplete: query.data.profileComplete,
      missingProfileFields: query.data.missingProfileFields,
      source: 'server',
      isLoading: false,
    };
  }
  return {
    topics: local.topics,
    // Without the server's level counts the local answer cannot name a level,
    // so it names none rather than guessing one.
    next: nextFromGraph(learnerProfileOf(user), subject, progress, () => 0, extra),
    profileComplete: local.profileComplete,
    missingProfileFields: local.missing,
    source: 'local',
    isLoading: query.isLoading,
  };
}

/** A join the account has accepted but the session has not read back yet:
 * saveLearningPreference refreshes the session after the write, and a failed
 * refresh still counts as saved. The Learn page plans with it until the
 * profile on `user` holds it. FDE membership is the specialization, so it is
 * a flag, not a section id. */
export type PendingJoin = { sections: readonly LearnSectionId[]; fde: boolean };
export const NO_PENDING: PendingJoin = { sections: [], fde: false };

/** The account's profile with a pending join applied. */
export function withPendingJoin(profile: LearnerProfile | null, pending: PendingJoin): LearnerProfile | null {
  if (!profile || (pending.sections.length === 0 && !pending.fde)) return profile;
  return {
    ...profile,
    sections: [...new Set([...(profile.sections ?? []), ...pending.sections])],
    specialization: pending.fde ? 'fde' : profile.specialization,
  };
}

/**
 * Whether a topic is part of the learner's plan, by the same rule the server
 * applies before it serves a level (403 not_in_plan otherwise) and read from
 * the same place: the profile on the account. Signed out, or signed in without
 * a chosen track, there is no plan and every topic is in it.
 *
 * Levels already passed stay open outside the plan, so a surface that draws
 * them should keep a topic with passed levels visible for review.
 *
 * `pending` adds a join the session has not read back yet; pass a stable
 * object (NO_PENDING, or a memoised one).
 */
export function useInPlan(pending: PendingJoin = NO_PENDING): (topic: string) => boolean {
  const { user } = useAuth();
  const subject = getSubject();
  return useMemo(() => {
    const profile = withPendingJoin(learnerProfileOf(user), pending);
    return (topic: string) => isTopicInPlan(profile, subject, topic);
  }, [user, subject, pending]);
}

/** The learner's saved profile (with any pending join), whether a plan exists,
 * and the Learn sections it belongs to. Without a plan `members` is empty: the
 * page then shows a preview, decided by `hasPlan`, never by `members`. */
export function useLearnerSections(pending: PendingJoin = NO_PENDING): {
  profile: LearnerProfile | null;
  hasPlan: boolean;
  members: LearnSectionId[];
} {
  const { user } = useAuth();
  return useMemo(() => {
    const profile = withPendingJoin(learnerProfileOf(user), pending);
    return { profile, hasPlan: profile !== null, members: learnerSections(profile) };
  }, [user, pending]);
}
