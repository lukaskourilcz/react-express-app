// Lessons on Learn levels (#492): GET /api/quiz/roadmap?resource=lesson&id=.
//
// A level may name a lesson (lib/learn-lessons/levels.ts); the roadmap handler
// serves its public projection to anyone, guests included, under the Learn
// map's address limit, with the projection's sha256 as a strong ETag. The
// eighteen original DSA readings came from the DSA Foundations path; E5 (#496)
// retired the path and Learn keeps them under their permanent ids, so every
// link to a reading still opens it. Run from scripts/test-launch-contracts.ts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import roadmapHandler from '../api/quiz/roadmap';
import { checkRateLimit, RATE_LIMITS } from '../lib/rate-limit';
import { handleLessonRead, LESSON_CACHE_CONTROL } from '../lib/learn-lessons/serve';
import { LEARN_LESSONS, lessonProjection, publicLesson } from '../lib/learn-lessons';
import { nativeContentHash } from '../lib/learning-paths/audit';
import { LEVEL_LESSONS } from '../lib/learn-lessons/levels';
import { buildLiveTopic, isRoadmapTopic, isValidLevel, topicLevels } from '../lib/roadmap';
import { getEffectiveQuestionsById } from '../lib/questions-store';

function mockResponse() {
  const headers = new Map<string, string>();
  return {
    statusCode: 200,
    body: undefined as unknown,
    ended: false,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), String(value)); },
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; },
    end() { this.ended = true; return this; },
    headers,
  };
}

let addresses = 0;
const nextAddress = () => `198.51.100.${(addresses += 1) % 250}`;

async function read(query: Record<string, string>, input: { method?: string; headers?: Record<string, string>; from?: string } = {}) {
  const res = mockResponse();
  await roadmapHandler({
    method: input.method ?? 'GET',
    headers: { 'x-forwarded-for': input.from ?? nextAddress(), ...(input.headers ?? {}) },
    query,
    url: '/api/quiz/roadmap',
    socket: {},
  } as never, res as never);
  return res;
}

