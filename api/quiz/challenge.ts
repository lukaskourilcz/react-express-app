import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import { creditVerifiedXp } from '../../lib/rewards/handlers';
import {
  secureShuffle,
  weightedSample,
  localizeQuestion,
  normalizeLang,
  PRIVATE_CATEGORIES,
  type Question,
} from '../../lib/quiz-runtime';
import { encodeSession, createChallengeRun, decodeChallengeRun, decodeScoreProof, type ChallengeRunMode } from '../../lib/quiz-tokens';
import { jsonError, createLogger, createServiceClient, withTimeout, isRpcMissing, withRequestContext } from '../../lib/http';
import { AuthError, tryAuth } from '../../lib/auth';
import { getEffectiveQuestions } from '../../lib/questions-store';
import { getChallengeLeaderboard, recordChallengeScore } from '../../lib/challenge-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { requireAttestation } from '../../lib/turnstile';
import { evaluateVelocity, recordIntegrityFlag } from '../../lib/integrity';
import { defaultDeploymentCategories, deploymentSubjectIds, validateCategoryScope } from '../../lib/product-scope';
import { ASSESSMENT_QUESTION_COUNT } from '../../shared/assessment';
import { itemReview } from '../../lib/curation';
import {
  isSprintSubject,
  replaySprint,
  SPRINT_DURATION_MS,
  SPRINT_MAX_PROOFS,
  type SprintEvent,
} from '../../shared/sprint';

// Biggest Shark Challenge: a single function serving every challenge resource
// so we stay within Vercel's 12-function Hobby limit. Routing:
//   GET  /api/quiz/challenge                          → fresh question batch
//   GET  /api/quiz/challenge?resource=leaderboard     → top 10 + current champion
//   POST /api/quiz/challenge                          → submit a finished run's score
//   GET  /api/quiz/challenge?resource=sprint          → a three-minute sprint batch
//   GET  /api/quiz/challenge?resource=sprint-board    → the sprint board
//   POST /api/quiz/challenge?resource=sprint-complete → finish and score a sprint
//
// The sprint is a mode of the same run, not a second endpoint family: the run
// token carries `mode: 'sprint'`, the session keeps `scope: 'challenge'`, and
// every answer is graded by the same one-at-a-time path in `quiz/submit.ts`.
// A run minted in one mode is refused by the other mode's completion.
//
// The question batch is importance-weighted across every public category and
// difficulty; session and run tokens are opaque authenticated envelopes.
// `exclude` lets the client request a batch that doesn't repeat seen ids.

const BATCH_SIZE = 25;
const MAX_EXCLUDE = 500;
const MAX_NAME = 40;
const MAX_SCORE = 1000;

const logEvent = createLogger('quiz/challenge');
const supabase = createServiceClient();

