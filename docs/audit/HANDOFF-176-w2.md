# Handoff `176-w2-2026-09-10` — devShark content audit

For the next session continuing
[#176](https://github.com/lukaskourilcz/react-express-app/issues/176) on branch
`claude/qa-hints-audit-i0kh9t`. This supersedes `HANDOFF-176-w1.md`, which
describes a state the branch has passed. Read section 3 first: it is the only
part you need to resume.

## 1. What is done and enforced

The gate is live. `docs/audit/devshark-content-ledger.json` holds 848 rows and
`lib/curation-registry.ts` is generated from it. CSS, JavaScript and TypeScript
are in `scope.categories`, so an item of theirs without a current passing
record is withheld. React and Node.js have their decisions recorded and
enforced per item — their retirements hold — but stay outside the scope until
their Czech is finished, so an unreviewed item there is still served.

Effect on the bank, from `npm run audit:devshark-content`:

| | Items |
| --- | ---: |
| Served on a recorded review | 763 |
| Retired | 84 |
| Quarantined | 1 |

Every repository gate passes on the branch as pushed: `npm run typecheck:api`,
`cd client && npx tsc -b`, `npm run test:launch` (including the content-audit
gate), `npm run test:coding`, `npm run test:paths`, `npm run build`, both
`npm audit --omit=dev`, `git diff --check`.

One more gate is the audit's own and has to pass before the branch merges:

```bash
npm run audit:devshark-inventory -- --out $S/inv-sweep
python3 docs/audit/wip/tools/sweep-artifacts.py $S/inv-sweep
```

It scans every learner-visible field in both languages for the audit's own
leavings — item ids, commit hashes, tool version strings, working notes,
scratch paths, the reviewer's vocabulary, and references to an option by its
position — and exits non-zero on a hit. Run it after every apply, not once at
the end: it has caught a new class of leak on each of its first two runs.

The report is `docs/audit/devshark-content-audit.md`. It is written and
accurate as of this handoff; update its numbers when more topics land.

## 2. Where every topic stands

`reviewed` is the first pass, `2nd` the adversarial second reading. A topic is
ready to apply when rewrites and 2nd are equal.

| Topic | Items | Reviewed | Rewrites | 2nd | Applied | Czech |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| css | 48 | 48 | 47 | 47 | yes | yes |
| javascript | 200 | 200 | 189 | 189 | yes | yes |
| typescript | 200 | 200 | 173 | 173 | yes | yes |
| react | 200 | 200 | 157 | 157 | yes | 93 of 157 |
| nodejs | 200 | 200 | 197 | 197 | yes | 10 of 197 |
| html | 48 | 48 | 48 | 48 | **no** | no |
| general | 152 | 152 | 150 | 101 | no | no |
| databases | 120 | 120 | 116 | 16 | no | no |
| devops | 120 | 120 | 111 | 10 | no | no |
| security | 120 | 120 | 116 | 10 | no | no |
| git | 120 | 120 | 116 | 0 | no | no |
| system-design | 120 | 120 | 115 | 0 | no | no |
| nextjs | 120 | 120 | 105 | 0 | no | no |
| dsa | 120 | 120 | 116 | 0 | no | no |
| algorithms | 80 | 80 | 76 | 0 | no | no |
| ai | 160 | 108 | 104 | 0 | no | no |
| testing (retired) | 144 | 66 | 11 | 0 | no | n/a |
| abbreviations, code-snippets (retired) | 175 | 0 | 0 | 0 | no | n/a |
| cool-stuff, html-legacy, css-legacy (unreferenced) | 312 | 0 | 0 | 0 | never | n/a |

**HTML is ready to apply right now** — both readings are complete and nothing
has been done with them. That is the cheapest next step.

The unreferenced banks have no delivery path, the gate never sees them, and
the ledger builder skips them deliberately. They need a disposition in the
report, not a review.

## 3. How to continue, in order

The scratchpad is `S=/tmp/claude-0/-home-user-react-express-app/1a0ae3f5-d16c-5274-9c1e-5d3551ba7e95/scratchpad`.
If it is gone, recreate it from `docs/audit/wip/`: `review/` → `$S/review-all`,
`verify/` → `$S/verify-out`, `cs/` → `$S/cs-out`, plus `inventory/`,
`context/`, `coding/` and `tools/` under the same names.

1. **Rebuild the helper bundles** (they live outside git):
   ```bash
   mkdir -p node_modules/.cache/shark
   for t in apply-rewrites build-ledger apply-cs; do
     npx esbuild docs/audit/wip/tools/$t.ts --bundle --platform=node --format=esm \
       --packages=external --outfile=node_modules/.cache/shark/audit-$t.mjs --log-level=warning
   done
   ```
2. **Finish the second readings.** Batches are built in
   `$S/verify-batches-r4/`; the queue with sizes is `$S/queue-verify.txt`.
   One `general-purpose` subagent per batch, brief
   `docs/audit/wip/VERIFY-BRIEF.md`, output
   `$S/verify-out/verify-<name>.jsonl`, JSON Lines appended every 8-10 items,
   resuming after the last id already in the file. Never re-run a batch from
   scratch. To build a batch for a topic that has none, or a round for items a
   batch gained after its first round:
   ```bash
   python3 docs/audit/wip/tools/make-verify-batches.py docs/audit/wip/inventory \
     $S/review-all $S/verify-batches-rN "name=batch1+batch2" --done $S/verify-out
   ```
3. **Merge the verdicts** (never edit the review fragments in place):
   ```bash
   python3 docs/audit/wip/tools/merge-verification.py $S/review-all $S/verify-out \
     $S/merged docs/audit/wip/inventory
   ```
   It reports problems and must print none. It resolves a rebuilt option set's
   answer index by matching the previously keyed text and refuses to guess when
   that text is gone; two cases settled by hand live in its `MANUAL_KEYS`.
4. **Apply the English** for topics whose rewrites are all second-read. Copy
   just those merged files into a directory and run the patcher against it:
   ```bash
   node node_modules/.cache/shark/audit-apply-rewrites.mjs docs/audit/wip/inventory <dir> --dry
   node node_modules/.cache/shark/audit-apply-rewrites.mjs docs/audit/wip/inventory <dir>
   npm run typecheck:api
   ```
   `mismatched` must be 0. It means the seed no longer matches the inventory,
   so regenerate the inventory rather than bypassing it.
5. **Regenerate the inventory**, then build the Czech batches:
   ```bash
   npm run audit:devshark-inventory -- --out $S/inv-after
   python3 docs/audit/wip/tools/enrich-batches.py $S/inv-after
   python3 docs/audit/wip/tools/make-cs-batches.py . $S/inv-after <dir> $S/cs-batches <topics>
   ```
6. **Localise.** One subagent per `cs-batch-*.json`, brief
   `docs/audit/wip/CS-BRIEF.md`, output `$S/cs-out/cs-<name>.jsonl`. Then,
   **only once no translator is still appending**:
   ```bash
   python3 docs/audit/wip/tools/normalise-cs.py $S/cs-batches $S/cs-out
   python3 docs/audit/wip/tools/check-cs.py $S/cs-batches $S/cs-out
   node node_modules/.cache/shark/audit-apply-cs.mjs $S/cs-out --dry
   node node_modules/.cache/shark/audit-apply-cs.mjs $S/cs-out
   ```
7. **Rebuild the ledger and registry.** Regenerate the inventory once more
   first, so the Czech hashes are current:
   ```bash
   npm run audit:devshark-inventory -- --out $S/inv-final
   node node_modules/.cache/shark/audit-build-ledger.mjs $S/inv-final \
     docs/audit/wip/inventory $S/merged $S/cs-out <all-categories-with-rows> \
     <categories-that-are-complete> false
   npm run build:curation-registry
   ```
   The sixth argument is the enforced scope: name a category there only when
   every served item of it has a row, or the rest of the category is withheld.
   `problems` must be 0.
8. **Run every gate** (section 1 lists them), update the report's numbers, and
   commit. Push with `git push -u origin claude/qa-hints-audit-i0kh9t`.

## 4. Decisions already made — do not relitigate

- **A recorded decision is enforced wherever the item lives.** The ledger's
  scope means "complete": only there is an unrecorded item withheld. This is
  what lets a topic land its retirements before the whole bank is audited.
- **Nothing rewritten is served on one reading.** The ledger builder rejects a
  revision-2 row without an accepted second reading, and the launch contract
  fails on one. A rejected rewrite becomes a quarantine.
- **The bank is written in American spelling** and the second readers correct
  British forms the rewrites introduce.
- **An outcome label is prose; a value is code.** `Error` becomes `Chyba`;
  `undefined`, `TypeError`, `string`, `"ACTIVE"` do not move. Both the Czech
  brief and the parity checker carry the table.
- **Key position is not "fixed" by reordering options.** Delivery shuffles, and
  reordering would churn the Czech for nothing.
- **Retirement is not deletion.** A withheld item stays in its source file and
  in the history lookups.
- The `question_edits` override table could not be read (no credentials), so
  the report states the production pool is uncountable. That is what keeps the
  bank-wide claim at partial rather than complete.

## 5. Pitfalls met, so you do not meet them again

- **Bare `npx tsc` is not this product's compiler.** It resolves to a global
  TypeScript 6 where `strictNullChecks` is on by default. Use
  `node_modules/.bin/tsc` and record the version. The same goes for react,
  react-dom and express: require them from the repository.
- **A rewrite that rebuilds options without stating `correctAnswer` is a
  hazard.** Twenty-eight did; two had moved the key. The merge step now
  resolves it by text and refuses to guess.
- **Never rewrite a file a subagent is still appending to.** The Czech
  normaliser takes an explicit batch list for exactly this reason.
- **A "measured" sentence in a rewrite may not have been measured.** Three were
  wrong. Re-run any number an explanation quotes.
- **The first pass's commonest self-inflicted defect is a hint that states the
  rule the item tests** — 104 of the second reading's amendments. It is the
  reviewer explaining what they just worked out.
- Two rate limits interrupted this session. Every agent appends incrementally
  and resumes after the last id, so nothing was lost; keep that contract.
