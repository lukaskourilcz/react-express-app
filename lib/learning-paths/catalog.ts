/** The merged learning-path catalogue: every published path with English and
 * Czech copy, plus the public projections the API serves.
 *
 * Never imports `./solutions`, so a bundle that pulled this in by mistake
 * would still carry no reference implementation; the launch contracts forbid
 * the import anyway. Answer indices for objective checks do live in the
 * merged content — `publicManifest` and `playableCheck` strip them, and the
 * launch contracts assert the projections stay clean. */

import type {
  ActivitySummary,
  BridgeSummary,
  LearningPathId,
  LearningPathManifest,
  ModuleSummary,
} from '../../shared/learning-paths';
import { pathInventory, type PathInventory } from '../../shared/learning-paths';
import type { PathAvailability } from '../../shared/learning-path-api';
import { DSA_PATH } from './content/dsa';
import { DSA_PATH_CS } from './content/dsa.cs';
import { FDE_PATH } from './content/fde';
import { FDE_PATH_CS } from './content/fde.cs';
import { mergePath, type MergedActivity, type MergedModule, type MergedPath, type PathCs, type PathSource } from './types';
import { validatePath, type ValidationIssue } from './validate';

const sources: { source: PathSource; cs: PathCs }[] = [
  { source: DSA_PATH, cs: DSA_PATH_CS },
  { source: FDE_PATH, cs: FDE_PATH_CS },
];

export const LEARNING_PATHS: readonly MergedPath[] = sources.map(({ source, cs }) => mergePath(source, cs));

const BY_ID = new Map<string, MergedPath>(LEARNING_PATHS.map((path) => [path.id, path]));

export const pathById = (id: string): MergedPath | undefined => BY_ID.get(id);

export function activityIn(path: MergedPath, activityId: string): { module: MergedModule; activity: MergedActivity } | null {
  for (const module of path.modules) {
    const activity = module.activities.find((one) => one.id === activityId);
    if (activity) return { module, activity };
  }
  return null;
}

export function lessonIn(path: MergedPath, lessonId: string) {
  for (const module of path.modules) {
    const lesson = module.lessons.find((one) => one.id === lessonId);
    if (lesson) return lesson;
  }
  return undefined;
}

/* ── public projections ───────────────────────────────────────────────── */

/** An activity as the catalogue advertises it: how it is judged, never how to
 * pass it. Questions, options, fixtures and criteria details stay behind. */
export function activitySummary(activity: MergedActivity): ActivitySummary {
  return {
    id: activity.id,
    kind: activity.kind,
    purpose: activity.purpose,
    verification: activity.verification,
    title: activity.title,
    summary: activity.summary,
    competencies: activity.competencies,
    estimatedMinutes: activity.estimatedMinutes,
    ...(activity.questions ? { questionCount: activity.questions.length } : {}),
    ...(activity.passThreshold !== undefined ? { passThreshold: activity.passThreshold } : {}),
    ...(activity.domains ? { domains: activity.domains } : {}),
    ...(activity.code ? { language: activity.code.language } : {}),
    ...(activity.reuseTaskId ? { reuseTaskId: activity.reuseTaskId } : {}),
    ...(activity.artifact ? { rubricDimensions: activity.artifact.rubricDimensions } : {}),
  };
}

export function moduleSummary(module: MergedModule): ModuleSummary {
  return {
    id: module.id,
    title: module.title,
    outcomes: module.outcomes,
    competencies: module.competencies,
    dependsOn: module.dependsOn,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      estimatedMinutes: lesson.estimatedMinutes,
      sources: lesson.sources,
    })),
    activities: module.activities.map(activitySummary),
    requires: module.requires,
    estimatedMinutes: module.estimatedMinutes,
    ...(module.optional ? { optional: true } : {}),
  };
}

const bridgeSummary = (bridge: MergedPath['bridges'][number]): BridgeSummary => ({
  id: bridge.id,
  title: bridge.title,
  summary: bridge.summary,
  suggestedFor: bridge.suggestedFor,
  competencies: bridge.competencies,
  references: bridge.references,
  estimatedMinutes: bridge.estimatedMinutes,
});

/** The published manifest: everything a learner may see before starting. */
export function publicManifest(path: MergedPath): LearningPathManifest {
  return {
    id: path.id,
    kind: path.kind,
    version: path.version,
    title: path.title,
    summary: path.summary,
    outcomes: path.outcomes,
    nonGoals: path.nonGoals,
    entryRequirement: path.entryRequirement,
    competencies: path.competencies,
    modules: path.modules.map(moduleSummary),
    bridges: path.bridges.map(bridgeSummary),
    rubric: path.rubric,
    diagnosticActivityId: path.diagnosticActivityId,
    estimatedHours: path.estimatedHours,
    sources: path.sources,
    reviewedOn: path.reviewedOn,
    completionLabel: path.completionLabel,
  };
}

export const manifestFor = (id: string): LearningPathManifest | null => {
  const path = BY_ID.get(id);
  return path ? publicManifest(path) : null;
};

export const inventoryFor = (id: string): PathInventory | null => {
  const manifest = manifestFor(id);
  return manifest ? pathInventory(manifest) : null;
};

/* ── readiness ────────────────────────────────────────────────────────── */

export interface PathReadiness {
  pathId: LearningPathId;
  version: number;
  /** Content is complete enough to publish: the validator found no errors. */
  contentReady: boolean;
  issues: ValidationIssue[];
  inventory: PathInventory;
}

/** Validate one path's content. Pure, so `/dev` readiness, the content test
 * and the API capability all read the same verdict. */
export function readinessFor(path: MergedPath): PathReadiness {
  const issues = validatePath(path);
  return {
    pathId: path.id,
    version: path.version,
    contentReady: issues.every((issue) => issue.level !== 'error'),
    issues,
    inventory: pathInventory(publicManifest(path)),
  };
}

export const allReadiness = (): PathReadiness[] => LEARNING_PATHS.map(readinessFor);

/** Server capability per path. A path is available only when the deployment
 * enabled it, the content validates and the storage migration is installed.
 * Each of those is reported separately so an operator can tell them apart. */
export function availabilityFor(input: {
  path: MergedPath;
  enabled: boolean;
  storageInstalled: boolean;
}): PathAvailability {
  if (!input.enabled) return 'disabled';
  if (!readinessFor(input.path).contentReady) return 'content_incomplete';
  if (!input.storageInstalled) return 'storage_missing';
  return 'available';
}

/** The environment switch, one variable per path so DSA can launch while FDE
 * content is still being authored. Absent means off: a path never turns
 * itself on because its content happens to validate. */
export function pathEnabledInEnv(
  pathId: LearningPathId,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const key = pathId === 'dsa-foundations' ? 'LEARNING_PATH_DSA_ENABLED' : 'LEARNING_PATH_FDE_ENABLED';
  return env[key] === 'true';
}
