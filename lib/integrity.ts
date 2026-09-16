// Progression-velocity review list.
//
// Rate limits answer "how often may this address call the endpoint". They do
// not answer "could a person have produced this result", and that is the one a
// leaderboard needs: a script pacing itself under every limit still posts a
// run nobody could have read, let alone answered.
//
// ── What this is and is not allowed to do ──────────────────────────────────
//
// A flag is a note for a human. It never deletes a score, never edits XP, never
// moves a rank, never hides a row from a board, never tightens a rate limit and
// never blocks the next submission. The learner's result is computed, stored
// and returned exactly as it would have been. The issue that asked for this
// asked for "a review list rather than silent deletion", and that is the whole
// design: everything below writes one row into a list only the owner can read.
//
// That restraint is also what lets the thresholds be aggressive. A false
// positive costs the owner ten seconds of reading; it costs the learner
// nothing, because nothing happened to them.
//
// ── The measurement ────────────────────────────────────────────────────────
//
// Every number comes from the server's own clock. `elapsedMs` is the distance
// between the moment this server minted the session envelope (or the challenge
// run token) and the moment the answers arrived back. The client reports no
// timing at all, so there is nothing here to forge: sending answers sooner is
// the only way to make the number smaller, and sending them sooner is exactly
// what is being measured.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout, isRpcMissing, logEvent } from './http';

/**
 * The floors, with the reasoning attached, because a number without one is a
 * number the next person will change by feel.
 *
 * `minSample` — below eight graded answers, a fast run is luck or a two-question
 *   daily. Eight is the smallest set where a sustained pace means anything.
 * `readingFloorMs` — 700 ms to read a question, read four options and choose.
 *   Fast readers exist; a fast reader averaging under 700 ms across eight
 *   answers while getting nearly all of them right does not.
 * `accuracyFloorPct` — speed alone is someone clicking through a quiz they have
 *   given up on, which is not an integrity problem and must not be flagged as
 *   one. Speed *plus* near-perfect accuracy is the combination that pollutes a
 *   board.
 * `reactionFloorMs` — 250 ms is under a deliberate human click, never mind
 *   reading. At this pace accuracy is irrelevant: the input is not hand input.
 * `sustainedAnswersPerHour` — 1200 is twenty answers a minute held for a solid
 *   hour. Evaluated in the database against the submission log, because that is
 *   where the history lives.
 */
export const VELOCITY_RULES = {
  minSample: 8,
  readingFloorMs: 700,
  accuracyFloorPct: 95,
  reactionFloorMs: 250,
  sustainedAnswersPerHour: 1200,
} as const;

export const INTEGRITY_SIGNALS = [
  'pace-below-reading-floor',
  'pace-below-reaction-floor',
  'sustained-volume',
  'unattested-signup',
] as const;
export type IntegritySignal = (typeof INTEGRITY_SIGNALS)[number];

export const INTEGRITY_SURFACES = ['quiz', 'challenge', 'signup'] as const;
export type IntegritySurface = (typeof INTEGRITY_SURFACES)[number];

export const INTEGRITY_STATUSES = ['open', 'reviewed', 'cleared', 'confirmed'] as const;
export type IntegrityStatus = (typeof INTEGRITY_STATUSES)[number];

export type IntegritySeverity = 'review' | 'urgent';

export interface VelocitySample {
  /** Items the server actually graded in this event. */
  answered: number;
  correct: number;
  /** Server-measured milliseconds between issuing the work and receiving it. */
  elapsedMs: number;
}

export interface VelocityVerdict {
  flagged: boolean;
  signals: IntegritySignal[];
  severity: IntegritySeverity;
  msPerAnswer: number;
  accuracyPct: number;
}

const CLEAN: VelocityVerdict = { flagged: false, signals: [], severity: 'review', msPerAnswer: 0, accuracyPct: 0 };

/**
 * Judge one graded event. Pure: same input, same verdict, no clock, no network,
 * no database. Every threshold it applies is in `VELOCITY_RULES` above.
 */
export function evaluateVelocity(sample: VelocitySample): VelocityVerdict {
  const answered = Math.floor(sample.answered);
  if (!Number.isFinite(answered) || answered < VELOCITY_RULES.minSample) return CLEAN;

  const correct = Math.min(Math.max(Math.floor(sample.correct) || 0, 0), answered);
  // A clock that runs backwards across serverless instances would otherwise
  // read as an impossibly fast run. Clamp rather than flag on skew, and clamp
  // to zero rather than to a floor, so a genuine instant replay still counts.
  const elapsedMs = Number.isFinite(sample.elapsedMs) ? Math.max(0, sample.elapsedMs) : 0;
  const msPerAnswer = elapsedMs / answered;
  const accuracyPct = Math.round((correct / answered) * 100);

  const signals: IntegritySignal[] = [];
  if (msPerAnswer < VELOCITY_RULES.reactionFloorMs) {
    signals.push('pace-below-reaction-floor');
  }
  if (msPerAnswer < VELOCITY_RULES.readingFloorMs && accuracyPct >= VELOCITY_RULES.accuracyFloorPct) {
    signals.push('pace-below-reading-floor');
  }

  return {
    flagged: signals.length > 0,
    signals,
    // Two independent floors crossed at once is not a fast reader having a good
    // day; it is the only shape a replay can have.
    severity: signals.length > 1 ? 'urgent' : 'review',
    msPerAnswer: Math.round(msPerAnswer),
    accuracyPct,
  };
}

