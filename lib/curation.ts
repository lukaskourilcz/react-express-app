// Server-side curation metadata: the version of an item's content, and the
// review record for that exact version.
//
// The version is a keyed digest of everything authored about the item —
// question, options, correct answer, explanation, hint and tags. Keyed, not a
// plain hash: an unkeyed digest that covered the correct answer could be
// brute-forced by anyone holding the four options, which would hand out the
// answer key in a field meant to protect it. Covering the answer matters,
// because "the answer was changed" is exactly the edit that must invalidate an
// approval.
//
// The review registry is generated from the audit ledger
// (docs/audit/devshark-content-ledger.json → lib/curation-registry.ts) and is
// the only source of "this exact content was reviewed". Every devShark item a
// learner can be served passes through `questionEligibility` or
// `codingTaskEligibility` first: no record, a record for other content, a
// failed gate, a retire or a quarantine all mean the item is not served.
// Nothing downstream — the item note, the coverage sentence, the methodology
// page, the admin view — is allowed to say more than the registry supports.

import { createHash } from 'node:crypto';
import { createLogger } from './http';
import { stableAttemptId } from './quiz-tokens';
import { getEffectiveQuestions, overridesAvailable } from './questions-store';
import type { Question, QuestionTranslation } from './quiz-data';
import { subjectForCategory, type ScopeSubjectId } from '../shared/subject-catalog';
import type { CodingTask, Localized } from '../shared/coding-catalog';
import type { CodingSolution } from './coding/types';
import { AUDITED_CATEGORIES, CODING_TASKS_AUDITED, REVIEW_REGISTRY } from './curation-registry';
import {
  eligibilityFrom,
  publicItemReview,
  summarizeCoverage,
  type CoverageReport,
  type CoverageSource,
  type Eligibility,
  type PublicItemReview,
  type RegistryEntry,
  type ReviewEvent,
  type ReviewRecord,
} from '../shared/curation';

/** The subject the audit covers. Items of every other subject are not gated
 * by it: they are served exactly as before and never claim to be reviewed.
 * Within the subject, a recorded decision is enforced for every item it names;
 * the categories the ledger's scope lists are the complete ones, where an
 * item with no applicable record is withheld too. The audit lands in waves,
 * and a category still waiting for the rest of its wave serves its unreviewed
 * items as before rather than withholding them for want of a review. */
export const AUDITED_SUBJECT: ScopeSubjectId = 'webdev';

const logEvent = createLogger('curation');

/**
 * A stable, opaque id for exactly this wording of this item.
 *
 * Changing any authored field changes it, which is what makes "an edit
 * invalidates the previous approval" enforceable rather than a promise. It is
 * safe to show and safe to quote in a problem report.
 */
export function contentVersion(q: Question): string {
  return stableAttemptId(
    'content-version:v1',
    q.id,
    q.question,
    q.options.join(''),
    String(q.correctAnswer),
    q.explanation ?? '',
    q.introduction ?? '',
    (q.tags ?? []).join(''),
  ).slice(0, 12);
}

/**
 * The plain digest of the same authored fields, plus the category the item is
 * filed under. Server-only: it never crosses the wire, which is why it may be
 * unkeyed. It is what the audit ledger records a decision against, so that
 * the ledger stays meaningful outside this process — a keyed digest would only
 * ever be checkable by a deployment holding the same secret. The category is
 * included because topic fit was scored against it: moving an item to another
 * topic is an edit the reviewer did not see.
 */
export function contentHash(q: Pick<Question, 'category' | 'question' | 'options' | 'correctAnswer' | 'explanation' | 'introduction' | 'tags'>): string {
  return createHash('sha256')
    .update(JSON.stringify([
      'content-hash:v1',
      q.category,
      q.question,
      q.options,
      q.correctAnswer,
      q.explanation ?? '',
      q.introduction ?? '',
      q.tags ?? [],
    ]))
    .digest('hex')
    .slice(0, 16);
}

/** The plain digest of one served translation, or null when there is none. A
 * translation is reviewed on its own, because a wrong Czech option order is
 * a defect the English item does not have. */
export function translationHash(tr: QuestionTranslation | null | undefined): string | null {
  if (!tr) return null;
  if (!tr.introduction && !tr.question && !tr.options && !tr.explanation) return null;
  const fields = [tr.introduction ?? '', tr.question ?? '', tr.options ?? [], tr.explanation ?? ''];
  return createHash('sha256').update(JSON.stringify(['translation-hash:v1', ...fields])).digest('hex').slice(0, 16);
}

/**
 * The plain digest of everything that decides how a coding task is graded and
 * presented: the brief, the starter, the visible and hidden tests, the design
 * key and the reference solution. Czech copy is hashed separately, as for
 * questions. Server-only, unkeyed for the same reason as `contentHash`.
 */
