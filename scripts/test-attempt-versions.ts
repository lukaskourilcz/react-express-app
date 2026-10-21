import './launch-test-env';
import assert from 'node:assert/strict';
import { handleCodingSubmit, handleCodingTask } from '../lib/coding/handlers';
import { codingTaskById } from '../lib/coding/active';
import { codingAttemptVersion, createCodingSession } from '../lib/coding/session';
import { decodeCodingSession, decodeLearningPathSession, encodeCodingSession, encodeLearningPathSession } from '../lib/quiz-tokens';
import { handleActivityStart, handleActivitySubmit } from '../lib/learning-paths/handlers';
import { activityIn, pathById } from '../lib/learning-paths/catalog';
import { createLearningPathSession, pathCodeAttemptVersion } from '../lib/learning-paths/session';
import { requestHash } from '../lib/learning-paths/grade';
import { requestMemo, withRequestContext } from '../lib/http';

const res = () => ({ statusCode: 200, body: null as unknown, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } });
const errorCode = (out: ReturnType<typeof res>) => (out.body as { error?: { code?: string } })?.error?.code;
const account = 'version-learner-0001';
const parent = 'version-parent-0123456789';
const task = codingTaskById('js-double-numbers')!;
const sessionInput = { taskId: task.id, track: task.track, userId: account };
const opened = createCodingSession(sessionInput);
const decoded = decodeCodingSession(opened)!;
assert.equal(decoded.version, codingAttemptVersion(task));
assert.ok(!opened.includes(decoded.version!), 'the grader fingerprint stays encrypted');
assert.equal(decodeCodingSession(encodeCodingSession({ ...sessionInput, version: 'not-a-version' })), null);

let writes = 0;
let completed = false;
const database = {
  from(table: string) {
    const chain = {
      select: () => chain, eq: () => chain,
      maybeSingle: async () => ({ data: table === 'roadmap_attempts' ? {
        user_id: account, completed_at: completed ? new Date().toISOString() : null,
        expires_at: new Date(Date.now() + 600_000).toISOString(), coding_task_ids: [task.id],
      } : null, error: null }),
      then: <T>(resolve: (value: unknown) => T) => resolve({ data: [], error: null }),
    };
    return chain;
  },
  rpc() { writes++; throw new Error('A stale attempt must not write'); },
};
const request = (session: string, user: string | null = account) => ({ method: 'POST', headers: user ? { authorization: 'Bearer local-version-test' } : {}, query: {}, body: { session, code: 'while (true) {}', ...(user ? { user_id: user } : {}) } });
for (const token of [
  encodeCodingSession(sessionInput),
  encodeCodingSession({ ...sessionInput, version: '0'.repeat(64) }),
]) {
  const out = res();
  await handleCodingSubmit(request(token) as never, out as never, database as never);
  assert.equal(out.statusCode, 409);
  assert.equal(errorCode(out), 'task_changed');
  assert.equal(writes, 0);
}
const beforePrompt = task.prompt.en;
try {
  task.prompt.en += '\nChanged authored requirement.';
  assert.notEqual(codingAttemptVersion(task), decoded.version);
  const out = res();
  await handleCodingSubmit(request(opened) as never, out as never, database as never);
  assert.equal(errorCode(out), 'task_changed');
  assert.equal(writes, 0);
} finally { task.prompt.en = beforePrompt; }
assert.equal(codingAttemptVersion(task), decoded.version);
const guest = res();
await handleCodingSubmit(request(encodeCodingSession({ ...sessionInput, userId: null }), null) as never, guest as never, database as never);
assert.equal(errorCode(guest), 'task_changed');
const foreign = res();
await handleCodingSubmit(request(opened, 'another-version-learner') as never, foreign as never, database as never);
assert.equal(errorCode(foreign), 'invalid_session', 'ownership is checked before version disclosure');

const linked = encodeCodingSession({ ...sessionInput, roadmapAttemptId: parent, attemptId: decoded.attemptId });
const rejected = res();
await handleCodingSubmit(request(linked) as never, rejected as never, database as never);
assert.equal(errorCode(rejected), 'task_changed');
assert.equal(writes, 0, 'the linked parent remains pending');
const refresh = res();
await handleCodingTask({ ...request(linked), query: { id: task.id } } as never, refresh as never, database as never);
assert.equal(refresh.statusCode, 200);
const renewed = decodeCodingSession((refresh.body as { session: string }).session)!;
assert.equal(renewed.version, codingAttemptVersion(task));
assert.equal(renewed.attemptId, decoded.attemptId);
assert.equal(renewed.roadmapAttemptId, parent);
assert.equal(renewed.userId, account);
assert.equal(writes, 0);
completed = true;
const closed = res();
await handleCodingTask({ ...request(linked), query: { id: task.id } } as never, closed as never, database as never);
assert.equal(errorCode(closed), 'invalid_session', 'refresh cannot reopen an accepted parent');
console.log('PASS attempt versions: coding ownership, legacy/stale refusal before grading/writes, encrypted version and linked-parent refresh');

