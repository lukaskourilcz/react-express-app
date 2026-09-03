/** Pure coding-challenge catalogue data shared by browser and server code.
 *
 * Task bodies (prompts, starters, tests, hints) live under `lib/coding/tasks`
 * and reach the browser only through the API. Reference solutions and hidden
 * tests live under `lib/coding/solutions` and never leave the server. This
 * module owns the types, the track and tier vocabulary, the technique index,
 * XP amounts, the difficulty ladder, the badge ids, and the GitHub garden path
 * rules, so every surface computes them the same way. */

export type CodingTrack = 'javascript' | 'typescript' | 'react' | 'system-design';
export type CodingTier = 1 | 2 | 3 | 4 | 5;
export type CodingVerify = 'tests' | 'checklist' | 'guided' | 'drill';

export interface Localized {
  en: string;
  cs: string;
}
export interface LocalizedList {
  en: string[];
  cs: string[];
}

export const CODING_TRACKS: readonly CodingTrack[] = ['javascript', 'typescript', 'react', 'system-design'];
export const isCodingTrack = (value: unknown): value is CodingTrack =>
  typeof value === 'string' && (CODING_TRACKS as readonly string[]).includes(value);

/** Tier ids, used as translation-key suffixes (`coding.tier.<id>`). */
export const CODING_TIERS: Record<CodingTier, string> = {
  1: 'foundations',
  2: 'fluency',
  3: 'combine',
  4: 'interview',
  5: 'capstone',
};
export const isCodingTier = (value: unknown): value is CodingTier =>
  value === 1 || value === 2 || value === 3 || value === 4 || value === 5;

/** One runtime assertion: `call` is evaluated against the learner's code and
 * compared with `expected` by deep equality. Async calls are awaited. */
export interface CallTest {
  call: string;
  expected: unknown;
  label?: Localized;
  edge?: boolean;
  async?: boolean;
}

/** One TypeScript type-level assertion, appended as a single line. A line marked
 * `rejects` passes only when the compiler refuses it. */
export interface TypeTest {
  code: string;
  label?: Localized;
  rejects?: boolean;
}

export interface CodingApiNote {
  method: string;
  url: string;
  note: Localized;
}

/** A guided system-design walkthrough: five questions in interview order. */
export interface GuidedDesignStep {
  key: string;
  title: Localized;
  prompt: Localized;
  options: Localized[];
  /** Index into `options`. Server-only in playable payloads. */
  correct: number;
  explanation: Localized;
}
export interface GuidedDesign {
  scenario: Localized;
  brief: Localized;
  steps: GuidedDesignStep[];
  /** The whole answer said out loud; shown after the walkthrough. */
  reference: Localized;
  passMark: number;
}

export type DesignDrillFormat = 'estimate' | 'tradeoff' | 'bottleneck' | 'sequence';
export interface DesignDrill {
  format: DesignDrillFormat;
  scenario: Localized;
  prompt: Localized;
  explanation: Localized;
  /** estimate */
  unit?: Localized;
  answer?: number;
  min?: number;
  max?: number;
  /** tradeoff / bottleneck */
  options?: Localized[];
  correct?: number;
  /** sequence: steps in the correct order */
  steps?: Localized[];
}

export interface CodingTask {
  /** Stable slug with the track prefix: `js-double-numbers`, `ts-typed-slug`,
   * `react-counter`, `sd-url-shortener`, `dd-qps-basic`. */
  id: string;
  /** interview-prepper id (`j12`, `t3`, `r7`, `c2`, `s1`, `d4`) for the progress import. */
  legacyId?: string;
  track: CodingTrack;
  /** Learn topic the task belongs to; system design tasks carry no Learn level. */
  topic: 'javascript' | 'typescript' | 'react' | 'system-design';
  /** Learn level 1–25 (index into LEVEL_TITLES). 0 for system design. */
  level: number;
  tier: CodingTier;
  /** Technique tags from CODING_TECHNIQUES. */
  focus: string[];
  title: Localized;
  prompt: Localized;
  starter: string;
  skeleton?: string;
  hints: LocalizedList;
  approach?: LocalizedList;
  verify: CodingVerify;
  tests?: CallTest[];
  typeTests?: TypeTest[];
  /** React: Testing Library suite source for `/App.test.js`. */
  suite?: string;
  /** React checklist tasks: what the learner confirms before submitting. */
  checklist?: LocalizedList;
  api?: CodingApiNote;
  design?: GuidedDesign;
  drill?: DesignDrill;
  estimatedMinutes: number;
}

/** What the section list needs: no bodies, no tests. Generated into
 * `shared/coding-index.ts` from the task files. */
