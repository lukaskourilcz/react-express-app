// The hint ladder gives the least help that gets someone moving again: one
// rung per click, gentlest first, only after a real attempt. The last rung
// before the reference solution is a documentation link, because devShark
// ships no AI coach. Ported from interview-prepper and extended.
import type { PlayableCodingTask } from '../../../shared/coding-catalog';
import { docsFor } from '../../../shared/coding-docs';
import type { Lang } from '../i18n/LanguageContext';

export type LadderRung =
  | { kind: 'hint'; index: number; body: string }
  | { kind: 'approach'; index: number; body: string }
  | { kind: 'skeleton'; body: string }
  | { kind: 'docs'; tag: string; url: string };

export const MAX_HINTS = 5;
/** A minute of editing counts as a genuine attempt. */
export const MIN_ATTEMPT_MS = 60_000;

export function ladderRungs(task: PlayableCodingTask, lang: Lang): LadderRung[] {
  const hints = task.hints[lang].length > 0 ? task.hints[lang] : task.hints.en;
  const approach = task.approach ? (task.approach[lang].length > 0 ? task.approach[lang] : task.approach.en) : [];
  const rungs: LadderRung[] = [
    ...hints.slice(0, MAX_HINTS).map((body, index): LadderRung => ({ kind: 'hint', index, body })),
    ...approach.slice(0, MAX_HINTS).map((body, index): LadderRung => ({ kind: 'approach', index, body })),
  ];
  if (task.skeleton) rungs.push({ kind: 'skeleton', body: task.skeleton });
  const docs = docsFor(task.focus);
  rungs.push({ kind: 'docs', tag: docs.tag, url: docs.url });
  return rungs;
}

/** Either the learner spent a minute editing, or a run already failed. */
export function attemptStarted(input: { code: string; starter: string; elapsedMs: number; failedRun: boolean }): boolean {
  if (input.failedRun) return true;
  return input.code.trim() !== input.starter.trim() && input.elapsedMs >= MIN_ATTEMPT_MS;
}

/** The solution opens once half the ladder is spent, never before two rungs. */
export const giveUpAfter = (total: number): number => Math.min(Math.max(2, Math.ceil(total / 2)), Math.max(total, 1));
export const canGiveUp = (taken: number, total: number): boolean => taken >= giveUpAfter(total);
