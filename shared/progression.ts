/** The progression graph: which topics a learner's plan contains, in what
 * order they open, and which level of a topic may be served next.
 *
 * One graph, shared by the browser and the server. The browser renders it; the
 * server enforces it. Before this module the graph lived only in
 * `client/src/lib/roadmap.ts`, which meant a direct URL could ask the API for a
 * level the map would never have offered — the API issued it and only refused
 * at completion. The rules now live here, and both sides read the same ones.
 *
 * Two inputs decide eligibility, and only these two:
 *
 *   1. the versioned learner profile (`LearnerProfile`) — which plan they chose;
 *   2. server-verified completions — what they actually passed.
 *
 * Nothing else counts. A local unlock flag, a self-reported experience level, a
 * diagnostic result and a bookmark are all advisory: they may reorder what we
 * recommend, and they never open a level. Account-level topic grants and the
 * verified skill-check are the one documented exception, and they arrive as
 * `extraUnlocked` from the server's own record, never from a request body.
 *
 * Keep this module pure: no storage, no network, no clock. */

import type { BaseTrack, LearnerProfile, SkillPathId } from './learning-paths';
import { SUBJECT_SCOPE_CATALOG } from './subject-catalog';

/* ── verified progress ─────────────────────────────────────────────────── */

/** One level's or checkpoint's record. Structurally what both the browser's
 * `RoadmapProgress` and the server's stored progress blob already hold, so
 * neither side has to convert before asking a question. */
export interface ProgressEntry {
  passed?: boolean;
  bestPct?: number;
}
export interface TopicProgressLike {
  levels?: Record<string, ProgressEntry>;
  checkpoints?: Record<string, ProgressEntry>;
}
export type VerifiedProgress = Record<string, TopicProgressLike | undefined>;

const entryPassed = (entry: ProgressEntry | undefined): boolean => entry?.passed === true;

/** True when that exact level is recorded as passed. */
export const isLevelPassed = (progress: VerifiedProgress, topic: string, level: number): boolean =>
  entryPassed(progress[topic]?.levels?.[String(level)]);

/** How many of a topic's levels are passed. This is the measure the unlock
 * rule has always used, so an account with an unusual record — an old part
 * test, a level order that predates a curriculum edit — keeps the topics it
 * had rather than having them close behind it. */
export function passedLevelCount(progress: VerifiedProgress, topic: string): number {
  const levels = progress[topic]?.levels;
  if (!levels) return 0;
  let count = 0;
  for (const entry of Object.values(levels)) if (entryPassed(entry)) count++;
  return count;
}

/** The first level of a topic the learner has not passed, counting from 1 and
 * stopping at the first gap. This is "where am I", which is not the same
 * question as "how much have I done": a gap means the next step is the gap. */
export function firstUnfinishedLevel(progress: VerifiedProgress, topic: string): number {
  const levels = progress[topic]?.levels;
  if (!levels) return 1;
  let level = 1;
  while (entryPassed(levels[String(level)])) level++;
  return level;
}

/* ── the topic graph ───────────────────────────────────────────────────── */

/** Topics that need nothing before them. Every subject has at least one, which
 * is what makes every valid selection reachable from a standing start. */
export const STARTER_TOPICS: readonly string[] = [
  'html', 'css', 'javascript',
  'continents', 'capitals', 'flags',
  'arithmetic', 'fractions', 'prealgebra',
  'prehistory', 'ancient', 'classical',
  'openings',
  'cell-biology',
  'positions',
];

/** Levels of each prerequisite topic that must be passed before the topic that
 * depends on it opens. Five is the first checkpoint — the natural milestone. */
export const LEVELS_TO_UNLOCK_NEXT = 5;

/** Topic → the topics whose first checkpoint must be cleared first.
 *
 * Deliberately shallow, so the route from nothing to a real skill stays legible:
 * the language first, then the page-building trio for React, then the topics
 * that build on Node. Every entry must be acyclic and every topic must trace
 * back to a starter — `validateProgressionGraph` proves both. */
