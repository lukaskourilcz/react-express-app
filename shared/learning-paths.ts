/** The learning-path domain: one bounded vocabulary for devShark's optional
 * Forward Deployed Engineer role specialization and its standalone DSA
 * Foundations skill path.
 *
 * This module owns ids, kinds, evidence vocabulary, the public manifest shapes
 * and the pure completion arithmetic, so browser and server agree without
 * either one holding an answer key. Authored bodies, answer keys and hidden
 * fixtures live under `lib/learning-paths/` and never reach this file.
 *
 * Deliberately separate from the existing registries:
 *   - `Track` (client/src/lib/tracks.ts) stays frontend/backend/fullstack.
 *   - `Specialization` (client/src/lib/leveling.ts) stays a cosmetic XP label.
 *   - `CodingTrack` and `RoadmapTopic` gain no members.
 * A learning path references those registries; it never joins them. */

import type { Localized, LocalizedList } from './coding-catalog';

export type { Localized, LocalizedList };

/* ── identity ──────────────────────────────────────────────────────────── */

/** Job-role specializations. FDE is the only one, and adding a second is a
 * product decision, not a content edit. DSA Foundations is deliberately not
 * here: it is a skill path, not a role. */
export const ROLE_SPECIALIZATION_IDS = ['fde'] as const;
export type RoleSpecializationId = (typeof ROLE_SPECIALIZATION_IDS)[number];
export const isRoleSpecializationId = (value: unknown): value is RoleSpecializationId =>
  typeof value === 'string' && (ROLE_SPECIALIZATION_IDS as readonly string[]).includes(value);

export const LEARNING_PATH_IDS = ['fde', 'dsa-foundations'] as const;
export type LearningPathId = (typeof LEARNING_PATH_IDS)[number];
export const isLearningPathId = (value: unknown): value is LearningPathId =>
  typeof value === 'string' && (LEARNING_PATH_IDS as readonly string[]).includes(value);

/** A role specialization sits above a chosen base track and occupies the
 * learner's single specialization preference. A skill path is entered
 * directly, holds no preference slot, and can run alongside a role. */
export type LearningPathKind = 'role_specialization' | 'skill_path';

/** The base engineering tracks the career flow already offers. Mirrors
 * `Track` in the client without importing it: `shared/` cannot depend on
 * `client/src/`, and the server needs to validate the same three values. */
export const BASE_TRACKS = ['fullstack', 'frontend', 'backend'] as const;
export type BaseTrack = (typeof BASE_TRACKS)[number];
export const isBaseTrack = (value: unknown): value is BaseTrack =>
  typeof value === 'string' && (BASE_TRACKS as readonly string[]).includes(value);

/** Every learning path is devShark-only. Kept as a constant rather than a
 * literal at each call site so the scope check reads the same everywhere. */
export const LEARNING_PATH_SUBJECT = 'webdev';

/* ── activities and evidence ───────────────────────────────────────────── */

/** What a learner does. `lesson` is reading; `check` is a set of objective
 * scenario/trace questions; `code` runs through the existing server graders;
 * `artifact` is a structured written submission. */
export type ActivityKind = 'lesson' | 'check' | 'code' | 'artifact';

/** Why the activity exists. Derived from the manifest — never trusted from a
 * request — because it decides whether a result can count as placement
 * evidence or as core completion. */
export type ActivityPurpose = 'diagnostic' | 'exercise' | 'project';

/** How a result was established. A machine-verified pass came from the
 * server's graders. A self-reviewed artifact is the learner's own account of
 * their work: it is displayed and stored, and it never becomes a verified
 * check. Keeping the two apart is a product invariant, not a display choice. */
export type VerificationKind = 'machine_verified' | 'self_reviewed';

export const EVIDENCE_STATES = [
  'not_started',
  'in_progress',
  'verified_pass',
  'self_reviewed',
  'needs_revision',
] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];
export const isEvidenceState = (value: unknown): value is EvidenceState =>
  typeof value === 'string' && (EVIDENCE_STATES as readonly string[]).includes(value);

/** The states that satisfy a module requirement, per requirement. A required
 * `verified_pass` cannot be met by `self_reviewed`; that is the whole point of
 * separating them. */
