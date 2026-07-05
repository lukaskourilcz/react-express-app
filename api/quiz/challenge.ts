import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  encodeSession,
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
import { checkRateLimit } from '../../lib/rate-limit';

// Biggest Shark Challenge: a single function serving every challenge resource
// so we stay within Vercel's 12-function Hobby limit. Routing:
//   GET  /api/quiz/challenge                       → fresh question batch
//   GET  /api/quiz/challenge?resource=leaderboard  → top 10 + current champion
//   POST /api/quiz/challenge                       → submit a finished run's score
//
// The question batch is importance-weighted across every public category and
// difficulty; the sessionId is the same signed token /api/quiz/submit grades.
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
    const board = await getChallengeLeaderboard(10);
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
    return res.json(board);
  }

  // ── GET: question batch ──
  return handleQuestionBatch(req, res);
}

async function handleQuestionBatch(req: VercelRequest, res: VercelResponse) {
  const excludeRaw = typeof req.query.exclude === 'string' ? req.query.exclude : '';
  const excludeSet = new Set(
    excludeRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_EXCLUDE),
  );

  const all = await getEffectiveQuestions();
  const pool = all.filter(
    (q) => !PRIVATE_CATEGORIES.includes(q.category) && !excludeSet.has(q.id),
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

  const sessionId = encodeSession(sessionData);
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: 'batch', count: questions.length, excluded: excludeSet.size });
  res.json({ sessionId, questions });
}

async function handleSubmitScore(req: VercelRequest, res: VercelResponse) {
  // Per-IP throttle so a script can't flood the Hall of Fame. Legit humans
  // finish ~90s runs, so 10 posts / hour with a small burst is generous.
  if (!checkRateLimit(req, res, { key: 'challenge_score', capacity: 3, refillPerSecond: 10 / 3600 })) return;

  const body = (req.body || {}) as { name?: unknown; score?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : '';
  if (!name) return jsonError(res, 400, 'bad_request', 'name is required');

  const score =
    typeof body.score === 'number' && Number.isFinite(body.score) && body.score >= 0
      ? Math.floor(body.score)
      : -1;
  if (score < 0) return jsonError(res, 400, 'bad_request', 'score must be a non-negative integer');
  if (score > MAX_SCORE) return jsonError(res, 400, 'bad_request', 'score is implausibly high');

  // Optional auth — when signed in, attribute the run so later dedupe is possible.
  // Anonymous submissions still land on the board.
  const auth = await tryAuth(req);
  const userId = auth?.sub ?? null;

  const record = await recordChallengeScore({ name, score, userId });
  logEvent({ status: 200, kind: 'submit', score, hasUser: !!userId });
  return res.json({ ok: true, record });
}
