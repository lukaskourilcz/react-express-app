import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import { encodeSession } from '../../lib/quiz-tokens';
import { localizeQuestion, normalizeLang, PRIVATE_CATEGORIES, type Question } from '../../lib/quiz-runtime';
import { createHash } from 'node:crypto';
import { jsonError, withRequestContext } from '../../lib/http';
import { getEffectiveQuestions } from '../../lib/questions-store';
import { getGameSettings } from '../../lib/settings-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { defaultDeploymentCategories, validateCategoryScope } from '../../lib/product-scope';

// Daily challenge: deterministic per-UTC-date selection (one question per
// difficulty bucket). Same set for every user on the same day, so leaderboards
// are comparable. Date can be overridden via ?date=YYYY-MM-DD for testing.

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

async function routeHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.quizSession))) return;

  const dailyCount = (await getGameSettings()).daily.count;
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
  // Optional subject scoping: the client sends the active subject's categories
  // so the daily mix stays within one subject. Old clients default to the
  // deployment's first subject; they never fall through to another product.
  const catRaw = typeof req.query.categories === 'string' ? req.query.categories : '';
  const requested = catRaw
    ? catRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultDeploymentCategories();
  const scope = validateCategoryScope(requested);
  if (!scope.ok) {
    return jsonError(res, 400, 'invalid_subject_scope', 'Categories must belong to this deployment and one subject');
  }
  const catSet = new Set(scope.categories);

  const allQuestions = await getEffectiveQuestions();
  const selected: Question[] = [];
  for (const diff of DAILY_DIFFICULTIES) {
    // Never surface private (owner-only) categories in the shared daily mix.
    const pool = allQuestions.filter(
      (q) =>
        q.difficulty === diff &&
        !PRIVATE_CATEGORIES.includes(q.category) &&
        catSet.has(q.category),
    );
    if (pool.length === 0) continue;
    // Keep the daily out of "filler" territory: prefer importance ≥ 4 when there
    // are still enough to vary day to day, otherwise fall back to the full pool.
    const worthy = pool.filter((q) => (q.importance ?? 5) >= 4);
    const usePool = worthy.length >= 3 ? worthy : pool;
    const shuffled = seededShuffle(usePool, `${dateParam}::${diff}`);
    selected.push(shuffled[0]);
    if (selected.length >= dailyCount) break;
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

  const sessionId = encodeSession(sessionData, {
    scope: 'daily',
    date: dateParam,
    subject: scope.subject,
  });

  // The response embeds an opaque, authenticated session token. Keep it out of
  // shared caches so a daily session remains bound to the requesting browser.
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.json({
    date: dateParam,
    sessionId,
    questions: dailyQuestions,
  });
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}