export const SATISFYING_STATES: Record<EvidenceState, readonly EvidenceState[]> = {
  not_started: ['not_started', 'in_progress', 'verified_pass', 'self_reviewed', 'needs_revision'],
  in_progress: ['in_progress', 'verified_pass', 'self_reviewed'],
  verified_pass: ['verified_pass'],
  self_reviewed: ['self_reviewed', 'verified_pass'],
  needs_revision: ['needs_revision'],
};

/* ── the public manifest ───────────────────────────────────────────────── */

/** A named capability the path teaches and the diagnostic measures. */
export interface CompetencyDescriptor {
  id: string;
  title: Localized;
  summary: Localized;
}

/** A published source the author checked, with the date they checked it. The
 * content validator requires one per lesson so a stale example is traceable. */
export interface SourceReference {
  label: string;
  url: string;
  /** ISO date (YYYY-MM-DD) the author last verified the link's claims. */
  reviewedOn: string;
}

/** One rubric dimension, in the learner-visible words used before they start.
 * Descriptors are observable, so a learner can self-review honestly. */
export interface RubricDimension {
  id: string;
  title: Localized;
  levels: {
    missing: Localized;
    partial: Localized;
    adequate: Localized;
    strong: Localized;
  };
}

export interface RubricDescriptor {
  version: number;
  dimensions: RubricDimension[];
}

/** The public shape of one activity: enough to preview, plan and understand
 * how it is judged, with no answer, fixture or hidden assertion. */
export interface ActivitySummary {
  id: string;
  kind: ActivityKind;
  purpose: ActivityPurpose;
  verification: VerificationKind;
  title: Localized;
  /** One sentence on what the learner will do. */
  summary: Localized;
  competencies: string[];
  estimatedMinutes: number;
  /** Objective checks: how many questions and the share that must be right. */
  questionCount?: number;
  passThreshold?: number;
  /** Objective checks that gate on every domain separately (the DSA final). */
  domains?: string[];
  /** Code activities: which server grader runs the submission. */
  language?: PathCodeLanguage;
  /** Code activities that reuse an ordinary coding task, by its stable id.
   * The learner reaches it through the path without the ordinary tier gate,
   * and the pass records path evidence only — never coding XP or a tier
   * unlock. */
  reuseTaskId?: string;
  /** Artifacts: the rubric dimensions the learner self-reviews against. */
  rubricDimensions?: string[];
}

export interface ModuleRequirement {
  activityId: string;
  state: EvidenceState;
}

export interface ModuleSummary {
  id: string;
  title: Localized;
  /** What the learner can do after the module, in their words. */
  outcomes: LocalizedList;
  competencies: string[];
  /** Module ids that should come first. Advisory for browsing, and the
   * validator proves the graph is acyclic. */
  dependsOn: string[];
  lessons: LessonSummary[];
  activities: ActivitySummary[];
  requires: ModuleRequirement[];
  estimatedMinutes: number;
  /** Placement diagnostics and bridges live in modules the learner may skip
   * entirely. An optional module never gates path completion and never
   * supplies the next required action. */
  optional?: boolean;
}

export interface LessonSummary {
  id: string;
  title: Localized;
  /** One sentence for the module list; the body arrives with the lesson. */
  summary: Localized;
  estimatedMinutes: number;
  sources: SourceReference[];
}

/** A recommendation attached to a competency the learner has not shown. Points
 * at material that already exists rather than duplicating it. */
export interface BridgeSummary {
  id: string;
  title: Localized;
  summary: Localized;
  /** Base tracks this bridge is usually suggested to; the diagnostic can
   * recommend it to anyone whose evidence calls for it. */
  suggestedFor: BaseTrack[];
  competencies: string[];
  /** Existing Learn topics/levels and coding tasks worth revisiting. */
  references: BridgeReference[];
  estimatedMinutes: number;
}

export interface BridgeReference {
  kind: 'roadmap-topic' | 'coding-task' | 'path-activity' | 'doc';
  /** Topic id, coding task id, activity id, or an absolute documentation URL. */
  ref: string;
  label: Localized;
}

