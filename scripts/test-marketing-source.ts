import assert from 'node:assert/strict';
import { buildMarketingQuestionSnapshot, type QuestionEditRow } from '../lib/questions-store';
import { authorizedExport, codingPacket, datedDailyPacket, handleMarketingSource, hashContent, pagePackets, parseExportQuery, questionPacket } from '../lib/marketing/source';
import { loadWebdevQuestions } from '../lib/webdev-bank';
import { ACTIVE_CODING_TASKS } from '../lib/coding/active';
import { CODING_TASKS } from '../lib/coding/catalog';
import { questionEligibility } from '../lib/curation';
import { pickQuestionOfTheDay } from '../lib/daily-question';
import { utcToday } from '../shared/daily-question';
import type { VercelResponse } from '../lib/vercel-types';
import { checkRateLimit, RATE_LIMITS } from '../lib/rate-limit';

const now = '2026-10-13T12:00:00.000Z';
const bank = await loadWebdevQuestions();
const base = bank.find((q) => questionEligibility(q).active && q.category === 'javascript')!;
assert.ok(base);
const row = (patch: Partial<QuestionEditRow>): QuestionEditRow => ({ question_id: base.id, is_custom: false, deleted: false,
  question: null, options: null, correct_index: null, explanation: null, introduction: null, category: null,
  tags: null, difficulty: null, cs_question: null, cs_options: null, cs_introduction: null, cs_explanation: null, ...patch });
const clean = questionPacket(buildMarketingQuestionSnapshot([base], [])[0], now)!;
assert.equal(clean.eligible, true);
assert.equal(clean.content.answer, base.options[base.correctAnswer]);
assert.equal(clean.contentHash, hashContent(clean.content));
assert.equal(datedDailyPacket(clean, '2026-10-13').contentHash, clean.contentHash);
assert.notEqual(datedDailyPacket(clean, '2026-10-13').sourceRevision, datedDailyPacket(clean, '2026-10-12').sourceRevision);
assert.equal(hashContent({ b: 2, a: 1 }), hashContent({ a: 1, b: 2 }));
const edited = questionPacket(buildMarketingQuestionSnapshot([base], [row({ question: 'Edited authored question?' })])[0], now)!;
assert.equal(edited.content.body.includes('Edited authored question?'), true);
assert.equal(edited.eligible, false, 'changed audited wording requires another review');
assert.notEqual(edited.sourceRevision, clean.sourceRevision);
const deleted = questionPacket(buildMarketingQuestionSnapshot([base], [row({ deleted: true })])[0], now)!;
assert.equal(deleted.eligible, false);
assert.equal(deleted.eligibilityReason, 'deleted');
assert.notEqual(deleted.sourceRevision, clean.sourceRevision);
assert.equal(deleted.contentHash, clean.contentHash, 'eligibility changes revise identity without changing content');
const custom = buildMarketingQuestionSnapshot([], [row({ question_id: 'dev-authored', is_custom: true,
  question: 'Custom authored question?', options: ['A', 'B'], correct_index: 1, explanation: 'Authored explanation', category: 'javascript' })]);
assert.equal(custom.length, 1);
assert.equal(questionPacket(custom[0], now)!.eligible, false, 'custom audited item has no applicable review');
const retired = questionPacket({ question: { ...base, category: 'testing' }, deleted: false, updatedAt: null }, now)!;
assert.equal(retired.eligibilityReason, 'retired-topic');
const coding = codingPacket(ACTIVE_CODING_TASKS[0], true, now);
assert.equal(coding.eligible, true);
assert.equal(coding.content.answer, null);
assert.equal(coding.content.explanation, null);
assert.deepEqual(Object.keys(coding.content).sort(), ['answer','body','category','code','difficulty','evidence','explanation','image','options','title']);
const hidden = CODING_TASKS.find((t) => t.track === 'system-design')!;
assert.ok(!ACTIVE_CODING_TASKS.includes(hidden));
assert.equal(codingPacket(hidden, false, now).eligible, false);
assert.equal(JSON.stringify(coding).includes('hiddenTests'), false);
assert.equal(JSON.stringify(coding).includes('solution'), false);
const packets = bank.map((question) => questionPacket({ question, deleted: false, updatedAt: null }, now)).filter((p) => p !== null);
for (const task of ACTIVE_CODING_TASKS) codingPacket(task, true, now);
const activeIds = new Set(packets.filter((p) => p.eligible).map((p) => p.sourceId));
assert.equal(pickQuestionOfTheDay(bank.filter((q) => questionEligibility(q).active), utcToday())?.question.id,
  pickQuestionOfTheDay(bank.filter((q) => activeIds.has(`question:${q.id}`)), utcToday())?.question.id);
