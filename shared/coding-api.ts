/** The wire contract between the coding screens and the API. Server handlers
 * in `lib/coding/handlers.ts` produce these shapes; `client/src/coding/api.ts`
 * consumes them. Answers never appear here: results, not keys. */

import type { CodingTrack, Localized, PlayableCodingTask } from './coding-catalog';
import type { CallOutcome } from './coding-evaluate';
import type { FailureCategory } from './coding-failure';
import type { PuzzleCompetency, PuzzleView } from './coding-puzzle';
import type { TypeCheckResult } from './coding-ts-check';

export type CodingOutcome = 'passed' | 'failed' | 'error' | 'timeout';
export type CodingProgressStatus = 'in_progress' | 'passed' | 'revealed';

export interface CodingTaskProgress {
  status: CodingProgressStatus;
  passes: number;
  reviewStage: number;
  nextReviewAt: string | null;
  revealCount: number;
  bestPassedAt: string | null;
}

export type CodingLockReason = 'foundations' | 'tier3' | 'tier4';

/** GET ?resource=coding-task&id=… */
export interface CodingTaskResponse {
  task: PlayableCodingTask;
  /** Sealed coding session; null when the tier is locked for this learner. */
  session: string | null;
  locked: CodingLockReason | null;
  progress: CodingTaskProgress | null;
  draft: string | null;
  /** True when the learner is signed in; anonymous visitors may run, not submit. */
  signedIn: boolean;
}

export interface CodingGardenStatus {
  status: 'committed' | 'queued' | 'skipped' | 'failed' | 'not_connected';
  url?: string;
}

/** POST ?resource=coding-submit (JavaScript, TypeScript, system design) */
export interface CodingSubmitRequest {
  /** A code-ordering submission: the puzzle's line ids in the arranged order.
   * Present instead of `code` when the learner arranged rather than typed. */
  order?: string[];
  session: string;
  /** Code tracks. */
  code?: string;
  /** System design: one entry per step or one drill answer. */
  answers?: DesignAnswer[];
  runCount?: number;
  hintsUsed?: number;
  durationMs?: number;
}

/** A guided step answer is an option index; a drill answer depends on the
 * format: option index, estimate number, or the chosen order of step indices. */
export type DesignAnswer = number | number[];

export interface CodingVerdictResponse {
  verdict: CodingOutcome;
  /** Visible tests, in task order (code tracks). */
  results: CallOutcome[];
  /** Hidden tests are reported as counts only. */
  hidden: { passed: number; total: number } | null;
  check: TypeCheckResult | null;
  logs: string[];
  codeError: string | null;
  /** System design: per step or drill, with the explanation once answered. */
  design: DesignStepVerdict[] | null;
  designReference: Localized | null;
  /** Why this attempt failed, and the authored line about that kind of
   * mistake. Null on a pass, and null when the only honest answer is "some
   * checks did not pass" — the hint ladder answers that one. It never carries
   * a hidden input, an expected value or a raw error. */
  failureHint: { category: FailureCategory; body: Localized } | null;
  /** Set when the submission was a code-ordering puzzle rather than code. It
   * carries what the arrangement established, which is narrower than a code
   * pass and never recorded as one. */
  puzzle: PuzzleVerdict | null;
  /** null for an anonymous run: nothing was recorded. */
  progress: CodingTaskProgress | null;
  firstPass: boolean;
  xpAwarded: number;
  applied: boolean;
  github: CodingGardenStatus | null;
}

export interface DesignStepVerdict {
  correct: boolean;
  /** The correct option index (or order) is revealed with the explanation. */
  correctIndex?: number;
  correctOrder?: number[];
  acceptedRange?: { min: number; max: number; answer: number };
  explanation: Localized;
}

/** POST ?resource=coding-reveal */
export interface CodingRevealRequest {
  session: string;
  /** Rungs already taken, so the give-up rule can be checked. */
  hintsUsed: number;
}
export interface CodingRevealResponse {
  /** Code for the code tracks; the reference answer for system design. */
  solution: string;
  reference: Localized | null;
  progress: CodingTaskProgress | null;
}

/** GET /api/user/[op]?op=coding-progress */
export interface CodingProgressResponse {
  tasks: Record<string, CodingTaskProgress>;
  /** Task ids due for a review, oldest first. */
  due: string[];
  /** Highest contiguous cleared `javascript` Learn level. */
  javascriptLevelsCleared: number;
  passedByTrack: Record<CodingTrack, number>;
}

/** GET/POST /api/user/[op]?op=coding-draft&id=… */
export interface CodingDraftResponse {
  code: string | null;
  updatedAt: string | null;
}

/* ── GitHub garden ─────────────────────────────────────────────────────── */

