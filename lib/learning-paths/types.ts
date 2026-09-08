/** Authored learning-path shapes. English is the source of truth; Czech copy
 * lives in a sibling `*.cs.ts` overlay keyed by module id, following the
 * repository's question-bank and coding-task convention. `mergeModule` joins
 * both into the localized shape the API projects from.
 *
 * Everything in this file is server-side. Answer indices, explanations,
 * hidden assertions and reference solutions live here or in
 * `lib/learning-paths/solutions/`; the public projection in `catalog.ts`
 * strips them before anything reaches a response. */

import type {
  ActivityKind,
  ActivityPurpose,
  BaseTrack,
  EvidenceState,
  LearningPathId,
  LearningPathKind,
  Localized,
  LocalizedList,
  PathCodeLanguage,
  SourceReference,
  VerificationKind,
} from '../../shared/learning-paths';
import type { LessonSection, TraceFrame, TraceSpec } from '../../shared/learning-path-api';
import type { SourceCallTest, SourceTypeTest } from '../coding/types';

export type { SourceCallTest, SourceTypeTest };

/* ── lessons ───────────────────────────────────────────────────────────── */

export type LessonSectionSource =
  | { kind: 'prose'; body: string }
  | { kind: 'code'; language: string; code: string; caption: string }
  | { kind: 'table'; caption: string; headers: string[]; rows: string[][] }
  | { kind: 'trace'; caption: string; trace: TraceSource }
  /** A snippet the learner may change and run. Exploration only: nothing about
   * it is graded or recorded, which the note says in the learner's language. */
  | { kind: 'example'; language: string; code: string; caption: string; note: string }
  | { kind: 'callout'; tone: 'note' | 'warning'; body: string };

export interface TraceSource {
  shape: TraceSpec['shape'];
  legend?: string[];
  frames: {
    cells: string[];
    marks?: TraceFrame['marks'];
    note: string;
    counter?: { label: string; value: number };
  }[];
}

export interface LessonSource {
  id: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  sources: SourceReference[];
  sections: LessonSectionSource[];
}

/** Czech copy for one lesson. Arrays align by index with the English source. */
export interface LessonCs {
  title: string;
  summary: string;
  /** One entry per section, in order. Sections without prose use ''. */
  sections: {
    body?: string;
    caption?: string;
    /** The example's exploration note. */
    note?: string;
    headers?: string[];
    rows?: string[][];
    notes?: string[];
    counterLabels?: string[];
    legend?: string[];
  }[];
}

/* ── objective checks ─────────────────────────────────────────────────── */

export interface CheckQuestionSource {
  id: string;
  prompt: string;
  context?: { language: string; code: string };
  options: string[];
  /** Index into `options` before shuffling. Server-only. */
  correct: number;
  explanation: string;
  /** Knowledge domain, for an activity that gates each domain separately. */
  domain?: string;
  competencies: string[];
}

export interface CheckQuestionCs {
  prompt: string;
  options: string[];
  explanation: string;
}

/* ── code activities ──────────────────────────────────────────────────── */

/** One graded criterion. A critical criterion cannot be averaged away: if it
 * fails the activity fails, whatever the weighted rest scored. */
export interface CriterionSource {
  id: string;
  label: string;
  critical: boolean;
  weight: number;
  /** Explanation shown when this criterion fails; never the implementation. */
  detail?: string;
}

export interface PathCodeSource {
  language: PathCodeLanguage;
  prompt: string;
  starter: string;
  skeleton?: string;
  hints: string[];
  approach?: string[];
  /** The operations the task allows or forbids, stated to the learner. The
   * graded contract below is what actually enforces them; this is the honest
   * description of it, not the enforcement. */
  contract?: string[];
  /** Visible assertions. `criterion` groups them; unmarked tests join `core`. */
  tests?: PathCallTest[];
  typeTests?: SourceTypeTest[];
  suite?: string;
  /** Source appended after the learner's code before the assertions run.
   * Used to hand the learner a counted accessor or comparator so a method
   * assessment can be graded from observed operations instead of matching
   * source text. Appended last so a learner cannot shadow it. */
  harness?: string;
  criteria?: CriterionSource[];
}

export interface PathCallTest extends SourceCallTest {
  criterion?: string;
}

export interface PathCodeCs {
  prompt: string;
  hints: string[];
  approach?: string[];
  contract?: string[];
  /** One entry per visible test, '' when the test has no label. */
  testLabels?: string[];
  typeTestLabels?: string[];
  criteria?: { label: string; detail?: string }[];
}

