/**
 * One-time import of interview-prepper progress into devShark coding progress.
 *
 *   npm run import:interview-prepper -- --input export.json --user-id <supabase user id> [--apply]
 *
 * Without `--apply` the script only reports what it would write.
 *
 * Input: one JSON file with the Firestore `progress/{uid}` document and its
 * `attempts` subcollection, in either shape:
 *
 *   { "done": { "<legacyId>": true }, "points": 12, "attempts": [ ... ] }
 *   { "progress": { "done": { ... } }, "attempts": [ ... ] }
 *
 * Each attempt is the document interview-prepper saved: `id`, `challengeId`,
 * `track`, `startedAt` (ms since epoch), `durationSec`, `result`
 * (`clean` | `assisted` | `failed` | `revealed` | `skipped`), `hintTiersUsed`.
 * The localStorage keys are not needed; the drafts and the AI coach history
 * are not imported.
 *
 * What lands in Supabase (service role, direct writes):
 *   - `coding_attempts`: one row per attempt whose challenge maps to a task,
 *     keyed `legacy:<attempt id>` so re-running the script changes nothing.
 *   - `coding_progress`: one `passed` row per done challenge, with no review
 *     scheduled and no XP: XP is only ever awarded for verdicts the server
 *     graded, and the review ladder starts with the first pass in devShark.
 *
 * Environment: `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and
 * `SUPABASE_SERVICE_ROLE_KEY`, read only when `--apply` is given.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { codingTaskByLegacyId, codingTaskById } from '../lib/coding/catalog';
import type { CodingTrack } from '../shared/coding-catalog';

interface LegacyAttempt {
  id?: unknown;
  challengeId?: unknown;
  startedAt?: unknown;
  durationSec?: unknown;
  result?: unknown;
  hintTiersUsed?: unknown;
}

interface AttemptRow {
  attempt_id: string;
  user_id: string;
  task_id: string;
  track: CodingTrack;
  outcome: 'passed' | 'failed' | 'revealed';
  verified: false;
  duration_ms: number | null;
  hints_used: number;
  created_at: string;
}

interface ProgressRow {
  user_id: string;
  task_id: string;
  track: CodingTrack;
  status: 'passed';
  verified: false;
  passes: number;
  clean_passes: 0;
  review_stage: 0;
  next_review_at: null;
  reveal_count: number;
  best_passed_at: string;
  updated_at: string;
}

const OUTCOME: Record<string, AttemptRow['outcome'] | null> = {
  clean: 'passed',
  assisted: 'passed',
  failed: 'failed',
  revealed: 'revealed',
  skipped: null,
};

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : null;
}

function timestamp(value: unknown, fallback: string): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return new Date(value).toISOString();
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  if (value && typeof value === 'object') {
    const seconds = (value as { _seconds?: unknown; seconds?: unknown })._seconds ?? (value as { seconds?: unknown }).seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000).toISOString();
  }
  return fallback;
}

/** Task lookup: the old ids first, then the new ids for an export that already uses them. */
function resolveTask(legacyId: string) {
  return codingTaskByLegacyId(legacyId) ?? codingTaskById(legacyId);
}

