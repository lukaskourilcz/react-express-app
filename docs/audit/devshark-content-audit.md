# devShark content audit — the question bank

The item-by-item audit that
[#176](https://github.com/lukaskourilcz/react-express-app/issues/176) asks
for, over every question a devShark learner can be served. This report says
what was counted, what was read, what changed as a result, what the product
now claims, and what has not been done. The machine-readable record is `docs/audit/devshark-content-ledger.json`;
the runtime projection of it is `lib/curation-registry.ts`; the gate that
applies it is described in `docs/curation-claims.md`.

Last updated 2026-09-11. The wave is complete. Every one of the 2,128 items a
learner can be served has been read twice, rewritten or retired, translated
from the final English, and recorded in the ledger; all sixteen categories are
in the gate's scope, so an item without a current passing record is withheld
rather than served with no claim. The 319 items in the retired sections have
been read once each and disposed of.

## 1. What a learner can be served, counted

Every place a devShark question can reach a learner was reconciled from the
code (`npm run audit:devshark-inventory`). The numbers are the repository's;
the one source that could not be counted is named below.

| Pool | Items | Reaches learners | Reviewed |
| --- | ---: | --- | ---: |
| Active roadmap banks (16 categories, 8 questions a level) | 2,128 | Learn, part tests, quiz, daily, challenge, placement, review, Play, flashcards, Today | 2,128, all landed |
| Retired sections (abbreviations, testing, code-snippets, fix-the-test) | 319 | History only: refused by every delivery request | 319 |
| Unreferenced banks (cool-stuff, the pre-rescope HTML and CSS banks) | 312 | No delivery path | 0, disposition only |
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

## 3. The wave by topic

Every category is complete and in the enforced scope.

| Topic | Items | Rewritten | Retired | Quarantined |
| --- | ---: | ---: | ---: | ---: |
| AI | 160 | 145 | 14 | 1 |
| Algorithms | 80 | 76 | 4 | 0 |
| CSS | 48 | 47 | 1 | 0 |
| Databases | 120 | 114 | 6 | 0 |
| DevOps | 120 | 111 | 9 | 0 |
| Data structures | 120 | 116 | 4 | 0 |
| General | 152 | 150 | 2 | 0 |
| Git | 120 | 116 | 4 | 0 |
| HTML | 48 | 48 | 0 | 0 |
| JavaScript | 200 | 189 | 11 | 0 |
| Next.js | 120 | 105 | 15 | 0 |
| Node.js | 200 | 197 | 3 | 0 |
| React | 200 | 157 | 42 | 1 |
| Security | 120 | 115 | 5 | 0 |
| System design | 120 | 115 | 5 | 0 |
| TypeScript | 200 | 173 | 27 | 0 |
| **Total** | **2,128** | **1,974** | **152** | **2** |

Every one of the 2,128 failed the quality gate as first written. The score is
the minimum of seven dimensions, and for 2,126 of them the binding dimension
was the hint: 2,007 items scored 2 overall and 119 scored 1. Exactly two items
in the whole bank scored 3 or better as written. After rewriting, 1,974 pass.
The 154 that do not are the retirements and the two quarantines, which is what
those decisions mean.

| Dimension scoring 2 or below, before | Items |
| --- | ---: |
| hint | 2,126 |
| answer options | 623 |
| learning value | 232 |
| explanation | 117 |
| wording | 56 |
| technical correctness | 25 |
| topic relevance | 5 |

Relevance was rarely the problem: 1,510 items scored 9 or 10 out of 10, and 23
scored below the gate of 4. This bank was not teaching obsolete material; it
was teaching sound material badly.

The second reading checked every rewrite and amended 923 of them — 46% — while
accepting 1,067. It rejected 3, which became quarantines, and a separate
cross-batch duplicate pass retired 6 more. It also amended one item the first
pass had *retained*, which is why the ledger carries 1,974 rewrites rather than
1,973.

## 4. What the review found

**Every hint was filler.** 2,126 of the 2,128 items shipped one of six generic
sentences in the field shown before answering: "Trace the code one line at a
time", "Identify the requirement or failure mode first", and four more. Two
items in the entire bank had a hint of their own. This is the audit's central
finding, and it is a product defect rather than a content one: a hint field
existed, was populated automatically, and nobody read the result. It is also
what made the audit expensive — 2,126 hints had to be written from scratch,
and then read a second time, because the commonest defect the rewrites
introduced was a hint that states the rule the item tests.

**Some of that filler gave the answer away.** The fallback ends "Focus on
`<tag>`", and in twelve Security items that tag is the keyed option word for
word while the question withholds it. So the generic hint was not uniformly
harmless: where it interpolated a tag, it handed over the answer.

**Distractors that need no knowledge.** 623 items had option sets scoring 2 or
below, and the commonest shape is three category errors against one real
answer — "Sends emails" or "Routes electrical signals" against a question
about caching. A learner who knows nothing answers those by elimination. The
separate structural tell, a correct answer markedly longer and more detailed
than its distractors, stood at 158 items when the audit began and stands at 25
now (`npm run audit:devshark-content`).

**Correctness was better than expected, but not clean.** Across the 2,128
served items the audit found 3 wrong keys, 26 items with more than one
defensible answer, 12 hints that gave the answer away outright, and 3 false
premises. Every one of the wrong keys was caught by running the code rather
than reading it — an assertion item that assumed `strictEqual` compares with
`===` when it uses `Object.is`, and two more of the same kind. The false
premises were snippets that do not compile or that throw before reaching the
behaviour they ask about: four React items call a hook at module scope, so the
code throws "Invalid hook call" instead of demonstrating anything. A fourth
wrong key was found in a retired section, where nothing ships.

**Version rot concentrates where you would expect.** Next.js carries the most:
`params` and `searchParams` taught as plain objects when they have been
Promises since version 15, a caching default that changed between 14 and 15, an
interceptor file since renamed. Security is a full OWASP edition behind, and
its password-storage advice predates the current ranking. The AI topic teaches
an API shape the vendors no longer have. Git teaches a default branch name Git
itself does not use yet.

**Duplication is the main reason items were retired.** 152 of the 154 withheld
items are retirements, and the large majority duplicate a neighbour teaching
the same rule — React's later levels each carried a code version and a prose
version of the same fact, which is why React alone accounts for 42. The same
holds in the retired sections: of their 319 items, 272 retire and 24 of the
abbreviations retirements name the specific live item that already teaches
their point.

**The Czech bank was a different bank.** For CSS all 48 translations rendered
an older English version; for HTML all 48 translate the pre-rescope
abbreviation questions; half the JavaScript beginner items translate a
different snippet; the Next.js track still taught the previous major version in
four places. The automated drift detector caught a minority of these, because
it compares code and these items changed their subject without changing any
code — in the abbreviations section it flagged 1 of 120. All 1,974 served
items now have Czech written from the final English.

**Translation turned out to be a third reading.** Writing an item in another
language forces someone to parse every option as a sentence, and the
translators returned defects both English readings had passed: an option set
where only the key is phrased as a problem, an explanation whose subject does
not take its verb, an explanation naming an option by position in an item whose
options are prompts, and — a class English cannot have — a Czech stem whose
gender agreement narrows four options to two before a learner knows anything.
Those found in the English are recorded rather than fixed, because a rewrite
served on one reading is the one thing this audit does not do.

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

- **46 items in the retired sections propose a move into a live level, and
  none of them has been made.** Their reviews judged the objective worth
  keeping and named a destination that does not already teach it. Moving an
  item into a live level is a content decision rather than a rewrite, so the
  patcher skips them by design; they are listed with the reviewer's reasoning
  in `docs/audit/devshark-redistribution-candidates.md` and want an owner's
  decision. Seven more retire only because nothing in the live bank teaches
  what they teach — generators, symbols, `Proxy`, the prototype chain, labeled
  statements — and are written and waiting if the JavaScript track ever gains a
  metaprogramming level.
- **The unreferenced banks and the legacy core bank are untouched** and get a
  bank-level disposition here rather than a review: 312 items in cool-stuff and
  the pre-rescope HTML and CSS banks, and 795 in `coreQuestions`. No delivery
  path reaches any of them, the gate never sees them, and nothing can activate
  them without a review, because the gate requires one. If a future change
  wires one of these banks up, every item in it is withheld until reviewed.
- **Three defects are recorded rather than fixed.** Translation surfaced three
  English items both readings had passed — an option set where only the key is
  phrased as a problem, an explanation whose subject does not take its verb,
  and a stem the first pass flagged and the rewrite kept. None is a wrong key
  and all three clear both gates, so they are logged for the next wave: a
  rewrite served on a single reading is exactly what this audit does not do,
  and the reading that would have to accept it is the one that just proposed
  it.
- **Two typography conventions are unsettled in the Czech.** Thousands
  separators were regrouped, because `100,000` reads as one hundred to a Czech
  reader. Decimal commas and the space before `%` were left as the translators
  wrote them, which is inconsistent between files: 46 occurrences are spaced
  and 16 are tight, and Czech genuinely writes `100% využití` tight when it is
  adjectival. One owner decision settles it.
- The 249 coding tasks are issued as before. Their audit needs the grader
  checks `docs/audit/wip/CODING-BRIEF.md` specifies (reference, starter, an
  alternative valid solution and two wrong approaches through the real
  sandbox), and the batches with solutions are ready in `docs/audit/wip/coding/`.
- The two learning paths are unpublished (both switches off) and unreachable;
  they were not inventoried item by item.
- The review is model-performed. It is a real item-level review with recorded
  evidence, and it is not a human review; the product's own wording keeps the
  distinction. A human reading of the 152 retirements and of the 3 corrected
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
- One gate belongs to the audit rather than to the repository and must pass
  before a content change merges:
  `python3 docs/audit/wip/tools/sweep-artifacts.py <inventoryDir>`. It scans
  every learner-visible field in both languages for the audit's own leavings —
  item ids, commit hashes, tool version strings, working notes, scratch paths,
  the reviewer's vocabulary, and references to an option by its position, which
  the answer shuffle makes meaningless — and exits non-zero on a hit. It found
  a different class on each of its first four runs, so run it after every
  apply rather than once at the end. It currently reports 0 across 2,759 items.
- `docs/audit/wip/tools/NOTES-followups.md` is the running log of everything
  found that is not an item-level defect: the tooling traps, the process
  lessons, and the decisions left to an owner.
