import { describe, expect, it } from 'vitest';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { server } from './mocks/server';
import { fetchChallengeBatch, getChallengeLeaderboard } from '../src/lib/challengeApi';
import { getDailyChallenge } from '../src/lib/supabase';
import { validateCategoryScope } from '../../lib/product-scope';
import { RETIRED_TOPIC_IDS } from '../../shared/retired-content';

// The server refuses a retired category in a request for questions, and with it
// the whole request. From 2026-09-08 to 2026-09-25 the challenge and the daily
// set sent every catalogue category, retired ones included, so every one of
// those requests failed. Each request must pass the server's own check.
function capture(route: string, body: JsonBodyType) {
  const seen: string[][] = [];
  server.use(http.get(route, ({ request }) => {
    seen.push((new URL(request.url).searchParams.get('categories') ?? '').split(',').filter(Boolean));
    return HttpResponse.json(body);
  }));
  return seen;
}

describe('requests for questions name only categories the server serves', () => {
  it('the challenge batch passes the delivery check', async () => {
    const seen = capture('*/api/quiz/challenge', { sessionId: 's', runToken: 'r', questions: [] });
    await fetchChallengeBatch();
    expect(seen).toHaveLength(1);
    expect(seen[0].filter((category) => RETIRED_TOPIC_IDS.includes(category))).toEqual([]);
    expect(validateCategoryScope(seen[0], { forDelivery: true }).ok).toBe(true);
  });

  it('the daily set passes the delivery check', async () => {
    const seen = capture('*/api/quiz/daily', { date: '2026-09-25', sessionId: 's', questions: [] });
    await getDailyChallenge('en');
    expect(seen).toHaveLength(1);
    expect(validateCategoryScope(seen[0], { forDelivery: true }).ok).toBe(true);
  });

  it('the challenge board names the same served categories', async () => {
    const seen = capture('*/api/quiz/challenge', { top: [], champion: null });
    await getChallengeLeaderboard();
    expect(seen).toHaveLength(1);
    expect(validateCategoryScope(seen[0], { forDelivery: true }).ok).toBe(true);
  });
});
