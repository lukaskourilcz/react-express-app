import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import {
  secureShuffle,
  weightedSample,
  localizeQuestion,
  normalizeLang,
  PRIVATE_CATEGORIES,
  type Question,
} from '../../lib/quiz-runtime';
import { encodeSession, createChallengeRun, decodeChallengeRun, decodeScoreProof } from '../../lib/quiz-tokens';
import { jsonError, createLogger, createServiceClient, withTimeout, isRpcMissing, withRequestContext } from '../../lib/http';
import { tryAuth } from '../../lib/auth';
import { getEffectiveQuestions } from '../../lib/questions-store';
import { getChallengeLeaderboard, recordChallengeScore } from '../../lib/challenge-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { defaultDeploymentCategories, validateCategoryScope } from '../../lib/product-scope';
import { ASSESSMENT_QUESTION_COUNT } from '../../shared/assessment';

// Biggest Shark Challenge: a single function serving every challenge resource
// so we stay within Vercel's 12-function Hobby limit. Routing:
//   GET  /api/quiz/challenge                       → fresh question batch
//   GET  /api/quiz/challenge?resource=leaderboard  → top 10 + current champion
//   POST /api/quiz/challenge                       → submit a finished run's score
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
    return handleSubmitScore(req, res);
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  // ── GET ?resource=leaderboard: top scores + champion ──
  if (resource === 'leaderboard') {
    const scope = requestedScope(req);
    if (!scope.ok) {
      return jsonError(res, 400, 'invalid_subject_scope', 'Categories must belong to this deployment and one subject');
    }
    try {
      const board = await getChallengeLeaderboard(scope.subject, 10);
      res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
      return res.json(board);
    } catch {
      return jsonError(res, 503, 'leaderboard_unavailable', 'Challenge leaderboard is temporarily unavailable');
    }
  }

  if (resource && resource !== 'assessment') {
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
  const suppliedRunToken = typeof req.query.runToken === 'string' ? req.query.runToken : '';
  if (assessment && suppliedRunToken) {
    return jsonError(res, 400, 'bad_request', 'Assessment sessions cannot reuse challenge runs');
  }
  const ranked = req.query.ranked !== '0';
  const run = assessment
    ? null
    : suppliedRunToken
    ? decodeChallengeRun(suppliedRunToken)
    : createChallengeRun(ranked, scope.subject);
  if (!assessment && (!run || run.subject !== scope.subject)) return jsonError(res, 400, 'invalid_run', 'Challenge run expired or invalid');
  if (!assessment && suppliedRunToken && run && run.ranked !== ranked) {
    return jsonError(res, 400, 'invalid_run_mode', 'Challenge run mode cannot change');
  }
  const runToken = assessment ? '' : suppliedRunToken || (run && 'runToken' in run ? run.runToken : '');
  const catSet = new Set(scope.categories);

  const all = await getEffectiveQuestions();
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

  const lang = normalizeLang(req.query.lang);
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
    };
  });

  const sessionId = assessment
    ? encodeSession(sessionData, { scope: 'assessment', subject: scope.subject })
    : encodeSession(sessionData, { scope: 'challenge', runId: run!.runId, subject: scope.subject });
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: assessment ? 'assessment' : 'batch', count: questions.length, excluded: excludeSet.size });
  res.json({ sessionId, runToken, questions });
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
  if (!run) return jsonError(res, 400, 'invalid_run', 'Challenge run expired or invalid');
  if (!run.ranked) return jsonError(res, 400, 'practice_run', 'Practice-pace runs are not ranked');
  if (!Array.isArray(body.proofs) || body.proofs.length > MAX_SCORE) {
    return jsonError(res, 400, 'bad_request', 'proofs must be an array');
  }

  const seen = new Set<string>();
  let score = 0;
  for (const value of body.proofs) {
    if (typeof value !== 'string') return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    const proof = decodeScoreProof(value);
    if (!proof || proof.runId !== run.runId) {
      return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    }
    if (seen.has(proof.questionId)) continue;
    seen.add(proof.questionId);
    if (proof.isCorrect) score++;
  }

  // Optional auth — when signed in, attribute the run so later dedupe is possible.
  // Anonymous submissions still land on the board.
  const auth = await tryAuth(req);
  const userId = auth?.sub ?? null;

  try {
    const record = await recordChallengeScore({
      name, score, runId: run.runId, subject: run.subject, userId,
    });
    if (!record) return jsonError(res, 500, 'db_error', 'Could not save score');
    logEvent({ status: 200, kind: 'submit', score, hasUser: !!userId });
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
  if (!run) return jsonError(res, 400, 'invalid_run', 'Challenge run expired or invalid');

  const seen = new Set<string>();
  let score = 0;
  for (const value of body.proofs) {
    if (typeof value !== 'string') return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    const proof = decodeScoreProof(value);
    if (!proof || proof.runId !== run.runId) return jsonError(res, 400, 'invalid_proof', 'Invalid score proof');
    if (seen.has(proof.questionId)) continue;
    seen.add(proof.questionId);
    if (proof.isCorrect) score++;
  }

  const auth = await tryAuth(req);
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
  return res.json({ ok: true, awarded: data === true, score, xp });
}

function requestedScope(req: VercelRequest) {
  const catRaw = typeof req.query.categories === 'string' ? req.query.categories : '';
  const requested = catRaw
    ? catRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultDeploymentCategories();
  return validateCategoryScope(requested);
}
