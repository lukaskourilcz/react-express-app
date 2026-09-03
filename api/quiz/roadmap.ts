import type { VercelRequest, VercelResponse } from '../../lib/vercel-types.js';
import { randomBytes } from 'node:crypto';
import {
  localizeQuestion,
  normalizeLang,
  secureShuffle,
  type Question,
} from '../../lib/quiz-runtime';
import {
  decodeQuizResultReceipt,
  decodeSessionEnvelope,
  encodeSession,
  encodeQuizResultReceipt,
  encodePlacementRun,
  decodePlacementRun,
} from '../../lib/quiz-tokens';
import {
  jsonError,
  createLogger,
  createServiceClient,
  withTimeout,
  requireAuthSub,
  requireAuthResult,
  isRpcMissing,
  withRequestContext,
} from '../../lib/http';
import { AuthError, tryAuth } from '../../lib/auth';
import { getGameSettings } from '../../lib/settings-store';
import { withGrantedTopics } from '../../lib/topic-grants';
import { getEffectiveQuestionsById } from '../../lib/questions-store';
import { enforceRateLimit, RATE_LIMITS } from '../../lib/rate-limit';
import { deploymentSubjectIds, isDeploymentTopic } from '../../lib/product-scope';
import { levelCodingTasks, playable as playableCodingTask } from '../../lib/coding/catalog';
import { handleCodingReveal, handleCodingReport, handleCodingSubmit, handleCodingTask } from '../../lib/coding/handlers';
import { encodeCodingSession } from '../../lib/quiz-tokens';
import { SUBJECT_SCOPE_CATALOG } from '../../shared/subject-catalog';
import { subjectForCategory, subjectForTopic, isScopeSubject, type ScopeSubjectId } from '../../shared/subject-catalog';
import {
  assessmentUnlocks,
  ASSESSMENT_QUESTION_COUNT,
  PLACEMENT_ROUND_SIZE,
  PLACEMENT_ROUNDS,
  PLACEMENT_TOTAL,
  PLACEMENT_START_DIFFICULTY,
  PLACEMENT_STEP_UP,
  PLACEMENT_STEP_DOWN,
} from '../../shared/assessment';
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
//   POST /api/quiz/roadmap?resource=answer         → grade one first answer
//   POST /api/quiz/roadmap?resource=complete       → atomically record progress
//   PUT  /api/quiz/roadmap                         → save non-progression account extras
const logEvent = createLogger('quiz/roadmap');
const supabase = createServiceClient();
const PROGRESS_TABLE = 'roadmap_progress';

// Build a playable payload without answer keys. Options are shuffled on the
// server and the answer indices are kept only inside the encrypted session.
function buildQuestions(ids: string[], lang: ReturnType<typeof normalizeLang>, byId: Map<string, Question>) {
  const answerKey: { questionId: string; correctAnswer: number }[] = [];
  const questions = ids
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((base) => {
      const q = localizeQuestion(base, lang);
      const correctText = q.options[base.correctAnswer];
      const options = secureShuffle(q.options);
      answerKey.push({ questionId: q.id, correctAnswer: options.indexOf(correctText) });
      return {
        id: q.id,
        tags: q.tags,
        introduction: q.introduction,
        question: q.question,
        options,
        category: q.category,
        difficulty: q.difficulty,
      };
    });
  return { questions, answerKey };
}

