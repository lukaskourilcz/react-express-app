// Biggest Shark Challenge leaderboard store.
//
// Persists finished runs to `challenge_scores`. Reads return the global top
// 10 plus a "champion" pointer used by the home-page badge. Falls back to an
// empty list if Supabase isn't configured or the table hasn't been migrated
// yet, so the feature degrades gracefully.

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
  if (!supabase) return { top: [], champion: null };
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
    if (error || !Array.isArray(data)) return { top: [], champion: null };
    const top = data.map(rowToScore);
    return { top, champion: top[0] ?? null };
  } catch {
    return { top: [], champion: null };
  }
}

export async function recordChallengeScore(input: {
  name: string;
  score: number;
  userId?: string | null;
}): Promise<ChallengeScore | null> {
  if (!supabase) return null;
  const cleanName = (input.name ?? '').trim().slice(0, MAX_NAME);
  if (!cleanName) return null;
  const cleanScore =
    Number.isFinite(input.score) && input.score >= 0
      ? Math.min(Math.floor(input.score), MAX_SCORE)
      : 0;
  try {
    const { data, error } = await withTimeout(
      supabase
        .from(TABLE)
        .insert({
          name: cleanName,
          score: cleanScore,
          user_id: input.userId ?? null,
        })
        .select('id, name, score, created_at, user_id')
        .single(),
      5000,
    );
    if (error || !data) return null;
    return rowToScore(data as Record<string, unknown>);
  } catch {
    return null;
  }
}
