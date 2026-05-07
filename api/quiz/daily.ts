import type { VercelRequest, VercelResponse } from '@vercel/node';
import { questions, encodeSession } from './data';
import { createHash } from 'node:crypto';

// Daily challenge: deterministic 5-question selection per UTC date.
// Same set for every user on the same day, so leaderboards are comparable
// once we add them. Date can be overridden via ?date=YYYY-MM-DD for testing.

const DAILY_COUNT = 5;
const DAILY_DIFFICULTIES = [1, 2, 3, 4, 5];

function dateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function jsonError(res: VercelResponse, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

// Deterministic seeded shuffle so the same date always yields the same order.
function seededShuffle<T>(arr: T[], seed: string): T[] {
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

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const dateParam = (req.query.date as string) || dateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return jsonError(res, 400, 'bad_request', 'date must be YYYY-MM-DD');
  }

  // Pick one question per difficulty bucket, deterministically per date.
  const selected: typeof questions = [];
  for (const diff of DAILY_DIFFICULTIES) {
    const pool = questions.filter((q) => q.difficulty === diff);
    if (pool.length === 0) continue;
    const shuffled = seededShuffle(pool, `${dateParam}::${diff}`);
    selected.push(shuffled[0]);
    if (selected.length >= DAILY_COUNT) break;
  }

  // Shuffle option order per question (also deterministic).
  const sessionData: { questionId: string; correctAnswer: number }[] = [];
  const dailyQuestions = selected.map((q, i) => {
    const correctText = q.options[q.correctAnswer];
    const optShuffled = seededShuffle(q.options, `${dateParam}::${q.id}::opts::${i}`);
    sessionData.push({ questionId: q.id, correctAnswer: optShuffled.indexOf(correctText) });
    return {
      id: q.id,
      tags: q.tags,
      introduction: q.introduction,
      question: q.question,
      options: optShuffled,
      category: q.category,
      difficulty: q.difficulty,
    };
  });

  const sessionId = encodeSession(sessionData);

  // Cacheable for 5 min so we can survive a hot day; daily-challenge content
  // doesn't change within the UTC day.
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.json({
    date: dateParam,
    sessionId,
    questions: dailyQuestions,
  });
}
