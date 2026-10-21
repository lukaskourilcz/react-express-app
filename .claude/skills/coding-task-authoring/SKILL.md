---
name: coding-task-authoring
description: Add or edit a coding task with a server-only solution, hidden tests, the free list, the curation row and the browser index. Use for any change under lib/coding/tasks/, lib/coding/solutions/, FREE_CODING_TASK_IDS or shared/coding-index.ts.
---

# Coding Task Authoring

The coding review gate is on: since the 17 October 2026 wave, a new task, or a task whose brief, tests, solution or grader changed, stays withheld until the ledger holds a passing review of its exact version (`docs/curation-claims.md`, "The gate, applied once"; `CODING_TASKS_AUDITED` in `lib/curation-registry.ts`). This skill takes a task from source to issued. Premium rules live in [../learn-question-authoring/references/premium-gating.md](../learn-question-authoring/references/premium-gating.md); the ledger row template lives in [../learn-question-authoring/references/ledger-row.md](../learn-question-authoring/references/ledger-row.md).

## Read first

`lib/coding/types.ts` (`CodingTaskSource`, `CodingSolution`), `lib/coding/catalog.ts`, `lib/coding/active.ts`, `lib/coding/solutions/index.ts`, `shared/coding-catalog.ts`, `shared/tiers.ts`, `shared/evolving.ts`, `shared/coding-complexity.ts`, and the header of `scripts/test-coding-content.ts`. Then read the task file you will extend and its solution file of the same name.

## Where a task lives

- Body: a `CodingTaskSource` in `lib/coding/tasks/<file>.ts`. Prompts, starters, visible tests and hints only; no solution (`lib/coding/tasks/easy-javascript-c.ts` header).
- Solution: a `CodingSolution` keyed by task id in `lib/coding/solutions/<same file name>.ts`, registered in `AUTHORED` in `lib/coding/solutions/index.ts`. The directory is server-only: `lib/coding/catalog.ts` never imports it, and the launch contracts fail when anything under `client/` does (`lib/coding/solutions/index.ts` header).
- A new file of tasks joins `EASY_BAND` or `MEDIUM_HARD_BAND` in `lib/coding/catalog.ts` (or `sources` for a Learn-level file), and its solutions join `AUTHORED` in the same order.

Pick the file by what the task is for:

| Purpose | File | Rules from `scripts/test-coding-content.ts` |
|---|---|---|
| Fill a Learn level's quota | `tasks/javascript.ts`, `typescript.ts`, `react.ts`, and `tasks/dsa-foundations.ts` for the DSA levels; only the topics in `LEARN_CODING_TOPICS` (`shared/coding-catalog.ts`) seal coding into a level, and `levelCodingTasks` in `lib/coding/active.ts` holds back the DSA levels in `DSA_LEVELS_AWAITING_E3` | `tasksForLevel` takes the first tasks of a level in catalogue order (track, level, tier, authored order), so a new tier-1 task here can replace the task a level has always asked for (`tasksForLevel` doc comment in `lib/coding/active.ts`) |
| Easy practice in the Coding section | `tasks/easy-<track>-<wave>.ts` in `EASY_BAND` | tier 1 or 2 with no `difficulty`; at most two focus tags; 10 minutes or less; `verify: 'tests'`; the first focus tag has a documentation page; a hint and at least two `approach` steps; at least three hidden checks; never in a Learn quota |
| Medium or Hard practice | `tasks/medium-hard-<track>-<wave>.ts` in `MEDIUM_HARD_BAND` | tier 3 or 4 (5 for a React capstone); two to four focus tags, each behind `COVERAGE_MIN_EASY` Easy tasks of the track; more than 10 and at most 45 minutes; a hint, at least three `approach` steps and a `skeleton`; at least five visible and four hidden checks |
| A stage of an evolving project or short path | the spec files `tasks/evolving*.ts`, `tasks/paths*.ts`, `tasks/fullstack.ts` | see "Evolving stages" below |

New band files are English only (`EASY_BAND` doc comment in `lib/coding/catalog.ts`).

## `CodingTaskSource` fields

