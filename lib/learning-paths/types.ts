/** Authored learning-path shapes. The authored English source is the only
 * copy; `mergePath` normalizes it into the shape the API projects from.
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
  PathCodeLanguage,
  SourceReference,
  VerificationKind,
} from '../../shared/learning-paths';
import type { LessonSection, TraceFrame, TraceSpec } from '../../shared/learning-path-api';
import type { TaskRuntimePolicy } from '../../shared/coding-task-runtime';
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

export interface CompetencySource {
  id: string;
  title: string;
  summary: string;
}

export interface RubricDimensionSource {
  id: string;
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

/* ── server-only answer material ──────────────────────────────────────── */

/** Reference solution and hidden assertions for one code activity. Lives in
 * `lib/learning-paths/solutions/` and is loaded only by the grader. */
export interface PathCodeSolution {
  solution: string;
  hiddenTests?: PathCallTest[];
  hiddenTypeTests?: SourceTypeTest[];
}

/* ── merge helpers ────────────────────────────────────────────────────── */

export function mergeLessonSection(section: LessonSectionSource): LessonSection {
  switch (section.kind) {
    case 'prose':
      return { kind: 'prose', body: section.body };
    case 'callout':
      return { kind: 'callout', tone: section.tone, body: section.body };
    case 'code':
      return { kind: 'code', language: section.language, code: section.code, caption: section.caption };
    case 'example':
      return {
        kind: 'example',
        language: section.language,
        code: section.code,
        caption: section.caption,
        note: section.note,
      };
    case 'table':
      return {
        kind: 'table',
        caption: section.caption,
        headers: section.headers,
        rows: section.rows,
      };
    case 'trace':
      return {
        kind: 'trace',
        caption: section.caption,
        trace: {
          shape: section.trace.shape,
          ...(section.trace.legend ? { legend: section.trace.legend } : {}),
          frames: section.trace.frames.map((frame) => ({
            cells: frame.cells,
            ...(frame.marks ? { marks: frame.marks } : {}),
            note: frame.note,
            ...(frame.counter
              ? { counter: { label: frame.counter.label, value: frame.counter.value } }
              : {}),
          })),
        },
      };
  }
}

export interface MergedLesson {
  id: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  sources: SourceReference[];
  sections: LessonSection[];
}

export function mergeLesson(lesson: LessonSource): MergedLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    summary: lesson.summary,
    estimatedMinutes: lesson.estimatedMinutes,
    sources: lesson.sources,
    sections: lesson.sections.map(mergeLessonSection),
  };
}

export interface MergedCheckQuestion {
  id: string;
  prompt: string;
  context?: { language: string; code: string };
  options: string[];
  correct: number;
  explanation: string;
  domain?: string;
  competencies: string[];
}

export interface MergedCriterion {
  id: string;
  label: string;
  critical: boolean;
  weight: number;
  detail: string | null;
}

export interface MergedCode {
  runtimePolicy?: TaskRuntimePolicy;
  language: PathCodeLanguage;
  prompt: string;
  starter: string;
  skeleton?: string;
  hints: string[];
  approach?: string[];
  contract?: string[];
  tests: MergedCallTest[];
  typeTests: { code: string; label?: string; rejects?: boolean }[];
  suite?: string;
  harness?: string;
  criteria: MergedCriterion[];
}

export interface MergedCallTest {
  call: string;
  expected: unknown;
  label?: string;
  edge?: boolean;
  async?: boolean;
  criterion: string;
}

export interface MergedArtifact {
  brief: string;
  fields: { id: string; label: string; help: string; kind: ArtifactFieldSource['kind']; required: boolean; maxLength: number }[];
  rubricDimensions: string[];
}

export interface MergedActivity {
  id: string;
  kind: ActivityKind;
  purpose: ActivityPurpose;
  verification: VerificationKind;
  title: string;
  summary: string;
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

export function mergeCode(code: PathCodeSource): MergedCode {
  const declared = code.criteria ?? [];
  const criteria: MergedCriterion[] = declared.map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    critical: criterion.critical,
    weight: criterion.weight,
    detail: criterion.detail || null,
  }));
  if (!criteria.some((criterion) => criterion.id === DEFAULT_CRITERION)) {
    criteria.unshift({
      id: DEFAULT_CRITERION,
      label: 'Required behaviour',
      critical: true,
      weight: 1,
      detail: null,
    });
  }
  return {
    language: code.language,
    prompt: code.prompt,
    starter: code.starter,
    ...(code.skeleton ? { skeleton: code.skeleton } : {}),
    hints: code.hints,
    ...(code.approach ? { approach: code.approach } : {}),
    ...(code.contract ? { contract: code.contract } : {}),
    tests: (code.tests ?? []).map((test) => ({
      call: test.call,
      expected: test.expected,
      ...(test.label ? { label: test.label } : {}),
      ...(test.edge ? { edge: true } : {}),
      ...(test.async ? { async: true } : {}),
      criterion: test.criterion ?? DEFAULT_CRITERION,
    })),
    typeTests: (code.typeTests ?? []).map((test) => ({
      code: test.code,
      ...(test.label ? { label: test.label } : {}),
      ...(test.rejects ? { rejects: true } : {}),
    })),
    ...(code.suite ? { suite: code.suite } : {}),
    ...(code.harness ? { harness: code.harness } : {}),
    criteria,
  };
}