export async function learnLessonContracts() {
  // ── placement: its own branch after the coding and learning-path blocks ──
  const route = readFileSync(join(process.cwd(), 'api/quiz/roadmap.ts'), 'utf8');
  const dispatch = route.indexOf("if (resource === 'lesson') return await handleLessonRead(req, res);");
  assert.ok(dispatch > route.indexOf("if (resource.startsWith('learning-path-')) {"), 'the lesson branch follows the learning-path block');
  assert.ok(dispatch < route.indexOf("if (req.method === 'POST' && req.query.resource === 'answer') {"), 'and precedes the Learn step branches');

  // ── the registry and the level map agree ────────────────────────────────
  for (const [topic, levels] of Object.entries(LEVEL_LESSONS)) {
    assert.ok(isRoadmapTopic(topic), `${topic} is a Learn topic`);
    for (const [level, id] of Object.entries(levels ?? {})) {
      assert.ok(isValidLevel(topic, Number(level)), `${topic} has a level ${level}`);
      assert.ok(LEARN_LESSONS.has(id), `${topic} level ${level} names a lesson the registry holds (${id})`);
    }
  }
  assert.equal(LEVEL_LESSONS.dsa?.[1], 'dsa-v1-d01-l1');
  assert.equal(LEVEL_LESSONS.dsa?.[2], 'dsa-v1-d01-l2');
  assert.equal(Object.keys(LEVEL_LESSONS.dsa ?? {}).length, 15, 'every Foundations level has its reading');
  const dsaMap = topicLevels('dsa');
  assert.equal(dsaMap[0].lessonId, 'dsa-v1-d01-l1');
  assert.equal(dsaMap[1].lessonId, 'dsa-v1-d01-l2');
  assert.ok(dsaMap.every((level) => level.lessonId && LEARN_LESSONS.has(level.lessonId)), 'all fifteen DSA levels resolve their reading');
  assert.ok(topicLevels('javascript').every((level) => !('lessonId' in level)), 'other topics behave as before');
  const byId = await getEffectiveQuestionsById();
  const live = buildLiveTopic('dsa', (id) => byId.has(id));
  assert.equal(live.levels[0].lessonId, 'dsa-v1-d01-l1', 'the served map names the lesson too');

  // The structure read carries the field to the browser.
  const map = await read({});
  assert.equal(map.statusCode, 200, JSON.stringify(map.body));
  const structure = (map.body as { structure: Record<string, { levels: { level: number; lessonId?: string }[] }> }).structure;
  assert.equal(structure.dsa.levels[0].lessonId, 'dsa-v1-d01-l1');
  assert.equal(structure.dsa.levels[1].lessonId, 'dsa-v1-d01-l2');

  // ── the original DSA readings keep their ids ────────────────────────────
  // The retired path's eighteen lessons live on in Learn under the ids its
  // readings were published with (dsa-v1-d01-l1 to dsa-v1-d09-l2).
  const originalReadings = Array.from({ length: 9 }, (_, module) => [1, 2].map((part) => `dsa-v1-d0${module + 1}-l${part}`)).flat();
  for (const id of originalReadings) {
    const lesson = LEARN_LESSONS.get(id);
    assert.ok(lesson, `${id}: the original DSA reading is still served`);
    assert.equal(lessonProjection(lesson!).id, id, `${id}: the reading keeps its id`);
    assert.deepEqual(Object.keys(lessonProjection(lesson!)).sort(), ['id', 'sections', 'sources', 'title'], `${id}: the projection names its fields`);
  }
  assert.equal([...LEARN_LESSONS.keys()].filter((id) => id.startsWith('dsa-v1-')).length, 18, 'all eighteen original DSA readings stay in Learn');
  // Each reading is still the text its native-lesson review read: the records
  // in docs/audit/wip/native/learn bind it by content hash, so an edit to a
  // reading fails here until it is reviewed again (audit:native-reviews too).
  const reviewed = new Map(readFileSync(join(process.cwd(), 'docs/audit/wip/native/learn/review-dsa-readings.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map((line) => JSON.parse(line) as { id: string; kind: string; contentHash: string })
    .map((record) => [record.id, record]));
  for (const id of originalReadings) {
    const record = reviewed.get(id);
    assert.ok(record, `${id}: the reading keeps its native-lesson review`);
    assert.equal(record!.kind, 'native-lesson', `${id}: the review is a lesson review`);
    assert.equal(nativeContentHash(LEARN_LESSONS.get(id)), record!.contentHash, `${id}: Learn serves exactly the reviewed reading`);
  }
  assert.equal(reviewed.size, originalReadings.length, 'one review per original reading');

  // ── a guest reads it, cached by its hash ────────────────────────────────
  const first = publicLesson('dsa-v1-d01-l1')!;
  assert.match(first.hash, /^[0-9a-f]{64}$/);
  const guest = await read({ resource: 'lesson', id: 'dsa-v1-d01-l1' });
  assert.equal(guest.statusCode, 200, JSON.stringify(guest.body));
  assert.deepEqual(guest.body, { lesson: first.lesson, hash: first.hash }, 'a guest gets the projection and its hash');
  assert.equal(guest.headers.get('etag'), `"${first.hash}"`, 'the ETag is the content hash');
  assert.equal(guest.headers.get('cache-control'), LESSON_CACHE_CONTROL);
  assert.match(LESSON_CACHE_CONTROL, /^public, max-age=\d+/, 'and the answer may be cached publicly');
  const signedIn = await read({ resource: 'lesson', id: 'dsa-v1-d01-l1', user_id: 'contract-lesson-reader' }, { headers: { authorization: 'Bearer contract' } });
  assert.deepEqual(signedIn.body, guest.body, 'an account reads the same body: nothing about the reader is in it');
  const second = await read({ resource: 'lesson', id: 'dsa-v1-d01-l2' });
  assert.notEqual((second.body as { hash: string }).hash, first.hash, 'each lesson has its own hash');

  for (const tag of [`"${first.hash}"`, `W/"${first.hash}"`, `"stale", "${first.hash}"`, '*']) {
    const again = await read({ resource: 'lesson', id: 'dsa-v1-d01-l1' }, { headers: { 'if-none-match': tag } });
    assert.equal(again.statusCode, 304, `If-None-Match ${tag} revalidates`);
    assert.equal(again.body, undefined, 'a 304 has no body');
    assert.ok(again.ended);
    assert.equal(again.headers.get('etag'), `"${first.hash}"`);
  }
  const changed = await read({ resource: 'lesson', id: 'dsa-v1-d01-l1' }, { headers: { 'if-none-match': '"an-older-hash"' } });
  assert.equal(changed.statusCode, 200, 'a different hash gets the body');

  // ── refusals ────────────────────────────────────────────────────────────
  const unknown = await read({ resource: 'lesson', id: 'no-such-lesson' });
  assert.equal(unknown.statusCode, 404);
  assert.equal((unknown.body as { error: { code: string } }).error.code, 'not_found');
  assert.equal(unknown.headers.get('cache-control'), 'private, no-store', 'a refusal is not cached');
  for (const id of ['', '../d01', 'A'.repeat(81)]) {
    const bad = await read({ resource: 'lesson', id });
    assert.equal(bad.statusCode, 400, `id ${JSON.stringify(id)} is refused`);
  }
  const post = await read({ resource: 'lesson', id: 'dsa-v1-d01-l1' }, { method: 'POST' });
  assert.equal(post.statusCode, 405);
  assert.equal(post.headers.get('allow'), 'GET');

  // ── the Learn map's limit ───────────────────────────────────────────────
  // The clock stands still while the address bucket is drained, or a slow
  // runner would find a token again.
  const realNow = Date.now;
  const frozen = realNow();
  Date.now = () => frozen;
  try {
    const school = '203.0.113.77';
    const drainRes = mockResponse();
    const drainReq = { headers: { 'x-forwarded-for': school }, query: {} } as never;
    for (let n = 0; n < RATE_LIMITS.readAddress.capacity; n += 1) checkRateLimit(drainReq, drainRes as never, RATE_LIMITS.readAddress);
    const limited = await read({ resource: 'lesson', id: 'dsa-v1-d01-l1' }, { from: school });
    assert.equal(limited.statusCode, 429, 'past the address budget a lesson read is refused');
    const direct = mockResponse();
    await handleLessonRead({ method: 'GET', headers: { 'x-forwarded-for': school }, query: { resource: 'lesson', id: 'dsa-v1-d01-l1' } } as never, direct as never);
    assert.equal(direct.statusCode, 429, 'the limit is the operation\'s own, not only the route\'s');
    assert.equal((await read({}, { from: school })).statusCode, 429, 'it is the bucket the Learn map spends');
    assert.equal((await read({ resource: 'lesson', id: 'dsa-v1-d01-l1' })).statusCode, 200, 'another address keeps its own budget');
  } finally {
    Date.now = realNow;
  }

  console.log('PASS learn lessons: level map, the original readings bound to their reviews, guest read, ETag by content hash, refusals and the map\'s limit');
}
