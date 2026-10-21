---
name: learn-question-authoring
description: Add or edit Learn questions without silently withholding them. Use for any change to lib/roadmap-questions*.ts, the curation ledger rows of a question, or the review registry.
---

# Learn Question Authoring

A Learn question reaches a learner only when the audit ledger holds a passing review for its exact current content. Edit one word and the question disappears from every surface until you record a new review. This skill is the path from a seed to a served question. Premium rules live in [references/premium-gating.md](references/premium-gating.md); ledger row templates live in [references/ledger-row.md](references/ledger-row.md).

## Read first

`lib/roadmap-build.ts`, `lib/roadmap-questions.ts`, `lib/roadmap-questions-restored.ts`, `lib/roadmap.ts` (`LEVEL_TITLES`, `levelQuestionIds`, `buildLiveTopic`), `lib/curation.ts`, `shared/curation.ts`, `docs/curation-claims.md` and `docs/question-sources.md`. Then read the seed file of the topic you are changing.

## Where a question lives

1. Each topic file exports a `Seed[]` (`Seed` in `lib/roadmap-build.ts`): `q` (question text, may embed a fenced code block), `opts`, `a` (index of the key), `e` (explanation), `tags`, optional `intro` (the hint) and optional `snippet`.
2. `buildRoadmap(prefix, category, seeds)` turns seed index `i` into id `<prefix>-<i + 1>`, level `floor(i / 8) + 1` and difficulty `ceil(level / 5)` (`levelForIndex`, `difficultyForLevel`). The prefixes are `ID_PREFIX` in `lib/roadmap.ts` (`rm-js`, `rm-ts`, `rm-react`, `rm-db` and so on).
3. A level holds eight questions (`QUESTIONS_PER_LEVEL`). JavaScript, TypeScript and React author each level as four A seeds and four B seeds in two files, and `interleaveByLevel` in `lib/roadmap-questions.ts` merges them; every other topic is one list of eight per level.
4. A level's membership is fixed by id: `levelQuestionIds` returns the eight positional ids plus `restoredQuestionIds(topic, level)`, so a level with restored material holds more than eight (JavaScript level 1 serves 12). A withheld question thins its own level and never pulls a neighbour across (`buildLiveTopic`); below `MIN_LEVEL_QUESTIONS = 3` served questions the level is unavailable.

## Ids are permanent

- Never insert, reorder or delete a seed in a topic list. The id is the position, so one insertion renumbers every later question and moves it across a level boundary (`lib/roadmap-build.ts` header). Progress, attempts, Shark Cards and ledger rows all key on the id.
- Retire a question through its ledger row (`decision: "retire"`), not by deleting the seed. "Retirement is not deletion": the item stays in its source file for history (`docs/curation-claims.md`, "The gate, applied once").
- To add a question to an existing level, append a seed to that level's entry in `restoredLevels` (`lib/roadmap-questions-restored.ts`), or add an entry when the level has none. Its id is `rm-<topic>-fresh-<level>-<n>`, where `<topic>` is the topic slug, not the `ID_PREFIX` (`restoredQuestionIds`). Keep one entry per topic and level: `restoredQuestionIds` reads the first match only.
- Use a restored entry only for a one-word topic slug. `learnLevelOfQuestion` in `shared/shark-cards.ts` matches `rm-([a-z]+)-fresh-`, so `system-design` or `cool-stuff` ids would lose their level, and `productCleanupContracts` in `scripts/product-cleanup-contracts.ts` checks levels 1, 2 and 5 of every topic through it.
- A topic holds at most `ROADMAP_LEVELS` (25) levels (`lib/roadmap-build.ts`; the client copy in `client/src/lib/roadmap.ts` derives `CHECKPOINT_COUNT` from it). The progress reader in `api/quiz/roadmap.ts` drops any level above it, and `client/src/lib/today.ts` never scans past it. JavaScript, TypeScript, React and Node.js already have 25 levels, so they take new questions through restored entries only.
- To add a whole level to a topic below the cap (HTML and CSS have 6; Next.js, Git, DSA and Databases have 15; `topicLevelCount` in `lib/roadmap.ts` gives the current number), append its title to `LEVEL_TITLES[topic]` in `lib/roadmap.ts` and append eight seeds at the end of the topic's list. The level count drives part tests and checkpoints, so read the tier rules for part tests in the Premium reference first.

## Writing the seed

