// Question overrides layer.
//
// The question bank lives in code (quiz-data.ts). The /dev admin console stores
// *overrides* in the `question_edits` table: an edited copy of a base question,
// a brand-new "custom" question, or a soft-delete. This module merges those
// overrides onto the static base so the live quiz reflects admin edits, while
// always falling back to the unmodified base set if the DB is unavailable.

import { questions as baseQuestions, type Question, type CategoryType } from './quiz-data';
import { createServiceClient, withTimeout } from './http';

const supabase = createServiceClient();

const TABLE = 'question_edits';
// Short cache so edits propagate within seconds without a DB round-trip on
// every quiz request. (Each serverless instance has its own cache, so this TTL
// is also the upper bound on how long a stale instance serves old content.)
const CACHE_TTL_MS = 15_000;

export const KNOWN_CATEGORIES: CategoryType[] = [
  'html', 'css', 'javascript', 'typescript', 'react',
  'nodejs', 'git', 'dev-world', 'custom', 'code-snippets', 'apt',
];

export interface QuestionEditRow {
  question_id: string;
  is_custom: boolean;
  deleted: boolean;
  question: string | null;
  options: string[] | null;
  correct_index: number | null;
  explanation: string | null;
  introduction: string | null;
  category: string | null;
  tags: string[] | null;
  difficulty: number | null;
  updated_at?: string;
}

/** A question as shown in the admin console: full content plus its origin. */
export interface AdminQuestion extends Question {
  source: 'base' | 'edited' | 'custom';
  deleted: boolean;
}

/** Validated input accepted by saveQuestion(). */
export interface QuestionInput {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  introduction: string;
  category: string;
  tags: string[];
  difficulty: number;
}

const clampDifficulty = (n: number): Question['difficulty'] => {
  const d = Math.round(n);
  return (d < 1 ? 1 : d > 5 ? 5 : d) as Question['difficulty'];
};

// Merge an override row onto its base question (or build a custom question when
// there is no base). Edited/custom content is flagged noTranslate so the cs
// localizer doesn't paste stale auto-translations over the new wording.
function mergeRow(row: QuestionEditRow, base?: Question): Question {
  return {
    id: row.question_id,
    tags: row.tags ?? base?.tags ?? [],
    introduction: row.introduction ?? base?.introduction ?? '',
    question: row.question ?? base?.question ?? '',
    options: row.options ?? base?.options ?? [],
    correctAnswer: row.correct_index ?? base?.correctAnswer ?? 0,
    category: (row.category ?? base?.category ?? 'custom') as CategoryType,
    explanation: row.explanation ?? base?.explanation ?? '',
    difficulty: clampDifficulty(row.difficulty ?? base?.difficulty ?? 1),
    noTranslate: true,
  };
}

async function loadOverrides(): Promise<Map<string, QuestionEditRow> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await withTimeout(supabase.from(TABLE).select('*'), 4000);
    if (error || !data) return null;
    return new Map((data as QuestionEditRow[]).map((r) => [r.question_id, r]));
  } catch {
    // Table missing (migration not run), timeout, etc. — fall back to base.
    return null;
  }
}

function buildEffective(overrides: Map<string, QuestionEditRow>): Question[] {
  const list: Question[] = [];
  for (const base of baseQuestions) {
    const ov = overrides.get(base.id);
    if (ov?.deleted) continue;
    list.push(ov ? mergeRow(ov, base) : base);
  }
  for (const ov of overrides.values()) {
    if (ov.is_custom && !ov.deleted) list.push(mergeRow(ov));
  }
  return list;
}

let cache: { at: number; list: Question[]; byId: Map<string, Question> } | null = null;

async function effective(): Promise<{ list: Question[]; byId: Map<string, Question> }> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache;
  const overrides = await loadOverrides();
  const list = overrides ? buildEffective(overrides) : baseQuestions;
  const byId = new Map(list.map((q) => [q.id, q]));
  cache = { at: Date.now(), list, byId };
  return cache;
}

