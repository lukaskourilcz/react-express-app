// Handler contracts for the learning paths, run by `npm run test:paths`.
//
// The handlers are called directly with a stand-in for Supabase that answers
// only what each case needs. Nothing here reaches a network: auth takes the
// local development fallback (a `user_id` in the body), which is what every
// suite in this repository runs under, and the plan check reads the free tier.
//
//   * a submit re-checks the path's switch and a paused enrollment
//   * a preference save that cannot read the saved answers writes nothing
//   * a path reward: the address caps, a raced second claim, a refused field
//   * rate limits are the learner's own, with a class-sized address backstop

import { LEARNING_PATHS } from '../lib/learning-paths/catalog';
import {
  handleActivityStart,
  handleActivitySubmit,
  handleEnrollment,
  handleLearningPreference,
  handlePathDraft,
  handlePathReward,
} from '../lib/learning-paths/handlers';
import { encodeLearningPathSession } from '../lib/quiz-tokens';
import { RATE_LIMITS, SHARED_NETWORK_SEATS } from '../lib/rate-limit';
import { LEARNER_PROFILE_META_KEY } from '../shared/learning-paths';

type Fail = (message: string) => void;

interface Captured {
  statusCode: number;
  body: unknown;
}

function response(): Captured & Record<string, unknown> {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    setHeader() { return res; },
    status(code: number) { res.statusCode = code; return res; },
    json(value: unknown) { res.body = value; res.headersSent = true; return res; },
    end() { res.headersSent = true; return res; },
  };
  return res;
}

const request = (method: string, address: string, body: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  ({ method, headers: { 'x-forwarded-for': address, ...((extra.headers as object) ?? {}) }, query: extra.query ?? {}, body, socket: {} }) as never;

const code = (res: Captured) => (res.body as { error?: { code?: string } } | undefined)?.error?.code;

/** A chainable stand-in for the few Supabase calls these handlers make. */
function fakeSupabase(options: {
  rows?: Record<string, unknown>;
  rpc?: (name: string, params: Record<string, unknown>) => { data?: unknown; error?: unknown };
  auth?: Record<string, unknown>;
}) {
  const from = (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: options.rows?.[table] ?? null, error: null }),
    };
    return chain;
  };
  return {
    from,
    rpc: async (name: string, params: Record<string, unknown>) => ({ data: null, error: null, ...(options.rpc?.(name, params) ?? {}) }),
    auth: { admin: options.auth ?? {} },
  } as never;
}

/** The development auth fallback announces itself on every call; a few
 * hundred of those would bury the report. */
async function quietly<T>(run: () => Promise<T>): Promise<T> {
  const warn = console.warn;
  const log = console.log;
  console.warn = () => {};
  console.log = () => {};
  try {
    return await run();
  } finally {
    console.warn = warn;
    console.log = log;
  }
}