export const TOPIC_PREREQS: Record<string, readonly string[]> = {
  // Web — starters
  html: [],
  css: [],
  javascript: [],
  // Web — build directly on the language
  typescript: ['javascript'],
  abbreviations: ['javascript'],
  general: ['javascript'],
  git: ['javascript'],
  dsa: ['javascript'],
  algorithms: ['javascript'],
  nodejs: ['javascript'],
  testing: ['javascript'],
  ai: ['javascript'],
  'cool-stuff': ['javascript'],
  security: ['javascript'],
  // Web — React needs the page-building trio
  react: ['javascript', 'html', 'css'],
  nextjs: ['react'],
  databases: ['nodejs'],
  'system-design': ['nodejs'],
  devops: ['nodejs'],
  // Geography
  continents: [],
  capitals: [],
  flags: [],
  landforms: ['continents'],
  climate: ['continents'],
  cartography: ['continents'],
  population: ['capitals'],
  political: ['capitals'],
  economic: ['population'],
  earth: ['landforms'],
  geomorphology: ['landforms'],
  oceanography: ['earth'],
  biogeography: ['climate'],
  geopolitics: ['political'],
  gis: ['cartography'],
  // Math
  arithmetic: [],
  fractions: [],
  prealgebra: [],
  algebra: ['prealgebra'],
  geometry: ['prealgebra'],
  statistics: ['fractions'],
  trigonometry: ['geometry', 'algebra'],
  precalculus: ['algebra'],
  calculus: ['precalculus', 'trigonometry'],
  'linear-algebra': ['algebra'],
  'discrete-math': ['algebra'],
  'number-theory': ['algebra'],
  'multivariable-calculus': ['calculus'],
  'differential-equations': ['calculus'],
  'real-analysis': ['calculus'],
  // History
  prehistory: [],
  ancient: [],
  classical: [],
  medieval: ['classical'],
  renaissance: ['medieval'],
  earlymodern: ['renaissance'],
  industrial: ['earlymodern'],
  worldwars: ['industrial'],
  coldwar: ['worldwars'],
  modern: ['coldwar'],
  historiography: ['ancient'],
  'history-of-science': ['renaissance'],
  'economic-history': ['industrial'],
  'intellectual-history': ['classical'],
  'military-history': ['classical'],
  // Biology
  'cell-biology': [],
  'skeletal-system': ['cell-biology'],
  'muscular-system': ['skeletal-system'],
  'nervous-system': ['cell-biology'],
  'endocrine-system': ['nervous-system'],
  'cardiovascular-system': ['cell-biology'],
  'respiratory-system': ['cardiovascular-system'],
  'digestive-system': ['cell-biology'],
  'immune-system': ['cell-biology'],
  'reproductive-system': ['endocrine-system'],
  // Chess
  openings: [],
  tactics: [],
  endgames: [],
  strategy: ['openings', 'tactics'],
  combinations: ['tactics'],
  'opening-theory': ['openings'],
  middlegame: ['strategy'],
  'pawn-structures': ['strategy'],
  'endgame-technique': ['endgames'],
  'chess-history': [],
  // Poker
  positions: [],
  'starting-hands': ['positions'],
  'pot-odds': ['positions'],
  'betting-strategy': ['starting-hands'],
  postflop: ['betting-strategy'],
  'tournament-play': ['betting-strategy'],
  psychology: ['positions'],
  'gto-advanced': ['pot-odds'],
};

/** Every prerequisite of `topic` has cleared its first checkpoint. */
export function topicPrereqsMet(progress: VerifiedProgress, topic: string): boolean {
  const prereqs = TOPIC_PREREQS[topic] ?? [];
  return prereqs.every((prereq) => passedLevelCount(progress, prereq) >= LEVELS_TO_UNLOCK_NEXT);
}

/**
 * A topic is open when it is a starter, when the server granted it (a verified
 * skill-check or an account grant — never a client flag), or when its
 * prerequisites are met.
 */
export function isTopicUnlocked(
  progress: VerifiedProgress,
  topic: string,
  extraUnlocked: readonly string[] | ReadonlySet<string> = [],
): boolean {
  if (STARTER_TOPICS.includes(topic)) return true;
  const granted = extraUnlocked instanceof Set ? extraUnlocked : new Set(extraUnlocked as readonly string[]);
  if (granted.has(topic)) return true;
  return topicPrereqsMet(progress, topic);
}

/** Checkpoints sit after every fifth level and gate the next segment. */
export const LEVELS_PER_CHECKPOINT = 5;