export interface CodingTaskSummary {
  id: string;
  track: CodingTrack;
  level: number;
  tier: CodingTier;
  focus: string[];
  title: Localized;
  verify: CodingVerify;
  estimatedMinutes: number;
}

/** What the browser receives to play a task: everything except the answers. */
export interface PlayableCodingTask extends CodingTaskSummary {
  legacyId?: string;
  prompt: Localized;
  starter: string;
  skeleton?: string;
  hints: LocalizedList;
  approach?: LocalizedList;
  tests?: CallTest[];
  typeTests?: TypeTest[];
  suite?: string;
  checklist?: LocalizedList;
  api?: CodingApiNote;
  design?: {
    scenario: Localized;
    brief: Localized;
    passMark: number;
    steps: { key: string; title: Localized; prompt: Localized; options: Localized[] }[];
  };
  drill?: {
    format: DesignDrillFormat;
    scenario: Localized;
    prompt: Localized;
    unit?: Localized;
    options?: Localized[];
    steps?: Localized[];
  };
}

/** The technique index shown on the Coding home. Ids double as `focus` tags
 * and as translation-key suffixes (`coding.focus.<id>`). */
export const CODING_TECHNIQUE_GROUPS = {
  loops: ['for', 'while', 'do-while', 'for-of', 'for-in', 'nested-loops', 'two-pointer'],
  'array-methods': ['map', 'filter', 'reduce', 'find', 'findIndex', 'some', 'every', 'includes', 'indexOf', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'sort', 'flat', 'forEach', 'concat', 'join'],
  strings: ['strings', 'split', 'regex'],
  objects: ['objects', 'destructuring', 'spread', 'map-set', 'json'],
  functions: ['functions', 'closures', 'higher-order', 'recursion', 'callbacks'],
  async: ['promises', 'async-await', 'timers', 'fetch', 'abort'],
  types: ['annotations', 'interfaces', 'unions', 'literal-types', 'tuples', 'optional', 'readonly', 'narrowing', 'type-guards', 'generics', 'constraints', 'keyof', 'utility-types', 'record'],
  hooks: ['useState', 'useEffect', 'useRef', 'useReducer', 'useContext', 'useMemo', 'custom-hook', 'effect-cleanup'],
  rendering: ['jsx', 'lists-keys', 'conditional', 'forms', 'events', 'derived-state', 'accessibility', 'pagination'],
  design: ['estimation', 'tradeoff', 'bottleneck', 'sequence', 'scoping', 'data-model', 'request-flow', 'failure', 'scale', 'caching', 'queues', 'auth', 'networking'],
} as const;
export type CodingTechniqueGroup = keyof typeof CODING_TECHNIQUE_GROUPS;
export const CODING_TECHNIQUES: readonly string[] = Object.values(CODING_TECHNIQUE_GROUPS).flat();
const TECHNIQUE_GROUP = new Map<string, CodingTechniqueGroup>();
for (const [group, tags] of Object.entries(CODING_TECHNIQUE_GROUPS)) {
  for (const tag of tags) TECHNIQUE_GROUP.set(tag, group as CodingTechniqueGroup);
}
export const techniqueGroup = (tag: string): CodingTechniqueGroup | undefined => TECHNIQUE_GROUP.get(tag);
export const isCodingTechnique = (tag: string): boolean => TECHNIQUE_GROUP.has(tag);

/** Loop and array-method tags the confidence badges count. */
export const LOOP_TAGS: readonly string[] = CODING_TECHNIQUE_GROUPS.loops;
export const METHOD_TAGS: readonly string[] = CODING_TECHNIQUE_GROUPS['array-methods'];

/** XP for a first verified pass, by tier. Level XP in Learn is 50 × difficulty,
 * so a foundation task is worth half a level. */
export const CODING_TASK_XP: Record<CodingTier, number> = { 1: 25, 2: 35, 3: 50, 4: 75, 5: 120 };

/** The review ladder: a passed task comes back after these gaps, and two
 * clean passes in separate sittings retire it. */
export const CODING_REVIEW_STEPS_HOURS = [4, 24, 48] as const;
export const CODING_REVIEW_CLEAN_PASSES = 2;

/** Learn levels of the `javascript` topic that count as the foundations. */
export const CODING_FOUNDATION_LEVELS = 10;

export interface CodingProgressSummary {
  /** Passed task ids (revealed tasks are not passed). */
  passed: ReadonlySet<string>;
}

