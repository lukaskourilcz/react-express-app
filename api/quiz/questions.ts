import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  questions,
  encodeSession,
  secureShuffle,
  localizeQuestion,
  normalizeLang,
  PRIVATE_CATEGORIES,
  type DifficultyMode,
  type CategoryType,
} from '../../lib/quiz-data';
import { tryAuth } from '../../lib/auth';
import { jsonError, createLogger } from '../../lib/http';

// Owner whose private categories (custom, apt) are visible only to them.
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'kouril.lukas@gmail.com').toLowerCase();

const ALL_CATEGORIES: CategoryType[] = [
  'html',
  'css',
  'javascript',
  'typescript',
  'react',
  'git',
  'nodejs',
  'dev-world',
  'custom',
  'code-snippets',
  'apt',
];
const ALL_DIFFICULTIES: DifficultyMode[] = ['basics', 'easy', 'zero-to-hero', 'advanced', 'mixed'];

const logEvent = createLogger('quiz/questions');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const countParam = parseInt(req.query.count as string, 10);
  const count = Number.isFinite(countParam) ? Math.min(Math.max(countParam, 1), 50) : 10;

  const difficultyRaw = (req.query.difficulty as string) || 'zero-to-hero';
  if (!ALL_DIFFICULTIES.includes(difficultyRaw as DifficultyMode)) {
    return jsonError(res, 400, 'bad_request', 'Invalid difficulty');
  }
  const difficultyMode = difficultyRaw as DifficultyMode;

  const categoriesParam = (req.query.categories as string) || '';
  const requested = categoriesParam ? categoriesParam.split(',') : ALL_CATEGORIES;
  let selectedCategories = requested.filter((c): c is CategoryType =>
    ALL_CATEGORIES.includes(c as CategoryType),
  );
  if (selectedCategories.length === 0) {
    return jsonError(res, 400, 'bad_request', 'Select at least one category');
  }

  // Private categories (custom, apt) are served only to the owner. Verifying
  // the token costs a round-trip, so only do it when one is actually requested.
  if (selectedCategories.some((c) => PRIVATE_CATEGORIES.includes(c))) {
    const auth = await tryAuth(req);
    const emailClaim = auth?.payload?.email;
    const email = typeof emailClaim === 'string' ? emailClaim.toLowerCase() : null;
    if (email !== OWNER_EMAIL) {
      selectedCategories = selectedCategories.filter((c) => !PRIVATE_CATEGORIES.includes(c));
      if (selectedCategories.length === 0) {
        return jsonError(res, 403, 'forbidden', 'Those categories are private');
      }
    }
  }

  const categoryFiltered = questions.filter((q) => selectedCategories.includes(q.category));
  if (categoryFiltered.length === 0) {
    return jsonError(res, 404, 'no_questions', 'No questions match those filters');
  }

  let selected: typeof questions;

  if (difficultyMode === 'easy') {
    selected = secureShuffle(categoryFiltered.filter((q) => q.difficulty <= 2)).slice(0, count);
  } else if (difficultyMode === 'advanced') {
    selected = secureShuffle(categoryFiltered.filter((q) => q.difficulty >= 3)).slice(0, count);
  } else if (difficultyMode === 'basics') {
    const basics = categoryFiltered.filter((q) => q.tags.includes('Terminology'));
    if (basics.length > 0) {
      selected = secureShuffle(basics).slice(0, count);
    } else {
      const sorted = [...categoryFiltered].sort((a, b) => a.difficulty - b.difficulty);
      const easiest = sorted[0]?.difficulty ?? 1;
      selected = secureShuffle(sorted.filter((q) => q.difficulty === easiest)).slice(0, count);
    }
  } else if (difficultyMode === 'mixed') {
    selected = secureShuffle(categoryFiltered).slice(0, count);
  } else {
    const perBucket = Math.ceil(count / 5);
    const buckets: typeof questions = [];
    for (let d = 1; d <= 5; d++) {
      buckets.push(...secureShuffle(categoryFiltered.filter((q) => q.difficulty === d)).slice(0, perBucket));
    }
    if (buckets.length < count) {
      const ids = new Set(buckets.map((q) => q.id));
      buckets.push(
        ...secureShuffle(categoryFiltered.filter((q) => !ids.has(q.id))).slice(0, count - buckets.length),
      );
    }
    selected = buckets.slice(0, count);
  }

  const lang = normalizeLang(req.query.lang);

  const sessionData: { questionId: string; correctAnswer: number }[] = [];
  const questionsWithShuffledOptions = selected.map((base) => {
    // Localize before shuffling: translated options are parallel to the
    // English ones, so the correctAnswer index stays valid.
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

  // Per-request shuffle differs, so don't CDN-cache the response itself.
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, count: selected.length, difficulty: difficultyMode, latency_ms: Date.now() - started });

  res.json({ sessionId, questions: questionsWithShuffledOptions });
}
