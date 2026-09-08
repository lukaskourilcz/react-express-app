/** The single prerequisite graph behind every devShark learning surface.
 *
 * One policy decides what a learner may start, what the Roadmap draws, what
 * Today plans and what the API accepts. The rules are deliberately few:
 *
 *   • A learning path is either the learner's base track, an optional
 *     specialisation above it, or a standalone enrolment. Paths the learner
 *     did not select are not part of their plan at all.
 *   • Inside a path, topics are grouped into ordered stages. Stage 1 is always
 *     open; stage N opens once every topic in stage N-1 has a first passed
 *     level. That is what "more learning paths show once you start completing
 *     levels" means, and it guarantees a reachable first step for every valid
 *     selection.
 *   • Inside a topic, level L needs levels 1…L-1 passed and every checkpoint
 *     that sits before it. There is no way to skip a higher level: not by a
 *     diagnostic, not by a direct URL, not by a stale client.
 *
 * Diagnostics are advisory. They may recommend where to start reading; they
 * never move the gate. Topic-level unlocks a learner already earned (owner
 * grants, historical skill checks) still make a topic *visible*, because
 * taking that away would erase state they can see — but they never open a
 * level whose predecessors are unpassed.
 *
 * The module is pure: level counts come in as data so both the server (from
 * `lib/roadmap.ts`) and the browser (from the roadmap structure it fetched)
 * evaluate exactly the same graph. */

import type { BaseTrack, LearnerProfile } from './learner-profile';
import { SUBJECT_SCOPE_CATALOG } from './subject-catalog';

export const PROGRESSION_GRAPH_VERSION = 1;

/** Levels per checkpoint, mirroring `lib/roadmap.ts`. */
export const LEVELS_PER_CHECKPOINT = 5;

export type ProgressionPathId = BaseTrack | 'fde' | 'dsa';
export type ProgressionPathKind = 'base' | 'specialization' | 'standalone';

export interface ProgressionStage {
  /** Stable key; also the translation-key suffix `progression.stage.<key>`. */
  key: string;
  topics: readonly string[];
}

export interface ProgressionPath {
  id: ProgressionPathId;
  kind: ProgressionPathKind;
  stages: readonly ProgressionStage[];
  /** Stages whose content is not authored yet; declared so the surfaces can
   * say so honestly instead of drawing a dead end. */
  pendingStages?: readonly string[];
}

/* ── the graph ───────────────────────────────────────────────────────────── */

const FRONTEND_STAGES: readonly ProgressionStage[] = [
  { key: 'foundations', topics: ['html', 'css', 'javascript'] },
  { key: 'language', topics: ['typescript', 'git'] },
  { key: 'react-stack', topics: ['react', 'nextjs'] },
  { key: 'ship', topics: ['testing', 'dsa'] },
];

const BACKEND_STAGES: readonly ProgressionStage[] = [
  { key: 'foundations', topics: ['javascript', 'typescript', 'git'] },
  { key: 'server', topics: ['nodejs', 'general'] },
  { key: 'data', topics: ['databases', 'dsa', 'algorithms'] },
  { key: 'production', topics: ['testing', 'system-design', 'devops', 'security'] },
];

const FULLSTACK_STAGES: readonly ProgressionStage[] = [
  { key: 'foundations', topics: ['html', 'css', 'javascript'] },
  { key: 'language', topics: ['typescript', 'git'] },
  { key: 'frontend', topics: ['react', 'nextjs'] },
  { key: 'backend', topics: ['nodejs', 'general', 'databases'] },
  { key: 'computer-science', topics: ['dsa', 'algorithms'] },
  { key: 'production', topics: ['testing', 'system-design', 'devops', 'security'] },
];

/** DSA Foundations: selectable on its own, never implied by a base track. */
const DSA_STAGES: readonly ProgressionStage[] = [
  { key: 'complexity', topics: ['dsa'] },
  { key: 'algorithms', topics: ['algorithms'] },
];

/**
 * The data and backend ground an FDE needs but a Frontend learner has not
 * covered. Issue #152 requires these bridges to sit *inside* FDE rather than
 * be assumed, so a Frontend+FDE learner is asked for them explicitly.
 */
const FDE_BRIDGE_TOPICS: readonly string[] = ['nodejs', 'general', 'databases'];
/** The FDE modules themselves are authored in #137–#139; not in this branch. */
const FDE_MODULE_STAGE = 'fde-modules';

