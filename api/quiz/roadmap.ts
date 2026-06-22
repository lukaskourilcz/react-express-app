import type { VercelRequest, VercelResponse } from '@vercel/node';
import { localizeQuestion, normalizeLang, secureShuffle, type Question } from '../../lib/quiz-data';
import { jsonError, createLogger, createServiceClient, withTimeout, requireAuthSub } from '../../lib/http';
import { getEffectiveQuestionsById } from '../../lib/questions-store';
import {
  buildLiveTopic,
  liveRoadmapStructure,
  isRoadmapTopic,
  ROADMAP_TOPICS,
  ROADMAP_LEVELS,
  CHECKPOINT_COUNT,
  LEVELS_PER_CHECKPOINT,
  LEVEL_PASS,
  partRanges,
  isValidPart,
  PART_TEST_PASS,
  PART_TEST_SIZE,
  type RoadmapTopic,
} from '../../lib/roadmap';

// One function for the whole roadmap to stay within the Vercel Hobby
// 12-function limit. It serves three things off the same route:
//   GET  /api/quiz/roadmap                         → the level/checkpoint map
//   GET  /api/quiz/roadmap?topic=&level=           → an 8-question level lesson
//   GET  /api/quiz/roadmap?topic=&checkpoint=      → a 40-question checkpoint exam
//   GET  /api/quiz/roadmap?resource=progress       → the signed-in user's progress
//   PUT  /api/quiz/roadmap                         → save the user's progress
const logEvent = createLogger('quiz/roadmap');
const supabase = createServiceClient();
const PROGRESS_TABLE = 'roadmap_progress';

// Build the playable, instant-feedback question payload for a set of ids. Unlike
// the competitive quiz, the roadmap is an unscored learning mode, so each
// question is returned WITH its correct answer and explanation (the client
// grades locally). Options are shuffled per request so the answer slot varies.
function buildQuestions(ids: string[], lang: ReturnType<typeof normalizeLang>, byId: Map<string, Question>) {
  return ids
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((base) => {
      const q = localizeQuestion(base, lang);
      const correctText = q.options[base.correctAnswer];
      const options = secureShuffle(q.options);
      return {
        id: q.id,
        tags: q.tags,
        introduction: q.introduction,
        question: q.question,
        options,
        correctAnswer: options.indexOf(correctText),
        explanation: q.explanation,
        category: q.category,
        difficulty: q.difficulty,
      };
    });
}

/* ──── per-user progress (GET ?resource=progress, PUT) ──────────────────── */

interface Entry {
  passed: boolean;
  bestPct: number;
}
type TopicProgress = { levels: Record<string, Entry>; checkpoints: Record<string, Entry> };
type ProgressBlob = Record<string, TopicProgress>;

// Skill-check unlocks live alongside roadmap progress so both sync in one round
// trip. Shape: { unlocked: RoadmapTopic[] }. Empty when the user hasn't taken
// the skill check or earned nothing from it.
interface ExtraBlob {
  unlocked: string[];
}

const clampPct = (n: unknown): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0;
  return v < 0 ? 0 : v > 100 ? 100 : v;
};

// Rebuild a clean extras blob from untrusted input: only known topic ids,
// de-duplicated and bounded. Exported for tests.
export function sanitizeExtra(input: unknown): ExtraBlob {
  const out: ExtraBlob = { unlocked: [] };
  if (!input || typeof input !== 'object') return out;
  const raw = (input as Record<string, unknown>).unlocked;
  if (!Array.isArray(raw)) return out;
  const seen = new Set<string>();
  const known = new Set<string>(ROADMAP_TOPICS);
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const id = v.toLowerCase();
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.unlocked.push(id);
    if (out.unlocked.length >= ROADMAP_TOPICS.length) break;
  }
  return out;
}