function playableResponse(input: {
  kind: 'level' | 'checkpoint';
  topic: RoadmapTopic;
  ref: number;
  title: string;
  passPct: number;
  ids: string[];
  lang: ReturnType<typeof normalizeLang>;
  byId: Map<string, Question>;
  difficulty?: number;
  requiredLevelStart?: number;
  requiredLevelEnd?: number;
}) {
  const built = buildQuestions(input.ids, input.lang, input.byId);
  const subject = subjectForTopic(input.topic);
  if (!subject) return null;
  const attemptId = randomBytes(18).toString('base64url');
  // devShark Learn levels of the code topics carry coding tasks. Their ids are
  // sealed into the session so completion can insist on every one passing;
  // each task gets its own coding session bound to this level attempt.
  const codingTasks = input.kind === 'level' && subject === 'webdev' &&
    (input.topic === 'javascript' || input.topic === 'typescript' || input.topic === 'react')
    ? levelCodingTasks(input.topic, input.ref)
    : [];
  const sessionId = encodeSession(built.answerKey, {
    scope: 'roadmap',
    subject,
    topic: input.topic,
    roadmapKind: input.kind,
    ref: input.ref,
    attemptId,
    ...(input.requiredLevelStart !== undefined && input.requiredLevelEnd !== undefined
      ? { requiredLevelStart: input.requiredLevelStart, requiredLevelEnd: input.requiredLevelEnd }
      : {}),
    ...(codingTasks.length > 0 ? { codingTaskIds: codingTasks.map((task) => task.id) } : {}),
  });
  return {
    kind: input.kind,
    topic: input.topic,
    ref: input.ref,
    title: input.title,
    ...(input.difficulty ? { difficulty: input.difficulty } : {}),
    passPct: input.passPct,
    sessionId,
    questions: built.questions,
    ...(codingTasks.length > 0
      ? {
          coding: codingTasks.map((task) => ({
            task: playableCodingTask(task),
            session: encodeCodingSession({ taskId: task.id, track: task.track, userId: null, roadmapAttemptId: attemptId }),
          })),
        }
      : {}),
  };
}

/* ──── per-user progress (GET ?resource=progress, PUT) ──────────────────── */

interface Entry {
  passed: boolean;
  bestPct: number;
}
type TopicProgress = { levels: Record<string, Entry>; checkpoints: Record<string, Entry> };
type ProgressBlob = Record<string, TopicProgress>;

// Skill-check unlocks are server-authoritative. Legacy wallet/inventory fields
// remain readable so existing accounts do not break, but browser PUTs may not
// mint balances, inventory, or learning unlocks.
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
  // Retained in the wire shape for old clients, but boosters are retired:
  // shop purchases may never alter XP, scores, access, or ranking fairness.
  return { owned, ring, flair, doubleXp: 0 };
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

  // One token verification serves both the row lookup and the email claim the
  // account grants below are keyed on.
  const auth = await requireAuthResult(req, res);
  if (!auth) return;
  const userId = auth.sub;
  const emailClaim = auth.payload.email;
  const email = typeof emailClaim === 'string' ? emailClaim : null;

  // Paths granted to a named account (see lib/topic-grants.ts) are resolved
  // here rather than stored, so they stay server-owned and survive a progress
  // reset. Everything else in `extra` still comes from the row.
  const grantExtra = async (extra: ReturnType<typeof sanitizeExtra>) => {
    const { ownerEmail } = await getGameSettings();
    return { ...extra, unlocked: withGrantedTopics(extra.unlocked, email, ownerEmail) };
  };

  if (req.method === 'GET') {
    const { data, error } = await withTimeout(
      supabase.from(PROGRESS_TABLE).select('data, extra').eq('user_id', userId).maybeSingle(),
    );
    if (error) return jsonError(res, 500, 'db_error', 'Could not load progress');
    return res.json({
      data: (data?.data as ProgressBlob) ?? {},
      extra: await grantExtra(sanitizeExtra(data?.extra)),
    });
  }

  // Learning progress and all stored extras are authoritative. The client may
  // request a sync, but it cannot write entitlements or currency snapshots.
  const current = await withTimeout(
    supabase.from(PROGRESS_TABLE).select('data,extra').eq('user_id', userId).maybeSingle(),
  );
  if (current.error) return jsonError(res, 500, 'db_error', 'Could not load progress');
  const authoritative = sanitize(current.data?.data);
  const authoritativeExtra = await grantExtra(sanitizeExtra(current.data?.extra));
  return res.json({ ok: true, data: authoritative, extra: authoritativeExtra });
}