export interface IntegrityFlagInput {
  /** The verified subject, or null for an anonymous submission. */
  userId: string | null;
  surface: IntegritySurface;
  subject: string | null;
  signals: IntegritySignal[];
  severity: IntegritySeverity;
  /** Bounded, non-personal facts a reviewer needs: counts and durations only. */
  evidence: Record<string, number | string | boolean>;
}

export type IntegrityFlagResult = 'recorded' | 'skipped' | 'unavailable';

/**
 * Append the verdict to the review list. Best effort by construction: the
 * learner's submission has already succeeded by the time this runs, and a
 * failure here must cost the note rather than the result.
 */
export async function recordIntegrityFlag(
  supabase: SupabaseClient | null,
  input: IntegrityFlagInput,
): Promise<IntegrityFlagResult> {
  if (!supabase || input.signals.length === 0) return 'skipped';
  try {
    for (const signal of input.signals) {
      const { error } = await withTimeout(
        supabase.rpc('record_integrity_flag', {
          p_user_id: input.userId ?? '',
          p_surface: input.surface,
          p_signal: signal,
          p_severity: input.severity,
          p_subject: input.subject,
          p_evidence: input.evidence,
        }),
        3000,
      );
      if (error) {
        logEvent('integrity', {
          status: 200,
          kind: 'flag_not_recorded',
          reason: isRpcMissing(error) ? 'migration_required' : 'db_error',
          signal,
        });
        return 'unavailable';
      }
    }
    logEvent('integrity', {
      status: 200,
      kind: 'flag_recorded',
      surface: input.surface,
      severity: input.severity,
      signals: input.signals.join(','),
    });
    return 'recorded';
  } catch {
    logEvent('integrity', { status: 200, kind: 'flag_not_recorded', reason: 'timeout' });
    return 'unavailable';
  }
}

export interface IntegrityFlagRow {
  userId: string | null;
  surface: string;
  signal: string;
  severity: string;
  status: string;
  subject: string | null;
  hits: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  evidence: Record<string, unknown>;
  /** Answers this account logged in the trailing hour when the flag last fired. */
  answersLastHour: number;
}

function readRow(row: Record<string, unknown>): IntegrityFlagRow {
  const userId = typeof row.user_id === 'string' && row.user_id.length > 0 ? row.user_id : null;
  const evidence = row.evidence && typeof row.evidence === 'object' && !Array.isArray(row.evidence)
    ? (row.evidence as Record<string, unknown>)
    : {};
  return {
    userId,
    surface: String(row.surface ?? ''),
    signal: String(row.signal ?? ''),
    severity: String(row.severity ?? 'review'),
    status: String(row.status ?? 'open'),
    subject: typeof row.subject === 'string' && row.subject.length > 0 ? row.subject : null,
    hits: Number(row.hits ?? 0),
    firstSeenAt: typeof row.first_seen_at === 'string' ? row.first_seen_at : null,
    lastSeenAt: typeof row.last_seen_at === 'string' ? row.last_seen_at : null,
    reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    note: typeof row.note === 'string' && row.note.length > 0 ? row.note : null,
    evidence,
    answersLastHour: Number(row.answers_last_hour ?? 0),
  };
}

/** The review list itself, newest activity first. Owner-only by construction:
 *  the only caller is the admin endpoint, which is already gated. */
export async function listIntegrityFlags(
  supabase: SupabaseClient,
  options: { status?: IntegrityStatus | 'all'; limit?: number } = {},
): Promise<IntegrityFlagRow[]> {
  const status = options.status && options.status !== 'all' ? options.status : null;
  const limit = Math.min(Math.max(Math.round(options.limit ?? 100) || 0, 1), 300);
  const { data, error } = await withTimeout(
    supabase.rpc('integrity_review_list', { p_status: status, p_limit: limit }),
    5000,
  );
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => readRow(row as Record<string, unknown>));
}

/** Record the owner's decision. Never touches a score — only this row. */
export async function resolveIntegrityFlag(
  supabase: SupabaseClient,
  input: { userId: string | null; surface: string; signal: string; status: IntegrityStatus; note: string | null },
): Promise<IntegrityFlagRow | null> {
  const { data, error } = await withTimeout(
    supabase.rpc('resolve_integrity_flag', {
      p_user_id: input.userId ?? '',
      p_surface: input.surface,
      p_signal: input.signal,
      p_status: input.status,
      p_note: input.note,
    }),
    5000,
  );
  if (error) throw error;
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const first = rows[0] as Record<string, unknown> | undefined;
  return first ? readRow(first) : null;
}

/**
 * Erase an account's flags.
 *
 * It is a separate call rather than another line inside `delete_user_data`
 * because that function is restated in full by every migration that touches it,
 * and two migrations restating it from different starting points would silently
 * drop one of their additions. Chaining an additive function keeps the
 * migrations independent and re-runnable in any order. It is called from the
 * account-deletion handler and its failure is a real failure, not a warning:
 * erasure that quietly skipped a table is worse than an error the owner sees.
 */
export async function purgeIntegrityData(supabase: SupabaseClient, userId: string): Promise<'purged' | 'not-installed'> {
  const { error } = await withTimeout(supabase.rpc('delete_integrity_data', { p_user_id: userId }), 5000);
  if (!error) return 'purged';
  // No function means no table means nothing of this learner's was ever stored.
  if (isRpcMissing(error)) return 'not-installed';
  throw error;
}
