// Biggest Shark Challenge leaderboard store.
//
// Persists finished runs to `challenge_scores`. Reads return the global top
// 10 plus a "champion" pointer used by the home-page badge. Falls back to an
// empty list if Supabase isn't configured or the table hasn't been migrated
// yet. Callers decide whether a read may degrade; writes never report success
// unless the row was actually persisted.

import { createServiceClient, withTimeout } from './http';

const supabase = createServiceClient();
const TABLE = 'challenge_scores';

export interface ChallengeScore {
  id: string;
  name: string;
  score: number;
  createdAt: string;
  userId: string | null;
}

export interface ChallengeLeaderboard {
  top: ChallengeScore[];
  champion: ChallengeScore | null;
}

export class ChallengeStoreError extends Error {}

const MAX_NAME = 40;
const MAX_SCORE = 100_000;

function rowToScore(row: Record<string, unknown>): ChallengeScore {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    score: typeof row.score === 'number' ? row.score : Number(row.score) || 0,
    createdAt: String(row.created_at ?? ''),
    userId: typeof row.user_id === 'string' ? row.user_id : null,
  };
}

export async function getChallengeLeaderboard(limit = 10): Promise<ChallengeLeaderboard> {
  if (!supabase) throw new ChallengeStoreError('Challenge storage is not configured');
  try {
    const { data, error } = await withTimeout(
      supabase
        .from(TABLE)
        .select('id, name, score, created_at, user_id')
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit),
      4000,
    );
    if (error || !Array.isArray(data)) throw new ChallengeStoreError(error?.message || 'Could not load leaderboard');
    const top = data.map(rowToScore);
    return { top, champion: top[0] ?? null };
  } catch (error) {
    if (error instanceof ChallengeStoreError) throw error;
    throw new ChallengeStoreError(error instanceof Error ? error.message : 'Could not load leaderboard');
  }
}

export async function recordChallengeScore(input: {
  name: string;
  score: number;
  runId: string;
  userId?: string | null;
}): Promise<ChallengeScore | null> {
  if (!supabase) throw new ChallengeStoreError('Challenge storage is not configured');
  const cleanName = (input.name ?? '').trim().slice(0, MAX_NAME);
  if (!cleanName) return null;
  const cleanScore =
    Number.isFinite(input.score) && input.score >= 0
      ? Math.min(Math.floor(input.score), MAX_SCORE)
      : 0;
  try {
    let result = await withTimeout(
      supabase
        .from(TABLE)
        .insert({
          name: cleanName,
          score: cleanScore,
          run_id: input.runId,
          user_id: input.userId ?? null,
        })
        .select('id, name, score, created_at, user_id')
        .single(),
      5000,
    );
    // Backward-compatible deploy order: schema 021 adds run_id. Until it is
    // applied, keep verified scoring available (without DB-level retry dedupe).
    if (result.error?.message?.includes('run_id')) {
      result = await withTimeout(
        supabase
          .from(TABLE)
          .insert({ name: cleanName, score: cleanScore, user_id: input.userId ?? null })
          .select('id, name, score, created_at, user_id')
          .single(),
        5000,
      );
    }
    const { data, error } = result;
    if (error || !data) throw new ChallengeStoreError(error?.message || 'Could not save score');
    return rowToScore(data as Record<string, unknown>);
  } catch (error) {
    if (error instanceof ChallengeStoreError) throw error;
    throw new ChallengeStoreError(error instanceof Error ? error.message : 'Could not save score');
  }
}