async function handleSkillCheck(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.roadmapComplete))) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Learning progress is not configured');
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  const body = (req.body || {}) as { resultReceipt?: unknown };
  if (typeof body.resultReceipt !== 'string') {
    return jsonError(res, 400, 'bad_request', 'A verified assessment receipt is required');
  }
  const receipt = decodeQuizResultReceipt(body.resultReceipt);
  if (
    !receipt || receipt.userId !== userId || receipt.purpose !== 'assessment' ||
    receipt.total !== ASSESSMENT_QUESTION_COUNT || receipt.outcomes.length !== receipt.total ||
    !deploymentSubjectIds().includes(receipt.subject) ||
    receipt.outcomes.some((outcome) => subjectForCategory(outcome.category) !== receipt.subject)
  ) {
    return jsonError(res, 400, 'invalid_receipt', 'Assessment receipt expired or invalid');
  }

  const unlocked = assessmentUnlocks(receipt.subject, receipt.correct, receipt.total);
  const applied = await withTimeout(
    supabase.rpc('apply_verified_skill_check', {
      p_user_id: userId,
      p_attempt_id: receipt.attemptId,
      p_subject: receipt.subject,
      p_correct: receipt.correct,
      p_total: receipt.total,
      p_unlocked: unlocked,
    }),
  );
  if (applied.error) {
    if (isRpcMissing(applied.error)) {
      return jsonError(res, 503, 'migration_required', 'Verified assessment migration is not installed');
    }
    return jsonError(res, 500, 'db_error', 'Could not apply assessment unlocks');
  }
  logEvent({ status: 200, kind: 'skill_check', subject: receipt.subject, correct: receipt.correct, applied: applied.data === true });
  return res.json({ applied: applied.data === true, unlocked });
}

async function optionalAuthSub(req: VercelRequest, res: VercelResponse): Promise<string | null | undefined> {
  try {
    return (await tryAuth(req))?.sub ?? null;
  } catch (error) {
    if (error instanceof AuthError) {
      jsonError(res, error.status, error.code, error.message);
      return undefined;
    }
    throw error;
  }
}

/* ──── adaptive placement (GET/POST ?resource=placement) ────────────────────── */
// A subject-level skill-check delivered as short adaptive rounds. Difficulty
// steps up after a strong round and down after a weak one; "I don't know yet"
// (a missing answer or index -1) counts as a miss. Every round is graded
// server-side against answer keys sealed inside the placement token, and the
// running score is re-derived from that sealed history — the browser can neither
// read the keys nor inflate the score. The run always totals exactly
// PLACEMENT_TOTAL questions, so the final result reuses the existing verified
// 20-question skill-check receipt + `assessmentUnlocks` for the actual unlock,
// keeping unlocks server-authoritative and idempotent (by the run's attemptId).

type PlacementOutcome = { questionId: string; category: string; isCorrect: boolean };

function poolForSubject(byId: Map<string, Question>, subject: ScopeSubjectId): Question[] {
  const cats = new Set<string>(SUBJECT_SCOPE_CATALOG[subject].categories);
  return [...byId.values()].filter((q) => cats.has(q.category));
}

// Pick `count` unseen questions nearest the target difficulty, shuffled within
// each difficulty band so a re-take never yields the same set.
function pickPlacementIds(pool: Question[], difficulty: number, count: number, seen: Set<string>): string[] {
  const banded = new Map<number, Question[]>();
  for (const q of pool) {
    if (seen.has(q.id)) continue;
    const dist = Math.abs(q.difficulty - difficulty);
    const band = banded.get(dist) ?? [];
    band.push(q);
    banded.set(dist, band);
  }
  const ids: string[] = [];
  for (let dist = 0; dist <= 4 && ids.length < count; dist++) {
    const band = secureShuffle(banded.get(dist) ?? []);
    for (const q of band) {
      if (ids.length >= count) break;
      ids.push(q.id);
    }
  }
  return ids;
}

function stepDifficulty(current: number, correct: number, size: number): number {
  const ratio = size > 0 ? correct / size : 0;
  if (ratio >= PLACEMENT_STEP_UP) return Math.min(5, current + 1);
  if (ratio <= PLACEMENT_STEP_DOWN) return Math.max(1, current - 1);
  return current;
}