- `id`: `^(js|ts|react|sd|dd|alg)-[a-z0-9]+(-[a-z0-9]+)*$`, at most 64 characters (`isCodingTaskId` in `shared/coding-catalog.ts`). Ids are permanent: drafts, passes, XP receipts and ledger rows key on them.
- `track` and `topic`: `topic` equals `track`, except a DSA Foundations task, which sits on the `algorithms` track with topic `dsa` (`dsa-advanced` from E4) and a level from 1 to 15 (`scripts/test-coding-content.ts`, "topic must match the track"). Only such a task carries `topic` into the index summary.
- `level`: 1 to 25, the Learn level whose technique the task practises.
- `tier` and `difficulty`: the label comes from `TIER_DIFFICULTY` (1 and 2 Easy, 3 Medium, 4 and 5 Hard). Set `difficulty` only where the derived label would mislead, and it must fit the tier (`difficultyFitsTier`).
- `focus`: tags from `CODING_TECHNIQUES`; the first tag picks the documentation page that ends the hint ladder (`docsFor` in `shared/coding-docs.ts`). That page must be on `developer.mozilla.org`, `www.typescriptlang.org` or `react.dev`, and a page about one Array or String method, Map or Set must name an API a solution uses (`OFFICIAL_DOCS`, "the last hint rung").
- `prompt`, `starter`, `skeleton`, `hints`, `approach`: the starter must fail its own checks; a skeleton must not pass every check either. Code in prose uses straight quotes; curly quotes fail.
- `verify: 'tests'` with `tests`: at least four calls and at least one `edge: true`; a TypeScript task also needs two `typeTests`; a React task needs a `suite` with `test(` blocks.
- `estimatedMinutes`: positive, inside the band's limit.

## Solutions and hidden checks

- `solution` is the reference a learner sees after giving up. `junior` and `senior` are two more ways, shown only after a server-verified pass; all three pass every visible and hidden check, and junior and senior must differ (`CodingSolution` doc comment; "Every graded code task carries three solutions"). An evolving checkpoint (`…-start`) carries the reference alone.
- `hiddenTests` (`hiddenTypeTests` for TypeScript, `hiddenSuite` for React, with no imports) aim at the shortcuts the visible set leaves open. `test:coding` fails when a function returning one constant, or a lookup table of the visible answers, passes every check.
- Comments in `junior` and `senior` are stripped before they ship; the reference keeps them (`boardCode` in `lib/coding/solutions/index.ts`).

## The complexity target sentence

`complexityGuidance` in `shared/coding-complexity.ts` reads the target from `prompt` only when the task has `tests` and its track is not `react` or `system-design`:

- Write `Target: O(...)` followed by `time`, `calls`, `checks`, punctuation or the end of the prompt, for example `Target: O(n) time and O(1) extra space, where n is the number of items.` After the time target, an `O(...)` followed by `space` or `extra space` becomes the space target.
- `inspectComplexity` in `lib/coding/complexity.ts` can compare only `O(1)`, `O(log n)`, `O(n)`, `O(n log n)`, `O(n²)` and `O(n^k)`. Any other target, such as `O(n*m)`, still shows, and the estimate reports unknown.
- An estimate above the target pays `CODING_ABOVE_TARGET_XP` (15) instead of `CODING_PASS_XP` (25); correctness never depends on it.
- Define what `n` counts in the brief. The coding wave recorded a missing input-size definition as a defect in the rows' `defects` arrays, for example `js-easy3-hide-banned` ("String domains and input-size/cost units were implicit.") and `ts-easy3-next-light` in `docs/audit/devshark-content-ledger.json`.

## Evolving stages

- Stage ids come from the helpers in `shared/evolving.ts`: `<project>-<n>-start` and `<project>-<n>` for a ten-stage project, `<path>-<level>` for a short path, `<js|ts|react>-fullstack-<slug>-<n>` for a FullStack app. A checkpoint is any id ending in `-start` (`isEvolvingCheckpoint`). Never rename a stage.
- A stage keeps the earlier stages' requirements and checks after its new ones (`scripts/test-coding-content.ts`, "earlier runtime checks remain, after the new ones"). A checkpoint is a five-minute step with a first hint and method steps of its own.
- The free tier opens the head of each stage list (`freeStageCount` in `shared/tiers.ts`). Adding, moving or removing a stage at the head changes what a free account reaches; `tierContracts` in `scripts/test-launch-contracts.ts` pins three free stages per ten-stage project, two per FullStack app and one per short path.

## Learn coverage

Every JavaScript, TypeScript and React level from 1 to 25 needs at least one task in `tasksForLevel` (`scripts/test-coding-content.ts`, "Learn coverage"). `levelTaskQuota` asks one task of levels 1 to 5, two of 6 to 15 and three of 16 to 25 (`lib/coding/catalog.ts`). Checklist tasks, repair (`debug`) tasks, evolving stages and both bands never count toward a level.

