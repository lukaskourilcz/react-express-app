/** Pure grading helpers, shared by the handlers and the launch contracts. */

import type { CodingTask, DesignDrillFormat, Localized } from '../../shared/coding-catalog';
import type { CodingOutcome, DesignAnswer, DesignStepVerdict } from '../../shared/coding-api';
import type { EvaluateResult } from '../../shared/coding-evaluate';
import type { TypeCheckResult } from '../../shared/coding-ts-check';
import type { CodingDesignKey } from '../quiz-tokens';

/** A random-but-recorded reordering: the learner sees `shuffled`, the sealed
 * session keeps enough to grade against the original. */
export function shuffleWithOrder<T>(items: readonly T[], shuffle: <U>(list: U[]) => U[]): { shuffled: T[]; order: number[] } {
  const order = shuffle(items.map((_, index) => index));
  return { shuffled: order.map((index) => items[index]), order };
}

/** Builds the playable (shuffled) design payload and the matching sealed key. */
export function prepareDesign(task: CodingTask, shuffle: <U>(list: U[]) => U[]): {
  design?: NonNullable<CodingTask['design']>;
  drill?: NonNullable<CodingTask['drill']>;
  key: CodingDesignKey;
} {
  if (task.design) {
    const key: CodingDesignKey = { steps: [] };
    const steps = task.design.steps.map((step) => {
      const { shuffled, order } = shuffleWithOrder(step.options, shuffle);
      key.steps!.push(order.indexOf(step.correct));
      return { ...step, options: shuffled, correct: -1 };
    });
    return { design: { ...task.design, steps }, key };
  }
  if (task.drill) {
    const drill = task.drill;
    if (drill.format === 'estimate') {
      return { drill, key: { band: { min: drill.min ?? 0, max: drill.max ?? 0, answer: drill.answer ?? 0 } } };
    }
    if (drill.format === 'sequence' && drill.steps) {
      const { shuffled, order } = shuffleWithOrder(drill.steps, shuffle);
      // The correct order, expressed as positions in the shuffled list.
      const correctOrder = drill.steps.map((_, original) => order.indexOf(original));
      return { drill: { ...drill, steps: shuffled }, key: { order: correctOrder } };
    }
    if (drill.options) {
      const { shuffled, order } = shuffleWithOrder(drill.options, shuffle);
      return { drill: { ...drill, options: shuffled, correct: -1 }, key: { correct: order.indexOf(drill.correct ?? 0) } };
    }
  }
  return { key: {} };
}

const asIndex = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 25 ? value : null;
const asEstimate = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const asOrder = (value: unknown): number[] | null =>
  Array.isArray(value) && value.length <= 25 && value.every((position) => asIndex(position) !== null) ? [...(value as number[])] : null;

interface DesignGrade {
  outcome: CodingOutcome;
  verdicts: DesignStepVerdict[];
  reference: Localized | null;
}

/** Grades a system-design submission against the sealed key, key and all. */
function gradeDesignWithKey(task: CodingTask, key: CodingDesignKey, answers: DesignAnswer[] | undefined): DesignGrade {
  const given = Array.isArray(answers) ? answers : [];
  if (task.design && key.steps) {
    const verdicts = task.design.steps.map((step, index): DesignStepVerdict => {
      const chosen = asIndex(given[index]);
      const correctIndex = key.steps![index];
      return { correct: chosen !== null && chosen === correctIndex, given: chosen, correctIndex, explanation: step.explanation };
    });
    const correct = verdicts.filter((v) => v.correct).length;
    return { outcome: correct >= task.design.passMark ? 'passed' : 'failed', verdicts, reference: task.design.reference };
  }
  if (task.drill) {
    const drill = task.drill;
    const format: DesignDrillFormat = drill.format;
    let verdict: DesignStepVerdict;
    if (format === 'estimate' && key.band) {
      const value = asEstimate(given[0]);
      verdict = {
        correct: value !== null && value >= key.band.min && value <= key.band.max,
        given: value,
        acceptedRange: key.band,
        explanation: drill.explanation,
      };
    } else if (format === 'sequence' && key.order) {
      const order = asOrder(given[0]);
      const correct = order !== null && order.length === key.order.length && order.every((position, index) => position === key.order![index]);
      verdict = { correct, given: order, correctOrder: key.order, explanation: drill.explanation };
    } else {
      const chosen = asIndex(given[0]);
      verdict = { correct: chosen !== null && chosen === key.correct, given: chosen, correctIndex: key.correct, explanation: drill.explanation };
    }
    return { outcome: verdict.correct ? 'passed' : 'failed', verdicts: [verdict], reference: null };
  }
  return { outcome: 'error', verdicts: [], reference: null };
}

/** Grades a system-design submission against the sealed key.
 *
 * Only a pass returns the walkthrough: each step's correct option, order or
 * range, its explanation, and the reference answer. A failed or partly right
 * submission returns, per step, whether it was right and the learner's own
 * answer. The explanations name the right option, so they stay behind too:
 * a failed attempt must not hand over the key for the next shuffle. */
export function gradeDesign(task: CodingTask, key: CodingDesignKey, answers: DesignAnswer[] | undefined): DesignGrade {
  const graded = gradeDesignWithKey(task, key, answers);
  if (graded.outcome === 'passed') return graded;
  return {
    outcome: graded.outcome,
    verdicts: graded.verdicts.map((step): DesignStepVerdict => ({ correct: step.correct, given: step.given })),
    reference: null,
  };
}

/** The outcome of a code run: every visible and hidden call matched and, for
 * TypeScript, the types were clean. */
export function codeOutcome(input: {
  visible: EvaluateResult;
  hidden: EvaluateResult | null;
  check: TypeCheckResult | null;
}): CodingOutcome {
  const runs = [input.visible, ...(input.hidden ? [input.hidden] : [])];
  if (runs.some((run) => run.timedOut)) return 'timeout';
  if (runs.some((run) => run.codeError)) return 'error';
  const testsPass = runs.every((run) => run.results.length > 0 && run.results.every((r) => r.pass === true));
  const typesPass = !input.check || (input.check.codeErrors.length === 0 && input.check.typeTests.every((t) => t.pass));
  return testsPass && typesPass ? 'passed' : 'failed';
}

/** How many hint rungs a task offers before the solution: authored hints, the
 * approach steps, the skeleton and the documentation link. */
export function ladderLength(task: Pick<CodingTask, 'hints' | 'approach' | 'skeleton'>): number {
  return task.hints.en.length + (task.approach?.en.length ?? 0) + (task.skeleton ? 1 : 0) + 1;
}

/** The solution opens once half the ladder is spent, never before two rungs. */
export function giveUpAfter(total: number): number {
  return Math.min(Math.max(2, Math.ceil(total / 2)), Math.max(total, 1));
}
