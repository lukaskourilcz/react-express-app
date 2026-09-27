/** The question of the day on the server (#239).
 *
 *   GET /api/quiz/daily?qotd=<YYYY-MM-DD|today>
 *
 * Served by `api/quiz/daily.ts` so the handler count stays at twelve. The day's
 * track comes from `shared/daily-question.ts`; the question is a seeded pick
 * from that track in the bank every quiz is served from (the /dev edits and
 * the eligibility gate applied), preferring questions of importance 4 or 5 as
 * the daily challenge does. The same date always gives the same question and
 * the same option order, so a post that links to a day shows what it
 * promised.
 *
 * The answer never leaves in this response: it is sealed into a quiz session
 * marked `qotd`, which `api/quiz/submit.ts` grades like a signed-out quiz. So
 * checking an answer records nothing for anyone: no receipt, no XP, no streak,
 * no leaderboard, no review state. A future date is refused, so nobody can
 * read tomorrow's question today. */
import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from './vercel-types.js';
import { encodeSession } from './quiz-tokens';
import { localizeQuestion, PRIVATE_CATEGORIES } from './quiz-runtime';
import { jsonError } from './http';
import { getEffectiveQuestions } from './questions-store';
import { enforceRateLimit, RATE_LIMITS } from './rate-limit';
import {
  isIsoDate,
  qotdAvailability,
  qotdTrack,
  utcToday,
  QOTD_BEFORE_START,
  QOTD_NOT_YET,
  type QotdResponse,
} from '../shared/daily-question';

/** Deterministic seeded shuffle: the same seed always gives the same order. */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  const hash = createHash('sha256').update(seed).digest();
  let cursor = 0;
  for (let i = out.length - 1; i > 0; i--) {
    if (cursor >= hash.length) cursor = 0;
    const j = hash[cursor++] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Picked = Omit<QotdResponse, 'sessionId'> & { correctAnswer: number };

/** A day's question with its answer, or null when its track has none. */
export function pickQuestionOfTheDay(
  questions: readonly { id: string; category: string; importance?: number; question: string; introduction?: string; options: string[]; correctAnswer: number; difficulty: number; tags?: string[] }[],
  date: string,
): Picked | null {
  const track = qotdTrack(date);
  const pool = questions.filter((q) => q.category === track && !(PRIVATE_CATEGORIES as string[]).includes(q.category) && q.options.length >= 2);
  if (pool.length === 0) return null;
  const worthy = pool.filter((q) => (q.importance ?? 5) >= 4);
  const base = seededShuffle(worthy.length >= 10 ? worthy : pool, `qotd::${date}`)[0];
  const correctText = base.options[base.correctAnswer];
  const options = seededShuffle(base.options, `qotd::${date}::${base.id}::opts`);
  return {
    date,
    track,
    correctAnswer: options.indexOf(correctText),
    question: {
      id: base.id,
      question: base.question,
      ...(base.introduction ? { introduction: base.introduction } : {}),
      options,
      category: base.category,
      difficulty: base.difficulty,
      ...(base.tags ? { tags: base.tags } : {}),
    },
  };
}

export async function handleQuestionOfTheDay(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.quizSession))) return;
  const raw = typeof req.query.qotd === 'string' ? req.query.qotd : '';
  const today = utcToday();
  const date = raw === '' || raw === 'today' ? today : raw;
  if (!isIsoDate(date)) return jsonError(res, 400, 'bad_request', 'qotd must be a date as YYYY-MM-DD, or today');

  const availability = qotdAvailability(date, today);
  if (availability === 'not-yet') {
    res.setHeader('Cache-Control', 'public, max-age=60');
    return jsonError(res, 404, QOTD_NOT_YET, 'This question of the day is not out yet.');
  }
  if (availability === 'before-start') {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return jsonError(res, 404, QOTD_BEFORE_START, 'There was no question of the day on that date.');
  }

  const questions = await getEffectiveQuestions('webdev', false);
  const picked = pickQuestionOfTheDay(questions.map((q) => localizeQuestion(q, 'en')), date);
  if (!picked) return jsonError(res, 503, 'no_questions', 'The question of the day is not available right now.');

  const { correctAnswer, ...answer } = picked;
  const sessionId = encodeSession([{ questionId: picked.question.id, correctAnswer }], { scope: 'qotd', date, subject: 'webdev' });
  // The body carries a sealed session; keep it out of shared caches like the
  // daily challenge's.
  res.setHeader('Cache-Control', 'private, max-age=300');
  const body: QotdResponse = { ...answer, sessionId };
  return res.json(body);
}
