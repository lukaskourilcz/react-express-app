// Roadmap ("Learn") structure — the single source of truth for the Duolingo-style
// learning path. Each topic has a series of ordered levels (easiest → hardest)
// with 8 questions each, plus a checkpoint after every 5 levels. A checkpoint is
// a big 40-question exam over those 5 levels; the learner must score
// CHECKPOINT_PASS% to unlock the next segment of levels.
//
// Topics can have different lengths: JS/TS/React run 25 levels (5 checkpoints),
// while Git runs 15 levels (3 checkpoints). Everything below derives per-topic
// counts from the level-title arrays, so adding a topic only means adding titles
// and its question seeds.
//
// The /api/quiz/roadmap endpoint reads this to build the level map and serve a
// level's or checkpoint's questions; the client renders the path from the same
// structure (fetched at runtime) so titles never drift out of sync.

import { QUESTIONS_PER_LEVEL, ROADMAP_LEVELS, difficultyForLevel } from './roadmap-build';

export type RoadmapTopic = 'javascript' | 'typescript' | 'react' | 'html' | 'css' | 'git';

export const ROADMAP_TOPICS: RoadmapTopic[] = ['javascript', 'typescript', 'react', 'html', 'css', 'git'];

// Pass thresholds (percent). Levels are gentle; checkpoints are the real gate.
export const LEVEL_PASS = 75;
export const CHECKPOINT_PASS = 85;

// A checkpoint sits after every Nth level.
export const LEVELS_PER_CHECKPOINT = 5;
// Upper bound on checkpoints across all topics (the longest topic is 25 levels).
// Used as a permissive validation bound; per-topic counts come from the helpers.
export const CHECKPOINT_COUNT = ROADMAP_LEVELS / LEVELS_PER_CHECKPOINT; // 5

// Id prefix used by each topic's question seeds (see lib/roadmap-questions-*.ts).
const ID_PREFIX: Record<RoadmapTopic, string> = {
  javascript: 'rm-js',
  typescript: 'rm-ts',
  react: 'rm-react',
  html: 'rm-html',
  css: 'rm-css',
  git: 'rm-git',
};

// Level titles per topic, in increasing difficulty. Index 0 is level 1. The
// length of each array defines how many levels the topic has.
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
  git: [
    'Version Control Basics', 'Repositories', 'Staging & Status', 'Committing', 'History & Diffs',
    'Branches', 'Merging', 'Remotes', 'Push & Pull', 'Undoing Changes',
    'Stashing', 'Rebasing', 'Tags & .gitignore', 'Collaboration & PRs', 'Advanced Git',
  ],
  html: [
    'HTML Basics', 'Document Structure', 'Text Elements', 'Links & Images', 'Lists',
    'Attributes', 'Forms: Inputs', 'Forms: Controls', 'Tables', 'Semantic HTML',
    'Media', 'Metadata & Head', 'Accessibility', 'Entities & Special', 'Advanced HTML',
  ],
  css: [
    'CSS Basics', 'Selectors', 'Combinators & Specificity', 'Colors & Units', 'Box Model',
    'Text & Fonts', 'Backgrounds & Borders', 'Display & Visibility', 'Positioning', 'Flexbox',
    'Grid', 'Pseudo-classes', 'Transitions & Transforms', 'Responsive Design', 'Advanced CSS',
  ],
};

// Names for the early checkpoints; the final checkpoint of any topic is always
// the "Final Mastery Exam".
const CHECKPOINT_TITLES = ['Foundations Exam', 'Core Skills Exam', 'Intermediate Exam', 'Advanced Exam'];
const FINAL_CHECKPOINT_TITLE = 'Final Mastery Exam';

export interface RoadmapLevelMeta {
  /** 1-based level number. */
  level: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionCount: number;
}

export interface RoadmapCheckpointMeta {
  /** 1-based checkpoint number. */
  checkpoint: number;
  title: string;
  /** The level this checkpoint sits after (5, 10, 15, …). */
  afterLevel: number;
  questionCount: number;
  passPct: number;
}

export interface RoadmapTopicStructure {
  levels: RoadmapLevelMeta[];
  checkpoints: RoadmapCheckpointMeta[];
}

/** How many levels a topic has. */
export function topicLevelCount(topic: RoadmapTopic): number {
  return LEVEL_TITLES[topic].length;
}

/** How many checkpoints a topic has (one per 5 levels). */
export function topicCheckpointCount(topic: RoadmapTopic): number {
  return Math.floor(topicLevelCount(topic) / LEVELS_PER_CHECKPOINT);
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
  const count = topicCheckpointCount(topic);
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      checkpoint: n,
      title: n === count ? FINAL_CHECKPOINT_TITLE : CHECKPOINT_TITLES[i] ?? `Checkpoint ${n}`,
      afterLevel: n * LEVELS_PER_CHECKPOINT,
      questionCount: QUESTIONS_PER_LEVEL * LEVELS_PER_CHECKPOINT, // 40
      passPct: CHECKPOINT_PASS,
    };
  });
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

export function isValidLevel(topic: RoadmapTopic, level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= topicLevelCount(topic);
}

export function isValidCheckpoint(topic: RoadmapTopic, checkpoint: number): boolean {
  return Number.isInteger(checkpoint) && checkpoint >= 1 && checkpoint <= topicCheckpointCount(topic);
}

export { ROADMAP_LEVELS, QUESTIONS_PER_LEVEL };
