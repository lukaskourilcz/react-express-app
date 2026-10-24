/* The served question set's refresh (#587, server item 19).
 *
 * lib/questions-store.ts merges the admin console's `question_edits` rows
 * onto the bank and keeps the result for fifteen seconds per instance. The
 * request that found it older used to wait for the read; against a local
 * stand-in for PostgREST whose answers the test holds and releases, this
 * pins:
 *  - the read names the columns the store uses, not `*`;
 *  - within fifteen seconds nothing is read;
 *  - up to a minute, the old set is served at once while one read runs, and
 *    the next request is served the new set;
 *  - a read that fails in that minute keeps the good set (a hidden question
 *    stays hidden); past the minute a request waits for the read, and a
 *    failure there serves the bank alone, as before;
 *  - a read begun before an admin save does not become the cached set.
 * Run as its own process by scripts/test-request-timing.ts. Nothing leaves
 * the machine. */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

type Row = Record<string, unknown>;
let rows: Row[] = [];
let failing = false;
let held = false;
const releases: (() => void)[] = [];
const selects: string[] = [];

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://stand-in');
  assert.equal(url.pathname, '/rest/v1/question_edits', `only the override rows are read (${url.pathname})`);
  selects.push(url.searchParams.get('select') ?? '');
  const answer = failing
    ? { status: 503, body: { code: 'PGRST000', message: 'synthetic outage' } }
    : { status: 200, body: rows.map((row) => ({ ...row })) };
  if (held) await new Promise<void>((resolve) => releases.push(resolve));
  res.writeHead(answer.status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(answer.body));
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
process.env.SUPABASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
process.env.SUPABASE_ANON_KEY = 'anon-questions-cache';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-questions-cache';
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'NODE_ENV', 'VERCEL_ENV', 'VERCEL']) delete process.env[key];

const realNow = Date.now;
let offset = 0;
Date.now = () => realNow() + offset;
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
/** Whether a promise settles within a short wait. */
const settlesSoon = async (promise: Promise<unknown>) => Promise.race([promise.then(() => true), settle().then(() => false)]);

try {
  const store = await import('../lib/questions-store');
  const bank = await store.getEffectiveQuestionsById('webdev');
  const [hidden, edited] = [...bank.keys()];
  assert.ok(hidden && edited, 'the bank serves questions');
  const hide = { question_id: hidden, is_custom: false, deleted: true };
  const edit = { question_id: edited, is_custom: false, deleted: false, explanation: 'Edited in the console.' };
  store.invalidateQuestionsCache();
  selects.length = 0;

  // A cold set waits for its read, which names its columns.
  rows = [hide];
  let served = await store.getEffectiveQuestionsById('webdev');
  assert.equal(served.has(hidden), false, 'the hidden question is not served');
  assert.equal(selects.length, 1, 'one read');
  assert.equal(selects[0], 'question_id,is_custom,deleted,question,options,correct_index,explanation,introduction,category,tags,difficulty,importance');
  assert.ok(!selects[0].includes('*'), 'not every column');

  // Within fifteen seconds nothing is read.
  offset += 10_000;
  await store.getEffectiveQuestionsById('webdev');
  await store.getEffectiveQuestionsById();
  assert.equal(selects.length, 1, 'no read inside the TTL');
  console.log('PASS questions cache: the read names its columns, and nothing is read inside fifteen seconds');

  // Older than that: the request is served at once while one read runs.
  rows = [hide, edit];
  offset += 10_000;
  held = true;
  const waiting = [store.getEffectiveQuestionsById('webdev'), store.getEffectiveQuestionsById(), store.getEffectiveQuestionsById('webdev')];
  for (const one of waiting) assert.equal(await settlesSoon(one), true, 'an old set is served without waiting for the read');
  served = await waiting[0];
  assert.equal(served.get(edited)?.explanation === 'Edited in the console.', false, 'the old set, until the read lands');
  assert.equal(served.has(hidden), false, 'with its hidden question still hidden');
  await settle();
  assert.equal(selects.length, 2, 'one read for every request that found the set old');
  held = false;
  releases.splice(0).forEach((release) => release());
  await settle();
  served = await store.getEffectiveQuestionsById('webdev');
  assert.equal(served.get(edited)?.explanation, 'Edited in the console.', 'the next request is served the new set');
  assert.equal(selects.length, 2, 'without another read');
  console.log('PASS questions cache: an old set is served at once while one read runs, and the next request gets the new one');

  // A read that fails within the minute keeps the good set.
  failing = true;
  offset += 20_000;
  served = await store.getEffectiveQuestionsById('webdev');
  await settle();
  served = await store.getEffectiveQuestionsById('webdev');
  assert.equal(served.has(hidden), false, 'a failed read keeps the hidden question hidden');
  assert.equal(served.get(edited)?.explanation, 'Edited in the console.', 'and the edit served');
  assert.equal(store.overridesAvailable(), true, 'the good set is still the one served');

  // Past the minute the request waits, and an outage serves the bank alone.
  offset += 60_000;
  held = true;
  const late = store.getEffectiveQuestionsById('webdev');
  assert.equal(await settlesSoon(late), false, 'a set over a minute old waits for the read');
  held = false;
  releases.splice(0).forEach((release) => release());
  served = await late;
  assert.equal(served.has(hidden), true, 'an outage past the minute serves the bank alone, as before');
  assert.equal(store.overridesAvailable(), false, 'and says the override layer could not be read');
  failing = false;
  console.log('PASS questions cache: a failed read keeps a good set for up to a minute, then waits as before');

  // A read begun before an admin save never becomes the cached set.
  offset += 60_000;
  rows = [];
  held = true;
  const before = store.getEffectiveQuestionsById('webdev');
  await settle();
  store.invalidateQuestionsCache();
  rows = [hide];
  held = false;
  const after = store.getEffectiveQuestionsById('webdev');
  releases.splice(0).forEach((release) => release());
  await before;
  served = await after;
  assert.equal(served.has(hidden), false, 'the request after the save reads the saved set');
  served = await store.getEffectiveQuestionsById('webdev');
  assert.equal(served.has(hidden), false, 'and the read begun before it did not replace it');
  console.log('PASS questions cache: a read begun before an admin save does not become the cached set');
} finally {
  Date.now = realNow;
  server.close();
}