// Build one playable round (no answer keys leave the server) plus a fresh
// placement token carrying the sealed answer key and the graded history so far.
function placementRoundResponse(input: {
  subject: ScopeSubjectId;
  attemptId: string;
  round: number;
  difficulty: number;
  history: PlacementOutcome[];
  pool: Question[];
  byId: Map<string, Question>;
  lang: ReturnType<typeof normalizeLang>;
}): Record<string, unknown> | null {
  const seen = new Set<string>(input.history.map((h) => h.questionId));
  const ids = pickPlacementIds(input.pool, input.difficulty, PLACEMENT_ROUND_SIZE, seen);
  if (ids.length === 0) return null;
  const built = buildQuestions(ids, input.lang, input.byId);
  if (built.questions.length === 0) return null;
  const items = built.answerKey.map((k) => ({
    questionId: k.questionId,
    correctAnswer: k.correctAnswer,
    category: input.byId.get(k.questionId)!.category,
  }));
  const placementToken = encodePlacementRun({
    subject: input.subject,
    attemptId: input.attemptId,
    round: input.round,
    difficulty: input.difficulty,
    history: input.history,
    items,
  });
  return {
    done: false,
    round: input.round,
    totalRounds: PLACEMENT_ROUNDS,
    difficulty: input.difficulty,
    asked: input.history.length,
    total: PLACEMENT_TOTAL,
    idkCountsAsMiss: true,
    placementToken,
    questions: built.questions,
  };
}

async function handlePlacementStart(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.quizSession))) return;
  const rawSubject = req.query.subject;
  if (!isScopeSubject(rawSubject) || !deploymentSubjectIds().includes(rawSubject)) {
    return jsonError(res, 400, 'invalid_subject_scope', 'A subject from this deployment is required');
  }
  const subject = rawSubject;
  const lang = normalizeLang(req.query.lang);
  const byId = await getEffectiveQuestionsById(subject, lang === 'cs');
  const pool = poolForSubject(byId, subject);
  const attemptId = randomBytes(18).toString('base64url');
  const response = placementRoundResponse({
    subject, attemptId, round: 1, difficulty: PLACEMENT_START_DIFFICULTY, history: [], pool, byId, lang,
  });
  if (!response) return jsonError(res, 404, 'no_questions', 'No placement questions available');
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: 'placement_start', subject });
  return res.json(response);
}

async function handlePlacementRound(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.roadmapAnswer))) return;
  const body = (req.body || {}) as { placementToken?: unknown; answers?: unknown; lang?: unknown };
  if (typeof body.placementToken !== 'string') {
    return jsonError(res, 400, 'invalid_session', 'Placement session expired or invalid');
  }
  const state = decodePlacementRun(body.placementToken);
  if (!state || !deploymentSubjectIds().includes(state.subject)) {
    return jsonError(res, 400, 'invalid_session', 'Placement session expired or invalid');
  }
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
    return jsonError(res, 400, 'bad_request', 'answers must be an object');
  }
  const answerMap = body.answers as Record<string, unknown>;

  const roundOutcomes: PlacementOutcome[] = [];
  let roundCorrect = 0;
  for (const item of state.items) {
    const raw = answerMap[item.questionId];
    if (raw !== undefined && (typeof raw !== 'number' || !Number.isInteger(raw) || raw < -1 || raw > 25)) {
      return jsonError(res, 400, 'bad_request', 'Invalid answer index');
    }
    // A missing answer or -1 is the "I don't know yet" option and counts as a miss.
    const selected = typeof raw === 'number' ? raw : -1;
    const isCorrect = selected >= 0 && selected === item.correctAnswer;
    if (isCorrect) roundCorrect++;
    roundOutcomes.push({ questionId: item.questionId, category: item.category, isCorrect });
  }

  const history = [...state.history, ...roundOutcomes];
  const nextDifficulty = stepDifficulty(state.difficulty, roundCorrect, state.items.length);
  const finished = state.round >= PLACEMENT_ROUNDS || history.length >= PLACEMENT_TOTAL;

  if (finished) {
    const userId = await optionalAuthSub(req, res);
    if (userId === undefined) return;
    const correct = history.filter((h) => h.isCorrect).length;
    const total = history.length;
    const breakdown: Record<string, { correct: number; total: number }> = {};
    for (const h of history) {
      const bucket = breakdown[h.category] ?? { correct: 0, total: 0 };
      bucket.total++;
      if (h.isCorrect) bucket.correct++;
      breakdown[h.category] = bucket;
    }
    const response: Record<string, unknown> = {
      done: true,
      correct,
      total,
      difficulty: nextDifficulty,
      unlockedPreview: assessmentUnlocks(state.subject, correct, total),
    };
    // The final unlock stays on the verified 20-question skill-check path: only a
    // signed-in run that reached the full budget mints a receipt to apply it.
    if (userId && total === ASSESSMENT_QUESTION_COUNT) {
      response.resultReceipt = encodeQuizResultReceipt({
        attemptId: state.attemptId,
        userId,
        correct,
        total,
        breakdown,
        outcomes: history,
        subject: state.subject,
        questXp: 0,
        purpose: 'assessment',
      });
    }
    logEvent({ status: 200, kind: 'placement_done', subject: state.subject, correct, total });
    return res.json(response);
  }

  const lang = normalizeLang(body.lang);
  const byId = await getEffectiveQuestionsById(state.subject, lang === 'cs');
  const pool = poolForSubject(byId, state.subject);
  const response = placementRoundResponse({
    subject: state.subject,
    attemptId: state.attemptId,
    round: state.round + 1,
    difficulty: nextDifficulty,
    history,
    pool,
    byId,
    lang,
  });
  if (!response) return jsonError(res, 404, 'no_questions', 'No placement questions available');
  response.lastRoundCorrect = roundCorrect;
  response.lastRoundSize = state.items.length;
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: 'placement_round', subject: state.subject, round: state.round + 1, difficulty: nextDifficulty });
  return res.json(response);
}