process.env.LEARNING_PATH_DSA_ENABLED = 'true';
const path = pathById('dsa-foundations')!;
const activity = activityIn(path, 'dsa-v1-d01-count-pairs')?.activity ?? path.modules.flatMap(module => module.activities).find(one => one.kind === 'code')!;
const nativeInput = { attemptId: 'native-version-0123456789', enrollmentId: 'native-enroll-0123456789', userId: account, pathId: path.id, activityId: activity.id, activityKind: activity.kind, purpose: activity.purpose, curriculumVersion: path.version, rubricVersion: path.rubric.version };
assert.equal(decodeLearningPathSession(createLearningPathSession(nativeInput).token)?.version, pathCodeAttemptVersion(activity, path.rubric.version));
let accepted: Record<string, unknown> | null = null;
let openedAttempts = 0;
const nativeDb = {
  from(table: string) {
    const chain = { select: () => chain, eq: () => chain, then: <T>(resolve: (value: unknown) => T) => resolve({ data: [], error: null }), maybeSingle: async () => ({ data: table === 'learning_path_attempts' ? accepted : table === 'learning_path_enrollments' ? { enrollment_id: nativeInput.enrollmentId, user_id: account, path_id: path.id, curriculum_version: path.version, status: 'active' } : null, error: null }) };
    return chain;
  },
  rpc(name: string) { if (name === 'open_learning_path_attempt') { openedAttempts++; return { data: { ok: true }, error: null }; } writes++; throw new Error('A stale native attempt must not write'); },
};
for (const version of [undefined, '0'.repeat(64)]) {
  const out = res();
  const req = { ...request(''), body: { user_id: account, session: encodeLearningPathSession({ ...nativeInput, version }).token, idempotencyKey: 'version-key-0123456789', code: 'while (true) {}' } };
  await withRequestContext(req as never, out as never, async () => {
    await requestMemo(`tier:${account}`, async () => 'premium');
    await handleActivitySubmit(req as never, out as never, nativeDb as never);
  });
  assert.equal(errorCode(out), 'task_changed');
  assert.equal(writes, 0);
}
const beforeExpected = activity.code!.tests[0].expected;
const beforeVersion = pathCodeAttemptVersion(activity, path.rubric.version);
try {
  activity.code!.tests[0].expected = 'changed grading expectation';
  assert.notEqual(pathCodeAttemptVersion(activity, path.rubric.version), beforeVersion);
} finally { activity.code!.tests[0].expected = beforeExpected; }
console.log('PASS attempt versions: native exact code bindings and legacy/stale refusal before grading/evidence/XP');

const replayedResult = { activityId: activity.id, state: 'verified_pass', xpAwarded: 25 };
accepted = {
  state: 'accepted', user_id: account, enrollment_id: nativeInput.enrollmentId, activity_id: activity.id,
  idempotency_key: 'version-key-0123456789', request_hash: requestHash({ answers: null, code: 'while (true) {}', artifact: null, acknowledged: null }),
  accepted_result: replayedResult,
};
for (const sameWork of [true, false]) {
  const out = res();
  const req = { ...request(''), body: { user_id: account, session: encodeLearningPathSession(nativeInput).token, idempotencyKey: 'version-key-0123456789', code: sameWork ? 'while (true) {}' : 'different code' } };
  await withRequestContext(req as never, out as never, async () => {
    await requestMemo(`tier:${account}`, async () => 'premium');
    await handleActivitySubmit(req as never, out as never, nativeDb as never);
  });
  if (sameWork) assert.deepEqual(out.body, { ...replayedResult, replayed: true });
  else assert.equal(errorCode(out), 'idempotency_conflict');
  assert.equal(writes, 0);
}
console.log('PASS attempt versions: accepted native replay survives catalogue changes, different work is refused, no repeated XP');

const renew = async (previousSession?: string) => {
  const out = res();
  const req = { ...request(''), body: { user_id: account, enrollmentId: nativeInput.enrollmentId, activityId: activity.id, ...(previousSession ? { previousSession } : {}) } };
  await withRequestContext(req as never, out as never, async () => {
    await requestMemo(`tier:${account}`, async () => 'premium');
    await handleActivityStart(req as never, out as never, nativeDb as never);
  });
  assert.equal(out.statusCode, 200, JSON.stringify(out.body));
  return out.body as { needsBriefReview?: boolean; session: string };
};
const previousCurrent = createLearningPathSession(nativeInput).token;
assert.equal((await renew(previousCurrent)).needsBriefReview, undefined);
assert.equal((await renew(encodeLearningPathSession(nativeInput).token)).needsBriefReview, true);
const savedPrompt = activity.code!.prompt.en;
try {
  activity.code!.prompt.en += ' Changed authored requirement.';
  const renewed = await renew(previousCurrent);
  assert.equal(renewed.needsBriefReview, true, 'an automatic renewal cannot silently grade a changed brief');
  assert.equal(decodeLearningPathSession(renewed.session)?.version, pathCodeAttemptVersion(activity, path.rubric.version));
} finally { activity.code!.prompt.en = savedPrompt; }
assert.equal(openedAttempts, 3);
assert.equal(writes, 0);
console.log('PASS attempt versions: unchanged native renewal, legacy renewal and changed authored renewal before another Submit');