const page = pagePackets([clean, coding], { limit: 1 });
assert.equal(page.packets.length, 1);
const second = pagePackets([coding, clean], { limit: 1, cursor: page.nextCursor! });
assert.notEqual(second.packets[0].sourceId, page.packets[0].sourceId);
assert.equal(second.nextCursor, null);
assert.deepEqual(pagePackets([clean, coding], { limit: 1 }), page);
assert.throws(() => pagePackets([deleted, coding], { limit: 1, cursor: page.nextCursor! }), /source_snapshot_changed/);
assert.throws(() => parseExportQuery({ resource: 'marketing-source', limit: '51' }), /bad_request/);
assert.throws(() => parseExportQuery({ resource: 'marketing-source', table: 'users' }), /bad_request/);
assert.throws(() => parseExportQuery({ sourceId: 'question:x', daily: 'today' }), /bad_request/);
assert.throws(() => parseExportQuery({ limit: ['2'] }), /bad_request/);
assert.throws(() => parseExportQuery({ daily: '' }), /bad_request/);
assert.throws(() => pagePackets([clean], { limit: 1, cursor: Buffer.from('null').toString('base64url') }), /bad_request/);
const secret = 'integration-test-secret'.repeat(2);
assert.equal(authorizedExport({ authorization: `Bearer ${secret}` }, secret), true);
assert.equal(authorizedExport({ authorization: `Bearer ${secret}x` }, secret), false);
assert.equal(authorizedExport({}, undefined), false);
let status = 200;
let body: any;
const res = { setHeader() {}, status(value: number) { status = value; return this; }, json(value: unknown) { body = value; return this; } } as unknown as VercelResponse;
process.env.DEVSHARK_MARKETING_EXPORT_SECRET = secret;
// Invalid integration credentials must not spend the verified shared budget.
for (let i = 0; i < 25; i++) {
  await handleMarketingSource({ method: 'GET', query: {}, headers: {
    authorization: 'Bearer invalid', 'x-forwarded-for': `unauthorized-export-${i}` }, socket: {} }, res);
  assert.equal(status, 401);
}
await handleMarketingSource({ method: 'GET', query: { resource: 'marketing-source' }, headers: { authorization: `Bearer ${secret}` }, socket: {} }, res);
assert.equal(status, 503, 'DB absence must hold rather than returning the base bank');
assert.ok(!body.packets);
await handleMarketingSource({ method: 'GET', query: {}, headers: {}, socket: {} }, res);
assert.equal(status, 401);
// The first verified request above spent one token. Nineteen more verified
// requests fit; different addresses cannot multiply the integration budget.
for (let i = 0; i < 19; i++) {
  await handleMarketingSource({ method: 'GET', query: { limit: '51' }, headers: {
    authorization: `Bearer ${secret}`, 'x-forwarded-for': `verified-export-${i}` }, socket: {} }, res);
  assert.equal(status, 400, 'verified integration still has its twenty-request budget');
}
await handleMarketingSource({ method: 'GET', query: { limit: '51' }, headers: {
  authorization: `Bearer ${secret}`, 'x-forwarded-for': 'another-export-address' }, socket: {} }, res);
assert.equal(status, 429, 'verified export is bounded across all addresses');
assert.equal(body.error.code, 'rate_limited');
assert.equal(checkRateLimit({ headers: {}, socket: {} } as never, res, RATE_LIMITS.quizSession, 'user:marketing-test-learner'), true,
  'an exhausted integration cannot consume a learner quiz budget');
console.log(`Marketing source contracts passed (${packets.length} authored questions, ${ACTIVE_CODING_TASKS.length} active tasks; edits, tombstones, no secret payloads, daily, pagination, auth, fail-closed DB).`);