// Rebuild a clean blob from untrusted input: only known topics, valid level /
// checkpoint numbers, and bounded values are kept. This bounds the stored size
// and shape regardless of what the client sends. Exported for tests.
export function sanitize(input: unknown): ProgressBlob {
  const out: ProgressBlob = {};
  if (!input || typeof input !== 'object') return out;
  const root = input as Record<string, unknown>;

  for (const topic of ROADMAP_TOPICS) {
    const t = root[topic];
    if (!t || typeof t !== 'object') continue;
    const levelsIn = (t as Record<string, unknown>).levels;
    const checkpointsIn = (t as Record<string, unknown>).checkpoints;
    const levels: Record<string, Entry> = {};
    const checkpoints: Record<string, Entry> = {};

    if (levelsIn && typeof levelsIn === 'object') {
      for (const [k, v] of Object.entries(levelsIn as Record<string, unknown>)) {
        const n = parseInt(k, 10);
        if (!Number.isInteger(n) || n < 1 || n > ROADMAP_LEVELS) continue;
        if (!v || typeof v !== 'object') continue;
        const e = v as Record<string, unknown>;
        levels[String(n)] = { passed: e.passed === true, bestPct: clampPct(e.bestPct) };
      }
    }
    if (checkpointsIn && typeof checkpointsIn === 'object') {
      for (const [k, v] of Object.entries(checkpointsIn as Record<string, unknown>)) {
        const n = parseInt(k, 10);
        if (!Number.isInteger(n) || n < 1 || n > CHECKPOINT_COUNT) continue;
        if (!v || typeof v !== 'object') continue;
        const e = v as Record<string, unknown>;
        checkpoints[String(n)] = { passed: e.passed === true, bestPct: clampPct(e.bestPct) };
      }
    }
    if (Object.keys(levels).length > 0 || Object.keys(checkpoints).length > 0) {
      out[topic] = { levels, checkpoints };
    }
  }
  return out;
}

async function handleProgress(req: VercelRequest, res: VercelResponse) {
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Backend is not configured');

  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const { data, error } = await withTimeout(
      supabase.from(PROGRESS_TABLE).select('data, extra').eq('user_id', userId).maybeSingle(),
    );
    if (error) return jsonError(res, 500, 'db_error', 'Could not load progress');
    return res.json({
      data: (data?.data as ProgressBlob) ?? {},
      extra: sanitizeExtra(data?.extra),
    });
  }

  // PUT — accept either { data, extra } or a bare progress blob for back-compat.
  const body = (req.body || {}) as Record<string, unknown>;
  const clean = sanitize(body.data);
  const cleanExtra = sanitizeExtra(body.extra);
  const { error } = await withTimeout(
    supabase
      .from(PROGRESS_TABLE)
      .upsert(
        {
          user_id: userId,
          data: clean,
          extra: cleanExtra,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      ),
  );
  if (error) return jsonError(res, 500, 'db_error', 'Could not save progress');
  return res.json({ ok: true, data: clean, extra: cleanExtra });
}