export function mergeActivity(activity: ActivitySource): MergedActivity {
  const merged: MergedActivity = {
    id: activity.id,
    kind: activity.kind,
    purpose: activity.purpose,
    verification: activity.verification,
    title: activity.title,
    summary: activity.summary,
    competencies: activity.competencies,
    estimatedMinutes: activity.estimatedMinutes,
    ...(activity.lessonId ? { lessonId: activity.lessonId } : {}),
    ...(activity.passThreshold !== undefined ? { passThreshold: activity.passThreshold } : {}),
    ...(activity.domains ? { domains: activity.domains } : {}),
    ...(activity.reuseTaskId ? { reuseTaskId: activity.reuseTaskId } : {}),
  };
  if (activity.questions) {
    merged.questions = activity.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      ...(question.context ? { context: question.context } : {}),
      options: [...question.options],
      correct: question.correct,
      explanation: question.explanation,
      ...(question.domain ? { domain: question.domain } : {}),
      competencies: question.competencies,
    }));
  }
  if (activity.code) merged.code = mergeCode(activity.code);
  if (activity.artifact) {
    merged.artifact = {
      brief: activity.artifact.brief,
      fields: activity.artifact.fields.map((field) => ({
        id: field.id,
        label: field.label,
        help: field.help,
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
  title: string;
  outcomes: string[];
  competencies: string[];
  dependsOn: string[];
  lessons: MergedLesson[];
  activities: MergedActivity[];
  requires: { activityId: string; state: EvidenceState }[];
  estimatedMinutes: number;
  optional?: boolean;
}

export function mergeModule(module: ModuleSource): MergedModule {
  return {
    id: module.id,
    title: module.title,
    outcomes: module.outcomes,
    competencies: module.competencies,
    dependsOn: module.dependsOn,
    lessons: module.lessons.map(mergeLesson),
    activities: module.activities.map(mergeActivity),
    requires: module.requires,
    estimatedMinutes: module.estimatedMinutes,
    ...(module.optional ? { optional: true } : {}),
  };
}

export interface MergedPath {
  id: LearningPathId;
  kind: LearningPathKind;
  version: number;
  title: string;
  summary: string;
  outcomes: string[];
  nonGoals: string[];
  entryRequirement: string;
  competencies: { id: string; title: string; summary: string }[];
  modules: MergedModule[];
  bridges: {
    id: string;
    title: string;
    summary: string;
    suggestedFor: BaseTrack[];
    competencies: string[];
    references: { kind: BridgeSource['references'][number]['kind']; ref: string; label: string }[];
    estimatedMinutes: number;
  }[];
  rubric: {
    version: number;
    dimensions: { id: string; title: string; levels: { missing: string; partial: string; adequate: string; strong: string } }[];
  };
  diagnosticActivityId: string | null;
  estimatedHours: { min: number; max: number };
  sources: SourceReference[];
  reviewedOn: string;
  completionLabel: string;
}

export function mergePath(path: PathSource): MergedPath {
  return {
    id: path.id,
    kind: path.kind,
    version: path.version,
    title: path.title,
    summary: path.summary,
    outcomes: path.outcomes,
    nonGoals: path.nonGoals,
    entryRequirement: path.entryRequirement,
    competencies: path.competencies.map((competency) => ({
      id: competency.id,
      title: competency.title,
      summary: competency.summary,
    })),
    modules: path.modules.map(mergeModule),
    bridges: path.bridges.map((bridge) => ({
      id: bridge.id,
      title: bridge.title,
      summary: bridge.summary,
      suggestedFor: bridge.suggestedFor,
      competencies: bridge.competencies,
      references: bridge.references.map((reference) => ({
        kind: reference.kind,
        ref: reference.ref,
        label: reference.label,
      })),
      estimatedMinutes: bridge.estimatedMinutes,
    })),
    rubric: {
      version: path.rubric.version,
      dimensions: path.rubric.dimensions.map((dimension) => ({
        id: dimension.id,
        title: dimension.title,
        levels: {
          missing: dimension.levels.missing,
          partial: dimension.levels.partial,
          adequate: dimension.levels.adequate,
          strong: dimension.levels.strong,
        },
      })),
    },
    diagnosticActivityId: path.diagnosticActivityId,
    estimatedHours: path.estimatedHours,
    sources: path.sources,
    reviewedOn: path.reviewedOn,
    completionLabel: path.completionLabel,
  };
}