export const isCheckpointPassed = (progress: VerifiedProgress, topic: string, checkpoint: number): boolean =>
  entryPassed(progress[topic]?.checkpoints?.[String(checkpoint)]);

/**
 * Level 1 is always the way in. The first level of a new segment (6, 11, 16,
 * 21) needs that segment's checkpoint exam passed; every other level needs the
 * one before it.
 *
 * This is the rule the roadmap map has always drawn, and it is at least as
 * strict as the verified-completion routine's — so a level the server agrees to
 * serve is a level the learner can also finish, and a level the map hides is
 * one the API refuses.
 */
export function isLevelUnlocked(progress: VerifiedProgress, topic: string, level: number): boolean {
  if (!Number.isInteger(level) || level < 1) return false;
  if (level === 1) return true;
  if (level % LEVELS_PER_CHECKPOINT === 1) {
    return isCheckpointPassed(progress, topic, (level - 1) / LEVELS_PER_CHECKPOINT);
  }
  return isLevelPassed(progress, topic, level - 1);
}

/** A checkpoint opens once the last level of its segment is passed, which by
 * the rule above means all five are. */
export const isCheckpointUnlocked = (progress: VerifiedProgress, topic: string, checkpoint: number): boolean =>
  isLevelPassed(progress, topic, checkpoint * LEVELS_PER_CHECKPOINT);

/** A checkpoint needs every level it examines. */
/** A step a learner can ask the server for. */
export type ProgressStep =
  | { kind: 'level'; level: number }
  | { kind: 'checkpoint'; checkpoint: number }
  | { kind: 'test'; from: number; to: number };

/**
 * Whether this exact step is already on the learner's record as passed.
 *
 * The server serves such a step whatever the current plan says, because editing
 * a plan narrows what is offered next and must never withdraw what was earned:
 * a learner who passed Next.js levels on the frontend track and then moved to
 * backend would otherwise be told those very levels are not part of the plan
 * they chose.
 *
 * A part test is deliberately never "already passed" here. What gates one is
 * passing the levels it spans, not a record of having sat it, so it keeps the
 * ordinary prerequisite check.
 */
export function stepAlreadyPassed(
  progress: VerifiedProgress,
  topic: string,
  step: ProgressStep,
): boolean {
  if (step.kind === 'level') return isLevelPassed(progress, topic, step.level);
  if (step.kind === 'checkpoint') return isCheckpointPassed(progress, topic, step.checkpoint);
  return false;
}

export function areLevelsPassed(progress: VerifiedProgress, topic: string, from: number, to: number): boolean {
  for (let level = from; level <= to; level++) if (!isLevelPassed(progress, topic, level)) return false;
  return true;
}

/* ── the plan ──────────────────────────────────────────────────────────── */

/** The devShark plan for each base track, as ordered stages.
 *
 * This is the topic membership only — the stage titles are translation keys and
 * stay in `client/src/lib/tracks.ts`, which reads these lists so the two cannot
 * drift. Frontend and Fullstack carry the browser (HTML and CSS) in full;
 * Backend gets the narrow web-foundations bridge it actually needs rather than
 * the whole styling curriculum.
 *
 * TypeScript has a stage to itself, and a late one. It used to sit second, one
 * step after a learner's first JavaScript — which put a type system in front of
 * people who had not yet written enough code for one to help. It is a large
 * topic and it pays off against real components and real handlers, so it comes
 * after them now: after the React stack on Frontend, after the server and its
 * data on Backend, after both on Fullstack. A stage of its own rather than a
 * seat in a crowded one, because its size is the point.
 *
 * The hard prerequisite is unchanged and stays `javascript` alone. Order and
 * dependency are different questions: this list is the recommended order, and
 * moving a topic later here never withdraws a level anyone already passed. */
export const WEBDEV_PLAN_STAGES: Record<BaseTrack, readonly (readonly string[])[]> = {
  frontend: [
    ['html', 'css', 'javascript'],
    ['git'],
    ['react', 'nextjs'],
    ['typescript'],
    ['general', 'dsa', 'ai'],
  ],
  backend: [
    ['javascript', 'git'],
    ['nodejs', 'general'],
    ['databases', 'dsa', 'algorithms'],
    ['typescript'],
    ['system-design', 'devops', 'security', 'ai'],
  ],
  fullstack: [
    ['html', 'css', 'javascript'],
    ['git'],
    ['react', 'nextjs'],
    ['nodejs', 'general', 'databases'],
    ['typescript'],
    ['dsa', 'algorithms'],
    ['system-design', 'devops', 'security', 'ai'],
  ],
};

