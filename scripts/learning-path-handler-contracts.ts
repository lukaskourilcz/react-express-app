// Handler contracts for the learning paths, run by `npm run test:paths`.
//
// The handlers are called directly with a stand-in for Supabase that answers
// only what each case needs. Nothing here reaches a network: auth takes the
// local development fallback (a `user_id` in the body), which is what every
// suite in this repository runs under, and the plan check reads the free tier.
//
//   * a submit re-checks the path's switch and a paused enrollment
//   * a resubmitted write-up keeps its submission, and a submit sends the
//     module's requirements so the database decides completion
//   * a preference save that cannot read the saved answers writes nothing
//   * a path reward: paused with merchandise (MERCH_ENABLED), so a read and a
//     claim answer 404 merch_unavailable and touch nothing; with the switch
//     on, the address is checked, not cut to fit, completion is read for the
//     published curriculum version, a raced second claim, a refused field
//   * rate limits are the learner's own, with a class-sized address backstop
//   * a learner with submits already grading on an activity, or on enough
//     of them, is told the grader is busy; another activity is not held up
//   * a submit is limited per activity, beneath a ceiling per learner

import { LEARNING_PATHS } from '../lib/learning-paths/catalog';
import {
  handleActivityStart,
  handleActivitySubmit,
  handleEnrollment,
  handleLearningPreference,
  handlePathDraft,
  handlePathReward,
  moduleRequirements,
} from '../lib/learning-paths/handlers';
import { requestMemo, withRequestContext } from '../lib/http';
import { encodeLearningPathSession } from '../lib/quiz-tokens';
import { enterInFlight, RATE_LIMITS, SHARED_NETWORK_SEATS } from '../lib/rate-limit';
import { GRADING_PER_CALLER, GRADING_PER_TASK, gradingItem } from '../lib/coding/grader-capacity';
import { LEARNER_PROFILE_META_KEY } from '../shared/learning-paths';
import { MERCH_ENABLED } from '../shared/rewards';
import type { SubmitActivityResponse } from '../shared/learning-path-api';

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

/** A chainable stand-in for the few Supabase calls these handlers make: a
 * single row through `maybeSingle()`, a list when the chain is awaited. */
