/** Grading for learning-path activities.
 *
 * Nothing new executes here. Code runs in the same QuickJS sandbox, through
 * the same TypeScript checker and the same React runner the coding section
 * already uses; this module adds the path-shaped contract around them:
 *
 *   - the attempt is bound to an enrollment, so a task a learner reaches
 *     through a path is authorized by that enrollment rather than by the
 *     ordinary coding tier ladder — and the pass records path evidence only,
 *     never coding XP, coding progress or a tier unlock;
 *   - assertions group into named criteria, so a critical failure cannot be
 *     averaged away by a strong score elsewhere;
 *   - objective checks grade against the key sealed in the attempt session,
 *     and a domain-gated check must clear every domain separately;
 *   - written artifacts are recorded as submitted and self-reviewed. A length
 *     check can prove a field is non-empty; it cannot establish quality, and
 *     nothing here pretends otherwise.
 *
 * No path awards XP in v1. */

import { createHash } from 'node:crypto';
import type {
  CheckQuestionVerdict,
  CodeVerdictPayload,
  CriterionResult,
} from '../../shared/learning-path-api';
import type { EvidenceState, Localized, VerificationKind } from '../../shared/learning-paths';
import type { EvaluateResult } from '../../shared/coding-evaluate';
import type { TypeCheckResult } from '../../shared/coding-ts-check';
import type { CodingTask } from '../../shared/coding-catalog';
import { runInSandbox } from '../coding/sandbox';
import { nodeTypeScriptChecker } from '../coding/ts-check-node';
import { codeOutcome } from '../coding/grade';
import { DEFAULT_CRITERION, type MergedActivity, type MergedCallTest, type MergedCode, type PathCodeSolution } from './types';
import { solutionFor } from './solutions';

/** The share of non-critical weighted criteria a pass needs when the activity
 * does not state its own. Piloted, versioned with the rubric, and the same
 * number the curriculum documents use. */
export const DEFAULT_CRITERION_THRESHOLD = 0.8;

/* ── objective checks ─────────────────────────────────────────────────── */

export interface CheckGrade {
  state: EvidenceState;
  score: number;
  domainScores: Record<string, number> | null;
  failedDomains: string[];
  verdicts: CheckQuestionVerdict[];
}

/**
 * Grades answers against the key sealed into the attempt session. The key
 * holds the correct index *after* the per-attempt shuffle, so the browser
 * never received the answer and a replayed option order cannot be reused.
 *
 * A domain-gated check needs the threshold in every domain, which is what
 * stops a strong domain from covering a missing one.
 */
export function gradeCheck(
  activity: MergedActivity,
  answerKey: number[] | undefined,
  answers: number[] | undefined,
): CheckGrade {
  const questions = activity.questions ?? [];
  const threshold = activity.passThreshold ?? DEFAULT_CRITERION_THRESHOLD;
  const given = Array.isArray(answers) ? answers : [];
  const key = answerKey ?? [];

  const verdicts: CheckQuestionVerdict[] = questions.map((question, index) => {
    const correctIndex = key[index];
    const chosen = given[index];
    const correct =
      Number.isInteger(correctIndex) &&
      Number.isInteger(chosen) &&
      chosen === correctIndex;
    return {
      questionId: question.id,
      correct,
      correctIndex: Number.isInteger(correctIndex) ? correctIndex : -1,
      explanation: question.explanation,
      ...(question.domain ? { domain: question.domain } : {}),
    };
  });

  const correctCount = verdicts.filter((verdict) => verdict.correct).length;
  const score = questions.length === 0 ? 0 : correctCount / questions.length;

  let domainScores: Record<string, number> | null = null;
  const failedDomains: string[] = [];
  if (activity.domains?.length) {
    domainScores = {};
    for (const domain of activity.domains) {
      const inDomain = verdicts.filter((verdict) => verdict.domain === domain);
      const share = inDomain.length === 0 ? 0 : inDomain.filter((verdict) => verdict.correct).length / inDomain.length;
      domainScores[domain] = Number(share.toFixed(4));
      if (share < threshold) failedDomains.push(domain);
    }
  }

  const passed = score >= threshold && failedDomains.length === 0;
  return {
    state: passed ? 'verified_pass' : 'needs_revision',
    score: Number(score.toFixed(4)),
    domainScores,
    failedDomains,
    verdicts,
  };
}

/* ── code activities ──────────────────────────────────────────────────── */

export interface PathCodeGrade {
  state: EvidenceState;
  score: number;
  criteria: CriterionResult[];
  code: CodeVerdictPayload;
}

interface AssertionRun {
  criterion: string;
  pass: boolean;
}

