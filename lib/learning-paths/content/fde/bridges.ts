/** Bridges — the optional practice a diagnostic gap points at.
 *
 * Every activity here carries purpose 'diagnostic': a bridge closes a gap the
 * placement check reported, and it never gates module or path completion. The
 * module is optional and holds no requirements, so a learner who already works
 * across the backend, the operator screen, delivery and Python can skip it
 * whole and lose nothing.
 *
 * Four activities, one per bridge in `fde.ts`: a TypeScript mapping exercise
 * for Backend and data, a reducer for Operator interface, an incident case for
 * Delivery operations, and five Python reading questions for Python
 * interoperability.
 *
 * Every payload, timeline and snippet is a fixture written for this exercise.
 * No customer data, no live system, no vendor account, and no Python runs on
 * the server — the Python questions grade reading, and anything a learner runs
 * locally stays their own self-reviewed note. */

import type { ModuleSource } from '../../types';

/** Builds one raw CRM record from a base fixture plus overrides, so a test
 * says only what it changes. Setting a key to `undefined` removes it, which is
 * how the missing-field cases are written. Appended after the learner's code,
 * so a submission cannot shadow it. */
const ACCOUNT_FIXTURES = `
var __raw = function (overrides) {
  var base = {
    account_id: 4821,
    company_name: 'Brightpier Freight',
    owner_email: 'ops@brightpier.example',
    signed_up_at: '2026-03-04',
    plan: 'growth',
  };
  var out = {};
  for (var key in base) out[key] = base[key];
  for (var patch in overrides) {
    if (overrides[patch] === undefined) delete out[patch];
    else out[patch] = overrides[patch];
  }
  return out;
};
`.trim();

/** Folds a list of actions from the learner's initial state and projects the
 * five fields the grade compares, so an extra bookkeeping field a learner adds
 * does not fail an otherwise correct reducer. */
const OPERATOR_FIXTURES = `
var __proposal = { ticketId: 'BP-4821', action: 'refund', amountCents: 12500 };
var __run = function (actions) {
  var state = initialOperatorState;
  for (var index = 0; index < actions.length; index++) state = operatorReducer(state, actions[index]);
  return state;
};
var __view = function (state) {
  return {
    status: state.status,
    requestId: state.requestId,
    proposal: state.proposal,
    error: state.error,
    abandoned: state.abandoned,
  };
};
`.trim();

/** One incident, read four ways. The same timeline sits in every question's
 * context so each can be answered on its own, in any order. */
const INCIDENT_TIMELINE = `Service: triage-api (Brightpier support triage assistant)
Change 41c7, released 2026-06-11: "cache resolved knowledge-base article lookups in memory"

09:02  41c7 rolled out to 3 of 12 instances (canary).
09:05  Canary p95 latency 410 ms, unchanged. Error rate 0.2%, unchanged.
09:20  Rollout completed on all 12 instances.
11:40  The support lead reports two tickets from tenant NORTHWIND showing an
       article that belongs to tenant CALDERA. No alert has fired.
11:52  On-call opens the dashboards: request rate, error rate, p95 latency and
       CPU are all inside the normal range for a Thursday.
12:05  Traces show the article-lookup span returning in 1 ms for a repeated
       query and 90 ms for a first-time query, for every tenant.
12:14  The cache key is read off the span attributes. It is the article slug.
       The tenant id is not part of it.
12:20  41c7 rolled back on all instances. Repeated lookups return to 90 ms.
12:26  New cross-tenant reads stop. Two support replies quoting the CALDERA
       article were already sent; one of them went out by email.`;