/* ── artifacts ────────────────────────────────────────────────────────── */

export interface ArtifactFieldSource {
  id: string;
  label: string;
  help: string;
  kind: 'short-text' | 'long-text' | 'list' | 'url';
  required: boolean;
  maxLength: number;
}

export interface PathArtifactSource {
  brief: string;
  fields: ArtifactFieldSource[];
  rubricDimensions: string[];
}

export interface PathArtifactCs {
  brief: string;
  fields: { label: string; help: string }[];
}

/* ── activities and modules ───────────────────────────────────────────── */

export interface ActivitySource {
  id: string;
  kind: ActivityKind;
  purpose: ActivityPurpose;
  verification: VerificationKind;
  title: string;
  summary: string;
  competencies: string[];
  estimatedMinutes: number;
  /** kind: 'lesson' — the lesson id this activity acknowledges. */
  lessonId?: string;
  /** kind: 'check' */
  questions?: CheckQuestionSource[];
  passThreshold?: number;
  /** Every listed domain must reach `passThreshold` on its own, so a strong
   * domain cannot compensate for a missing one. */
  domains?: string[];
  /** kind: 'code' */
  code?: PathCodeSource;
  /** kind: 'code' — reuse an ordinary coding task instead of a new body. The
   * learner reaches it through the path without the ordinary tier gate; the
   * pass records path evidence only, never coding XP or a tier unlock. */
  reuseTaskId?: string;
  /** kind: 'artifact' */
  artifact?: PathArtifactSource;
}

export interface ActivityCs {
  title: string;
  summary: string;
  questions?: Record<string, CheckQuestionCs>;
  code?: PathCodeCs;
  artifact?: PathArtifactCs;
}

export interface ModuleSource {
  id: string;
  title: string;
  outcomes: string[];
  competencies: string[];
  dependsOn: string[];
  lessons: LessonSource[];
  activities: ActivitySource[];
  requires: { activityId: string; state: EvidenceState }[];
  estimatedMinutes: number;
  /** Placement diagnostics and bridge practice live in modules a learner may
   * skip entirely; they never gate completion. */
  optional?: boolean;
}

export interface ModuleCs {
  title: string;
  outcomes: string[];
  lessons: Record<string, LessonCs>;
  activities: Record<string, ActivityCs>;
}

/* ── bridges and the path itself ──────────────────────────────────────── */

export interface BridgeSource {
  id: string;
  title: string;
  summary: string;
  suggestedFor: BaseTrack[];
  competencies: string[];
  references: { kind: 'roadmap-topic' | 'coding-task' | 'path-activity' | 'doc'; ref: string; label: string }[];
  estimatedMinutes: number;
}

export interface BridgeCs {
  title: string;
  summary: string;
  referenceLabels: string[];
}

export interface CompetencySource {
  id: string;
  title: string;
  summary: string;
}

export interface CompetencyCs {
  title: string;
  summary: string;
}

export interface RubricDimensionSource {
  id: string;
  title: string;
  levels: { missing: string; partial: string; adequate: string; strong: string };
}

export interface RubricDimensionCs {
  title: string;
  levels: { missing: string; partial: string; adequate: string; strong: string };
}

export interface PathSource {
  id: LearningPathId;
  kind: LearningPathKind;
  version: number;
  title: string;
  summary: string;
  outcomes: string[];
  nonGoals: string[];
  entryRequirement: string;
  competencies: CompetencySource[];
  modules: ModuleSource[];
  bridges: BridgeSource[];
  rubric: { version: number; dimensions: RubricDimensionSource[] };
  diagnosticActivityId: string | null;
  estimatedHours: { min: number; max: number };
  sources: SourceReference[];
  reviewedOn: string;
  completionLabel: string;
}

export interface PathCs {
  title: string;
  summary: string;
  outcomes: string[];
  nonGoals: string[];
  entryRequirement: string;
  completionLabel: string;
  competencies: Record<string, CompetencyCs>;
  modules: Record<string, ModuleCs>;
  bridges: Record<string, BridgeCs>;
  rubric: Record<string, RubricDimensionCs>;
}

/* ── server-only answer material ──────────────────────────────────────── */

/** Reference solution and hidden assertions for one code activity. Lives in
 * `lib/learning-paths/solutions/` and is loaded only by the grader. */
