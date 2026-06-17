import type { VercelRequest, VercelResponse } from '@vercel/node';
import { questions, encodeSession, localizeQuestion, normalizeLang, PRIVATE_CATEGORIES } from '../../lib/quiz-data';
import { createHash } from 'node:crypto';
import { jsonError } from '../../lib/http';

// Daily challenge: deterministic 5-question selection per UTC date.
// Same set for every user on the same day, so leaderboards are comparable
// once we add them. Date can be overridden via ?date=YYYY-MM-DD for testing.

const DAILY_COUNT = 5;
const DAILY_DIFFICULTIES = [1, 2, 3, 4, 5];

function dateString(): string {
  return new Date().toISOString().slice(0, 10);
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

  const today = dateString();
  const dateParam = (req.query.date as string) || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return jsonError(res, 400, 'bad_request', 'date must be YYYY-MM-DD');
  }

  // Restrict the ?date= override to a small window around today so an
  // attacker can't enumerate every historical daily challenge in one pass.
  const dayMs = 86_400_000;
  const requestedTs = Date.parse(`${dateParam}T00:00:00Z`);
  const todayTs = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(requestedTs) || Math.abs(requestedTs - todayTs) > 30 * dayMs) {
    return jsonError(res, 400, 'bad_request', 'date out of range');
  }

  // Pick one question per difficulty bucket, deterministically per date.
  const selected: typeof questions = [];
  for (const diff of DAILY_DIFFICULTIES) {
    // Never surface private (owner-only) categories in the shared daily mix.
    const pool = questions.filter((q) => q.difficulty === diff && !PRIVATE_CATEGORIES.includes(q.category));
    if (pool.length === 0) continue;
    const shuffled = seededShuffle(pool, `${dateParam}::${diff}`);
    selected.push(shuffled[0]);
    if (selected.length >= DAILY_COUNT) break;
  }

  const lang = normalizeLang(req.query.lang);

  // Shuffle option order per question (also deterministic).
  const sessionData: { questionId: string; correctAnswer: number }[] = [];
  const dailyQuestions = selected.map((base, i) => {
    const q = localizeQuestion(base, lang);
    const correctText = q.options[base.correctAnswer];
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

  // The response embeds a signed session token that is a usable answer-key
  // proof. Anything cached by a shared CDN is then a replay token for every
  // visitor. Use `private` so only the requesting browser caches.
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.json({
    date: dateParam,
    sessionId,
    questions: dailyQuestions,
  });
}