async function routeHandler(req: VercelRequest, res: VercelResponse) {
  const resource = typeof req.query.resource === 'string' ? req.query.resource : '';

  // ── POST: submit a finished run's score to the leaderboard ──
  if (req.method === 'POST') {
    if (resource === 'complete') return handleCompleteRun(req, res);
    if (resource === 'sprint-complete') return handleSprintComplete(req, res);
    return handleSubmitScore(req, res);
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  // ── GET ?resource=leaderboard | sprint-board: top scores + champion ──
  if (resource === 'leaderboard' || resource === 'sprint-board') {
    const scope = requestedScope(req);
    if (!scope.ok) {
      return jsonError(res, 400, 'invalid_subject_scope', 'Categories must belong to this deployment and one subject');
    }
    const mode = resource === 'sprint-board' ? 'sprint' : 'classic';
    if (mode === 'sprint' && !isSprintSubject(scope.subject)) {
      return jsonError(res, 400, 'sprint_unavailable', 'This subject does not run the puzzle sprint');
    }
    try {
      const board = await getChallengeLeaderboard(scope.subject, 10, mode);
      res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
      return res.json(board);
    } catch (error) {
      // The sprint board needs a column the classic board does not. Until the
      // migration lands, say so instead of showing classic runs as sprints.
      if (mode === 'sprint' && error instanceof Error && /Migration \d+/.test(error.message)) {
        return jsonError(res, 503, 'migration_required', error.message);
      }
      return jsonError(res, 503, 'leaderboard_unavailable', 'Challenge leaderboard is temporarily unavailable');
    }
  }

  if (resource && resource !== 'assessment' && resource !== 'sprint') {
    return jsonError(res, 404, 'unknown_resource', 'Unknown challenge resource');
  }

  // ── GET: question batch ──
  return handleQuestionBatch(req, res);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}

async function handleQuestionBatch(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.quizSession))) return;
  const excludeRaw = typeof req.query.exclude === 'string' ? req.query.exclude : '';
  const excludeSet = new Set(
    excludeRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_EXCLUDE),
  );

  // Optional subject scoping: the client sends the active subject's categories
  // so a challenge never mixes subjects. Old clients default to the
  // deployment's first subject rather than spanning the shared question bank.
  const scope = requestedScope(req);
  if (!scope.ok) {
    return jsonError(res, 400, 'invalid_subject_scope', 'Categories must belong to this deployment and one subject');
  }
  const assessment = req.query.resource === 'assessment';
  const sprint = req.query.resource === 'sprint';
  if (sprint && !isSprintSubject(scope.subject)) {
    return jsonError(res, 400, 'sprint_unavailable', 'This subject does not run the puzzle sprint');
  }
  const suppliedRunToken = typeof req.query.runToken === 'string' ? req.query.runToken : '';
  if (assessment && suppliedRunToken) {
    return jsonError(res, 400, 'bad_request', 'Assessment sessions cannot reuse challenge runs');
  }
  // A sprint is always ranked: its whole score is the clock, and there is no
  // practice pace to opt into.
  const ranked = sprint ? true : req.query.ranked !== '0';
  const mode: ChallengeRunMode = sprint ? 'sprint' : 'classic';
  const run = assessment
    ? null
    : suppliedRunToken
    ? decodeChallengeRun(suppliedRunToken)
    : createChallengeRun(ranked, scope.subject, mode);
  if (!assessment && (!run || run.subject !== scope.subject)) return jsonError(res, 400, 'invalid_run', 'Challenge run expired or invalid');
  if (!assessment && suppliedRunToken && run && run.ranked !== ranked) {
    return jsonError(res, 400, 'invalid_run_mode', 'Challenge run mode cannot change');
  }
  // A run cannot change modes mid-flight: topping up a sprint's buffer from the
  // classic batch (or the other way round) would put one run on two clocks.
  if (!assessment && run && run.mode !== mode) {
    return jsonError(res, 400, 'invalid_run_mode', 'Challenge run mode cannot change');
  }
  const runToken = assessment ? '' : suppliedRunToken || (run && 'runToken' in run ? run.runToken : '');
  const catSet = new Set(scope.categories);

  const lang = normalizeLang(req.query.lang);
  const all = await getEffectiveQuestions(scope.subject, lang === 'cs');
  const pool = all.filter(
    (q) =>
      !PRIVATE_CATEGORIES.includes(q.category) &&
      !excludeSet.has(q.id) &&
      catSet.has(q.category),
  );
  if (pool.length === 0) {
    return jsonError(res, 404, 'no_questions', 'No challenge questions available');
  }

  const weight = (q: Question) => q.importance ?? 5;
  const batchSize = assessment ? ASSESSMENT_QUESTION_COUNT : BATCH_SIZE;
  const selected = weightedSample(pool, Math.min(batchSize, pool.length), weight);

  const sessionData: { questionId: string; correctAnswer: number }[] = [];
  const questions = selected.map((base) => {
    const q = localizeQuestion(base, lang);
    const correctText = q.options[base.correctAnswer];
    const shuffled = secureShuffle(q.options);
    sessionData.push({ questionId: q.id, correctAnswer: shuffled.indexOf(correctText) });
    return {
      id: q.id,
      tags: q.tags,
      introduction: q.introduction,
      question: q.question,
      options: shuffled,
      category: q.category,
      difficulty: q.difficulty,
      review: itemReview(base),
    };
  });

  const sessionId = assessment
    ? encodeSession(sessionData, { scope: 'assessment', subject: scope.subject })
    : encodeSession(sessionData, {
        scope: 'challenge',
        runId: run!.runId,
        subject: scope.subject,
        // All batches in a run share one claim namespace, preventing the same
        // question from being re-graded through a freshly issued batch.
        attemptId: run!.runId,
      });
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: assessment ? 'assessment' : sprint ? 'sprint-batch' : 'batch', count: questions.length, excluded: excludeSet.size });
  // The sprint's clock is the run token's own start time. The browser renders
  // it; it never sets it, and every top-up returns the same start.
  res.json({
    sessionId,
    runToken,
    questions,
    ...(sprint && run ? { startedAt: run.startedAt, durationMs: SPRINT_DURATION_MS } : {}),
  });
}