/** The live question set (base + overrides), used by the quiz/play endpoints. */
export async function getEffectiveQuestions(): Promise<Question[]> {
  return (await effective()).list;
}

/** Same set as a lookup map, for grading and explanation lookups. */
export async function getEffectiveQuestionsById(): Promise<Map<string, Question>> {
  return (await effective()).byId;
}

/** Clear the serving cache so the next request re-reads overrides. */
export function invalidateQuestionsCache() {
  cache = null;
}

/**
 * Full list for the admin console: every base question (with its override
 * applied and flagged) plus custom questions, including soft-deleted ones so
 * the admin can restore them. Always reads fresh (no serving cache).
 */
export async function listAdminQuestions(): Promise<AdminQuestion[]> {
  const overrides = (await loadOverrides()) ?? new Map<string, QuestionEditRow>();
  const out: AdminQuestion[] = [];
  for (const base of baseQuestions) {
    const ov = overrides.get(base.id);
    if (ov) {
      out.push({ ...mergeRow(ov, base), source: 'edited', deleted: ov.deleted });
    } else {
      out.push({ ...base, noTranslate: undefined, source: 'base', deleted: false });
    }
  }
  for (const ov of overrides.values()) {
    if (ov.is_custom) out.push({ ...mergeRow(ov), source: 'custom', deleted: ov.deleted });
  }
  return out;
}

function rowFromInput(input: QuestionInput, id: string, isCustom: boolean): QuestionEditRow {
  return {
    question_id: id,
    is_custom: isCustom,
    deleted: false,
    question: input.question,
    options: input.options,
    correct_index: input.correctIndex,
    explanation: input.explanation,
    introduction: input.introduction,
    category: input.category,
    tags: input.tags,
    difficulty: clampDifficulty(input.difficulty),
  };
}

/** Insert or update an override. A missing id creates a new custom question. */
export async function saveQuestion(input: QuestionInput): Promise<{ id: string }> {
  if (!supabase) throw new Error('not_configured');
  const id = input.id || `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  // No id at all, or a generated "dev-" id, means this has no base counterpart.
  const isCustom = !input.id || id.startsWith('dev-');
  const row = rowFromInput(input, id, isCustom);
  const { error } = await withTimeout(supabase.from(TABLE).upsert(row, { onConflict: 'question_id' }), 5000);
  if (error) throw new Error(error.message);
  invalidateQuestionsCache();
  return { id };
}

/**
 * Soft-delete a base question (hidden from the quiz, restorable) or hard-delete
 * a custom one (gone for good).
 */
export async function setQuestionDeleted(id: string, deleted: boolean): Promise<void> {
  if (!supabase) throw new Error('not_configured');
  const isCustom = id.startsWith('dev-');
  if (isCustom && deleted) {
    const { error } = await withTimeout(supabase.from(TABLE).delete().eq('question_id', id), 5000);
    if (error) throw new Error(error.message);
  } else {
    // Update an existing override in place; if none exists yet, create a minimal
    // soft-delete marker for the base question.
    const { data: updated, error: updErr } = await withTimeout(
      supabase.from(TABLE).update({ deleted, updated_at: new Date().toISOString() }).eq('question_id', id).select('question_id'),
      5000,
    );
    if (updErr) throw new Error(updErr.message);
    if (!updated || updated.length === 0) {
      const { error: insErr } = await withTimeout(
        supabase.from(TABLE).insert({ question_id: id, is_custom: false, deleted }),
        5000,
      );
      if (insErr) throw new Error(insErr.message);
    }
  }
  invalidateQuestionsCache();
}

/** Drop the override row entirely, reverting a base question to its original. */
export async function resetQuestion(id: string): Promise<void> {
  if (!supabase) throw new Error('not_configured');
  const { error } = await withTimeout(supabase.from(TABLE).delete().eq('question_id', id), 5000);
  if (error) throw new Error(error.message);
  invalidateQuestionsCache();
}
