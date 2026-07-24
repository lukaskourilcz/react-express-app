import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import {
  secureShuffle,
  weightedSample,
  localizeQuestion,
  normalizeLang,
  PRIVATE_CATEGORIES,
  type DifficultyMode,
  type CategoryType,
  type Question,
} from '../../lib/quiz-runtime';
import { encodeSession } from '../../lib/quiz-tokens';
import { tryAuth } from '../../lib/auth';
import { createServiceClient, jsonError, createLogger, withTimeout, withRequestContext } from '../../lib/http';
import { getEffectiveQuestions } from '../../lib/questions-store';
import { getGameSettings } from '../../lib/settings-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { SUBJECT_SCOPE_CATALOG } from '../../shared/subject-catalog';
import { defaultDeploymentCategories, validateCategoryScope } from '../../lib/product-scope';
import { selectPersonalizedReview } from '../../lib/review-selection';

const ALL_CATEGORIES = Object.values(SUBJECT_SCOPE_CATALOG)
  .flatMap((subject) => [...subject.categories]) as CategoryType[];
const ALL_DIFFICULTIES: DifficultyMode[] = ['basics', 'easy', 'zero-to-hero', 'advanced', 'mixed'];

const logEvent = createLogger('quiz/questions');
const supabase = createServiceClient();

async function routeHandler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();
  const resource = typeof req.query.resource === 'string' ? req.query.resource : '';

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.quizSession))) return;

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
  const requested = categoriesParam ? categoriesParam.split(',') : defaultDeploymentCategories();
  let selectedCategories = requested.filter((c): c is CategoryType =>
    ALL_CATEGORIES.includes(c as CategoryType),
  );
  if (selectedCategories.length === 0) {
    return jsonError(res, 400, 'bad_request', 'Select at least one category');
  }
  const scope = validateCategoryScope(selectedCategories);
  if (!scope.ok) {
    return jsonError(res, 400, 'invalid_subject_scope', 'Categories must belong to this deployment and one subject');
  }
  selectedCategories = scope.categories as CategoryType[];

  // Private categories (custom, apt) are served only to the owner. Verifying
  // the token costs a round-trip, so only do it when one is actually requested.
  if (selectedCategories.some((c) => PRIVATE_CATEGORIES.includes(c))) {
    let auth;
    try {
      auth = await tryAuth(req);
    } catch {
      return jsonError(res, 401, 'unauthorized', 'Invalid sign-in session');
    }
    const emailClaim = auth?.payload?.email;
    const email = typeof emailClaim === 'string' ? emailClaim.toLowerCase() : null;
    if (email !== ownerEmail) {
      selectedCategories = selectedCategories.filter((c) => !PRIVATE_CATEGORIES.includes(c));
      if (selectedCategories.length === 0) {
        return jsonError(res, 403, 'forbidden', 'Those categories are private');
      }
    }
  }

  const lang = normalizeLang(req.query.lang);
  const allQuestions = await getEffectiveQuestions(scope.subject, lang === 'cs');
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
  let reviewPlan: ReturnType<typeof selectPersonalizedReview>['weakAreas'] | undefined;

  if (resource === 'review') {
    let auth;
    try {
      auth = await tryAuth(req);
    } catch {
      return jsonError(res, 401, 'unauthorized', 'Invalid sign-in session');
    }
    if (!auth) return jsonError(res, 401, 'unauthorized', 'Sign in to build a personalized review');
    if (!supabase) return jsonError(res, 503, 'not_configured', 'Personalized review is not configured');
    const [stats, history] = await Promise.all([
      withTimeout(
        supabase
          .from('user_category_stats')
          .select('category,total_correct,total_questions')
          .eq('user_id', auth.sub)
          .in('category', scope.categories),
      ),
      withTimeout(
        supabase
          .from('user_question_history')
          .select('question_id,category,times_seen,times_missed,last_seen_at,last_missed_at')
          .eq('user_id', auth.sub)
          .eq('subject', scope.subject)
          .order('last_missed_at', { ascending: false, nullsFirst: false })
          .limit(500),
      ),
    ]);
    if (stats.error || history.error) {
      const migrationMissing = history.error?.message?.includes('user_question_history');
      return jsonError(
        res,
        migrationMissing ? 503 : 500,
        migrationMissing ? 'migration_required' : 'db_error',
        migrationMissing ? 'Run supabase/supabase-schema-022.sql to enable personalized review' : 'Could not build personalized review',
      );
    }
    const plan = selectPersonalizedReview(pool, stats.data ?? [], history.data ?? [], count);
    selected = plan.questions;
    reviewPlan = plan.weakAreas;
  } else if (resource) {
    return jsonError(res, 404, 'unknown_resource', 'Unknown quiz question resource');
  } else if (difficultyMode === 'easy') {
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

  // The difficulty filters above (e.g. `easy` → difficulty ≤ 2, `advanced` →
  // difficulty ≥ 3) can empty the pool even though the category had questions —
  // a category with only easy questions yields nothing for `advanced`. Never
  // hand the client a 200 with zero questions (it renders a blank screen);
  // surface it as "no questions match those filters" instead.
  if (selected.length === 0) {
    logEvent({ status: 404, reason: 'empty_after_difficulty', difficulty: difficultyMode, latency_ms: Date.now() - started });
    return jsonError(res, 404, 'no_questions', 'No questions match those filters');
  }

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

  const sessionId = encodeSession(sessionData, { subject: scope.subject });

  // Per-request shuffle differs, so don't CDN-cache the response itself.
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, count: selected.length, difficulty: difficultyMode, latency_ms: Date.now() - started });

  res.json({ sessionId, questions: questionsWithShuffledOptions, ...(reviewPlan ? { reviewPlan } : {}) });
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}
