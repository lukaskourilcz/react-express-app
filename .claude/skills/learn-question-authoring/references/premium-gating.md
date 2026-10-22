# Premium gating reference

Shared by `learn-question-authoring`, `coding-task-authoring` and the learning-path skill of issue C4. Read it before you add content a learner starts, change what the free tier opens, or touch a 402 path. Every rule names the file it comes from; when a rule here and the code disagree, the code wins and this file is stale.

## One contract

- `shared/tiers.ts` (header) is the only place that says what the free tier includes. CLAUDE.md, "Protected behavior", says the same: the server refuses locked content with 402 and the client only mirrors it.
- `shared/tiers.ts` stays pure: it imports from `./` only. `scripts/test-launch-contracts.ts` `tierContracts`, check 1, fails on any other import.
- Premium changes which content a learner may start and nothing else. Grading, explanations, XP, scores, streaks, ranks, leaderboards and matchmaking read no tier (`shared/tiers.ts` header; CLAUDE.md). `tierContracts` keeps an allowlist, `tierReaders`, of the server files that may import `shared/tiers` or `lib/access` or call `refuseLocked`/`resolveTier`, and asserts that `lib/coding/grade.ts`, `api/leaderboard.ts`, `api/quiz/submit.ts`, `api/play/[action].ts`, `api/quiz/daily.ts` and `api/quiz/challenge.ts` read no tier. A new gate in another file means extending that allowlist on purpose, in the same change.

## What can be gated

`GatedContent` in `shared/tiers.ts` lists the kinds: `learn-level`, `learn-part-test`, `coding-task`, `evolving-stage`, `learning-path` and `merch-redemption`. `contentTier(content, index)` decides each one:

| Kind | Rule in `contentTier` | Where the data lives |
|---|---|---|
| `learn-level` | Free for every topic in `FREE_LEARN_TOPICS` (`html`, `css`, `javascript`); free up to `FREE_LEARN_LEVELS[topic]` (`react: 12`, `dsa: 2`); Premium otherwise | `shared/tiers.ts` |
| `learn-part-test` | Free for a `FREE_LEARN_TOPICS` topic; Premium when any level in the part is Premium (`partRanges` from `shared/progression.ts`) | `shared/tiers.ts`, `shared/progression.ts` |
| `coding-task` | Free when the index row carries `free: true`; an evolving stage falls through to the stage rule | `shared/coding-index.ts`, generated |
| `evolving-stage` | Free for the first `freeStageCount(stages)` stages, Premium after | `shared/tiers.ts` `freeStageCount`, `shared/evolving.ts` |
| `learning-path` | Premium in full | `shared/tiers.ts` |
| `merch-redemption` | Premium | `shared/tiers.ts` |

Unknown content is Premium, so a gap in the index can only lock, never open (`contentTier` doc comment). `isOpenTo(tier, content, index)` answers "may this tier start it" with the same function.

A Learn question carries no tier of its own: its level does. Adding a question to a level never changes what the free tier opens. Changing `FREE_LEARN_TOPICS` or `FREE_LEARN_LEVELS` does, and `tierContracts` pins today's values (`FREE_LEARN_LEVELS.react === 12`, `FREE_LEARN_LEVELS.dsa === 2`, React level 13 Premium). Epic E raises `FREE_LEARN_LEVELS.dsa` to 5 (`docs/learn-sections-fde-flagship-plan.md`, section 9, E3); that change edits the contract and its assertions together.

## The free coding list

- `FREE_CODING_TASK_IDS` (`shared/tiers.ts`) is the one list of free standalone tasks. `npm run build:coding-index` projects it into `shared/coding-index.ts` as `free: true` through `isFreeCodingTask`, so no task file carries the flag (`FREE_CODING_TASK_IDS` doc comment). Re-pick this list when the catalogue grows, never the task files (`docs/product-architecture.md`, free tier paragraph).
- Keep every id already listed: a learner on the free plan may have started it (`FREE_CODING_TASK_IDS` doc comment).
- The share of issued tasks with `free: true` stays within `FREE_CODING_SHARE` (`min 0.16`, `max 0.22`, `target 0.19`). `tierContracts` check 2 fails outside the band.
- `tierContracts` also asserts: every listed id exists in the coding index and appears once; the list holds standalone tasks only, never an evolving stage; every free task whose label is derived from its tier reads Easy; the first tier-1 task of each technique group in each section track is free.
- Evolving stages are free by rule, not by list: `freeStageCount` opens the head of each stage list (three stages of a ten-stage project, two of a FullStack app, one of a short path). `tierContracts` walks every project as a free account and checks the Terms copy (`legal.terms.plans.free` in `client/src/i18n/translations.ts`) names those stages.
- The counts written in prose ("144 of 754", "754 issued", the Easy, Medium and Hard split) live in `shared/tiers.ts` (the `FREE_CODING_TASK_IDS` comment and the `freeCodingCounts` doc comment), `README.md` (the freemium paragraph, "Current content" and the Coding section bullet), `about-project.md`, `docs/product-architecture.md` (the coding catalogue, free tier and evolving-project paragraphs), `docs/interactive-content-manifest.md` and `docs/learn-sections-fde-flagship-plan.md` (the current-state table). No test reads them. Every newly issued task raises the issued total (754 today) even when the free list stays the same, and a new free task raises the free count too; update them in the same change. The per-track splits next to them (JavaScript, TypeScript, React and Algorithms) move with the track of the new task.