export function taskHash(task: CodingTask, solution: CodingSolution | undefined): string {
  const stripCs = (value: Localized) => value.en;
  const authored = {
    id: task.id,
    track: task.track,
    topic: task.topic,
    level: task.level,
    tier: task.tier,
    focus: task.focus,
    verify: task.verify,
    format: task.format ?? 'implement',
    title: stripCs(task.title),
    prompt: stripCs(task.prompt),
    starter: task.starter,
    skeleton: task.skeleton ?? null,
    hints: task.hints.en,
    approach: task.approach?.en ?? null,
    tests: task.tests?.map((t) => ({ call: t.call, expected: t.expected, label: t.label?.en ?? null, edge: t.edge ?? false, async: t.async ?? false })) ?? null,
    typeTests: task.typeTests?.map((t) => ({ code: t.code, label: t.label?.en ?? null, rejects: t.rejects ?? false })) ?? null,
    suite: task.suite ?? null,
    checklist: task.checklist?.en ?? null,
    api: task.api ? { method: task.api.method, url: task.api.url, note: task.api.note.en } : null,
    design: task.design
      ? {
          scenario: task.design.scenario.en,
          brief: task.design.brief.en,
          reference: task.design.reference.en,
          passMark: task.design.passMark,
          steps: task.design.steps.map((step) => ({ key: step.key, title: step.title.en, prompt: step.prompt.en, options: step.options.map(stripCs), correct: step.correct, explanation: step.explanation.en })),
        }
      : null,
    drill: task.drill
      ? {
          format: task.drill.format,
          scenario: task.drill.scenario.en,
          prompt: task.drill.prompt.en,
          explanation: task.drill.explanation.en,
          unit: task.drill.unit?.en ?? null,
          answer: task.drill.answer ?? null,
          min: task.drill.min ?? null,
          max: task.drill.max ?? null,
          options: task.drill.options?.map(stripCs) ?? null,
          correct: task.drill.correct ?? null,
          steps: task.drill.steps?.map(stripCs) ?? null,
        }
      : null,
    failureHints: task.failureHints
      ? Object.fromEntries(Object.entries(task.failureHints).map(([key, value]) => [key, value?.en ?? null]))
      : null,
    pitfall: task.pitfall ?? null,
    solution: solution ? { solution: solution.solution, hiddenTests: solution.hiddenTests ?? null, hiddenTypeTests: solution.hiddenTypeTests ?? null } : null,
  };
  return createHash('sha256').update(JSON.stringify(['task-hash:v1', authored])).digest('hex').slice(0, 16);
}

/** The plain digest of a coding task's Czech overlay, or null when any of it
 * is missing (the content contract already refuses that). */
export function taskTranslationHash(task: CodingTask): string | null {
  const cs = {
    title: task.title.cs,
    prompt: task.prompt.cs,
    hints: task.hints.cs,
    approach: task.approach?.cs ?? null,
    tests: task.tests?.map((t) => t.label?.cs ?? null) ?? null,
    typeTests: task.typeTests?.map((t) => t.label?.cs ?? null) ?? null,
    checklist: task.checklist?.cs ?? null,
    api: task.api?.note.cs ?? null,
    design: task.design
      ? {
          scenario: task.design.scenario.cs,
          brief: task.design.brief.cs,
          reference: task.design.reference.cs,
          steps: task.design.steps.map((step) => ({ title: step.title.cs, prompt: step.prompt.cs, options: step.options.map((o) => o.cs), explanation: step.explanation.cs })),
        }
      : null,
    drill: task.drill
      ? { scenario: task.drill.scenario.cs, prompt: task.drill.prompt.cs, explanation: task.drill.explanation.cs, unit: task.drill.unit?.cs ?? null, options: task.drill.options?.map((o) => o.cs) ?? null, steps: task.drill.steps?.map((o) => o.cs) ?? null }
      : null,
  };
  if (!cs.title || !cs.prompt) return null;
  return createHash('sha256').update(JSON.stringify(['task-translation-hash:v1', cs])).digest('hex').slice(0, 16);
}

/* ── the registry ──────────────────────────────────────────────────────── */

const REGISTRY_BY_ID = new Map<string, RegistryEntry>(REVIEW_REGISTRY.map((entry) => [entry.id, entry]));

/** The recorded decision for an item id, whatever content it was made about.
 * Callers that need "does it apply to *this* content" use the eligibility
 * functions below; this is for the admin view and the ledger tooling. */
export const registryEntryFor = (itemId: string): RegistryEntry | null => REGISTRY_BY_ID.get(itemId) ?? null;

export const registrySize = (): number => REGISTRY_BY_ID.size;