/** Topics a role specialization needs on top of the base track. A frontend
 * learner who chose FDE still has to meet the data and service work the
 * specialization is built on — the specialization does not route around it. */
export const SPECIALIZATION_BRIDGE_TOPICS: Record<string, readonly string[]> = {
  fde: ['nodejs', 'databases', 'general', 'ai', 'security'],
};

/** Topics a skill path leans on. DSA Foundations is entered directly, so this
 * is small on purpose: it names what the path assumes, not a gate in front of
 * it. The path's own modules run under their own sequential rules. */
export const SKILL_PATH_BRIDGE_TOPICS: Record<SkillPathId, readonly string[]> = {
  'dsa-foundations': ['javascript', 'dsa', 'algorithms'],
};

/** Ordered topics of a learner's plan: the base track's stages, then whatever
 * the chosen specialization and skill paths add, in first-seen order and
 * without repeats. */
export function planTopics(profile: LearnerProfile | null): string[] {
  if (!profile) return [];
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (topic: string) => {
    if (seen.has(topic)) return;
    seen.add(topic);
    ordered.push(topic);
  };
  for (const stage of WEBDEV_PLAN_STAGES[profile.baseTrack] ?? []) for (const topic of stage) push(topic);
  if (profile.specialization) for (const topic of SPECIALIZATION_BRIDGE_TOPICS[profile.specialization] ?? []) push(topic);
  for (const path of profile.skillPaths) for (const topic of SKILL_PATH_BRIDGE_TOPICS[path] ?? []) push(topic);
  return ordered;
}

/** Only devShark has plans. StudyShark's subjects keep every topic they own,
 * so the plan filter has to know when not to apply. */
export const PLANNED_SUBJECT = 'webdev';
export const subjectHasPlans = (subject: string): boolean => subject === PLANNED_SUBJECT;

/**
 * Is this topic part of what the learner chose?
 *
 * A learner with no profile, or an incomplete one, has no plan yet: everything
 * their subject owns stays available, which is the general roadmap the product
 * has always shown. Once a plan exists, topics outside it are not offered —
 * they are not "locked" so much as not chosen, and #153 hides them rather than
 * dangling them.
 */
export function isTopicInPlan(profile: LearnerProfile | null, subject: string, topic: string): boolean {
  if (!subjectHasPlans(subject)) return true;
  const topics = planTopics(profile);
  if (topics.length === 0) return true;
  return topics.includes(topic);
}

/** Topics of the plan that are both chosen and open right now. */
export function eligibleTopics(
  profile: LearnerProfile | null,
  subject: string,
  progress: VerifiedProgress,
  extraUnlocked: readonly string[] = [],
): string[] {
  const inPlan = subjectHasPlans(subject) && planTopics(profile).length > 0
    ? planTopics(profile)
    : [...(SUBJECT_SCOPE_CATALOG[subject as keyof typeof SUBJECT_SCOPE_CATALOG]?.topics ?? [])];
  return inPlan.filter((topic) => isTopicUnlocked(progress, topic, extraUnlocked));
}

/** The single next thing to do: the earliest unfinished level of the earliest
 * open topic in the plan. `levelCount` reports how many levels a topic
 * actually has, so a finished topic is skipped rather than pointing past its
 * end. Returns null when the plan holds nothing left to start. */
export function nextEligibleStep(
  profile: LearnerProfile | null,
  subject: string,
  progress: VerifiedProgress,
  levelCount: (topic: string) => number,
  extraUnlocked: readonly string[] = [],
): { topic: string; level: number } | null {
  for (const topic of eligibleTopics(profile, subject, progress, extraUnlocked)) {
    const total = levelCount(topic);
    if (total <= 0) continue;
    const next = firstUnfinishedLevel(progress, topic);
    if (next <= total) return { topic, level: next };
  }
  return null;
}

/* ── graph validation ──────────────────────────────────────────────────── */

export interface GraphProblem {
  kind: 'missing' | 'cycle' | 'unreachable' | 'unknown-plan-topic';
  topic: string;
  detail?: string;
}

