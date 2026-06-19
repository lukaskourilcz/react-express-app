import type { VercelRequest, VercelResponse } from '@vercel/node';
import { localizeQuestion, normalizeLang, secureShuffle } from '../../lib/quiz-data';
import { jsonError, createLogger, createServiceClient, withTimeout, requireAuthSub } from '../../lib/http';
import { getEffectiveQuestionsById } from '../../lib/questions-store';
import {
  roadmapStructure,
  topicLevels,
  topicCheckpoints,
  levelQuestionIds,
  checkpointQuestionIds,
  isRoadmapTopic,
  isValidLevel,
  isValidCheckpoint,
  ROADMAP_TOPICS,
  ROADMAP_LEVELS,
  CHECKPOINT_COUNT,
  LEVEL_PASS,
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
async function buildQuestions(ids: string[], lang: ReturnType<typeof normalizeLang>) {
  const byId = await getEffectiveQuestionsById();
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

const clampPct = (n: unknown): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0;
  return v < 0 ? 0 : v > 100 ? 100 : v;
};

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
      supabase.from(PROGRESS_TABLE).select('data').eq('user_id', userId).maybeSingle(),
    );
    if (error) return jsonError(res, 500, 'db_error', 'Could not load progress');
    return res.json({ data: (data?.data as ProgressBlob) ?? {} });
  }

  // PUT
  const body = (req.body || {}) as Record<string, unknown>;
  const clean = sanitize(body.data);
  const { error } = await withTimeout(
    supabase
      .from(PROGRESS_TABLE)
      .upsert({ user_id: userId, data: clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
  );
  if (error) return jsonError(res, 500, 'db_error', 'Could not save progress');
  return res.json({ ok: true, data: clean });
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

  // No topic → return the whole map so the client can render the path.
  if (!topicRaw && levelRaw === undefined && checkpointRaw === undefined) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    logEvent({ status: 200, kind: 'structure', latency_ms: Date.now() - started });
    return res.json({ topics: ROADMAP_TOPICS, structure: roadmapStructure() });
  }

  if (!isRoadmapTopic(topicRaw)) {
    return jsonError(res, 400, 'bad_request', 'Unknown topic');
  }
  const topic: RoadmapTopic = topicRaw;
  const lang = normalizeLang(req.query.lang);

  // ── Checkpoint exam (40 questions over 5 levels) ─────────────────────────
  if (checkpointRaw !== undefined) {
    const checkpoint = parseInt(checkpointRaw, 10);
    if (!isValidCheckpoint(checkpoint)) {
      return jsonError(res, 400, 'bad_request', 'Invalid checkpoint');
    }
    const meta = topicCheckpoints(topic).find((c) => c.checkpoint === checkpoint);
    if (!meta) return jsonError(res, 404, 'not_found', 'Checkpoint not found');

    const questions = await buildQuestions(checkpointQuestionIds(topic, checkpoint), lang);
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

  // ── Level lesson (8 questions) ───────────────────────────────────────────
  const level = parseInt(levelRaw ?? '', 10);
  if (!isValidLevel(level)) {
    return jsonError(res, 400, 'bad_request', 'Invalid level');
  }
  const meta = topicLevels(topic).find((l) => l.level === level);
  if (!meta) return jsonError(res, 404, 'not_found', 'Level not found');

  const questions = await buildQuestions(levelQuestionIds(topic, level), lang);
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