export interface PathCodeSolution {
  solution: string;
  hiddenTests?: PathCallTest[];
  hiddenTypeTests?: SourceTypeTest[];
}

/* ── merge helpers ────────────────────────────────────────────────────── */

const loc = (en: string, cs: string | undefined): Localized => ({ en, cs: cs ?? '' });
const locList = (en: string[], cs: string[] | undefined): LocalizedList => ({ en, cs: cs ?? [] });

export function mergeLessonSection(section: LessonSectionSource, cs: LessonCs['sections'][number] | undefined): LessonSection {
  switch (section.kind) {
    case 'prose':
      return { kind: 'prose', body: loc(section.body, cs?.body) };
    case 'callout':
      return { kind: 'callout', tone: section.tone, body: loc(section.body, cs?.body) };
    case 'code':
      return { kind: 'code', language: section.language, code: section.code, caption: loc(section.caption, cs?.caption) };
    case 'example':
      return {
        kind: 'example',
        language: section.language,
        code: section.code,
        caption: loc(section.caption, cs?.caption),
        note: loc(section.note, cs?.note),
      };
    case 'table':
      return {
        kind: 'table',
        caption: loc(section.caption, cs?.caption),
        headers: locList(section.headers, cs?.headers),
        rows: section.rows.map((row, index) => locList(row, cs?.rows?.[index])),
      };
    case 'trace':
      return {
        kind: 'trace',
        caption: loc(section.caption, cs?.caption),
        trace: {
          shape: section.trace.shape,
          ...(section.trace.legend ? { legend: locList(section.trace.legend, cs?.legend) } : {}),
          frames: section.trace.frames.map((frame, index) => ({
            cells: frame.cells,
            ...(frame.marks ? { marks: frame.marks } : {}),
            note: loc(frame.note, cs?.notes?.[index]),
            ...(frame.counter
              ? { counter: { label: loc(frame.counter.label, cs?.counterLabels?.[index]), value: frame.counter.value } }
              : {}),
          })),
        },
      };
  }
}

export interface MergedLesson {
  id: string;
  title: Localized;
  summary: Localized;
  estimatedMinutes: number;
  sources: SourceReference[];
  sections: LessonSection[];
}

export function mergeLesson(lesson: LessonSource, cs: LessonCs | undefined): MergedLesson {
  return {
    id: lesson.id,
    title: loc(lesson.title, cs?.title),
    summary: loc(lesson.summary, cs?.summary),
    estimatedMinutes: lesson.estimatedMinutes,
    sources: lesson.sources,
    sections: lesson.sections.map((section, index) => mergeLessonSection(section, cs?.sections?.[index])),
  };
}

export interface MergedCheckQuestion {
  id: string;
  prompt: Localized;
  context?: { language: string; code: string };
  options: Localized[];
  correct: number;
  explanation: Localized;
  domain?: string;
  competencies: string[];
}

export interface MergedCriterion {
  id: string;
  label: Localized;
  critical: boolean;
  weight: number;
  detail: Localized | null;
}

export interface MergedCode {
  language: PathCodeLanguage;
  prompt: Localized;
  starter: string;
  skeleton?: string;
  hints: LocalizedList;
  approach?: LocalizedList;
  contract?: LocalizedList;
  tests: MergedCallTest[];
  typeTests: { code: string; label?: Localized; rejects?: boolean }[];
  suite?: string;
  harness?: string;
  criteria: MergedCriterion[];
}

export interface MergedCallTest {
  call: string;
  expected: unknown;
  label?: Localized;
  edge?: boolean;
  async?: boolean;
  criterion: string;
}

export interface MergedArtifact {
  brief: Localized;
  fields: { id: string; label: Localized; help: Localized; kind: ArtifactFieldSource['kind']; required: boolean; maxLength: number }[];
  rubricDimensions: string[];
}

export interface MergedActivity {
  id: string;
  kind: ActivityKind;
  purpose: ActivityPurpose;
  verification: VerificationKind;
  title: Localized;
  summary: Localized;
  competencies: string[];
  estimatedMinutes: number;
  lessonId?: string;
  questions?: MergedCheckQuestion[];
  passThreshold?: number;
  domains?: string[];
  code?: MergedCode;
  reuseTaskId?: string;
  artifact?: MergedArtifact;
}

/** The default criterion every unmarked assertion belongs to. Critical, so a
 * task whose author declared no criteria behaves exactly like the ordinary
 * coding tasks: every assertion must pass. */