export const FDE_BRIDGES: ModuleSource = {
  id: 'fde-v1-bridges',
  title: 'Bridges',
  outcomes: [
    'Turn a dirty external payload into a validated internal record, or into the full list of reasons it cannot become one.',
    'Write the state logic behind an operator approval screen, including a cancel that a late response cannot undo.',
    'Read an incident timeline and separate the signal that would have caught it, the change that caused it, the safe first action and the damage a rollback leaves behind.',
    'Read typed and asynchronous Python well enough to work with a data team. Reading is what is graded here: no Python runs on the server, and any Python you run locally is your own note, recorded as self-reviewed.',
  ],
  competencies: ['integration', 'boundaries', 'handoff', 'operations', 'python-reading'],
  dependsOn: [],
  estimatedMinutes: 105,
  lessons: [],
  activities: [
    {
      id: 'fde-v1-bridge-backend-mapping',
      kind: 'code',
      purpose: 'diagnostic',
      verification: 'machine_verified',
      title: 'Map a dirty payload to a validated record',
      summary: 'Turn one messy CRM export record into a validated account, or into every reason it cannot become one.',
      competencies: ['integration'],
      estimatedMinutes: 35,
      code: {
        language: 'typescript',
        prompt:
          'Brightpier Freight exports account records to your integration. The export has the shape real exports have: fields go missing, a date arrives as an empty string, the id is sometimes a number and sometimes a string of digits, and a plan name turns up that your system has never heard of.\n\nWrite `mapAccount(raw)`. It takes one raw record and returns a discriminated result: `{ ok: true, record }` when every field survives validation, and `{ ok: false, problems }` when one or more do not. Never both, and never a half-filled record sitting next to a problem list.\n\nTrim every string field before you check it. The rules:\n\n- `account_id` becomes `record.id`, a whole number. An integer passes as it is, a string of digits is converted, and anything else is the problem `account_id must be a whole number`.\n- `company_name` becomes `record.companyName` and must be non-empty after trimming, or the problem is `company_name must not be empty`.\n- `owner_email` becomes `record.ownerEmail`, trimmed and lowercased, and must contain `@`, or the problem is `owner_email must contain @`.\n- `signed_up_at` becomes `record.signedUpAt`. Missing, `null` and an empty string all mean `null` — that account never came through the sign-up portal, and filling in today’s date would invent a fact. Anything else must match `YYYY-MM-DD`, or the problem is `signed_up_at must be YYYY-MM-DD`.\n- `plan` becomes `record.plan` and must be exactly `starter`, `growth` or `enterprise`. Anything else, `Growth` included, is the problem `plan must be one of starter, growth or enterprise`.\n\nCollect every problem rather than returning the first one: whoever fixes the export wants the whole list in one pass. Sort the list alphabetically before returning it, so the same bad record always produces the same output and a difference between two runs means something actually changed.\n\nThe records here are fixtures written for this exercise. They are not live CRM traffic, and nothing calls out to a network.',
        contract: [
          'Return `{ ok: true, record }` or `{ ok: false, problems }`, never a record and a problem list together.',
          'Collect every problem in one pass and sort the list alphabetically before returning it.',
          'Keep the supplied `RawAccount`, `Account` and `MapResult` type names and the `mapAccount` signature; the type assertions call them by name.',
          'No imports, no network and no clock: a missing date stays `null` instead of becoming today.',
        ],
        starter: `type Plan = 'starter' | 'growth' | 'enterprise';

interface RawAccount {
  account_id?: unknown;
  company_name?: unknown;
  owner_email?: unknown;
  signed_up_at?: unknown;
  plan?: unknown;
}

interface Account {
  id: number;
  companyName: string;
  ownerEmail: string;
  signedUpAt: string | null;
  plan: Plan;
}

type MapResult = { ok: true; record: Account } | { ok: false; problems: string[] };

const mapAccount = (raw: RawAccount): MapResult => {

};

// Scratch pad — change this and press Run.
console.log(mapAccount({ account_id: '4821', company_name: 'Brightpier Freight', owner_email: 'ops@brightpier.example', signed_up_at: '', plan: 'growth' }));
`,
        skeleton: `type Plan = 'starter' | 'growth' | 'enterprise';

interface RawAccount {
  account_id?: unknown;
  company_name?: unknown;
  owner_email?: unknown;
  signed_up_at?: unknown;
  plan?: unknown;
}

interface Account {
  id: number;
  companyName: string;
  ownerEmail: string;
  signedUpAt: string | null;
  plan: Plan;
}

type MapResult = { ok: true; record: Account } | { ok: false; problems: string[] };

const mapAccount = (raw: RawAccount): MapResult => {
  const problems: string[] = [];

  /* account_id: an integer, or a string of digits, or a problem */

  /* company_name: non-empty after trimming, or a problem */

  /* owner_email: trimmed, lowercased, has to contain @ */

  /* signed_up_at: missing, null and '' all mean null; anything else matches YYYY-MM-DD or is a problem */

  /* plan: exactly one of the three, or a problem */

  if (problems.length > 0) return { ok: false, problems: /* sorted */ problems };
  return { ok: true, record: /* the five converted fields */ };
};`,
        hints: [
          'Keep one `problems` array, push into it as each field fails, and decide at the very end which half of the result to return. A field that fails still gets checked, because whoever reads the list wants every problem at once.',
          '`typeof value === "string" && /^\\d+$/.test(value.trim())` separates "4821" from "48a" and from an empty string, and `Number(...)` then converts it. `Number.isInteger` covers the id that already arrived as a number.',
          'The narrowing the type assertions look for comes from the literal `ok` field. With `{ ok: true; record: Account } | { ok: false; problems: string[] }`, TypeScript rules out `record` on the failing branch by itself.',
        ],
        approach: [
          'Start an empty `problems` array.',
          'Check the fields one at a time, pushing the exact problem string on a failure and keeping the converted value on a pass.',
          'Treat a missing, null or empty `signed_up_at` as `null` rather than as a problem.',
          'Sort `problems` and return `{ ok: false, problems }` when the array is not empty.',
          'Otherwise assemble the five converted fields and return `{ ok: true, record }`.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'The record and the problem list are both correct',
            critical: true,
            weight: 3,
            detail: 'Check the empty-string date, the string id, the unknown plan, a record missing several fields at once, and that a rejected payload carries no partial record.',
          },
          {
            id: 'deterministic-problems',
            label: 'Problems come back sorted, every time',
            critical: true,
            weight: 2,
            detail: 'The problem list came back in the order the fields were checked rather than alphabetically. Two runs over the same record then differ for no reason, and a diff of the output stops meaning anything.',
          },
        ],
        tests: [
          {
            call: 'mapAccount(__raw({}))',
            expected: {
              ok: true,
              record: {
                id: 4821,
                companyName: 'Brightpier Freight',
                ownerEmail: 'ops@brightpier.example',
                signedUpAt: '2026-03-04',
                plan: 'growth',
              },
            },
            label: 'a clean record maps straight through',
          },
          {
            call: "mapAccount(__raw({ account_id: '4821' }))",
            expected: {
              ok: true,
              record: {
                id: 4821,
                companyName: 'Brightpier Freight',
                ownerEmail: 'ops@brightpier.example',
                signedUpAt: '2026-03-04',
                plan: 'growth',
              },
            },
            label: 'a numeric id arriving as a string becomes a number',
          },
          {
            call: "mapAccount(__raw({ signed_up_at: '' }))",
            expected: {
              ok: true,
              record: {
                id: 4821,
                companyName: 'Brightpier Freight',
                ownerEmail: 'ops@brightpier.example',
                signedUpAt: null,
                plan: 'growth',
              },
            },
            label: 'an empty-string date becomes null, not today',
            edge: true,
          },
          {
            call: "mapAccount(__raw({ company_name: '  Brightpier Freight  ', owner_email: ' OPS@Brightpier.Example ' }))",
            expected: {
              ok: true,
              record: {
                id: 4821,
                companyName: 'Brightpier Freight',
                ownerEmail: 'ops@brightpier.example',
                signedUpAt: '2026-03-04',
                plan: 'growth',
              },
            },
            label: 'string fields are trimmed and the email is lowercased',
          },
          {
            call: "mapAccount(__raw({ plan: 'platinum' }))",
            expected: { ok: false, problems: ['plan must be one of starter, growth or enterprise'] },
            label: 'an unknown plan is rejected by name',
            edge: true,
          },
          {
            call: 'mapAccount({})',
            expected: {
              ok: false,
              problems: [
                'account_id must be a whole number',
                'company_name must not be empty',
                'owner_email must contain @',
                'plan must be one of starter, growth or enterprise',
              ],
            },
            label: 'an empty payload reports four problems, and a missing date is not one of them',
            edge: true,
          },
          {
            call: "'record' in mapAccount({})",
            expected: false,
            label: 'a rejected payload carries no partial record',
            edge: true,
          },
          {
            call: "mapAccount(__raw({ plan: 'platinum', account_id: 'four thousand', signed_up_at: '04/03/2026' }))",
            expected: {
              ok: false,
              problems: [
                'account_id must be a whole number',
                'plan must be one of starter, growth or enterprise',
                'signed_up_at must be YYYY-MM-DD',
              ],
            },
            label: 'three problems at once, alphabetical rather than field order',
            criterion: 'deterministic-problems',
          },
        ],
        typeTests: [
          {
            code: "const __id: number = ((): number => { const result = mapAccount({ account_id: '4821', company_name: 'Brightpier Freight', owner_email: 'ops@brightpier.example', signed_up_at: '2026-03-04', plan: 'growth' }); return result.ok ? result.record.id : -1; })();",
            label: 'the ok branch narrows to a record with a numeric id',
          },
          {
            code: "const __plan: 'starter' | 'growth' | 'enterprise' = ((): 'starter' | 'growth' | 'enterprise' => { const result = mapAccount({ plan: 'starter' }); return result.ok ? result.record.plan : 'starter'; })();",
            label: 'plan is the three-value union, not a bare string',
          },
          {
            code: 'const __leak = mapAccount({}).record;',
            label: 'the record cannot be read before the result narrows',
            rejects: true,
          },
          {
            code: 'const __both = ((): string[] => { const result = mapAccount({}); return result.ok ? result.problems : []; })();',
            label: 'the ok branch carries no problem list',
            rejects: true,
          },
        ],
        harness: ACCOUNT_FIXTURES,
      },
    },
    {
      id: 'fde-v1-bridge-operator-state',
      kind: 'code',
      purpose: 'diagnostic',
      verification: 'machine_verified',
      title: 'The operator approval state machine',
      summary: 'A reducer for the screen an operator approves work on, including a cancel that a late response cannot undo.',
      competencies: ['handoff'],
      estimatedMinutes: 35,
      code: {
        language: 'javascript',
        prompt:
          'An operator at Brightpier reviews a proposed refund before it happens: the screen loads a proposal, the operator approves it, and the approval goes back to the ticket service. This exercise is the state logic behind that screen. You write the reducer and the grade drives it with action lists directly, rather than rendering a component, because the transitions are what goes wrong in production and they are testable on their own.\n\nExport two things. `initialOperatorState` is the starting state: `{ status: \'idle\', requestId: null, proposal: null, error: null, abandoned: [] }`. `operatorReducer(state, action)` returns the next state and never mutates the one it was given.\n\nThe transitions:\n\n- `{ type: \'load\', requestId }` from any status except `loading` and `approving` goes to `loading`, stores `requestId`, and clears `proposal` and `error`. While a request is in flight, a second load is ignored.\n- `{ type: \'loaded\', requestId, proposal }` goes to `ready` and clears `requestId`, but only when the status is `loading` and `requestId` matches the one in state.\n- `{ type: \'approve\', requestId }` from `ready` goes to `approving`, stores the new `requestId`, and keeps the proposal on screen.\n- `{ type: \'approved\', requestId }` goes to `approved` and clears `requestId`, but only from `approving` with a matching id.\n- `{ type: \'failed\', requestId, message }` goes to `error` with `error` set to the message, but only from `loading` or `approving` with a matching id.\n- `{ type: \'cancel\' }` from `loading` or `approving` goes back to `idle`, clears `requestId`, `proposal` and `error`, and appends the abandoned request id to `abandoned`.\n\nThe part that matters: after a cancel, the response for that request can still arrive. It has to change nothing. The same goes for a response whose `requestId` does not match the one in flight, which is what a superseded request looks like.\n\nAny action the current status does not allow — an unknown type included — returns the state object it was given, unchanged and identical. React bails out of a re-render when a reducer hands back the same object, so returning a fresh copy for an ignored action repaints the screen for no reason.',
        contract: [
          'Keep the names `initialOperatorState` and `operatorReducer`; the grade drives them by name.',
          'Never mutate the state passed in. Build a new object for a real transition.',
          'For an action the status does not allow, return the same state object, not a copy of it.',
          'No timers, no network and no randomness: the reducer is a pure function of state and action.',
        ],
        starter: `const initialOperatorState = {
  status: 'idle',
  requestId: null,
  proposal: null,
  error: null,
  abandoned: [],
};

const operatorReducer = (state, action) => {

};

// Scratch pad — change this and press Run.
console.log(operatorReducer(initialOperatorState, { type: 'load', requestId: 1 }));
`,
        skeleton: `const initialOperatorState = {
  status: 'idle',
  requestId: null,
  proposal: null,
  error: null,
  abandoned: [],
};

const operatorReducer = (state, action) => {
  switch (action.type) {
    case 'load':
      /* ignore while a request is in flight, otherwise go to loading */
    case 'loaded':
      /* only from loading, and only when the id matches */
    case 'approve':
      /* only from ready */
    case 'approved':
      /* only from approving, and only when the id matches */
    case 'failed':
      /* only from loading or approving, and only when the id matches */
    case 'cancel':
      /* back to idle, and record the abandoned request id */
    default:
      return state;
  }
};`,
        hints: [
          'Write each case as a guard first and a transition second: check the status and the request id, `return state` when either is wrong, and only then build the next object.',
          'Clearing `requestId` on cancel is what makes a late response harmless. Every response case compares `action.requestId` against `state.requestId`, and `null` matches nothing.',
          'Ignoring an action means `return state` — the same reference, not `{ ...state }`. One of the assertions compares the returned object against the one it passed in.',
        ],
        approach: [
          'Start with a switch on `action.type` whose default returns `state` unchanged.',
          'Handle `load`: ignore it while the status is `loading` or `approving`, otherwise move to `loading` with the new request id and a cleared proposal and error.',
          'Handle the two responses, `loaded` and `approved`, each guarded by both the status and a matching request id.',
          'Handle `failed` from either in-flight status, storing the message and clearing the request id.',
          'Handle `cancel` from either in-flight status: back to `idle`, everything cleared, and the abandoned id appended to `abandoned`.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'The transitions the operator sees are correct',
            critical: true,
            weight: 3,
            detail: 'Check idle to loading to ready, ready through approving to approved, and a failure that lands in error with the message.',
          },
          {
            id: 'stale-responses',
            label: 'A cancelled or superseded request cannot change the state',
            critical: true,
            weight: 2,
            detail: 'A response arriving after a cancel, or carrying a request id that is not the one in flight, has to leave the state exactly as it was — the same object, not a copy.',
          },
        ],
        tests: [
          {
            call: '__view(__run([]))',
            expected: { status: 'idle', requestId: null, proposal: null, error: null, abandoned: [] },
            label: 'the screen starts idle with nothing in flight',
          },
          {
            call: "__view(__run([{ type: 'load', requestId: 1 }]))",
            expected: { status: 'loading', requestId: 1, proposal: null, error: null, abandoned: [] },
            label: 'load moves to loading and records the request id',
          },
          {
            call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'loaded', requestId: 1, proposal: __proposal }]))",
            expected: {
              status: 'ready',
              requestId: null,
              proposal: { ticketId: 'BP-4821', action: 'refund', amountCents: 12500 },
              error: null,
              abandoned: [],
            },
            label: 'the matching response makes the proposal ready',
          },
          {
            call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'loaded', requestId: 1, proposal: __proposal }, { type: 'approve', requestId: 2 }, { type: 'approved', requestId: 2 }]))",
            expected: {
              status: 'approved',
              requestId: null,
              proposal: { ticketId: 'BP-4821', action: 'refund', amountCents: 12500 },
              error: null,
              abandoned: [],
            },
            label: 'approve then approved, with the proposal still on screen',
          },
          {
            call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'failed', requestId: 1, message: 'ticket service timed out' }]))",
            expected: { status: 'error', requestId: null, proposal: null, error: 'ticket service timed out', abandoned: [] },
            label: 'a failure keeps the message the operator has to read',
          },
          {
            call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'cancel' }]))",
            expected: { status: 'idle', requestId: null, proposal: null, error: null, abandoned: [1] },
            label: 'cancel while loading returns to idle and abandons the request',
          },
          {
            call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'cancel' }, { type: 'loaded', requestId: 1, proposal: __proposal }]))",
            expected: { status: 'idle', requestId: null, proposal: null, error: null, abandoned: [1] },
            label: 'the cancelled response arrives late and changes nothing',
            edge: true,
            criterion: 'stale-responses',
          },
          {
            call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'loaded', requestId: 1, proposal: __proposal }, { type: 'approve', requestId: 2 }, { type: 'cancel' }, { type: 'approved', requestId: 2 }]))",
            expected: { status: 'idle', requestId: null, proposal: null, error: null, abandoned: [2] },
            label: 'a cancelled approval cannot come back as approved',
            edge: true,
            criterion: 'stale-responses',
          },
          {
            call: "(function () { var state = __run([{ type: 'load', requestId: 1 }]); return operatorReducer(state, { type: 'refresh' }) === state; })()",
            expected: true,
            label: 'an action the status does not allow returns the same object',
            edge: true,
          },
        ],
        harness: OPERATOR_FIXTURES,
      },
    },
    {
      id: 'fde-v1-bridge-incident-case',
      kind: 'check',
      purpose: 'diagnostic',
      verification: 'machine_verified',
      title: 'Read an incident from its timeline',
      summary: 'One cross-tenant cache incident, read four ways: the signal, the cause, the safe first action, and what the rollback leaves behind.',
      competencies: ['operations'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-bridge-incident-q1',
          prompt: 'Every dashboard stayed inside its normal range while the fault ran for two and a half hours. Which signal would have caught this first?',
          context: { language: 'text', code: INCIDENT_TIMELINE },
          options: [
            'A check in the lookup path that compares the tenant id on the cached article against the tenant making the request, counted as a failure and alerted on.',
            'A p95 latency alert on the article-lookup span.',
            'An error-rate alert on triage-api responses in the 5xx range.',
            'A CPU saturation alert on the instances serving the cache.',
          ],
          correct: 0,
          explanation:
            'The fault produced a fast, successful, wrong answer. Only a check that compares the tenant on the returned article against the tenant asking for it can tell that apart from a correct hit, which is why the alert has to be on that comparison. Latency moved the wrong way for detection — repeated lookups dropped from 90 ms to 1 ms, so a p95 alert had less to fire on than before. No exception was raised and no 5xx was returned, so an error-rate alert had nothing to see. CPU fell too, because the cache removed work.',
          competencies: ['operations'],
        },
        {
          id: 'fde-v1-bridge-incident-q2',
          prompt: 'Which explanation fits the whole timeline?',
          context: { language: 'text', code: INCIDENT_TIMELINE },
          options: [
            'Change 41c7 keys the cache on the article slug alone, so the first tenant to request a slug fills an entry that every other tenant then reads.',
            'The knowledge base has NORTHWIND and CALDERA sharing an article namespace, so the lookup returned an article both tenants were entitled to.',
            'The canary at 09:02 covered 3 of 12 instances, too few for the fault to appear.',
            'Cached entries outlived their time to live and were served after the tenant session that created them had ended.',
          ],
          correct: 0,
          explanation:
            'The 12:14 entry names the defect: the key is the slug, with no tenant id in it, so one tenant’s article answers another tenant’s lookup. A shared namespace would not have been fixed by rolling back 41c7 at 12:20, and nothing in the timeline touched the knowledge base. The canary size affects how fast a fault is noticed, not whether it exists; the fault was on all 12 instances from 09:20 and still fired no alert. A time-to-live problem serves a tenant its own stale article, which is a freshness bug rather than a boundary one.',
          competencies: ['operations'],
        },
        {
          id: 'fde-v1-bridge-incident-q3',
          prompt: 'It is 11:52. On-call has the timeline up to that point and the cross-tenant reads are still happening. What is the safe immediate action?',
          context: { language: 'text', code: INCIDENT_TIMELINE },
          options: [
            'Roll 41c7 back to the previous release, then work out which replies already quoted another tenant’s article.',
            'Add the tenant id to the cache key and deploy the fix forward.',
            'Flush the cache on all 12 instances and leave 41c7 running.',
            'Cut the cache time to live to 30 seconds and watch whether the reports stop.',
          ],
          correct: 0,
          explanation:
            'Rolling back returns the service to a state that ran for months without leaking, and it stops the disclosure while the investigation continues. Fixing forward means writing, reviewing and shipping a change under time pressure with the leak still running, and a wrong cache key is easy to get wrong twice. Flushing empties the cache but the next request refills it under the same slug-only key, so the leak resumes within minutes. Cutting the time to live shortens each leaked window without closing it; a tenant boundary is not a timing question.',
          competencies: ['operations'],
        },
        {
          id: 'fde-v1-bridge-incident-q4',
          prompt: 'The rollback finished at 12:20 and new cross-tenant reads stopped at 12:26. What has the rollback not undone?',
          context: { language: 'text', code: INCIDENT_TIMELINE },
          options: [
            'The two replies already sent, one of them by email, quoting CALDERA’s article to NORTHWIND. A rollback stops new reads; it cannot retract a disclosure that has already left the service.',
            'Nothing. All 12 instances are back on the previous release, so the incident is closed.',
            'The 90 ms repeated-lookup latency, which the rollback has now made permanent.',
            'The cached entries themselves, which survive the rollback and keep answering with CALDERA’s article.',
          ],
          correct: 0,
          explanation:
            'A rollback restores code, not consequences. Two replies are already out, one of them in a customer’s inbox, so the incident continues into notification and tenant follow-up regardless of what the service does now. Calling it closed skips that work. The 90 ms figure is the behaviour from before 41c7 rather than a new regression, so the rollback restored it instead of making it permanent. And the cache lived in the process memory of the instances that were replaced during the rollback, which is why the reads stopped at 12:26.',
          competencies: ['operations'],
        },
      ],
    },
    {
      id: 'fde-v1-bridge-python-reading',
      kind: 'check',
      purpose: 'diagnostic',
      verification: 'machine_verified',
      title: 'Read typed and asynchronous Python',
      summary:
        'Five snippets of the kind a data team hands you: an Optional hint, a coroutine that has to be awaited, a dict reshape, an environment variable with a default, and what an HTTP client call returns. Reading is what is graded — no Python runs on the server, and any Python you run locally is your own note, recorded as self-reviewed.',
      competencies: ['python-reading'],
      estimatedMinutes: 20,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-bridge-python-q1',
          prompt: 'What does this signature promise a caller about the return value?',
          context: {
            language: 'python',
            code: `from typing import Optional


def owner_email(account: dict, fallback: Optional[str] = None) -> Optional[str]:
    email = account.get("owner_email")
    if email is None:
        return fallback
    return email.strip().lower()`,
          },
          options: [
            'It is a string or None, so the caller has to handle None before using it as a string.',
            'It is always a string. `Optional` marks the argument as having a default, not the return.',
            'It is a string unless the function raises; `Optional[str]` means "a str or an exception".',
            'It is None only when `fallback` was passed explicitly.',
          ],
          correct: 0,
          explanation:
            '`Optional[str]` is `str | None`, and the two returns show both: `fallback` when the key is missing, a lowercased string otherwise. The default value on the parameter is the `= None`, which is a separate thing from the annotation. `Optional` says nothing about exceptions. And the None case is the opposite way round: the function returns None when the key is missing and no fallback was passed, whereas passing a fallback is what stops it returning None.',
          competencies: ['python-reading'],
        },
        {
          id: 'fde-v1-bridge-python-q2',
          prompt: 'A colleague calls `collect(client, "northwind")` from ordinary synchronous code. What comes back?',
          context: {
            language: 'python',
            code: `async def fetch_tickets(client, tenant_id: str) -> list[dict]:
    response = await client.get(f"/tenants/{tenant_id}/tickets")
    return response.json()["items"]


def collect(client, tenant_id: str) -> list[dict]:
    return fetch_tickets(client, tenant_id)`,
          },
          options: [
            'A coroutine object. Nothing inside `fetch_tickets` has run, so the annotated `list[dict]` never arrives.',
            'The list of ticket dicts. Python runs the coroutine to completion when a synchronous function calls it.',
            'An empty list, because the awaits inside it have not resolved yet.',
            'A RuntimeError, because an async function cannot be called from a synchronous one.',
          ],
          correct: 0,
          explanation:
            'Calling an `async def` builds a coroutine and runs none of its body; the work starts at `await` or when something like `asyncio.run` drives it. The annotation on `collect` says `list[dict]` and is wrong, which is exactly the kind of thing a type checker catches and the interpreter does not. Python never runs a coroutine implicitly, and the call itself raises nothing: you get the coroutine object, plus a "coroutine was never awaited" warning when it is garbage collected.',
          competencies: ['python-reading'],
        },
        {
          id: 'fde-v1-bridge-python-q3',
          prompt: 'What is `record` after this runs?',
          context: {
            language: 'python',
            code: `raw = {
    "id": "4821",
    "company": {"name": "Brightpier Freight", "plan": "growth"},
    "contacts": [
        {"email": "billing@brightpier.example", "primary": False},
        {"email": "ops@brightpier.example", "primary": True},
    ],
}

record = {
    "id": int(raw["id"]),
    "name": raw["company"]["name"],
    "plan": raw["company"].get("plan", "starter"),
    "primary_email": next(
        (c["email"] for c in raw["contacts"] if c["primary"]),
        None,
    ),
}`,
          },
          options: [
            '{"id": 4821, "name": "Brightpier Freight", "plan": "growth", "primary_email": "ops@brightpier.example"}',
            '{"id": "4821", "name": "Brightpier Freight", "plan": "growth", "primary_email": "ops@brightpier.example"}',
            '{"id": 4821, "name": "Brightpier Freight", "plan": "starter", "primary_email": "ops@brightpier.example"}',
            '{"id": 4821, "name": "Brightpier Freight", "plan": "growth", "primary_email": "billing@brightpier.example"}',
          ],
          correct: 0,
          explanation:
            '`int("4821")` converts the id, so it is a number and not the original string. `.get("plan", "starter")` returns the stored value and falls back to `"starter"` only when the key is absent, and here it is present. The generator inside `next` skips the contact whose `primary` is False and stops at the first one that is True, which is the ops address rather than the first contact in the list; the `None` is the default `next` returns when nothing matches at all.',
          competencies: ['python-reading'],
        },
        {
          id: 'fde-v1-bridge-python-q4',
          prompt: 'The deployment sets `TRIAGE_API_TOKEN` and neither of the other two variables. What happens when this module is imported?',
          context: {
            language: 'python',
            code: `import os

BATCH_SIZE = int(os.environ.get("TRIAGE_BATCH_SIZE", "25"))
API_TOKEN = os.environ["TRIAGE_API_TOKEN"]
TIMEOUT = float(os.getenv("TRIAGE_TIMEOUT_SECONDS", "5"))`,
          },
          options: [
            'It imports cleanly, with `BATCH_SIZE` the integer 25 and `TIMEOUT` the float 5.0, both from the defaults.',
            'It raises KeyError on the first line, because reading a variable that is not set is always a KeyError.',
            'It imports, but `BATCH_SIZE` is the string "25" and `TIMEOUT` the string "5", since environment values are always strings.',
            'It imports, and `BATCH_SIZE` and `TIMEOUT` are None until something assigns them.',
          ],
          correct: 0,
          explanation:
            '`os.environ.get(name, default)` and `os.getenv(name, default)` both return the default when the variable is missing, and the `int(...)` and `float(...)` calls around them convert the string. Subscripting, `os.environ["TRIAGE_API_TOKEN"]`, is the line that would raise KeyError, and it is the one variable the deployment does set. Environment values do arrive as strings, which is why the conversions are there. Nothing here can produce None: `get` was given a default, so it never falls back to one.',
          competencies: ['python-reading'],
        },
        {
          id: 'fde-v1-bridge-python-q5',
          prompt: 'What does `client.get(...)` hand back here, and what does `raise_for_status()` do to it?',
          context: {
            language: 'python',
            code: `import httpx


def fetch_page(client: httpx.Client, cursor: str | None) -> dict:
    response = client.get("/v1/tickets", params={"cursor": cursor} if cursor else None)
    response.raise_for_status()
    return response.json()`,
          },
          options: [
            'A Response carrying the status, the headers and the body together. `raise_for_status()` raises for a 4xx or 5xx and returns quietly otherwise, and the parsed body appears only when `response.json()` is called.',
            'The parsed JSON body. `raise_for_status()` then re-inspects that body for an "error" key and raises if it finds one.',
            'A Response. `raise_for_status()` raises for any status other than exactly 200, so a 204 or a 301 would raise as well.',
            'A coroutine that has to be awaited, because httpx is an asynchronous library.',
          ],
          correct: 0,
          explanation:
            'A Response object holds the status code, the headers and the raw body, and `response.json()` is the separate step that parses the body; a response with a 200 and unparseable body fails there, not before. `raise_for_status()` looks at the status code alone and never at the body. It raises for 4xx and 5xx, so a 204 or a 301 passes through it untouched. And `httpx.Client` is the synchronous client, which returns the Response directly; `httpx.AsyncClient` is the one whose calls you await.',
          competencies: ['python-reading'],
        },
      ],
    },
  ],
  requires: [],
  optional: true,
};
