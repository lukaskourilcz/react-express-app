# React grading operations

Learner React code must never run in the application server. Coding submissions
and learning-path activities use a disposable Vercel Sandbox. The existing
jsdom/React/Testing Library grader runs inside that VM, without application
credentials, network access, or another learner's files. A command timeout kills
synchronous infinite loops; the VM expiry bounds cleanup after a lost connection.
Infrastructure failure returns an error and never falls back to local execution.

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
   isolation, representative suites and a synchronous infinite loop.
6. Verify a preview submission before promoting the application.

Create a fresh dependency snapshot whenever the root lockfile's runtime
dependencies change. Code-only grader changes are included in the build and do
not require a new snapshot. Delete obsolete dependency snapshots after a verified
rollout; retain the previous one while rollback remains possible.

## Resource limits and evidence

- Fresh, non-persistent VM for every submission, outbound network denied.
- Node heap: 256 MB; command: 10 seconds; request work: 22 seconds;
  VM expiry: 25 seconds. Cleanup has a separate 2-second budget.
- The existing roadmap function allows 45 seconds, leaving room for database
  persistence and response delivery. Coding Submit waits up to 50 seconds.
- Returned data is size/shape checked and pass counts are recomputed.
- A challenge may keep hidden test cases beside its solution (`hiddenSuite`).
  Submit appends them to the visible suite (`lib/coding/react-hidden.ts`); they
  decide the verdict, and the response carries only their count. They run in
  the same VM as the learner's component, so they stay out of the page, not out
  of reach of a component written to go looking for them.
- A promise rejection the component leaves unhandled is ignored while a suite
  runs, as the browser does, instead of ending the grader process.
- This boundary protects the application host and credentials. It is not a
  claim of comprehensive adversarial grading integrity or platform penetration
  testing. The suites execute alongside learner code inside the guest.

The September 15 audit created and tested the dependency snapshot and configured
both environments on `react-express-app`. No plan or billing settings changed.
Sandbox execution consumes the project's existing Sandbox allowance; monitor
usage and concurrency as part of the launch load test.