function roadmapSession(raw: unknown) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 16_384) return null;
  const session = decodeSessionEnvelope(raw);
  if (
    !session || session.scope !== 'roadmap' || !session.subject || !session.topic ||
    !session.roadmapKind || !session.ref || !session.attemptId ||
    !isRoadmapTopic(session.topic) || !isDeploymentTopic(session.topic) ||
    subjectForTopic(session.topic) !== session.subject
  ) return null;
  return session;
}

async function ensureAttempt(
  session: NonNullable<ReturnType<typeof roadmapSession>>,
  userId: string | null,
) {
  const existing = await withTimeout(
    supabase!
      .from('roadmap_attempts')
      .select('attempt_id,user_id,subject,topic,kind,ref,total_questions,pass_pct,required_level_start,required_level_end,completed_at')
      .eq('attempt_id', session.attemptId!)
      .maybeSingle(),
  );
  if (existing.error) return { error: existing.error, data: null };
  if (!existing.data) {
    const passPct = session.roadmapKind === 'level' ? LEVEL_PASS : PART_TEST_PASS;
    const inserted = await withTimeout(
      supabase!
        .from('roadmap_attempts')
        .insert({
          attempt_id: session.attemptId,
          user_id: userId,
          subject: session.subject,
          topic: session.topic,
          kind: session.roadmapKind,
          ref: session.ref,
          total_questions: session.questions.length,
          pass_pct: passPct,
          required_level_start: session.requiredLevelStart ?? null,
          required_level_end: session.requiredLevelEnd ?? null,
          expires_at: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
        })
        .select('attempt_id,user_id,subject,topic,kind,ref,total_questions,pass_pct,required_level_start,required_level_end,completed_at')
        .single(),
    );
    if (!inserted.error) return inserted;
    // A simultaneous first answer can win the insert. Re-read the row and
    // verify it below instead of turning a harmless race into a failed lesson.
    const raced = await withTimeout(
      supabase!
        .from('roadmap_attempts')
        .select('attempt_id,user_id,subject,topic,kind,ref,total_questions,pass_pct,required_level_start,required_level_end,completed_at')
        .eq('attempt_id', session.attemptId!)
        .maybeSingle(),
    );
    return raced;
  }
  return existing;
}

function attemptMatches(
  attempt: Record<string, unknown>,
  session: NonNullable<ReturnType<typeof roadmapSession>>,
  userId: string | null,
): boolean {
  return (
    (attempt.user_id ?? null) === userId &&
    attempt.subject === session.subject &&
    attempt.topic === session.topic &&
    attempt.kind === session.roadmapKind &&
    Number(attempt.ref) === session.ref &&
    Number(attempt.total_questions) === session.questions.length
    && (attempt.required_level_start == null ? undefined : Number(attempt.required_level_start)) === session.requiredLevelStart
    && (attempt.required_level_end == null ? undefined : Number(attempt.required_level_end)) === session.requiredLevelEnd
  );
}

