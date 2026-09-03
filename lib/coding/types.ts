/** Authored task shapes. English is the source of truth; Czech copy lives in
 * a sibling `*.cs.ts` overlay keyed by task id, following the repository's
 * question-bank convention. `mergeTask` joins both into the shared
 * `CodingTask` shape the API serves. */

import type {
  CodingTask,
  CodingTier,
  CodingTrack,
  CodingVerify,
  DesignDrillFormat,
  Localized,
  LocalizedList,
} from '../../shared/coding-catalog';

export interface SourceCallTest {
  call: string;
  expected: unknown;
  label?: string;
  edge?: boolean;
  async?: boolean;
}

export interface SourceTypeTest {
  code: string;
  label?: string;
  rejects?: boolean;
}

export interface SourceDesign {
  scenario: string;
  brief: string;
  steps: { key: string; title: string; prompt: string; options: string[]; correct: number; explanation: string }[];
  reference: string;
  passMark: number;
}

export interface SourceDrill {
  format: DesignDrillFormat;
  scenario: string;
  prompt: string;
  explanation: string;
  unit?: string;
  answer?: number;
  min?: number;
  max?: number;
  options?: string[];
  correct?: number;
  steps?: string[];
}

export interface CodingTaskSource {
  id: string;
  legacyId?: string;
  track: CodingTrack;
  topic: CodingTask['topic'];
  level: number;
  tier: CodingTier;
  focus: string[];
  title: string;
  prompt: string;
  starter: string;
  skeleton?: string;
  hints: string[];
  approach?: string[];
  verify: CodingVerify;
  tests?: SourceCallTest[];
  typeTests?: SourceTypeTest[];
  suite?: string;
  checklist?: string[];
  api?: { method: string; url: string; note: string };
  design?: SourceDesign;
  drill?: SourceDrill;
  estimatedMinutes: number;
}

/** Czech copy for one task. Arrays align by index with the English source. */
export interface CodingTaskCs {
  title: string;
  prompt: string;
  hints: string[];
  approach?: string[];
  /** One entry per test, '' when the test has no label. */
  testLabels?: string[];
  typeTestLabels?: string[];
  checklist?: string[];
  apiNote?: string;
  design?: {
    scenario: string;
    brief: string;
    reference: string;
    steps: { title: string; prompt: string; options: string[]; explanation: string }[];
  };
  drill?: {
    scenario: string;
    prompt: string;
    explanation: string;
    unit?: string;
    options?: string[];
    steps?: string[];
  };
}

/** Reference solution and server-only hidden tests for one task. */
export interface CodingSolution {
  solution: string;
  hiddenTests?: SourceCallTest[];
  hiddenTypeTests?: SourceTypeTest[];
}

const loc = (en: string, cs: string | undefined): Localized => ({ en, cs: cs ?? '' });
const locList = (en: string[] | undefined, cs: string[] | undefined): LocalizedList | undefined =>
  en ? { en, cs: cs ?? [] } : undefined;
const optionalLoc = (en: string | undefined, cs: string | undefined): Localized | undefined =>
  en === undefined || en === '' ? undefined : loc(en, cs);

/** Join the English source with its Czech overlay. Missing Czech fields become
 * empty strings, which the content test rejects, so parity is enforced by the
 * test rather than by a silent fallback. */