export const DEFAULT_CRITERION = 'core';

export function mergeCode(code: PathCodeSource, cs: PathCodeCs | undefined): MergedCode {
  const declared = code.criteria ?? [];
  const criteria: MergedCriterion[] = declared.map((criterion, index) => ({
    id: criterion.id,
    label: loc(criterion.label, cs?.criteria?.[index]?.label),
    critical: criterion.critical,
    weight: criterion.weight,
    detail: criterion.detail ? loc(criterion.detail, cs?.criteria?.[index]?.detail) : null,
  }));
  if (!criteria.some((criterion) => criterion.id === DEFAULT_CRITERION)) {
    criteria.unshift({
      id: DEFAULT_CRITERION,
      label: { en: 'Required behaviour', cs: 'Požadované chování' },
      critical: true,
      weight: 1,
      detail: null,
    });
  }
  return {
    language: code.language,
    prompt: loc(code.prompt, cs?.prompt),
    starter: code.starter,
    ...(code.skeleton ? { skeleton: code.skeleton } : {}),
    hints: locList(code.hints, cs?.hints),
    ...(code.approach ? { approach: locList(code.approach, cs?.approach) } : {}),
    ...(code.contract ? { contract: locList(code.contract, cs?.contract) } : {}),
    tests: (code.tests ?? []).map((test, index) => ({
      call: test.call,
      expected: test.expected,
      ...(test.label ? { label: loc(test.label, cs?.testLabels?.[index]) } : {}),
      ...(test.edge ? { edge: true } : {}),
      ...(test.async ? { async: true } : {}),
      criterion: test.criterion ?? DEFAULT_CRITERION,
    })),
    typeTests: (code.typeTests ?? []).map((test, index) => ({
      code: test.code,
      ...(test.label ? { label: loc(test.label, cs?.typeTestLabels?.[index]) } : {}),
      ...(test.rejects ? { rejects: true } : {}),
    })),
    ...(code.suite ? { suite: code.suite } : {}),
    ...(code.harness ? { harness: code.harness } : {}),
    criteria,
  };
}

export function mergeActivity(activity: ActivitySource, cs: ActivityCs | undefined): MergedActivity {
  const merged: MergedActivity = {
    id: activity.id,
    kind: activity.kind,
    purpose: activity.purpose,
    verification: activity.verification,
    title: loc(activity.title, cs?.title),
    summary: loc(activity.summary, cs?.summary),
    competencies: activity.competencies,
    estimatedMinutes: activity.estimatedMinutes,
    ...(activity.lessonId ? { lessonId: activity.lessonId } : {}),
    ...(activity.passThreshold !== undefined ? { passThreshold: activity.passThreshold } : {}),
    ...(activity.domains ? { domains: activity.domains } : {}),
    ...(activity.reuseTaskId ? { reuseTaskId: activity.reuseTaskId } : {}),
  };
  if (activity.questions) {
    merged.questions = activity.questions.map((question) => {
      const overlay = cs?.questions?.[question.id];
      return {
        id: question.id,
        prompt: loc(question.prompt, overlay?.prompt),
        ...(question.context ? { context: question.context } : {}),
        options: question.options.map((option, index) => loc(option, overlay?.options?.[index])),
        correct: question.correct,
        explanation: loc(question.explanation, overlay?.explanation),
        ...(question.domain ? { domain: question.domain } : {}),
        competencies: question.competencies,
      };
    });
  }
  if (activity.code) merged.code = mergeCode(activity.code, cs?.code);
  if (activity.artifact) {
    merged.artifact = {
      brief: loc(activity.artifact.brief, cs?.artifact?.brief),
      fields: activity.artifact.fields.map((field, index) => ({
        id: field.id,
        label: loc(field.label, cs?.artifact?.fields?.[index]?.label),
        help: loc(field.help, cs?.artifact?.fields?.[index]?.help),
        kind: field.kind,
        required: field.required,
        maxLength: field.maxLength,
      })),
      rubricDimensions: activity.artifact.rubricDimensions,
    };
  }
  return merged;
}

export interface MergedModule {
  id: string;
  title: Localized;
  outcomes: LocalizedList;
  competencies: string[];
  dependsOn: string[];
  lessons: MergedLesson[];
  activities: MergedActivity[];
  requires: { activityId: string; state: EvidenceState }[];
  estimatedMinutes: number;
  optional?: boolean;
}