const MAX_PATH_CODE_BYTES = 20 * 1024;

export const pathCodeTooLarge = (code: string): boolean =>
  Buffer.byteLength(code, 'utf8') > MAX_PATH_CODE_BYTES;

/** A reused ordinary coding task, projected into the path's code shape so one
 * grader handles both. The visible tests and hints are the task's own; the
 * criteria collapse to the single critical `core`, matching how the coding
 * section already grades it. */
export function codeFromReusedTask(task: CodingTask): MergedCode {
  return {
    language: task.track === 'react' ? 'react' : task.track === 'typescript' ? 'typescript' : 'javascript',
    prompt: task.prompt,
    starter: task.starter,
    ...(task.skeleton ? { skeleton: task.skeleton } : {}),
    hints: task.hints,
    ...(task.approach ? { approach: task.approach } : {}),
    tests: (task.tests ?? []).map((test) => ({
      call: test.call,
      expected: test.expected,
      ...(test.label ? { label: test.label } : {}),
      ...(test.edge ? { edge: true } : {}),
      ...(test.async ? { async: true } : {}),
      criterion: DEFAULT_CRITERION,
    })),
    typeTests: task.typeTests ?? [],
    ...(task.suite ? { suite: task.suite } : {}),
    criteria: [
      {
        id: DEFAULT_CRITERION,
        label: { en: 'Required behaviour', cs: 'Požadované chování' },
        critical: true,
        weight: 1,
        detail: null,
      },
    ],
  };
}

function foldCriteria(
  code: MergedCode,
  assertions: AssertionRun[],
  runnable: boolean,
): { criteria: CriterionResult[]; passed: boolean; score: number } {
  const byId = new Map(code.criteria.map((criterion) => [criterion.id, criterion]));
  const outcomes = new Map<string, boolean>();
  for (const criterion of code.criteria) outcomes.set(criterion.id, true);
  for (const assertion of assertions) {
    const id = byId.has(assertion.criterion) ? assertion.criterion : DEFAULT_CRITERION;
    if (!assertion.pass) outcomes.set(id, false);
  }
  // A criterion with no assertion of its own cannot be claimed as met.
  const exercised = new Set(assertions.map((assertion) => (byId.has(assertion.criterion) ? assertion.criterion : DEFAULT_CRITERION)));
  for (const criterion of code.criteria) {
    if (!exercised.has(criterion.id)) outcomes.set(criterion.id, false);
  }

  const criteria: CriterionResult[] = code.criteria.map((criterion) => {
    const passed = runnable && outcomes.get(criterion.id) === true;
    return {
      id: criterion.id,
      label: criterion.label,
      critical: criterion.critical,
      weight: criterion.weight,
      passed,
      detail: passed ? null : criterion.detail,
    };
  });

  const criticalPassed = criteria.filter((criterion) => criterion.critical).every((criterion) => criterion.passed);
  const optional = criteria.filter((criterion) => !criterion.critical);
  const optionalWeight = optional.reduce((sum, criterion) => sum + criterion.weight, 0);
  const optionalEarned = optional.reduce((sum, criterion) => sum + (criterion.passed ? criterion.weight : 0), 0);
  const optionalShare = optionalWeight === 0 ? 1 : optionalEarned / optionalWeight;

  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const earned = criteria.reduce((sum, criterion) => sum + (criterion.passed ? criterion.weight : 0), 0);

  return {
    criteria,
    passed: runnable && criticalPassed && optionalShare >= DEFAULT_CRITERION_THRESHOLD,
    score: totalWeight === 0 ? 0 : Number((earned / totalWeight).toFixed(4)),
  };
}

/**
 * Runs one code submission. The task's harness is appended *after* the
 * learner's source, so an author-supplied probe — a counted accessor, a
 * comparator that records comparisons — cannot be shadowed by a same-named
 * declaration in the submission. That is what lets a method assessment grade
 * observed operations instead of matching source text.
 */