- English only, for good (CLAUDE.md, "Protected behavior").
- Four options, one key. `scripts/report-devshark-content.ts` throws on any active question without exactly four non-empty options, a hint or an explanation.
- Write a hint (`intro`) for this question. The fallback `hintFor` is generic; the audit scored filler hints down (`quality.hint` in every ledger row). A hint helps the learner recall or trace and never points at the key (`hintFor` doc comment in `lib/roadmap-build.ts`).
- The explanation says why the key is right and why each wrong option is wrong. `scripts/report-devshark-content.ts` flags an explanation over 100 words, a hint over 28 words, a key of ten words or more that runs four times the average distractor's length (a length cue) and joke distractors (`unseriousDistractor`).
- Declare `snippet` when the question asks the learner to read code: `{ version: 1, language, subtype, objective }` from `SnippetMeta` in `shared/snippet-format.ts`. Declared, never inferred. A declared snippet needs a fenced block in the question or hint (`scripts/webdev-bank-contract.ts`). Restored entries declare `javascript`/`predict` with the entry's `objective` for any question containing a fenced `js` block (`restoredQuestions`); a restored question that asks for another kind of reading cannot say so.
- `contentHash` covers the category, so moving a question to another topic is an edit the reviewer did not see (`contentHash` doc comment in `lib/curation.ts`).
- Write original questions. Paraphrase closely only with attribution in the explanation and after checking the source's license (`docs/question-sources.md`, "Licensing"). Prefer why, when and trade-off questions over trivia (`docs/question-sources.md`, "Workflow", step 2).

## The gate

- Every Learn topic's category is in the ledger's `scope.categories`, so a question with no applicable record is withheld (`AUDITED_CATEGORIES` in `lib/curation-registry.ts`; `eligibilityFrom` in `shared/curation.ts`).
- A row serves the question only when its `contentHash` equals the current hash, its decision is `retain` or `rewrite`, relevance is at least 4 of 10 (`RELEVANCE_MIN`) and quality is at least 3 of 5 (`QUALITY_MIN`). Passing one gate never stands in for the other (`passesBothGates`).
- Any edit to the question, options, key, explanation, hint, tags or category changes `contentHash`, and the old row then resolves to `superseded`: withheld, with no warning in the UI (`contentHash` in `lib/curation.ts`; `docs/curation-claims.md`, "Nothing is reviewed until a record says so about the exact version"). An edit made in `/dev` lands in the override layer and is withheld the same way (`docs/curation-claims.md`, "The admin view").
- `lib/curation-registry.ts` is generated. Never edit it by hand; `npm run build:curation-registry` writes it from the ledger, and `npm run test:launch` fails when the two disagree ("lib/curation-registry.ts is stale").

## Procedure

1. Write or edit the seed.
2. Read the new hash: `npm run audit:devshark-inventory -- --out "$TMPDIR/inv"`, then `jq '.items[] | select(.id == "<id>") | {contentHash, eligible}' "$TMPDIR/inv/inventory.json"`. Write the inventory outside the repository.
3. Review the item against the seven quality dimensions and five relevance markers (`shared/curation.ts`), and write its row from [references/ledger-row.md](references/ledger-row.md). For an edit, update the existing row: new `contentHash`, old hash in `previousHash`, `revision` plus one, `decision: "rewrite"`, and a `verification.verdict` of `accept` or `amend` (required by `scripts/test-launch-contracts.ts` for any served row with `revision > 1`).
4. Run `npm run build:curation-registry`. It throws on a duplicate id, an unknown decision or totals that do not add up.
5. Rerun step 2 and confirm `eligible: true`.
6. A new served question changes the served count. Set `SUBJECT_SCOPE_CATALOG.webdev.questionCount` in `shared/subject-catalog.ts` to the number `npm run test:launch` names ("questionCount must be the N questions the bank can serve"); it equals `counts.eligibleQuestions` in the inventory.
7. Run the validation block.

## Validation

```sh
npm run audit:devshark-inventory -- --out "$TMPDIR/inv"
npm run build:curation-registry
npm run test:launch
npm run test:grading-integrity
npm run audit:devshark-content
git diff --check
```

| Command | What it proves |
|---|---|
| `audit:devshark-inventory -- --out <dir>` | Read-only. Writes `inventory.json` to `<dir>` with each question's current `contentHash` and its `eligible` flag from `questionEligibility`, the function the delivery surfaces apply |
| `build:curation-registry` | The ledger parses into a consistent registry: one row per id, known decisions, totals equal to their markers and dimensions |
| `test:launch` | The registry equals the ledger; every served question of an audited category has a current passing row and every current passing row is served; retired rows are absent; levels keep their membership; `questionCount` matches the served bank; a declared snippet has code; Learn ids map back to their level |
| `test:grading-integrity` | The Learn handler still serves, grades and completes levels against a stand-in database (`scripts/test-learn-integrity.ts`), and the coding graders still hold |
| `audit:devshark-content` | Per category, how many items are served and how many are withheld by reason (`unreviewed`, `superseded`, `retired`); flags long hints and explanations, length cues and joke distractors |
| `git diff --check` | No whitespace errors in the seed file or the ledger |

Report each command's real result. A question counts as added only when the inventory shows `eligible: true` and `test:launch` passes.