export type GithubConnectionStatus = 'pending_repo' | 'active' | 'broken';

export interface GithubConnectionResponse {
  available: boolean;
  status: GithubConnectionStatus | 'not_connected';
  accountLogin: string | null;
  repoFullName: string | null;
  defaultBranch: string | null;
  lastCommitAt: string | null;
  queued: number;
  lastError: string | null;
  repositories?: { fullName: string; defaultBranch: string; private: boolean; fork: boolean }[];
}

export interface GithubConnectStartResponse {
  url: string;
}

export interface GithubSyncResponse {
  committed: number;
  failed: number;
  remaining: number;
}

/* ── saved challenges, collections, skips and short sessions ───────────── */

/** GET/PUT /api/user/[op]?op=coding-bookmarks */
export interface CodingBookmarksResponse {
  /** Task ids the learner saved, newest first. */
  saved: string[];
  collections: CodingCollection[];
}

export interface CodingCollection {
  collectionId: string;
  name: string;
  position: number;
  taskIds: string[];
}

export type CodingBookmarkRequest =
  | { op: 'save'; taskId: string; saved: boolean }
  | { op: 'collection-upsert'; collectionId?: string; name: string; position?: number }
  | { op: 'collection-delete'; collectionId: string }
  | { op: 'collection-item'; collectionId: string; taskId: string; present: boolean };

/** Why a learner passed on a task. Recorded, never rewarded: a required task
 * that was skipped stays required and unlocks nothing. */
export const SKIP_REASONS = ['too-easy', 'too-hard', 'missing-prerequisite', 'unclear', 'later'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];
export const isSkipReason = (value: unknown): value is SkipReason =>
  typeof value === 'string' && (SKIP_REASONS as readonly string[]).includes(value);

/** POST /api/user/[op]?op=coding-skip */
export interface CodingSkipRequest {
  taskId: string;
  reason: SkipReason;
  /** Optional, short and about the task. */
  note?: string;
}

export interface CodingSkipResponse {
  recorded: boolean;
  /** Another eligible task to try instead, when one exists. */
  next: string | null;
  /** True when the task is required by the learner's plan, so it will return. */
  required: boolean;
}

/** The session lengths offered. Estimates, and labelled as such. */
export const PRACTICE_SESSION_MINUTES = [5, 10, 20] as const;
export type PracticeSessionMinutes = (typeof PRACTICE_SESSION_MINUTES)[number];
export const isPracticeSessionMinutes = (value: unknown): value is PracticeSessionMinutes =>
  typeof value === 'number' && (PRACTICE_SESSION_MINUTES as readonly number[]).includes(value);

/** GET/POST/PUT /api/user/[op]?op=practice-session */
export interface PracticeSession {
  sessionId: string;
  minutes: PracticeSessionMinutes;
  topic: string | null;
  /** Task ids the server chose, in order. Every one was already eligible. */
  queue: string[];
  position: number;
  status: 'active' | 'finished' | 'abandoned';
  /** The sum of the queue's estimated minutes. An estimate, not a promise. */
  estimatedMinutes: number;
}

export interface PracticeSessionResponse {
  session: PracticeSession | null;
}

export interface PracticeSessionStartRequest {
  minutes: PracticeSessionMinutes;
  /** Restrict the queue to one topic, or leave it out for the whole plan. */
  topic?: string;
}

export interface PracticeSessionAdvanceRequest {
  sessionId: string;
  position?: number;
  status?: 'finished' | 'abandoned';
}

/* ── curated approach comparisons ─────────────────────────────────────── */

export interface CuratedApproachView {
  name: Localized;
  code: string;
  readability: Localized;
  time: string;
  space: string;
  assumptions: Localized;
  tradeoffs: Localized;
}

/** GET ?resource=coding-approaches&id=…
 *
 * Two or three original solutions to the same task, with what each costs, what
 * it assumes and what it gives up. Served only when the learner's own recorded
 * evidence says they passed: a revealed solution after giving up is a different
 * thing and does not open this. An empty list means nothing is authored for
 * this task yet, and the client shows no tab rather than an empty one. */
export interface CodingApproachesResponse {
  taskId: string;
  approaches: CuratedApproachView[];
}

/** The result of arranging a puzzle. `accepted` says the order is one the
 * author accepts; `competencies` and `claim` say exactly what that shows, so
 * nobody reads it as having written the code. */
export interface PuzzleVerdict {
  accepted: boolean;
  competencies: PuzzleCompetency[];
  claim: Localized;
}

/** The puzzle a task offers, if it has one. Present on the task payload so a
 * narrow screen can decide what to mount without a second request; the accepted
 * orders stay on the server. */
export type CodingPuzzleView = PuzzleView;
