# React grading operations

Learner React code must never run in the application server. Coding submissions
and learning-path activities use a disposable Vercel Sandbox. The existing
jsdom/React/Testing Library grader runs inside that VM, without application
credentials, network access, or another learner's files. A command timeout kills
synchronous infinite loops; the VM expiry bounds cleanup after a lost connection.
Infrastructure failure returns an error and never falls back to local execution.

## Inside the VM

The API uploads two files per run: the grader bundle
(`lib/coding/generated/react-sandbox.cjs`, built from
`scripts/react-sandbox-entry.ts`) and `input.json`, which holds the component,
the suite with its hidden cases, and a random nonce made for this run.

1. The grader reads `input.json` and deletes it before any learner code runs.
   The hidden cases and the nonce are then only in the grader's memory.
2. The component, the suite and the fetch fixtures run in a separate
   JavaScript realm (a `node:vm` context, `lib/coding/react-runner.ts`). Its
   global object holds the page: jsdom's window and document, timers and a
   short list of web APIs. It has no `process`, `require`, `module` or host
   global object, and `eval` and `Function(...)` are switched off in it, so
   `Function('return this')()` finds only the page. Node itself starts with
   `--disallow-code-generation-from-strings` (`GUEST_NODE_FLAGS` in
   `lib/coding/react-guest.ts`), so a jsdom, React or Testing Library function
   the component can reach cannot compile `return process` through its
   `.constructor` either. Learner code therefore cannot write files, end the
   process, or print the verdict. The component's own `require` resolves React
   and the fetch fixtures but not Testing Library, which it could otherwise
   reconfigure (an `asyncWrapper` that skips every `waitFor`, for example).
   Both consoles it can reach, its own and jsdom's `window.console`, go
   nowhere.
3. The component still reaches objects of the grader's own realm: React's
   exports, jsdom's document, the timers. One step up their prototype chains
   are the built-ins that the test runner, the matchers and the result
   printer use. Until September 29 a component could put a `toJSON` on the
   grader's `Object.prototype` and have `JSON.stringify` print every case,
   hidden ones included, as passed; its own `String.prototype.split` did the
   same before the result was printed. So once jsdom, React and Testing
   Library are loaded, and before the suite or the component runs, the grader
   freezes every standard built-in of its realm and pins the global names to
   them (`lib/coding/realm-lockdown.ts`). A change to one of them throws, and
   the run reports it as a compile error. Ordinary code can still give its
   own object a `toString`, `constructor`, `name` or `message`, and React can
   still switch `Error.prepareStackTrace` off and back on; nothing else can
   set it. `npm run test:coding` proves every React solution and probe under
   the same lockdown.
4. The grader follows each case's promise with the page realm's own
   `Promise.prototype.then`, captured before the suite ran. A component that
   replaced `then` in its realm otherwise ended every async case at once, as
   a pass.
5. The grader prints the result on stdout as one line that starts with the
   nonce. It writes that JSON itself from the result's own data properties,
   with functions captured before any learner code ran
   (`serializeGuestResult` in `lib/coding/react-guest.ts`): no `toJSON`,
   getter or inherited field is read, and a result of any other shape ends
   the run. The API takes only that line from the command's stdout and never
   reads a file from the VM; a `result.json` left behind means nothing. A
   missing or repeated line, a malformed result, or a case count different
   from the number of `test(` and `it(` calls in the suite that ran (visible
   and hidden together) is a runner error, never a verdict. Pass counts are
   recomputed from the cases.

## Configuration

1. Authenticate the Sandbox SDK with Vercel OIDC. Local operators may instead
   provide `VERCEL_TOKEN`, `VERCEL_TEAM_ID` and `VERCEL_PROJECT_ID`.
2. Run `npm run prepare:react-snapshot`. It uploads only package manifests and
   installs the locked production dependencies with lifecycle scripts disabled.
   The snapshot does not expire automatically. No application code, `.env` files,
   user submissions or credentials are included.
