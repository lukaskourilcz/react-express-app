# devShark content audit — first wave

The item-by-item audit that
[#176](https://github.com/lukaskourilcz/react-express-app/issues/176) asks
for, as far as it has run. This report says what was counted, what was read,
what changed as a result, what the product now claims, and what has not been
done. The machine-readable record is `docs/audit/devshark-content-ledger.json`;
the runtime projection of it is `lib/curation-registry.ts`; the gate that
applies it is described in `docs/curation-claims.md`.

Last updated 2026-09-10. Every one of the 2,128 items a learner can be served
has been read at least once; 848 of them have completed the full pipeline and
are recorded in the ledger, and three topics are enforced by the gate.

## 1. What a learner can be served, counted

Every place a devShark question can reach a learner was reconciled from the
code (`npm run audit:devshark-inventory`). The numbers are the repository's;
the one source that could not be counted is named below.

| Pool | Items | Reaches learners | Reviewed in wave 1 |
| --- | ---: | --- | ---: |
| Active roadmap banks (18 topics, 8 questions a level) | 2,128 | Learn, part tests, quiz, daily, challenge, placement, review, Play, flashcards, Today | 2,076 reviewed, 848 landed |
| Retired sections (abbreviations, testing, code-snippets, fix-the-test) | 319 | History only: refused by every delivery request | 66 |
| Unreferenced banks (cool-stuff, the pre-rescope HTML and CSS banks) | 312 | No delivery path | 0 |
| Legacy core bank (`coreQuestions`) | 795 | No devShark delivery path | 0 |
| Coding tasks | 249 | Practice, Learn level closers, learning paths | 0 (coding wave pending) |
| Operator overrides (`question_edits` table) | unknown | Merged over the bank at request time | cannot be counted from here |

The `question_edits` table holds operator edits and operator-authored
questions. No database credentials were available to this audit, so its
contents are unknown, which is what keeps every bank-wide sentence in the
product at "partial" or "none": a source that cannot be counted cannot be
claimed. The gate still applies to it — an edited item is withheld as
`superseded` in a completed category and served with no claim elsewhere —
because the rule runs on the merged set, not on the static bank.

## 2. How the review was done

**Rubric.** The issue's rubric, verbatim in substance
(`docs/audit/wip/REVIEWER-BRIEF.md`): seven quality dimensions scored 1–5
(topic relevance, learning value, technical correctness, wording and stated
assumptions, answer options, hint, explanation), the quality score being the
**minimum** dimension, never an average, with hard caps at 2 for a wrong key,
more than one defensible answer, or a hint that misleads or spoils; five
modern-relevance markers scored 0–2 (present-day validity, practical utility,
transferable understanding, audience fit, risk or outcome) summed to 0–10.
Quality gate ≥ 3, relevance gate ≥ 4, both required, neither offsetting the
other. Every item was scored individually against its level's stated
objective; no item was sampled or scored by file.

**Evidence.** A key that depends on runtime behaviour was executed (Node 22,
TypeScript 5.x with `--strict`, React 19 rendered through `react-dom`) and the
literal result recorded; a versioned or factual claim the reviewer was not
certain of was checked against the primary documentation and the URL cited;
well-established facts are marked `knowledge:`. An item whose correctness
could not be verified is `quarantine`, never `retain`.

**Two readings, then a duplicate pass, then Czech.** A first reviewer scored
every item and drafted the rewrite. A second reader, briefed to refute
(`docs/audit/wip/VERIFY-BRIEF.md`), then read every rewrite as it would be
served — key, single defensible answer, hint, explanation, options, wording,
style — re-running the executable checks, and accepted, amended or rejected
it; a rejected rewrite becomes a quarantine, so nothing reaches a learner on
one reading. Pairs flagged as similar across batches were decided once by a
third pass (`docs/audit/wip/DUPLICATES-BRIEF.md`). Finally a localisation
pass wrote the Czech for every rewritten field (`docs/audit/wip/CS-BRIEF.md`),
keeping the served Czech verbatim where the first reviewer had verified it
and only the hint changed; a mechanical parity check confirms four options,
unchanged code and identifiers, and nothing left in English.

**Who reviewed.** Every pass was performed by a language model working from
the briefs above, with the checks it ran recorded per item. The product says
so: an item with a record shows "reviewed by an AI model against the
published criteria; a person has not read it", never "reviewed" without the
qualifier. No human has read these items. The ledger records the model
review as kind `model`, which the coverage sentences and the item note treat
as distinct from a human review.

## 3. Wave 1 by topic

The five topics whose reviews are complete and applied:

| Topic | Items | Rewritten | Retired | Quarantined | In the enforced scope |
| --- | ---: | ---: | ---: | ---: | --- |
| CSS | 48 | 47 | 1 | 0 | yes |
| JavaScript | 200 | 189 | 11 | 0 | yes |
| TypeScript | 200 | 173 | 27 | 0 | yes |
| React | 200 | 157 | 42 | 1 | not yet: Czech outstanding |
| Node.js | 200 | 197 | 3 | 0 | not yet: Czech outstanding |
| **Total** | **848** | **763** | **84** | **1** | |

Every one of the 848 failed the quality gate as first written. The score is
the minimum of seven dimensions, and for 848 of 848 the binding dimension was
the hint: 834 scored 2 and 14 scored 1. After rewriting, 763 pass at 3 or 4.
The 85 that do not are the retirements and the one quarantine, which is what
those decisions mean.

| Dimension scoring 2 or below, before | Items |
| --- | ---: |
| hint | 848 |
| answer options | 126 |
| learning value | 102 |
| explanation | 59 |
| wording | 21 |
| technical correctness | 13 |
| topic relevance | 4 |

Relevance was rarely the problem. Only five items of 848 scored below the
relevance gate of 4, and 603 scored 9 or 10. This bank was not teaching
obsolete material; it was teaching sound material badly.

The second reading checked all 763 rewrites and amended 249 of them, a third.
It rejected one, which became a quarantine.

## 4. What the review found

**Every hint was filler.** All 848 items shipped one of six generic sentences
in the field shown before answering: "Trace the code one line at a time",
"Identify the requirement or failure mode first", and four more. Not one was
written for its question. A single item in the entire audit passed both gates
as written, and it was the only one with a hint of its own. This is the
audit's central finding, and it is a product defect rather than a content one:
a hint field existed, was populated automatically, and nobody read the result.

**Some of that filler gave the answer away.** The fallback ends "Focus on
`<tag>`", and in twelve Security items that tag is the keyed option word for
word while the question withholds it. So the generic hint was not uniformly
harmless: where it interpolated a tag, it handed over the answer.

**Distractors that need no knowledge.** 126 items had option sets scoring 2 or
below, and the commonest shape is three category errors against one real
answer — "Sends emails" or "Routes electrical signals" against a question
about caching. A learner who knows nothing answers those by elimination. The
rate varies sharply by topic: roughly two thirds of one General batch, 29 of
60 in one DevOps batch, and 28 of 60 in one System Design batch.

**Correctness was better than expected, but not clean.** Across 848 items the
audit found 3 wrong keys, 17 items with more than one defensible answer, and 2
false premises. The wrong keys: an assertion item that assumed `strictEqual`
compares with `===` when it uses `Object.is`; and two more caught in the same
way, by running the code rather than reading it. The false premises were
snippets that do not compile or that throw before reaching the behaviour they
ask about — four React items call a hook at module scope, so the code throws
"Invalid hook call" instead of demonstrating anything.

**Version rot concentrates where you would expect.** Next.js carries the most:
`params` and `searchParams` taught as plain objects when they have been
Promises since version 15, a caching default that changed between 14 and 15, an
interceptor file since renamed. Security is a full OWASP edition behind, and
its password-storage advice predates the current ranking. The AI topic teaches
an API shape the vendors no longer have. Git teaches a default branch name Git
itself does not use yet.

**Duplication is the main reason items were retired.** 84 of the 85 withheld
items are retirements, and the large majority duplicate a neighbour teaching
the same rule — React's later levels each carried a code version and a prose
version of the same fact, which is why React alone accounts for 42.

**The Czech bank was a different bank.** For CSS all 48 translations rendered
an older English version; for HTML all 48 translate the pre-rescope
abbreviation questions; half the JavaScript beginner items translate a
different snippet. The automated drift detector caught a minority of these,
because it compares code and these items changed their subject without
changing any code. 511 items now have Czech written from the final English.

## 5. What changed in the product

- **A central gate.** `eligibilityFrom` in `shared/curation.ts`, applied once
  in `applyEligibility` while the effective question set is built and once in
  `lib/coding/active.ts` for coding tasks. A recorded decision holds wherever
  its item lives; the ledger's `scope` names the categories audited
  completely, where an item with no applicable record is withheld as well.
  Every delivery surface reads the filtered set, so a retirement is central,
  not a client filter.
- **Retirement is not deletion.** A withheld item stays in its source file and
  in the history lookups, so an old attempt still finds its explanation. Its
  Learn level thins rather than sliding a neighbour under another title; a
  level with fewer than three served questions is unavailable and the unlock
  rules step over it, which also fixed a pre-existing dead end (level 6 of a
  25-level topic used to demand a checkpoint recorded only after level 9).
- **In-flight attempts.** A quiz answer to an item retired while the quiz was
  open is void — neither for nor against, no proof minted, reported in the
  result; a Learn attempt on a retired level closes without a verdict and is
  offered again; a placement round voids the item and tops the run up; a short
  assessment receipt is scaled to its budget.
- **Edits invalidate approval.** An operator edit in `/dev` turns an item
  `superseded` in its review column; in a completed category it is withheld
  until re-reviewed. There is no self-declared approval from the console.
- **Unreviewed Czech is dropped.** A translation whose hash is not the one the
  ledger records falls back to English for that item rather than being served
  unreviewed.
- **Stable ids and history.** No id changed. Rewritten items keep their id with
  `revision: 2` and the previous content hash on record; retired items keep
  their id and their history.

## 6. Limits of this wave

- **Eleven topics are reviewed but not yet landed.** HTML, General, Git,
  Databases, DevOps, Security, System Design, Next.js, DSA, Algorithms and AI
  have a first-pass review for every item — 1,228 of them — and their second
  reading is partly done. Until it finishes, their rewrites are not applied and
  their items are served exactly as before, with no claim. The handoff names
  the exact files and the order.
- **Two banks are enforced only in part.** React and Node.js completed both
  readings and their rewrites are applied, so their retirements hold and their
  reviewed items claim a review. They are not in the completed scope because
  their Czech is unfinished, which means an unreviewed item in those topics is
  still served rather than withheld.
- The retired sections are 66 of 319 reviewed. The unreferenced banks and the
  legacy core bank are untouched and get a bank-level disposition here: no
  delivery path reaches them, the gate never sees them, and nothing can
  activate them without a review, because the gate requires one.
- The 249 coding tasks are issued as before. Their audit needs the grader
  checks `docs/audit/wip/CODING-BRIEF.md` specifies (reference, starter, an
  alternative valid solution and two wrong approaches through the real
  sandbox), and the batches with solutions are ready in `docs/audit/wip/coding/`.
- The two learning paths are unpublished (both switches off) and unreachable;
  they were not inventoried item by item.
- The review is model-performed. It is a real item-level review with recorded
  evidence, and it is not a human review; the product's own wording keeps the
  distinction. A human reading of the 84 retirements and of the 3 corrected
  keys is the cheapest next check, and the ledger holds the rationale and the
  evidence for each.

## 7. Reproducing and continuing

- Inventory: `npm run audit:devshark-inventory -- --out <dir>`; per-category
  gate counts: `npm run audit:devshark-content` (its `audit` block).
- Ledger → registry: `npm run build:curation-registry`; the launch contract
  fails when the registry does not match the ledger.
- The review fragments (`docs/audit/wip/review/`), the second reading and the
  duplicate decisions (`docs/audit/wip/verify/`), the merged final rows
  (`docs/audit/wip/final/`) and the Czech rows (`docs/audit/wip/cs/`) are the
  audit's evidence; the tools under `docs/audit/wip/tools/` turn them into
  content changes and ledger rows, in the order the handoff gives.
