# Launch audit — 15 September 2026

> devShark is English only: the second language described below was removed on 21 October 2026 (owner decision).

Branch: `codex/launch-challenge-audit`.

## Outcome and scope

The audit found reproducible runner defects, repaired the evolving challenge
flows, split their work into smaller stages, and added regression coverage.
This is not a certification that the entire product is bug-free. Production
promotion and the remaining operational/security acceptance work are separate
gates, tracked in [#190](https://github.com/lukaskourilcz/react-express-app/issues/190)
and [#191](https://github.com/lukaskourilcz/react-express-app/issues/191).

## Fixed findings

| Finding | Correction and evidence |
|---|---|
| React restarts/unmounts could strand a pending run or dispatch an obsolete run after readiness | Every pending promise settles; generation checks cancel stale runs. Three lifecycle regressions reproduce the previous failures. |
| Form-based React/full-stack exercises failed locally even with reference solutions | Permit native form events in the opaque-origin iframe; block form navigation with CSP in production and local preview. The complete React browser harness passes. |
| The local-storage hook exercise threw in an opaque-origin frame | Per-frame, per-run in-memory Storage; no access to account storage. |
| Correct `undefined` results became `null` in server expectations | Lossless expectation generation handles undefined, nested values and special numbers. Actual QuickJS grading now passes the full JS/TS reference catalogue. |
| React Submit displayed stale local results and hid server startup errors | Show the server verdict/results after Submit, including its actionable error. A new local Run returns to local results. |
| Submitted React source ran in the credential-bearing API process | Both Coding and learning paths now use disposable, network-denied Vercel Sandbox microVMs. No unsafe local fallback. Representative suites, credential/network isolation and external infinite-loop termination passed. See the remaining integrity limit below. |
| Coding sessions were not checked against their issuing account at submit/reveal | Reject a bound session from another account before grading or database access; also scope linked roadmap attempt lookups to the authenticated user. |
| Stage workloads were oversized | 13 evolving projects now have 136 stages: 10 per single-track project and 12 per full-stack project, adding 62 checkpoints. Existing IDs/drafts remain; old milestone passes cover new prerequisites without extra XP. |
| Workbench accessibility | Fixed the hints group role and editor line-number contrast; Axe checks pass in both themes. |
| Stage navigation on phones | Compact numbered controls retain full accessible labels and scroll horizontally, keeping the brief reachable with 10–12 stages. |
| Workbench heading/product identity | Standalone tasks expose an h1, embedded lesson tasks retain h2, and the home link names the current product in EN/CS. |
| Deployed React grading failed while loading the Sandbox SDK (`ERR_REQUIRE_ESM`) | Build a CommonJS SDK bundle and verify it with require(ESM) disabled. Module-load failures now also return retryable grading feedback; operational logs expose safe error categories. |
| Local preview could not boot the opaque-origin React module | Preview allows Origin:null for its public assets, matching the production sandbox's cross-origin serving behavior. |

Checkpoints separate, for example, initial data loading from loading/error
handling, form inputs from POST submission, and basic computation from later
validation. Requirements and tests remain cumulative. Checkpoint reference
solutions currently reuse the next full milestone implementation; their tests
and briefs require only the smaller checkpoint contract.

## Verification evidence

- Full content/reference audit: **385 tasks** (140 JavaScript, 84 TypeScript,
  116 React, 45 system design). JS/TS references also run through actual QuickJS.
- Actual built React iframe: **129 assertions**, covering all suite-backed
  React references plus the message protocol and origin boundary.
- Client regressions: **42 tests passed**, including complete draft handoffs
  through all 13 projects and the full-stack language boundary.
- API types, launch contracts and learning-path content checks passed. The
  learning paths retain 10 DSA modules and 11 FDE modules.
- Both production dependency audits: **zero vulnerabilities**. Unused-code
  check: no new findings; three pre-existing inventory findings remain.
- Exactly **12 API handlers** remain.
- Production devShark responsive sweep: 93 probes across 31 routes at
  360/768/1440. One apparent footer overlap disappeared on the settled-page
  recheck; the script now accounts for late content growth.
- Local StudyShark responsive sweep: **93/93 passed**. Its five bilingual,
  light/dark public-guide browser checks also passed, including no-JavaScript
  rendering.
- devShark built-browser checks: **9/9 passed**. Both languages and themes cover
  the 360px pending-for-desktop state, 1440px editing, stage advancement, rerun,
  Enter-key form submission and zero Axe WCAG A/AA findings in the workbench.
  Public-guide checks include no-JavaScript rendering. The workbench retains the
  existing product decision to defer full code editing on narrow screens.
- Additional devShark dark/Czech responsive sweep: **63/63 passed** across nine
  routes and seven widths (360–1440px). Public HTML checks passed for 11 URLs;
  initial compressed JS/CSS was 219,943 bytes against the 243,000-byte budget.
- Full remote CI passed for both products on `a0e332a` ([run](https://github.com/lukaskourilcz/react-express-app/actions/runs/35025211720)), including browser, component, and performance checks. The first preview exposed missing Preview product
  variables: it defaulted to StudyShark and rejected coding requests. The six
  product/scope/canonical settings are now configured for devShark Preview.
  Production product settings were not changed.
- Deployed API acceptance on `a0e332a`: **13/13 passed**, submitting the first
  stage of each evolving/full-stack project with its reference solution. All
  three React submissions exercised the deployed OIDC-authenticated VM runner
  (approximately 7–8.5 seconds including CLI transport); JavaScript/TypeScript
  submissions passed too. Anonymous results awarded zero XP and did not persist
  progress. Preview: [verified deployment](https://react-express-m8gtydk9f-lukas-kourils-projects.vercel.app).
- The six real VM integration checks also passed with require(ESM) disabled,
  including forms, local storage, full-stack stockroom, no host credentials,
  denied network access and external termination of a synchronous infinite loop.
  The build now checks SDK loading with that restriction to prevent recurrence.

## Live account and database

The owner explicitly authorized their existing signed-in browser session.
Calculator stage 1 submitted successfully (visible and hidden tests), awarded
35 XP, and advanced with its code preserved. Stage 2 ran and correctly exposed
the existing solution's missing decimals/operator precedence; it did not hang.
The live React form reproduced the browser submit-event failure and an opaque
server-error display, both addressed above. The form's test draft remains saved.

Supabase migrations were present through `friend_nationality_flag`. Security
advisors returned no warning/error findings; public tables have RLS enabled,
client policies are ownership-scoped reads, and privileged mutation functions
are not executable by anonymous/authenticated database roles.

A live transaction exercised duplicate-attempt idempotency, preserving a pass
after a later failure, draft upsert and account separation. Assertions passed;
**all synthetic writes were rolled back**, with no XP awarded. This is not a
backup-restore drill or a production concurrency/load test.

## Remaining gates at the original audit

Update: PR #192 subsequently merged to main and deployed. The
[September 16 follow-up](./launch-hardening-2026-09-16.md) records the QuickJS
integrity fix, completed multi-account/deletion/browser checks, bounded load
measurements and accepted recovery targets. The following preserves the
original audit's status; use the follow-up and release matrix for current gates.

- **Grading integrity:** isolation protects the application host, but the guest
  still runs learner code and the suite in one Node process. Hostile source can
  potentially interfere with the result producer. Do not claim abuse-resistant
  grading; harden and adversarially test that boundary ([#191](https://github.com/lukaskourilcz/react-express-app/issues/191)).
- **Operations:** restore drill/RPO/RTO, delivered uptime alerts, load/concurrency
  validation, disposable-account deletion, two-account multiplayer/Classroom,
  and physical-device/browser coverage remain unverified ([#190](https://github.com/lukaskourilcz/react-express-app/issues/190)).
- Existing Windows flag rendering issue [#188](https://github.com/lukaskourilcz/react-express-app/issues/188)
  remains a known presentation difference. Full human editorial review of all
  non-coding learning content remains tracked in [#176](https://github.com/lukaskourilcz/react-express-app/issues/176).
- No production promotion, destructive account operation, billing change or
  production restore is implied by pushing this branch.

The tested dependency snapshot is configured for devShark Production and
Preview, with OIDC already enabled. The new code takes effect only when deployed.
See [React grading operations](./react-grading-operations.md) for refresh and
rollback requirements.