/* ──── handler ──────────────────────────────────────────────────────────── */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

  // Per-user progress sub-resource (auth-gated): GET ?resource=progress, or PUT.
  if (req.method === 'PUT' || (req.method === 'GET' && req.query.resource === 'progress')) {
    try {
      return await handleProgress(req, res);
    } catch {
      return jsonError(res, 500, 'internal_error', 'Internal error');
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, PUT');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const topicRaw = (req.query.topic as string) || '';
  const levelRaw = req.query.level as string | undefined;
  const checkpointRaw = req.query.checkpoint as string | undefined;
  const testRaw = req.query.test as string | undefined;

  // The live question set drives both the structure and a level's questions, so
  // hiding a question in /dev re-syncs the path automatically (fewer/relevelled
  // levels). One read per request; the underlying set is cached in the store.
  const byId = await getEffectiveQuestionsById();
  const exists = (id: string) => byId.has(id);

  // No topic → return the whole map so the client can render the path.
  if (!topicRaw && levelRaw === undefined && checkpointRaw === undefined && testRaw === undefined) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    logEvent({ status: 200, kind: 'structure', latency_ms: Date.now() - started });
    return res.json({ topics: ROADMAP_TOPICS, structure: liveRoadmapStructure(exists) });
  }

  if (!isRoadmapTopic(topicRaw)) {
    return jsonError(res, 400, 'bad_request', 'Unknown topic');
  }
  const topic: RoadmapTopic = topicRaw;
  const lang = normalizeLang(req.query.lang);
  const live = buildLiveTopic(topic, exists);

  // ── Part test (a focused exam over one of the topic's 3 parts) ────────────
  // A part is a contiguous slice of the topic's (live) levels; the test samples
  // up to PART_TEST_SIZE questions from across that slice and grades at 85%.
  if (testRaw !== undefined) {
    const part = parseInt(testRaw, 10);
    if (!isValidPart(part)) return jsonError(res, 400, 'bad_request', 'Invalid test');
    const range = partRanges(live.levels.length).find((r) => r.part === part);
    if (!range || range.size <= 0) return jsonError(res, 400, 'bad_request', 'Invalid test');

    const pool: string[] = [];
    for (let l = range.startLevel; l <= range.endLevel; l++) {
      pool.push(...(live.levelIds[l - 1] ?? []));
    }
    const ids = secureShuffle(pool).slice(0, PART_TEST_SIZE);
    const questions = buildQuestions(ids, lang, byId);
    if (questions.length === 0) return jsonError(res, 404, 'no_questions', 'No questions for this test');

    res.setHeader('Cache-Control', 'private, no-store');
    logEvent({ status: 200, kind: 'test', topic, part, count: questions.length, latency_ms: Date.now() - started });
    return res.json({
      // Reuse the client's exam (progress-bar, no-hearts) runner.
      kind: 'checkpoint',
      topic,
      ref: part,
      title: `Part ${part}`,
      passPct: PART_TEST_PASS,
      questions,
    });
  }

  // ── Checkpoint exam (the surviving questions over its 5 levels) ───────────
  if (checkpointRaw !== undefined) {
    const checkpoint = parseInt(checkpointRaw, 10);
    const meta = live.checkpoints.find((c) => c.checkpoint === checkpoint);
    if (!meta) return jsonError(res, 400, 'bad_request', 'Invalid checkpoint');

    const firstLevel = (checkpoint - 1) * LEVELS_PER_CHECKPOINT + 1;
    const ids: string[] = [];
    for (let l = firstLevel; l < firstLevel + LEVELS_PER_CHECKPOINT; l++) {
      ids.push(...(live.levelIds[l - 1] ?? []));
    }
    const questions = buildQuestions(ids, lang, byId);
    if (questions.length === 0) {
      return jsonError(res, 404, 'no_questions', 'No questions for this checkpoint');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    logEvent({ status: 200, kind: 'checkpoint', topic, checkpoint, count: questions.length, latency_ms: Date.now() - started });
    return res.json({
      kind: 'checkpoint',
      topic,
      ref: meta.checkpoint,
      title: meta.title,
      passPct: meta.passPct,
      questions,
    });
  }

  // ── Level lesson (the surviving questions for that level) ─────────────────
  const level = parseInt(levelRaw ?? '', 10);
  const meta = live.levels.find((l) => l.level === level);
  if (!meta) return jsonError(res, 400, 'bad_request', 'Invalid level');

  const questions = buildQuestions(live.levelIds[level - 1] ?? [], lang, byId);
  if (questions.length === 0) {
    return jsonError(res, 404, 'no_questions', 'No questions for this level');
  }

  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: 'level', topic, level, count: questions.length, latency_ms: Date.now() - started });
  return res.json({
    kind: 'level',
    topic,
    ref: meta.level,
    title: meta.title,
    difficulty: meta.difficulty,
    passPct: LEVEL_PASS,
    questions,
  });
}
