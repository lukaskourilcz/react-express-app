import { apiFetch } from './api';
import { withAttestation } from './turnstile';
import type { Question } from '../types/quiz';
import { getSubject, categoriesForSubject } from './subjects';

// Biggest Shark Challenge client. All resources live on one Vercel function
// (to stay within the 12-function Hobby limit), differentiated by method +
// `?resource=`:
//   GET  /api/quiz/challenge                       → fresh batch of mixed questions
//   GET  /api/quiz/challenge?resource=leaderboard  → top-10 + current champion
//   POST /api/quiz/challenge                       → submit a finished run's score

export interface ChallengeBatch {
  sessionId: string;
  runToken: string;
  questions: Question[];
}

export interface ChallengeScore {
  id: string;
  name: string;
  score: number;
  createdAt: string;
}

export interface ChallengeLeaderboard {
  top: ChallengeScore[];
  champion: ChallengeScore | null;
}

export function fetchChallengeBatch(opts: { exclude?: string[]; lang?: string; runToken?: string; ranked?: boolean; assessment?: boolean } = {}): Promise<ChallengeBatch> {
  const params = new URLSearchParams();
  if (opts.exclude && opts.exclude.length > 0) {
    // Cap the exclude payload — the server caps too, but no need to send more.
    params.set('exclude', opts.exclude.slice(0, 400).join(','));
  }
  if (opts.lang) params.set('lang', opts.lang);
  if (opts.runToken) params.set('runToken', opts.runToken);
  if (opts.ranked === false) params.set('ranked', '0');
  if (opts.assessment) params.set('resource', 'assessment');
  // Scope the challenge mix to the active subject so a Geography challenge never
  // surfaces a Chess question.
  params.set('categories', categoriesForSubject(getSubject()).join(','));
  const qs = params.toString();
  return apiFetch<ChallengeBatch>(`/api/quiz/challenge${qs ? `?${qs}` : ''}`);
}

export function getChallengeLeaderboard(): Promise<ChallengeLeaderboard> {
  const params = new URLSearchParams({
    resource: 'leaderboard',
    categories: categoriesForSubject(getSubject()).join(','),
  });
  return apiFetch<ChallengeLeaderboard>(`/api/quiz/challenge?${params}`);
}

// The one request in this file that writes to the Hall of Fame, and so the one
// that carries an attestation. Unconfigured deployments send the same body they
// always did.
export async function submitChallengeScore(input: { name: string; runToken: string; proofs: string[] }): Promise<{ ok: true; record: ChallengeScore | null }> {
  return apiFetch<{ ok: true; record: ChallengeScore | null }>('/api/quiz/challenge', {
    method: 'POST',
    body: JSON.stringify(await withAttestation('challenge-score', { ...input })),
  });
}

export function completeChallengeRun(input: { runToken: string; proofs: string[] }): Promise<{ ok: true; awarded: boolean; score: number; xp?: number }> {
  return apiFetch('/api/quiz/challenge?resource=complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/* ── Puzzle sprint ────────────────────────────────────────────────────────
 * The same run, on one three-minute clock. `startedAt` and `durationMs` come
 * from the server and are rendered, never set: the browser has no say in when
 * the run started or when it ends. */

export interface SprintBatch extends ChallengeBatch {
  /** Server time the run started, echoed on every top-up of the same run. */
  startedAt: number;
  durationMs: number;
}

export interface SprintResult {
  ok: true;
  score: number;
  wrong: number;
  longestCombo: number;
  bonusMs: number;
  awarded: boolean;
  xp: number;
  record: ChallengeScore | null;
  /** Present when the board could not take the row, though the run still counted. */
  boardError?: 'migration_required' | 'leaderboard_unavailable';
}

export function fetchSprintBatch(opts: { exclude?: string[]; lang?: string; runToken?: string } = {}): Promise<SprintBatch> {
  const params = new URLSearchParams({ resource: 'sprint' });
  if (opts.exclude && opts.exclude.length > 0) params.set('exclude', opts.exclude.slice(0, 400).join(','));
  if (opts.lang) params.set('lang', opts.lang);
  if (opts.runToken) params.set('runToken', opts.runToken);
  params.set('categories', categoriesForSubject(getSubject()).join(','));
  return apiFetch<SprintBatch>(`/api/quiz/challenge?${params}`);
}

export function getSprintLeaderboard(): Promise<ChallengeLeaderboard> {
  const params = new URLSearchParams({
    resource: 'sprint-board',
    categories: categoriesForSubject(getSubject()).join(','),
  });
  return apiFetch<ChallengeLeaderboard>(`/api/quiz/challenge?${params}`);
}

export async function completeSprintRun(input: { runToken: string; proofs: string[]; name?: string }): Promise<SprintResult> {
  return apiFetch('/api/quiz/challenge?resource=sprint-complete', {
    method: 'POST',
    body: JSON.stringify(await withAttestation('challenge-score', { ...input })),
  });
}