/** The published, learner-visible description of one path version. */
export interface LearningPathManifest {
  id: LearningPathId;
  kind: LearningPathKind;
  version: number;
  title: Localized;
  /** The honest promise: what the path covers and what it does not. */
  summary: Localized;
  outcomes: LocalizedList;
  /** What the path deliberately excludes, so nobody infers coverage. */
  nonGoals: LocalizedList;
  /** Prose entry requirement; enrollment never enforces a rank or XP gate. */
  entryRequirement: Localized;
  competencies: CompetencyDescriptor[];
  modules: ModuleSummary[];
  bridges: BridgeSummary[];
  rubric: RubricDescriptor;
  /** The diagnostic activity id, when the path offers one. Always skippable. */
  diagnosticActivityId: string | null;
  estimatedHours: { min: number; max: number };
  sources: SourceReference[];
  /** ISO date of the last full content review. */
  reviewedOn: string;
  /** Wording the completion screen may use. No certification, no hiring claim. */
  completionLabel: Localized;
}

export type PathCodeLanguage = 'javascript' | 'typescript' | 'react';

/* ── derived counts ────────────────────────────────────────────────────── */

/** The real inventory of a published manifest. Every count the product shows
 * comes from here, so a screen can never advertise unbuilt content. */
export interface PathInventory {
  /** Modules that gate completion; optional placement/bridge modules excluded. */
  modules: number;
  lessons: number;
  /** Every objective question in the path, whatever its purpose. */
  checks: number;
  /** Every code exercise in the path, whatever its purpose. */
  codeExercises: number;
  artifacts: number;
  estimatedMinutes: number;
  /** The same counts split by purpose, so a screen can say "36 module checks
   * and a 10-question final assessment" instead of one number that means
   * neither. Diagnostics are placement, not curriculum. */
  moduleChecks: number;
  moduleCodeExercises: number;
  finalChecks: number;
  finalCodeExercises: number;
  diagnosticChecks: number;
  diagnosticCodeExercises: number;
}

export function pathInventory(manifest: LearningPathManifest): PathInventory {
  const zero = { checks: 0, code: 0 };
  const byPurpose: Record<ActivityPurpose, { checks: number; code: number }> = {
    diagnostic: { ...zero },
    exercise: { ...zero },
    project: { ...zero },
  };
  let lessons = 0;
  let artifacts = 0;
  let estimatedMinutes = 0;
  let modules = 0;
  for (const module of manifest.modules) {
    if (!module.optional) {
      modules += 1;
      lessons += module.lessons.length;
      estimatedMinutes += module.estimatedMinutes;
    }
    for (const activity of module.activities) {
      if (activity.kind === 'check') byPurpose[activity.purpose].checks += activity.questionCount ?? 0;
      else if (activity.kind === 'code') byPurpose[activity.purpose].code += 1;
      else if (activity.kind === 'artifact') artifacts += 1;
    }
  }
  return {
    modules,
    lessons,
    checks: byPurpose.diagnostic.checks + byPurpose.exercise.checks + byPurpose.project.checks,
    codeExercises: byPurpose.diagnostic.code + byPurpose.exercise.code + byPurpose.project.code,
    artifacts,
    estimatedMinutes,
    moduleChecks: byPurpose.exercise.checks,
    moduleCodeExercises: byPurpose.exercise.code,
    finalChecks: byPurpose.project.checks,
    finalCodeExercises: byPurpose.project.code,
    diagnosticChecks: byPurpose.diagnostic.checks,
    diagnosticCodeExercises: byPurpose.diagnostic.code,
  };
}

/* ── progress ──────────────────────────────────────────────────────────── */

export interface ActivityProgress {
  activityId: string;
  state: EvidenceState;
  verification: VerificationKind | null;
  /** Best recorded score for an objective check, 0..1. */
  score: number | null;
  /** Per-domain scores for a check that gates on domains. */
  domainScores?: Record<string, number>;
  attempts: number;
  updatedAt: string | null;
}

export interface ModuleProgress {
  moduleId: string;
  /** True only when every entry of `requires` is satisfied. */
  completed: boolean;
  completedAt: string | null;
  activities: ActivityProgress[];
}

export const stateSatisfies = (required: EvidenceState, actual: EvidenceState): boolean =>
  SATISFYING_STATES[required].includes(actual);

