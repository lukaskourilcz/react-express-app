/** The wire contract between the coding screens and the API. Server handlers
 * in `lib/coding/handlers.ts` produce these shapes; `client/src/coding/api.ts`
 * consumes them. Answers never appear here: results, not keys. */

import type { CodingTrack, PlayableCodingTask } from './coding-catalog';
import type { CallOutcome } from './coding-evaluate';
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
  designReference: string | null;
  progress: CodingTaskProgress;
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
  explanation: string;
}

/** POST ?resource=coding-report (React: the browser harness result) */
export interface CodingReportRequest {
  session: string;
  code: string;
  passed: boolean;
  cases: { name: string; status: 'pass' | 'fail'; error: string | null }[];
  runCount?: number;
  hintsUsed?: number;
  durationMs?: number;
}

/** POST ?resource=coding-reveal */
export interface CodingRevealRequest {
  session: string;
  /** Rungs already taken, so the give-up rule can be checked. */
  hintsUsed: number;
}
export interface CodingRevealResponse {
  solution: string;
  progress: CodingTaskProgress;
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