async function handleAnswer(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.roadmapAnswer))) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Learning progress is not configured');
  const body = (req.body || {}) as {
    sessionId?: unknown; questionId?: unknown; selectedIndex?: unknown; lang?: unknown;
  };
  const session = roadmapSession(body.sessionId);
  if (!session) return jsonError(res, 400, 'invalid_session', 'Learning session expired or invalid');
  if (
    typeof body.questionId !== 'string' || body.questionId.length > 64 ||
    !Number.isInteger(body.selectedIndex) || Number(body.selectedIndex) < 0 || Number(body.selectedIndex) > 25
  ) return jsonError(res, 400, 'bad_request', 'Question and selected answer are required');
  const sessionQuestion = session.questions.find((question) => question.questionId === body.questionId);
  if (!sessionQuestion) return jsonError(res, 400, 'bad_request', 'Question is not part of this learning session');
  const userId = await optionalAuthSub(req, res);
  if (userId === undefined) return;

  const attemptResult = await ensureAttempt(session, userId);
  if (attemptResult.error || !attemptResult.data) {
    if (isRpcMissing(attemptResult.error)) {
      return jsonError(res, 503, 'migration_required', 'Verified learning migration is not installed');
    }
    return jsonError(res, 500, 'db_error', 'Could not start the learning attempt');
  }
  if (!attemptMatches(attemptResult.data as Record<string, unknown>, session, userId)) {
    return jsonError(res, 409, 'attempt_conflict', 'This learning attempt belongs to another session');
  }

  const selectedIndex = Number(body.selectedIndex);
  const saved = await withTimeout(
    supabase.rpc('record_roadmap_answer', {
      p_attempt_id: session.attemptId,
      p_user_id: userId,
      p_question_id: body.questionId,
      p_selected_index: selectedIndex,
      p_correct_index: sessionQuestion.correctAnswer,
    }),
  );
  if (saved.error || !saved.data || typeof saved.data !== 'object') {
    if (isRpcMissing(saved.error)) {
      return jsonError(res, 503, 'migration_required', 'Verified learning migration 023 is not installed');
    }
    return jsonError(res, 500, 'db_error', 'Could not record the answer');
  }
  const stored = saved.data as { selectedIndex?: unknown; correctAnswer?: unknown; isCorrect?: unknown };

  const questions = await getEffectiveQuestionsById(session.subject, normalizeLang(body.lang) === 'cs');
  const base = questions.get(body.questionId);
  const explanation = base ? localizeQuestion(base, normalizeLang(body.lang)).explanation : '';
  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({
    selectedIndex: Number(stored.selectedIndex),
    correctAnswer: Number(stored.correctAnswer),
    isCorrect: stored.isCorrect === true,
    explanation,
  });
}

