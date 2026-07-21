import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import {
  encodeSession,
  createChallengeRun,
  decodeChallengeRun,
  decodeScoreProof,
  secureShuffle,
  weightedSample,
  localizeQuestion,
  normalizeLang,
  PRIVATE_CATEGORIES,
  type Question,
} from '../../lib/quiz-data';
import { jsonError, createLogger } from '../../lib/http';
import { tryAuth } from '../../lib/auth';
import { getEffectiveQuestions } from '../../lib/questions-store';
import { getChallengeLeaderboard, recordChallengeScore } from '../../lib/challenge-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { defaultDeploymentCategories, validateCategoryScope } from '../../lib/product-scope';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = typeof req.query.resource === 'string' ? req.query.resource : '';

  // ── POST: submit a finished run's score to the leaderboard ──
  if (req.method === 'POST') {
    return handleSubmitScore(req, res);
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  // ── GET ?resource=leaderboard: top scores + champion ──
  if (resource === 'leaderboard') {
    try {
      const board = await getChallengeLeaderboard(10);
      res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
      return res.json(board);
    } catch {
      return jsonError(res, 503, 'leaderboard_unavailable', 'Challenge leaderboard is temporarily unavailable');
    }
  }

  // ── GET: question batch ──
  return handleQuestionBatch(req, res);
}

async function handleQuestionBatch(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.quizSession))) return;
  const suppliedRunToken = typeof req.query.runToken === 'string' ? req.query.runToken : '';
  const ranked = req.query.ranked !== '0';
  const run = suppliedRunToken ? decodeChallengeRun(suppliedRunToken) : createChallengeRun(ranked);
  if (!run) return jsonError(res, 400, 'invalid_run', 'Challenge run expired or invalid');
  if (suppliedRunToken && run.ranked !== ranked) {
    return jsonError(res, 400, 'invalid_run_mode', 'Challenge run mode cannot change');
  }
  const runToken = suppliedRunToken || ('runToken' in run ? run.runToken : '');
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
  const catRaw = typeof req.query.categories === 'string' ? req.query.categories : '';
  const requested = catRaw
    ? catRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultDeploymentCategories();
  const scope = validateCategoryScope(requested);
  if (!scope.ok) {
    return jsonError(res, 400, 'invalid_subject_scope', 'Categories must belong to this deployment and one subject');
  }
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
  const selected = weightedSample(pool, Math.min(BATCH_SIZE, pool.length), weight);

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

  const sessionId = encodeSession(sessionData, { scope: 'challenge', runId: run.runId });
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: 'batch', count: questions.length, excluded: excludeSet.size });
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
    const record = await recordChallengeScore({ name, score, runId: run.runId, userId });
    if (!record) return jsonError(res, 500, 'db_error', 'Could not save score');
    logEvent({ status: 200, kind: 'submit', score, hasUser: !!userId });
    return res.json({ ok: true, record });
  } catch {
    return jsonError(res, 503, 'leaderboard_unavailable', 'Could not save the score right now');
  }
}