async function handleSubmitScore(req: VercelRequest, res: VercelResponse) {
  // Per-IP throttle so a script can't flood the Hall of Fame. Legit humans
  // finish ~90s runs, so 10 posts / hour with a small burst is generous.
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.challengeScore))) return;

  const body = (req.body || {}) as { name?: unknown; runToken?: unknown; proofs?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : '';
  if (!name) return jsonError(res, 400, 'bad_request', 'name is required');

  if (typeof body.runToken !== 'string') {
    return jsonError(res, 400, 'bad_request', 'runToken is required');
  }
  const run = decodeChallengeRun(body.runToken);
  if (!run || !deploymentSubjectIds().includes(run.subject)) {
    return jsonError(res, 400, 'invalid_run', 'Challenge run expired, invalid, or belongs to another product');
  }
  if (run.mode !== 'classic') return jsonError(res, 400, 'wrong_mode', 'A sprint run is finished through the sprint resource');
  if (!run.ranked) return jsonError(res, 400, 'practice_run', 'Practice-pace runs are not ranked');
  if (!Array.isArray(body.proofs) || body.proofs.length > MAX_SCORE) {
    return jsonError(res, 400, 'bad_request', 'proofs must be an array');
  }
  // One attestation per run, here rather than on each graded answer: this is
  // the request that writes to the Hall of Fame.
  if (!(await requireAttestation(req, res, 'challenge-score'))) return;

  const seen = new Set<string>();
  let score = 0;
  let failures = 0;
  // When the server graded the last answer of the run. Each score proof is
  // sealed by this server and carries the moment it was issued, so the run's
  // duration is a server fact end to end: the run token's `startedAt` to the
  // newest proof.
  let lastGradedAt = run.startedAt;
  for (const value of body.proofs) {
    if (typeof value !== 'string') return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    const proof = decodeScoreProof(value);
    if (!proof || proof.runId !== run.runId || proof.subject !== run.subject) {
      return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    }
    if (proof.issuedAt > lastGradedAt) lastGradedAt = proof.issuedAt;
    if (seen.has(proof.questionId)) continue;
    seen.add(proof.questionId);
    if (proof.isCorrect) score++;
    else failures++;
  }
  if (failures !== 3) {
    return jsonError(res, 400, 'incomplete_run', 'A ranked run must include its three terminal strikes');
  }

  // Optional auth — when signed in, attribute the run so later dedupe is possible.
  // Anonymous submissions still land on the board.
  let auth;
  try {
    auth = await tryAuth(req);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(res, error.status, error.code, error.message);
    throw error;
  }
  const userId = auth?.sub ?? null;

  // The pace of the whole run, judged before the score is written and acted on
  // after: a flag is a note in the owner's review list and never a reason to
  // withhold a row from the board.
  const velocity = evaluateVelocity({
    answered: seen.size,
    correct: score,
    elapsedMs: lastGradedAt - run.startedAt,
  });

  try {
    const record = await recordChallengeScore({
      name, score, runId: run.runId, subject: run.subject, userId,
    });
    if (!record) return jsonError(res, 500, 'db_error', 'Could not save score');
    if (velocity.flagged) {
      await recordIntegrityFlag(supabase, {
        userId,
        surface: 'challenge',
        subject: run.subject,
        signals: velocity.signals,
        severity: velocity.severity,
        evidence: {
          answered: seen.size,
          correct: score,
          accuracyPct: velocity.accuracyPct,
          msPerAnswer: velocity.msPerAnswer,
          runDurationMs: Math.max(0, lastGradedAt - run.startedAt),
        },
      });
    }
    logEvent({ status: 200, kind: 'submit', score, hasUser: !!userId, flagged: velocity.flagged });
    return res.json({ ok: true, record });
  } catch {
    return jsonError(res, 503, 'leaderboard_unavailable', 'Could not save the score right now');
  }
}

