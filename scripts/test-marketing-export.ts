import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { VercelResponse } from '../lib/vercel-types';

let rows: any[] = [];
let unavailable = false;
let truncated = false;
let mutateDuringRead = false;
const reads: string[] = [];
const server = createServer((req, res) => {
  reads.push(req.url!);
  if (!req.url?.startsWith('/rest/v1/question_edits?')) { res.writeHead(500).end('unexpected table'); return; }
  if (unavailable) { res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ message: 'stand-in unavailable' })); return; }
  const offset = Number(new URL(req.url!, 'http://localhost').searchParams.get('offset') ?? 0);
  const page = rows.slice(offset, offset + 500);
  res.writeHead(200, { 'content-type': 'application/json', 'content-range': `${offset}-${offset + page.length - 1}/${rows.length + (truncated ? 1 : 0)}` });
  res.end(JSON.stringify(page));
  if (mutateDuringRead) { rows[0] = { ...rows[0], updated_at: String(reads.length) }; }
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
process.env.SUPABASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-source-test-service-key';
process.env.DEVSHARK_MARKETING_EXPORT_SECRET = 'local-integration-test-secret-that-is-long-enough';
try {
  const { default: handler } = await import('../api/quiz/questions');
  const { loadWebdevQuestions } = await import('../lib/webdev-bank');
  const { questionEligibility } = await import('../lib/curation');
  const { getEffectiveQuestions, invalidateQuestionsCache } = await import('../lib/questions-store');
  const { pickQuestionOfTheDay } = await import('../lib/daily-question');
  const { utcToday } = await import('../shared/daily-question');
  const base = (await loadWebdevQuestions()).find((q) => questionEligibility(q).active && q.category === 'javascript')!;
  const call = async (query: Record<string, string> = {}, authenticated = true) => {
    let status = 200; let body: any; const headers: Record<string, unknown> = {};
    const res = { setHeader(k: string, v: unknown) { headers[k] = v; }, status(s: number) { status = s; return this; },
      json(value: unknown) { body = value; return this; } } as unknown as VercelResponse;
    await handler({ method: 'GET', url: '/api/quiz/questions?resource=marketing-source', query: { resource: 'marketing-source', ...query },
      headers: authenticated ? { authorization: `Bearer ${process.env.DEVSHARK_MARKETING_EXPORT_SECRET}` } : {}, socket: { remoteAddress: '127.0.0.1' } }, res);
    return { status, body, headers };
  };
  const unauthorized = await call({}, false);
  assert.equal(unauthorized.status, 401);
  assert.equal(reads.length, 0);
  const first = await call({ limit: '2' });
  assert.equal(first.status, 200);
  assert.equal(first.body.packets.length, 2);
  assert.equal(first.headers['Cache-Control'], 'private, no-store');
  const current = await call({ sourceId: `question:${base.id}` });
  assert.equal(current.body.packets[0].eligible, true);
  rows = [{ question_id: base.id, is_custom: false, deleted: true, updated_at: '2026-10-13T12:00:00Z' }];
  const changed = await call({ sourceId: `question:${base.id}` });
  assert.equal(changed.body.packets[0].eligible, false);
  assert.notEqual(changed.body.packets[0].sourceRevision, current.body.packets[0].sourceRevision);
  assert.equal((await call({ cursor: first.body.nextCursor })).status, 409);
  assert.equal((await call({ sourceId: 'question:dev-hard-deleted' })).status, 410);
  truncated = true;
  assert.equal((await call()).status, 503, 'incomplete override result holds entire export');
  truncated = false; unavailable = true;
  assert.equal((await call()).status, 503);
  unavailable = false; rows = []; invalidateQuestionsCache();
  rows = Array.from({ length: 501 }, (_, i) => ({ question_id: `dev-page-${String(i).padStart(4, '0')}`,
    is_custom: true, deleted: false, question: 'Authored custom fixture?', category: 'javascript',
    options: ['A', 'B'], correct_index: 0, explanation: 'Authored fixture explanation' }));
  assert.equal((await call({ sourceId: `question:${base.id}` })).status, 200, 'override pages beyond the default first page remain complete');
  assert.ok(reads.some((url) => url.includes('offset=500')));
  mutateDuringRead = true;
  assert.equal((await call()).status, 503, 'changing override layer holds export');
  mutateDuringRead = false; rows = []; invalidateQuestionsCache();
  const served = pickQuestionOfTheDay(await getEffectiveQuestions('webdev'), utcToday());
  const daily = await call({ daily: 'today' });
  assert.equal(daily.status, 200);
  assert.equal(daily.body.packets[0].sourceId, `question:${served!.question.id}`);
  assert.equal(daily.body.packets[0].canonicalUrl, `https://devshark.app/daily/${utcToday()}`);
  assert.equal((await call({ daily: '2099-01-01' })).status, 400);
  assert.ok(reads.every((url) => url.startsWith('/rest/v1/question_edits?')));
  console.log('Marketing HTTP handler passed with local PostgREST: auth, fresh deletes, revision invalidation, cursor conflict, removal, incomplete/error DB, daily alignment.');
} finally { await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