export async function gradePathCode(
  activity: MergedActivity,
  code: MergedCode,
  submitted: string,
): Promise<PathCodeGrade> {
  const solution: PathCodeSolution | undefined = solutionFor(activity.id);
  const visible: MergedCallTest[] = code.tests;
  const hidden: MergedCallTest[] = (solution?.hiddenTests ?? []).map((test) => ({
    call: test.call,
    expected: test.expected,
    ...(test.edge ? { edge: true } : {}),
    ...(test.async ? { async: true } : {}),
    criterion: test.criterion ?? DEFAULT_CRITERION,
  }));

  if (code.language === 'react') {
    return gradeReactActivity(code, submitted);
  }

  let check: TypeCheckResult | null = null;
  let hiddenTypeFailures = 0;
  let hiddenTypeTotal = 0;
  let source = submitted;
  if (code.language === 'typescript') {
    const checker = nodeTypeScriptChecker();
    check = checker.check(submitted, code.typeTests);
    if (solution?.hiddenTypeTests?.length) {
      const hiddenCheck = checker.check(submitted, solution.hiddenTypeTests);
      hiddenTypeTotal = hiddenCheck.typeTests.length;
      hiddenTypeFailures = hiddenCheck.typeTests.filter((one) => !one.pass).length;
    }
    source = checker.toJavaScript(submitted);
  }

  const runnableSource = code.harness ? `${source}\n;\n${code.harness}\n` : source;
  const run = await runInSandbox({
    code: runnableSource,
    calls: [...visible.map((test) => test.call), ...hidden.map((test) => test.call)],
    expectations: [...visible.map((test) => test.expected), ...hidden.map((test) => test.expected)],
  });

  const visibleRun: EvaluateResult = {
    results: run.results.slice(0, visible.length),
    logs: run.logs,
    codeError: run.codeError,
    timedOut: run.timedOut,
  };
  const hiddenRun: EvaluateResult | null = hidden.length > 0
    ? { results: run.results.slice(visible.length), logs: [], codeError: run.codeError, timedOut: run.timedOut }
    : null;

  let outcome = codeOutcome({ visible: visibleRun, hidden: hiddenRun, check });
  if (outcome === 'passed' && hiddenTypeFailures > 0) outcome = 'failed';
  const runnable = outcome !== 'error' && outcome !== 'timeout';

  const assertions: AssertionRun[] = [
    ...visible.map((test, index) => ({ criterion: test.criterion, pass: visibleRun.results[index]?.pass === true })),
    ...hidden.map((test, index) => ({ criterion: test.criterion, pass: hiddenRun?.results[index]?.pass === true })),
  ];
  if (check) {
    const typesClean = check.codeErrors.length === 0 && check.typeTests.every((one) => one.pass) && hiddenTypeFailures === 0;
    assertions.push({ criterion: DEFAULT_CRITERION, pass: typesClean });
  }

  const folded = foldCriteria(code, assertions, runnable);
  return {
    state: folded.passed ? 'verified_pass' : 'needs_revision',
    score: folded.score,
    criteria: folded.criteria,
    code: {
      outcome: folded.passed ? 'passed' : outcome === 'passed' ? 'failed' : outcome,
      results: visibleRun.results,
      hidden: hidden.length + hiddenTypeTotal > 0
        ? {
            passed: (hiddenRun?.results.filter((one) => one.pass === true).length ?? 0) + (hiddenTypeTotal - hiddenTypeFailures),
            total: hidden.length + hiddenTypeTotal,
          }
        : null,
      check,
      logs: run.logs,
      codeError: run.codeError,
    },
  };
}

async function gradeReactActivity(code: MergedCode, submitted: string): Promise<PathCodeGrade> {
  const { runReactSuite } = await import('../coding/react-runner');
  let run;
  try {
    run = await runReactSuite({ suite: code.suite ?? '', appSource: submitted });
  } catch {
    // The runtime itself could not start. That is infrastructure, not the
    // learner: it is a retryable error, never a recorded failure.
    const folded = foldCriteria(code, [], false);
    return {
      state: 'in_progress',
      score: 0,
      criteria: folded.criteria,
      code: {
        outcome: 'error',
        results: [],
        hidden: null,
        check: null,
        logs: [],
        codeError: 'The React runner could not start. Try again in a moment.',
      },
    };
  }
  const results = run.cases.map((one) => ({ pass: one.status === 'pass', actual: null, error: one.error }));
  const runnable = !run.compileError && !run.timedOut;
  const assertions: AssertionRun[] = run.cases.map((one) => ({
    criterion: DEFAULT_CRITERION,
    pass: one.status === 'pass',
  }));
  const folded = foldCriteria(code, assertions, runnable && run.total > 0);
  return {
    state: folded.passed ? 'verified_pass' : 'needs_revision',
    score: folded.score,
    criteria: folded.criteria,
    code: {
      outcome: run.compileError ? 'error' : run.timedOut ? 'timeout' : folded.passed ? 'passed' : 'failed',
      results,
      hidden: null,
      check: null,
      logs: [],
      codeError: run.compileError,
    },
  };
}

/* ── artifacts ────────────────────────────────────────────────────────── */

