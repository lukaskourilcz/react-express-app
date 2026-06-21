import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonError, createLogger } from '../lib/http';
import { tryAuth } from '../lib/auth';
import { getChallengeLeaderboard, recordChallengeScore } from '../lib/challenge-store';

// Biggest Shark Challenge: leaderboard read + score submission. Reads are
// public (the home page surfaces the current champion); writes accept a
// display name and the run's correct-answer count.

const log = createLogger('challenge');

const MAX_NAME = 40;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const board = await getChallengeLeaderboard(10);
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
    return res.json(board);
  }

  if (req.method === 'POST') {
    const body = (req.body || {}) as { name?: unknown; score?: unknown };
    const name =
      typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : '';
    if (!name) return jsonError(res, 400, 'bad_request', 'name is required');

    const score =
      typeof body.score === 'number' && Number.isFinite(body.score) && body.score >= 0
        ? Math.floor(body.score)
        : -1;
    if (score < 0) return jsonError(res, 400, 'bad_request', 'score must be a non-negative integer');
    if (score > 1000) return jsonError(res, 400, 'bad_request', 'score is implausibly high');

    // Optional auth — if a signed-in user submits, we attribute by user id so
    // they can dedupe their own runs later. Anonymous submissions still work.
    const auth = await tryAuth(req);
    const userId = auth?.sub ?? null;

    const record = await recordChallengeScore({ name, score, userId });
    log({ status: 200, score, hasUser: !!userId });
    return res.json({ ok: true, record });
  }

  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}