export const BASE_PATH_STAGES: Record<BaseTrack, readonly ProgressionStage[]> = {
  fullstack: FULLSTACK_STAGES,
  frontend: FRONTEND_STAGES,
  backend: BACKEND_STAGES,
};

/** The FDE path for a given base track: only the bridges that track misses. */
export function fdePathFor(baseTrack: BaseTrack): ProgressionPath {
  const covered = new Set(BASE_PATH_STAGES[baseTrack].flatMap((stage) => [...stage.topics]));
  const bridge = FDE_BRIDGE_TOPICS.filter((topic) => !covered.has(topic));
  const stages: ProgressionStage[] = [];
  if (bridge.length > 0) stages.push({ key: 'fde-bridge', topics: bridge });
  stages.push({ key: FDE_MODULE_STAGE, topics: [] });
  return { id: 'fde', kind: 'specialization', stages, pendingStages: [FDE_MODULE_STAGE] };
}

export function pathsForProfile(profile: LearnerProfile): ProgressionPath[] {
  const paths: ProgressionPath[] = [
    { id: profile.baseTrack, kind: 'base', stages: BASE_PATH_STAGES[profile.baseTrack] },
  ];
  if (profile.fde) paths.push(fdePathFor(profile.baseTrack));
  if (profile.dsa) paths.push({ id: 'dsa', kind: 'standalone', stages: DSA_STAGES });
  return paths;
}

/** Every topic that appears anywhere in the graph, for validation. */
export const ALL_PROGRESSION_TOPICS: readonly string[] = Array.from(new Set([
  ...FULLSTACK_STAGES.flatMap((s) => [...s.topics]),
  ...FRONTEND_STAGES.flatMap((s) => [...s.topics]),
  ...BACKEND_STAGES.flatMap((s) => [...s.topics]),
  ...DSA_STAGES.flatMap((s) => [...s.topics]),
  ...FDE_BRIDGE_TOPICS,
]));

/**
 * Does the graph place this topic in a path?
 *
 * The Learn ladder is wider than any plan. `abbreviations` and `ai` are real
 * devShark topics that sit outside every track, and the same roadmap endpoints
 * serve every StudyShark subject, so a geography learner who also has a
 * devShark plan asks about `capitals` here too. A topic the graph never places
 * cannot be missing from a plan — there is no plan for it to be missing from —
 * so nothing but its own level chain may gate it.
 */
export function graphGoverns(topic: string): boolean {
  return ALL_PROGRESSION_TOPICS.includes(topic);
}

/** devShark Learn topics that sit outside every path, and are therefore always
 * open. Named explicitly so the eligibility response lists them instead of
 * letting the plan filter hide a topic the server would happily serve. */
export const UNPLACED_TOPICS: readonly string[] = [...SUBJECT_SCOPE_CATALOG.webdev.topics]
  .filter((topic) => !ALL_PROGRESSION_TOPICS.includes(topic));

/* ── verified completions ────────────────────────────────────────────────── */

/** What the learner has actually passed, as recorded by the server. */
export interface VerifiedCompletions {
  /** topic → level numbers with `passed: true`. */
  levels: Readonly<Record<string, readonly number[]>>;
  /** topic → checkpoint numbers with `passed: true`. */
  checkpoints: Readonly<Record<string, readonly number[]>>;
  /** Topics already visible to this learner (owner grants, historical skill
   * checks). Visibility only — never a level unlock. */
  visibleTopics?: readonly string[];
}

export const EMPTY_COMPLETIONS: VerifiedCompletions = { levels: {}, checkpoints: {}, visibleTopics: [] };