async function handleCompleteRun(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.challengeComplete))) return;
  const body = (req.body || {}) as { runToken?: unknown; proofs?: unknown };
  if (typeof body.runToken !== 'string' || !Array.isArray(body.proofs) || body.proofs.length > MAX_SCORE) {
    return jsonError(res, 400, 'bad_request', 'Run token and proofs are required');
  }
  const run = decodeChallengeRun(body.runToken);
  if (!run || !deploymentSubjectIds().includes(run.subject)) {
    return jsonError(res, 400, 'invalid_run', 'Challenge run expired, invalid, or belongs to another product');
  }
  // The three-strikes rule below is meaningless for a run that ends on a clock.
  if (run.mode !== 'classic') return jsonError(res, 400, 'wrong_mode', 'A sprint run is finished through the sprint resource');

  const seen = new Set<string>();
  let score = 0;
  let failures = 0;
  for (const value of body.proofs) {
    if (typeof value !== 'string') return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    const proof = decodeScoreProof(value);
    if (!proof || proof.runId !== run.runId || proof.subject !== run.subject) return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    if (seen.has(proof.questionId)) continue;
    seen.add(proof.questionId);
    if (proof.isCorrect) score++;
    else failures++;
  }
  if (failures !== 3) {
    return jsonError(res, 400, 'incomplete_run', 'A completed run must include its three terminal strikes');
  }

  let auth;
  try {
    auth = await tryAuth(req);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(res, error.status, error.code, error.message);
    throw error;
  }
  if (!auth) return res.json({ ok: true, awarded: false, score });
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account progress is not configured');
  // Only server-proven correct answers earn XP. Merely creating/ending a run
  // (including an all-timeout run) must never be a farmable base award.
  const xp = Math.min(10_000, score * 5);
  if (xp <= 0) return res.json({ ok: true, awarded: false, score, xp: 0 });
  const { data, error } = await withTimeout(
    supabase.rpc('record_verified_activity_xp', {
      p_user_id: auth.sub,
      p_award_id: `challenge:${run.runId}`,
      p_subject: run.subject,
      p_xp: xp,
    }),
  );
  if (error) {
    if (isRpcMissing(error)) return jsonError(res, 503, 'migration_required', 'Verified progression migration is not installed');
    return jsonError(res, 500, 'db_error', 'Could not record challenge progress');
  }
  // Tokens follow verified XP, keyed to the same award. A replay credits
  // nothing, and a wallet that cannot be reached never fails the learning.
  if (data === true) {
    await creditVerifiedXp(supabase, { userId: auth.sub, awardId: `challenge:${run.runId}`, subject: run.subject, xp });
  }
  return res.json({ ok: true, awarded: data === true, score, xp });
}

/**
 * Finish a three-minute sprint.
 *
 * Everything that decides the score is server-minted: the run's start is the
 * run token's own `iat`, each answer's time is its score proof's `iat`, and
 * `replaySprint` walks those timestamps under the Lichess-shaped combo curve.
 * The request body carries no score, no timings and no combo — only the sealed
 * tokens the server issued, and an optional display name for the board.
 */