export function mergeModule(module: ModuleSource, cs: ModuleCs | undefined): MergedModule {
  return {
    id: module.id,
    title: loc(module.title, cs?.title),
    outcomes: locList(module.outcomes, cs?.outcomes),
    competencies: module.competencies,
    dependsOn: module.dependsOn,
    lessons: module.lessons.map((lesson) => mergeLesson(lesson, cs?.lessons?.[lesson.id])),
    activities: module.activities.map((activity) => mergeActivity(activity, cs?.activities?.[activity.id])),
    requires: module.requires,
    estimatedMinutes: module.estimatedMinutes,
    ...(module.optional ? { optional: true } : {}),
  };
}

export interface MergedPath {
  id: LearningPathId;
  kind: LearningPathKind;
  version: number;
  title: Localized;
  summary: Localized;
  outcomes: LocalizedList;
  nonGoals: LocalizedList;
  entryRequirement: Localized;
  competencies: { id: string; title: Localized; summary: Localized }[];
  modules: MergedModule[];
  bridges: {
    id: string;
    title: Localized;
    summary: Localized;
    suggestedFor: BaseTrack[];
    competencies: string[];
    references: { kind: BridgeSource['references'][number]['kind']; ref: string; label: Localized }[];
    estimatedMinutes: number;
  }[];
  rubric: {
    version: number;
    dimensions: { id: string; title: Localized; levels: { missing: Localized; partial: Localized; adequate: Localized; strong: Localized } }[];
  };
  diagnosticActivityId: string | null;
  estimatedHours: { min: number; max: number };
  sources: SourceReference[];
  reviewedOn: string;
  completionLabel: Localized;
}

export function mergePath(path: PathSource, cs: PathCs | undefined): MergedPath {
  return {
    id: path.id,
    kind: path.kind,
    version: path.version,
    title: loc(path.title, cs?.title),
    summary: loc(path.summary, cs?.summary),
    outcomes: locList(path.outcomes, cs?.outcomes),
    nonGoals: locList(path.nonGoals, cs?.nonGoals),
    entryRequirement: loc(path.entryRequirement, cs?.entryRequirement),
    competencies: path.competencies.map((competency) => ({
      id: competency.id,
      title: loc(competency.title, cs?.competencies?.[competency.id]?.title),
      summary: loc(competency.summary, cs?.competencies?.[competency.id]?.summary),
    })),
    modules: path.modules.map((module) => mergeModule(module, cs?.modules?.[module.id])),
    bridges: path.bridges.map((bridge) => {
      const overlay = cs?.bridges?.[bridge.id];
      return {
        id: bridge.id,
        title: loc(bridge.title, overlay?.title),
        summary: loc(bridge.summary, overlay?.summary),
        suggestedFor: bridge.suggestedFor,
        competencies: bridge.competencies,
        references: bridge.references.map((reference, index) => ({
          kind: reference.kind,
          ref: reference.ref,
          label: loc(reference.label, overlay?.referenceLabels?.[index]),
        })),
        estimatedMinutes: bridge.estimatedMinutes,
      };
    }),
    rubric: {
      version: path.rubric.version,
      dimensions: path.rubric.dimensions.map((dimension) => {
        const overlay = cs?.rubric?.[dimension.id];
        return {
          id: dimension.id,
          title: loc(dimension.title, overlay?.title),
          levels: {
            missing: loc(dimension.levels.missing, overlay?.levels?.missing),
            partial: loc(dimension.levels.partial, overlay?.levels?.partial),
            adequate: loc(dimension.levels.adequate, overlay?.levels?.adequate),
            strong: loc(dimension.levels.strong, overlay?.levels?.strong),
          },
        };
      }),
    },
    diagnosticActivityId: path.diagnosticActivityId,
    estimatedHours: path.estimatedHours,
    sources: path.sources,
    reviewedOn: path.reviewedOn,
    completionLabel: loc(path.completionLabel, cs?.completionLabel),
  };
}