function fakeSupabase(options: {
  rows?: Record<string, unknown>;
  lists?: Record<string, unknown[]>;
  rpc?: (name: string, params: Record<string, unknown>) => { data?: unknown; error?: unknown };
  auth?: Record<string, unknown>;
}) {
  const from = (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: options.rows?.[table] ?? null, error: null }),
      then: <A>(resolve: (value: { data: unknown[]; error: null }) => A) => resolve({ data: options.lists?.[table] ?? [], error: null }),
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

    /* ── a burst is refused before it reaches the grader ──────────────── */
    // The coding section's grader threads take path code too. One learner may
    // have GRADING_PER_TASK submits grading at once on one activity (C1-1;
    // per activity since owner decision 9), and GRADING_PER_CALLER across
    // them all. One more is a 429 `grader_busy`, recorded nowhere. A full
    // activity holds up no other activity, and once one of the learner's
    // submits is answered the next is graded.
    try {
      process.env.LEARNING_PATH_DSA_ENABLED = 'true';
      const burster = `user-paths-burst-${stamp}`;
      const otherCode = dsa.modules.flatMap((module) => module.activities).find((activity) => activity.kind === 'code' && activity.id !== codeActivity.id)!;
      const bodyFor = (activity: typeof codeActivity) => ({
        ...submitBody,
        user_id: burster,
        session: encodeLearningPathSession({
          attemptId: `BURST${stamp}`.padEnd(20, 'a'), enrollmentId, userId: burster, pathId: 'dsa-foundations',
          activityId: activity.id, activityKind: activity.kind, purpose: activity.purpose,
          curriculumVersion: dsa.version, rubricVersion: dsa.rubric.version,
        }).token,
      });
      const written: string[] = [];
      const submitAsPremium = async (activity = codeActivity) => {
        const res = response();
        const req = request('POST', `burst-${stamp}`, bodyFor(activity));
        await withRequestContext(req, res as never, async () => {
          await requestMemo(`tier:${burster}`, async () => 'premium');
          await handleActivitySubmit(req, res as never, fakeSupabase({
            rows: { learning_path_enrollments: { ...enrollmentRow('active'), user_id: burster } },
            rpc: (name) => { written.push(name); return name === 'accept_learning_path_result' ? { data: { ok: true, replayed: false } } : {}; },
          }));
        });
        return res;
      };
      const graded = (res: Captured) => res.statusCode === 200 && Boolean((res.body as SubmitActivityResponse | undefined)?.code);
      const hold = (activityId: string) => enterInFlight(request('POST', `burst-${stamp}`, {}), 'grading',
        { item: gradingItem.activity('dsa-foundations', activityId), perItem: GRADING_PER_TASK, perCaller: GRADING_PER_CALLER }, `user:${burster}`);
      const grading = Array.from({ length: GRADING_PER_TASK }, () => hold(codeActivity.id));
      let res = await submitAsPremium();
      if (res.statusCode !== 429 || code(res) !== 'grader_busy') fail(`a submit past the learner's grading limit on one activity answers ${res.statusCode} ${code(res)}, not 429 grader_busy`);
      if (written.length > 0) fail(`a submit the grader did not take wrote ${written.join(', ')}`);
      res = await submitAsPremium(otherCode);
      if (!graded(res)) fail(`a full activity held up a submit on another activity: ${res.statusCode} ${code(res)}`);
      // The ceiling: GRADING_PER_CALLER grading across two activities.
      const more = Array.from({ length: GRADING_PER_CALLER - GRADING_PER_TASK }, () => hold(otherCode.id));
      res = await submitAsPremium(otherCode);
      if (res.statusCode !== 429 || code(res) !== 'grader_busy') fail(`a submit past the learner's grading ceiling answers ${res.statusCode} ${code(res)}, not 429 grader_busy`);
      grading[0]?.();
      res = await submitAsPremium();
      if (!graded(res)) fail(`once one of the learner's submits is answered the next is graded, not ${res.statusCode} ${code(res)}`);
      grading[1]?.();
      for (const done of more) done?.();
    } finally {
      if (switchBefore === undefined) delete process.env.LEARNING_PATH_DSA_ENABLED;
      else process.env.LEARNING_PATH_DSA_ENABLED = switchBefore;
    }

    /* ── a resubmitted write-up, and the requirements a submit sends ──── */
    // An FDE module that requires a written piece, already completed: the
    // piece submitted in full, every other requirement met. The learner sends
    // it again with every field empty. The plan check reads Premium here.
    {
      const fde = LEARNING_PATHS.find((path) => path.id === 'fde')!;
      const module = fde.modules.find((one) => !one.optional
        && one.requires.some((requirement) => one.activities.find((activity) => activity.id === requirement.activityId)?.kind === 'artifact'))!;
      const writeUp = module.activities.find((activity) => activity.kind === 'artifact' && module.requires.some((one) => one.activityId === activity.id))!;
      const fdeEnrollment = `FDEENROLL${stamp}`.padEnd(20, 'a');
      const fdeSession = encodeLearningPathSession({
        attemptId: `FDEATTEMPT${stamp}`.padEnd(20, 'a'),
        enrollmentId: fdeEnrollment,
        userId: learner,
        pathId: 'fde',
        activityId: writeUp.id,
        activityKind: writeUp.kind,
        purpose: writeUp.purpose,
        curriculumVersion: fde.version,
        rubricVersion: fde.rubric.version,
      }).token;
      const recorded = Object.fromEntries(module.requires.map((requirement) => [requirement.activityId, {
        state: requirement.state, score: requirement.state === 'verified_pass' ? 1 : null,
        verification: requirement.state === 'verified_pass' ? 'machine_verified' : 'self_reviewed', attempts: 1, updatedAt: '2026-09-01T00:00:00Z',
      }]));
      const fdeRow = { ...enrollmentRow('active'), enrollment_id: fdeEnrollment, path_id: 'fde', curriculum_version: fde.version, base_track_at_enrollment: 'fullstack' };
      const submitWriteUp = async (rpc: (name: string, params: Record<string, unknown>) => { data?: unknown; error?: unknown }) => {
        const res = response();
        const req = request('POST', `writeup-${stamp}`, { user_id: learner, session: fdeSession, idempotencyKey: 'KEYwriteup0123456789ab', artifact: {} });
        await withRequestContext(req, res as never, async () => {
          await requestMemo(`tier:${learner}`, async () => 'premium');
          await handleActivitySubmit(req, res as never, fakeSupabase({
            rows: { learning_path_enrollments: fdeRow },
            lists: { learning_path_progress: [{ module_id: module.id, activity_states: recorded, completed_at: '2026-09-01T00:00:00Z' }] },
            rpc,
          }));
        });
        return res;
      };
      const fdeSwitch = process.env.LEARNING_PATH_FDE_ENABLED;
      try {
        process.env.LEARNING_PATH_FDE_ENABLED = 'true';
        const sent: Record<string, unknown>[] = [];
        let res = await submitWriteUp((_name, params) => { sent.push(params); return { data: { ok: true, replayed: false, revision: 2 } }; });
        const answer = res.body as SubmitActivityResponse | undefined;
        const projected = answer?.module?.activities.find((activity) => activity.activityId === writeUp.id);
        if (res.statusCode !== 200 || answer?.state !== 'needs_revision') {
          fail(`an empty resubmission of ${writeUp.id} answers ${res.statusCode} ${answer?.state ?? JSON.stringify(res.body)}, not 200 needs_revision`);
        }
        if (projected?.state !== 'self_reviewed' || answer?.module?.completed !== true) {
          fail(`an empty resubmission of a submitted write-up projects it as ${projected?.state} (module completed: ${answer?.module?.completed}), not self_reviewed in a completed module`);
        }
        if (sent[0]?.p_state !== 'needs_revision') fail(`the weaker attempt is recorded as ${String(sent[0]?.p_state)}, not needs_revision evidence`);
        const requirements = module.requires.map((one) => one.activityId);
        const sentRequirements = sent[0]?.p_module_requires as { activityId: string; states: string[] }[] | undefined;
        if (JSON.stringify(sentRequirements) !== JSON.stringify(moduleRequirements(module))
            || sentRequirements?.map((one) => one.activityId).join() !== requirements.join()
            || !sentRequirements?.find((one) => one.activityId === writeUp.id)?.states.includes('self_reviewed')) {
          fail(`a submit sends the requirements ${JSON.stringify(sentRequirements)}, not ${module.id}'s own`);
        }

        // A database without migration 054 has no requirements parameter: the
        // result is recorded without it rather than refused.
        sent.length = 0;
        res = await submitWriteUp((_name, params) => {
          sent.push(params);
          return 'p_module_requires' in params
            ? { error: { code: 'PGRST202', message: 'Could not find the function public.accept_learning_path_result(p_artifact, p_attempt_id, p_criteria, p_domain_scores, p_idempotency_key, p_module_complete, p_module_id, p_module_requires, p_request_hash, p_result, p_score, p_state, p_user_id, p_verification_kind) in the schema cache' } }
            : { data: { ok: true, replayed: false, revision: 2 } };
        });
        if (res.statusCode !== 200 || sent.length !== 2 || 'p_module_requires' in (sent[1] ?? {})) {
          fail(`before migration 054 a submit answers ${res.statusCode} after ${sent.length} calls, not 200 after a second call without p_module_requires`);
        }      } finally {
        if (fdeSwitch === undefined) delete process.env.LEARNING_PATH_FDE_ENABLED;
        else process.env.LEARNING_PATH_FDE_ENABLED = fdeSwitch;
      }
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
      const claim = { user_id: learner, pathId: 'dsa-foundations', shirt: ' m ', name: ' Ann ', line1: 'x'.repeat(120), line2: 'y'.repeat(120), city: 'Brno', postal: '60200', country: 'cz' };

      // Merchandise is paused until next quarter (owner decision 10). A
      // finished path's read and claim both answer 404 merch_unavailable, and
      // neither reaches the database, whatever the progress rows say.
      if (MERCH_ENABLED) fail('merchandise ships switched off until next quarter (MERCH_ENABLED)');
      for (const [method, body, extra] of [
        ['GET', { user_id: learner }, { query: { pathId: 'dsa-foundations' } }],
        ['POST', claim, {}],
      ] as const) {
        const touched: string[] = [];
        const paused = response();
        await handlePathReward(request(method, `reward-paused-${stamp}`, body, extra), paused as never, fakeSupabase({
          rows: { path_reward_claims: { order_id: 'reward-0123456789abcdef01234567' } },
          rpc: (name) => { touched.push(name); return { data: [{ granted: true, reward_order_id: 'reward-x', already: false }] }; },
        }));
        if (paused.statusCode !== 404 || code(paused) !== 'merch_unavailable' || touched.length > 0) {
          fail(`a ${method} path-reward request while merchandise is paused answers ${paused.statusCode} ${code(paused)} after ${touched.length} database calls, not 404 merch_unavailable`);
        }
      }
      // A signed-out request is still asked to sign in first.
      {
        const anonymous = response();
        await handlePathReward(request('POST', `reward-anon-${stamp}`, { pathId: 'dsa-foundations' }), anonymous as never, fakeSupabase({}));
        if (anonymous.statusCode !== 401) fail(`a signed-out path-reward claim answers ${anonymous.statusCode}, not 401`);
      }

      // The rest drives the claim as it comes back with the switch on.
      const pathRewardOn = (...args: Parameters<typeof handlePathReward>) => handlePathReward(args[0], args[1], args[2], true);
      // A second claim that lost the race to the first one's claim row.
      let res = response();
      await pathRewardOn(request('POST', `reward-${stamp}`, claim), res as never, fakeSupabase({
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
      // The claim is checked for the curriculum version this deployment
      // publishes, with the fields trimmed and the codes in capitals.
      const sent = claims[0] ?? {};
      if (sent.p_curriculum_version !== dsa.version || sent.p_shirt !== 'M' || sent.p_name !== 'Ann' || sent.p_country !== 'CZ'
          || String(sent.p_line1).length !== 120) {
        fail(`a reward claim sends ${JSON.stringify({ ...sent, p_line1: String(sent.p_line1).length, p_line2: String(sent.p_line2).length })}`);
      }

      // An address the package cannot be posted to is refused with what to
      // fix, and never cut to fit or sent to the database: a line longer than
      // merch_orders holds (120), a country that is not an ISO 3166-1 code, a
      // size the shop does not print.
      const refusals: Array<[string, Record<string, unknown>, string, RegExp]> = [
        ['a 121-character street', { line1: 'x'.repeat(121) }, 'invalid_address', /street/],
        ['a 121-character second line', { line2: 'y'.repeat(121) }, 'invalid_address', /second address line/],
        ['a 121-character town', { city: 'z'.repeat(121) }, 'invalid_address', /town/],
        ['a 121-character postcode', { postal: '1'.repeat(121) }, 'invalid_address', /postcode/],
        ['a missing name', { name: '  ' }, 'invalid_address', /name/],
        ['the country ZZ', { country: 'ZZ' }, 'invalid_address', /ISO code/],
        ['the country UK', { country: 'UK' }, 'invalid_address', /ISO code/],
        ['the country "CZE"', { country: 'CZE' }, 'invalid_address', /ISO code/],
        ['the shirt size XXLARGE', { shirt: 'XXLARGE' }, 'bad_request', /shirt size/],
      ];
      for (const [label, change, expected, message] of refusals) {
        const called: string[] = [];
        res = response();
        await pathRewardOn(request('POST', `reward-${stamp}`, { ...claim, ...change }), res as never, fakeSupabase({
          rpc: (name) => { called.push(name); return { data: [{ granted: true, reward_order_id: 'reward-x', already: false }] }; },
        }));
        const error = (res.body as { error?: { code?: string; message?: string } } | undefined)?.error;
        if (res.statusCode !== 400 || error?.code !== expected || !message.test(error?.message ?? '') || called.length > 0) {
          fail(`a reward claim with ${label} answers ${res.statusCode} ${JSON.stringify(res.body)} after ${called.length} database calls, not 400 ${expected}`);
        }
      }

      // Before migration 054 neither routine takes the version: the call is
      // made again without it.
      const tried: Record<string, unknown>[] = [];
      res = response();
      await pathRewardOn(request('GET', `reward-${stamp}`, { user_id: learner }, { query: { pathId: 'dsa-foundations' } }), res as never, fakeSupabase({
        rpc: (_name, params) => {
          tried.push(params);
          return 'p_curriculum_version' in params
            ? { error: { code: 'PGRST202', message: 'Could not find the function public.path_is_complete(p_curriculum_version, p_modules, p_path_id, p_user_id) in the schema cache' } }
            : { data: true };
        },
      }));
      if (res.statusCode !== 200 || (res.body as { eligible?: boolean }).eligible !== true || tried.length !== 2 || tried[0].p_curriculum_version !== dsa.version) {
        fail(`a reward read before migration 054 answers ${res.statusCode} ${JSON.stringify(res.body)} after ${tried.length} calls`);
      }
      // A field the table's CHECK refuses is the learner's address, not a 500.
      res = response();
      await pathRewardOn(request('POST', `reward-${stamp}`, claim), res as never, fakeSupabase({
        rpc: () => ({ error: { code: '23514', message: 'new row for relation "merch_orders" violates check constraint "merch_orders_ship_postal_check"' } }),
      }));
      if (res.statusCode !== 400 || code(res) !== 'invalid_address') {
        fail(`a reward address the table refuses answers ${res.statusCode} ${code(res)}, not 400 invalid_address`);
      }
    }

    /* ── rate limits are the learner's own ────────────────────────────── */
    // A class works through one address. Each learner's budget is their own,
    // one learner is still bounded, and the address backstop holds the class.
    // A submit's budget is per activity (owner decision 9), so its calls
    // carry a session for the activity.
    const activities = dsa.modules.flatMap((module) => module.activities);
    const sessionFor = (user: string, activity: (typeof activities)[number]) => encodeLearningPathSession({
      attemptId: `RATE${stamp}`.padEnd(20, 'a'), enrollmentId, userId: user, pathId: 'dsa-foundations',
      activityId: activity.id, activityKind: activity.kind, purpose: activity.purpose,
      curriculumVersion: dsa.version, rubricVersion: dsa.rubric.version,
    }).token;
    const submitOn = async (user: string, address: string, activity = codeActivity) => {
      const res = response();
      await handleActivitySubmit(request('POST', address, { user_id: user, session: sessionFor(user, activity) }), res as never, null);
      return res.statusCode;
    };
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
        call: (user, address) => submitOn(user, address),
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

    // Per activity, beneath a ceiling: a learner who spent one activity's
    // submits still submits another, and no learner submits past the ceiling
    // across all of them.
    {
      const desk = `desk-per-activity-${stamp}`;
      const user = `user-per-activity-${stamp}`;
      for (let call = 0; call < RATE_LIMITS.learningPathSubmit.capacity; call += 1) await submitOn(user, desk);
      if ((await submitOn(user, desk)) !== 429) fail('one activity\'s submits are not bounded');
      if ((await submitOn(user, desk, activities.find((activity) => activity.id !== codeActivity.id)!)) === 429) fail('one activity\'s spent submits refused another activity');
      const { capacity: ceiling, refillPerSecond } = RATE_LIMITS.learningPathSubmitCeiling;
      if (activities.length * RATE_LIMITS.learningPathSubmit.capacity <= ceiling) fail('the path has too few activities to reach the ceiling');
      const started = Date.now();
      let through = 0;
      while (through <= ceiling + 20 && (await submitOn(`user-ceiling-${stamp}`, `desk-ceiling-${stamp}`, activities[through % activities.length])) !== 429) through += 1;
      // A slow run may refill a token or two.
      const slack = Math.ceil(((Date.now() - started) / 1000) * refillPerSecond) + 1;
      if (through < ceiling || through > ceiling + slack) fail(`submits spread across activities stop at the ceiling of ${ceiling}, not after ${through}`);
    }
  });
}
