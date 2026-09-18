/**
 * Progression Velocity Guard for Leaderboard & Quiz Submissions (#202).
 * Flags superhuman progression velocity into an audit review list rather than silent deletion.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from './http';

const log = createLogger('progression-velocity');

export interface VelocityCheckInput {
  userId: string;
  quizId?: string;
  totalQuestions?: number;
  durationMs?: number;
  score?: number;
  timestamp?: number;
}

export interface VelocityCheckResult {
  flagged: boolean;
  reason?: string;
  velocityMsPerQuestion?: number;
  minimumRealisticMs?: number;
}

// Cognitive reading floor: A legitimate human player cannot read, comprehend,
// and correctly answer questions in less than 750 milliseconds per question.
export const MIN_HUMAN_ANSWER_TIME_MS = 750;

// Whole quiz floor: minimum realistic duration for completing a full 5+ question quiz
export const MIN_QUIZ_COMPLETION_TIME_MS = 3000;

export function evaluateProgressionVelocity(input: VelocityCheckInput): VelocityCheckResult {
  const { totalQuestions = 1, durationMs = 0 } = input;

  if (totalQuestions <= 0) {
    return { flagged: false };
  }

  if (durationMs > 0) {
    const msPerQuestion = durationMs / totalQuestions;
    if (msPerQuestion < MIN_HUMAN_ANSWER_TIME_MS) {
      return {
        flagged: true,
        reason: `impossible_cognitive_velocity: ${Math.round(msPerQuestion)}ms/question is below human reading floor (${MIN_HUMAN_ANSWER_TIME_MS}ms)`,
        velocityMsPerQuestion: Math.round(msPerQuestion),
        minimumRealisticMs: MIN_HUMAN_ANSWER_TIME_MS,
      };
    }

    if (totalQuestions >= 5 && durationMs < MIN_QUIZ_COMPLETION_TIME_MS) {
      return {
        flagged: true,
        reason: `impossible_quiz_velocity: completed ${totalQuestions} questions in ${durationMs}ms`,
        velocityMsPerQuestion: Math.round(msPerQuestion),
        minimumRealisticMs: MIN_QUIZ_COMPLETION_TIME_MS,
      };
    }
  }

  return { flagged: false };
}

/**
 * Persists flagged suspicious velocity records into review queue rather than silently deleting valid user progress.
 */
export async function recordFlaggedVelocity(
  client: SupabaseClient,
  input: VelocityCheckInput,
  verdict: VelocityCheckResult
): Promise<void> {
  if (!verdict.flagged) return;

  log.warn({ userId: input.userId, reason: verdict.reason }, 'Flagged progression velocity for review');

  try {
    await client
      .from('leaderboard_review_queue')
      .insert({
        user_id: input.userId,
        quiz_id: input.quizId || null,
        duration_ms: input.durationMs || null,
        total_questions: input.totalQuestions || null,
        score: input.score || null,
        flag_reason: verdict.reason,
        status: 'pending_review',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();
  } catch (err) {
    // Non-blocking fallback: audit log emitted without dropping user submission
    log.warn({ err }, 'Could not persist review queue record; logged to structured audit trail');
  }
}