## The server

`lib/access.ts` enforces the contract. Handlers call `refuseLocked(res, userId, content, { cleared })` where a learner starts something (`api/quiz/roadmap.ts`, `lib/coding/handlers.ts`, `lib/coding/practice-handlers.ts`, `lib/learning-paths/handlers.ts`, `lib/rewards/handlers.ts`). Three rules from its header hold at every call site:

1. A signed-out visitor holds the free tier only. Premium content gets the same 402 a free account gets (`assertOpen`: no `userId` means `PremiumRequiredError`).
2. Free content costs no query. `assertOpen` returns before `resolveTier` when `contentTier` says free, and `resolveTier` calls `is_premium` at most once per request (`requestMemo`).
3. Content the learner already cleared stays open. `options.cleared` runs only after the tier said no, so a lapsed account can review what it passed.

When the plan cannot be read, `refuseLocked` answers 503 `entitlement_unavailable` and never guesses (`EntitlementUnavailableError`). A database without the `is_premium` routine reads as free (`resolveTier`, `isRpcMissing`).

`jsonPremiumRequired` in `lib/http.ts` writes the 402: `{ error: { code: 'premium_required', message, kind, ref, requestId } }` with `Cache-Control: private, no-store`. `gatedRef` in `shared/tiers.ts` builds `ref` (`react:13`, `react:part-2`, a task id, `challenge:2`). `tierContracts` check 7 asserts the exact body.

## The client mirror

- `client/src/lib/locks.ts`: `useLocks` draws locks from the same `contentTier`, fed by `clientContentIndex` (the generated `CODING_INDEX`, `EVOLVING_CHALLENGES` and the loaded level counts). `lockOf` returns `open`, `locked`, `preview` (a guest on Premium content) or `unknown` (plan not loaded, or offline). `isBarred` is true for `locked` and `preview` only; `unknown` lets the server decide.
- `client/src/lib/api.ts`: a 402 whose code is `premium_required` opens the upgrade sheet through `openUpgradeSheet({ kind, ref, fromResponse: true })`, then throws `ApiError`. `isPremiumRequired(err)` tells callers apart from other errors.
- `client/src/lib/upgradeSheet.ts` holds the one sheet; `client/src/components/UpgradeSheet.tsx` renders it and reads `premium.sheet.kind.<kind>` from `client/src/i18n/translations.ts`. A new `GatedContent` kind needs that key.
- Copy about Premium shows the price before VAT and says that VAT is added at checkout: 4.99 EUR a month or 59.88 EUR a year (`PREMIUM_PRICE` in `shared/tiers.ts`, `taxBehavior: 'exclusive'`; `docs/product-architecture.md`, "Tiers and billing"). `npm run check:public` fails when the built `/premium` page lacks `before VAT` or says `VAT included` (`scripts/check-public.mjs`, the `/premium` block).
- Copy about Premium never promises XP, ranks or streaks (`shared/tiers.ts` header; `.claude/commands/review-copy.md`, step 3).

## Billing tests

- `npm run test:billing` runs the real billing handlers against a fake Stripe API and an in-memory model of the migration 039 routines (`scripts/test-billing.ts` header).
- `npm run test:sql` runs `supabase/tests/*.test.sql` against an empty Postgres (`scripts/test-sql.mjs` header gives the Docker command and `DATABASE_URL`). The plan tests are `050-voucher-once`, `160-billing-premium-grace`, `161-billing-live-subscription`, `164-revoke-premium-benefits` and `165-billing-deleted-account`. `supabase/tests/known-failures.txt` only shrinks.
- Content work (a question, a task, a free-list pick) touches no billing routine, so these two run only when a change reaches `lib/billing/`, `lib/entitlements.ts`, `is_premium` or a migration.

## Validation

| Command | What it proves |
|---|---|
| `npm run test:launch` | `tierContracts`: purity, the free share, the free list, the free stages and the Terms wording, the tier-reader allowlist, the 402 body, and the guest and free-account 402s from the real handlers |
| `npm run test:coding-auth` | Saving a Premium coding task as a free account answers the shared 402 `premium_required` (`scripts/test-coding-authorization.ts`) |
| `npm run test:billing` | Checkout, webhooks, grants and the portal against a fake Stripe; run when billing code changes |
| `npm run test:sql` | The billing and voucher routines in real Postgres; run when a migration or billing routine changes (needs Docker) |