export function mergeTask(source: CodingTaskSource, cs: CodingTaskCs | undefined): CodingTask {
  const task: CodingTask = {
    id: source.id,
    ...(source.legacyId ? { legacyId: source.legacyId } : {}),
    track: source.track,
    topic: source.topic,
    level: source.level,
    tier: source.tier,
    focus: source.focus,
    title: loc(source.title, cs?.title),
    prompt: loc(source.prompt, cs?.prompt),
    starter: source.starter,
    ...(source.skeleton ? { skeleton: source.skeleton } : {}),
    hints: { en: source.hints, cs: cs?.hints ?? [] },
    ...(source.approach ? { approach: locList(source.approach, cs?.approach) } : {}),
    verify: source.verify,
    estimatedMinutes: source.estimatedMinutes,
  };
  if (source.tests) {
    task.tests = source.tests.map((test, index) => ({
      call: test.call,
      expected: test.expected,
      ...(test.label ? { label: loc(test.label, cs?.testLabels?.[index]) } : {}),
      ...(test.edge ? { edge: true } : {}),
      ...(test.async ? { async: true } : {}),
    }));
  }
  if (source.typeTests) {
    task.typeTests = source.typeTests.map((test, index) => ({
      code: test.code,
      ...(test.label ? { label: loc(test.label, cs?.typeTestLabels?.[index]) } : {}),
      ...(test.rejects ? { rejects: true } : {}),
    }));
  }
  if (source.suite) task.suite = source.suite;
  if (source.checklist) task.checklist = { en: source.checklist, cs: cs?.checklist ?? [] };
  if (source.api) task.api = { method: source.api.method, url: source.api.url, note: loc(source.api.note, cs?.apiNote) };
  if (source.design) {
    task.design = {
      scenario: loc(source.design.scenario, cs?.design?.scenario),
      brief: loc(source.design.brief, cs?.design?.brief),
      reference: loc(source.design.reference, cs?.design?.reference),
      passMark: source.design.passMark,
      steps: source.design.steps.map((step, index) => ({
        key: step.key,
        title: loc(step.title, cs?.design?.steps?.[index]?.title),
        prompt: loc(step.prompt, cs?.design?.steps?.[index]?.prompt),
        options: step.options.map((option, optionIndex) => loc(option, cs?.design?.steps?.[index]?.options?.[optionIndex])),
        correct: step.correct,
        explanation: loc(step.explanation, cs?.design?.steps?.[index]?.explanation),
      })),
    };
  }
  if (source.drill) {
    const d = source.drill;
    task.drill = {
      format: d.format,
      scenario: loc(d.scenario, cs?.drill?.scenario),
      prompt: loc(d.prompt, cs?.drill?.prompt),
      explanation: loc(d.explanation, cs?.drill?.explanation),
      ...(d.unit !== undefined ? { unit: loc(d.unit, cs?.drill?.unit) } : {}),
      ...(d.answer !== undefined ? { answer: d.answer } : {}),
      ...(d.min !== undefined ? { min: d.min } : {}),
      ...(d.max !== undefined ? { max: d.max } : {}),
      ...(d.options ? { options: d.options.map((option, index) => loc(option, cs?.drill?.options?.[index])) } : {}),
      ...(d.correct !== undefined ? { correct: d.correct } : {}),
      ...(d.steps ? { steps: d.steps.map((step, index) => loc(step, cs?.drill?.steps?.[index])) } : {}),
    };
  }
  return task;
}

/** Every localized string of a merged task, for the parity test. */
export function localizedFields(task: CodingTask): { path: string; value: Localized }[] {
  const out: { path: string; value: Localized }[] = [{ path: 'title', value: task.title }, { path: 'prompt', value: task.prompt }];
  task.tests?.forEach((test, index) => { if (test.label) out.push({ path: `tests[${index}].label`, value: test.label }); });
  task.typeTests?.forEach((test, index) => { if (test.label) out.push({ path: `typeTests[${index}].label`, value: test.label }); });
  if (task.api) out.push({ path: 'api.note', value: task.api.note });
  if (task.design) {
    out.push({ path: 'design.scenario', value: task.design.scenario }, { path: 'design.brief', value: task.design.brief }, { path: 'design.reference', value: task.design.reference });
    task.design.steps.forEach((step, index) => {
      out.push({ path: `design.steps[${index}].title`, value: step.title }, { path: `design.steps[${index}].prompt`, value: step.prompt }, { path: `design.steps[${index}].explanation`, value: step.explanation });
      step.options.forEach((option, optionIndex) => out.push({ path: `design.steps[${index}].options[${optionIndex}]`, value: option }));
    });
  }
  if (task.drill) {
    out.push({ path: 'drill.scenario', value: task.drill.scenario }, { path: 'drill.prompt', value: task.drill.prompt }, { path: 'drill.explanation', value: task.drill.explanation });
    if (task.drill.unit) out.push({ path: 'drill.unit', value: task.drill.unit });
    task.drill.options?.forEach((option, index) => out.push({ path: `drill.options[${index}]`, value: option }));
    task.drill.steps?.forEach((step, index) => out.push({ path: `drill.steps[${index}]`, value: step }));
  }
  return out;
}

/** Every localized list of a merged task, for the parity test. */
export function localizedLists(task: CodingTask): { path: string; value: LocalizedList }[] {
  const out: { path: string; value: LocalizedList }[] = [{ path: 'hints', value: task.hints }];
  if (task.approach) out.push({ path: 'approach', value: task.approach });
  if (task.checklist) out.push({ path: 'checklist', value: task.checklist });
  return out;
}