3. Set the returned `REACT_RUNNER_SNAPSHOT_ID` on the devShark Vercel project for
   Production and Preview. It is a server-only variable.
4. Build normally. `build:react-runner` creates the current guest bundle and a CommonJS SDK bundle;
   its build check disables Node require(ESM) to match the deployed runtime. Vercel
   includes both in the existing roadmap function. No thirteenth API is added.
5. Run `npm run test:react-isolation` with the selected snapshot and credentials.
   This integration check creates disposable VMs and exercises credential/network
   isolation, the page realm (no `process`, `require`, input file or code
   generation), a forged `result.json` and verdict line, representative suites
   and a synchronous infinite loop. `npm run test:launch` runs the same guest
   bundle locally, without a VM, on every CI run.
6. Verify a preview submission before promoting the application.

Create a fresh dependency snapshot whenever the root lockfile's runtime
dependencies change. Code-only grader changes are included in the build and do
not require a new snapshot: the snapshot holds only `node_modules` and the
Node 24 runtime, and the grader bundle is uploaded with every run. That covers
the September 29 changes to the page realm, the nonce line, the deleted
input, the frozen built-ins and the hand-written result, which need no new
snapshot. Delete obsolete dependency snapshots after
a verified rollout; retain the previous one while rollback remains possible.

## Resource limits and evidence

- Fresh, non-persistent VM for every submission, outbound network denied.
- Node heap: 256 MB; command: 10 seconds; request work: 22 seconds;
  VM expiry: 25 seconds. Cleanup has a separate 2-second budget.
- The existing roadmap function allows 45 seconds, leaving room for database
  persistence and response delivery. Coding Submit waits up to 50 seconds.
- Returned data is size/shape checked, must carry the run's nonce and the
  suite's case count, and pass counts are recomputed.
- A challenge may keep hidden test cases beside its solution (`hiddenSuite`).
  Submit appends them to the visible suite (`lib/coding/react-hidden.ts`); they
  decide the verdict, and the response carries only their count. The input
  file that carries them is deleted before the component loads, but they run
  in the same realm as the component, so they stay out of the page, not out of
  reach of a component written to go looking for them.
- A case that threw has failed, even when the error carries no message;
  mini-jest on its own read an empty message as a pass.
- A promise rejection the component leaves unhandled is ignored while a suite
  runs, as the browser does, instead of ending the grader process. The page
  realm has no `process`, so the grader reports each one on `window` as an
  `unhandledrejection` event, where a suite that checks for them listens.
- This boundary protects the application host and credentials, and it stops
  a component from forging its verdict through the filesystem, the process,
  stdout, the printed result or the grader realm's built-ins. It is not a
  claim of comprehensive adversarial grading integrity or platform
  penetration testing. The suite shares its page realm with the component,
  whose built-ins stay writable (suites replace `Date.now` there, for
  example), and the component can reach jsdom and React objects the test
  helpers also use, which are not frozen. So a component written to tamper
  with what one case reads can still influence that case. jsdom can read
  files that exist in the VM (an `XMLHttpRequest` to a `file:` URL, for
  example); once the input is deleted nothing there is secret.

The September 15 audit created and tested the dependency snapshot and configured
both environments on `react-express-app`. No plan or billing settings changed.
Sandbox execution consumes the project's existing Sandbox allowance; monitor
usage and concurrency as part of the launch load test.

## Production check

`.github/workflows/grading-monitor.yml` runs `npm run check:live-grading`
every six hours and on demand. It opens `react-counter` and
`js-double-numbers` on `https://devshark.app` as a signed-out visitor, submits
each task's reference solution (the verdict must be `passed`) and a wrong
solution that compiles (it must be `failed`), and fails the run with the HTTP
status and the start of the body when either answer differs. A snapshot the
Sandbox can no longer start, missing credentials or a broken QuickJS worker all
show up as a failed run. Anonymous submits record nothing. The script retries
once after a network error or a 429; `LIVE_GRADING_BASE_URL` points it at
another deployment, and `npm run test:live-grading` runs it against a local
stub.
