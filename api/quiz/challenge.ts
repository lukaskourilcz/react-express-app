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
import { getEffectiveQuestions } from '../../lib/questions-store';

// Question batch for the Biggest Shark Challenge.
//
// Returns N questions drawn from the full pool with mixed difficulty and
// importance-weighted sampling, plus a signed sessionId that /api/quiz/submit
// can grade one answer at a time. `exclude` lets the client request a batch
// that doesn't repeat questions already seen in the same run.

const BATCH_SIZE = 25;
const MAX_EXCLUDE = 500;

const logEvent = createLogger('quiz/challenge');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

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
  logEvent({ status: 200, count: questions.length, excluded: excludeSet.size });
  res.json({ sessionId, questions });
}
