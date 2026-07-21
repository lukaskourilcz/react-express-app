import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import { localizeQuestion, normalizeLang, secureShuffle, type Question } from '../../lib/quiz-data';
import { jsonError, createLogger, createServiceClient, withTimeout, requireAuthSub } from '../../lib/http';
import { getEffectiveQuestionsById } from '../../lib/questions-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { deploymentSubjectIds, isDeploymentTopic } from '../../lib/product-scope';
import { SUBJECT_SCOPE_CATALOG } from '../../shared/subject-catalog';
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

// Skill-check unlocks, the token wallets, and the shop inventories all live in
// this "extra" blob alongside roadmap progress so a single sync round-trip
// covers everything the learner has earned or bought. Wallets and inventories
// are keyed PER SUBJECT (platform); the un-keyed `wallet`/`inventory` fields
// are the legacy pre-split shape, still sanitized so old stored rows (and old
// clients) round-trip until they migrate. Balance is a max-merge client-side
// (tokens can only grow across devices — no one gets refunded twice), owned
// items are a set union (a cosmetic bought on one device stays owned on all),
// and doubleXp charges are a max-merge (grant on any device applies).
interface InventoryBlob {
  owned: string[];
  ring: string | null;
  flair: string | null;
  doubleXp: number;
}
interface ExtraBlob {
  unlocked: string[];
  wallet?: { balance: number };
  inventory?: InventoryBlob;
  wallets?: Record<string, { balance: number }>;
  inventories?: Record<string, InventoryBlob>;
}

const MAX_TOKEN_BALANCE = 100_000_000;
const MAX_INVENTORY_ITEMS = 64;
const MAX_STR_LEN = 64;
const MAX_SUBJECT_KEYS = 16;
const isSafeId = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= MAX_STR_LEN && /^[a-z0-9_-]+$/i.test(v);
const isSubjectKey = (v: string): boolean => /^[a-z][a-z0-9-]{0,31}$/.test(v);

const clampPct = (n: unknown): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0;
  return v < 0 ? 0 : v > 100 ? 100 : v;
};

const clampBalance = (n: unknown): number => {
  const bal = typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return Math.min(MAX_TOKEN_BALANCE, bal);
};

function sanitizeInventory(input: unknown): InventoryBlob {
  const inv = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const owned = Array.isArray(inv.owned)
    ? Array.from(new Set(inv.owned.filter(isSafeId))).slice(0, MAX_INVENTORY_ITEMS)
    : [];
  const ring = isSafeId(inv.ring) && owned.includes(inv.ring) ? inv.ring : null;
  const flair = isSafeId(inv.flair) && owned.includes(inv.flair) ? inv.flair : null;
  const dx = typeof inv.doubleXp === 'number' && Number.isFinite(inv.doubleXp) ? Math.max(0, Math.floor(inv.doubleXp)) : 0;
  return { owned, ring, flair, doubleXp: Math.min(1000, dx) };
}

// Rebuild a clean extras blob from untrusted input: only known topic ids,
// de-duplicated and bounded. Exported for tests.
export function sanitizeExtra(input: unknown): ExtraBlob {
  const out: ExtraBlob = { unlocked: [] };
  if (!input || typeof input !== 'object') return out;
  const rec = input as Record<string, unknown>;

  // unlocked topic ids
  const raw = rec.unlocked;
  if (Array.isArray(raw)) {
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
  }

  // legacy single wallet (pre-split rows/clients)
  if (rec.wallet && typeof rec.wallet === 'object') {
    out.wallet = { balance: clampBalance((rec.wallet as Record<string, unknown>).balance) };
  }

  // legacy single inventory (pre-split rows/clients)
  if (rec.inventory && typeof rec.inventory === 'object') {
    out.inventory = sanitizeInventory(rec.inventory);
  }

  // per-subject wallets
  if (rec.wallets && typeof rec.wallets === 'object' && !Array.isArray(rec.wallets)) {
    const wallets: Record<string, { balance: number }> = {};
    let n = 0;
    for (const [k, v] of Object.entries(rec.wallets as Record<string, unknown>)) {
      if (n >= MAX_SUBJECT_KEYS) break;
      if (!isSubjectKey(k) || !v || typeof v !== 'object') continue;
      wallets[k] = { balance: clampBalance((v as Record<string, unknown>).balance) };
      n++;
    }
    out.wallets = wallets;
  }

  // per-subject inventories
  if (rec.inventories && typeof rec.inventories === 'object' && !Array.isArray(rec.inventories)) {
    const inventories: Record<string, InventoryBlob> = {};
    let n = 0;
    for (const [k, v] of Object.entries(rec.inventories as Record<string, unknown>)) {
      if (n >= MAX_SUBJECT_KEYS) break;
      if (!isSubjectKey(k) || !v || typeof v !== 'object') continue;
      inventories[k] = sanitizeInventory(v);
      n++;
    }
    out.inventories = inventories;
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
      if (req.method === 'PUT' && !(await enforceRateLimit(req, res, RATE_LIMITS.roadmapMutation))) return;
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
    const topics = deploymentSubjectIds().flatMap((subject) => [...SUBJECT_SCOPE_CATALOG[subject].topics]);
    const topicSet = new Set<string>(topics);
    const structure = Object.fromEntries(
      Object.entries(liveRoadmapStructure(exists)).filter(([topic]) => topicSet.has(topic)),
    );
    res.setHeader('Cache-Control', 'public, max-age=60');
    logEvent({ status: 200, kind: 'structure', latency_ms: Date.now() - started });
    return res.json({ topics, structure });
  }

  if (!isRoadmapTopic(topicRaw) || !isDeploymentTopic(topicRaw)) {
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
