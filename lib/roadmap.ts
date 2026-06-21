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

export type RoadmapTopic =
  | 'javascript' | 'typescript' | 'react' | 'nextjs' | 'nodejs'
  | 'html' | 'css' | 'git' | 'dsa' | 'algorithms'
  | 'abbreviations' | 'general' | 'ai' | 'rhf-zod' | 'cool-stuff'
  | 'databases' | 'system-design' | 'testing' | 'devops' | 'security';

export const ROADMAP_TOPICS: RoadmapTopic[] = [
  'javascript', 'typescript', 'react', 'nextjs', 'nodejs',
  'html', 'css', 'git', 'dsa', 'algorithms',
  'abbreviations', 'general', 'ai', 'rhf-zod', 'cool-stuff',
  'databases', 'system-design', 'testing', 'devops', 'security',
];

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
  nextjs: 'rm-next',
  nodejs: 'rm-node',
  html: 'rm-html',
  css: 'rm-css',
  git: 'rm-git',
  dsa: 'rm-dsa',
  algorithms: 'rm-algorithms',
  abbreviations: 'rm-abbr',
  general: 'rm-general',
  ai: 'rm-ai',
  'rhf-zod': 'rm-rhf',
  'cool-stuff': 'rm-cool',
  databases: 'rm-db',
  'system-design': 'rm-sysdesign',
  testing: 'rm-testing',
  devops: 'rm-devops',
  security: 'rm-security',
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
  nextjs: [
    'Next.js Basics', 'Routing (App Router)', 'Pages & Layouts', 'Navigation & Links', 'Server & Client Components',
    'Data Fetching', 'Dynamic Routes', 'Rendering Strategies', 'Route Handlers', 'Server Actions',
    'Metadata & SEO', 'Styling', 'Images & Fonts', 'Loading & Errors', 'Middleware & Config',
  ],
  nodejs: [
    'Node Basics', 'Modules (CommonJS)', 'ES Modules', 'Globals & process', 'The Event Loop',
    'Path', 'File System', 'OS & Util', 'Events', 'Streams',
    'Buffers', 'HTTP Server', 'Callbacks & Promisify', 'Async / Await', 'Environment & CLI',
    'npm & package.json', 'Error Handling', 'Timers & Scheduling', 'Child Processes', 'Crypto',
    'Express: Basics', 'Express: Req & Res', 'Concurrency', 'Testing & Debugging', 'Mixed Mastery',
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
  dsa: [
    'Complexity Basics', 'Big-O Notation', 'Arrays', 'Strings', 'Hash Tables',
    'Stacks', 'Queues', 'Linked Lists', 'Recursion', 'Sorting Algorithms',
    'Searching Algorithms', 'Trees', 'Binary Search Trees', 'Heaps & Priority Queues', 'Graphs',
  ],
  algorithms: [
    'Ratios & Proportions', 'Modular Arithmetic', 'Combinatorics', 'Probability', 'Prime Numbers & Divisibility',
    'Algebraic Thinking', 'Bitwise Logic', 'Logic Puzzles', 'Recurrences & Growth', 'Problem Solving',
  ],
  abbreviations: [
    'Languages & Runtimes', 'Web Standards', 'APIs & Data Formats', 'Frontend Rendering', 'Build & Tooling',
    'Version Control & Workflow', 'Auth & Security', 'Networking', 'Databases & Storage', 'Cloud & Infra',
    'Architecture Patterns', 'Performance Metrics', 'Testing & Quality', 'DevOps & Containers', 'Acronym Mastery',
  ],
  general: [
    'How the Web Works', 'Clients & Servers', 'HTTP Methods', 'HTTP Status Codes', 'URLs & Routing',
    'How Browsers Render', 'How Code Runs', 'How Frameworks Work', 'Frontend vs Backend', 'APIs & Communication',
    'Caching & CDNs', 'Authentication Basics', 'Databases Overview', 'Deployment & Hosting', 'Performance & Optimization',
  ],
  ai: [
    'What is AI?', 'Machine Learning Basics', 'Neural Networks', 'What is an LLM?', 'Tokens & Tokenization',
    'Training Data & Datasets', 'Transformers & Attention', 'Prompting Basics', 'Context Windows', 'Embeddings & Vectors',
    'Sampling & Temperature', 'Hallucinations & Limitations', 'Fine-tuning & RAG', 'Using AI APIs', 'Chat Assistants & System Prompts',
    'Multimodal Models', 'AI Safety & Alignment', 'Bias & Ethics', 'AI Agents & Tool Use', 'The Modern AI Landscape',
  ],
  'rhf-zod': [
    'Forms in React', 'useForm & register', 'handleSubmit & onSubmit', 'formState & Errors', 'Built-in Validation Rules',
    'Zod: Primitives & parse', 'Zod: Objects & infer', 'Zod: safeParse & Errors', 'Zod: Refinements & Coercion', 'Connecting Zod (zodResolver)',
    'Controller & Controlled Inputs', 'watch, setValue & reset', 'useFieldArray', 'Zod: Refine, Unions & Transform', 'Integration & Mastery',
  ],
  'cool-stuff': [
    'JavaScript: Birth & Names', 'JavaScript: Weird Parts', 'Birth of the Web', 'Internet Firsts', 'Famous Software Disasters',
    'The Original Bug', 'Worms, Viruses & Spam', 'Programming Pioneers', 'Language Naming & Lore', 'Esoteric Languages',
    'Mascots, Logos & Symbols', 'Hardware Marvels & Oddities', 'Gaming & Easter Eggs', 'Bizarre Tech Tales', 'Tech Trivia Mastery',
  ],
  databases: [
    'What is a Database?', 'Relational Basics', 'SQL SELECT Basics', 'Filtering & Sorting', 'Aggregations & GROUP BY',
    'Joins', 'Schema Design & Normalization', 'Keys & Constraints', 'Data Types & NULL', 'Indexing',
    'Transactions & ACID', 'Isolation & Locking', 'The N+1 Problem', 'NoSQL & When to Use It', 'Performance & Scaling',
  ],
  'system-design': [
    'System Design Basics', 'Client–Server & APIs', 'Scaling: Vertical vs Horizontal', 'Load Balancing', 'Caching',
    'Databases at Scale', 'Sharding & Partitioning', 'Message Queues & Async', 'Consistency & CAP', 'Rate Limiting',
    'CDNs & Edge', 'Failure Modes & Resilience', 'Observability & Monitoring', 'Trade-offs & Estimation', 'Designing Real Systems',
  ],
  testing: [
    'Why Test?', 'The Testing Pyramid', 'Unit Tests', 'Assertions & Matchers', 'Test Structure (AAA)',
    'Mocks, Stubs & Spies', 'Integration Tests', 'End-to-End Tests', 'Testing Async Code', 'Test Doubles & Fakes',
    'Coverage & What to Test', 'TDD', 'Flaky Tests & Isolation', 'Testing in CI', 'Testing Best Practices',
  ],
  devops: [
    'What is DevOps?', 'Version Control & Git Flow', 'CI Basics', 'CD & Deployment', 'Build Pipelines',
    'Containers & Docker', 'Container Orchestration', 'Infrastructure as Code', 'Cloud Fundamentals', 'Deploying to the Cloud',
    'Environments & Config', 'Observability & Logging', 'Monitoring & Alerting', 'Secrets & Security in CI', 'Reliability & SRE',
  ],
  security: [
    'Security Fundamentals', 'Authentication', 'Authorization', 'Passwords & Hashing', 'Sessions & Tokens (JWT)',
    'HTTPS & TLS', 'Injection (SQLi)', 'XSS', 'CSRF', 'OWASP Top 10',
    'Secrets Management', 'Secure Defaults & Headers', 'Dependency & Supply Chain', 'Data Protection & Privacy', 'Secure Design & Threat Modeling',
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

/* ──── dynamic ("live") structure ───────────────────────────────────────────
 * The functions above describe the *authored* path (a fixed N levels × 8). The
 * live quiz, however, lets the owner hide questions from /dev, and the path must
 * re-sync: with fewer surviving questions a topic has fewer levels, and those
 * levels get repacked and re-graded by position. The builders below take a
 * predicate for which question ids still exist (i.e. aren't soft-deleted) and
 * recompute everything from the surviving set, so deleting a question in /dev
 * automatically shrinks/relevels the learning path. The static functions are
 * kept for the build scripts (mobile offline snapshot, integrity checks), which
 * always want the full authored set.
 * ─────────────────────────────────────────────────────────────────────────── */

/** All authored question ids for a topic, in canonical order (ignoring deletes). */
export function topicAllQuestionIds(topic: RoadmapTopic): string[] {
  const max = topicLevelCount(topic) * QUESTIONS_PER_LEVEL;
  const prefix = ID_PREFIX[topic];
  return Array.from({ length: max }, (_, i) => `${prefix}-${i + 1}`);
}

export interface LiveTopic {
  levels: RoadmapLevelMeta[];
  checkpoints: RoadmapCheckpointMeta[];
  /** levelIds[level - 1] = the surviving question ids packed into that level. */
  levelIds: string[][];
}

/** Recompute a topic's levels/checkpoints from the questions that still exist. */
export function buildLiveTopic(topic: RoadmapTopic, exists: (id: string) => boolean): LiveTopic {
  const surviving = topicAllQuestionIds(topic).filter(exists);
  const levelCount = Math.min(
    topicLevelCount(topic),
    Math.ceil(surviving.length / QUESTIONS_PER_LEVEL),
  );
  const titles = LEVEL_TITLES[topic];

  const levels: RoadmapLevelMeta[] = [];
  const levelIds: string[][] = [];
  for (let l = 1; l <= levelCount; l++) {
    const chunk = surviving.slice((l - 1) * QUESTIONS_PER_LEVEL, l * QUESTIONS_PER_LEVEL);
    levelIds.push(chunk);
    levels.push({
      level: l,
      title: titles[l - 1],
      difficulty: difficultyForLevel(l),
      questionCount: chunk.length,
    });
  }

  const checkpointCount = Math.floor(levelCount / LEVELS_PER_CHECKPOINT);
  const checkpoints: RoadmapCheckpointMeta[] = [];
  for (let n = 1; n <= checkpointCount; n++) {
    const afterLevel = n * LEVELS_PER_CHECKPOINT;
    let questionCount = 0;
    for (let l = afterLevel - LEVELS_PER_CHECKPOINT + 1; l <= afterLevel; l++) {
      questionCount += levelIds[l - 1].length;
    }
    checkpoints.push({
      checkpoint: n,
      title: n === checkpointCount ? FINAL_CHECKPOINT_TITLE : CHECKPOINT_TITLES[n - 1] ?? `Checkpoint ${n}`,
      afterLevel,
      questionCount,
      passPct: CHECKPOINT_PASS,
    });
  }
  return { levels, checkpoints, levelIds };
}

/** The full live structure for every topic, given the surviving-id predicate. */
export function liveRoadmapStructure(
  exists: (id: string) => boolean,
): Record<RoadmapTopic, RoadmapTopicStructure> {
  const out = {} as Record<RoadmapTopic, RoadmapTopicStructure>;
  for (const topic of ROADMAP_TOPICS) {
    const live = buildLiveTopic(topic, exists);
    out[topic] = { levels: live.levels, checkpoints: live.checkpoints };
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
