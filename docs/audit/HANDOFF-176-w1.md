# Handoff `176-w1-2026-09-09` — devShark content audit, first wave

For the next session that continues
[#176](https://github.com/lukaskourilcz/react-express-app/issues/176) on branch
`claude/qa-hints-audit-i0kh9t`. Read this before touching anything; it says what
is done, what is half done, and the exact order to finish the first wave.

## 1. Where the branch stands

Commits on the branch, in order:

| Commit | What it did |
| --- | --- |
| `471677d` | The eligibility gate, the ledger-backed registry, positional Learn levels with the unavailable floor, parts-based unlock rules, void and invalidation flows, the `model` review kind, the inventory script |
| `59e5c64` | First snapshot of interim artifacts under `docs/audit/wip/` |
| `b4dc91b` | Gate scoped to the ledger's audited categories; launch contracts for every gate boundary; docs updated; sixty-item batches |
| *(this commit)* | Reviewer outputs so far, all tools, this handoff |

Every repository gate passes on the branch as committed: `npm run
typecheck:api`, `cd client && npx tsc -b`, `npm run test:launch` (now including
"the content-audit gate"), `npm run test:coding`, `npm run test:paths`, `npm run
build`, both `npm audit --omit=dev`, `git diff --check`. The ledger's `scope` is
still empty, so **the gate withholds nothing yet** and production behaviour is
unchanged apart from the fixes listed in §5. The branch is therefore safe to
merge as it is, but the wave is not finished until §3 is done.

**Do not add a category to `scope.categories` in the ledger without its rows.**
That withholds the whole category (fail-closed by design).

## 2. What the first wave covers

Five topics, 848 served items: `css` (48), `javascript` (200), `typescript`
(200), `react` (200), `nodejs` (200). Reviews are item-level, model-performed,
with code executed and versioned claims cited; the schema is in
`docs/audit/wip/REVIEWER-BRIEF.md`.

State of the review fragments at handoff (`docs/audit/wip/review/`), 462 of
the wave's 848 items reviewed, 386 to go:

| Batch | Rows / items | Notes |
| --- | --- | --- |
| `review-css.json` | 48 / 48 | Complete (array format, from the first run) |
| `review-javascript-1.jsonl` | 0 / 50 | Never started; the reviewer was stopped before it wrote a line |
| `review-javascript-2/3/4.jsonl` | 50 / 50 each | Complete |
| `review-react-1.jsonl` | 50 / 50 | Complete |
| `review-react-2.jsonl` | 20 / 50 | Partial; resume |
| `review-react-3/4.jsonl` | 0 / 50 each | Never started |
| `review-typescript-1/2/3/4.jsonl` | 40, 30, 30, 20 / 50 | Partial; resume |
| `review-nodejs-1/2/3/4.jsonl` | 16, 18, 10, 30 / 50 | Partial; resume |

No reviewer is running any more: all sixteen were stopped when the session
ended, and the copies here are byte-identical to the scratchpad ones. The
resume rule in the brief applies: a reviewer given an existing `.jsonl`
continues after the last id in it, so **never re-run a batch from scratch**.

Findings so far, from the 414 JSON Lines rows (validator: 0 schema problems)
plus the 48 CSS rows: 384 + 47 `rewrite`, 30 + 1 `retire`, no `quarantine`;
Czech `verified` 399, `drift` 12, `defect` 3 in the JSON Lines rows, and 48/48
`drift` for CSS. Every item in these banks carried the generic shape-based
hint, so almost every item is a `rewrite` (new hint, usually a fuller
explanation, sometimes rebuilt options); retirements are in-batch duplicates
and a few off-objective items; keys are overwhelmingly correct — the executed
checks found one `multiple-defensible` per batch at most (e.g. `rm-js-106`
arrow-`this` differs between script and module, `rm-react-48` sets state
during render and throws in React 19). The Czech bank is a translation of an
*older* English bank for CSS and for scattered items elsewhere; every Czech
hint is a different generic sentence, so **every rewritten item needs new
Czech**.

## 3. Finish the wave — in this order

All paths below are relative to the repository root unless absolute. The
scratchpad directory is `S=/tmp/claude-0/-home-user-react-express-app/1a0ae3f5-d16c-5274-9c1e-5d3551ba7e95/scratchpad`;
if it is gone, recreate its contents from `docs/audit/wip/` (inventory,
context, review, coding, tools, briefs) — the tree layout is the same.

1. **Install and rebuild the helper bundles** (they live outside git):
   ```bash
   npm ci && (cd client && npm ci)
   mkdir -p node_modules/.cache/shark
   for t in apply-rewrites build-ledger apply-cs; do
     npx esbuild docs/audit/wip/tools/$t.ts --bundle --platform=node --format=esm --packages=external \
       --outfile=node_modules/.cache/shark/audit-$t.mjs --log-level=warning; done
   npx esbuild docs/audit/wip/tools/grade-task.ts --bundle --platform=node --format=esm --packages=external --outfile=node_modules/.cache/shark/audit-grade-task.mjs --log-level=warning
   ```
   `seed-locator.ts` is imported by `apply-rewrites.ts` (same directory).
   The `.ts` tools use absolute `/home/user/react-express-app/…` imports;
   adjust if the checkout lives elsewhere.

2. **Finish the missing/partial review batches.** Inputs:
   `docs/audit/wip/inventory/batch-<name>.json` and
   `docs/audit/wip/context/context-<name>.json`; brief:
   `docs/audit/wip/REVIEWER-BRIEF.md`. Launch one `general-purpose` subagent
   per batch with the prompt used in this session (read brief → read context →
   read batch → review every item → append JSON Lines to
   `review/review-<name>.jsonl`, resuming after the last id). Fifty-item
   batches took 15–25 minutes and 160–240K agent tokens each; the account
   usage limit was hit once with sixteen running — eight to twelve at a time
   is safer. Validate after each finishes:
   ```bash
   python3 docs/audit/wip/tools/validate-reviews.py . docs/audit/wip/inventory docs/audit/wip/review
   ```
   It must report `problems 0` and, per batch, rows equal to the batch length
   (48 for css, 50 for every other wave-1 batch).

3. **Cross-batch duplicate pass.** Reviewers flagged `possibleDuplicates`
   pointing outside their batch (e.g. `rm-js-104` ↔ `rm-js-97`). Decide each
   pair once (retire the weaker) by editing the winning batch's row to
   `decision: "retire"`, `retireReason: "duplicate of <id>"`. A short grep over
   the fragments for `possibleDuplicates`/`duplicate` in `rationale` finds them.

4. **Apply the English rewrites to the seed files** (dry run first):
   ```bash
   node node_modules/.cache/shark/audit-apply-rewrites.mjs docs/audit/wip/inventory docs/audit/wip/review --dry
   node node_modules/.cache/shark/audit-apply-rewrites.mjs docs/audit/wip/inventory docs/audit/wip/review
   npm run typecheck:api
   ```
   It patches `lib/roadmap-questions-{css-core,js,js-b,ts,ts-b,react,react-b,node}.ts`
   in place via the TypeScript AST, verifying each seed's current question
   text against the inventory first (`MISMATCHED` means the inventory is
   stale — regenerate it, step 5, and retry). Retired-section rewrites are
   skipped on purpose (recorded as redistribution candidates only).

5. **Regenerate the inventory after the rewrites** (new hashes):
   ```bash
   npm run audit:devshark-inventory -- --out "$S/inventory-after"
   python3 docs/audit/wip/tools/enrich-batches.py "$S/inventory-after"
   ```

6. **Czech localisation pass** for the five topics:
   ```bash
   python3 docs/audit/wip/tools/make-cs-batches.py . "$S/inventory-after" docs/audit/wip/review "$S/cs-batches" css,javascript,typescript,react,nodejs
   ```
   One `general-purpose` subagent per `cs-batch-<name>.json`, brief
   `docs/audit/wip/CS-BRIEF.md`, output `cs-out/cs-<name>.jsonl` (JSON Lines,
   appended, resumable). Then:
   ```bash
   node node_modules/.cache/shark/audit-apply-cs.mjs "$S/cs-out" --dry
   node node_modules/.cache/shark/audit-apply-cs.mjs "$S/cs-out"
   ```
   It replaces whole entries in `lib/roadmap-questions.cs.ts` (js/ts/react)
   and `lib/roadmap-questions-extra.cs.ts` (css/node). Write a small parity
   check before applying: for every row, fenced code blocks and backticked
   tokens in the English must appear unchanged in the Czech, and options must
   be exactly four. Then regenerate the inventory once more (step 5 command,
   into `$S/inventory-final`) so the ledger records the served Czech hashes.

7. **Build the ledger and the registry:**
   ```bash
   node node_modules/.cache/shark/audit-build-ledger.mjs "$S/inventory-final" docs/audit/wip/inventory docs/audit/wip/review "$S/cs-out" css,javascript,typescript,react,nodejs false
   npm run build:curation-registry
   ```
   `build-ledger` writes `docs/audit/devshark-content-ledger.json` with one row
   per served item of the named categories (rewritten items get `revision: 2`,
   `previousHash`, the re-scored dimensions and the original scores under
   `original`), keeps any rows for other categories already in the ledger, and
   sets `scope.categories`. Rows whose `cs` status is not `kept`/`rewritten`
   get `cs.hash: null`, which makes the runtime serve English to Czech
   learners for that item — correct while the Czech is unreviewed. It prints
   `problems` for any live decision whose gates fail; fix those rows first.

8. **Run every gate**, in this order, and fix what fails:
   `npm run typecheck:api`, `cd client && npx tsc -b`, `npm run test:launch`
   (the reconciliation block proves every served item of an audited category
   has a current record and every retired one is absent), `npm run
   test:coding`, `npm run test:paths`, `npm run build`, `npm audit --omit=dev`
   (root and `client/`), `npm run check:responsive -- --routes /learn,/quiz,/curation --widths 390,1280`,
   `git diff --check`. Also `npm run audit:devshark-content` — its `audit`
   block is the per-category served/withheld count for the report.

9. **Write the report** `docs/audit/devshark-content-audit.md`:
   inventory coverage (the numbers in `docs/audit/wip/inventory/inventory.json`:
   2,128 active, 319 in retired sections, 312 unreferenced, 795 legacy, 249
   coding tasks, one uncountable source — the `question_edits` table);
   retained/rewritten/retired/quarantined counts by topic and by format
   (`python3 docs/audit/wip/tools/report-stats.py` prints them from the
   ledger); the major patterns (generic hints everywhere, Czech drift, the
   position bias of keys — harmless because every delivery path shuffles,
   in-batch duplicates, the specific correctness findings); inaccessible pools
   (the database override layer: no Supabase credentials in the session, the
   MCP server needs authorisation); and the remaining blockers (waves 2+: git,
   html, dsa, algorithms, general, ai, databases, system-design, devops,
   security; the retired sections; the coding catalogue with the grader
   checks the CODING-BRIEF specifies; the unpublished FDE/DSA learning paths,
   which are unreachable while their env switches are off).
   Then update `docs/release-acceptance.md` (gate rows and a wave-1 section),
   `docs/curriculum-retirement.md` (the audit gate now exists; retired-bank
   dispositions come in a later wave), and `NEEDED.md` (owner: decide whether
   to run wave 2; note that `/dev` edits to audited items show `superseded`).

10. **Replace the wip snapshot, commit, push, merge.** Keep
    `docs/audit/wip/{REVIEWER,CODING,CS}-BRIEF.md`, `tools/` and `review/`
    (they are the audit's evidence); delete `inventory/`, `context/` and
    `coding/` (regenerable, 7 MB). Commit in coherent steps (rewrites; Czech;
    ledger + registry; docs), push with `git push -u origin
    claude/qa-hints-audit-i0kh9t`, merge to `main` (fast-forward is fine),
    delete the branch, and comment on #176 with the wave-1 numbers and what
    remains. The session's push proxy rejects remote branch deletion; leave
    that to the owner as `NEEDED.md` already records for other branches.

## 4. Later waves, in one paragraph each

**Waves 2+ (questions).** Same procedure, per topic, on the batches already in
`docs/audit/wip/inventory/` (git, html, dsa, algorithms, general, ai,
databases, system-design, devops, security). Then the retired sections
(abbreviations, testing, code-snippets, testing-fix): their sidecars say what a
`rewrite` means there (a redistribution candidate naming the destination topic)
and they stay withheld by category whatever the ledger says; the value of
reviewing them is the redistribution list. Unreferenced banks (cool-stuff, the
pre-#180 html and css banks) and the 795 legacy `coreQuestions` need only a
bank-level disposition in the report: not deliverable, not reviewed, cannot
activate without a review because the gate requires one.

**Coding wave.** `docs/audit/wip/coding/batch-coding-*.json` (249 tasks with
solutions and hidden tests — server-only content, never paste into learner
copy) and `CODING-BRIEF.md`, which requires running the reference, the
starter, an alternative valid solution and two wrong approaches through the
real grader (`audit-grade-task.mjs`). Output `coding-review/review-coding-<track>.jsonl`.
Ledger rows use `kind: "coding-task"`, `contentHash` = `taskHash(task,
solution)` from `lib/curation.ts` (the batch files carry it as `taskHash`), and
set `scope.codingTasks: true` only when every task has a row — until then
coding tasks are served with no claim. Rewrites (added tests, tightened
briefs) are applied by hand to `lib/coding/tasks/*.ts` and
`lib/coding/solutions/*.ts`; then `npm run build:coding-index` (the index is
generated from the *active* summaries, so a retired task leaves the browser
list) and `npm run test:coding`. Note the level-gap check: a retired task on a
level with quota one leaves the level without a coding task.

**Learning paths (FDE, DSA Foundations).** Unpublished (both env switches off,
see `NEEDED.md`), so unreachable content: inventory them, record "pending
review before publication", and gate publication on a review in the ledger if
the owner enables a path. The content is under `lib/learning-paths/content/`.

## 5. Decisions already made (do not relitigate)

- **Model review is recorded as `model`, never `human`.** The learner-facing
  sentence says an AI model reviewed the item and a person has not read it
  (`client/src/lib/curation.ts`, `CurationPage.tsx`). Keep it that way.
- **The gate is scoped by ledger `scope.categories`** so waves can merge
  without withholding unaudited topics. StudyShark subjects are never gated.
- **Levels keep authored membership** (`buildLiveTopic` no longer repacks
  survivors eight at a time); a level with fewer than `MIN_LEVEL_QUESTIONS`
  (3) served questions is `unavailable`; the shared unlock rules step over
  unavailable levels and parts (`shared/progression.ts`).
- **Unlock rules follow parts, not five-level blocks.** This fixed a real dead
  end: a signed-in learner was refused level 6 of a 25-level topic for lacking
  "checkpoint 1", which the map records only after level 9 (part 1 test). The
  legacy `?checkpoint=n` endpoint now serves part `n`.
- **In-flight attempts on retired items:** quiz answers are void (neither for
  nor against, no proof, `voided` in the response); Learn attempts are closed
  without a verdict (`invalidated`) and offered again — the completion RPC
  cannot void a question without a migration; placement rounds void the item
  and top the run up; a short assessment receipt is scaled to the budget.
- **Unreviewed Czech is dropped, not served.** A translation whose hash is not
  the reviewed one falls back to English for that item.
- **Retirement is not deletion.** Retired items stay in their source files and
  in `getQuestionsForHistoryById` / `codingTaskForHistory`.
- **`/dev` edits supersede approval.** An operator edit shows `superseded` in
  the new Review column and the item is withheld until a ledger row records
  the new wording. There is no in-console approval on purpose.
- The `question_edits` override table could not be read (no credentials); the
  report must say the production pool is uncountable, which is what keeps the
  bank-wide claim at `partial`/`none`.

## 6. Pitfalls met, so you do not meet them again

- Reviewers that write one file at the end lose everything on interruption;
  the JSON Lines + resume contract exists for this reason. Keep it.
- The launch suite runs in **StudyShark** scope (no product env), so devShark
  handlers cannot be driven end to end there; the gate contracts exercise the
  pure rules, the store filter, the live-level builder and the void mechanics
  with geography fixtures instead.
- `apply-rewrites` refuses a seed whose question text no longer matches the
  inventory; that is the guard against applying a review to edited content.
  Regenerate the inventory rather than bypassing it.
- The reviewers' automated `csDriftFlags` are heuristics; `rm-react-48` was a
  false positive. The reviewer's `cs.status` is the verdict.
- Key position bias (most keys at index 1) is real in the authored banks and
  harmless in delivery because every path shuffles options; do not "fix" it by
  reordering options in rewrites (it would only churn the Czech).
- The task-observer log for this project is at
  `~/.claude/projects/-home-user-react-express-app/skill-observations/log.md`
  (two observations logged this session).
