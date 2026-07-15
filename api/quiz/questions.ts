import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  encodeSession,
  secureShuffle,
  weightedSample,
  localizeQuestion,
  normalizeLang,
  PRIVATE_CATEGORIES,
  type DifficultyMode,
  type CategoryType,
  type Question,
} from '../../lib/quiz-data';
import { tryAuth } from '../../lib/auth';
import { jsonError, createLogger } from '../../lib/http';
import { getEffectiveQuestions } from '../../lib/questions-store';
import { getGameSettings } from '../../lib/settings-store';

const ALL_CATEGORIES: CategoryType[] = [
  'html',
  'css',
  'javascript',
  'typescript',
  'react',
  'git',
  'nodejs',
  'ai',
  'dev-world',
  'code-snippets',
  // Geography
  'continents', 'capitals', 'flags', 'landforms', 'climate', 'population', 'political', 'economic', 'cartography', 'earth',
  // Math
  'arithmetic', 'fractions', 'prealgebra', 'algebra', 'geometry', 'trigonometry', 'statistics', 'precalculus', 'calculus', 'linear-algebra',
  // History
  'prehistory', 'ancient', 'classical', 'medieval', 'renaissance', 'earlymodern', 'industrial', 'worldwars', 'coldwar', 'modern',
  // Chess
  'openings', 'tactics', 'strategy', 'endgames', 'combinations',
  // Math (advanced)
  'discrete-math',
  'number-theory',
  'multivariable-calculus',
  'differential-equations',
  'real-analysis',
  // Geography (advanced)
  'geomorphology',
  'oceanography',
  'biogeography',
  'geopolitics',
  'gis',
  // History (thematic)
  'historiography',
  'history-of-science',
  'economic-history',
  'intellectual-history',
  'military-history',
  // Human Biology
  'cell-biology',
  'skeletal-system',
  'muscular-system',
  'nervous-system',
  'endocrine-system',
  'cardiovascular-system',
  'respiratory-system',
  'digestive-system',
  'immune-system',
  'reproductive-system',
  // Chess (advanced)
  'opening-theory',
  'middlegame',
  'pawn-structures',
  'endgame-technique',
  'chess-history',
  // Poker
  'positions',
  'starting-hands',
  'pot-odds',
  'betting-strategy',
  'postflop',
  'tournament-play',
  'psychology',
  'gto-advanced',
];
const ALL_DIFFICULTIES: DifficultyMode[] = ['basics', 'easy', 'zero-to-hero', 'advanced', 'mixed'];

const logEvent = createLogger('quiz/questions');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const settings = await getGameSettings();
  const ownerEmail = settings.ownerEmail;

  const countParam = parseInt(req.query.count as string, 10);
  const count = Number.isFinite(countParam)
    ? Math.min(Math.max(countParam, 1), settings.quiz.maxCount)
    : settings.quiz.defaultCount;

  const difficultyRaw = (req.query.difficulty as string) || settings.quiz.defaultDifficulty;
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
    if (email !== ownerEmail) {
      selectedCategories = selectedCategories.filter((c) => !PRIVATE_CATEGORIES.includes(c));
      if (selectedCategories.length === 0) {
        return jsonError(res, 403, 'forbidden', 'Those categories are private');
      }
    }
  }

  const allQuestions = await getEffectiveQuestions();
  const categoryFiltered = allQuestions.filter((q) => selectedCategories.includes(q.category));
  if (categoryFiltered.length === 0) {
    return jsonError(res, 404, 'no_questions', 'No questions match those filters');
  }

  // Optionally drop low-importance questions entirely (owner-tunable floor), but
  // only when enough remain to still fill the quiz.
  const minImportance = settings.quiz.minImportance ?? 1;
  let pool = categoryFiltered;
  if (minImportance > 1) {
    const aboveFloor = categoryFiltered.filter((q) => (q.importance ?? 5) >= minImportance);
    if (aboveFloor.length >= count) pool = aboveFloor;
  }

  // Selection is importance-weighted so low-scoring "filler" questions surface
  // far less often than the essentials.
  const weight = (q: Question) => q.importance ?? 5;
  let selected: Question[];

  if (difficultyMode === 'easy') {
    selected = weightedSample(pool.filter((q) => q.difficulty <= 2), count, weight);
  } else if (difficultyMode === 'advanced') {
    selected = weightedSample(pool.filter((q) => q.difficulty >= 3), count, weight);
  } else if (difficultyMode === 'basics') {
    const basics = pool.filter((q) => q.tags.includes('Terminology'));
    if (basics.length > 0) {
      selected = weightedSample(basics, count, weight);
    } else {
      const sorted = [...pool].sort((a, b) => a.difficulty - b.difficulty);
      const easiest = sorted[0]?.difficulty ?? 1;
      selected = weightedSample(sorted.filter((q) => q.difficulty === easiest), count, weight);
    }
  } else if (difficultyMode === 'mixed') {
    selected = weightedSample(pool, count, weight);
  } else {
    const perBucket = Math.ceil(count / 5);
    const buckets: Question[] = [];
    for (let d = 1; d <= 5; d++) {
      buckets.push(...weightedSample(pool.filter((q) => q.difficulty === d), perBucket, weight));
    }
    if (buckets.length < count) {
      const ids = new Set(buckets.map((q) => q.id));
      buckets.push(...weightedSample(pool.filter((q) => !ids.has(q.id)), count - buckets.length, weight));
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
