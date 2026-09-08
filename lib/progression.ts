/** Server-side evaluation of the shared prerequisite graph (issue #152).
 *
 * Every gate in the API funnels through here, so the browser can never talk
 * its way past a level: the profile comes from `learner_profiles`, the
 * completions come from `roadmap_progress`, and the decision comes from
 * `shared/progression.ts` — the same module the Roadmap draws from. */

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from './http';
import { ROADMAP_TOPICS, topicLevelCount, type RoadmapTopic } from './roadmap';
import { loadLearnerProfile } from './learner-profile-store';
import {
  buildEligibility,
  completionsFromBlob,
  decideStep,
  nextStep,
  topicUnlocked,
  type EligibilityResponse,
  type ProgressionInput,
  type StepDecision,
  type TopicLevelCounts,
  type VerifiedCompletions,
} from '../shared/progression';
import type { LearnerProfile } from '../shared/learner-profile';

/**
 * Authored level counts per topic. The live structure endpoint still decides
 * which levels have questions today; this is the shape of the ladder, which is
 * all the graph needs to know.
 */
let cachedCounts: TopicLevelCounts | null = null;
export function topicLevelCounts(): TopicLevelCounts {
  if (!cachedCounts) {
    const counts: Record<string, number> = {};
    for (const topic of ROADMAP_TOPICS) counts[topic] = topicLevelCount(topic as RoadmapTopic);
    cachedCounts = counts;
  }
  return cachedCounts;
}

/** Verified completions plus the topics the learner can already see. */
export async function loadCompletions(supabase: SupabaseClient, userId: string): Promise<VerifiedCompletions> {
  const { data, error } = await withTimeout(
    supabase.from('roadmap_progress').select('data,extra').eq('user_id', userId).maybeSingle(),
  );
  if (error) throw new Error('db_error');
  const extra = (data?.extra ?? {}) as { unlocked?: unknown };
  // `unlocked` holds topic-level entitlements the server itself granted (owner
  // grants, historical skill checks). They keep a topic visible; they never
  // open a level whose predecessors are unpassed — diagnostics stay advisory.
  const visibleTopics = Array.isArray(extra.unlocked)
    ? extra.unlocked.filter((topic): topic is string => typeof topic === 'string')
    : [];
  return completionsFromBlob(data?.data, visibleTopics);
}

/** Everything the graph needs for one learner. */
export async function progressionFor(supabase: SupabaseClient, userId: string): Promise<ProgressionInput> {
  const [state, completions] = await Promise.all([
    loadLearnerProfile(supabase, userId),
    loadCompletions(supabase, userId),
  ]);
  return { profile: state.profile, completions, levelCounts: topicLevelCounts() };
}

/** The decision for one step, for a signed-in learner. */
export async function decideStepFor(
  supabase: SupabaseClient,
  userId: string,
  step: { topic: string; kind: 'level' | 'checkpoint'; ref: number },
): Promise<StepDecision> {
  const input = await progressionFor(supabase, userId);
  return decideStep(input, step);
}

export async function eligibilityFor(supabase: SupabaseClient, userId: string): Promise<EligibilityResponse> {
  return buildEligibility(await progressionFor(supabase, userId));
}

/**
 * Is this topic part of the learner's plan and reachable? Used where the level
 * chain is already enforced elsewhere (a checkpoint or part test carries its
 * required level range into `complete_verified_roadmap_attempt`), so only the
 * plan membership and the stage gate are left to check here.
 */
export async function topicUnlockedFor(
  supabase: SupabaseClient,
  userId: string,
  topic: string,
): Promise<{ allowed: boolean; hasProfile: boolean }> {
  const input = await progressionFor(supabase, userId);
  if (!input.profile) return { allowed: true, hasProfile: false };
  return { allowed: topicUnlocked(input, topic), hasProfile: true };
}

export { buildEligibility, decideStep, nextStep, topicUnlocked };
export type { EligibilityResponse, LearnerProfile, ProgressionInput, StepDecision };