/** Every localized string of a merged path, for the EN/CS parity test. */
export function localizedPathFields(path: MergedPath): { path: string; value: Localized }[] {
  const out: { path: string; value: Localized }[] = [
    { path: 'title', value: path.title },
    { path: 'summary', value: path.summary },
    { path: 'entryRequirement', value: path.entryRequirement },
    { path: 'completionLabel', value: path.completionLabel },
  ];
  for (const competency of path.competencies) {
    out.push({ path: `competency.${competency.id}.title`, value: competency.title });
    out.push({ path: `competency.${competency.id}.summary`, value: competency.summary });
  }
  for (const dimension of path.rubric.dimensions) {
    out.push({ path: `rubric.${dimension.id}.title`, value: dimension.title });
    for (const level of ['missing', 'partial', 'adequate', 'strong'] as const) {
      out.push({ path: `rubric.${dimension.id}.${level}`, value: dimension.levels[level] });
    }
  }
  for (const bridge of path.bridges) {
    out.push({ path: `bridge.${bridge.id}.title`, value: bridge.title });
    out.push({ path: `bridge.${bridge.id}.summary`, value: bridge.summary });
    bridge.references.forEach((reference, index) =>
      out.push({ path: `bridge.${bridge.id}.reference[${index}]`, value: reference.label }));
  }
  for (const module of path.modules) {
    out.push({ path: `${module.id}.title`, value: module.title });
    for (const lesson of module.lessons) {
      out.push({ path: `${lesson.id}.title`, value: lesson.title });
      out.push({ path: `${lesson.id}.summary`, value: lesson.summary });
      lesson.sections.forEach((section, index) => {
        const at = `${lesson.id}.section[${index}]`;
        if (section.kind === 'prose' || section.kind === 'callout') out.push({ path: at, value: section.body });
        else if (section.kind === 'code') out.push({ path: `${at}.caption`, value: section.caption });
        else if (section.kind === 'table') {
          out.push({ path: `${at}.caption`, value: section.caption });
        } else if (section.kind === 'trace') {
          out.push({ path: `${at}.caption`, value: section.caption });
          section.trace.frames.forEach((frame, frameIndex) =>
            out.push({ path: `${at}.frame[${frameIndex}]`, value: frame.note }));
        }
      });
    }
    for (const activity of module.activities) {
      out.push({ path: `${activity.id}.title`, value: activity.title });
      out.push({ path: `${activity.id}.summary`, value: activity.summary });
      activity.questions?.forEach((question) => {
        out.push({ path: `${question.id}.prompt`, value: question.prompt });
        out.push({ path: `${question.id}.explanation`, value: question.explanation });
        question.options.forEach((option, index) => out.push({ path: `${question.id}.option[${index}]`, value: option }));
      });
      if (activity.code) {
        out.push({ path: `${activity.id}.code.prompt`, value: activity.code.prompt });
        activity.code.criteria.forEach((criterion) =>
          out.push({ path: `${activity.id}.criterion.${criterion.id}`, value: criterion.label }));
        activity.code.tests.forEach((test, index) => {
          if (test.label) out.push({ path: `${activity.id}.test[${index}].label`, value: test.label });
        });
      }
      if (activity.artifact) {
        out.push({ path: `${activity.id}.artifact.brief`, value: activity.artifact.brief });
        activity.artifact.fields.forEach((field) => {
          out.push({ path: `${activity.id}.field.${field.id}.label`, value: field.label });
          out.push({ path: `${activity.id}.field.${field.id}.help`, value: field.help });
        });
      }
    }
  }
  return out;
}

/** Every localized list of a merged path, for the EN/CS parity test. */
export function localizedPathLists(path: MergedPath): { path: string; value: LocalizedList }[] {
  const out: { path: string; value: LocalizedList }[] = [
    { path: 'outcomes', value: path.outcomes },
    { path: 'nonGoals', value: path.nonGoals },
  ];
  for (const module of path.modules) {
    out.push({ path: `${module.id}.outcomes`, value: module.outcomes });
    for (const activity of module.activities) {
      if (!activity.code) continue;
      out.push({ path: `${activity.id}.hints`, value: activity.code.hints });
      if (activity.code.approach) out.push({ path: `${activity.id}.approach`, value: activity.code.approach });
      if (activity.code.contract) out.push({ path: `${activity.id}.contract`, value: activity.code.contract });
    }
    for (const lesson of module.lessons) {
      lesson.sections.forEach((section, index) => {
        if (section.kind !== 'table') return;
        out.push({ path: `${lesson.id}.section[${index}].headers`, value: section.headers });
        section.rows.forEach((row, rowIndex) =>
          out.push({ path: `${lesson.id}.section[${index}].row[${rowIndex}]`, value: row }));
      });
    }
  }
  return out;
}