/** Read a roadmap progress blob (`roadmap_progress.data`) into completions. */
export function completionsFromBlob(
  blob: unknown,
  visibleTopics: readonly string[] = [],
): VerifiedCompletions {
  const levels: Record<string, number[]> = {};
  const checkpoints: Record<string, number[]> = {};
  if (blob && typeof blob === 'object') {
    for (const [topic, value] of Object.entries(blob as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const entry = value as { levels?: unknown; checkpoints?: unknown };
      const readPassed = (raw: unknown): number[] => {
        if (!raw || typeof raw !== 'object') return [];
        const out: number[] = [];
        for (const [key, row] of Object.entries(raw as Record<string, unknown>)) {
          const n = Number.parseInt(key, 10);
          if (!Number.isInteger(n) || n < 1) continue;
          if (row && typeof row === 'object' && (row as { passed?: unknown }).passed === true) out.push(n);
        }
        return out.sort((a, b) => a - b);
      };
      const passedLevels = readPassed(entry.levels);
      const passedCheckpoints = readPassed(entry.checkpoints);
      if (passedLevels.length > 0) levels[topic] = passedLevels;
      if (passedCheckpoints.length > 0) checkpoints[topic] = passedCheckpoints;
    }
  }
  return { levels, checkpoints, visibleTopics: [...visibleTopics] };
}

/** Highest contiguous passed level of a topic (0 when none). */
export function clearedLevels(completions: VerifiedCompletions, topic: string): number {
  const passed = new Set(completions.levels[topic] ?? []);
  let n = 0;
  while (passed.has(n + 1)) n += 1;
  return n;
}

const checkpointPassed = (completions: VerifiedCompletions, topic: string, checkpoint: number): boolean =>
  (completions.checkpoints[topic] ?? []).includes(checkpoint);

/* ── the gate ────────────────────────────────────────────────────────────── */

export type StepKind = 'level' | 'checkpoint';

export interface StepRef {
  pathId: ProgressionPathId;
  topic: string;
  kind: StepKind;
  /** Level number, or checkpoint number. */
  ref: number;
}

export type StepDenial =
  | 'not_selected'      // the topic is not in the learner's plan
  | 'stage_locked'      // an earlier stage of the path is unfinished
  | 'level_locked'      // an earlier level of the topic is unpassed
  | 'checkpoint_locked' // the checkpoint before this level is unpassed
  | 'unknown_topic'
  | 'out_of_range'
  | 'no_profile';

export interface StepDecision {
  allowed: boolean;
  reason: StepDenial | null;
  /** The step the learner should take instead, when one exists. */
  suggestion: StepRef | null;
}

/** Level counts per topic. Supplied by the caller so this module stays pure. */
export type TopicLevelCounts = Readonly<Record<string, number>>;

export interface ProgressionInput {
  profile: LearnerProfile | null;
  completions: VerifiedCompletions;
  levelCounts: TopicLevelCounts;
}

const checkpointsBefore = (level: number): number => Math.floor((level - 1) / LEVELS_PER_CHECKPOINT);

/** Which stage of which path a topic belongs to, for this learner's plan. */
interface TopicPlacement {
  pathId: ProgressionPathId;
  stageKey: string;
  stageIndex: number;
  stages: readonly ProgressionStage[];
}

function placements(profile: LearnerProfile): Map<string, TopicPlacement> {
  const out = new Map<string, TopicPlacement>();
  for (const path of pathsForProfile(profile)) {
    path.stages.forEach((stage, stageIndex) => {
      for (const topic of stage.topics) {
        // The first path that claims a topic owns its gate; a topic shared by
        // the base track and a specialisation is never gated twice.
        if (!out.has(topic)) out.set(topic, { pathId: path.id, stageKey: stage.key, stageIndex, stages: path.stages });
      }
    });
  }
  return out;
}

/** A stage is open when every topic in the stage before it has a first pass. */
function stageOpen(stages: readonly ProgressionStage[], stageIndex: number, completions: VerifiedCompletions): boolean {
  if (stageIndex <= 0) return true;
  for (let i = 0; i < stageIndex; i += 1) {
    for (const topic of stages[i].topics) {
      if (clearedLevels(completions, topic) < 1) return false;
    }
  }
  return true;
}

/** Is this topic part of the learner's plan and reachable right now? */
export function topicUnlocked(input: ProgressionInput, topic: string): boolean {
  const { profile, completions } = input;
  if (!profile) return false;
  if (!graphGoverns(topic)) return true;
  if ((completions.visibleTopics ?? []).includes(topic)) return true;
  const placement = placements(profile).get(topic);
  if (!placement) return false;
  return stageOpen(placement.stages, placement.stageIndex, completions);
}

/**
 * The step left inside one topic: the checkpoint that gates the next level, or
 * the next level itself, or null when the topic is finished.
 *
 * The last checkpoint of a topic sits *after* its last level (a 25-level topic
 * has five, the fifth being the Final Mastery Exam), so clearing every level is
 * not the end of the topic — the final exam still is.
 */
function nextStepInTopic(
  completions: VerifiedCompletions,
  pathId: ProgressionPathId,
  topic: string,
  levelCount: number,
): StepRef | null {
  const cleared = clearedLevels(completions, topic);
  const checkpointCount = Math.floor(levelCount / LEVELS_PER_CHECKPOINT);
  const gate = Math.min(checkpointsBefore(cleared + 1), checkpointCount);
  if (gate > 0 && !checkpointPassed(completions, topic, gate)) {
    return { pathId, topic, kind: 'checkpoint', ref: gate };
  }
  if (cleared >= levelCount) return null;
  return { pathId, topic, kind: 'level', ref: cleared + 1 };
}

/**
 * The authoritative decision for one step. Every entry point — starting a
 * level, issuing its questions or coding tasks, submitting an answer and
 * completing the attempt — asks this and nothing else.
 */
export function decideStep(input: ProgressionInput, step: Omit<StepRef, 'pathId'>): StepDecision {
  const { profile, completions, levelCounts } = input;
  if (!profile) return { allowed: false, reason: 'no_profile', suggestion: null };

  const levelCount = levelCounts[step.topic];
  if (!Number.isInteger(levelCount) || levelCount <= 0) {
    return { allowed: false, reason: 'unknown_topic', suggestion: nextStep(input) };
  }

  // Replaying something already passed is always fine; it changes nothing, and
  // it must keep working after the learner edits their plan — a level they
  // earned never becomes unplayable because its topic left the selection.
  const passed = step.kind === 'checkpoint' ? completions.checkpoints : completions.levels;
  if ((passed[step.topic] ?? []).includes(step.ref)) return { allowed: true, reason: null, suggestion: null };

  const placement = placements(profile).get(step.topic);
  const visible = (completions.visibleTopics ?? []).includes(step.topic);
  const governed = graphGoverns(step.topic);
  if (governed && !placement && !visible) {
    return { allowed: false, reason: 'not_selected', suggestion: nextStep(input) };
  }

  if (placement && !visible && !stageOpen(placement.stages, placement.stageIndex, completions)) {
    return { allowed: false, reason: 'stage_locked', suggestion: nextStep(input) };
  }

  const cleared = clearedLevels(completions, step.topic);
  if (step.kind === 'checkpoint') {
    const maxCheckpoint = Math.floor(levelCount / LEVELS_PER_CHECKPOINT);
    if (step.ref < 1 || step.ref > maxCheckpoint) return { allowed: false, reason: 'out_of_range', suggestion: nextStep(input) };
    const needed = step.ref * LEVELS_PER_CHECKPOINT;
    if (cleared < needed) {
      return { allowed: false, reason: 'level_locked', suggestion: { pathId: placement?.pathId ?? 'fullstack', topic: step.topic, kind: 'level', ref: cleared + 1 } };
    }
    return { allowed: true, reason: null, suggestion: null };
  }

  if (step.ref < 1 || step.ref > levelCount) return { allowed: false, reason: 'out_of_range', suggestion: nextStep(input) };
  if (step.ref > cleared + 1) {
    return { allowed: false, reason: 'level_locked', suggestion: { pathId: placement?.pathId ?? 'fullstack', topic: step.topic, kind: 'level', ref: cleared + 1 } };
  }
  const gate = checkpointsBefore(step.ref);
  if (gate > 0 && !checkpointPassed(completions, step.topic, gate)) {
    return { allowed: false, reason: 'checkpoint_locked', suggestion: { pathId: placement?.pathId ?? 'fullstack', topic: step.topic, kind: 'checkpoint', ref: gate } };
  }
  return { allowed: true, reason: null, suggestion: null };
}

/** The next step the learner can actually take, in plan order. */
export function nextStep(input: ProgressionInput): StepRef | null {
  const { profile, completions, levelCounts } = input;
  if (!profile) return null;
  for (const path of pathsForProfile(profile)) {
    for (let stageIndex = 0; stageIndex < path.stages.length; stageIndex += 1) {
      if (!stageOpen(path.stages, stageIndex, completions)) break;
      for (const topic of path.stages[stageIndex].topics) {
        const levelCount = levelCounts[topic];
        if (!Number.isInteger(levelCount) || levelCount <= 0) continue;
        const step = nextStepInTopic(completions, path.id, topic, levelCount);
        if (step) return step;
      }
    }
  }
  return null;
}

/* ── the shape every surface renders ─────────────────────────────────────── */

export interface TopicEligibility {
  topic: string;
  pathId: ProgressionPathId;
  stageKey: string;
  levelsPassed: number;
  levelCount: number;
  /** The next level or checkpoint in this topic, or null when it is finished. */
  nextStep: StepRef | null;
}

export interface StageEligibility {
  key: string;
  open: boolean;
  /** Authored content is still missing for this stage (#137–#139). */
  contentPending: boolean;
  topics: TopicEligibility[];
}

export interface PathEligibility {
  id: ProgressionPathId;
  kind: ProgressionPathKind;
  stages: StageEligibility[];
}

export interface EligibilityResponse {
  graphVersion: number;
  /** null until the learner has a complete, current profile. */
  profileVersion: number | null;
  /** False → the generic roadmap; true → the learner's own plan. */
  personalized: boolean;
  paths: PathEligibility[];
  /** Topics the learner may open right now, across every selected path. */
  unlockedTopics: string[];
  next: StepRef | null;
}

export function buildEligibility(input: ProgressionInput): EligibilityResponse {
  const { profile, completions, levelCounts } = input;
  if (!profile) {
    return {
      graphVersion: PROGRESSION_GRAPH_VERSION,
      profileVersion: null,
      personalized: false,
      paths: [],
      unlockedTopics: [],
      next: null,
    };
  }
  const unlocked = new Set<string>([...(completions.visibleTopics ?? []), ...UNPLACED_TOPICS]);
  // A topic can appear in more than one selected path — `dsa` sits in the
  // Fullstack track *and* in DSA Foundations. `placements()` gives its gate to
  // the first path that claims it, so the response has to draw it exactly
  // there too, or the Roadmap renders the same ladder twice and the progress
  // totals count it twice.
  const drawn = new Set<string>();
  const paths: PathEligibility[] = pathsForProfile(profile).map((path) => ({
    id: path.id,
    kind: path.kind,
    stages: path.stages.map((stage, stageIndex) => {
      const open = stageOpen(path.stages, stageIndex, completions);
      const contentPending = (path.pendingStages ?? []).includes(stage.key);
      const topics = stage.topics
        .filter((topic) => Number.isInteger(levelCounts[topic]) && levelCounts[topic] > 0)
        .filter((topic) => !drawn.has(topic))
        .map((topic): TopicEligibility => {
          drawn.add(topic);
          if (open) unlocked.add(topic);
          const levelCount = levelCounts[topic];
          return {
            topic,
            pathId: path.id,
            stageKey: stage.key,
            levelsPassed: (completions.levels[topic] ?? []).length,
            levelCount,
            nextStep: nextStepInTopic(completions, path.id, topic, levelCount),
          };
        });
      return { key: stage.key, open, contentPending, topics };
    }),
  }));
  return {
    graphVersion: PROGRESSION_GRAPH_VERSION,
    profileVersion: profile.version,
    personalized: true,
    paths,
    unlockedTopics: [...unlocked],
    next: nextStep(input),
  };
}

/* ── invariants the tests assert ─────────────────────────────────────────── */

export interface GraphProblem {
  path: ProgressionPathId;
  problem: 'cycle' | 'no-first-step' | 'empty-stage' | 'duplicate-topic';
  detail: string;
}

/**
 * The graph is a stage chain per path, so a cycle can only appear if a stage
 * repeats a topic that an earlier stage of the same path already gated. Every
 * selectable plan must also have a reachable first step.
 */
export function graphProblems(levelCounts: TopicLevelCounts): GraphProblem[] {
  const problems: GraphProblem[] = [];
  const check = (path: ProgressionPath) => {
    const seen = new Set<string>();
    path.stages.forEach((stage, index) => {
      const pending = (path.pendingStages ?? []).includes(stage.key);
      if (stage.topics.length === 0 && !pending) {
        problems.push({ path: path.id, problem: 'empty-stage', detail: stage.key });
      }
      for (const topic of stage.topics) {
        if (seen.has(topic)) {
          problems.push({ path: path.id, problem: 'duplicate-topic', detail: `${topic} repeats in ${stage.key}` });
        }
        seen.add(topic);
        if (!Number.isInteger(levelCounts[topic]) || levelCounts[topic] <= 0) {
          problems.push({ path: path.id, problem: 'cycle', detail: `${topic} in ${stage.key} has no levels` });
        }
      }
      if (index === 0 && stage.topics.length === 0 && !pending) {
        problems.push({ path: path.id, problem: 'no-first-step', detail: stage.key });
      }
    });
  };
  for (const track of ['fullstack', 'frontend', 'backend'] as BaseTrack[]) {
    check({ id: track, kind: 'base', stages: BASE_PATH_STAGES[track] });
    check(fdePathFor(track));
  }
  check({ id: 'dsa', kind: 'standalone', stages: DSA_STAGES });
  return problems;
}