async function handleSprintComplete(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.sprintComplete))) return;
  const body = (req.body || {}) as { runToken?: unknown; proofs?: unknown; name?: unknown };
  if (typeof body.runToken !== 'string' || !Array.isArray(body.proofs) || body.proofs.length > SPRINT_MAX_PROOFS) {
    return jsonError(res, 400, 'bad_request', 'Run token and proofs are required');
  }
  const run = decodeChallengeRun(body.runToken);
  if (!run || !deploymentSubjectIds().includes(run.subject)) {
    return jsonError(res, 400, 'invalid_run', 'Sprint run expired, invalid, or belongs to another product');
  }
  if (run.mode !== 'sprint') return jsonError(res, 400, 'wrong_mode', 'This run is not a sprint');
  if (!isSprintSubject(run.subject)) return jsonError(res, 400, 'sprint_unavailable', 'This subject does not run the puzzle sprint');
  if (!run.ranked) return jsonError(res, 400, 'practice_run', 'A sprint is always ranked');
  // The sprint writes to its own board, so it is attested exactly like the
  // classic run: once, here, rather than once per graded answer.
  if (!(await requireAttestation(req, res, 'challenge-score'))) return;

  const seen = new Set<string>();
  const events: SprintEvent[] = [];
  for (const value of body.proofs) {
    if (typeof value !== 'string') return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    const proof = decodeScoreProof(value);
    if (!proof || proof.runId !== run.runId || proof.subject !== run.subject) {
      return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    }
    if (seen.has(proof.questionId)) continue;
    seen.add(proof.questionId);
    events.push({ questionId: proof.questionId, isCorrect: proof.isCorrect, at: proof.issuedAt });
  }

  // A withheld wrong answer would be ten seconds of free clock, so the proof
  // set is checked against the grading ledger, which the browser does not
  // write and cannot edit. The session's attempt id is the run id, so the
  // ledger's row count for this attempt is the number of answers the server
  // actually graded. When the ledger cannot answer — no service client, or the
  // counting function is not migrated yet — the submitted proofs are accepted
  // and the limitation is real rather than papered over.
  const graded = await gradedAnswerCount(run.runId);
  if (graded !== null && seen.size < graded) {
    return jsonError(res, 409, 'incomplete_proofs', 'This sprint is missing answers the server already graded');
  }

  const replay = replaySprint(run.startedAt, events);

  // A sprint is a speed run by design, so the floors are doing real work here:
  // they sit far below anything three minutes of hand input can reach. The
  // window is the server's own — the run token's start to the last answer it
  // counted — and a verdict is a note for the owner, never a withheld row.
  const sprintVelocity = evaluateVelocity({
    answered: replay.score + replay.wrong,
    correct: replay.score,
    elapsedMs: replay.endedAt - run.startedAt,
  });

  let auth;
  try {
    auth = await tryAuth(req);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(res, error.status, error.code, error.message);
    throw error;
  }
  const userId = auth?.sub ?? null;

  // The board row is optional: a learner who does not name themselves still
  // gets the run, the XP and the score back.
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : '';
  let record: Awaited<ReturnType<typeof recordChallengeScore>> = null;
  let boardError: string | null = null;
  if (name) {
    try {
      record = await recordChallengeScore({
        name, score: replay.score, runId: run.runId, subject: run.subject, userId, mode: 'sprint',
      });
    } catch (error) {
      boardError = error instanceof Error && /Migration \d+/.test(error.message) ? 'migration_required' : 'leaderboard_unavailable';
    }
  }

  // XP is the same rate the classic run pays, because a sprint is the same
  // learning: five per server-proven correct answer, and nothing for showing up.
  const xp = Math.min(10_000, replay.score * 5);
  let awarded = false;
  if (auth && supabase && xp > 0) {
    const { data, error } = await withTimeout(
      supabase.rpc('record_verified_activity_xp', {
        p_user_id: auth.sub,
        p_award_id: `sprint:${run.runId}`,
        p_subject: run.subject,
        p_xp: xp,
      }),
    );
    if (error) {
      if (isRpcMissing(error)) return jsonError(res, 503, 'migration_required', 'Verified progression migration is not installed');
      return jsonError(res, 500, 'db_error', 'Could not record sprint progress');
    }
    awarded = data === true;
    if (awarded) {
      await creditVerifiedXp(supabase, { userId: auth.sub, awardId: `sprint:${run.runId}`, subject: run.subject, xp });
    }
  }

  if (sprintVelocity.flagged) {
    await recordIntegrityFlag(supabase, {
      userId,
      surface: 'challenge',
      subject: run.subject,
      signals: sprintVelocity.signals,
      severity: sprintVelocity.severity,
      evidence: {
        mode: 'sprint',
        answered: replay.score + replay.wrong,
        correct: replay.score,
        accuracyPct: sprintVelocity.accuracyPct,
        msPerAnswer: sprintVelocity.msPerAnswer,
        runDurationMs: Math.max(0, replay.endedAt - run.startedAt),
      },
    });
  }

  logEvent({ status: 200, kind: 'sprint-complete', score: replay.score, wrong: replay.wrong, rejected: replay.rejected, hasUser: !!userId, flagged: sprintVelocity.flagged });
  return res.json({
    ok: true,
    score: replay.score,
    wrong: replay.wrong,
    longestCombo: replay.longestCombo,
    bonusMs: replay.bonusMs,
    awarded,
    xp: awarded ? xp : 0,
    record,
    ...(boardError ? { boardError } : {}),
  });
}

/** How many answers the grading ledger recorded for this run, or null when the
 * ledger cannot be reached or does not have the counting function yet. */
async function gradedAnswerCount(runId: string): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await withTimeout(supabase.rpc('count_attempt_submissions', { p_attempt_id: runId }));
    if (error || typeof data !== 'number' || !Number.isFinite(data)) return null;
    return data;
  } catch {
    return null;
  }
}

function requestedScope(req: VercelRequest) {
  const catRaw = typeof req.query.categories === 'string' ? req.query.categories : '';
  const requested = catRaw
    ? catRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultDeploymentCategories();
  return validateCategoryScope(requested, { forDelivery: true });
}