async function handleComplete(req: VercelRequest, res: VercelResponse) {
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.roadmapComplete))) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Learning progress is not configured');
  const body = (req.body || {}) as { sessionId?: unknown };
  const session = roadmapSession(body.sessionId);
  if (!session) return jsonError(res, 400, 'invalid_session', 'Learning session expired or invalid');
  const userId = await optionalAuthSub(req, res);
  if (userId === undefined) return;
  const attemptResult = await ensureAttempt(session, userId);
  if (attemptResult.error || !attemptResult.data) {
    if (isRpcMissing(attemptResult.error)) {
      return jsonError(res, 503, 'migration_required', 'Verified learning migration is not installed');
    }
    return jsonError(res, 500, 'db_error', 'Could not load the learning attempt');
  }
  const attempt = attemptResult.data as Record<string, unknown>;
  if (!attemptMatches(attempt, session, userId)) {
    return jsonError(res, 409, 'attempt_conflict', 'This learning attempt belongs to another session');
  }
  const answers = await withTimeout(
    supabase.from('roadmap_attempt_answers').select('is_correct').eq('attempt_id', session.attemptId!),
  );
  if (answers.error) return jsonError(res, 500, 'db_error', 'Could not grade the learning attempt');
  const correctAnswers = (answers.data ?? []).filter((answer) => answer.is_correct === true).length;
  const totalQuestions = session.questions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const passPct = Number(attempt.pass_pct);
  let passed = percentage >= passPct;
  // A level with coding tasks passes only when every one of them passed.
  let codingPending: string[] = [];
  if (passed && session.codingTaskIds && session.codingTaskIds.length > 0) {
    const codingRows = await withTimeout(
      supabase.from('roadmap_attempt_coding').select('task_id,passed').eq('attempt_id', session.attemptId!),
    );
    if (codingRows.error) return jsonError(res, 500, 'db_error', 'Could not grade the coding tasks');
    const passedIds = new Set((codingRows.data ?? []).filter((row) => row.passed === true).map((row) => String(row.task_id)));
    codingPending = session.codingTaskIds.filter((id) => !passedIds.has(id));
    if (codingPending.length > 0) passed = false;
  }

  let progress: unknown;
  let applied = false;
  if (userId) {
    const completed = await withTimeout(
      supabase.rpc('complete_verified_roadmap_attempt', {
        p_user_id: userId,
        p_attempt_id: session.attemptId,
        p_coding_task_ids: session.codingTaskIds ?? null,
      }),
    );
    if (completed.error) {
      if (isRpcMissing(completed.error)) {
        return jsonError(res, 503, 'migration_required', 'Verified learning migration is not installed');
      }
      if (/incomplete_roadmap_attempt/i.test(completed.error.message ?? '')) {
        return jsonError(res, 409, 'incomplete_attempt', 'Answer every question before completing this lesson');
      }
      if (/roadmap_prerequisite_not_met/i.test(completed.error.message ?? '')) {
        return jsonError(res, 409, 'prerequisite_not_met', 'Complete the preceding learning steps first');
      }
      return jsonError(res, 500, 'db_error', 'Could not save learning progress');
    }
    applied = completed.data === true;
    const row = await withTimeout(
      supabase.from(PROGRESS_TABLE).select('data').eq('user_id', userId).maybeSingle(),
    );
    if (row.error) return jsonError(res, 500, 'db_error', 'Progress saved but could not be reloaded');
    progress = sanitize(row.data?.data);
  } else if (!attempt.completed_at) {
    await withTimeout(
      supabase.from('roadmap_attempts').update({ completed_at: new Date().toISOString() }).eq('attempt_id', session.attemptId!),
    );
    applied = true;
  }

  logEvent({ status: 200, kind: 'complete', topic: session.topic, passed, hasUser: !!userId, codingPending: codingPending.length });
  return res.json({ correctAnswers, totalQuestions, percentage, passed, applied, codingPending, ...(progress ? { progress } : {}) });
}

/* ──── handler ──────────────────────────────────────────────────────────── */