const isAudited = (q: Pick<Question, 'category'>): boolean =>
  subjectForCategory(q.category) === AUDITED_SUBJECT && AUDITED_CATEGORIES.has(q.category);

/** Whether the gate applies to this category at all. */
export const isAuditedCategory = (category: string): boolean =>
  subjectForCategory(category) === AUDITED_SUBJECT && AUDITED_CATEGORIES.has(category);

/**
 * May this exact question be served?
 *
 * The one place the rule is applied to a question. The questions store calls
 * it while building the effective set, so every surface that reads the set —
 * quiz, daily, challenge, placement, Learn levels and checkpoints, review,
 * Play, flashcards, the coverage count — sees the same answer, and a surface
 * cannot forget to ask.
 */
export function questionEligibility(q: Question): Eligibility {
  return eligibilityFrom(REGISTRY_BY_ID.get(q.id), contentHash(q), translationHash(q.csTranslation), isAudited(q));
}

/** May this exact coding task be issued? Same rule, same registry. */
export function codingTaskEligibility(task: CodingTask, solution: CodingSolution | undefined): Eligibility {
  return eligibilityFrom(REGISTRY_BY_ID.get(task.id), taskHash(task, solution), taskTranslationHash(task), CODING_TASKS_AUDITED);
}

function recordFrom(entry: RegistryEntry, current: boolean, version: string): ReviewRecord {
  const events: ReviewEvent[] = [
    { kind: 'model', at: entry.reviewedAt, check: 'item review against the published criteria' },
  ];
  return {
    itemId: entry.id,
    // A record for other content is a record about something else: give it a
    // version that can never match what is being served, so every derivation
    // resolves to "superseded" rather than to the friendly answer.
    version: current ? version : `superseded:${entry.hash}`,
    relevance: entry.relevance,
    quality: entry.quality,
    events,
  };
}

/** The review record that applies to this question's exact content, or null
 * when nothing was ever recorded for its id. */
export function reviewRecordFor(q: Question): ReviewRecord | null {
  const entry = REGISTRY_BY_ID.get(q.id);
  if (!entry) return null;
  return recordFrom(entry, entry.hash === contentHash(q), contentVersion(q));
}

/** The review metadata for one item, safe to send to any client. */
export function itemReview(q: Question): PublicItemReview {
  return publicItemReview(reviewRecordFor(q), contentVersion(q));
}

/** The day the coding content contract last ran in CI is not knowable from
 * inside a request, so the recorded date is the day the evidence was
 * established for the shipped catalogue. It moves when the contract's
 * guarantees change, not on every deploy. */
const CODING_CONTRACT_DATE = '2026-09-08';

/**
 * The review metadata for one coding task.
 *
 * Coding tasks carry evidence questions do not: `npm run test:coding` executes
 * a reference solution against every task's own grader, so "this task is
 * solvable exactly as specified" is a checked fact for each of them
 * individually rather than a claim about the suite. That is recorded as one
 * execution check, and it is deliberately not called a review — nobody has
 * read the brief for clarity or judged whether it is worth doing.
 */
export function codingTaskReview(task: CodingTask, solution?: CodingSolution): PublicItemReview {
  const version = stableAttemptId(
    'content-version:v1',
    task.id,
    task.title.en,
    task.prompt.en,
    task.starter,
  ).slice(0, 12);
  const entry = REGISTRY_BY_ID.get(task.id);
  const record = entry ? recordFrom(entry, entry.hash === taskHash(task, solution), version) : null;
  return publicItemReview(record, version, [
    { kind: 'execution', at: CODING_CONTRACT_DATE, check: 'reference solution vs. grader' },
  ]);
}

/**
 * How much of what a learner can actually be served has been reviewed.
 *
 * The effective question set already folds in the database overrides and
 * operator-authored questions, so it is the real deliverable pool rather than
 * the static bank. When the override layer cannot be read, the count is not
 * "the static bank" — it is unknown, because items could exist that this
 * process cannot see, and an unknown source is what stops a bank-wide claim
 * being made at all.
 */
export async function curationCoverage(subject?: ScopeSubjectId): Promise<CoverageReport> {
  const sources: CoverageSource[] = [];
  try {
    const questions = await getEffectiveQuestions(subject);
    const complete = overridesAvailable();
    const reviewed = questions.reduce(
      (total, q) => total + (itemReview(q).status === 'reviewed' ? 1 : 0),
      0,
    );
    sources.push({
      id: 'question-bank',
      items: complete ? questions.length : null,
      reviewed: complete ? reviewed : null,
    });
  } catch (err) {
    logEvent({
      status: 500,
      reason: 'coverage_failed',
      error: err instanceof Error ? err.message : 'unknown',
    });
    sources.push({ id: 'question-bank', items: null, reviewed: null });
  }
  return summarizeCoverage(sources);
}
