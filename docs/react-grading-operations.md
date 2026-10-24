# React grading operations

Learner React code never runs in the application server. Coding submissions and
path activities use a fresh Vercel Sandbox without credentials, outbound network
or another learner's files. Infrastructure failures return an error; there is no
in-process fallback. The suite and learner also have separate JavaScript engines
inside the Sandbox.

## Authority inside the VM

The API converts learner TypeScript/JSX to ES2015 CommonJS without evaluating it
(`react-transpile.ts`). The two fetch fixture modules are converted once per
API instance and reused by every Submit. Downlevelled async functions use the private learner
Promise kernel. The API uploads the guest bundle and an input containing compiled
learner/fixture modules, trusted visible/hidden suite and random run nonce.
It reads the guest bundle from the deployment once per instance and uploads
it unchanged on every run. The VM's stop call is sent the moment the verdict
is read and runs after the answer (`waitUntil`, `lib/coding/after-response.ts`).

1. The guest reads and deletes its input before learner execution. It prepares
   jsdom, development React and Testing Library, freezes host intrinsics and
   prints the nonce-bound started marker.
2. Only the trusted suite runs in the Node page realm (`react-runner.ts`). Its
   matchers, assertions, DOM observations, case promises and result are never
   supplied to the learner.
3. The learner runs in QuickJS/WASM (`react-learner.ts`). React hooks, JSX,
   events, refs, timers, deterministic fetch fixtures and selected web APIs are
   capabilities. Only serialized primitive values and private identity records
   cross the boundary; no host JavaScript references cross it. DOM reads/writes
   use explicit allowlists. Prototype chains, implementation symbols, React
   owners/fibers and internal fields are absent. Public values/functions retain
   identity across calls and renders. JSX props are copied into trusted renderer
   data, so React does not freeze learner-owned proxy objects.
4. Learner imports resolve only the React facade, JSX runtime and authored
   training fixtures. Testing Library, tests, assertions, Node modules and result
   functions are unavailable. Dynamic code generation is disabled. Learner
   intrinsics used by the bridge/kernel are frozen; their prototypes belong to
   QuickJS and cannot affect suite intrinsics. Consoles are silent.
5. All learner async work uses a controlled Promise constructor. Host promises
   become controlled deferred values; subscriptions use a private closure rather
   than a replaceable public `then`. The FIFO scheduler observes detached
   rejections, later handling, cancellation and thenable assimilation. Unhandled
   rejections are forwarded to the trusted page's `window` for suites that check
   them. Fixture and suite overrides remain observable. Fetch never defaults to
   the process's real network client.
6. UTC is shared with the browser runners (`coding-utc-time.ts`). Learner local
   dates read UTC regardless of process zone; formatting uses UTC unless a zone
   is explicit. The trusted suite may control clocks/timers; learner changes
   cannot replace that authority.
7. The guest serializes its result from own data descriptors using captured
   functions (`react-guest.ts`). It prints one nonce-bound line. The API accepts
   only that line, verifies shape/size/case count, recomputes counts and rejects
   missing or duplicate results. Files and component logs are never verdicts.

A form that submits without preventing its default fails its case, matching the
browser harness. Thrown values, including empty or unreadable errors, fail rather
than become passes. A crash after the started marker is a learner error; failure
before it remains an infrastructure outage. Code nested too deeply for the
compiler to convert fails as a learner compile error before any VM is requested
(`NESTED_TOO_DEEPLY` in `react-isolated.ts`), so the learner is not told to retry
an outage. Learner components can of course
change their rendered DOM, as any component under test can. The boundary prevents
access to assertion/result authority; it is not a claim that every authored suite
covers every possible incorrect solution or a platform penetration-test claim.

## Resource bounds

- Fresh non-persistent VM per submission, outbound network denied.
- Node heap 256 MB; QuickJS heap 64 MB and stack 1 MB.
- QuickJS bytecode interrupts after 2.5 seconds per synchronous engine call and
  promise flushes stop after 10,000 jobs. Native allocation/GC paths may require
  the external command deadline; internal interrupts are not the only bound.
- Command 10 seconds; request work 22 seconds; VM expiry 25 seconds; cleanup has
  its own 2-second budget. Timers and listeners are cleared on engine disposal.
- The existing roadmap handler allows 45 seconds; Submit waits up to 50 seconds.
  Exactly twelve physical API handlers remain.

## Configuration and rollout

1. Authenticate the Sandbox SDK with Vercel OIDC, or local operator credentials
   `VERCEL_TOKEN`, `VERCEL_TEAM_ID` and `VERCEL_PROJECT_ID`.
2. `npm run prepare:react-snapshot` installs locked production dependencies with
   lifecycle scripts disabled. The snapshot contains only dependencies/Node 24,
   no application code, environment files, submissions or credentials.
3. Configure `REACT_RUNNER_SNAPSHOT_ID` for Production and Preview. Build creates
   the guest and CommonJS SDK bundles and checks packaging with require(ESM) off.
4. Run `npm run test:react-isolation` with that snapshot. Verify a preview Submit
   before production promotion. Runtime dependency changes require a fresh
   snapshot; code-only changes are uploaded with each run and use the current one.
   Retain the previous snapshot for rollback. No billing/plan settings change.

## Verification

`npm run test:react-engine` checks the 183 issued React tasks and every
reference, junior and senior solution they carry, visible and hidden cases
together. CI does not run it. `npm run test:coding` additionally checks untouched
starters, wrong/static variants, time budgets and the rest of the catalogue.

`npm run test:react-authority` checks the private Promise kernel and attacks on
DOM getters/symbols, React internals/exports, imports, intrinsics and synchronous
or asynchronous assertions. It also verifies detached async rejection reporting.
It runs in CI. `npm run test:launch` starts the actual guest bundle with production
flags, checks deletion/nonce/count/serialization, resource exhaustion, UTC in
multiple process zones and representative suites. These local checks do not
replace the real microVM integration check.

`.github/workflows/grading-monitor.yml` checks signed-out production reference and
wrong submissions for `react-counter` and `js-double-numbers` every six hours and
on demand. Missing snapshots/credentials and broken engines fail the workflow.
Anonymous submissions record nothing. `LIVE_GRADING_BASE_URL` selects a preview.