async function routeHandler(req: VercelRequest, res: VercelResponse) {
  const started = Date.now();

  // Coding challenges share this function (twelve-function budget):
  //   GET  ?resource=coding-task&id=     → a playable task with its sealed session
  //   POST ?resource=coding-submit       → server grading (JavaScript, TypeScript, system design)
  //   POST ?resource=coding-report       → the browser harness verdict (React)
  //   POST ?resource=coding-reveal       → the reference solution after a pass or give-up
  const resource = typeof req.query.resource === 'string' ? req.query.resource : '';
  if (resource.startsWith('coding-')) {
    try {
      if (resource === 'coding-task' && req.method === 'GET') return await handleCodingTask(req, res, supabase);
      if (resource === 'coding-submit' && req.method === 'POST') return await handleCodingSubmit(req, res, supabase);
      if (resource === 'coding-report' && req.method === 'POST') return await handleCodingReport(req, res, supabase);
      if (resource === 'coding-reveal' && req.method === 'POST') return await handleCodingReveal(req, res, supabase);
      res.setHeader('Allow', resource === 'coding-task' ? 'GET' : 'POST');
      return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
    } catch (error) {
      logEvent({ status: 500, kind: 'coding_error', resource, category: error instanceof Error ? error.name : 'unknown' });
      return jsonError(res, 500, 'internal_error', 'Could not handle the coding request');
    }
  }

  if (req.method === 'POST' && req.query.resource === 'answer') {
    try {
      return await handleAnswer(req, res);
    } catch (error) {
      logEvent({ status: 500, kind: 'answer_error', category: error instanceof Error ? error.name : 'unknown' });
      return jsonError(res, 500, 'internal_error', 'Could not record the answer');
    }
  }
  if (req.method === 'POST' && req.query.resource === 'complete') {
    try {
      return await handleComplete(req, res);
    } catch (error) {
      logEvent({ status: 500, kind: 'complete_error', category: error instanceof Error ? error.name : 'unknown' });
      return jsonError(res, 500, 'internal_error', 'Could not complete the learning attempt');
    }
  }
  if (req.method === 'POST' && req.query.resource === 'skill-check') {
    try {
      return await handleSkillCheck(req, res);
    } catch (error) {
      logEvent({ status: 500, kind: 'skill_check_error', category: error instanceof Error ? error.name : 'unknown' });
      return jsonError(res, 500, 'internal_error', 'Could not apply assessment unlocks');
    }
  }
  if (req.query.resource === 'placement') {
    if (req.method === 'GET') {
      try {
        return await handlePlacementStart(req, res);
      } catch (error) {
        logEvent({ status: 500, kind: 'placement_start_error', category: error instanceof Error ? error.name : 'unknown' });
        return jsonError(res, 500, 'internal_error', 'Could not start placement');
      }
    }
    if (req.method === 'POST') {
      try {
        return await handlePlacementRound(req, res);
      } catch (error) {
        logEvent({ status: 500, kind: 'placement_round_error', category: error instanceof Error ? error.name : 'unknown' });
        return jsonError(res, 500, 'internal_error', 'Could not grade the placement round');
      }
    }
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

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
    res.setHeader('Allow', 'GET, POST, PUT');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }

  const topicRaw = (req.query.topic as string) || '';
  const levelRaw = req.query.level as string | undefined;
  const checkpointRaw = req.query.checkpoint as string | undefined;
  const testRaw = req.query.test as string | undefined;

  // No topic → return the whole map so the client can render the path.
  if (!topicRaw && levelRaw === undefined && checkpointRaw === undefined && testRaw === undefined) {
    const byId = await getEffectiveQuestionsById(undefined, false);
    const exists = (id: string) => byId.has(id);
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
  const subject = subjectForTopic(topic)!;
  const byId = await getEffectiveQuestionsById(subject, lang === 'cs');
  const exists = (id: string) => byId.has(id);
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
    const playable = playableResponse({
      kind: 'checkpoint', topic, ref: part, title: `Part ${part}`,
      passPct: PART_TEST_PASS, ids, lang, byId,
      requiredLevelStart: range.startLevel,
      requiredLevelEnd: range.endLevel,
    });
    if (!playable || playable.questions.length === 0) return jsonError(res, 404, 'no_questions', 'No questions for this test');

    res.setHeader('Cache-Control', 'private, no-store');
    logEvent({ status: 200, kind: 'test', topic, part, count: playable.questions.length, latency_ms: Date.now() - started });
    return res.json({
      ...playable,
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
    const playable = playableResponse({
      kind: 'checkpoint', topic, ref: meta.checkpoint, title: meta.title,
      passPct: meta.passPct, ids, lang, byId,
      requiredLevelStart: firstLevel,
      requiredLevelEnd: firstLevel + LEVELS_PER_CHECKPOINT - 1,
    });
    if (!playable || playable.questions.length === 0) {
      return jsonError(res, 404, 'no_questions', 'No questions for this checkpoint');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    logEvent({ status: 200, kind: 'checkpoint', topic, checkpoint, count: playable.questions.length, latency_ms: Date.now() - started });
    return res.json({
      ...playable,
    });
  }

  // ── Level lesson (the surviving questions for that level) ─────────────────
  const level = parseInt(levelRaw ?? '', 10);
  const meta = live.levels.find((l) => l.level === level);
  if (!meta) return jsonError(res, 400, 'bad_request', 'Invalid level');

  const playable = playableResponse({
    kind: 'level', topic, ref: meta.level, title: meta.title,
    difficulty: meta.difficulty, passPct: LEVEL_PASS,
    ids: live.levelIds[level - 1] ?? [], lang, byId,
    ...(level > 1 ? { requiredLevelStart: level - 1, requiredLevelEnd: level - 1 } : {}),
  });
  if (!playable || playable.questions.length === 0) {
    return jsonError(res, 404, 'no_questions', 'No questions for this level');
  }

  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({ status: 200, kind: 'level', topic, level, count: playable.questions.length, latency_ms: Date.now() - started });
  return res.json({
    ...playable,
  });
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return withRequestContext(req, res, () => routeHandler(req, res));
}