export interface ArtifactGrade {
  state: EvidenceState;
  criteria: CriterionResult[];
  feedback: Localized[];
  cleaned: Record<string, string | string[]>;
}

/**
 * Validates a written submission and records it as self-reviewed.
 *
 * The checks here are structural: a required field is present, a value is
 * within its length cap, a URL parses. That is the honest limit of what
 * automated checking can say about prose, and the state it produces says so —
 * `self_reviewed`, never `verified_pass`. A URL is stored as text; v1 does not
 * fetch it, execute it, or treat it as evidence of anything.
 */
export function gradeArtifact(
  activity: MergedActivity,
  submitted: Record<string, string | string[]> | undefined,
): ArtifactGrade {
  const artifact = activity.artifact;
  const given = submitted ?? {};
  const criteria: CriterionResult[] = [];
  const feedback: Localized[] = [];
  const cleaned: Record<string, string | string[]> = {};
  if (!artifact) {
    return { state: 'needs_revision', criteria, feedback, cleaned };
  }

  let complete = true;
  for (const field of artifact.fields) {
    const raw = given[field.id];
    const isList = field.kind === 'list';
    const value = isList
      ? (Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []).map((entry) => String(entry).trim()).filter(Boolean)
      : typeof raw === 'string' ? raw.trim() : '';
    const present = isList ? (value as string[]).length > 0 : (value as string).length > 0;
    const serialized = isList ? (value as string[]).join('\n') : (value as string);
    const withinCap = serialized.length <= field.maxLength;
    const urlOk = field.kind !== 'url' || !present || /^https:\/\/[^\s]+$/.test(value as string);

    const passed = (!field.required || present) && withinCap && urlOk;
    if (!passed) complete = false;
    criteria.push({
      id: `field:${field.id}`,
      label: field.label,
      critical: field.required,
      weight: 1,
      passed,
      detail: passed
        ? null
        : !withinCap
          ? { en: `This field is limited to ${field.maxLength} characters.`, cs: `Toto pole je omezené na ${field.maxLength} znaků.` }
          : !urlOk
            ? { en: 'Enter a full https:// address, or leave it empty.', cs: 'Zadej celou adresu začínající https://, nebo pole nech prázdné.' }
            : field.help,
    });
    if (present && withinCap && urlOk) cleaned[field.id] = value;
  }

  if (!complete) {
    feedback.push({
      en: 'Some required parts are missing or over their length limit. Fill them in and submit again — nothing you already wrote is lost.',
      cs: 'Některé povinné části chybí nebo překročily limit délky. Doplň je a odešli znovu — nic z toho, co jsi už napsal, se neztratí.',
    });
  } else {
    feedback.push({
      en: 'Submitted and recorded as self-reviewed. Automated checks confirmed the parts are present and within their limits; they do not judge the quality of what you wrote. Compare it against the rubric yourself.',
      cs: 'Odesláno a zaznamenáno jako vlastní revize. Automatické kontroly ověřily, že části existují a vejdou se do limitů; kvalitu toho, co jsi napsal, neposuzují. Porovnej si to sám s rubrikou.',
    });
  }

  return {
    state: complete ? 'self_reviewed' : 'needs_revision',
    criteria,
    feedback,
    cleaned,
  };
}

/* ── shared helpers ───────────────────────────────────────────────────── */

export const verificationFor = (activity: MergedActivity): VerificationKind => activity.verification;

/** Stable hash of a submitted payload, so replaying an idempotency key with a
 * different body conflicts instead of silently returning the old result. */
export const requestHash = (payload: unknown): string =>
  createHash('sha256').update(JSON.stringify(payload ?? null), 'utf8').digest('base64url').slice(0, 32);

/** Feedback after a graded attempt: what to look at next, never the answer. */
export function codeFeedback(grade: PathCodeGrade): Localized[] {
  if (grade.code.outcome === 'timeout') {
    return [{
      en: 'The run hit its time limit. Look for a loop that never ends, or work that grows much faster than the input.',
      cs: 'Běh narazil na časový limit. Hledej cyklus, který nikdy neskončí, nebo práci, která roste mnohem rychleji než vstup.',
    }];
  }
  if (grade.code.outcome === 'error' && grade.code.codeError) {
    return [{
      en: 'The code did not run. Fix the error above and try again; nothing was recorded as a failed attempt.',
      cs: 'Kód se nespustil. Oprav chybu výše a zkus to znovu; jako neúspěšný pokus se nic nezaznamenalo.',
    }];
  }
  const failed = grade.criteria.filter((criterion) => !criterion.passed);
  if (failed.length === 0) return [];
  return failed.map((criterion) => criterion.detail ?? criterion.label);
}