export interface CodingLadderInput {
  track: CodingTrack;
  tier: CodingTier;
  progress: CodingProgressSummary;
  /** Task summaries for the same track, to count what each tier holds. */
  tasks: readonly CodingTaskSummary[];
  /** Highest contiguous cleared `javascript` Learn level (0 when none). */
  javascriptLevelsCleared: number;
}

const tierPassRatio = (tier: CodingTier, input: CodingLadderInput): number => {
  const inTier = input.tasks.filter((task) => task.track === input.track && task.tier === tier);
  if (inTier.length === 0) return 0;
  const passed = inTier.filter((task) => input.progress.passed.has(task.id)).length;
  return passed / inTier.length;
};

/** The difficulty ladder. Tiers 1 and 2 are always open; 3 opens after the
 * Learn foundations or a clean sweep of tiers 1–2 in that track; 4 after 80 %
 * of tier 3; 5 (React capstones) after 80 % of tier 4. System design has no
 * ladder: every drill and walkthrough is open. */
export function tierUnlocked(input: CodingLadderInput): boolean {
  if (input.track === 'system-design') return true;
  switch (input.tier) {
    case 1:
    case 2:
      return true;
    case 3:
      return input.javascriptLevelsCleared >= CODING_FOUNDATION_LEVELS ||
        (tierPassRatio(1, input) >= 1 && tierPassRatio(2, input) >= 1);
    case 4:
      return tierPassRatio(3, input) >= 0.8;
    case 5:
      return input.track === 'react' && tierPassRatio(4, input) >= 0.8;
    default:
      return false;
  }
}

/** Why a tier is locked, as a translation-key suffix (`coding.lock.<reason>`). */
export function tierLockReason(input: CodingLadderInput): 'foundations' | 'tier3' | 'tier4' | null {
  if (tierUnlocked(input)) return null;
  if (input.tier === 3) return 'foundations';
  if (input.tier === 4) return 'tier3';
  return 'tier4';
}

/** Cosmetic badge ids for the coding tracks (labels in the i18n tables). */
export const CODING_BADGE_IDS = ['loop-shark', 'method-shark', 'typed-shark', 'hooked-shark', 'capstone-shark'] as const;
export type CodingBadgeId = (typeof CODING_BADGE_IDS)[number];

/** The badge conditions, computed from passed task ids and the task index. */
export function eligibleCodingBadges(passed: ReadonlySet<string>, tasks: readonly CodingTaskSummary[]): CodingBadgeId[] {
  const allPassed = (subset: CodingTaskSummary[]) => subset.length > 0 && subset.every((task) => passed.has(task.id));
  const withTag = (tags: readonly string[]) => (task: CodingTaskSummary) => task.focus.some((tag) => tags.includes(tag));
  const earned: CodingBadgeId[] = [];
  if (allPassed(tasks.filter((t) => t.track === 'javascript' && t.tier <= 2 && withTag(LOOP_TAGS)(t)))) earned.push('loop-shark');
  if (allPassed(tasks.filter((t) => t.track === 'javascript' && t.tier <= 2 && withTag(METHOD_TAGS)(t)))) earned.push('method-shark');
  if (allPassed(tasks.filter((t) => t.track === 'typescript' && t.tier <= 3))) earned.push('typed-shark');
  if (allPassed(tasks.filter((t) => t.track === 'react' && t.tier <= 3))) earned.push('hooked-shark');
  if (allPassed(tasks.filter((t) => t.track === 'react' && t.tier === 5))) earned.push('capstone-shark');
  return earned;
}

/* ──── GitHub garden paths ─────────────────────────────────────────────── */

const TRACK_PREFIX: Record<CodingTrack, string[]> = {
  javascript: ['js-'],
  typescript: ['ts-'],
  react: ['react-'],
  'system-design': ['sd-', 'dd-'],
};
const TRACK_EXTENSION: Record<CodingTrack, string> = {
  javascript: 'js',
  typescript: 'ts',
  react: 'jsx',
  'system-design': 'md',
};

/** `javascript/04-queue-with-push-shift.js`: one folder per track, one file per task. */
export function gardenPathFor(task: Pick<CodingTaskSummary, 'id' | 'track' | 'level'>): string {
  const prefix = TRACK_PREFIX[task.track].find((p) => task.id.startsWith(p)) ?? '';
  const slug = task.id.slice(prefix.length);
  const order = String(Math.max(0, Math.min(99, task.level))).padStart(2, '0');
  return `${task.track}/${order}-${slug}.${TRACK_EXTENSION[task.track]}`;
}

export const isCodingTaskId = (value: unknown): value is string =>
  typeof value === 'string' && /^(js|ts|react|sd|dd)-[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length <= 64;