/** Whether a module's requirements are met by the states recorded for it. */
export function moduleComplete(
  module: Pick<ModuleSummary, 'requires'>,
  states: ReadonlyMap<string, EvidenceState>,
): boolean {
  if (module.requires.length === 0) return false;
  return module.requires.every((requirement) =>
    stateSatisfies(requirement.state, states.get(requirement.activityId) ?? 'not_started'),
  );
}

/** Modules whose required evidence is complete, in manifest order. */
export function completedModuleIds(
  manifest: LearningPathManifest,
  states: ReadonlyMap<string, EvidenceState>,
): string[] {
  return manifest.modules
    .filter((module) => !module.optional && moduleComplete(module, states))
    .map((module) => module.id);
}

/** Guided completion: every required module's evidence is in place. Optional
 * placement and bridge modules never count, and artifacts that only ever reach
 * `self_reviewed` are reported separately rather than folded into this flag. */
export function pathGuidedComplete(
  manifest: LearningPathManifest,
  states: ReadonlyMap<string, EvidenceState>,
): boolean {
  const required = manifest.modules.filter((module) => !module.optional);
  return required.length > 0 && required.every((module) => moduleComplete(module, states));
}

/** How many self-reviewed artifacts the learner has submitted, out of the
 * manifest's total. Shown beside guided completion, never merged with it. */
export function artifactTally(
  manifest: LearningPathManifest,
  states: ReadonlyMap<string, EvidenceState>,
): { submitted: number; total: number } {
  const artifacts = manifest.modules.flatMap((module) =>
    module.activities.filter((activity) => activity.kind === 'artifact'),
  );
  const submitted = artifacts.filter((activity) => {
    const state = states.get(activity.id);
    return state === 'self_reviewed' || state === 'verified_pass';
  }).length;
  return { submitted, total: artifacts.length };
}

/** The next thing worth doing: the first unmet requirement of the first
 * incomplete module, preferring an activity already in progress. One concrete
 * action, never a list of everything outstanding. */
export function nextActivityId(
  manifest: LearningPathManifest,
  states: ReadonlyMap<string, EvidenceState>,
): string | null {
  for (const module of manifest.modules) {
    if (module.optional || moduleComplete(module, states)) continue;
    const unmet = module.requires.filter(
      (requirement) => !stateSatisfies(requirement.state, states.get(requirement.activityId) ?? 'not_started'),
    );
    if (unmet.length === 0) continue;
    const started = unmet.find((requirement) => {
      const state = states.get(requirement.activityId);
      return state === 'in_progress' || state === 'needs_revision';
    });
    return (started ?? unmet[0]).activityId;
  }
  return null;
}

/* ── the account preference ────────────────────────────────────────────── */

/** The account-synced learning preference. `baseTrack` keeps the career flow's
 * existing choice; `specialization` is the optional role above it and is null
 * for a learner who continued without one. DSA Foundations never appears here:
 * a skill path is an enrollment, not a preference. */
export interface LearningPreference {
  schemaVersion: 1;
  baseTrack: BaseTrack;
  specialization: RoleSpecializationId | null;
}

export const LEARNING_PREFERENCE_META_KEY = 'devquiz_learning_preference_v1';
/** The pre-existing track field, still written for older clients. */
export const LEGACY_TRACK_META_KEY = 'devquiz_track';

/** Read a stored preference defensively: a malformed record must never block
 * a learner, so an unusable value degrades to null rather than throwing. */
export function parseLearningPreference(value: unknown): LearningPreference | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1) return null;
  if (!isBaseTrack(raw.baseTrack)) return null;
  const specialization = raw.specialization;
  if (specialization !== null && specialization !== undefined && !isRoleSpecializationId(specialization)) return null;
  return {
    schemaVersion: 1,
    baseTrack: raw.baseTrack,
    specialization: isRoleSpecializationId(specialization) ? specialization : null,
  };
}

/* ── id shapes ─────────────────────────────────────────────────────────── */

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const isPathContentId = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 3 && value.length <= 96 && ID_PATTERN.test(value);

/** Activity ids carry their path and version so a stale client cannot submit
 * a v1 answer against a v2 activity: `dsa-v1-d07-binary-search`. */
export const activityIdPrefix = (pathId: LearningPathId, version: number): string =>
  `${pathId === 'dsa-foundations' ? 'dsa' : pathId}-v${version}-`;

export const isCurriculumVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 999;