function main(): { attempts: AttemptRow[]; progress: ProgressRow[]; unknown: string[]; skipped: number; userId: string; apply: boolean } {
  const input = option('--input');
  const userId = option('--user-id');
  const apply = process.argv.includes('--apply');
  if (!input || !userId) {
    console.error('Usage: npm run import:interview-prepper -- --input export.json --user-id <id> [--apply]');
    process.exit(2);
  }
  if (userId.length < 8 || userId.length > 128) {
    console.error('The user id must be the Supabase user id (8 to 128 characters).');
    process.exit(2);
  }

  const raw = JSON.parse(readFileSync(input, 'utf8')) as Record<string, unknown>;
  const progressDoc = (raw.progress && typeof raw.progress === 'object' ? raw.progress : raw) as Record<string, unknown>;
  const done = (progressDoc.done && typeof progressDoc.done === 'object' ? progressDoc.done : {}) as Record<string, unknown>;
  const attemptsRaw = Array.isArray(raw.attempts) ? (raw.attempts as LegacyAttempt[]) : [];
  const now = new Date().toISOString();
  const docUpdated = timestamp(progressDoc.updatedAt, now);

  const unknown = new Set<string>();
  let skipped = 0;
  const attempts: AttemptRow[] = [];
  const passedAt = new Map<string, string>();
  const passCount = new Map<string, number>();
  const revealCount = new Map<string, number>();

  for (const attempt of attemptsRaw) {
    const legacyId = typeof attempt.challengeId === 'string' ? attempt.challengeId : '';
    const task = legacyId ? resolveTask(legacyId) : undefined;
    if (!task) {
      if (legacyId) unknown.add(legacyId);
      skipped++;
      continue;
    }
    const outcome = OUTCOME[typeof attempt.result === 'string' ? attempt.result : ''] ?? null;
    if (!outcome) {
      skipped++;
      continue;
    }
    const rawId = typeof attempt.id === 'string' && attempt.id ? attempt.id : `${legacyId}-${String(attempt.startedAt ?? '')}`;
    const attemptId = `legacy:${rawId.replace(/[^A-Za-z0-9:_-]/g, '-')}`.slice(0, 128).padEnd(8, '0');
    const createdAt = timestamp(attempt.startedAt, docUpdated);
    const seconds = typeof attempt.durationSec === 'number' && Number.isFinite(attempt.durationSec) ? Math.max(0, attempt.durationSec) : null;
    attempts.push({
      attempt_id: attemptId,
      user_id: userId,
      task_id: task.id,
      track: task.track,
      outcome,
      verified: false,
      duration_ms: seconds === null ? null : Math.min(86_400_000, Math.round(seconds * 1000)),
      hints_used: Math.min(20, Math.max(0, Number(attempt.hintTiersUsed) || 0)),
      created_at: createdAt,
    });
    if (outcome === 'passed') {
      passCount.set(task.id, (passCount.get(task.id) ?? 0) + 1);
      const earliest = passedAt.get(task.id);
      if (!earliest || createdAt < earliest) passedAt.set(task.id, createdAt);
    }
    if (outcome === 'revealed') revealCount.set(task.id, (revealCount.get(task.id) ?? 0) + 1);
  }

  const progress: ProgressRow[] = [];
  for (const [legacyId, flag] of Object.entries(done)) {
    if (!flag) continue;
    const task = resolveTask(legacyId);
    if (!task) {
      unknown.add(legacyId);
      continue;
    }
    progress.push({
      user_id: userId,
      task_id: task.id,
      track: task.track,
      status: 'passed',
      verified: false,
      passes: Math.max(1, passCount.get(task.id) ?? 0),
      clean_passes: 0,
      review_stage: 0,
      next_review_at: null,
      reveal_count: revealCount.get(task.id) ?? 0,
      best_passed_at: passedAt.get(task.id) ?? docUpdated,
      updated_at: now,
    });
  }

  return { attempts, progress, unknown: [...unknown].sort(), skipped, userId, apply };
}

async function write(plan: ReturnType<typeof main>): Promise<void> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --apply.');
    process.exit(2);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Never downgrade progress the learner has already made in devShark.
  const existing = await supabase.from('coding_progress').select('task_id,status').eq('user_id', plan.userId);
  if (existing.error) throw new Error(`Could not read coding_progress: ${existing.error.message}`);
  const alreadyPassed = new Set((existing.data ?? []).filter((row) => row.status === 'passed').map((row) => row.task_id as string));
  const progressRows = plan.progress.filter((row) => !alreadyPassed.has(row.task_id));

  for (let index = 0; index < plan.attempts.length; index += 200) {
    const chunk = plan.attempts.slice(index, index + 200);
    const result = await supabase.from('coding_attempts').upsert(chunk, { onConflict: 'attempt_id', ignoreDuplicates: true });
    if (result.error) throw new Error(`Could not write coding_attempts: ${result.error.message}`);
  }
  if (progressRows.length > 0) {
    const result = await supabase.from('coding_progress').upsert(progressRows, { onConflict: 'user_id,task_id' });
    if (result.error) throw new Error(`Could not write coding_progress: ${result.error.message}`);
  }
  console.log(`Wrote ${plan.attempts.length} attempts and ${progressRows.length} progress rows (${plan.progress.length - progressRows.length} already passed in devShark).`);
}

const plan = main();
console.log(`Mapped ${plan.progress.length} passed tasks and ${plan.attempts.length} attempts; skipped ${plan.skipped} attempts.`);
if (plan.unknown.length > 0) console.log(`No devShark task for: ${plan.unknown.join(', ')}`);
if (plan.apply) {
  write(plan).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
} else {
  console.log('Dry run. Add --apply to write these rows.');
}