export async function handlerContracts(fail: Fail): Promise<void> {
  const stamp = Date.now();
  const dsa = LEARNING_PATHS.find((path) => path.id === 'dsa-foundations')!;
  const codeActivity = dsa.modules.flatMap((module) => module.activities).find((activity) => activity.kind === 'code' && !activity.reuseTaskId)!;
  const learner = `user-paths-${stamp}`;
  const enrollmentId = `ENROLL${stamp}`.padEnd(20, 'a');
  const session = encodeLearningPathSession({
    attemptId: `ATTEMPT${stamp}`.padEnd(20, 'a'),
    enrollmentId,
    userId: learner,
    pathId: 'dsa-foundations',
    activityId: codeActivity.id,
    activityKind: codeActivity.kind,
    purpose: codeActivity.purpose,
    curriculumVersion: dsa.version,
    rubricVersion: dsa.rubric.version,
  }).token;
  const submitBody = { user_id: learner, session, idempotencyKey: 'KEY0123456789abcdefghij', code: 'const x = 1;' };
  const enrollmentRow = (status: string) => ({
    enrollment_id: enrollmentId, user_id: learner, path_id: 'dsa-foundations', curriculum_version: dsa.version,
    base_track_at_enrollment: null, status, started_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  });
  const switchBefore = process.env.LEARNING_PATH_DSA_ENABLED;

  await quietly(async () => {
    /* ── a submit re-checks the switch and the enrollment ─────────────── */
    try {
      delete process.env.LEARNING_PATH_DSA_ENABLED;
      let res = response();
      await handleActivitySubmit(request('POST', `submit-${stamp}`, submitBody), res as never, fakeSupabase({ rows: { learning_path_enrollments: enrollmentRow('active') } }));
      if (res.statusCode !== 503 || code(res) !== 'path_unavailable') {
        fail(`submit to a path whose switch is off answers ${res.statusCode} ${code(res)}, not 503 path_unavailable`);
      }

      process.env.LEARNING_PATH_DSA_ENABLED = 'true';
      res = response();
      await handleActivitySubmit(request('POST', `submit-${stamp}`, submitBody), res as never, fakeSupabase({ rows: { learning_path_enrollments: enrollmentRow('paused') } }));
      if (res.statusCode !== 409 || code(res) !== 'enrollment_paused') {
        fail(`submit to a paused enrollment answers ${res.statusCode} ${code(res)}, not 409 enrollment_paused`);
      }

      // An open path and an active enrollment go on to the plan check, which
      // the free tier these suites run on refuses.
      res = response();
      await handleActivitySubmit(request('POST', `submit-${stamp}`, submitBody), res as never, fakeSupabase({ rows: { learning_path_enrollments: enrollmentRow('active') } }));
      if (res.statusCode !== 402) fail(`submit to an active enrollment answers ${res.statusCode} ${code(res)}, not the plan check's 402`);
    } finally {
      if (switchBefore === undefined) delete process.env.LEARNING_PATH_DSA_ENABLED;
      else process.env.LEARNING_PATH_DSA_ENABLED = switchBefore;
    }

    /* ── a preference save that cannot read the saved answers ─────────── */
    {
      const writes: unknown[] = [];
      const updateUserById = async (...args: unknown[]) => { writes.push(args); return { data: {}, error: null }; };
      const put = { user_id: learner, baseTrack: 'frontend', specialization: null };
      let res = response();
      await handleLearningPreference(
        request('PUT', `pref-${stamp}`, put, { headers: { authorization: 'Bearer test' } }),
        res as never,
        fakeSupabase({ auth: { getUserById: async () => ({ data: { user: null }, error: { message: 'upstream timeout', status: 504 } }), updateUserById } }),
      );
      if (res.statusCode !== 503) fail(`a preference save whose read failed answers ${res.statusCode}, not 503`);
      if (writes.length !== 0) fail('a preference save whose read failed still wrote the account, over the saved answers');

      // With the read answering, a partial save keeps the saved answers.
      const saved = {
        schemaVersion: 2, baseTrack: 'backend', specialization: null, skillPaths: ['dsa-foundations'],
        goals: ['level-up'], experience: 'some', studyTime: '30-60', updatedAt: '2026-09-01T00:00:00Z',
      };
      res = response();
      await handleLearningPreference(
        request('PUT', `pref-${stamp}`, put, { headers: { authorization: 'Bearer test' } }),
        res as never,
        fakeSupabase({ auth: { getUserById: async () => ({ data: { user: { user_metadata: { [LEARNER_PROFILE_META_KEY]: saved } } }, error: null }), updateUserById } }),
      );
      const written = (writes.at(-1) as [string, { user_metadata: Record<string, { goals?: string[] }> }] | undefined)?.[1]?.user_metadata;
      const profile = written ? Object.values(written).find((value) => Array.isArray(value?.goals)) : undefined;
      if (res.statusCode !== 200 || JSON.stringify(profile?.goals) !== JSON.stringify(['level-up'])) {
        fail(`a partial preference save answered ${res.statusCode} and wrote goals ${JSON.stringify(profile?.goals)}, not the saved ones`);
      }
    }

    /* ── the path reward ──────────────────────────────────────────────── */
    {
      const claims: Record<string, unknown>[] = [];
      const claim = { user_id: learner, pathId: 'dsa-foundations', shirt: 'M', name: 'Ann', line1: 'x'.repeat(150), line2: 'y'.repeat(150), city: 'Brno', postal: '60200', country: 'CZ' };
      // A second claim that lost the race to the first one's claim row.
      let res = response();
      await handlePathReward(request('POST', `reward-${stamp}`, claim), res as never, fakeSupabase({
        rows: { path_reward_claims: { order_id: 'reward-0123456789abcdef01234567' } },
        rpc: (_name, params) => {
          claims.push(params);
          return { error: { code: '23505', message: 'duplicate key value violates unique constraint "path_reward_claims_pkey"' } };
        },
      }));
      const answer = res.body as { granted?: boolean; already?: boolean; orderId?: string } | undefined;
      if (res.statusCode !== 200 || answer?.granted !== false || answer?.already !== true || answer?.orderId !== 'reward-0123456789abcdef01234567') {
        fail(`a raced second reward claim answers ${res.statusCode} ${JSON.stringify(res.body)}, not the first claim's order`);
      }
      // `merch_orders` holds 120 characters per address line.
      const sent = claims[0] ?? {};
      if (String(sent.p_line1 ?? '').length > 120 || String(sent.p_line2 ?? '').length > 120) {
        fail(`a reward claim sends address lines of ${String(sent.p_line1 ?? '').length} and ${String(sent.p_line2 ?? '').length} characters; the table holds 120`);
      }
      // A field the table's CHECK refuses is the learner's address, not a 500.
      res = response();
      await handlePathReward(request('POST', `reward-${stamp}`, claim), res as never, fakeSupabase({
        rpc: () => ({ error: { code: '23514', message: 'new row for relation "merch_orders" violates check constraint "merch_orders_ship_postal_check"' } }),
      }));
      if (res.statusCode !== 400 || code(res) !== 'invalid_address') {
        fail(`a reward address the table refuses answers ${res.statusCode} ${code(res)}, not 400 invalid_address`);
      }
    }

    /* ── rate limits are the learner's own ────────────────────────────── */
    // A class works through one address. Each learner's budget is their own,
    // one learner is still bounded, and the address backstop holds the class.
    type Call = (user: string, address: string) => Promise<number>;
    const cases: { name: string; per: { capacity: number }; call: Call }[] = [
      {
        name: 'start',
        per: RATE_LIMITS.learningPathStart,
        call: async (user, address) => { const res = response(); await handleActivityStart(request('POST', address, { user_id: user }), res as never, null); return res.statusCode; },
      },
      {
        name: 'submit',
        per: RATE_LIMITS.learningPathSubmit,
        call: async (user, address) => { const res = response(); await handleActivitySubmit(request('POST', address, { user_id: user }), res as never, null); return res.statusCode; },
      },
      {
        name: 'draft',
        per: RATE_LIMITS.learningPathDraft,
        call: async (user, address) => { const res = response(); await handlePathDraft(request('PUT', address, { user_id: user }), res as never, fakeSupabase({})); return res.statusCode; },
      },
      {
        name: 'enrollment',
        per: RATE_LIMITS.learningPathEnroll,
        call: async (user, address) => { const res = response(); await handleEnrollment(request('POST', address, { user_id: user }), res as never, fakeSupabase({})); return res.statusCode; },
      },
    ];
    for (const one of cases) {
      // Every seat of a class spends its whole budget from one address.
      const classroom = `classroom-${one.name}-${stamp}`;
      let refused = 0;
      for (let n = 0; n < SHARED_NETWORK_SEATS; n += 1) {
        for (let call = 0; call < one.per.capacity; call += 1) {
          if ((await one.call(`user-seat-${one.name}-${stamp}-${n}`, classroom)) === 429) refused += 1;
        }
      }
      if (refused > 0) fail(`${one.name}: ${refused} calls of a class of ${SHARED_NETWORK_SEATS} behind one address met a 429`);
      // One learner past their own budget is refused; the next one on the same
      // address is not.
      const desk = `desk-${one.name}-${stamp}`;
      for (let call = 0; call < one.per.capacity; call += 1) await one.call(`user-first-${one.name}-${stamp}`, desk);
      if ((await one.call(`user-first-${one.name}-${stamp}`, desk)) !== 429) fail(`${one.name}: one learner is not bounded by their own budget`);
      if ((await one.call(`user-second-${one.name}-${stamp}`, desk)) === 429) fail(`${one.name}: one learner's spent budget refused another learner on the same address`);
    }
  });
}
