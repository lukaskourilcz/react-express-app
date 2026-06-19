// Roadmap ("Learn") structure — the single source of truth for the Duolingo-style
// learning path. Each topic has 25 ordered levels (easiest → hardest) with 8
// questions each, plus a checkpoint after every 5 levels. A checkpoint is a big
// 40-question exam over those 5 levels; the learner must score CHECKPOINT_PASS%
// to unlock the next segment of levels.
//
// The /api/quiz/roadmap endpoint reads this to build the level map and serve a
// level's or checkpoint's questions; the client renders the path from the same
// structure (fetched at runtime) so titles never drift out of sync.

import { QUESTIONS_PER_LEVEL, ROADMAP_LEVELS, difficultyForLevel } from './roadmap-build';

export type RoadmapTopic = 'javascript' | 'typescript' | 'react';

export const ROADMAP_TOPICS: RoadmapTopic[] = ['javascript', 'typescript', 'react'];

// Pass thresholds (percent). Levels are gentle; checkpoints are the real gate.
export const LEVEL_PASS = 75;
export const CHECKPOINT_PASS = 85;

// A checkpoint sits after every Nth level.
export const LEVELS_PER_CHECKPOINT = 5;
export const CHECKPOINT_COUNT = ROADMAP_LEVELS / LEVELS_PER_CHECKPOINT; // 5

// Id prefix used by each topic's question seeds (see lib/roadmap-questions-*.ts).
const ID_PREFIX: Record<RoadmapTopic, string> = {
  javascript: 'rm-js',
  typescript: 'rm-ts',
  react: 'rm-react',
};

// 25 level titles per topic, in increasing difficulty. Index 0 is level 1.
const LEVEL_TITLES: Record<RoadmapTopic, string[]> = {
  javascript: [
    'Values & Math', 'Strings', 'Booleans & Comparison', 'Arrays: Basics', 'Objects: Basics',
    'Array Iteration', 'Filter & Find', 'Reduce', 'Destructuring', 'Spread & Rest',
    'Functions & Scope', 'Closures', 'Hoisting & let/const', 'this & Context', 'Callbacks & HOFs',
    'Ternary & Short-circuit', 'Type Coercion', 'Truthy / Falsy', 'JSON & Objects', 'Optional & Nullish',
    'Promises', 'Async / Await', 'Sets & Maps', 'Edge Cases & Gotchas', 'Mixed Mastery',
  ],
  typescript: [
    'Basic Types', 'Type Inference', 'Function Types', 'Arrays & Tuples', 'Object Types',
    'Interfaces', 'Union Types', 'Literal Types', 'Optional & Readonly', 'Type Aliases',
    'Type Narrowing', 'Type Guards', 'Enums', 'Generics: Basics', 'Generic Constraints',
    'keyof & typeof', 'Indexed Access', 'Partial & Required', 'Pick & Omit', 'Record',
    'Mapped Types', 'Conditional Types', 'infer', 'Template Literals', 'Mixed Mastery',
  ],
  react: [
    'JSX Basics', 'Components', 'Props', 'Rendering Lists', 'Conditional Rendering',
    'useState: Basics', 'Event Handling', 'Updating State', 'State: Objects & Arrays', 'Derived State',
    'useEffect: Basics', 'Effect Dependencies', 'Cleanup Functions', 'useRef', 'Forms & Inputs',
    'Lifting State Up', 'useMemo', 'useCallback', 'useReducer', 'useContext',
    'Custom Hooks', 'Keys & Reconciliation', 'Performance Patterns', 'Common Pitfalls', 'Mixed Mastery',
  ],
};

// Short, thematic names for the five checkpoints (shared across topics).
const CHECKPOINT_TITLES = [
  'Foundations Exam',
  'Core Skills Exam',
  'Intermediate Exam',
  'Advanced Exam',
  'Final Mastery Exam',
];

export interface RoadmapLevelMeta {
  /** 1-based level number. */
  level: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionCount: number;
}

export interface RoadmapCheckpointMeta {
  /** 1-based checkpoint number (1..5). */
  checkpoint: number;
  title: string;
  /** The level this checkpoint sits after (5, 10, 15, 20, 25). */
  afterLevel: number;
  questionCount: number;
  passPct: number;
}

export interface RoadmapTopicStructure {
  levels: RoadmapLevelMeta[];
  checkpoints: RoadmapCheckpointMeta[];
}

/** The question ids that make up a given topic/level (1-based level). */
export function levelQuestionIds(topic: RoadmapTopic, level: number): string[] {
  const start = (level - 1) * QUESTIONS_PER_LEVEL + 1;
  return Array.from({ length: QUESTIONS_PER_LEVEL }, (_, i) => `${ID_PREFIX[topic]}-${start + i}`);
}

/** The 40 question ids for a checkpoint: every question in its 5 levels. */
export function checkpointQuestionIds(topic: RoadmapTopic, checkpoint: number): string[] {
  const firstLevel = (checkpoint - 1) * LEVELS_PER_CHECKPOINT + 1;
  const ids: string[] = [];
  for (let lvl = firstLevel; lvl < firstLevel + LEVELS_PER_CHECKPOINT; lvl++) {
    ids.push(...levelQuestionIds(topic, lvl));
  }
  return ids;
}

/** Level metadata for one topic (titles, difficulty, count) — the path to render. */
export function topicLevels(topic: RoadmapTopic): RoadmapLevelMeta[] {
  return LEVEL_TITLES[topic].map((title, i) => ({
    level: i + 1,
    title,
    difficulty: difficultyForLevel(i + 1),
    questionCount: QUESTIONS_PER_LEVEL,
  }));
}

/** Checkpoint metadata for one topic. */
export function topicCheckpoints(topic: RoadmapTopic): RoadmapCheckpointMeta[] {
  return Array.from({ length: CHECKPOINT_COUNT }, (_, i) => ({
    checkpoint: i + 1,
    title: CHECKPOINT_TITLES[i] ?? `Checkpoint ${i + 1}`,
    afterLevel: (i + 1) * LEVELS_PER_CHECKPOINT,
    questionCount: QUESTIONS_PER_LEVEL * LEVELS_PER_CHECKPOINT, // 40
    passPct: CHECKPOINT_PASS,
  }));
}

/** Full structure (every topic → its levels + checkpoints), sent to the client. */
export function roadmapStructure(): Record<RoadmapTopic, RoadmapTopicStructure> {
  const out = {} as Record<RoadmapTopic, RoadmapTopicStructure>;
  for (const topic of ROADMAP_TOPICS) {
    out[topic] = { levels: topicLevels(topic), checkpoints: topicCheckpoints(topic) };
  }
  return out;
}

export function isRoadmapTopic(value: unknown): value is RoadmapTopic {
  return typeof value === 'string' && (ROADMAP_TOPICS as string[]).includes(value);
}

export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= ROADMAP_LEVELS;
}

export function isValidCheckpoint(checkpoint: number): boolean {
  return Number.isInteger(checkpoint) && checkpoint >= 1 && checkpoint <= CHECKPOINT_COUNT;
}

export { ROADMAP_LEVELS, QUESTIONS_PER_LEVEL };