The DSA levels have tasks too (E2, #493): `lib/coding/tasks/dsa-foundations.ts` holds the DSA path's exercises with topic `dsa`, and `tasksForLevel('dsa', n)` serves levels 1 to 14 (level 15, the foundation review, has none). `levelCodingTasks` seals none on levels 1, 2, 10, 11 and 14 until E3 re-sequences the topic (`DSA_LEVELS_AWAITING_E3`); E3 deletes that set and adds `learn` to the six ledger rows on levels 10, 11 and 14. Their checks are self-contained call expressions built by `lib/coding/tasks/dsa-probes.ts`, which count through `__probe` only, and their flawed variants are known wrong answers in `scripts/fixtures/dsa-foundations-known-answers.ts`, one for every critical criterion of the source path exercise. A DSA-flavoured task that belongs to no DSA level stays on the `algorithms` track with `topic: 'algorithms'`.

## The free list

- A new task is Premium unless you add its id to `FREE_CODING_TASK_IDS` in `shared/tiers.ts`. Never put a `free` flag in a task file; `npm run build:coding-index` projects the list.
- Keep the free share inside `FREE_CODING_SHARE` (16 to 22 %), keep every id already listed, and list standalone tasks only. The details and the contracts are in the Premium reference.

## The curation row

`taskHash(task, solution)` in `lib/curation.ts` covers the brief, starter, skeleton, hints, approach, visible and hidden tests, reference, junior and senior code, approaches and puzzle. Changing any of them, including one hidden test, supersedes the review.

## Procedure

1. Write the task and its solution; register a new file in `lib/coding/catalog.ts` and `lib/coding/solutions/index.ts`.
2. Prove it while authoring: `CODING_ONLY='^<id>$' npm run test:coding`. `CODING_ONLY` limits the solution proofs to matching ids, which takes seconds instead of the full run's twenty minutes; the shape checks still cover every task. Until the ledger row exists, a band task fails with exactly one problem, `<id>: an Easy-band task must be issued` (or `a Medium or Hard band task must be issued`); fix anything else it reports. Leave `CODING_ALLOW_LEVEL_GAPS` and `CODING_SKIP_INDEX` unset before you report.
3. Read the hash: `npm run audit:devshark-inventory -- --out "$TMPDIR/inv"`, then `jq '.codingTasks[] | select(.id == "<id>") | {contentHash, active}' "$TMPDIR/inv/inventory.json"`.
4. Review the task and write its row from the ledger template, with the grader evidence of step 2. An edited task gets `revision` plus one, its old hash in `previousHash` with `previousHashSchema: "task-hash:v2"`, and a `verification.verdict` of `accept` or `amend`.
5. Run `npm run build:curation-registry`, then `npm run build:coding-index`. The index lists active tasks only, so it must be rebuilt after the registry.
6. Rerun step 3 and confirm `active: true`.
7. Update the counts the launch contracts pin to `counts.activeCodingTasks` from the inventory: the issued-task count in `scripts/test-launch-contracts.ts` (`reviewedCoding.length`, message "all currently issued coding identities are included in the completed wave", 754 today) and `SUBJECT_SCOPE_CATALOG.webdev.codingChallengeCount` in `shared/subject-catalog.ts` (message "the landing coding challenge count must match the active, visible coding catalogue"). `test:launch` stops at the first of them, so a stale count shows up one failure at a time. Then update the prose counts listed in the Premium reference ("The free coding list"): every newly issued task changes the issued total (754 today) and its track and difficulty splits, even when the free list stays the same.
8. Run the validation block.

## Validation

```sh
npm run build:curation-registry
npm run build:coding-index
npm run test:coding
npm run test:coding-auth
npm run test:launch
npm run test:react-engine    # React tasks only
npm run test:harness         # React tasks only; needs a client build and CHROME_BIN
git diff --check
```

| Command | What it proves |
|---|---|
| `build:curation-registry` | The ledger parses into a consistent registry; the new row is well formed |
| `build:coding-index` | `shared/coding-index.ts` lists every active task with its projected `free` flag and no prompt, test or answer |
| `test:coding` | Every task's shape rules; reference, junior and senior pass the visible and hidden checks in the production grader; the starter and skeleton fail; constant answers and visible-answer tables fail; the hint ladder ends on official documentation; every JavaScript, TypeScript and React level has a task; the index is fresh |
| `test:coding-auth` | The coding handlers keep sessions, drafts, reveals and the Premium refusal tied to the right account (`scripts/test-coding-authorization.ts`, `scripts/test-attempt-versions.ts`) |
| `test:launch` | Every issued task has a current passing review; an unreviewed or edited task is withheld; the free share, free list and free stages hold; `codingChallengeCount` matches the active catalogue; the complexity contract (`scripts/coding-complexity-contract.ts`) holds |
| `test:react-engine` | Every React reference and variant passes its suite in the real React runner with all variants enabled |
| `test:harness` | The browser React harness answers one verdict per run; it exits 0 with a notice when no Chromium is available, so read its output |
| `git diff --check` | No whitespace errors |

Report each command's real result. A task counts as added only when the inventory shows `active: true` and `test:coding` and `test:launch` pass.