/**
 * Prove the graph is usable: every topic declares prerequisites, no cycle
 * exists, every topic traces back to a starter, and every plan names topics
 * the subject actually owns. Run from the launch-contract test, so a curriculum
 * edit that strands a learner fails before it ships rather than after.
 */
export function validateProgressionGraph(allTopics: readonly string[]): GraphProblem[] {
  const problems: GraphProblem[] = [];
  const known = new Set(allTopics);

  for (const topic of allTopics) {
    if (!(topic in TOPIC_PREREQS)) problems.push({ kind: 'missing', topic });
  }
  for (const [topic, prereqs] of Object.entries(TOPIC_PREREQS)) {
    for (const prereq of prereqs) {
      if (!known.has(prereq)) problems.push({ kind: 'missing', topic, detail: `unknown prerequisite ${prereq}` });
    }
  }

  // Depth-first search with a colour per node: grey means "on the current
  // stack", so meeting a grey node is a cycle.
  const colour = new Map<string, 'grey' | 'black'>();
  const visit = (topic: string, trail: string[]): boolean => {
    const seen = colour.get(topic);
    if (seen === 'black') return true;
    if (seen === 'grey') {
      problems.push({ kind: 'cycle', topic, detail: [...trail, topic].join(' → ') });
      return false;
    }
    colour.set(topic, 'grey');
    let ok = true;
    for (const prereq of TOPIC_PREREQS[topic] ?? []) {
      if (!visit(prereq, [...trail, topic])) ok = false;
    }
    colour.set(topic, 'black');
    return ok;
  };
  for (const topic of Object.keys(TOPIC_PREREQS)) visit(topic, []);

  // Reachability: a topic is reachable when it is a starter or every
  // prerequisite is reachable. A cycle already reported above is skipped here
  // so one fault does not produce a second, confusing report.
  const reachable = new Map<string, boolean>();
  const canReach = (topic: string, stack: Set<string>): boolean => {
    const cached = reachable.get(topic);
    if (cached !== undefined) return cached;
    if (stack.has(topic)) return false;
    // A starter, or anything that declares no prerequisite at all, needs
    // nothing before it and is reachable from a standing start.
    if (STARTER_TOPICS.includes(topic) || (TOPIC_PREREQS[topic]?.length ?? 0) === 0) {
      reachable.set(topic, true);
      return true;
    }
    stack.add(topic);
    const prereqs = TOPIC_PREREQS[topic] ?? [];
    const ok = prereqs.every((prereq) => canReach(prereq, stack));
    stack.delete(topic);
    reachable.set(topic, ok);
    return ok;
  };
  const cyclic = new Set(problems.filter((p) => p.kind === 'cycle').map((p) => p.topic));
  for (const topic of allTopics) {
    if (cyclic.has(topic)) continue;
    if (!canReach(topic, new Set())) problems.push({ kind: 'unreachable', topic });
  }

  const webdevTopics = new Set<string>(SUBJECT_SCOPE_CATALOG.webdev.topics);
  for (const [track, stages] of Object.entries(WEBDEV_PLAN_STAGES)) {
    for (const stage of stages) {
      for (const topic of stage) {
        if (!webdevTopics.has(topic)) problems.push({ kind: 'unknown-plan-topic', topic, detail: track });
      }
    }
  }
  for (const [role, topics] of Object.entries(SPECIALIZATION_BRIDGE_TOPICS)) {
    for (const topic of topics) {
      if (!webdevTopics.has(topic)) problems.push({ kind: 'unknown-plan-topic', topic, detail: role });
    }
  }
  for (const [path, topics] of Object.entries(SKILL_PATH_BRIDGE_TOPICS)) {
    for (const topic of topics) {
      if (!webdevTopics.has(topic)) problems.push({ kind: 'unknown-plan-topic', topic, detail: path });
    }
  }

  return problems;
}

/** Every plan must have a first step a learner with nothing passed can take. */
export function everyPlanHasAFirstStep(): GraphProblem[] {
  const problems: GraphProblem[] = [];
  for (const track of Object.keys(WEBDEV_PLAN_STAGES) as BaseTrack[]) {
    const first = (WEBDEV_PLAN_STAGES[track][0] ?? []).find((topic) => STARTER_TOPICS.includes(topic));
    if (!first) problems.push({ kind: 'unreachable', topic: track, detail: 'plan has no starter topic' });
  }
  return problems;
}
